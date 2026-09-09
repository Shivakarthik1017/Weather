import React from 'react';
import {
  Activity,
  Play,
  Pause,
  RotateCw,
  Zap,
  BarChart3,
  Sliders,
  ShieldCheck,
  Radio,
  FileSpreadsheet
} from 'lucide-react';

interface HeaderProps {
  isRunning: boolean;
  onToggleRunning: () => void;
  onStepTick: () => void;
  speed: number;
  onChangeSpeed: (newSpeed: number) => void;
  onOpenInjector: () => void;
  onOpenEvaluation: () => void;
  onOpenSettings: () => void;
  activeView: 'dashboard' | 'analytics';
  onSelectView: (view: 'dashboard' | 'analytics') => void;
  activeAnomaliesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  isRunning,
  onToggleRunning,
  onStepTick,
  speed,
  onChangeSpeed,
  onOpenInjector,
  onOpenEvaluation,
  onOpenSettings,
  activeView,
  onSelectView,
  activeAnomaliesCount
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-30 px-4 py-3 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Mission Statement */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-sky-900/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-lg text-white font-mono">SKYGUARD AI</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800/80">
                  AWS Trust Platform
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Real-Time Anomaly Detection & Sensor Health for Automatic Weather Stations
              </p>
            </div>
          </div>

          {/* Mobile view switch */}
          <div className="flex md:hidden items-center gap-1.5">
            <button
              id="mobile-btn-dash"
              onClick={() => onSelectView('dashboard')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg ${
                activeView === 'dashboard' ? 'bg-sky-600 text-white' : 'text-slate-400'
              }`}
            >
              Live
            </button>
            <button
              id="mobile-btn-analytics"
              onClick={() => onSelectView('analytics')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg ${
                activeView === 'analytics' ? 'bg-sky-600 text-white' : 'text-slate-400'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>

        {/* Center View Tabs */}
        <div className="hidden md:flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            id="tab-btn-dashboard"
            onClick={() => onSelectView('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === 'dashboard'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Live AWS Monitor
          </button>
          <button
            id="tab-btn-analytics"
            onClick={() => onSelectView('analytics')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === 'analytics'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Network Analytics
          </button>
        </div>

        {/* Right Action & Ingestion Stream Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          {/* Simulation Loop State */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800">
            <button
              id="btn-toggle-simulation"
              onClick={onToggleRunning}
              title={isRunning ? 'Pause Telemetry Simulation' : 'Resume Telemetry Simulation'}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                isRunning
                  ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
                  : 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'Live Feed' : 'Paused'}</span>
            </button>

            <button
              id="btn-step-tick"
              onClick={onStepTick}
              title="Execute Single Ingestion Tick"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Speed selector */}
            <div className="flex items-center border-l border-slate-800 pl-1.5 text-[11px] text-slate-400">
              {[1, 2, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => onChangeSpeed(s)}
                  className={`px-1.5 py-0.5 rounded font-mono ${
                    speed === s ? 'text-sky-400 font-bold bg-sky-950' : 'hover:text-slate-200'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Anomaly Injector Button */}
          <button
            id="btn-open-injector"
            onClick={onOpenInjector}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Inject Anomaly</span>
          </button>

          {/* Evaluation Bench Button */}
          <button
            id="btn-open-evaluation"
            onClick={onOpenEvaluation}
            title="Model Evaluation & Precision Metrics"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Evaluation Bench</span>
          </button>

          {/* Settings Button */}
          <button
            id="btn-open-settings"
            onClick={onOpenSettings}
            title="Detection Thresholds & Settings"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
