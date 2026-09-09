import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AWS_STATIONS } from './data/stations';
import {
  AnomalyDetectionResult,
  EvaluationMetrics,
  InjectedAnomalyConfig,
  SensorHealthRecord,
  WeatherObservation
} from './types';
import { SimulationEngine } from './services/simulationEngine';
import { DetectionEngine } from './services/detectionEngine';
import { SensorHealthEngine } from './services/healthEngine';
import { EvaluationTracker } from './services/evaluationTracker';

// Components
import { Header } from './components/Header';
import { KPICards } from './components/KPICards';
import { StationMap } from './components/StationMap';
import { StationList } from './components/StationList';
import { AnomalyFeed } from './components/AnomalyFeed';
import { StationDetailModal } from './components/StationDetailModal';
import { AnomalyInjectorModal } from './components/AnomalyInjectorModal';
import { EvaluationModal } from './components/EvaluationModal';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  // Engine Singleton References
  const simEngineRef = useRef<SimulationEngine | null>(null);
  const detEngineRef = useRef<DetectionEngine | null>(null);
  const healthEngineRef = useRef<SensorHealthEngine | null>(null);
  const evalTrackerRef = useRef<EvaluationTracker | null>(null);

  if (!simEngineRef.current) simEngineRef.current = new SimulationEngine();
  if (!detEngineRef.current) detEngineRef.current = new DetectionEngine();
  if (!healthEngineRef.current) healthEngineRef.current = new SensorHealthEngine();
  if (!evalTrackerRef.current) evalTrackerRef.current = new EvaluationTracker();

  // Application State
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);
  const [activeView, setActiveView] = useState<'dashboard' | 'analytics'>('dashboard');

  const [observations, setObservations] = useState<Map<string, WeatherObservation>>(new Map());
  const [detections, setDetections] = useState<Map<string, AnomalyDetectionResult>>(new Map());
  const [healthRecords, setHealthRecords] = useState<Map<string, SensorHealthRecord>>(new Map());
  const [anomalyFeed, setAnomalyFeed] = useState<AnomalyDetectionResult[]>([]);
  const [metrics, setMetrics] = useState<EvaluationMetrics>({
    totalProcessed: 0,
    truePositives: 0,
    falsePositives: 0,
    trueNegatives: 0,
    falseNegatives: 0,
    precision: 98.4,
    recall: 96.8,
    f1Score: 97.6,
    accuracy: 98.1,
    averageLatencyMs: 2.1,
    confusionMatrix: {
      sensorFaultDetected: 0,
      weatherEventDetected: 0,
      driftDetected: 0,
      frozenDetected: 0,
      commDetected: 0,
      falseAlarms: 0
    }
  });

  // Modal Dialog States
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [isInjectorOpen, setIsInjectorOpen] = useState<boolean>(false);
  const [injectorTargetStationId, setInjectorTargetStationId] = useState<string | null>(null);
  const [isEvaluationOpen, setIsEvaluationOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Single Ingestion Simulation Tick
  const executeTick = useCallback(() => {
    const sim = simEngineRef.current;
    const det = detEngineRef.current;
    const healthEng = healthEngineRef.current;
    const evalTracker = evalTrackerRef.current;
    if (!sim || !det || !healthEng || !evalTracker) return;

    const t0 = performance.now();
    const newObsMap = sim.step();
    const newDetMap = new Map<string, AnomalyDetectionResult>();
    const newHealthMap = new Map<string, SensorHealthRecord>();
    const newAlerts: AnomalyDetectionResult[] = [];

    // Analyze each station observation
    for (const [stationId, obs] of newObsMap.entries()) {
      const history = sim.getStationHistory(stationId);
      const groundTruth = sim.getGroundTruth(stationId);

      const res = det.analyzeObservation(stationId, obs, history, newObsMap);
      newDetMap.set(stationId, res);

      // Update sensor health
      const updatedHealth = healthEng.updateStationHealth(stationId, res);
      newHealthMap.set(stationId, updatedHealth);

      // Record prediction metrics
      evalTracker.recordPrediction(res, groundTruth, (performance.now() - t0) / newObsMap.size);

      // Collect anomalous alerts for feed
      if (res.status !== 'NORMAL' || res.primaryClassification === 'WEATHER_EVENT') {
        newAlerts.push(res);
      }
    }

    setObservations(newObsMap);
    setDetections(newDetMap);
    setHealthRecords(newHealthMap);
    setMetrics(evalTracker.getMetrics());

    if (newAlerts.length > 0) {
      setAnomalyFeed((prev) => {
        const combined = [...newAlerts, ...prev];
        return combined.slice(0, 50); // keep last 50 alerts
      });
    }
  }, []);

  // Mount: Run initial tick and pre-seed
  useEffect(() => {
    executeTick();
  }, [executeTick]);

  // Telemetry Ingestion Loop Timer
  useEffect(() => {
    if (!isRunning) return;

    const baseInterval = 3000;
    const intervalMs = Math.round(baseInterval / speed);

    const timer = setInterval(() => {
      executeTick();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isRunning, speed, executeTick]);

  // Handlers
  const handleQuickInject = (stationId: string) => {
    setInjectorTargetStationId(stationId);
    setIsInjectorOpen(true);
  };

  const handleLaunchInjection = (config: InjectedAnomalyConfig) => {
    if (simEngineRef.current) {
      simEngineRef.current.injectAnomaly(config);
      // Run immediate tick to reflect in UI
      executeTick();
    }
  };

  const handleClearAllInjections = () => {
    if (simEngineRef.current) {
      simEngineRef.current.clearAnomaly();
      executeTick();
    }
  };

  const handleClearSingleStation = (stationId: string) => {
    if (simEngineRef.current) {
      simEngineRef.current.clearAnomaly(stationId);
      setAnomalyFeed((prev) => prev.filter((a) => a.stationId !== stationId));
      executeTick();
    }
  };

  const handleResetEvaluation = () => {
    if (evalTrackerRef.current) {
      evalTrackerRef.current.reset();
      setMetrics(evalTrackerRef.current.getMetrics());
    }
  };

  // Aggregated KPI counts
  let sensorFaultCount = 0;
  let weatherEventCount = 0;
  detections.forEach((d) => {
    if (d.primaryClassification === 'WEATHER_EVENT') {
      weatherEventCount++;
    } else if (d.status === 'ANOMALOUS' || d.status === 'SUSPICIOUS') {
      sensorFaultCount++;
    }
  });

  let totalHealth = 0;
  healthRecords.forEach((h) => (totalHealth += h.healthScore));
  const avgHealthScore = healthRecords.size > 0 ? totalHealth / healthRecords.size : 96.5;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Top Global Navigation Bar */}
      <Header
        isRunning={isRunning}
        onToggleRunning={() => setIsRunning(!isRunning)}
        onStepTick={executeTick}
        speed={speed}
        onChangeSpeed={setSpeed}
        onOpenInjector={() => {
          setInjectorTargetStationId(null);
          setIsInjectorOpen(true);
        }}
        onOpenEvaluation={() => setIsEvaluationOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeView={activeView}
        onSelectView={setActiveView}
        activeAnomaliesCount={sensorFaultCount + weatherEventCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        {/* Top KPI Metric Cards Ribbon */}
        <KPICards
          totalStations={AWS_STATIONS.length}
          activeStations={AWS_STATIONS.length}
          sensorFaultCount={sensorFaultCount}
          weatherEventCount={weatherEventCount}
          avgHealthScore={avgHealthScore}
          metrics={metrics}
        />

        {/* View Switching: Dashboard vs Analytics */}
        {activeView === 'dashboard' ? (
          <div className="space-y-6">
            {/* Split Row: Geographic India Map & Station List / Live Table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Spatial Consensus Map of India (7 columns) */}
              <div className="lg:col-span-7">
                <StationMap
                  observations={observations}
                  detections={detections}
                  selectedStationId={selectedStationId}
                  onSelectStation={setSelectedStationId}
                  onQuickInject={handleQuickInject}
                />
              </div>

              {/* Right: Searchable Station Table & Live Telemetry (5 columns) */}
              <div className="lg:col-span-5">
                <StationList
                  observations={observations}
                  detections={detections}
                  healthRecords={healthRecords}
                  selectedStationId={selectedStationId}
                  onSelectStation={setSelectedStationId}
                  onQuickInject={handleQuickInject}
                />
              </div>
            </div>

            {/* Bottom Row: Real-Time Anomaly & Event Feed */}
            <AnomalyFeed
              anomalies={anomalyFeed}
              onSelectStation={setSelectedStationId}
              onClearAnomaly={handleClearSingleStation}
            />
          </div>
        ) : (
          /* Network Analytics & Predictive Maintenance Tab */
          <AnalyticsView
            healthRecords={healthRecords}
            detections={detections}
            onSelectStation={setSelectedStationId}
          />
        )}
      </main>

      {/* Station Deep Dive Modal Drawer */}
      <StationDetailModal
        stationId={selectedStationId}
        onClose={() => setSelectedStationId(null)}
        observations={observations}
        detections={detections}
        healthRecords={healthRecords}
        history={selectedStationId && simEngineRef.current ? simEngineRef.current.getStationHistory(selectedStationId) : []}
        onInjectFault={handleQuickInject}
      />

      {/* Anomaly Injector Sandbox Modal */}
      <AnomalyInjectorModal
        isOpen={isInjectorOpen}
        onClose={() => setIsInjectorOpen(false)}
        onInject={handleLaunchInjection}
        onClearAll={handleClearAllInjections}
        selectedStationId={injectorTargetStationId}
      />

      {/* Model Precision & Evaluation Bench Modal */}
      <EvaluationModal
        isOpen={isEvaluationOpen}
        onClose={() => setIsEvaluationOpen(false)}
        metrics={metrics}
        onReset={handleResetEvaluation}
      />

      {/* Detection Thresholds & Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
