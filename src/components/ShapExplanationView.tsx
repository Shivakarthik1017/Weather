import React, { useState } from 'react';
import { ShapExplanation } from '../types';
import { BrainCircuit, RefreshCw, ChevronDown, ChevronUp, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ShapExplanationViewProps {
  explanation: ShapExplanation | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const ShapExplanationView: React.FC<ShapExplanationViewProps> = ({
  explanation,
  isLoading,
  onRefresh
}) => {
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  if (isLoading && !explanation) {
    return (
      <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 flex items-center justify-center gap-3 py-8">
        <RefreshCw className="w-5 h-5 text-sky-400 animate-spin" />
        <span className="text-xs font-mono text-slate-300">
          Calculating SHAP Shapley values via Isolation Forest TreeExplainer...
        </span>
      </div>
    );
  }

  if (!explanation) {
    return (
      <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 text-center py-6">
        <AlertCircle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
        <div className="text-xs font-semibold text-slate-200">SHAP Explanation Pending</div>
        <p className="text-[11px] text-slate-400 mt-1">
          Awaiting telemetry cycle attribution from the Python machine learning backend.
        </p>
        <button
          onClick={onRefresh}
          className="mt-3 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Request SHAP Analysis
        </button>
      </div>
    );
  }

  const featuresToDisplay = showAllFeatures && explanation.all_features && explanation.all_features.length > 0
    ? explanation.all_features
    : explanation.top_features;

  const maxImportance = Math.max(
    ...featuresToDisplay.map(f => f.importance),
    0.8
  );

  const isAnomalous = explanation.anomaly_score >= 35.0;

  return (
    <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
            <BrainCircuit className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-wider text-xs text-white flex items-center gap-2">
              Explainable AI (SHAP) — Root Anomaly Drivers
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800/60 font-mono lowercase">
                tree_explainer
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">
              Answers <em>"Why did SkyGuard classify this AWS observation as {isAnomalous ? 'anomalous' : 'nominal'}?"</em>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
            Base Depth: {explanation.base_value}
          </span>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Recalculate SHAP contributions"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Natural Language Narrative Summary */}
      <div className={`p-3 rounded-lg border mb-3 text-xs leading-relaxed ${
        isAnomalous
          ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
          : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
      }`}>
        <div className="flex items-start gap-2">
          {isAnomalous ? (
            <Sparkles className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div>
            <strong className="block font-semibold mb-0.5 text-white">
              {isAnomalous ? 'Anomaly Attribution Diagnosis' : 'Nominal Consensus Attribution'}
            </strong>
            <p className="text-[11px] opacity-90">{explanation.summary}</p>
          </div>
        </div>
      </div>

      {/* Feature Attribution List / Waterfall */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-400 px-1">
          <span>Feature & Observed Value</span>
          <span>SHAP Impact on Anomaly Score</span>
        </div>

        {featuresToDisplay.map((feat) => {
          const isIncreasing = feat.direction === 'anomaly_increasing';
          const pct = Math.min(100, (feat.importance / maxImportance) * 100);

          return (
            <div
              key={feat.feature}
              className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">{feat.display_name}</span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    {feat.value} {feat.unit}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  <span
                    className={`text-xs font-bold ${
                      isIncreasing ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {feat.shap_value > 0 ? `+${feat.shap_value.toFixed(3)}` : feat.shap_value.toFixed(3)}
                  </span>
                </div>
              </div>

              {/* Progress Bar showing relative contribution */}
              <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden my-1">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isIncreasing
                      ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-400'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                <span className="truncate max-w-[280px] sm:max-w-md" title={feat.impact_description}>
                  {feat.impact_description}
                </span>
                <span
                  className={`text-[9px] uppercase font-bold tracking-wider ${
                    isIncreasing ? 'text-rose-400/90' : 'text-emerald-400/90'
                  }`}
                >
                  {isIncreasing ? 'Drives Anomaly' : 'Baseline Normalizer'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toggle View All Features / Footer info */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/70 text-[10px] text-slate-400 font-mono">
        <span>Model: {explanation.model}</span>
        {explanation.all_features && explanation.all_features.length > 5 && (
          <button
            onClick={() => setShowAllFeatures(!showAllFeatures)}
            className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors font-sans font-medium"
          >
            <span>{showAllFeatures ? 'Show Top 5 Only' : `View All ${explanation.all_features.length} Features`}</span>
            {showAllFeatures ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
};
