import numpy as np
from typing import Dict, Any, List, Tuple
from backend.app.config import settings

class TemporalAnomalyEngine:
    def __init__(self, window_size: int = 20):
        self.window_size = window_size
        self.station_buffers: Dict[str, Dict[str, List[float]]] = {}
        self.identical_counters: Dict[str, Dict[str, int]] = {}
        self.initial_baselines: Dict[str, Dict[str, float]] = {}

    def analyze(
        self,
        station_id: str,
        observation: Dict[str, Any]
    ) -> Tuple[float, Dict[str, Any], List[str], bool, bool]:
        """
        Returns:
            temporal_score (0-100),
            features (Dict),
            evidence (List[str]),
            is_frozen (bool),
            is_drift (bool)
        """
        evidence = []
        features = {}
        score = 0.0
        is_frozen = False
        is_drift = False

        if station_id not in self.station_buffers:
            self.station_buffers[station_id] = {"t": [], "p": [], "rh": []}
            self.identical_counters[station_id] = {"t": 0, "p": 0, "rh": 0}
            self.initial_baselines[station_id] = {}

        buf = self.station_buffers[station_id]
        counters = self.identical_counters[station_id]

        t = observation.get("temperature_c")
        p = observation.get("pressure_hpa")
        rh = observation.get("relative_humidity")

        # If values missing
        if t is None or p is None or rh is None:
            return 80.0, {}, ["Missing observation values in temporal processing stream."], False, False

        # Baseline capture
        if "t" not in self.initial_baselines[station_id] and len(buf["t"]) >= 5:
            self.initial_baselines[station_id] = {
                "t": float(np.mean(buf["t"])),
                "p": float(np.mean(buf["p"])),
                "rh": float(np.mean(buf["rh"]))
            }

        # 1. Consecutive identical readings (Frozen Sensor Detection)
        for val, key, name in [(t, "t", "Temperature"), (p, "p", "Pressure"), (rh, "rh", "Humidity")]:
            if buf[key] and len(buf[key]) > 0:
                if abs(val - buf[key][-1]) < 1e-4:
                    counters[key] += 1
                else:
                    counters[key] = 0
            
            if counters[key] >= settings.FROZEN_CONSECUTIVE_LIMIT:
                is_frozen = True
                score += 55.0
                evidence.append(f"Zero variance detected: {name} sensor locked on identical reading ({val}) for {counters[key]} consecutive intervals (Frozen Sensor).")

        # 2. Previous values and deltas
        prev_t = buf["t"][-1] if buf["t"] else t
        prev_p = buf["p"][-1] if buf["p"] else p
        prev_rh = buf["rh"][-1] if buf["rh"] else rh

        delta_t = t - prev_t
        delta_p = p - prev_p
        delta_rh = rh - prev_rh

        features["prev_t"] = prev_t
        features["prev_p"] = prev_p
        features["prev_rh"] = prev_rh
        features["delta_t"] = delta_t
        features["delta_p"] = delta_p
        features["delta_rh"] = delta_rh

        # 3. Rolling window statistics
        if len(buf["t"]) >= 5:
            mean_t = float(np.mean(buf["t"]))
            std_t = float(np.std(buf["t"]))
            min_t = float(np.min(buf["t"]))
            max_t = float(np.max(buf["t"]))

            mean_p = float(np.mean(buf["p"]))
            std_p = float(np.std(buf["p"]))

            mean_rh = float(np.mean(buf["rh"]))
            std_rh = float(np.std(buf["rh"]))

            # Z-scores
            z_t = (t - mean_t) / max(std_t, 0.1)
            z_p = (p - mean_p) / max(std_p, 0.1)
            z_rh = (rh - mean_rh) / max(std_rh, 0.2)

            features.update({
                "mean_t": mean_t, "std_t": std_t, "min_t": min_t, "max_t": max_t, "z_t": z_t,
                "mean_p": mean_p, "std_p": std_p, "z_p": z_p,
                "mean_rh": mean_rh, "std_rh": std_rh, "z_rh": z_rh
            })

            # Evaluate Z-score extremity
            if abs(z_t) > 3.0:
                score += min(50.0, abs(z_t) * 10.0)
                direction = "spike" if z_t > 0 else "drop"
                evidence.append(f"Temporal temperature {direction}: reading is {abs(z_t):.1f}σ from station rolling mean ({mean_t:.1f}°C).")

            if abs(z_p) > 3.2:
                score += min(45.0, abs(z_p) * 8.0)
                direction = "surge" if z_p > 0 else "depression"
                evidence.append(f"Temporal pressure {direction}: reading is {abs(z_p):.1f}σ from station rolling mean.")

            if abs(z_rh) > 3.0:
                score += min(40.0, abs(z_rh) * 7.5)
                evidence.append(f"Temporal humidity anomaly: reading is {abs(z_rh):.1f}σ from rolling baseline.")

            # 4. Gradual Sensor Drift Detection
            # If rolling mean steadily moves away from initial baseline while variance remains low
            base_t = self.initial_baselines.get(station_id, {}).get("t")
            if base_t is not None and len(buf["t"]) >= 12:
                drift_mag = abs(mean_t - base_t)
                # If drifted > 2.5C with low short-term std (< 0.5C)
                if drift_mag > 2.5 and std_t < 0.8:
                    is_drift = True
                    score += min(40.0, drift_mag * 7.0)
                    evidence.append(f"Systematic baseline drift detected: station baseline drifted {drift_mag:.2f}°C from historical anchor with low variance.")

        # Update buffers
        buf["t"].append(t)
        buf["p"].append(p)
        buf["rh"].append(rh)
        if len(buf["t"]) > self.window_size:
            buf["t"].pop(0)
            buf["p"].pop(0)
            buf["rh"].pop(0)

        final_score = min(100.0, score)
        return final_score, features, evidence, is_frozen, is_drift
