import datetime
from typing import Dict, Any, List, Tuple
from backend.app.config import settings

class SensorHealthEngine:
    def __init__(self, window_size: int = 30):
        self.window_size = window_size
        self.station_health_states: Dict[str, Dict[str, Any]] = {}

    def get_or_init_state(self, station_id: str) -> Dict[str, Any]:
        if station_id not in self.station_health_states:
            self.station_health_states[station_id] = {
                "station_id": station_id,
                "current_health": 98.5,
                "previous_health": 98.5,
                "history_scores": [98.5],
                "anomaly_history": [],
                "missing_history": [],
                "comm_failure_count": 0,
                "frozen_count": 0,
                "drift_count": 0,
                "trend": "STABLE",
                "degradation_risk": "LOW"
            }
        return self.station_health_states[station_id]

    def update_health(
        self,
        station_id: str,
        anomaly_score: float,
        classification: str,
        quality_status: str,
        is_frozen: bool,
        is_drift: bool
    ) -> Tuple[float, str, str, Dict[str, Any]]:
        """
        Returns:
            health_score (0-100),
            trend ("IMPROVING", "STABLE", "DECLINING"),
            degradation_risk ("LOW", "MEDIUM", "HIGH", "CRITICAL"),
            factors (Dict)
        """
        state = self.get_or_init_state(station_id)
        state["previous_health"] = state["current_health"]

        # Track rolling events
        is_anomaly = anomaly_score > 45.0 and classification != "GENUINE WEATHER EVENT"
        is_missing = quality_status in ["MISSING_DATA", "DATA_CORRUPTION"]
        is_comm = quality_status == "COMM_FAILURE"

        state["anomaly_history"].append(1.0 if is_anomaly else 0.0)
        state["missing_history"].append(1.0 if is_missing else 0.0)

        if len(state["anomaly_history"]) > self.window_size:
            state["anomaly_history"].pop(0)
            state["missing_history"].pop(0)

        if is_comm:
            state["comm_failure_count"] += 1
        if is_frozen:
            state["frozen_count"] += 1
        if is_drift:
            state["drift_count"] += 1

        # Calculate frequency rates (0.0 to 1.0)
        anomaly_freq = sum(state["anomaly_history"]) / max(1, len(state["anomaly_history"]))
        missing_rate = sum(state["missing_history"]) / max(1, len(state["missing_history"]))

        # Penalties calculation
        p_anomaly = anomaly_freq * 45.0
        p_missing = missing_rate * 30.0
        p_comm = min(25.0, state["comm_failure_count"] * 4.0)
        p_frozen = min(20.0, state["frozen_count"] * 3.0)
        p_drift = min(25.0, state["drift_count"] * 3.5)

        total_penalty = p_anomaly + p_missing + p_comm + p_frozen + p_drift

        # Raw instantaneous target health
        target_health = max(5.0, min(100.0, 100.0 - total_penalty))

        # Exponential smoothing: fast decline on fault, slow recovery when clear
        alpha = 0.35 if target_health < state["current_health"] else 0.08
        new_health = round((1.0 - alpha) * state["current_health"] + alpha * target_health, 1)
        state["current_health"] = new_health

        state["history_scores"].append(new_health)
        if len(state["history_scores"]) > 20:
            state["history_scores"].pop(0)

        # Trend calculation
        if len(state["history_scores"]) >= 5:
            delta = state["history_scores"][-1] - state["history_scores"][-5]
            if delta < -2.0:
                trend = "DECLINING"
            elif delta > 2.0:
                trend = "IMPROVING"
            else:
                trend = "STABLE"
        else:
            trend = "STABLE"
        state["trend"] = trend

        # Degradation Risk assessment
        # Trends: increasing anomaly freq, increasing missing data, drift, repeated comm failures
        risk_score = (
            anomaly_freq * 40.0 +
            missing_rate * 25.0 +
            min(20.0, state["drift_count"] * 3.0) +
            min(15.0, state["comm_failure_count"] * 2.5)
        )
        if new_health < 40.0 or risk_score > 60.0:
            deg_risk = "CRITICAL"
        elif new_health < 65.0 or risk_score > 35.0:
            deg_risk = "HIGH"
        elif new_health < 80.0 or risk_score > 15.0:
            deg_risk = "MEDIUM"
        else:
            deg_risk = "LOW"
        state["degradation_risk"] = deg_risk

        factors = {
            "anomaly_frequency_pct": round(anomaly_freq * 100.0, 1),
            "missing_data_rate_pct": round(missing_rate * 100.0, 1),
            "comm_failure_count": state["comm_failure_count"],
            "frozen_sensor_incidents": state["frozen_count"],
            "drift_incidents": state["drift_count"],
            "penalty_breakdown": {
                "anomaly_penalty": round(p_anomaly, 1),
                "missing_penalty": round(p_missing, 1),
                "comm_penalty": round(p_comm, 1),
                "drift_penalty": round(p_drift, 1)
            }
        }

        return new_health, trend, deg_risk, factors
