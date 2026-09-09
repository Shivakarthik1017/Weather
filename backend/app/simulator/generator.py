import time
import math
import random
import datetime
from typing import Dict, Any, Optional
from backend.app.simulator.network import STATIONS_METADATA

class AWSDataSimulator:
    def __init__(self):
        self.stations_meta = {s["station_id"]: s for s in STATIONS_METADATA}
        self.station_states: Dict[str, Dict[str, Any]] = {}
        self.tick_count = 0
        self.init_states()

    def init_states(self):
        now = datetime.datetime.utcnow()
        for s in STATIONS_METADATA:
            sid = s["station_id"]
            # Start at base values with slight initial variation
            t = round(s["base_t"] + random.uniform(-0.5, 0.5), 2)
            p = round(s["base_p"] + random.uniform(-0.3, 0.3), 2)
            rh = round(s["base_rh"] + random.uniform(-1.0, 1.0), 1)
            
            self.station_states[sid] = {
                "station_id": sid,
                "current_t": t,
                "current_p": p,
                "current_rh": rh,
                "prev_t": t,
                "prev_p": p,
                "prev_rh": rh,
                "history_t": [t],
                "history_p": [p],
                "history_rh": [rh],
                "consecutive_identical": 0,
                "drift_offset": 0.0,
                "is_frozen": False,
                "is_offline": False,
                "missing_rate_window": [],
                "last_timestamp": now.isoformat() + "Z"
            }

    def generate_tick(self, active_count: Optional[int] = None) -> Dict[str, Dict[str, Any]]:
        self.tick_count += 1
        now = datetime.datetime.utcnow()
        timestamp_str = now.isoformat() + "Z"
        
        limit = active_count if active_count and active_count > 0 else len(STATIONS_METADATA)
        active_list = STATIONS_METADATA[:limit]
        observations = {}

        # Diurnal solar cycle calculation (period ~ 24h simulated, smooth sine wave)
        diurnal_phase = (self.tick_count % 360) / 360.0 * 2.0 * math.pi
        solar_forcing = 0.08 * math.sin(diurnal_phase)

        for s in active_list:
            sid = s["station_id"]
            state = self.station_states[sid]

            # If offline / communication failure
            if state.get("is_offline", False):
                observations[sid] = {
                    "station_id": sid,
                    "timestamp": timestamp_str,
                    "temperature_c": None,
                    "pressure_hpa": None,
                    "relative_humidity": None,
                    "data_quality_status": "COMM_FAILURE"
                }
                continue

            # If missing data
            if state.get("is_missing", False):
                observations[sid] = {
                    "station_id": sid,
                    "timestamp": timestamp_str,
                    "temperature_c": None,
                    "pressure_hpa": state["current_p"],
                    "relative_humidity": None,
                    "data_quality_status": "MISSING_DATA"
                }
                continue

            # If frozen sensor
            if state.get("is_frozen", False):
                state["consecutive_identical"] += 1
                t = state["current_t"]
                p = state["current_p"]
                rh = state["current_rh"]
            else:
                # Normal continuous evolution: Markov drift
                delta_t = random.gauss(0, 0.08) + solar_forcing
                # Smooth temperature step bounded
                delta_t = max(-0.25, min(0.25, delta_t))
                
                # Apply gradual sensor drift if active
                if state.get("drift_offset", 0.0) != 0.0:
                    drift_step = state.get("drift_step", 0.15)
                    state["drift_offset"] += drift_step
                    delta_t += drift_step

                t = round(state["current_t"] + delta_t, 2)
                
                # Realistic boundary pull towards regional baseline
                base_t = s["base_t"]
                if abs(t - base_t) > 6.0:
                    t += -0.05 if t > base_t else 0.05

                # Pressure smooth step
                delta_p = max(-0.15, min(0.15, random.gauss(0, 0.05)))
                p = round(state["current_p"] + delta_p, 2)
                
                # Psychrometrically inverse relationship: rising T tends to lower RH
                rh_trend = -0.6 * delta_t + random.gauss(0, 0.25)
                rh = round(max(5.0, min(99.0, state["current_rh"] + rh_trend)), 1)

                state["consecutive_identical"] = 0

            # Store previous and current
            state["prev_t"] = state["current_t"]
            state["prev_p"] = state["current_p"]
            state["prev_rh"] = state["current_rh"]
            
            state["current_t"] = t
            state["current_p"] = p
            state["current_rh"] = rh
            state["last_timestamp"] = timestamp_str

            # Maintain history window of 60 records
            state["history_t"].append(t)
            state["history_p"].append(p)
            state["history_rh"].append(rh)
            if len(state["history_t"]) > 60:
                state["history_t"].pop(0)
                state["history_p"].pop(0)
                state["history_rh"].pop(0)

            observations[sid] = {
                "station_id": sid,
                "timestamp": timestamp_str,
                "temperature_c": t,
                "pressure_hpa": p,
                "relative_humidity": rh,
                "data_quality_status": "VALID"
            }

        return observations
