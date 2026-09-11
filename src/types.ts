export type StationStatus = 'NORMAL' | 'SUSPICIOUS' | 'ANOMALOUS' | 'OFFLINE';

export type AnomalyType =
  | 'NONE'
  | 'SENSOR_FAULT'
  | 'DATA_QUALITY_FAULT'
  | 'COMMUNICATION_FAULT'
  | 'SENSOR_DRIFT'
  | 'FROZEN_SENSOR'
  | 'WEATHER_EVENT';

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface StationMetadata {
  id: string;
  name: string;
  code: string;
  region: 'Northern' | 'Western' | 'Southern' | 'Eastern' | 'Central' | 'Northeastern';
  lat: number;
  lng: number;
  elevation: number; // meters
  installedYear: number;
  sensorModel: {
    temp: string;
    pressure: string;
    humidity: string;
    telemetry: string;
  };
  baseTemp: number; // average local baseline
  basePressure: number; // local sea-level or barometric baseline
  baseHumidity: number;
}

export interface WeatherObservation {
  stationId: string;
  timestamp: number; // epoch ms
  temperature: number; // °C
  pressure: number; // hPa
  humidity: number; // % (0-100)
  dewPoint: number; // calculated psychrometrically °C
  batteryVoltage: number; // V (nominally 12.0 - 13.8V)
  signalStrength: number; // dBm (-110 to -50)
  isMissing: boolean;
  rawPayloadId: string;
}

export interface GroundTruthAnnotation {
  isInjected: boolean;
  trueType: AnomalyType;
  injectedParameter?: 'temperature' | 'pressure' | 'humidity' | 'all';
  injectionTime: number;
  notes?: string;
}

export interface TierValidationResult {
  tierName: string;
  passed: boolean;
  score: number; // 0 to 100 where 100 is severe anomaly
  flags: string[];
  details: Record<string, any>;
}

export interface AnomalyDetectionResult {
  stationId: string;
  timestamp: number;
  status: StationStatus;
  primaryClassification: AnomalyType;
  severity: AnomalySeverity;
  compositeAnomalyScore: number; // 0 to 100
  confidenceScore: number; // 0 to 100%
  tierResults: {
    physical: TierValidationResult;
    temporal: TierValidationResult;
    multivariate: TierValidationResult;
    spatial: TierValidationResult;
    mlIsolation: TierValidationResult;
  };
  isSpatialEvent: boolean; // True if spatial neighbours also experienced the event (Weather Event)
  rootCauseAnalysis: {
    probableCause: string;
    evidence: string[];
    recommendedAction: string;
    actionUrgency: 'IMMEDIATE' | 'SCHEDULED_MAINTENANCE' | 'MONITOR' | 'NO_ACTION';
  };
  imputedObservation?: {
    temperature: number;
    pressure: number;
    humidity: number;
    imputationMethod: 'SPATIAL_NEIGHBOR_MEDIAN' | 'TEMPORAL_ROLLING_MEAN' | 'KALMAN_PROXY';
    confidence: number;
  };
  shapExplanation?: ShapExplanation;
}

export interface SensorHealthRecord {
  stationId: string;
  healthScore: number; // 0 to 100
  statusTrend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
  degradationRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedDaysToFailure: number;
  anomalyRateLast24Ticks: number; // fraction 0 to 1
  driftAccumulatedDegC: number;
  frozenSensorOccurrences: number;
  packetLossRate: number; // %
  lastMaintenanceDate: string;
  subsystemHealth: {
    temperatureRtd: number; // %
    barometerPiezoresistive: number; // %
    hygrometerCapacitive: number; // %
    telemetryModem: number; // %
  };
}

export interface SpatialNeighborInfo {
  stationId: string;
  name: string;
  distanceKm: number;
  temperature: number;
  pressure: number;
  humidity: number;
  tempDelta: number;
  isCorrelated: boolean;
}

export interface InjectedAnomalyConfig {
  stationId: string;
  type: AnomalyType;
  parameter: 'temperature' | 'pressure' | 'humidity' | 'all';
  magnitude: number;
  durationTicks: number;
  affectSpatialCluster?: boolean; // if true, simulates a genuine regional weather front
}

export interface EvaluationMetrics {
  totalProcessed: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
  averageLatencyMs: number;
  confusionMatrix: {
    sensorFaultDetected: number;
    weatherEventDetected: number;
    driftDetected: number;
    frozenDetected: number;
    commDetected: number;
    falseAlarms: number;
  };
}

export interface OpenMeteoReferenceData {
  stationId: string;
  source: 'Open-Meteo API (Live)';
  fetchedAt: number;
  temperature: number;
  pressure: number;
  relativeHumidity: number;
  windSpeed: number;
  weatherCode: number;
  weatherDescription: string;
}

export interface ShapFeatureContribution {
  feature: string;
  display_name: string;
  value: number;
  unit: string;
  description?: string;
  shap_value: number;
  raw_tree_shap?: number;
  importance: number;
  direction: 'anomaly_increasing' | 'anomaly_decreasing';
  impact_description: string;
}

export interface ShapExplanation {
  available: boolean;
  model: string;
  anomaly_score: number;
  base_value: number;
  expected_value: number;
  top_features: ShapFeatureContribution[];
  all_features?: ShapFeatureContribution[];
  summary: string;
  root_cause?: string;
  confidence?: number;
}
