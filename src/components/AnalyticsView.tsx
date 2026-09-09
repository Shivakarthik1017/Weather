import React from 'react';
import { AWS_STATIONS } from '../data/stations';
import { AnomalyDetectionResult, SensorHealthRecord } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  Wrench,
  AlertTriangle,
  Clock,
  HeartPulse,
  Cpu,
  Layers,
  ShieldCheck
} from 'lucide-react';

interface AnalyticsViewProps {
  healthRecords: Map<string, SensorHealthRecord>;
  detections: Map<string, AnomalyDetectionResult>;
  onSelectStation: (stationId: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  healthRecords,
  detections,
  onSelectStation
}) => {
  // Aggregate Health by Region
  const regionMap: Record<string, { total: number; sumHealth: number }> = {};
  for (const s of AWS_STATIONS) {
    const health = healthRecords.get(s.id)?.healthScore || 100;
    if (!regionMap[s.region]) {
      regionMap[s.region] = { total: 0, sumHealth: 0 };
    }
    regionMap[s.region].total++;
    regionMap[s.region].sumHealth += health;
  }

  const regionData = Object.entries(regionMap).map(([region, val]) => ({
    region,
    avgHealth: Math.round((val.sumHealth / val.total) * 10) / 10
  }));

  // Stations needing maintenance (lowest health)
  const maintenanceQueue = (Array.from(healthRecords.values()) as SensorHealthRecord[])
    .sort((a, b) => a.healthScore - b.healthScore)
    .slice(0, 6);

  // Subsystem averages
  let rtdSum = 0, pressSum = 0, humSum = 0, modemSum = 0;
  const total = healthRecords.size || 1;
  healthRecords.forEach((h) => {
    rtdSum += h.subsystemHealth.temperatureRtd;
    pressSum += h.subsystemHealth.barometerPiezoresistive;
    humSum += h.subsystemHealth.hygrometerCapacitive;
    modemSum += h.subsystemHealth.telemetryModem;
  });

  const subsystemData = [
    { name: 'RTD Temp Sensor', health: Math.round(rtdSum / total) },
    { name: 'Piezoresistive Barometer', health: Math.round(pressSum / total) },
    { name: 'Capacitive Hygrometer', health: Math.round(humSum / total) },
    { name: 'Cellular / GPRS Modem', health: Math.round(modemSum / total) }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-sky-600/30 border border-sky-500/40 flex items-center justify-center text-sky-400">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Network-Wide Sensor Health & Predictive Maintenance</h2>
            <p className="text-xs text-slate-400">
              Long-term sensor degradation tracking, failure risk forecasting, and regional reliability analytics
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Analytical Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Average Health */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-xs">
          <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider mb-1">
            Regional AWS Reliability Index (%)
          </h3>
          <p className="text-slate-400 text-[11px] mb-4">
            Aggregated health rating across geographic meteorological subdivisions
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="region" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis domain={[60, 100]} stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px' }} />
                <Bar dataKey="avgHealth" fill="#0284c7" radius={[6, 6, 0, 0]} name="Avg Health %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subsystem Health Comparison */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-xs">
          <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider mb-1">
            Transducer Subsystem Integrity (%)
          </h3>
          <p className="text-slate-400 text-[11px] mb-4">
            Health score by sensor instrument component class across all active stations
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subsystemData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" domain={[50, 100]} stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 11 }} width={140} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px' }} />
                <Bar dataKey="health" fill="#10b981" radius={[0, 6, 6, 0]} name="Integrity %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Predictive Maintenance Priority Queue */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">
              Predictive Maintenance Priority Queue
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Ranked by estimated failure timeline</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {maintenanceQueue.map((item) => {
            const station = AWS_STATIONS.find((s) => s.id === item.stationId);
            if (!station) return null;

            return (
              <div
                key={item.stationId}
                onClick={() => onSelectStation(item.stationId)}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all bg-slate-50/50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{station.name}</h4>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {station.code} · {station.region}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.degradationRisk === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-800'
                        : item.degradationRisk === 'HIGH'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {item.degradationRisk} RISK
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-slate-400 text-[10px] block">HEALTH SCORE</span>
                    <span className="font-bold text-slate-900">{item.healthScore}%</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-slate-400 text-[10px] block">EST. TO FAILURE</span>
                    <span className="font-bold text-slate-900">~{item.estimatedDaysToFailure} days</span>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Trend: <strong>{item.statusTrend}</strong></span>
                  <span className="text-sky-600 font-semibold hover:underline">
                    Inspect Station →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
