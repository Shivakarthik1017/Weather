import math
from typing import Dict, Any, List, Tuple
from backend.app.config import settings

class PhysicalValidator:
    def __init__(self):
        self.t_min = settings.TEMP_MIN_C
        self.t_max = settings.TEMP_MAX_C
        self.t_step_max = settings.TEMP_MAX_STEP_C
        
        self.p_min = settings.PRESSURE_MIN_HPA
        self.p_max = settings.PRESSURE_MAX_HPA
        self.p_step_max = settings.PRESSURE_MAX_STEP_HPA
        
        self.rh_min = settings.HUMIDITY_MIN_PCT
        self.rh_max = settings.HUMIDITY_MAX_PCT
        self.rh_step_max = settings.HUMIDITY_MAX_STEP_PCT

    def validate(
        self,
        observation: Dict[str, Any],
        prev_obs: Dict[str, Any] = None
    ) -> Tuple[float, bool, List[str], str]:
        """
        Returns:
            physical_score (0-100, where higher is more anomalous),
            is_valid (bool),
            evidence_list (List[str]),
            data_quality_status (str)
        """
        evidence = []
        score = 0.0
        status = "VALID"

        t = observation.get("temperature_c")
        p = observation.get("pressure_hpa")
        rh = observation.get("relative_humidity")

        # 1. Missing / Null checks
        if t is None and p is None and rh is None:
            return 100.0, False, ["Complete observation transmission loss (all channels null)."], "COMM_FAILURE"

        if t is None or p is None or rh is None:
            missing_channels = [ch for ch, v in [("Temperature", t), ("Pressure", p), ("Humidity", rh)] if v is None]
            evidence.append(f"Missing data channel(s): {', '.join(missing_channels)}.")
            score += 45.0
            status = "MISSING_DATA"

        # 2. NaN / Infinite checks
        for val, name in [(t, "Temperature"), (p, "Pressure"), (rh, "Humidity")]:
            if val is not None and (math.isnan(val) or math.isinf(val)):
                evidence.append(f"Corrupted numerical stream in {name} channel (NaN/Inf detected).")
                score += 85.0
                status = "DATA_CORRUPTION"

        # 3. Absolute meteorological bounds
        t_min = settings.TEMP_MIN_C
        t_max = settings.TEMP_MAX_C
        p_min = settings.PRESSURE_MIN_HPA
        p_max = settings.PRESSURE_MAX_HPA
        rh_min = settings.HUMIDITY_MIN_PCT
        rh_max = settings.HUMIDITY_MAX_PCT
        t_step_max = settings.TEMP_MAX_STEP_C
        p_step_max = settings.PRESSURE_MAX_STEP_HPA
        rh_step_max = settings.HUMIDITY_MAX_STEP_PCT

        if t is not None:
            if t < t_min or t > t_max:
                score += 70.0
                evidence.append(f"Temperature reading {t:.1f}°C breaches absolute meteorological safety envelope [{t_min}°C, {t_max}°C].")
        
        if p is not None:
            if p < p_min or p > p_max:
                score += 70.0
                evidence.append(f"Atmospheric pressure {p:.1f} hPa exceeds standard physical barometric limits [{p_min}, {p_max} hPa].")

        if rh is not None:
            if rh < rh_min or rh > rh_max:
                score += 65.0
                evidence.append(f"Relative humidity {rh:.1f}% outside physical thermodynamic domain [0%, 100%].")

        # 4. Step-rate physical plausibility checks against previous observation
        if prev_obs:
            prev_t = prev_obs.get("temperature_c")
            prev_p = prev_obs.get("pressure_hpa")
            prev_rh = prev_obs.get("relative_humidity")

            if t is not None and prev_t is not None:
                dt = abs(t - prev_t)
                if dt > t_step_max:
                    score += min(60.0, dt * 6.5)
                    evidence.append(f"Instantaneous temperature gradient of {dt:.2f}°C/tick exceeds maximum convective thermal inertia limit ({t_step_max}°C).")

            if p is not None and prev_p is not None:
                dp = abs(p - prev_p)
                if dp > p_step_max:
                    score += min(60.0, dp * 3.5)
                    evidence.append(f"Barometric surge of {dp:.2f} hPa/tick is physically impossible without violent shockwave.")

            if rh is not None and prev_rh is not None:
                drh = abs(rh - prev_rh)
                if drh > rh_step_max:
                    score += min(50.0, drh * 1.5)
                    evidence.append(f"Relative humidity shift of {drh:.1f}%/tick exceeds atmospheric vapor saturation speed.")

        final_score = min(100.0, score)
        is_valid = final_score < 30.0
        if not is_valid and status == "VALID":
            status = "PHYSICAL_BREACH"

        return final_score, is_valid, evidence, status
