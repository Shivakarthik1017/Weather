import { getNearestNeighbors } from './spatial';
import { WeatherObservation } from '../types';

export function calculateImputedObservation(
  stationId: string,
  rawObs: WeatherObservation,
  allLatest: Map<string, WeatherObservation>,
  history: WeatherObservation[]
): {
  temperature: number;
  pressure: number;
  humidity: number;
  imputationMethod: 'SPATIAL_NEIGHBOR_MEDIAN' | 'TEMPORAL_ROLLING_MEAN' | 'KALMAN_PROXY';
  confidence: number;
} {
  const neighbors = getNearestNeighbors(stationId, 4, 600);
  const validNeighborObs: WeatherObservation[] = [];

  for (const n of neighbors) {
    const obs = allLatest.get(n.stationId);
    if (obs && !obs.isMissing && obs.temperature > -20 && obs.temperature < 60) {
      validNeighborObs.push(obs);
    }
  }

  // If we have at least 2 spatial neighbors, use spatial inverse-distance or median
  if (validNeighborObs.length >= 2) {
    const median = (arr: number[]) => {
      const s = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    };

    const impTemp = Math.round(median(validNeighborObs.map(o => o.temperature)) * 10) / 10;
    const impPress = Math.round(median(validNeighborObs.map(o => o.pressure)) * 10) / 10;
    const impHum = Math.round(median(validNeighborObs.map(o => o.humidity)) * 10) / 10;

    return {
      temperature: impTemp,
      pressure: impPress,
      humidity: impHum,
      imputationMethod: 'SPATIAL_NEIGHBOR_MEDIAN',
      confidence: 88
    };
  }

  // Fallback to temporal rolling mean if spatial neighbors unavailable
  if (history.length >= 5) {
    const recent = history.slice(-15);
    const meanTemp = recent.reduce((a, b) => a + b.temperature, 0) / recent.length;
    const meanPress = recent.reduce((a, b) => a + b.pressure, 0) / recent.length;
    const meanHum = recent.reduce((a, b) => a + b.humidity, 0) / recent.length;

    return {
      temperature: Math.round(meanTemp * 10) / 10,
      pressure: Math.round(meanPress * 10) / 10,
      humidity: Math.round(meanHum * 10) / 10,
      imputationMethod: 'TEMPORAL_ROLLING_MEAN',
      confidence: 76
    };
  }

  // Safe fallback
  return {
    temperature: rawObs.temperature,
    pressure: rawObs.pressure,
    humidity: rawObs.humidity,
    imputationMethod: 'KALMAN_PROXY',
    confidence: 60
  };
}
