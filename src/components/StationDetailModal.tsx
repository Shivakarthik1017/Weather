import React, { useState } from 'react';
import { AWS_STATIONS } from '../data/stations';
import {
  AnomalyDetectionResult,
  OpenMeteoReferenceData,
  SensorHealthRecord,
  TierValidationResult,
  WeatherObservation
} from '../types';
import { fetchOpenMeteoReference } from '../services/openMeteoService';
import {
  X,
  MapPin,
  Clock,
  Activity,
  Layers,
  Wrench,
  ShieldAlert,
  HelpCircle,
  TrendingUp,
  Cpu,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Zap
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

interface StationDetailModalProps {
  stationId: string | null;
  onClose: () => void;
  observations: Map<string, WeatherObservation>;
  detections: Map<string, AnomalyDetectionResult>;
  healthRecords: Map<string, SensorHealthRecord>;
  history: WeatherObservation[];
  onInjectFault: (stationId: string) => void;
}

export const StationDetailModal: React.FC<StationDetailModalProps> = ({
  stationId,
  onClose,
  observations,
  detections,
  healthRecords,
  history,
  onInjectFault
}) => {
  const [openMeteoData, setOpenMeteoData] = useState<OpenMeteoReferenceData | null>(null);
  const [isLoadingOpenMeteo, setIsLoadingOpenMeteo] = useState(false);
  const [openMeteoError, setOpenMeteoError] = useState<string | null>(null);

  if (!stationId) return null;

  const station = AWS_STATIONS.find((s) => s.id === stationId);
  if (!station) return null;

  const currentObs = observations.get(stationId);
  const currentDet = detections.get(stationId);
  const health = healthRecords.get(stationId);

  // Format historical data for Recharts
  const chartData = history.map((h) => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    temperature: h.temperature,
    dewPoint: h.dewPoint,
    pressure: h.pressure,
    humidity: h.humidity
  }));

  const handleFetchOpenMeteo = async () => {
    setIsLoadingOpenMeteo(true);
    setOpenMeteoError(null);
    try {
      const data = await fetchOpenMeteoReference(station);
      setOpenMeteoData(data);
    } catch (err: any) {
      setOpenMeteoError(err.message || 'Failed to fetch Open-Meteo benchmark');
    } finally {
      setIsLoadingOpenMeteo(false);
    }
  };

  const isWeatherEvent = currentDet?.primaryClassification === 'WEATHER_EVENT';
  const isAnomalous = currentDet?.status === 'ANOMALOUS';

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative z-[1100] bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-900">
        {/* Modal Top Header */}
        <div className="p-4 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600/30 border border-sky-500/50 flex items-center justify-center text-sky-400 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lg text-white">{station.name}</h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                  {station.code}
                </span>
                <span className="text-xs text-slate-400">
                  {station.region} Region · {station.elevation}m ASL · ({station.lat.toFixed(3)}°N, {station.lng.toFixed(3)}°E)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Installed {station.installedYear} · Sensors: {station.sensorModel.temp} · {station.sensorModel.pressure}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Top Status & Assessment Banner */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isWeatherEvent
                ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                : isAnomalous
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  isWeatherEvent
                    ? 'bg-indigo-600 text-white'
                    : isAnomalous
                    ? 'bg-rose-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {isWeatherEvent ? (
                  <Activity className="w-5 h-5" />
                ) : isAnomalous ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">
                    {isWeatherEvent
                      ? 'GENUINE REGIONAL METEOROLOGICAL EVENT (DATA TRUSTED)'
                      : isAnomalous
                      ? 'ANOMALOUS OBSERVATION DETECTED (UNTRUSTED DATA)'
                      : 'NOMINAL AWS OBSERVATION (TRUSTED)'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white font-bold shadow-xs">
                    Score: {currentDet?.compositeAnomalyScore || 0}/100
                  </span>
                </div>
                <p className="text-xs opacity-90 mt-0.5">
                  Primary Classification: <strong>{currentDet?.primaryClassification || 'NONE'}</strong> · Confidence: {currentDet?.confidenceScore || 95}%
                </p>
              </div>
            </div>

            <button
              onClick={() => onInjectFault(station.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg shadow-sm transition-colors text-xs whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5" />
              Inject Anomaly on Node
            </button>
          </div>

          {/* Current Live Telemetry Cards */}
          <div>
            <h4 className="font-bold uppercase tracking-wider text-slate-500 mb-2">
              Live Sensor Ingestion Stream
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Air Temperature</span>
                <span className="text-xl font-bold font-mono text-slate-900">
                  {currentObs?.temperature}°C
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Base: {station.baseTemp}°C
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Barometric Pressure</span>
                <span className="text-xl font-bold font-mono text-slate-900">
                  {currentObs?.pressure} hPa
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Base: {station.basePressure} hPa
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Relative Humidity</span>
                <span className="text-xl font-bold font-mono text-slate-900">
                  {currentObs?.humidity}%
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Base: {station.baseHumidity}%
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Psychrometric Dew Point</span>
                <span className="text-xl font-bold font-mono text-slate-900">
                  {currentObs?.dewPoint}°C
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Spread: {currentObs ? (currentObs.temperature - currentObs.dewPoint).toFixed(1) : 0}°C
                </span>
              </div>
            </div>
          </div>

          {/* Real-time Telemetry Historical Graph */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold uppercase tracking-wider text-slate-600">
                Multi-Parameter Telemetry Trend (Last 30 Ticks)
              </h4>
              <span className="text-[10px] font-mono text-slate-400">Sliding Window</span>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis yAxisId="temp" orientation="left" tick={{ fontSize: 10 }} stroke="#0284c7" />
                  <YAxis yAxisId="press" orientation="right" tick={{ fontSize: 10 }} stroke="#64748b" domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line yAxisId="temp" type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#0284c7" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line yAxisId="temp" type="monotone" dataKey="dewPoint" name="Dew Point (°C)" stroke="#10b981" strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
                  <Line yAxisId="press" type="monotone" dataKey="pressure" name="Pressure (hPa)" stroke="#8b5cf6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 5-Tier Detection Pipeline Breakdown */}
          {currentDet && (
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <h4 className="font-bold uppercase tracking-wider text-white">
                    Multi-Tier Anomaly Scoring Breakdown
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-sky-400">
                  Fusion Score: {currentDet.compositeAnomalyScore}/100
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                {(Object.entries(currentDet.tierResults) as [string, TierValidationResult][]).map(([key, tier]) => (
                  <div key={key} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-200 truncate">{tier.tierName}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          tier.passed ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                        }`}
                      >
                        {tier.passed ? 'PASSED' : 'FLAGGED'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden my-1">
                      <div
                        className={`h-full rounded-full ${tier.score > 50 ? 'bg-rose-500' : 'bg-sky-500'}`}
                        style={{ width: `${Math.min(100, tier.score)}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Anomaly Score: {tier.score}/100
                    </span>
                    {tier.flags.length > 0 && (
                      <div className="mt-1 text-[9px] text-rose-300 truncate" title={tier.flags.join(', ')}>
                        {tier.flags[0]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spatial Neighbor Cross-Station Table */}
          {currentDet?.tierResults.spatial.details.neighborCount > 0 && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold uppercase tracking-wider text-slate-600 mb-2">
                Spatial Neighbor Cluster Consensus (Haversine Analysis)
              </h4>
              <p className="text-[11px] text-slate-500 mb-2">
                Evaluates whether adjacent weather stations corroborate sudden shifts.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Cluster Median Temp</span>
                  <span className="font-bold font-mono text-slate-900 text-sm">
                    {currentDet.tierResults.spatial.details.medianTemp}°C
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Cluster Median Pressure</span>
                  <span className="font-bold font-mono text-slate-900 text-sm">
                    {currentDet.tierResults.spatial.details.medianPressure} hPa
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Spatial Consensus State</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {currentDet.isSpatialEvent ? 'Coherent Regional Shift' : 'Station Is Isolated'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Non-Destructive Imputation / Clean Data Stream */}
          {currentDet?.imputedObservation && (
            <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-sky-600" />
                  <h4 className="font-bold uppercase tracking-wider text-sky-950">
                    Non-Destructive Data Imputation (Corrected Clean Stream)
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-sky-800">
                  Method: {currentDet.imputedObservation.imputationMethod} ({currentDet.imputedObservation.confidence}% conf)
                </span>
              </div>
              <p className="text-[11px] text-sky-800/80 mb-3">
                Original raw telemetry is preserved intact. Downstream forecasting pipelines can subscribe to this imputed channel:
              </p>
              <div className="grid grid-cols-3 gap-3 font-mono text-center">
                <div className="bg-white p-2.5 rounded-lg border border-sky-200">
                  <span className="text-slate-500 text-[10px] block">RAW TEMP vs IMPUTED</span>
                  <div className="text-xs font-bold text-rose-600 line-through">
                    {currentObs?.temperature}°C
                  </div>
                  <div className="text-sm font-bold text-emerald-600">
                    {currentDet.imputedObservation.temperature}°C
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-sky-200">
                  <span className="text-slate-500 text-[10px] block">RAW PRESS vs IMPUTED</span>
                  <div className="text-xs font-bold text-slate-400">
                    {currentObs?.pressure} hPa
                  </div>
                  <div className="text-sm font-bold text-emerald-600">
                    {currentDet.imputedObservation.pressure} hPa
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-sky-200">
                  <span className="text-slate-500 text-[10px] block">RAW HUM vs IMPUTED</span>
                  <div className="text-xs font-bold text-slate-400">
                    {currentObs?.humidity}%
                  </div>
                  <div className="text-sm font-bold text-emerald-600">
                    {currentDet.imputedObservation.humidity}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Root-Cause Analysis & Prescriptive Maintenance */}
          {currentDet && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold uppercase tracking-wider text-slate-800">
                  Root Cause Diagnosis & Prescriptive Action
                </h4>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 text-xs">
                  {currentDet.rootCauseAnalysis.probableCause}
                </div>
                <div className="text-slate-600 text-[11px]">
                  <strong>Prescriptive Recommendation: </strong>
                  {currentDet.rootCauseAnalysis.recommendedAction}
                </div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Urgency: {currentDet.rootCauseAnalysis.actionUrgency}
                </div>
              </div>
            </div>
          )}

          {/* Real-World Open-Meteo Verification Bench */}
          <div className="bg-slate-950 text-white p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-sky-400" />
                <h4 className="font-bold uppercase tracking-wider text-white">
                  Real-World External Ground Truth (Open-Meteo API)
                </h4>
              </div>
              <button
                onClick={handleFetchOpenMeteo}
                disabled={isLoadingOpenMeteo}
                className="flex items-center gap-1.5 px-3 py-1 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOpenMeteo ? 'animate-spin' : ''}`} />
                <span>{isLoadingOpenMeteo ? 'Fetching Live...' : 'Query Live Satellite/NWP'}</span>
              </button>
            </div>

            <p className="text-slate-400 text-[11px] mb-3">
              Performs an authentic live API request to Open-Meteo's weather service for coordinates {station.lat}°N, {station.lng}°E to verify station telemetry against independent meteorological observations.
            </p>

            {openMeteoError && (
              <div className="p-2.5 rounded bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
                {openMeteoError}
              </div>
            )}

            {openMeteoData && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block">LIVE EXTERNAL TEMP</span>
                  <span className="text-sm font-bold text-sky-300">{openMeteoData.temperature}°C</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">LIVE EXTERNAL PRESS</span>
                  <span className="text-sm font-bold text-sky-300">{openMeteoData.pressure} hPa</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">EXTERNAL HUMIDITY</span>
                  <span className="text-sm font-bold text-sky-300">{openMeteoData.relativeHumidity}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">OBSERVED CONDITION</span>
                  <span className="text-xs font-bold text-emerald-400">{openMeteoData.weatherDescription}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
