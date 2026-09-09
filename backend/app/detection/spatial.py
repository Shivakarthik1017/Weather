import math
import numpy as np
from typing import Dict, Any, List, Tuple
from backend.app.simulator.network import STATIONS_METADATA
from backend.app.config import settings

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points on the earth in km."""
    r = 6371.0  # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c

class SpatialCrossStationEngine:
    def __init__(self, k_neighbours: int = 5, max_radius_km: float = 450.0):
        self.k = k_neighbours
        self.max_radius_km = max_radius_km
        self.station_coords = {s["station_id"]: (s["lat"], s["lon"]) for s in STATIONS_METADATA}
        self.neighbour_cache: Dict[str, List[Tuple[str, float]]] = {}
        self._build_neighbour_graph()

    def _build_neighbour_graph(self):
        """Precompute distance rankings for all stations."""
        for s1 in STATIONS_METADATA:
            sid1 = s1["station_id"]
            lat1, lon1 = s1["lat"], s1["lon"]
            distances = []
            for s2 in STATIONS_METADATA:
                sid2 = s2["station_id"]
                if sid1 == sid2:
                    continue
                lat2, lon2 = s2["lat"], s2["lon"]
                dist = haversine_km(lat1, lon1, lat2, lon2)
                distances.append((sid2, dist))
            distances.sort(key=lambda x: x[1])
            self.neighbour_cache[sid1] = distances

    def get_neighbours(self, station_id: str) -> List[Tuple[str, float]]:
        all_dists = self.neighbour_cache.get(station_id, [])
        k = getattr(settings, 'SPATIAL_NEIGHBOUR_COUNT', self.k)
        max_radius = getattr(settings, 'SPATIAL_MAX_RADIUS_KM', self.max_radius_km)
        # Filter within max radius and take top k
        close = [pair for pair in all_dists if pair[1] <= max_radius]
        if len(close) < k and all_dists:
            return all_dists[:k]
        return close[:k]

    def analyze(
        self,
        station_id: str,
        current_observation: Dict[str, Any],
        all_observations: Dict[str, Dict[str, Any]]
    ) -> Tuple[float, str, List[str], Dict[str, Any]]:
        """
        Returns:
            spatial_anomaly_score (0-100),
            spatial_classification ("NORMAL", "ISOLATED_SENSOR_FAULT", "GENUINE_WEATHER_EVENT", "INSUFFICIENT_DATA"),
            evidence (List[str]),
            spatial_metrics (Dict)
        """
        evidence = []
        spatial_metrics = {}

        t = current_observation.get("temperature_c")
        p = current_observation.get("pressure_hpa")
        rh = current_observation.get("relative_humidity")

        if t is None:
            return 0.0, "NORMAL", [], {}

        neighbours = self.get_neighbours(station_id)
        if not neighbours:
            return 0.0, "INSUFFICIENT_DATA", ["No adjacent monitoring stations within spatial correlation radius."], {}

        neighbour_obs = []
        neighbour_distances = []
        for nid, dist in neighbours:
            if nid in all_observations:
                n_data = all_observations[nid]
                if n_data.get("temperature_c") is not None:
                    neighbour_obs.append(n_data)
                    neighbour_distances.append((nid, dist, n_data["temperature_c"]))

        if len(neighbour_obs) < 2:
            return 0.0, "INSUFFICIENT_DATA", ["Insufficient active neighbour telemetry for spatial cross-validation."], {}

        # Extract neighbour values
        n_temps = [o["temperature_c"] for o in neighbour_obs]
        n_pressures = [o["pressure_hpa"] for o in neighbour_obs if o.get("pressure_hpa") is not None]
        n_rhs = [o["relative_humidity"] for o in neighbour_obs if o.get("relative_humidity") is not None]

        # Calculate neighbour central tendencies
        n_mean_t = float(np.mean(n_temps))
        n_med_t = float(np.median(n_temps))
        n_std_t = float(np.std(n_temps))

        spatial_metrics["neighbour_count"] = len(neighbour_obs)
        spatial_metrics["neighbour_mean_t"] = round(n_mean_t, 2)
        spatial_metrics["neighbour_median_t"] = round(n_med_t, 2)
        spatial_metrics["neighbour_std_t"] = round(n_std_t, 2)
        spatial_metrics["neighbour_details"] = [
            {"station_id": nid, "distance_km": round(dist, 1), "temperature_c": temp}
            for nid, dist, temp in neighbour_distances
        ]

        # Target station deviation from neighbour mean
        dev_t = t - n_mean_t
        spatial_metrics["deviation_t"] = round(dev_t, 2)

        # Standardized spatial Z-score
        z_spatial_t = dev_t / max(n_std_t, 0.4)
        spatial_metrics["z_spatial_t"] = round(z_spatial_t, 2)

        score = 0.0
        classification = "NORMAL"

        # Check pressure and humidity spatial alignment if available
        dev_p = 0.0
        if p is not None and n_pressures:
            n_mean_p = float(np.mean(n_pressures))
            dev_p = p - n_mean_p
            spatial_metrics["neighbour_mean_p"] = round(n_mean_p, 2)
            spatial_metrics["deviation_p"] = round(dev_p, 2)

        # Core Spatial Intelligence:
        # 1. ISOLATED SENSOR FAULT:
        # Target station deviates sharply (|dev_t| > 7C or |z| > 3.0), but neighbours are in close agreement (n_std_t < 2.5C)
        if abs(dev_t) > 6.0 and abs(z_spatial_t) > 2.8:
            if n_std_t < 3.2:
                # Neighbours are tight and calm, this station is an outlier
                score = min(98.0, 50.0 + abs(dev_t) * 4.0)
                classification = "ISOLATED_SENSOR_FAULT"
                evidence.append(
                    f"Probable Sensor Fault — Observation ({t:.1f}°C) deviates by {dev_t:+.1f}°C ({abs(z_spatial_t):.1f}σ) from {len(neighbour_obs)} nearby stations (mean: {n_mean_t:.1f}°C, σ: {n_std_t:.1f}°C) which remain normal."
                )
            else:
                # Neighbours themselves have high spread, could be a weather boundary / front
                score = min(60.0, 30.0 + abs(dev_t) * 2.0)
                classification = "SUSPICIOUS_FRONT"
                evidence.append(
                    f"Spatial gradient detected: Station deviates by {dev_t:+.1f}°C from regional mean, with high neighbour variability (σ={n_std_t:.1f}°C)."
                )

        # 2. GENUINE WEATHER EVENT:
        # If target station experienced a large shift (e.g., from its own historical baseline)
        # but the neighbour mean also experienced a large consistent shift or matches the target station closely:
        # Or if multiple nearby stations report synchronized abnormal values:
        if abs(dev_t) <= 3.5:
            # Station is consistent with its neighbours
            score = max(0.0, abs(dev_t) * 2.0)
            classification = "NORMAL"
        
        # Detect if a regional weather event is in progress across the cluster
        # Check if the neighbour cluster as a whole shifted significantly from regional baseline
        meta = next((s for s in STATIONS_METADATA if s["station_id"] == station_id), None)
        if meta:
            base_t = meta["base_t"]
            cluster_shift = n_mean_t - base_t
            station_shift = t - base_t
            # If both station and neighbours shifted by > 4.5C in the SAME direction
            if abs(station_shift) > 4.5 and abs(cluster_shift) > 4.0 and (station_shift * cluster_shift > 0):
                classification = "GENUINE_WEATHER_EVENT"
                score = 30.0  # Moderate anomaly score for weather event, but NOT sensor fault!
                evidence.append(
                    f"Genuine Weather Event — Multiple nearby stations show consistent changes (cluster shift: {cluster_shift:+.1f}°C, target shift: {station_shift:+.1f}°C). Spatial consistency confirmed."
                )

        spatial_metrics["score"] = round(score, 1)
        spatial_metrics["classification"] = classification
        return score, classification, evidence, spatial_metrics
