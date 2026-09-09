import time
import json
import asyncio
import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal, Base, engine
from backend.app.models.station import Station, Observation, Anomaly, SensorHealth, Correction, SimulationEvent
from backend.app.simulator.network import STATIONS_METADATA
from backend.app.simulator.generator import AWSDataSimulator
from backend.app.simulator.injector import AnomalyInjector
from backend.app.detection.physical import PhysicalValidator
from backend.app.detection.temporal import TemporalAnomalyEngine
from backend.app.detection.multivariate import MultivariateConsistencyEngine
from backend.app.detection.spatial import SpatialCrossStationEngine
from backend.app.ml.isolation_forest import IsolationForestEngine
from backend.app.detection.fusion import AnomalyFusionEngine
from backend.app.detection.root_cause import RootCauseClassifier
from backend.app.services.health import SensorHealthEngine
from backend.app.services.correction import DataImputationEngine
from backend.app.services.open_meteo import OpenMeteoService
from backend.app.services.evaluation import SystemEvaluationTracker
from backend.app.config import settings

class SkyGuardPipeline:
    def __init__(self):
        # Initialize database tables
        Base.metadata.create_all(bind=engine)
        self.init_stations_in_db()

        # Core Engines
        self.simulator = AWSDataSimulator()
        self.injector = AnomalyInjector(self.simulator)
        self.physical_val = PhysicalValidator()
        self.temporal_engine = TemporalAnomalyEngine(window_size=24)
        self.multivariate_engine = MultivariateConsistencyEngine()
        self.spatial_engine = SpatialCrossStationEngine(
            k_neighbours=settings.SPATIAL_NEIGHBOUR_COUNT,
            max_radius_km=settings.SPATIAL_MAX_RADIUS_KM
        )
        self.ml_engine = IsolationForestEngine()
        self.fusion_engine = AnomalyFusionEngine()
        self.root_cause_engine = RootCauseClassifier()
        self.health_engine = SensorHealthEngine(window_size=30)
        self.imputer = DataImputationEngine()
        self.open_meteo = OpenMeteoService()
        self.evaluation_tracker = SystemEvaluationTracker()

        # Pipeline Runtime State
        self.is_running = True
        self.latest_observations: Dict[str, Dict[str, Any]] = {}
        self.latest_anomalies: Dict[str, Dict[str, Any]] = {}
        self.active_anomaly_records: List[Dict[str, Any]] = []
        self.station_history: Dict[str, List[Dict[str, Any]]] = {}
        self.ws_clients: List[Any] = []
        self.last_tick_time = datetime.datetime.utcnow().isoformat() + "Z"
        self.active_station_count = settings.DEFAULT_ACTIVE_STATIONS

    def init_stations_in_db(self):
        db: Session = SessionLocal()
        try:
            for s in STATIONS_METADATA:
                existing = db.query(Station).filter(Station.station_id == s["station_id"]).first()
                if not existing:
                    st = Station(
                        station_id=s["station_id"],
                        station_name=s["name"],
                        latitude=s["lat"],
                        longitude=s["lon"],
                        region=s["region"],
                        elevation_m=s["elev"],
                        status="normal",
                        sensor_health=100.0,
                        degradation_risk="LOW",
                        last_update=datetime.datetime.utcnow().isoformat() + "Z"
                    )
                    db.add(st)
            db.commit()
        finally:
            db.close()

    def process_cycle(self) -> Dict[str, Any]:
        """
        Executes one full end-to-end ingestion and intelligence cycle across all stations.
        """
        t_start = time.perf_counter()
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"
        self.last_tick_time = now_iso

        # 1. Simulator generates observations for this tick
        raw_observations = self.simulator.generate_tick(active_count=self.active_station_count)
        self.injector.process_tick()

        db: Session = SessionLocal()
        cycle_anomalies = []
        station_updates = []

        try:
            # 2. Process each observation through intelligence layers
            for sid, obs in raw_observations.items():
                t_obs_start = time.perf_counter()
                prev_obs = self.latest_observations.get(sid)
                ground_truth = self.injector.get_ground_truth_for_station(sid)
                is_ground_truth = (ground_truth is not None)

                # Layer A: Physical Validation
                phys_score, is_phys_valid, phys_ev, qual_status = self.physical_val.validate(obs, prev_obs)

                # Layer B: Temporal Anomaly Engine
                temp_score, temp_feats, temp_ev, is_frozen, is_drift = self.temporal_engine.analyze(sid, obs)

                # Layer C: Multivariate Consistency Engine
                mv_score, is_mv_anom, mv_ev, mv_metrics = self.multivariate_engine.analyze(obs, temp_feats)

                # Layer D: Spatial / Cross-Station Intelligence
                spat_score, spat_class, spat_ev, spat_metrics = self.spatial_engine.analyze(
                    sid, obs, raw_observations
                )

                # Layer E: ML Isolation Forest
                ml_features = {
                    "temperature_c": obs.get("temperature_c"),
                    "pressure_hpa": obs.get("pressure_hpa"),
                    "relative_humidity": obs.get("relative_humidity"),
                    "delta_t": temp_feats.get("delta_t", 0.0),
                    "delta_p": temp_feats.get("delta_p", 0.0),
                    "delta_rh": temp_feats.get("delta_rh", 0.0),
                    "rolling_mean_t": temp_feats.get("mean_t", obs.get("temperature_c")),
                    "rolling_std_t": temp_feats.get("std_t", 0.3),
                    "rolling_mean_p": temp_feats.get("mean_p", obs.get("pressure_hpa")),
                    "rolling_std_p": temp_feats.get("std_p", 0.2),
                    "rolling_mean_rh": temp_feats.get("mean_rh", obs.get("relative_humidity")),
                    "rolling_std_rh": temp_feats.get("std_rh", 0.5),
                    "z_score_t": temp_feats.get("z_t", 0.0),
                    "z_score_p": temp_feats.get("z_p", 0.0),
                    "z_score_rh": temp_feats.get("z_rh", 0.0),
                    "neighbour_dev_t": spat_metrics.get("deviation_t", 0.0),
                    "neighbour_dev_p": spat_metrics.get("deviation_p", 0.0),
                    "neighbour_std_t": spat_metrics.get("neighbour_std_t", 0.8)
                }
                ml_score, is_ml_outlier, ml_ev, ml_meta = self.ml_engine.predict(ml_features)

                # Layer F: Anomaly Score Fusion
                fused_score, classification, severity, confidence, evidence = self.fusion_engine.fuse(
                    physical_score=phys_score,
                    temporal_score=temp_score,
                    multivariate_score=mv_score,
                    ml_score=ml_score,
                    spatial_score=spat_score,
                    spatial_classification=spat_class,
                    is_frozen=is_frozen,
                    is_drift=is_drift,
                    quality_status=qual_status,
                    evidence_lists=[phys_ev, temp_ev, mv_ev, spat_ev, ml_ev]
                )

                # Layer G: Root-Cause Classification
                root_cause, rec_action, explanation = self.root_cause_engine.classify(
                    classification=classification,
                    quality_status=qual_status,
                    is_frozen=is_frozen,
                    is_drift=is_drift,
                    spatial_classification=spat_class,
                    physical_score=phys_score,
                    temporal_score=temp_score,
                    multivariate_score=mv_score,
                    features=temp_feats,
                    observation=obs
                )

                # Layer H: Sensor Health & Degradation Risk
                health_score, trend, deg_risk, health_factors = self.health_engine.update_health(
                    station_id=sid,
                    anomaly_score=fused_score,
                    classification=classification,
                    quality_status=qual_status,
                    is_frozen=is_frozen,
                    is_drift=is_drift
                )

                # Layer I: Optional Imputation / Correction
                correction = None
                if fused_score > 45.0 and classification != "GENUINE WEATHER EVENT":
                    meta = next((s for s in STATIONS_METADATA if s["station_id"] == sid), {})
                    correction = self.imputer.estimate_corrected_value(
                        station_id=sid,
                        parameter="temperature",
                        original_val=obs.get("temperature_c"),
                        spatial_metrics=spat_metrics,
                        temporal_features=temp_feats,
                        station_meta=meta
                    )

                # Map Station Status Indicator
                if qual_status == "COMM_FAILURE":
                    station_status = "offline"
                elif classification == "GENUINE WEATHER EVENT":
                    station_status = "weather_event"
                elif classification == "SENSOR ANOMALY" or fused_score >= 70.0:
                    station_status = "sensor_anomaly"
                elif fused_score >= 45.0 or severity in ["MEDIUM", "HIGH"]:
                    station_status = "warning"
                elif fused_score >= 25.0:
                    station_status = "suspicious"
                else:
                    station_status = "normal"

                # Layer J: Evaluation Tracker update
                proc_time_ms = (time.perf_counter() - t_obs_start) * 1000.0
                is_detected_anomaly = (classification in ["SENSOR ANOMALY", "FROZEN SENSOR", "SENSOR DRIFT", "COMMUNICATION ISSUE", "DATA QUALITY ISSUE"]) or (classification == "GENUINE WEATHER EVENT" and is_ground_truth)
                self.evaluation_tracker.record_evaluation_step(
                    is_detected=is_detected_anomaly,
                    is_ground_truth=is_ground_truth,
                    proc_time_ms=proc_time_ms
                )

                # Update memory cache
                self.latest_observations[sid] = obs
                if sid not in self.station_history:
                    self.station_history[sid] = []
                self.station_history[sid].append(obs)
                if len(self.station_history[sid]) > 100:
                    self.station_history[sid].pop(0)

                # Build record object
                station_summary = {
                    "station_id": sid,
                    "status": station_status,
                    "sensor_health": health_score,
                    "degradation_risk": deg_risk,
                    "health_trend": trend,
                    "last_update": now_iso,
                    "temperature_c": obs.get("temperature_c"),
                    "pressure_hpa": obs.get("pressure_hpa"),
                    "relative_humidity": obs.get("relative_humidity"),
                    "anomaly_score": fused_score,
                    "classification": classification,
                    "severity": severity,
                    "root_cause": root_cause,
                    "confidence": confidence,
                    "correction": correction
                }
                station_updates.append(station_summary)

                # If an active anomaly is identified, record it
                if fused_score >= 40.0 or classification in ["GENUINE WEATHER EVENT", "FROZEN SENSOR", "SENSOR DRIFT", "COMMUNICATION ISSUE"]:
                    anomaly_record = {
                        "id": len(self.active_anomaly_records) + 1,
                        "station_id": sid,
                        "timestamp": now_iso,
                        "parameter": "temperature" if obs.get("temperature_c") is not None else "telemetry",
                        "observed_value": obs.get("temperature_c"),
                        "anomaly_score": fused_score,
                        "severity": severity,
                        "classification": classification,
                        "root_cause": root_cause,
                        "confidence": confidence,
                        "evidence": json.dumps(evidence),
                        "status": "ACTIVE",
                        "recommended_action": rec_action,
                        "explanation": explanation,
                        "correction": correction,
                        "spatial_metrics": spat_metrics,
                        "is_ground_truth": is_ground_truth
                    }
                    cycle_anomalies.append(anomaly_record)
                    self.latest_anomalies[sid] = anomaly_record
                    self.active_anomaly_records.insert(0, anomaly_record)
                    if len(self.active_anomaly_records) > 300:
                        self.active_anomaly_records.pop()

            # Commit to SQLite DB periodically
            db_station_map = {st.station_id: st for st in db.query(Station).all()}
            for su in station_updates:
                st = db_station_map.get(su["station_id"])
                if st:
                    st.status = su["status"]
                    st.sensor_health = su["sensor_health"]
                    st.degradation_risk = su["degradation_risk"]
                    st.last_update = su["last_update"]

            db.commit()

        except Exception as e:
            db.rollback()
            print(f"Cycle processing error: {e}")
        finally:
            db.close()

        total_cycle_ms = (time.perf_counter() - t_start) * 1000.0

        cycle_summary = {
            "timestamp": now_iso,
            "stations": station_updates,
            "new_anomalies": cycle_anomalies,
            "kpi": self.get_kpi_metrics(),
            "cycle_processing_ms": round(total_cycle_ms, 2)
        }

        return cycle_summary

    def get_kpi_metrics(self) -> Dict[str, Any]:
        stations = list(self.latest_observations.keys())
        total = len(STATIONS_METADATA)
        
        online = 0
        healthy = 0
        critical = 0
        active_anom = 0

        for sid in STATIONS_METADATA:
            s_id = sid["station_id"]
            obs = self.latest_observations.get(s_id)
            anom = self.latest_anomalies.get(s_id)
            health_state = self.health_engine.station_health_states.get(s_id)

            if obs and obs.get("data_quality_status") != "COMM_FAILURE":
                online += 1

            if anom and anom.get("status") == "ACTIVE" and anom.get("anomaly_score", 0) >= 45:
                active_anom += 1

            if health_state:
                h = health_state.get("current_health", 100.0)
                if h >= 80.0:
                    healthy += 1
                elif h < 50.0:
                    critical += 1
            else:
                healthy += 1

        return {
            "total_stations": total,
            "online_stations": online,
            "active_anomalies": active_anom,
            "healthy_stations": healthy,
            "critical_sensors": critical,
            "last_update": self.last_tick_time
        }

    def get_all_stations(self) -> List[Dict[str, Any]]:
        result = []
        for meta in STATIONS_METADATA:
            sid = meta["station_id"]
            obs = self.latest_observations.get(sid, {})
            anom = self.latest_anomalies.get(sid)
            health = self.health_engine.station_health_states.get(sid, {})
            
            # Determine current status
            status = "normal"
            if obs.get("data_quality_status") == "COMM_FAILURE":
                status = "offline"
            elif anom and anom.get("classification") == "GENUINE WEATHER EVENT":
                status = "weather_event"
            elif anom and anom.get("anomaly_score", 0) >= 70.0:
                status = "sensor_anomaly"
            elif anom and anom.get("anomaly_score", 0) >= 45.0:
                status = "warning"
            elif anom and anom.get("anomaly_score", 0) >= 25.0:
                status = "suspicious"

            result.append({
                "station_id": sid,
                "station_name": meta["name"],
                "latitude": meta["lat"],
                "longitude": meta["lon"],
                "region": meta["region"],
                "elevation_m": meta["elev"],
                "status": status,
                "sensor_health": health.get("current_health", 98.5),
                "degradation_risk": health.get("degradation_risk", "LOW"),
                "last_update": self.last_tick_time,
                "latest_observation": obs,
                "active_anomaly": anom
            })
        return result

    def _normalize_station_id(self, station_id: str) -> str:
        if not station_id:
            return station_id
        for s in STATIONS_METADATA:
            if s["station_id"].lower() == station_id.lower():
                return s["station_id"]
        return station_id

    def get_station_detail(self, station_id: str) -> Optional[Dict[str, Any]]:
        station_id = self._normalize_station_id(station_id)
        meta = next((s for s in STATIONS_METADATA if s["station_id"] == station_id), None)
        if not meta:
            return None
        obs = self.latest_observations.get(station_id, {})
        anom = self.latest_anomalies.get(station_id)
        health = self.health_engine.station_health_states.get(station_id, {})
        history = self.station_history.get(station_id, [])

        # Spatial neighbours
        neighbours = self.spatial_engine.get_neighbours(station_id)
        neighbour_info = []
        for nid, dist in neighbours:
            n_obs = self.latest_observations.get(nid, {})
            n_meta = next((s for s in STATIONS_METADATA if s["station_id"] == nid), {})
            neighbour_info.append({
                "station_id": nid,
                "name": n_meta.get("name", nid),
                "distance_km": round(dist, 1),
                "temperature_c": n_obs.get("temperature_c"),
                "status": n_obs.get("data_quality_status", "VALID")
            })

        return {
            "station_id": station_id,
            "station_name": meta["name"],
            "latitude": meta["lat"],
            "longitude": meta["lon"],
            "region": meta["region"],
            "elevation_m": meta["elev"],
            "status": meta.get("status", "normal"),
            "sensor_health": health.get("current_health", 98.5),
            "degradation_risk": health.get("degradation_risk", "LOW"),
            "health_trend": health.get("trend", "STABLE"),
            "health_factors": health.get("penalty_breakdown", {}),
            "current_observation": obs,
            "active_anomaly": anom,
            "nearby_stations": neighbour_info,
            "history": history[-40:]
        }

    def get_station_observations(self, station_id: str, limit: int = 60) -> List[Dict[str, Any]]:
        station_id = self._normalize_station_id(station_id)
        return self.station_history.get(station_id, [])[-limit:]

    def get_station_health_detail(self, station_id: str) -> Optional[Dict[str, Any]]:
        station_id = self._normalize_station_id(station_id)
        state = self.health_engine.station_health_states.get(station_id)
        if not state:
            return None
        return {
            "station_id": station_id,
            "current_health": state.get("current_health", 98.5),
            "previous_health": state.get("previous_health", 98.5),
            "trend": state.get("trend", "STABLE"),
            "degradation_risk": state.get("degradation_risk", "LOW"),
            "history_scores": state.get("history_scores", []),
            "comm_failure_count": state.get("comm_failure_count", 0),
            "frozen_count": state.get("frozen_count", 0),
            "drift_count": state.get("drift_count", 0)
        }

    def get_station_corrections(self, station_id: str) -> List[Dict[str, Any]]:
        station_id = self._normalize_station_id(station_id)
        corrections = []
        for anom in self.active_anomaly_records:
            if anom.get("station_id") == station_id and anom.get("correction"):
                corrections.append(anom["correction"])
        return corrections

    def get_anomalies(
        self,
        severity: Optional[str] = None,
        anomaly_type: Optional[str] = None,
        station_id: Optional[str] = None,
        root_cause: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        if station_id:
            station_id = self._normalize_station_id(station_id)
        filtered = self.active_anomaly_records
        if severity:
            filtered = [a for a in filtered if a.get("severity") == severity]
        if station_id:
            filtered = [a for a in filtered if a.get("station_id") == station_id]
        if root_cause:
            filtered = [a for a in filtered if root_cause.lower() in a.get("root_cause", "").lower()]
        return filtered[:limit]

    def get_anomaly_by_id(self, anomaly_id: int) -> Optional[Dict[str, Any]]:
        for a in self.active_anomaly_records:
            if a.get("id") == anomaly_id:
                return a
        return None

    def get_analytics_summary(self) -> Dict[str, Any]:
        # Calculate distributions from actual recorded data
        by_type: Dict[str, int] = {}
        by_param: Dict[str, int] = {}
        by_station: Dict[str, int] = {}
        by_severity: Dict[str, int] = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
        
        genuine_events = 0
        sensor_faults = 0
        comm_failures = 0

        for anom in self.active_anomaly_records:
            rc = anom.get("root_cause", "Unknown")
            by_type[rc] = by_type.get(rc, 0) + 1
            
            p = anom.get("parameter", "temperature")
            by_param[p] = by_param.get(p, 0) + 1
            
            sid = anom.get("station_id", "")
            by_station[sid] = by_station.get(sid, 0) + 1

            sev = anom.get("severity", "LOW")
            by_severity[sev] = by_severity.get(sev, 0) + 1

            cls = anom.get("classification", "")
            if cls == "GENUINE WEATHER EVENT":
                genuine_events += 1
            elif "SENSOR" in cls:
                sensor_faults += 1
            elif "COMMUNICATION" in cls:
                comm_failures += 1

        # Health distribution
        health_buckets = {"95-100": 0, "80-94": 0, "60-79": 0, "40-59": 0, "0-39": 0}
        all_healths = []
        for s in STATIONS_METADATA:
            sid = s["station_id"]
            h_state = self.health_engine.station_health_states.get(sid)
            val = h_state.get("current_health", 98.5) if h_state else 98.5
            all_healths.append(val)
            if val >= 95.0:
                health_buckets["95-100"] += 1
            elif val >= 80.0:
                health_buckets["80-94"] += 1
            elif val >= 60.0:
                health_buckets["60-79"] += 1
            elif val >= 40.0:
                health_buckets["40-59"] += 1
            else:
                health_buckets["0-39"] += 1

        avg_health = float(sum(all_healths) / len(all_healths)) if all_healths else 100.0

        return {
            "total_observations_recorded": self.evaluation_tracker.total_observations,
            "total_anomalies_recorded": len(self.active_anomaly_records),
            "anomalies_by_type": by_type,
            "anomalies_by_parameter": by_param,
            "anomalies_by_station": by_station,
            "anomalies_by_severity": by_severity,
            "genuine_events_count": genuine_events,
            "sensor_faults_count": sensor_faults,
            "comm_failures_count": comm_failures,
            "average_sensor_health": round(avg_health, 1),
            "health_distribution": health_buckets
        }

    def inject_anomaly(
        self,
        station_id: str,
        anomaly_type: str,
        magnitude: Optional[float] = None,
        duration_ticks: int = 15
    ) -> Dict[str, Any]:
        return self.injector.inject_anomaly(
            station_id=station_id,
            anomaly_type=anomaly_type,
            magnitude=magnitude,
            duration_ticks=duration_ticks
        )

    def reset(self):
        self.simulator.init_states()
        self.injector.active_injections.clear()
        self.injector.ground_truth_history.clear()
        self.active_anomaly_records.clear()
        self.latest_anomalies.clear()
        self.evaluation_tracker.reset()
        for sid in self.health_engine.station_health_states:
            self.health_engine.station_health_states[sid]["current_health"] = 98.5
            self.health_engine.station_health_states[sid]["trend"] = "STABLE"
            self.health_engine.station_health_states[sid]["degradation_risk"] = "LOW"
            self.health_engine.station_health_states[sid]["anomaly_history"].clear()
