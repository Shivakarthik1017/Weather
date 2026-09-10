import React, { useState } from 'react';
import { AWS_STATIONS } from '../data/stations';
import { AnomalyType, InjectedAnomalyConfig } from '../types';
import { X, Zap, RotateCcw, AlertTriangle, CloudRain, Flame, Activity } from 'lucide-react';

interface AnomalyInjectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInject: (config: InjectedAnomalyConfig) => void;
  onClearAll: () => void;
  selectedStationId: string | null;
}

export const AnomalyInjectorModal: React.FC<AnomalyInjectorModalProps> = ({
  isOpen,
  onClose,
  onInject,
  onClearAll,
  selectedStationId
}) => {
  const [stationId, setStationId] = useState<string>(selectedStationId || AWS_STATIONS[0].id);
  const [scenario, setScenario] = useState<string>('TEMP_SPIKE');
  const [durationTicks, setDurationTicks] = useState<number>(30);
  const [affectCluster, setAffectCluster] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleInject = () => {
    let type: AnomalyType = 'SENSOR_FAULT';
    let parameter: 'temperature' | 'pressure' | 'humidity' | 'all' = 'temperature';
    let magnitude = 15.0;
    let shouldAffectCluster = affectCluster;

    switch (scenario) {
      case 'TEMP_SPIKE':
        type = 'SENSOR_FAULT';
        parameter = 'temperature';
        magnitude = 18.5;
        break;
      case 'TEMP_PLUNGE':
        type = 'SENSOR_FAULT';
        parameter = 'temperature';
        magnitude = -18.5;
        break;
      case 'PRESSURE_SURGE':
        type = 'SENSOR_FAULT';
        parameter = 'pressure';
        magnitude = 35.0;
        break;
      case 'PRESSURE_DROP':
        type = 'SENSOR_FAULT';
        parameter = 'pressure';
        magnitude = -35.0;
        break;
      case 'THERMO_CONTRADICTION':
        type = 'DATA_QUALITY_FAULT';
        parameter = 'all';
        magnitude = 25.0;
        break;
      case 'FROZEN_SENSOR':
        type = 'FROZEN_SENSOR';
        parameter = 'all';
        magnitude = 0;
        break;
      case 'SENSOR_DRIFT':
        type = 'SENSOR_DRIFT';
        parameter = 'temperature';
        magnitude = 0.45;
        break;
      case 'COMM_DROP':
        type = 'COMMUNICATION_FAULT';
        parameter = 'all';
        magnitude = 0;
        break;
      case 'WEATHER_FRONT':
        type = 'WEATHER_EVENT';
        parameter = 'all';
        magnitude = 8.5;
        shouldAffectCluster = true; // Simulates genuine regional frontal squall line across neighbors!
        break;
      default:
        break;
    }

    onInject({
      stationId,
      type,
      parameter,
      magnitude,
      durationTicks,
      affectSpatialCluster: shouldAffectCluster
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="relative z-[1100] bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col text-slate-900 text-xs">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-amber-600 to-rose-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-200" />
            <div>
              <h3 className="font-bold text-sm text-white">Anomaly Injection Sandbox</h3>
              <p className="text-[11px] text-amber-100">
                Simulate realistic sensor degradation, faults & severe weather
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {/* Target Station */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Target AWS Node</label>
            <select
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg font-medium text-slate-800 bg-white"
            >
              {AWS_STATIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) - {s.region}
                </option>
              ))}
            </select>
          </div>

          {/* Fault Scenario */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Fault / Weather Scenario</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: 'TEMP_SPIKE', label: 'Thermal Spike (+18.5°C)', desc: 'Sensor short-circuit / wire fault', icon: Flame },
                { id: 'TEMP_PLUNGE', label: 'Thermal Plunge (-18.5°C)', desc: 'Open-circuit / contact drop', icon: Activity },
                { id: 'PRESSURE_SURGE', label: 'Barometric Surge (+35 hPa)', desc: 'Piezoresistive diaphragm surge', icon: AlertTriangle },
                { id: 'THERMO_CONTRADICTION', label: 'Thermodynamic Violation', desc: '52°C with 95% RH impossibility', icon: AlertTriangle },
                { id: 'FROZEN_SENSOR', label: 'Frozen Sensor (ADC Latch)', desc: 'Flatline micro-variance lockup', icon: Activity },
                { id: 'SENSOR_DRIFT', label: 'Semiconductor Drift', desc: 'Monotonic +0.45°C departure/tick', icon: Activity },
                { id: 'COMM_DROP', label: 'Cellular / Battery Outage', desc: 'Complete packet loss', icon: AlertTriangle },
                { id: 'WEATHER_FRONT', label: 'Genuine Weather Event', desc: 'Consensus shift across cluster', icon: CloudRain, highlight: true }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setScenario(item.id);
                    if (item.id === 'WEATHER_FRONT') setAffectCluster(true);
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    scenario === item.id
                      ? item.highlight
                        ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500'
                        : 'bg-amber-50 border-amber-500 ring-2 ring-amber-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>{item.label}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration in Ticks */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Duration (Ticks)</label>
              <span className="font-mono font-bold text-slate-900">{durationTicks} ticks (~{durationTicks * 3}s)</span>
            </div>
            <input
              type="range"
              min="10"
              max="120"
              value={durationTicks}
              onChange={(e) => setDurationTicks(Number(e.target.value))}
              className="w-full accent-amber-600"
            />
          </div>

          {/* Regional Cluster Propagation Option */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={affectCluster}
                onChange={(e) => setAffectCluster(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-0"
              />
              <div>
                <span className="font-bold text-slate-900 block">
                  Simulate Spatial Consensus (Mesoscale Cluster Propagation)
                </span>
                <span className="text-[11px] text-slate-500">
                  Propagates coherent changes to nearest 3 spatial neighbor nodes. Tests SkyGuard AI's core intelligence: validating whether an abnormal reading is a genuine weather event vs an isolated sensor fault.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClearAll();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear All Faults
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInject}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-amber-600 to-rose-600 text-white font-bold rounded-lg shadow-sm hover:from-amber-500 hover:to-rose-500 transition-all active:scale-95"
            >
              <Zap className="w-3.5 h-3.5" />
              Launch Anomaly
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
