import React, { useState } from 'react';
import { AWS_STATIONS } from '../data/stations';
import { AnomalyDetectionResult, WeatherObservation } from '../types';
import { haversineDistanceKm } from '../services/spatial';
import { MapPin, Navigation, Eye, AlertCircle, CloudRain, CheckCircle, Zap } from 'lucide-react';

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
  const [hoveredStationId, setHoveredStationId] = useState<string | null>(null);
  const [showSpatialLinks, setShowSpatialLinks] = useState<boolean>(true);

  // India bounding box for coordinate normalization
  // Lat: 8.0° to 36.5° N
  // Lng: 68.0° to 96.0° E
  const minLat = 7.5;
  const maxLat = 36.5;
  const minLng = 68.0;
  const maxLng = 95.5;

  const projectToSvg = (lat: number, lng: number) => {
    // Standard Mercator-like 2D projection
    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 100;
    return { x, y };
  };

  const selectedStation = AWS_STATIONS.find(s => s.id === selectedStationId);

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 relative overflow-hidden shadow-xl text-slate-100 flex flex-col h-[560px]">
      {/* Map Top Bar */}
      <div className="flex items-center justify-between z-10 mb-2">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Spatial Telemetry Map of India
          </h2>
          <span className="text-xs text-slate-400 hidden sm:inline">
            (Haversine Peer Consensus)
          </span>
        </div>

        {/* Legend & Toggle Links */}
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none">
            <input
              type="checkbox"
              checked={showSpatialLinks}
              onChange={(e) => setShowSpatialLinks(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
            />
            <span className="text-[11px]">Peer Links</span>
          </label>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 border-l border-slate-800 pl-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Normal
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Fault
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Weather Event
            </span>
          </div>
        </div>
      </div>

      {/* SVG Canvas Map */}
      <div className="relative flex-1 w-full h-full bg-slate-950/60 rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center">
        {/* Subtle Map Grid Lines */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Dynamic SVG with Station Markers and Spatial Consensus Arcs */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full max-h-[500px] z-10 select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Spatial Peer Arcs between nearest stations */}
          {showSpatialLinks &&
            AWS_STATIONS.map((s1) => {
              const p1 = projectToSvg(s1.lat, s1.lng);
              return AWS_STATIONS.map((s2) => {
                if (s1.id >= s2.id) return null;
                const dist = haversineDistanceKm(s1.lat, s1.lng, s2.lat, s2.lng);
                if (dist > 480) return null;

                const p2 = projectToSvg(s2.lat, s2.lng);
                const isConnectedToSelected =
                  selectedStationId === s1.id || selectedStationId === s2.id;

                return (
                  <line
                    key={`${s1.id}-${s2.id}`}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={isConnectedToSelected ? '#38bdf8' : '#334155'}
                    strokeWidth={isConnectedToSelected ? '0.6' : '0.25'}
                    strokeDasharray={isConnectedToSelected ? '1, 0.5' : undefined}
                    opacity={isConnectedToSelected ? 0.9 : 0.4}
                  />
                );
              });
            })}

          {/* Selected Station Spatial Consensus Radius Circle */}
          {selectedStation && (
            <circle
              cx={projectToSvg(selectedStation.lat, selectedStation.lng).x}
              cy={projectToSvg(selectedStation.lat, selectedStation.lng).y}
              r="14"
              fill="rgba(56, 189, 248, 0.05)"
              stroke="#38bdf8"
              strokeWidth="0.3"
              strokeDasharray="1, 1"
            />
          )}

          {/* Station Markers */}
          {AWS_STATIONS.map((station) => {
            const { x, y } = projectToSvg(station.lat, station.lng);
            const obs = observations.get(station.id);
            const det = detections.get(station.id);

            const isSelected = selectedStationId === station.id;
            const isHovered = hoveredStationId === station.id;

            // Status Color logic
            let fillColor = '#10b981'; // green
            let ringColor = 'rgba(16, 185, 129, 0.3)';

            if (det) {
              if (det.primaryClassification === 'WEATHER_EVENT') {
                fillColor = '#818cf8'; // indigo for genuine weather
                ringColor = 'rgba(129, 140, 248, 0.4)';
              } else if (det.primaryClassification === 'COMMUNICATION_FAULT') {
                fillColor = '#64748b'; // slate
                ringColor = 'rgba(100, 116, 139, 0.3)';
              } else if (det.status === 'ANOMALOUS') {
                fillColor = '#f43f5e'; // rose red
                ringColor = 'rgba(244, 63, 94, 0.5)';
              } else if (det.status === 'SUSPICIOUS') {
                fillColor = '#f59e0b'; // amber
                ringColor = 'rgba(245, 158, 11, 0.4)';
              }
            }

            return (
              <g
                key={station.id}
                className="cursor-pointer transition-transform"
                onClick={() => onSelectStation(station.id)}
                onMouseEnter={() => setHoveredStationId(station.id)}
                onMouseLeave={() => setHoveredStationId(null)}
              >
                {/* Outer animated halo for anomalous stations */}
                {(det?.status === 'ANOMALOUS' || det?.primaryClassification === 'WEATHER_EVENT' || isSelected) && (
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? '4' : '3'}
                    fill="none"
                    stroke={fillColor}
                    strokeWidth="0.4"
                    className="animate-ping origin-center"
                  />
                )}

                {/* Base Marker Dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? '2.2' : isHovered ? '2.0' : '1.5'}
                  fill={fillColor}
                  stroke="#0f172a"
                  strokeWidth="0.4"
                />

                {/* Station Code Label */}
                <text
                  x={x + 2}
                  y={y + 0.8}
                  fill={isSelected ? '#38bdf8' : '#cbd5e1'}
                  fontSize="2.1"
                  fontFamily="monospace"
                  fontWeight={isSelected ? 'bold' : 'normal'}
                  className="pointer-events-none select-none"
                >
                  {station.code}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover / Selected Station Floating Card */}
        {(() => {
          const activeStationId = hoveredStationId || selectedStationId;
          if (!activeStationId) return null;
          const activeMeta = AWS_STATIONS.find(s => s.id === activeStationId);
          if (!activeMeta) return null;
          const activeObs = observations.get(activeStationId);
          const activeDet = detections.get(activeStationId);

          return (
            <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-80 bg-slate-900/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-700 shadow-2xl z-20 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    <span>{activeMeta.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {activeMeta.code} · {activeMeta.region} · {activeMeta.elevation}m ASL
                  </span>
                </div>

                {/* Status Badge */}
                {activeDet && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      activeDet.primaryClassification === 'WEATHER_EVENT'
                        ? 'bg-indigo-950 text-indigo-300 border border-indigo-700'
                        : activeDet.status === 'ANOMALOUS'
                        ? 'bg-rose-950 text-rose-300 border border-rose-700'
                        : activeDet.status === 'SUSPICIOUS'
                        ? 'bg-amber-950 text-amber-300 border border-amber-700'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
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
                <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t border-slate-800 text-center font-mono">
                  <div className="bg-slate-950/60 p-1.5 rounded">
                    <span className="text-[10px] text-slate-400 block">TEMP</span>
                    <span className="font-bold text-slate-100">{activeObs.temperature}°C</span>
                  </div>
                  <div className="bg-slate-950/60 p-1.5 rounded">
                    <span className="text-[10px] text-slate-400 block">PRESSURE</span>
                    <span className="font-bold text-slate-100">{activeObs.pressure} hPa</span>
                  </div>
                  <div className="bg-slate-950/60 p-1.5 rounded">
                    <span className="text-[10px] text-slate-400 block">HUMIDITY</span>
                    <span className="font-bold text-slate-100">{activeObs.humidity}%</span>
                  </div>
                </div>
              )}

              {/* Diagnosis line if anomalous */}
              {activeDet && activeDet.primaryClassification !== 'NONE' && (
                <div className="mt-2 text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800/50 p-1.5 rounded flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">{activeDet.rootCauseAnalysis.probableCause}</span>
                    <span className="text-[10px] text-amber-200/80">
                      Confidence: {activeDet.confidenceScore}% · Urgency: {activeDet.rootCauseAnalysis.actionUrgency}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Action buttons */}
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800">
                <button
                  onClick={() => onSelectStation(activeMeta.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-1 px-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-[11px] font-semibold transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  Inspect Station
                </button>
                <button
                  onClick={() => onQuickInject(activeMeta.id)}
                  className="flex items-center justify-center gap-1 py-1 px-2.5 bg-amber-600/80 hover:bg-amber-600 text-white rounded text-[11px] font-semibold transition-colors"
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
