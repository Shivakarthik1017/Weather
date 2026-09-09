from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
import datetime
from backend.app.database import Base

class Station(Base):
    __tablename__ = "stations"

    station_id = Column(String(32), primary_key=True, index=True)
    station_name = Column(String(128), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    region = Column(String(64), nullable=False)
    status = Column(String(32), default="normal", nullable=False)
    sensor_health = Column(Float, default=100.0, nullable=False)
    degradation_risk = Column(String(16), default="LOW", nullable=False)
    last_update = Column(String(64), nullable=True)
    elevation_m = Column(Float, default=100.0, nullable=False)

    observations = relationship("Observation", back_populates="station", cascade="all, delete-orphan")
    anomalies = relationship("Anomaly", back_populates="station", cascade="all, delete-orphan")
    health_logs = relationship("SensorHealth", back_populates="station", cascade="all, delete-orphan")
    corrections = relationship("Correction", back_populates="station", cascade="all, delete-orphan")

class Observation(Base):
    __tablename__ = "observations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    station_id = Column(String(32), ForeignKey("stations.station_id"), nullable=False, index=True)
    timestamp = Column(String(64), nullable=False, index=True)
    temperature_c = Column(Float, nullable=True)
    pressure_hpa = Column(Float, nullable=True)
    relative_humidity = Column(Float, nullable=True)
    data_quality_status = Column(String(32), default="VALID", nullable=False)
    
    reference_temperature = Column(Float, nullable=True)
    reference_pressure = Column(Float, nullable=True)
    reference_humidity = Column(Float, nullable=True)

    station = relationship("Station", back_populates="observations")

    __table_args__ = (
        Index("idx_station_time", "station_id", "timestamp"),
    )

class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    station_id = Column(String(32), ForeignKey("stations.station_id"), nullable=False, index=True)
    timestamp = Column(String(64), nullable=False, index=True)
    parameter = Column(String(32), nullable=False)
    observed_value = Column(Float, nullable=True)
    anomaly_score = Column(Float, nullable=False)
    severity = Column(String(16), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    classification = Column(String(64), nullable=False)
    root_cause = Column(String(128), nullable=False)
    confidence = Column(Float, nullable=False)
    evidence = Column(Text, nullable=False)
    status = Column(String(16), default="ACTIVE", nullable=False)
    is_ground_truth = Column(Boolean, default=False)

    station = relationship("Station", back_populates="anomalies")

class SensorHealth(Base):
    __tablename__ = "sensor_health"

    id = Column(Integer, primary_key=True, autoincrement=True)
    station_id = Column(String(32), ForeignKey("stations.station_id"), nullable=False, index=True)
    timestamp = Column(String(64), nullable=False)
    health_score = Column(Float, nullable=False)
    trend = Column(String(16), default="STABLE", nullable=False)
    degradation_risk = Column(String(16), default="LOW", nullable=False)
    anomaly_frequency = Column(Float, default=0.0)
    missing_data_rate = Column(Float, default=0.0)
    comm_failure_count = Column(Integer, default=0)
    drift_detected = Column(Boolean, default=False)
    factors_json = Column(Text, default="{}")

    station = relationship("Station", back_populates="health_logs")

class Correction(Base):
    __tablename__ = "corrections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    station_id = Column(String(32), ForeignKey("stations.station_id"), nullable=False, index=True)
    timestamp = Column(String(64), nullable=False)
    parameter = Column(String(32), nullable=False)
    original_value = Column(Float, nullable=True)
    estimated_value = Column(Float, nullable=False)
    correction_method = Column(String(64), nullable=False)
    correction_confidence = Column(Float, nullable=False)
    reason = Column(String(256), nullable=False)

    station = relationship("Station", back_populates="corrections")

class SimulationEvent(Base):
    __tablename__ = "simulation_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    station_id = Column(String(32), nullable=False, index=True)
    anomaly_type = Column(String(64), nullable=False)
    injected_at = Column(String(64), nullable=False)
    duration_ticks = Column(Integer, default=15)
    ticks_remaining = Column(Integer, default=15)
    magnitude = Column(Float, default=0.0)
    target_parameter = Column(String(32), default="temperature")
    ground_truth = Column(Boolean, default=True)
    resolved = Column(Boolean, default=False)
