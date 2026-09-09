import math
import numpy as np
from typing import Dict, Any, List, Tuple

class MultivariateConsistencyEngine:
    def __init__(self):
        # Realistic atmospheric bounds for dew point (Earth record is ~35°C in Dhahran/Persian Gulf)
        self.max_plausible_dew_point = 35.0
        self.min_plausible_dew_point = -40.0

    def calculate_dew_point(self, t: float, rh: float) -> float:
        """August-Roche-Magnus approximation for dew point in Celsius."""
        b = 17.67
        c = 243.5
        rh_clamped = max(1.0, min(100.0, rh))
        gamma = (b * t) / (c + t) + math.log(rh_clamped / 100.0)
        td = (c * gamma) / (b - gamma)
        return td

    def analyze(
        self,
        observation: Dict[str, Any],
        historical_stats: Dict[str, Any] = None
    ) -> Tuple[float, bool, List[str], Dict[str, Any]]:
        """
        Returns:
            multivariate_score (0-100),
            is_inconsistent (bool),
            evidence (List[str]),
            metrics (Dict)
        """
        evidence = []
        score = 0.0
        metrics = {}

        t = observation.get("temperature_c")
        p = observation.get("pressure_hpa")
        rh = observation.get("relative_humidity")

        if t is None or p is None or rh is None:
            return 0.0, False, [], {}

        # 1. Psychrometric & Thermodynamic Consistency (Dew Point Check)
        try:
            td = self.calculate_dew_point(t, rh)
            metrics["dew_point_c"] = round(td, 2)

            if td > self.max_plausible_dew_point:
                excess = td - self.max_plausible_dew_point
                score += min(75.0, 45.0 + excess * 6.0)
                evidence.append(
                    f"Thermodynamic inconsistency: Calculated dew point is {td:.1f}°C (T={t:.1f}°C, RH={rh:.1f}%), exceeding terrestrial atmospheric limits (>35°C)."
                )

            # High temperature with extreme humidity
            if t > 45.0 and rh > 70.0:
                score += 55.0
                evidence.append(
                    f"Unrealistic high-heat/saturation combination: T={t:.1f}°C with RH={rh:.1f}% violates local boundary-layer moisture balance."
                )

            # Sub-zero temperature with near-boiling vapor pressure or vice-versa
            if t < -5.0 and td > 5.0:
                score += 60.0
                evidence.append("Dew point strictly exceeds ambient temperature (supersaturation beyond physical cloud chamber threshold).")

        except Exception:
            pass

        # 2. Joint Covariance & Multivariate Anomaly
        # In typical weather: rising temperature corresponds with falling pressure during midday or frontal systems
        # Check against station historical means if available
        if historical_stats and "mean_t" in historical_stats:
            mean_t = historical_stats["mean_t"]
            std_t = max(historical_stats.get("std_t", 1.0), 0.2)
            mean_p = historical_stats.get("mean_p", p)
            std_p = max(historical_stats.get("std_p", 1.0), 0.2)
            mean_rh = historical_stats.get("mean_rh", rh)
            std_rh = max(historical_stats.get("std_rh", 1.0), 0.5)

            z_t = (t - mean_t) / std_t
            z_p = (p - mean_p) / std_p
            z_rh = (rh - mean_rh) / std_rh

            # Sum of squared standardized distances (Mahalanobis proxy)
            chi2_dist = z_t**2 + z_p**2 + z_rh**2
            metrics["joint_chi2"] = round(chi2_dist, 2)

            if chi2_dist > 18.0:
                score += min(45.0, (chi2_dist - 18.0) * 2.5)
                evidence.append(
                    f"Joint multivariate state distance ({chi2_dist:.1f}) strongly deviates from multi-channel historical covariance."
                )

        final_score = min(100.0, score)
        is_inconsistent = final_score > 35.0

        return final_score, is_inconsistent, evidence, metrics
