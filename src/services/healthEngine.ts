import { AWS_STATIONS } from '../data/stations';
import { AnomalyDetectionResult, SensorHealthRecord } from '../types';

export class SensorHealthEngine {
  private healthRecords: Map<string, SensorHealthRecord> = new Map();
  private recentScores: Map<string, number[]> = new Map();

  constructor() {
    for (const s of AWS_STATIONS) {
      this.healthRecords.set(s.id, {
        stationId: s.id,
        healthScore: 96 + Math.round(Math.random() * 3),
        statusTrend: 'STABLE',
        degradationRisk: 'LOW',
        estimatedDaysToFailure: 340 + Math.round(Math.random() * 120),
        anomalyRateLast24Ticks: 0.0,
        driftAccumulatedDegC: 0.0,
        frozenSensorOccurrences: 0,
        packetLossRate: 0.2,
        lastMaintenanceDate: '2024-11-15',
        subsystemHealth: {
          temperatureRtd: 98,
          barometerPiezoresistive: 99,
          hygrometerCapacitive: 96,
          telemetryModem: 97
        }
      });
      this.recentScores.set(s.id, [98, 98, 97]);
    }
  }

  public updateStationHealth(
    stationId: string,
    result: AnomalyDetectionResult
  ): SensorHealthRecord {
    const existing = this.healthRecords.get(stationId);
    if (!existing) {
      throw new Error(`Station ${stationId} not found in health engine`);
    }

    let targetHealth = existing.healthScore;
    const scores = this.recentScores.get(stationId) || [];

    // Penalize health based on detection outcome (excluding genuine weather events!)
    if (result.primaryClassification === 'WEATHER_EVENT') {
      // In a weather event, sensor is physically fine! Health is NOT degraded.
      targetHealth = Math.min(100, targetHealth + 0.1);
    } else if (result.primaryClassification === 'SENSOR_FAULT') {
      targetHealth -= 2.5;
    } else if (result.primaryClassification === 'FROZEN_SENSOR') {
      targetHealth -= 3.0;
      existing.frozenSensorOccurrences += 1;
    } else if (result.primaryClassification === 'SENSOR_DRIFT') {
      targetHealth -= 1.8;
      existing.driftAccumulatedDegC += 0.15;
    } else if (result.primaryClassification === 'COMMUNICATION_FAULT') {
      targetHealth -= 2.0;
      existing.packetLossRate = Math.min(100, existing.packetLossRate + 4.0);
    } else {
      // Gentle recovery during healthy ticks
      targetHealth = Math.min(99, targetHealth + 0.15);
      existing.packetLossRate = Math.max(0.1, existing.packetLossRate - 0.2);
    }

    targetHealth = Math.max(10, Math.min(100, targetHealth));
    scores.push(targetHealth);
    if (scores.length > 15) scores.shift();
    this.recentScores.set(stationId, scores);

    // Trend calculation
    let statusTrend: 'IMPROVING' | 'STABLE' | 'DEGRADING' = 'STABLE';
    if (scores.length >= 6) {
      const delta = scores[scores.length - 1] - scores[0];
      if (delta < -2.0) statusTrend = 'DEGRADING';
      else if (delta > 1.5) statusTrend = 'IMPROVING';
    }

    // Degradation Risk
    let degradationRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let estimatedDaysToFailure = 360;

    if (targetHealth < 40) {
      degradationRisk = 'CRITICAL';
      estimatedDaysToFailure = Math.max(1, Math.round(targetHealth / 8));
    } else if (targetHealth < 65) {
      degradationRisk = 'HIGH';
      estimatedDaysToFailure = Math.round(15 + targetHealth * 0.7);
    } else if (targetHealth < 82) {
      degradationRisk = 'MEDIUM';
      estimatedDaysToFailure = Math.round(60 + targetHealth * 1.5);
    }

    // Update subsystem health
    const subsystemHealth = { ...existing.subsystemHealth };
    if (result.primaryClassification === 'COMMUNICATION_FAULT') {
      subsystemHealth.telemetryModem = Math.max(20, subsystemHealth.telemetryModem - 5);
    } else if (result.tierResults.multivariate.score > 40) {
      subsystemHealth.hygrometerCapacitive = Math.max(25, subsystemHealth.hygrometerCapacitive - 4);
    } else if (result.tierResults.temporal.details.isFrozen) {
      subsystemHealth.temperatureRtd = Math.max(30, subsystemHealth.temperatureRtd - 6);
    }

    const updated: SensorHealthRecord = {
      ...existing,
      healthScore: Math.round(targetHealth * 10) / 10,
      statusTrend,
      degradationRisk,
      estimatedDaysToFailure,
      subsystemHealth
    };

    this.healthRecords.set(stationId, updated);
    return updated;
  }

  public getStationHealth(stationId: string): SensorHealthRecord | undefined {
    return this.healthRecords.get(stationId);
  }

  public getAllHealthRecords(): Map<string, SensorHealthRecord> {
    return this.healthRecords;
  }
}
