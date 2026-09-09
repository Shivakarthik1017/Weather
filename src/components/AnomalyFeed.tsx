import React, { useState } from 'react';
import { AnomalyDetectionResult, WeatherObservation } from '../types';
import { AWS_STATIONS } from '../data/stations';
import {
  AlertTriangle,
  CloudRain,
  Radio,
  Clock,
  Wrench,
  HelpCircle,
  Eye,
  CheckCircle2,
  Filter,
  Flame,
  Activity
} from 'lucide-react';

interface AnomalyFeedProps {
  anomalies: AnomalyDetectionResult[];
  onSelectStation: (stationId: string) => void;
  onClearAnomaly: (stationId: string) => void;
}

export const AnomalyFeed: React.FC<AnomalyFeedProps> = ({
  anomalies,
  onSelectStation,
  onClearAnomaly
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  const filtered = anomalies.filter((item) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'WEATHER_EVENT') return item.primaryClassification === 'WEATHER_EVENT';
    if (filterType === 'SENSOR_FAULT')
      return item.primaryClassification === 'SENSOR_FAULT' || item.primaryClassification === 'DATA_QUALITY_FAULT';
    if (filterType === 'DRIFT_FROZEN')
      return item.primaryClassification === 'SENSOR_DRIFT' || item.primaryClassification === 'FROZEN_SENSOR';
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-[560px]">
      {/* Feed Header */}
      <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-rose-500" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Real-Time Anomaly & Event Feed
          </h2>
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
            {anomalies.length}
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 text-[11px]">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
              filterType === 'ALL'
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('SENSOR_FAULT')}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
              filterType === 'SENSOR_FAULT'
                ? 'bg-rose-600 text-white'
                : 'text-rose-700 hover:bg-rose-100'
            }`}
          >
            Faults
          </button>
          <button
            onClick={() => setFilterType('WEATHER_EVENT')}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
              filterType === 'WEATHER_EVENT'
                ? 'bg-indigo-600 text-white'
                : 'text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            Weather Events
          </button>
          <button
            onClick={() => setFilterType('DRIFT_FROZEN')}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
              filterType === 'DRIFT_FROZEN'
                ? 'bg-amber-600 text-white'
                : 'text-amber-700 hover:bg-amber-100'
            }`}
          >
            Drift/Frozen
          </button>
        </div>
      </div>

      {/* Alert Cards Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2 opacity-80" />
            <p className="text-sm font-semibold text-slate-700">Nominal Network Telemetry</p>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              All AWS stations reporting within verified physical, thermodynamic, and spatial boundaries.
            </p>
          </div>
        ) : (
          filtered.map((alert) => {
            const station = AWS_STATIONS.find(s => s.id === alert.stationId);
            const isWeatherEvent = alert.primaryClassification === 'WEATHER_EVENT';
            const isComm = alert.primaryClassification === 'COMMUNICATION_FAULT';

            return (
              <div
                key={`${alert.stationId}-${alert.timestamp}`}
                className={`rounded-xl border p-3 transition-all hover:shadow-md ${
                  isWeatherEvent
                    ? 'bg-indigo-50/50 border-indigo-200'
                    : isComm
                    ? 'bg-slate-50 border-slate-300'
                    : alert.severity === 'CRITICAL'
                    ? 'bg-rose-50/70 border-rose-200'
                    : 'bg-amber-50/60 border-amber-200'
                }`}
              >
                {/* Top line: Station, Tag, Urgency */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-xs">
                        {station?.name || alert.stationId}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">
                        ({station?.code})
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(alert.timestamp).toLocaleTimeString()} · Score: {alert.compositeAnomalyScore}/100 · Conf: {alert.confidenceScore}%
                    </span>
                  </div>

                  {/* Classification Pill */}
                  <div className="flex items-center gap-1">
                    {isWeatherEvent ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 flex items-center gap-1">
                        <CloudRain className="w-3 h-3" />
                        Weather Event (TRUSTED)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Sensor Fault (UNTRUSTED)
                      </span>
                    )}
                  </div>
                </div>

                {/* XAI: Root Cause Diagnosis */}
                <div className="mt-2 text-xs">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>{alert.rootCauseAnalysis.probableCause}</span>
                  </div>
                  {/* Evidence bullet points */}
                  <ul className="mt-1 space-y-0.5 pl-5 list-disc text-[11px] text-slate-600">
                    {alert.rootCauseAnalysis.evidence.slice(0, 2).map((ev, idx) => (
                      <li key={idx}>{ev}</li>
                    ))}
                  </ul>
                </div>

                {/* Actionable Maintenance Recommendation */}
                <div className="mt-2.5 p-2 rounded-lg bg-white/80 border border-slate-200/80 text-[11px] flex items-start gap-2">
                  <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold text-slate-800">Prescriptive Action: </span>
                    <span className="text-slate-600">
                      {alert.rootCauseAnalysis.recommendedAction}
                    </span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    Urgency: {alert.rootCauseAnalysis.actionUrgency.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onClearAnomaly(alert.stationId)}
                      className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded transition-colors"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => onSelectStation(alert.stationId)}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      Deep Inspection
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
