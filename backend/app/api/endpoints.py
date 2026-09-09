import json
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from backend.app.schemas.station import (
    StationResponse, ObservationSchema, AnomalySchema,
    SensorHealthSchema, AnomalyInjectionRequest, SimulationControlRequest,
    EvaluationMetricsResponse
)
from backend.app.simulator.network import STATIONS_METADATA
from backend.app.config import settings

router = APIRouter(prefix="/api")

# We attach references to the running services in main.py
app_state: Dict[str, Any] = {}

def get_pipeline():
    pipeline = app_state.get("pipeline")
    if not pipeline:
        raise HTTPException(status_code=503, detail="Pipeline service initializing")
    return pipeline

@router.get("/metrics")
async def get_dashboard_metrics(pipeline = Depends(get_pipeline)):
    return pipeline.get_kpi_metrics()

@router.get("/stations")
async def get_stations(region: Optional[str] = None, pipeline = Depends(get_pipeline)):
    stations = pipeline.get_all_stations()
    if region:
        stations = [s for s in stations if s["region"].lower() == region.lower()]
    return stations

@router.get("/stations/{station_id}")
async def get_station_detail(station_id: str, pipeline = Depends(get_pipeline)):
    detail = pipeline.get_station_detail(station_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Station {station_id} not found")
    return detail

@router.get("/stations/{station_id}/observations")
async def get_station_observations(
    station_id: str,
    limit: int = Query(60, ge=5, le=300),
    pipeline = Depends(get_pipeline)
):
    obs = pipeline.get_station_observations(station_id, limit)
    return obs

@router.get("/stations/{station_id}/health")
async def get_station_health(station_id: str, pipeline = Depends(get_pipeline)):
    health = pipeline.get_station_health_detail(station_id)
    if not health:
        raise HTTPException(status_code=404, detail=f"Health data for {station_id} not found")
    return health

@router.get("/stations/{station_id}/corrections")
async def get_station_corrections(station_id: str, pipeline = Depends(get_pipeline)):
    return pipeline.get_station_corrections(station_id)

@router.get("/anomalies")
async def get_anomalies(
    severity: Optional[str] = None,
    anomaly_type: Optional[str] = None,
    station_id: Optional[str] = None,
    root_cause: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    pipeline = Depends(get_pipeline)
):
    anomalies = pipeline.get_anomalies(
        severity=severity,
        anomaly_type=anomaly_type,
        station_id=station_id,
        root_cause=root_cause,
        limit=limit
    )
    return anomalies

@router.get("/anomalies/{anomaly_id}")
async def get_anomaly_detail(anomaly_id: int, pipeline = Depends(get_pipeline)):
    detail = pipeline.get_anomaly_by_id(anomaly_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Anomaly record not found")
    return detail

@router.get("/analytics")
async def get_analytics(pipeline = Depends(get_pipeline)):
    return pipeline.get_analytics_summary()

@router.post("/simulation/start")
async def start_simulation(pipeline = Depends(get_pipeline)):
    pipeline.is_running = True
    return {"status": "running", "message": "Simulation resumed"}

@router.post("/simulation/stop")
async def stop_simulation(pipeline = Depends(get_pipeline)):
    pipeline.is_running = False
    return {"status": "paused", "message": "Simulation paused"}

@router.post("/simulation/reset")
async def reset_simulation(pipeline = Depends(get_pipeline)):
    pipeline.reset()
    return {"status": "reset", "message": "Simulation reset to pristine baseline"}

@router.post("/simulation/inject")
async def inject_anomaly(payload: AnomalyInjectionRequest, pipeline = Depends(get_pipeline)):
    result = pipeline.inject_anomaly(
        station_id=payload.station_id,
        anomaly_type=payload.anomaly_type,
        magnitude=payload.magnitude,
        duration_ticks=payload.duration_ticks
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.get("/evaluation")
async def get_evaluation_metrics(pipeline = Depends(get_pipeline)):
    return pipeline.evaluation_tracker.get_metrics()

@router.get("/open-meteo/{station_id}")
async def get_open_meteo_reference(station_id: str, pipeline = Depends(get_pipeline)):
    meta = next((s for s in STATIONS_METADATA if s["station_id"] == station_id), None)
    if not meta:
        raise HTTPException(status_code=404, detail="Station not found")
    ref = await pipeline.open_meteo.fetch_reference_data(meta["lat"], meta["lon"], station_id)
    return ref

@router.get("/settings")
async def get_app_settings():
    return {
        "TEMP_MIN_C": settings.TEMP_MIN_C,
        "TEMP_MAX_C": settings.TEMP_MAX_C,
        "TEMP_MAX_STEP_C": settings.TEMP_MAX_STEP_C,
        "PRESSURE_MIN_HPA": settings.PRESSURE_MIN_HPA,
        "PRESSURE_MAX_HPA": settings.PRESSURE_MAX_HPA,
        "PRESSURE_MAX_STEP_HPA": settings.PRESSURE_MAX_STEP_HPA,
        "HUMIDITY_MIN_PCT": settings.HUMIDITY_MIN_PCT,
        "HUMIDITY_MAX_PCT": settings.HUMIDITY_MAX_PCT,
        "FROZEN_CONSECUTIVE_LIMIT": settings.FROZEN_CONSECUTIVE_LIMIT,
        "SPATIAL_NEIGHBOUR_COUNT": settings.SPATIAL_NEIGHBOUR_COUNT,
        "SPATIAL_MAX_RADIUS_KM": settings.SPATIAL_MAX_RADIUS_KM,
        "SIMULATION_INTERVAL_SEC": settings.SIMULATION_INTERVAL_SEC
    }

@router.post("/settings")
async def update_app_settings(config: Dict[str, Any], pipeline = Depends(get_pipeline)):
    for key, val in config.items():
        if hasattr(settings, key):
            setattr(settings, key, val)
    return {"status": "updated", "settings": await get_app_settings()}
