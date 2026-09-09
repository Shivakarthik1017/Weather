import asyncio
import json
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from backend.app.api.endpoints import router as api_router, app_state
from backend.app.services.pipeline import SkyGuardPipeline
from backend.app.config import settings

app = FastAPI(
    title="SKYGUARD AI - Automatic Weather Station Sensor Health Platform",
    description="Intelligent Real-Time Anomaly Detection, Sensor Health & Degradation Platform",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pipeline Singleton
pipeline = SkyGuardPipeline()
app_state["pipeline"] = pipeline

# Include REST routes
app.include_router(api_router)

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)
        for dead in dead_connections:
            if dead in self.active_connections:
                self.active_connections.remove(dead)

manager = ConnectionManager()

@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    # Send initial state immediately upon connection
    try:
        init_data = {
            "type": "INITIAL_STATE",
            "kpi": pipeline.get_kpi_metrics(),
            "stations": pipeline.get_all_stations(),
            "recent_anomalies": pipeline.get_anomalies(limit=25),
            "evaluation": pipeline.evaluation_tracker.get_metrics()
        }
        await websocket.send_json(init_data)

        while True:
            # Handle incoming client commands (e.g. inject anomaly or ping)
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                cmd = payload.get("command")
                if cmd == "INJECT_ANOMALY":
                    pipeline.inject_anomaly(
                        station_id=payload.get("station_id"),
                        anomaly_type=payload.get("anomaly_type"),
                        magnitude=payload.get("magnitude"),
                        duration_ticks=payload.get("duration_ticks", 15)
                    )
                elif cmd == "PAUSE":
                    pipeline.is_running = False
                elif cmd == "RESUME":
                    pipeline.is_running = True
                elif cmd == "RESET":
                    pipeline.reset()
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

async def simulation_loop():
    """Background task executing the data generation and anomaly detection pipeline."""
    # Pre-seed with 6 cycles
    for _ in range(6):
        pipeline.process_cycle()

    while True:
        try:
            if pipeline.is_running:
                summary = pipeline.process_cycle()
                # Broadcast real-time delta tick to all connected frontend clients
                msg = {
                    "type": "CYCLE_TICK",
                    "timestamp": summary["timestamp"],
                    "kpi": summary["kpi"],
                    "stations": summary["stations"],
                    "new_anomalies": summary["new_anomalies"],
                    "evaluation": pipeline.evaluation_tracker.get_metrics(),
                    "processing_ms": summary["cycle_processing_ms"]
                }
                await manager.broadcast(msg)
        except Exception as e:
            print(f"Simulation tick error: {e}")

        await asyncio.sleep(settings.SIMULATION_INTERVAL_SEC)

@app.on_event("startup")
async def startup_event():
    # Start background simulation worker
    asyncio.create_task(simulation_loop())

if __name__ == "__main__":
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=False)
