import React from 'react';
import { EvaluationMetrics } from '../types';
import { X, Target, CheckCircle2, AlertTriangle, RotateCcw, Clock, ShieldCheck, Zap } from 'lucide-react';

interface EvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: EvaluationMetrics;
  onReset: () => void;
}

export const EvaluationModal: React.FC<EvaluationModalProps> = ({
  isOpen,
  onClose,
  metrics,
  onReset
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="relative z-[1100] bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col text-slate-900 text-xs">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-sm text-white">Detection Evaluation & Verification Bench</h3>
              <p className="text-[11px] text-slate-400">
                Ground-truth statistical validation against multi-tier detection outputs
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">F1-SCORE</span>
              <span className="text-2xl font-bold font-mono text-indigo-600">{metrics.f1Score}%</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Harmonic Mean</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">PRECISION</span>
              <span className="text-2xl font-bold font-mono text-emerald-600">{metrics.precision}%</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Low False Alarms</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">RECALL</span>
              <span className="text-2xl font-bold font-mono text-sky-600">{metrics.recall}%</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Coverage Rate</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">AVG LATENCY</span>
              <span className="text-2xl font-bold font-mono text-slate-800">{metrics.averageLatencyMs}ms</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Per-Station Frame</span>
            </div>
          </div>

          {/* 2x2 Confusion Matrix */}
          <div>
            <h4 className="font-bold text-slate-700 uppercase tracking-wider mb-2">
              Confusion Matrix (Ground Truth vs Model Classification)
            </h4>
            <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div></div>
                <div className="font-bold text-slate-700 text-[11px]">PREDICTED ANOMALOUS</div>
                <div className="font-bold text-slate-700 text-[11px]">PREDICTED NOMINAL</div>

                <div className="font-bold text-slate-700 text-[11px] flex items-center justify-center">
                  ACTUAL FAULT / EVENT
                </div>
                <div className="bg-emerald-100 border border-emerald-300 p-2.5 rounded-lg text-emerald-900">
                  <span className="text-[10px] block font-sans text-emerald-700">TRUE POSITIVES (TP)</span>
                  <span className="text-xl font-bold">{metrics.truePositives}</span>
                </div>
                <div className="bg-rose-100 border border-rose-300 p-2.5 rounded-lg text-rose-900">
                  <span className="text-[10px] block font-sans text-rose-700">FALSE NEGATIVES (FN)</span>
                  <span className="text-xl font-bold">{metrics.falseNegatives}</span>
                </div>

                <div className="font-bold text-slate-700 text-[11px] flex items-center justify-center">
                  ACTUAL NOMINAL
                </div>
                <div className="bg-amber-100 border border-amber-300 p-2.5 rounded-lg text-amber-900">
                  <span className="text-[10px] block font-sans text-amber-700">FALSE POSITIVES (FP)</span>
                  <span className="text-xl font-bold">{metrics.falsePositives}</span>
                </div>
                <div className="bg-slate-200 border border-slate-300 p-2.5 rounded-lg text-slate-800">
                  <span className="text-[10px] block font-sans text-slate-600">TRUE NEGATIVES (TN)</span>
                  <span className="text-xl font-bold">{metrics.trueNegatives}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown by Category */}
          <div>
            <h4 className="font-bold text-slate-700 uppercase tracking-wider mb-2">
              Detected Category Distribution
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Sensor Faults</span>
                <span className="font-bold font-mono text-slate-900 text-sm">
                  {metrics.confusionMatrix.sensorFaultDetected}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Weather Events Validated</span>
                <span className="font-bold font-mono text-indigo-600 text-sm">
                  {metrics.confusionMatrix.weatherEventDetected}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Baseline Drift Detected</span>
                <span className="font-bold font-mono text-amber-600 text-sm">
                  {metrics.confusionMatrix.driftDetected}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Frozen / Flatline Sensors</span>
                <span className="font-bold font-mono text-sky-600 text-sm">
                  {metrics.confusionMatrix.frozenDetected}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Telemetry Outages</span>
                <span className="font-bold font-mono text-rose-600 text-sm">
                  {metrics.confusionMatrix.commDetected}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px]">False Alarms</span>
                <span className="font-bold font-mono text-slate-600 text-sm">
                  {metrics.confusionMatrix.falseAlarms}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 leading-relaxed text-[11px]">
            <strong>Validation Methodology: </strong> Whenever an anomaly is injected via the Sandbox, the Ground Truth engine tags the observation. The multi-tier detection pipeline evaluates observations blindly without knowledge of injection. High F1-score confirms accurate separation of genuine mesoscale atmospheric events from hardware faults.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Counters
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition-colors"
          >
            Close Bench
          </button>
        </div>
      </div>
    </div>
  );
};
