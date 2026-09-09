import datetime
from typing import Dict, Any, List, Optional
from backend.app.simulator.network import STATIONS_METADATA

class AnomalyInjector:
    def __init__(self, simulator):
        self.simulator = simulator
        self.active_injections: List[Dict[str, Any]] = []
        self.ground_truth_history: List[Dict[str, Any]] = []

    def inject_anomaly(
        self,
        station_id: str,
        anomaly_type: str,
        magnitude: Optional[float] = None,
        duration_ticks: int = 15
    ) -> Dict[str, Any]:
        now = datetime.datetime.utcnow().isoformat() + "Z"
        
        # Check if station exists (case-insensitive)
        station_id_map = {sid.lower(): sid for sid in self.simulator.station_states.keys()}
        if station_id.lower() in station_id_map:
            station_id = station_id_map[station_id.lower()]
        elif anomaly_type != "regional_weather_event":
            return {"error": f"Station {station_id} not found"}

        injection = {
            "id": len(self.ground_truth_history) + 1,
            "station_id": station_id,
            "anomaly_type": anomaly_type,
            "magnitude": magnitude,
            "duration_ticks": duration_ticks,
            "ticks_remaining": duration_ticks,
            "injected_at": now,
            "target_parameter": "temperature",
            "ground_truth": True,
            "resolved": False
        }

        # Apply specific anomaly state manipulation
        self._apply_anomaly_start(injection)
        self.active_injections.append(injection)
        self.ground_truth_history.append(injection)

        return injection

    def _apply_anomaly_start(self, injection: Dict[str, Any]):
        sid = injection["station_id"]
        atype = injection["anomaly_type"]
        mag = injection.get("magnitude")
        state = self.simulator.station_states.get(sid)

        if atype == "temperature_spike":
            offset = mag if mag is not None else 18.5
            if state:
                state["current_t"] += offset
            injection["target_parameter"] = "temperature"

        elif atype == "temperature_drop":
            offset = mag if mag is not None else -19.0
            if state:
                state["current_t"] += offset
            injection["target_parameter"] = "temperature"

        elif atype == "pressure_spike":
            offset = mag if mag is not None else 42.0
            if state:
                state["current_p"] += offset
            injection["target_parameter"] = "pressure"

        elif atype == "pressure_drop":
            offset = mag if mag is not None else -45.0
            if state:
                state["current_p"] += offset
            injection["target_parameter"] = "pressure"

        elif atype == "humidity_spike":
            if state:
                state["current_rh"] = min(100.0, state["current_rh"] + (mag if mag else 48.0))
            injection["target_parameter"] = "humidity"

        elif atype == "humidity_drop":
            if state:
                state["current_rh"] = max(2.0, state["current_rh"] - (mag if mag else 48.0))
            injection["target_parameter"] = "humidity"

        elif atype == "frozen_sensor":
            if state:
                state["is_frozen"] = True
            injection["target_parameter"] = "temperature"

        elif atype == "sensor_drift":
            if state:
                state["drift_offset"] = 0.5
                state["drift_step"] = mag if mag is not None else 0.35
            injection["target_parameter"] = "temperature"

        elif atype == "missing_data":
            if state:
                state["is_missing"] = True
            injection["target_parameter"] = "data_quality"

        elif atype == "communication_interruption":
            if state:
                state["is_offline"] = True
            injection["target_parameter"] = "communication"

        elif atype == "multivariate_inconsistency":
            if state:
                # Physically impossible psychrometric combo: 53.5C with 92% humidity and high pressure
                state["current_t"] = 53.5
                state["current_rh"] = 92.0
                state["current_p"] = 1042.0
            injection["target_parameter"] = "multivariate"

        elif atype == "isolated_station_anomaly":
            if state:
                state["current_t"] += 22.0
            injection["target_parameter"] = "temperature"

        elif atype == "regional_weather_event":
            # Convective squall or cold front affecting target station AND 3-4 nearby stations!
            injection["target_parameter"] = "multivariate"
            target_meta = next((s for s in STATIONS_METADATA if s["station_id"] == sid), STATIONS_METADATA[0])
            # Find nearby stations in same region
            cluster = [s["station_id"] for s in STATIONS_METADATA if s["region"] == target_meta["region"]][:4]
            injection["affected_stations"] = cluster
            for csid in cluster:
                cstate = self.simulator.station_states.get(csid)
                if cstate:
                    cstate["current_t"] -= 7.5
                    cstate["current_p"] -= 9.0
                    cstate["current_rh"] = min(98.0, cstate["current_rh"] + 32.0)

    def process_tick(self):
        """Decrement active ticks and restore baseline state when duration ends."""
        still_active = []
        for inj in self.active_injections:
            inj["ticks_remaining"] -= 1
            if inj["ticks_remaining"] <= 0:
                self._restore_anomaly(inj)
                inj["resolved"] = True
            else:
                still_active.append(inj)
        self.active_injections = still_active

    def _restore_anomaly(self, injection: Dict[str, Any]):
        sid = injection["station_id"]
        atype = injection["anomaly_type"]
        state = self.simulator.station_states.get(sid)

        if atype == "frozen_sensor" and state:
            state["is_frozen"] = False
            state["consecutive_identical"] = 0
        elif atype == "sensor_drift" and state:
            state["drift_offset"] = 0.0
            state["drift_step"] = 0.0
        elif atype == "missing_data" and state:
            state["is_missing"] = False
        elif atype == "communication_interruption" and state:
            state["is_offline"] = False
        elif atype in ["temperature_spike", "temperature_drop", "isolated_station_anomaly"] and state:
            # Smoothly recover to baseline
            meta = next((s for s in STATIONS_METADATA if s["station_id"] == sid), None)
            if meta:
                state["current_t"] = meta["base_t"]
        elif atype in ["pressure_spike", "pressure_drop"] and state:
            meta = next((s for s in STATIONS_METADATA if s["station_id"] == sid), None)
            if meta:
                state["current_p"] = meta["base_p"]
        elif atype in ["humidity_spike", "humidity_drop"] and state:
            meta = next((s for s in STATIONS_METADATA if s["station_id"] == sid), None)
            if meta:
                state["current_rh"] = meta["base_rh"]
        elif atype == "multivariate_inconsistency" and state:
            meta = next((s for s in STATIONS_METADATA if s["station_id"] == sid), None)
            if meta:
                state["current_t"] = meta["base_t"]
                state["current_p"] = meta["base_p"]
                state["current_rh"] = meta["base_rh"]
        elif atype == "regional_weather_event":
            cluster = injection.get("affected_stations", [sid])
            for csid in cluster:
                cstate = self.simulator.station_states.get(csid)
                cmeta = next((s for s in STATIONS_METADATA if s["station_id"] == csid), None)
                if cstate and cmeta:
                    cstate["current_t"] = cmeta["base_t"]
                    cstate["current_p"] = cmeta["base_p"]
                    cstate["current_rh"] = cmeta["base_rh"]

    def get_ground_truth_for_station(self, station_id: str) -> Optional[Dict[str, Any]]:
        for inj in self.active_injections:
            if inj["station_id"] == station_id:
                return inj
            if inj.get("affected_stations") and station_id in inj["affected_stations"]:
                return inj
        return None
