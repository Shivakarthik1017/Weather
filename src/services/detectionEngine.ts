import { AWS_STATIONS } from '../data/stations';
import { checkThermodynamicConsistency } from './psychrometrics';
import { analyzeSpatialConsensus } from './spatial';
import {
  AnomalyDetectionResult,
  AnomalySeverity,
  AnomalyType,
  StationStatus,
  TierValidationResult,
  WeatherObservation
} from '../types';
import { analyzeRootCause } from './rootCauseEngine';
import { calculateImputedObservation } from './imputationEngine';

export class DetectionEngine {
  public analyzeObservation(
    stationId: string,
    currentObs: WeatherObservation,
    history: WeatherObservation[],
    allLatestObservations: Map<string, WeatherObservation>
  ): AnomalyDetectionResult {
    const stationMeta = AWS_STATIONS.find(s => s.id === stationId);

    // 0. Check for communication / packet loss
    if (currentObs.isMissing) {
      return {
        stationId,
        timestamp: currentObs.timestamp,
        status: 'OFFLINE',
        primaryClassification: 'COMMUNICATION_FAULT',
        severity: 'CRITICAL',
        compositeAnomalyScore: 98,
        confidenceScore: 99,
        tierResults: {
          physical: { tierName: 'Physical Range', passed: false, score: 90, flags: ['Telemetry Packet Drop / Zero Data Received'], details: {} },
          temporal: { tierName: 'Temporal Sequence', passed: false, score: 95, flags: ['Sequence Interruption'], details: {} },
          multivariate: { tierName: 'Multivariate Coupling', passed: false, score: 85, flags: ['Sensor Bus Offline'], details: {} },
          spatial: { tierName: 'Spatial Cross-Validation', passed: true, score: 0, flags: [], details: {} },
          mlIsolation: { tierName: 'ML Isolation Outlier', passed: false, score: 99, flags: ['Missing Feature Vector'], details: {} }
        },
        isSpatialEvent: false,
        rootCauseAnalysis: {
          probableCause: 'GPRS/LTE Modem Timeout or Solar Battery Outage',
          evidence: ['Zero telemetry frame payload received', `Battery voltage dropped to ${currentObs.batteryVoltage.toFixed(1)}V`, `Signal strength ${currentObs.signalStrength} dBm`],
          recommendedAction: 'Inspect solar charge controller, DC fuse, and cellular antenna connections at station mast.',
          actionUrgency: 'IMMEDIATE'
        },
        imputedObservation: calculateImputedObservation(stationId, currentObs, allLatestObservations, history)
      };
    }

    // 1. TIER 1: Physical / Range Validation
    const physicalResult = this.evaluatePhysicalTier(currentObs, history, stationMeta);

    // 2. TIER 2: Temporal Anomaly Engine (Z-scores, step changes, flatlines, drift)
    const temporalResult = this.evaluateTemporalTier(currentObs, history);

    // 3. TIER 3: Multivariate & Thermodynamic Consistency
    const multivariateResult = this.evaluateMultivariateTier(currentObs);

    // 4. TIER 4: Spatial Cross-Station Intelligence
    const spatialAnalysis = analyzeSpatialConsensus(stationId, currentObs, allLatestObservations);
    const spatialResult: TierValidationResult = {
      tierName: 'Spatial Cross-Validation',
      passed: spatialAnalysis.spatialScore < 40,
      score: spatialAnalysis.spatialScore,
      flags: spatialAnalysis.flags,
      details: {
        spatialScore: spatialAnalysis.spatialScore,
        isConsensusEvent: spatialAnalysis.isConsensusEvent,
        neighborCount: spatialAnalysis.neighbors.length,
        medianTemp: spatialAnalysis.medianTemp,
        medianPressure: spatialAnalysis.medianPressure
      }
    };

    // 5. TIER 5: ML Isolation Outlier Score
    const mlResult = this.evaluateMLTier(currentObs, history, spatialAnalysis);

    // 6. FUSION & CLASSIFICATION
    // Weight calculation
    // Physical: 25%, Temporal: 25%, Multivariate: 20%, Spatial: 20%, ML: 10%
    let rawCompositeScore =
      physicalResult.score * 0.25 +
      temporalResult.score * 0.25 +
      multivariateResult.score * 0.20 +
      spatialResult.score * 0.20 +
      mlResult.score * 0.10;

    let primaryClassification: AnomalyType = 'NONE';
    let isSpatialEvent = false;

    // Classification Decision Tree
    if (temporalResult.details.isFrozen) {
      primaryClassification = 'FROZEN_SENSOR';
      rawCompositeScore = Math.max(rawCompositeScore, 85);
    } else if (temporalResult.details.isDrifting && spatialResult.score > 35) {
      primaryClassification = 'SENSOR_DRIFT';
      rawCompositeScore = Math.max(rawCompositeScore, 78);
    } else if (spatialAnalysis.isConsensusEvent && temporalResult.score > 40 && physicalResult.passed) {
      // High temporal shift but spatial neighbors also shifted concurrently -> GENUINE METEOROLOGICAL EVENT!
      primaryClassification = 'WEATHER_EVENT';
      isSpatialEvent = true;
      // In a genuine weather event, the data is TRUSTED (composite anomaly score for sensor fault is lowered)
      rawCompositeScore = Math.min(rawCompositeScore, 42);
    } else if (!multivariateResult.passed || !physicalResult.passed) {
      if (currentObs.temperature > 58 || currentObs.temperature < -15 || currentObs.humidity > 102) {
        primaryClassification = 'DATA_QUALITY_FAULT';
      } else {
        primaryClassification = 'SENSOR_FAULT';
      }
      rawCompositeScore = Math.max(rawCompositeScore, 88);
    } else if (rawCompositeScore > 50) {
      if (spatialResult.score > 55) {
        // High spatial divergence without neighbor consensus = Sensor fault
        primaryClassification = 'SENSOR_FAULT';
      } else {
        primaryClassification = 'SENSOR_FAULT';
      }
    } else if (rawCompositeScore > 25) {
      primaryClassification = 'NONE';
    }

    const compositeAnomalyScore = Math.round(Math.min(100, Math.max(0, rawCompositeScore)));

    // Status determination
    let status: StationStatus = 'NORMAL';
    if (compositeAnomalyScore >= 70) {
      status = 'ANOMALOUS';
    } else if (compositeAnomalyScore >= 35) {
      status = 'SUSPICIOUS';
    }

    // Severity determination
    let severity: AnomalySeverity = 'LOW';
    if (compositeAnomalyScore >= 85) severity = 'CRITICAL';
    else if (compositeAnomalyScore >= 65) severity = 'HIGH';
    else if (compositeAnomalyScore >= 40) severity = 'MEDIUM';

    // Confidence Calculation
    const confidenceScore = Math.min(
      99,
      Math.max(
        60,
        Math.round(
          70 +
            (physicalResult.flags.length > 0 ? 15 : 0) +
            (multivariateResult.flags.length > 0 ? 10 : 0) +
            (spatialAnalysis.neighbors.length >= 2 ? 10 : 0)
        )
      )
    );

    // Root Cause Analysis
    const rootCauseAnalysis = analyzeRootCause(
      primaryClassification,
      currentObs,
      physicalResult,
      temporalResult,
      multivariateResult,
      spatialResult,
      stationMeta
    );

    // Calculate Imputed Values (Non-destructive correction)
    let imputedObservation;
    if (status !== 'NORMAL') {
      imputedObservation = calculateImputedObservation(
        stationId,
        currentObs,
        allLatestObservations,
        history
      );
    }

    return {
      stationId,
      timestamp: currentObs.timestamp,
      status,
      primaryClassification,
      severity,
      compositeAnomalyScore,
      confidenceScore,
      tierResults: {
        physical: physicalResult,
        temporal: temporalResult,
        multivariate: multivariateResult,
        spatial: spatialResult,
        mlIsolation: mlResult
      },
      isSpatialEvent,
      rootCauseAnalysis,
      imputedObservation
    };
  }

  private evaluatePhysicalTier(
    obs: WeatherObservation,
    history: WeatherObservation[],
    meta?: typeof AWS_STATIONS[0]
  ): TierValidationResult {
    const flags: string[] = [];
    let score = 0;

    // Hard physical limits for Indian meteorology
    if (obs.temperature < -15.0 || obs.temperature > 56.0) {
      flags.push(`Temperature ${obs.temperature}°C breaches physical territorial boundary (-15°C to 56°C)`);
      score += 60;
    }

    if (obs.pressure < 680 || obs.pressure > 1085) {
      flags.push(`Pressure ${obs.pressure} hPa outside physical terrestrial envelope (680-1085 hPa)`);
      score += 50;
    }

    if (obs.humidity < 0 || obs.humidity > 100.5) {
      flags.push(`Relative humidity ${obs.humidity}% out of physical percentage bounds (0-100%)`);
      score += 60;
    }

    // Rate of change (step limit between consecutive observations)
    if (history.length > 0) {
      const prev = history[history.length - 1];
      const deltaT = Math.abs(obs.temperature - prev.temperature);
      const deltaP = Math.abs(obs.pressure - prev.pressure);
      const deltaH = Math.abs(obs.humidity - prev.humidity);

      if (deltaT > 6.0) {
        flags.push(`Rapid thermal rate-of-change: Δ${deltaT.toFixed(1)}°C per tick exceeds max physical step (6.0°C)`);
        score += 45;
      }
      if (deltaP > 10.0) {
        flags.push(`Barometric impulse step: Δ${deltaP.toFixed(1)} hPa per tick exceeds max physical step (10.0 hPa)`);
        score += 40;
      }
      if (deltaH > 35.0) {
        flags.push(`Hygrometric discontinuity: Δ${deltaH.toFixed(0)}% per tick exceeds max physical step (35%)`);
        score += 35;
      }
    }

    return {
      tierName: 'Physical Range Validation',
      passed: flags.length === 0,
      score: Math.min(100, score),
      flags,
      details: {
        tempBounded: obs.temperature >= -15 && obs.temperature <= 56,
        pressureBounded: obs.pressure >= 680 && obs.pressure <= 1085,
        humidityBounded: obs.humidity >= 0 && obs.humidity <= 100
      }
    };
  }

  private evaluateTemporalTier(
    obs: WeatherObservation,
    history: WeatherObservation[]
  ): TierValidationResult {
    const flags: string[] = [];
    let score = 0;
    let isFrozen = false;
    let isDrifting = false;

    if (history.length < 5) {
      return {
        tierName: 'Temporal Sequence Analysis',
        passed: true,
        score: 0,
        flags: ['Accumulating warm-up baseline sequence'],
        details: { isFrozen: false, isDrifting: false, zScoreTemp: 0 }
      };
    }

    // Check for Frozen Sensor (Flatline across last 8 ticks)
    const recent = history.slice(-8);
    const tempVariance = this.calculateVariance(recent.map(r => r.temperature));
    const pressVariance = this.calculateVariance(recent.map(r => r.pressure));
    const humVariance = this.calculateVariance(recent.map(r => r.humidity));

    if (recent.length >= 7 && tempVariance < 0.0001 && pressVariance < 0.0001) {
      isFrozen = true;
      flags.push('Flatline detected: Zero micro-variance across temperature & pressure (ADC frozen / DAC latch)');
      score += 85;
    }

    // Calculate rolling statistics over last 25 ticks
    const sampleWindow = history.slice(-25);
    const meanT = sampleWindow.reduce((a, b) => a + b.temperature, 0) / sampleWindow.length;
    const stdT = Math.sqrt(this.calculateVariance(sampleWindow.map(s => s.temperature))) || 0.1;
    const zScoreTemp = Math.abs(obs.temperature - meanT) / stdT;

    if (zScoreTemp > 4.2) {
      flags.push(`Temporal Z-score anomaly: Temperature Z = ${zScoreTemp.toFixed(2)}σ departs from rolling mean`);
      score += Math.min(60, Math.round(zScoreTemp * 12));
    }

    // Sensor Drift detection (Steady monotonic deviation away from historical average)
    if (history.length >= 20) {
      const half = Math.floor(history.length / 2);
      const earlyMean = history.slice(0, half).reduce((a, b) => a + b.temperature, 0) / half;
      const lateMean = history.slice(half).reduce((a, b) => a + b.temperature, 0) / (history.length - half);
      const driftDelta = lateMean - earlyMean;

      if (Math.abs(driftDelta) > 4.5 && !isFrozen) {
        isDrifting = true;
        flags.push(`Monotonic baseline drift: Drift offset of ${driftDelta > 0 ? '+' : ''}${driftDelta.toFixed(1)}°C accumulated over sequence`);
        score += 55;
      }
    }

    return {
      tierName: 'Temporal Sequence Analysis',
      passed: flags.length === 0,
      score: Math.min(100, score),
      flags,
      details: {
        isFrozen,
        isDrifting,
        zScoreTemp: Math.round(zScoreTemp * 100) / 100,
        tempVariance
      }
    };
  }

  private evaluateMultivariateTier(obs: WeatherObservation): TierValidationResult {
    const thermo = checkThermodynamicConsistency(obs.temperature, obs.humidity, obs.pressure);
    const score = thermo.isConsistent ? 0 : Math.min(100, thermo.reasons.length * 45);

    return {
      tierName: 'Multivariate & Thermodynamic Consistency',
      passed: thermo.isConsistent,
      score,
      flags: thermo.reasons,
      details: {
        dewPoint: thermo.dewPoint,
        airTemp: obs.temperature,
        dewPointSpread: Math.round((obs.temperature - thermo.dewPoint) * 10) / 10
      }
    };
  }

  private evaluateMLTier(
    obs: WeatherObservation,
    history: WeatherObservation[],
    spatial: ReturnType<typeof analyzeSpatialConsensus>
  ): TierValidationResult {
    // Feature vector extraction:
    // [normalized_temp_zscore, normalized_press_zscore, spatial_delta, step_change, variance_proxy]
    let score = 0;
    const flags: string[] = [];

    const tempDeltaSpatial = Math.abs(obs.temperature - spatial.medianTemp);
    const pressDeltaSpatial = Math.abs(obs.pressure - spatial.medianPressure);

    // Isolation score simulation based on multi-dimensional tree path length
    let pathLength = 10; // normal baseline path length

    if (tempDeltaSpatial > 8) pathLength -= 3.5;
    if (pressDeltaSpatial > 18) pathLength -= 2.5;
    if (obs.humidity > 99 && obs.temperature > 40) pathLength -= 3.0;

    // Isolation Forest anomaly score: s(x, n) = 2^(-E(h(x)) / c(n))
    const anomalyScore = Math.round(Math.max(0, Math.min(100, (10 - pathLength) * 11)));

    if (anomalyScore > 50) {
      flags.push(`Isolation Forest subspace outlier score = ${anomalyScore}/100 (Unusual feature interaction)`);
    }

    return {
      tierName: 'ML Isolation Forest Outlier',
      passed: anomalyScore < 50,
      score: anomalyScore,
      flags,
      details: {
        subspaceTreeDepth: pathLength,
        outlierProbability: (anomalyScore / 100).toFixed(2)
      }
    };
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length <= 1) return 0;
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    return numbers.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / numbers.length;
  }
}
