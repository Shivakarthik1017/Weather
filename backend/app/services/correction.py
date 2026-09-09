import numpy as np
from typing import Dict, Any, Optional

class DataImputationEngine:
    def estimate_corrected_value(
        self,
        station_id: str,
        parameter: str,
        original_val: Optional[float],
        spatial_metrics: Dict[str, Any],
        temporal_features: Dict[str, Any],
        station_meta: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Calculates an imputed/corrected value WITHOUT mutating the raw observation.
        """
        estimated_val = None
        method = "none"
        confidence = 0.0
        reason = ""

        # 1. Primary method: Spatial Neighbour Median
        if parameter == "temperature":
            if "neighbour_median_t" in spatial_metrics and spatial_metrics["neighbour_median_t"] is not None:
                estimated_val = float(spatial_metrics["neighbour_median_t"])
                method = "neighbour_median"
                confidence = 91.5
                reason = f"Imputed from median of {spatial_metrics.get('neighbour_count', 4)} geographically adjacent stations."
            elif "mean_t" in temporal_features:
                estimated_val = float(temporal_features["mean_t"])
                method = "rolling_median"
                confidence = 82.0
                reason = "Imputed from station's rolling historical window median."
            elif station_meta and "base_t" in station_meta:
                estimated_val = float(station_meta["base_t"])
                method = "historical_baseline"
                confidence = 68.0
                reason = "Imputed from climatological station baseline."

        elif parameter == "pressure":
            if "neighbour_mean_p" in spatial_metrics and spatial_metrics["neighbour_mean_p"] is not None:
                estimated_val = float(spatial_metrics["neighbour_mean_p"])
                method = "neighbour_mean"
                confidence = 90.0
                reason = "Derived from barometric gradient of nearby cluster stations."
            elif "mean_p" in temporal_features:
                estimated_val = float(temporal_features["mean_p"])
                method = "rolling_mean"
                confidence = 84.0
                reason = "Derived from rolling barometric pressure baseline."
            elif station_meta and "base_p" in station_meta:
                estimated_val = float(station_meta["base_p"])
                method = "historical_baseline"
                confidence = 70.0
                reason = "Imputed from barometric station elevation baseline."

        elif parameter == "humidity":
            if "mean_rh" in temporal_features:
                estimated_val = float(temporal_features["mean_rh"])
                method = "rolling_mean"
                confidence = 80.0
                reason = "Derived from station rolling relative humidity mean."
            elif station_meta and "base_rh" in station_meta:
                estimated_val = float(station_meta["base_rh"])
                method = "historical_baseline"
                confidence = 65.0
                reason = "Imputed from regional climatological humidity baseline."

        if estimated_val is not None:
            return {
                "station_id": station_id,
                "parameter": parameter,
                "original_value": original_val,
                "estimated_value": round(estimated_val, 2),
                "correction_method": method,
                "correction_confidence": confidence,
                "reason": reason
            }
        return None
