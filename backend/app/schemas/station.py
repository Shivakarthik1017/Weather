from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class StationBase(BaseModel):
    station_id: str
    station_name: str
    latitude: float
    longitude: float
    region: str
    status: str = "normal"
    sensor_health: float = 100.0
    degradation_risk: str = "LOW"
    last_update: Optional[str] = None
    elevation_m: float = 100.0

class StationResponse(StationBase):
    active_anomaly: Optional[Dict[str, Any]] = None
    latest_observation: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class ObservationSchema(BaseModel):
    station_id: str
    timestamp: str
    temperature_c: Optional[float] = None
    pressure_hpa: Optional[float] = None
    relative_humidity: Optional[float] = None
    data_quality_status: str = "VALID"
    reference_temperature: Optional[float] = None
    reference_pressure: Optional[float] = None
    reference_humidity: Optional[float] = None

class AnomalySchema(BaseModel):
    id: Optional[int] = None
    station_id: str
    timestamp: str
    parameter: str
    observed_value: Optional[float] = None
    anomaly_score: float
    severity: str
    classification: str
    root_cause: str
    confidence: float
    evidence: str
    status: str = "ACTIVE"
    is_ground_truth: bool = False

class SensorHealthSchema(BaseModel):
    station_id: str
    timestamp: str
    health_score: float
    trend: str
    degradation_risk: str
    anomaly_frequency: float
    missing_data_rate: float
    comm_failure_count: int
    drift_detected: bool
    factors: Dict[str, Any] = {}

class CorrectionSchema(BaseModel):
    station_id: str
    timestamp: str
    parameter: str
    original_value: Optional[float] = None
    estimated_value: float
    correction_method: str
    correction_confidence: float
    reason: str

class AnomalyInjectionRequest(BaseModel):
    station_id: str
    anomaly_type: str  # e.g., temperature_spike, frozen_sensor, sensor_drift, regional_weather_event
    magnitude: Optional[float] = None
    duration_ticks: int = 15

class SimulationControlRequest(BaseModel):
    action: str  # start, pause, reset
    speed_factor: Optional[float] = 1.0
    active_stations: Optional[int] = 42

class EvaluationMetricsResponse(BaseModel):
    total_observations: int
    total_anomalies_detected: int
    ground_truth_anomalies: int
    true_positives: int
    false_positives: int
    true_negatives: int
    false_negatives: int
    precision: float
    recall: float
    f1_score: float
    false_positive_rate: float
    avg_detection_latency_ms: float
    avg_processing_time_ms: float
