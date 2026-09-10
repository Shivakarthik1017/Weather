import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AWS_STATIONS } from '../data/stations';
import { AnomalyDetectionResult, WeatherObservation } from '../types';
import { haversineDistanceKm } from '../services/spatial';
import { INDIA_GEO_DATA } from '../data/indiaGeoData';
import { MapPin, Navigation, Eye, AlertCircle, Zap, RotateCcw } from 'lucide-react';

interface StationMapProps {
  observations: Map<string, WeatherObservation>;
  detections: Map<string, AnomalyDetectionResult>;
  selectedStationId: string | null;
  onSelectStation: (stationId: string) => void;
  onQuickInject: (stationId: string) => void;
}

export const StationMap: React.FC<StationMapProps> = ({
  observations,
  detections,
  selectedStationId,
  onSelectStation,
  onQuickInject
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const linksLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const radiusLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [hoveredStationId, setHoveredStationId] = useState<string | null>(null);
  const [showSpatialLinks, setShowSpatialLinks] = useState<boolean>(true);

  // Geographic bounds of India to focus strictly on India
  const indiaBounds = L.latLngBounds([7.0, 68.0], [36.5, 96.5]);

  // 1. Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [22.8, 79.5],
      zoom: 4.6,
      minZoom: 4,
      maxZoom: 10,
      zoomControl: false,
      attributionControl: true,
      maxBounds: L.latLngBounds([5.0, 65.0], [38.5, 100.0]),
      maxBoundsViscosity: 0.8
    });

    // Standard OpenStreetMap raster tile layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 4,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Render geographic state boundaries of India
    const geoLayer = L.geoJSON(INDIA_GEO_DATA, {
      style: () => ({
        color: '#334155',        // state border line
        weight: 1.2,             // subtle crisp stroke
        opacity: 0.8,
        fillColor: '#ffffff',    // light subtle fill
        fillOpacity: 0.05,
        dashArray: '2, 3'
      })
    }).addTo(map);
    geoJsonLayerRef.current = geoLayer;

    // Layer groups for dynamic elements
    const linksGroup = L.layerGroup().addTo(map);
    const radiusGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);

    linksLayerGroupRef.current = linksGroup;
    radiusLayerGroupRef.current = radiusGroup;
    markersLayerGroupRef.current = markersGroup;

    // Fit view snugly to India
    map.fitBounds(indiaBounds, { padding: [16, 16] });
    mapInstanceRef.current = map;

    const triggerInvalidate = () => {
      if (!mapInstanceRef.current) return;
      mapInstanceRef.current.invalidateSize({ pan: false });
    };

    // Immediate requestAnimationFrame pass
    const rafId = requestAnimationFrame(() => {
      triggerInvalidate();
      map.fitBounds(indiaBounds, { padding: [16, 16] });
    });

    // Staggered timeouts as layout, fonts, and parent CSS grid finish computing
    const t1 = setTimeout(() => {
      triggerInvalidate();
      map.fitBounds(indiaBounds, { padding: [16, 16] });
    }, 80);

    const t2 = setTimeout(() => {
      triggerInvalidate();
    }, 250);

    const t3 = setTimeout(() => {
      triggerInvalidate();
    }, 600);

    // Responsive window resize handler
    const handleWindowResize = () => {
      triggerInvalidate();
    };
    window.addEventListener('resize', handleWindowResize);

    // Responsive container resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 50 && entry.contentRect.height > 50) {
          map.invalidateSize({ pan: false });
        }
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', handleWindowResize);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Update Peer Links and Consensus Radius when stations/selection changes
  useEffect(() => {
    const linksGroup = linksLayerGroupRef.current;
    const radiusGroup = radiusLayerGroupRef.current;
    if (!linksGroup || !radiusGroup) return;

    linksGroup.clearLayers();
    radiusGroup.clearLayers();

    // Render peer links based on Haversine distance
    if (showSpatialLinks) {
      for (let i = 0; i < AWS_STATIONS.length; i++) {
        const s1 = AWS_STATIONS[i];
        for (let j = i + 1; j < AWS_STATIONS.length; j++) {
          const s2 = AWS_STATIONS[j];
          const dist = haversineDistanceKm(s1.lat, s1.lng, s2.lat, s2.lng);
          if (dist > 480) continue; // standard Haversine consensus threshold

          const isConnectedToSelected =
            selectedStationId === s1.id || selectedStationId === s2.id;

          const line = L.polyline(
            [
              [s1.lat, s1.lng],
              [s2.lat, s2.lng]
            ],
            {
              color: isConnectedToSelected ? '#0284c7' : '#94a3b8',
              weight: isConnectedToSelected ? 2.4 : 1.1,
              dashArray: isConnectedToSelected ? '4, 4' : '2, 3',
              opacity: isConnectedToSelected ? 0.95 : 0.45
            }
          );
          linksGroup.addLayer(line);
        }
      }
    }

    // Selected Station Spatial Consensus Radius Circle (480 km peer zone)
    const selectedStation = AWS_STATIONS.find(s => s.id === selectedStationId);
    if (selectedStation) {
      const radiusCircle = L.circle([selectedStation.lat, selectedStation.lng], {
        radius: 480000, // 480 km in meters
        color: '#0284c7',
        weight: 1.5,
        dashArray: '4, 4',
        fillColor: '#38bdf8',
        fillOpacity: 0.07
      });
      radiusGroup.addLayer(radiusCircle);
    }
  }, [selectedStationId, showSpatialLinks]);

  // 3. Update Station Markers when detections, observations, or selection change
  useEffect(() => {
    const markersGroup = markersLayerGroupRef.current;
    if (!markersGroup) return;

    markersGroup.clearLayers();

    AWS_STATIONS.forEach((station) => {
      const isSelected = selectedStationId === station.id;
      const isHovered = hoveredStationId === station.id;
      const det = detections.get(station.id);

      // Status Color logic preserving existing mappings
      let fillColor = '#10b981'; // Green: Normal
      let glowClass = '';

      if (det) {
        if (det.primaryClassification === 'WEATHER_EVENT') {
          fillColor = '#6366f1'; // Indigo/Purple: Genuine Weather Event
          glowClass = 'animate-ping';
        } else if (det.primaryClassification === 'COMMUNICATION_FAULT') {
          fillColor = '#64748b'; // Slate: Comm fault
        } else if (det.status === 'ANOMALOUS') {
          fillColor = '#ef4444'; // Red: Sensor Fault
          glowClass = 'animate-ping';
        } else if (det.status === 'SUSPICIOUS') {
          fillColor = '#f59e0b'; // Amber: Suspicious
        }
      }

      const size = isSelected ? 18 : isHovered ? 16 : 13;

      const markerHtml = `
        <div class="relative flex items-center justify-center cursor-pointer select-none" style="width: ${size}px; height: ${size}px;">
          ${(glowClass || isSelected) ? `
            <div class="absolute -inset-1.5 rounded-full opacity-70 ${glowClass}" style="background-color: ${fillColor};"></div>
          ` : ''}
          <div class="relative rounded-full shadow-md transition-all duration-150 ${isSelected ? 'ring-2 ring-sky-500 scale-110' : 'hover:scale-115'}" 
               style="width: ${size}px; height: ${size}px; background-color: ${fillColor}; border: 2px solid #ffffff;">
          </div>
          <div class="absolute left-full ml-1.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-tight pointer-events-none shadow-sm ${
            isSelected
              ? 'bg-sky-700 text-white ring-1 ring-sky-400 z-30'
              : 'bg-white/95 text-slate-800 border border-slate-300 z-20'
          }">
            ${station.code}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'aws-station-leaflet-marker',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });

      const marker = L.marker([station.lat, station.lng], {
        icon: customIcon,
        zIndexOffset: isSelected ? 1000 : isHovered ? 800 : 100
      });

      marker.on('click', () => {
        onSelectStation(station.id);
      });

      marker.on('mouseover', () => {
        setHoveredStationId(station.id);
      });

      marker.on('mouseout', () => {
        setHoveredStationId(null);
      });

      markersGroup.addLayer(marker);
    });
  }, [detections, selectedStationId, hoveredStationId, onSelectStation]);

  const handleResetView = () => {
    mapInstanceRef.current?.fitBounds(indiaBounds, { padding: [16, 16] });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 relative z-0 isolate overflow-hidden shadow-sm text-slate-900 flex flex-col h-[580px] sm:h-[620px]">
      {/* Map Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 z-10 mb-2.5 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-sky-600 shrink-0" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Spatial Telemetry Map of India
          </h2>
          <span className="text-xs text-slate-500 hidden sm:inline">
            (Haversine Peer Consensus)
          </span>
        </div>

        {/* Legend & Controls */}
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={handleResetView}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
            title="Reset to India geographic view"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden xs:inline">Reset View</span>
          </button>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-slate-900 select-none">
            <input
              type="checkbox"
              checked={showSpatialLinks}
              onChange={(e) => setShowSpatialLinks(e.target.checked)}
              className="rounded bg-slate-100 border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <span className="text-[11px] font-medium">Peer Links</span>
          </label>

          <div className="hidden md:flex items-center gap-2.5 text-[11px] text-slate-600 border-l border-slate-200 pl-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-1 ring-emerald-600/20"></span> Normal
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-1 ring-rose-600/20"></span> Fault
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-1 ring-indigo-600/20"></span> Weather Event
            </span>
          </div>
        </div>
      </div>

      {/* Real Geographic Map Canvas Container */}
      <div className="relative z-0 isolate flex-1 w-full min-h-[440px] rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
        <div
          ref={mapContainerRef}
          className="absolute inset-0 w-full h-full"
          style={{ minHeight: '440px', width: '100%', height: '100%' }}
        />

        {/* Hover / Selected Station Floating Card */}
        {(() => {
          const activeStationId = hoveredStationId || selectedStationId;
          if (!activeStationId) return null;
          const activeMeta = AWS_STATIONS.find((s) => s.id === activeStationId);
          if (!activeMeta) return null;
          const activeObs = observations.get(activeStationId);
          const activeDet = detections.get(activeStationId);

          return (
            <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-80 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-300 shadow-xl z-20 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span className="truncate">{activeMeta.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                    {activeMeta.code} · {activeMeta.region} · {activeMeta.elevation}m ASL
                  </span>
                </div>

                {/* Status Badge */}
                {activeDet && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      activeDet.primaryClassification === 'WEATHER_EVENT'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : activeDet.status === 'ANOMALOUS'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : activeDet.status === 'SUSPICIOUS'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {activeDet.primaryClassification === 'WEATHER_EVENT'
                      ? 'Weather Event'
                      : activeDet.status}
                  </span>
                )}
              </div>

              {/* Real-time telemetry snapshot */}
              {activeObs && (
                <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t border-slate-100 text-center font-mono">
                  <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">TEMP</span>
                    <span className="font-bold text-slate-900">{activeObs.temperature}°C</span>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">PRESSURE</span>
                    <span className="font-bold text-slate-900">{activeObs.pressure} hPa</span>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">HUMIDITY</span>
                    <span className="font-bold text-slate-900">{activeObs.humidity}%</span>
                  </div>
                </div>
              )}

              {/* Diagnosis line if anomalous */}
              {activeDet && activeDet.primaryClassification !== 'NONE' && (
                <div className="mt-2 text-[11px] text-amber-900 bg-amber-50 border border-amber-200 p-1.5 rounded flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">{activeDet.rootCauseAnalysis.probableCause}</span>
                    <span className="text-[10px] text-amber-700">
                      Confidence: {activeDet.confidenceScore}% · Urgency: {activeDet.rootCauseAnalysis.actionUrgency}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Action buttons */}
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
                <button
                  onClick={() => onSelectStation(activeMeta.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-1 px-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-[11px] font-semibold transition-colors shadow-sm"
                >
                  <Eye className="w-3 h-3" />
                  Inspect Station
                </button>
                <button
                  onClick={() => onQuickInject(activeMeta.id)}
                  className="flex items-center justify-center gap-1 py-1 px-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-semibold transition-colors shadow-sm"
                >
                  <Zap className="w-3 h-3" />
                  Inject Fault
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
