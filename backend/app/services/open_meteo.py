import asyncio
import json
import urllib.request
from typing import Dict, Any, Optional
from backend.app.config import settings

class OpenMeteoService:
    def __init__(self):
        self.base_url = settings.OPEN_METEO_BASE_URL
        self.is_service_online = True
        self.last_check_time = None
        self.cache: Dict[str, Dict[str, Any]] = {}

    def _sync_fetch(self, url: str) -> Optional[Dict[str, Any]]:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "SkyGuard-AI/1.0"}
        )
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode('utf-8'))
                return data
        return None

    async def fetch_reference_data(self, lat: float, lon: float, station_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetches reference meteorological data from Open-Meteo API.
        Non-blocking with strict timeout. Falls back gracefully if offline.
        """
        params = f"?latitude={round(lat, 4)}&longitude={round(lon, 4)}&current=temperature_2m,relative_humidity_2m,surface_pressure&timezone=auto"
        url = f"{self.base_url}{params}"

        try:
            data = await asyncio.to_thread(self._sync_fetch, url)
            if data:
                curr = data.get("current", {})
                ref_data = {
                    "reference_temperature": curr.get("temperature_2m"),
                    "reference_humidity": curr.get("relative_humidity_2m"),
                    "reference_pressure": curr.get("surface_pressure"),
                    "source": "Open-Meteo API",
                    "status": "ONLINE"
                }
                self.cache[station_id] = ref_data
                self.is_service_online = True
                return ref_data
            else:
                self.is_service_online = False
                return self._fallback_cache(station_id)
        except Exception:
            self.is_service_online = False
            return self._fallback_cache(station_id)

    def _fallback_cache(self, station_id: str) -> Dict[str, Any]:
        if station_id in self.cache:
            data = dict(self.cache[station_id])
            data["status"] = "OFFLINE_FALLBACK"
            return data
        return {
            "reference_temperature": None,
            "reference_humidity": None,
            "reference_pressure": None,
            "source": "Local Simulator Baseline",
            "status": "UNAVAILABLE"
        }
