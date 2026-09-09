import React from 'react';
import {
  Radio,
  AlertTriangle,
  CloudRain,
  HeartPulse,
  Target,
  Zap
} from 'lucide-react';
import { EvaluationMetrics } from '../types';

interface KPICardsProps {
  totalStations: number;
  activeStations: number;
  sensorFaultCount: number;
  weatherEventCount: number;
  avgHealthScore: number;
  metrics: EvaluationMetrics;
}

export const KPICards: React.FC<KPICardsProps> = ({
  totalStations,
  activeStations,
  sensorFaultCount,
  weatherEventCount,
  avgHealthScore,
  metrics
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {/* 1. Network Telemetry Status */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-sm hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Active AWS Nodes</span>
          <div className="p-1 rounded-md bg-sky-50 text-sky-600">
            <Radio className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-slate-900">{activeStations}</span>
          <span className="text-xs text-slate-500 font-mono">/ {totalStations} Online</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>100% Ingestion Up</span>
        </div>
      </div>

      {/* 2. Sensor Faults (Untrusted) */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-sm hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Sensor Faults</span>
          <div className={`p-1 rounded-md ${sensorFaultCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-2xl font-bold font-mono ${sensorFaultCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {sensorFaultCount}
          </span>
          <span className="text-xs text-slate-500">Untrusted Data</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          Hardware / Drift / Frozen
        </div>
      </div>

      {/* 3. Genuine Weather Events (Trusted!) */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-sm hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Weather Events</span>
          <div className={`p-1 rounded-md ${weatherEventCount > 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
            <CloudRain className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-2xl font-bold font-mono ${weatherEventCount > 0 ? 'text-indigo-600' : 'text-slate-900'}`}>
            {weatherEventCount}
          </span>
          <span className="text-xs text-emerald-600 font-medium">Validated True</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          Regional Mesoscale Fronts
        </div>
      </div>

      {/* 4. Sensor Health Index */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-sm hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Network Health</span>
          <div className="p-1 rounded-md bg-emerald-50 text-emerald-600">
            <HeartPulse className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-slate-900">{avgHealthScore.toFixed(1)}%</span>
          <span className="text-xs text-slate-500">Average</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          Degradation & Lifespan
        </div>
      </div>

      {/* 5. Precision & Processing Latency */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-sm hover:border-slate-300 transition-colors col-span-2 md:col-span-1">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Detection F1 / Latency</span>
          <div className="p-1 rounded-md bg-amber-50 text-amber-600">
            <Target className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-slate-900">{metrics.f1Score.toFixed(1)}%</span>
          <span className="text-xs text-slate-500 font-mono">({metrics.averageLatencyMs}ms)</span>
        </div>
        <div className="mt-1 text-[11px] text-emerald-600 font-medium">
          6-Tier Multistage Pipeline
        </div>
      </div>
    </div>
  );
};
