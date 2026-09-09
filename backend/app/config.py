import os
from pydantic import BaseModel

class Settings(BaseModel):
    APP_NAME: str = "SkyGuard AI"
    APP_VERSION: str = "1.0.0"
    API_PORT: int = 8001  # Internal FastAPI port
    DATABASE_URL: str = "sqlite:///./data/skyguard.db"
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1/forecast"
    SIMULATION_INTERVAL_SEC: float = 2.0
    DEFAULT_ACTIVE_STATIONS: int = 42
    
    # Anomaly Detection Configurable Thresholds
    TEMP_MIN_C: float = -20.0
    TEMP_MAX_C: float = 55.0
    TEMP_MAX_STEP_C: float = 6.0
    
    PRESSURE_MIN_HPA: float = 920.0
    PRESSURE_MAX_HPA: float = 1060.0
    PRESSURE_MAX_STEP_HPA: float = 12.0
    
    HUMIDITY_MIN_PCT: float = 2.0
    HUMIDITY_MAX_PCT: float = 100.0
    HUMIDITY_MAX_STEP_PCT: float = 30.0
    
    FROZEN_CONSECUTIVE_LIMIT: int = 6
    SPATIAL_NEIGHBOUR_COUNT: int = 5
    SPATIAL_MAX_RADIUS_KM: float = 450.0
    SPATIAL_ZSCORE_THRESHOLD: float = 2.8
    
    # Health Scoring Weights
    WEIGHT_ANOMALY_FREQ: float = 0.35
    WEIGHT_MISSING_DATA: float = 0.20
    WEIGHT_COMM_FAIL: float = 0.15
    WEIGHT_FROZEN_SENSOR: float = 0.15
    WEIGHT_DRIFT: float = 0.15

settings = Settings()
