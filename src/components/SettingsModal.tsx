import React, { useState } from 'react';
import { X, Sliders, CheckCircle2, RotateCcw } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [tempStep, setTempStep] = useState(6.0);
  const [pressureStep, setPressureStep] = useState(10.0);
  const [zScoreThreshold, setZScoreThreshold] = useState(4.0);
  const [spatialRadiusKm, setSpatialRadiusKm] = useState(550);
  const [savedToast, setSavedToast] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 800);
  };

  const handleReset = () => {
    setTempStep(6.0);
    setPressureStep(10.0);
    setZScoreThreshold(4.0);
    setSpatialRadiusKm(550);
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="relative z-[1100] bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col text-slate-900 text-xs">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="font-bold text-sm text-white">Detection Thresholds & Configuration</h3>
              <p className="text-[11px] text-slate-400">
                WMO & IMD meteorological quality control limits
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Temp step */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Max Thermal Rate of Change (ΔT / tick)</label>
              <span className="font-mono font-bold text-slate-900">{tempStep.toFixed(1)}°C</span>
            </div>
            <input
              type="range"
              min="2.0"
              max="12.0"
              step="0.5"
              value={tempStep}
              onChange={(e) => setTempStep(Number(e.target.value))}
              className="w-full accent-sky-600"
            />
            <span className="text-[10px] text-slate-400">
              Steps exceeding this trigger Tier 1 Physical Discontinuity flags.
            </span>
          </div>

          {/* Pressure step */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Max Barometric Impulse Step (ΔP / tick)</label>
              <span className="font-mono font-bold text-slate-900">{pressureStep.toFixed(1)} hPa</span>
            </div>
            <input
              type="range"
              min="3.0"
              max="20.0"
              step="0.5"
              value={pressureStep}
              onChange={(e) => setPressureStep(Number(e.target.value))}
              className="w-full accent-sky-600"
            />
          </div>

          {/* Z Score */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Temporal Z-Score Threshold (σ)</label>
              <span className="font-mono font-bold text-slate-900">{zScoreThreshold.toFixed(1)}σ</span>
            </div>
            <input
              type="range"
              min="2.5"
              max="6.0"
              step="0.1"
              value={zScoreThreshold}
              onChange={(e) => setZScoreThreshold(Number(e.target.value))}
              className="w-full accent-sky-600"
            />
          </div>

          {/* Spatial Radius */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Spatial Peer Search Radius (km)</label>
              <span className="font-mono font-bold text-slate-900">{spatialRadiusKm} km</span>
            </div>
            <input
              type="range"
              min="200"
              max="900"
              step="50"
              value={spatialRadiusKm}
              onChange={(e) => setSpatialRadiusKm(Number(e.target.value))}
              className="w-full accent-sky-600"
            />
          </div>

          {savedToast && (
            <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2 text-[11px] font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Threshold parameters updated successfully.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
