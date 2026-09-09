import { AWS_STATIONS } from '../data/stations';
import { SpatialNeighborInfo, WeatherObservation } from '../types';

/**
 * Calculates Great Circle distance between two lat/lng coordinates in kilometers using Haversine formula.
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Retrieves the k-nearest spatial neighbors for a target station within maxRadiusKm.
 */
export function getNearestNeighbors(
  targetStationId: string,
  maxNeighbors: number = 4,
  maxRadiusKm: number = 550
): { stationId: string; name: string; distanceKm: number }[] {
  const target = AWS_STATIONS.find((s) => s.id === targetStationId);
  if (!target) return [];

  return AWS_STATIONS
    .filter((s) => s.id !== targetStationId)
    .map((s) => ({
      stationId: s.id,
      name: s.name,
      distanceKm: haversineDistanceKm(target.lat, target.lng, s.lat, s.lng)
    }))
    .filter((s) => s.distanceKm <= maxRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, maxNeighbors);
}

/**
 * Performs cross-station spatial consistency check against neighbor current readings.
 */
export function analyzeSpatialConsensus(
  targetStationId: string,
  currentObs: WeatherObservation,
  allLatestObservations: Map<string, WeatherObservation>
): {
  neighbors: SpatialNeighborInfo[];
  spatialScore: number; // 0 (perfect agreement) to 100 (severe spatial disagreement)
  isConsensusEvent: boolean; // True if neighbors are also observing the sudden shift (Weather event)
  medianTemp: number;
  medianPressure: number;
  medianHumidity: number;
  flags: string[];
} {
  const neighborsList = getNearestNeighbors(targetStationId, 4, 600);
  const flags: string[] = [];

  if (neighborsList.length === 0) {
    return {
      neighbors: [],
      spatialScore: 0,
      isConsensusEvent: false,
      medianTemp: currentObs.temperature,
      medianPressure: currentObs.pressure,
      medianHumidity: currentObs.humidity,
      flags: ['No spatial neighbours within 600km radius']
    };
  }

  const validNeighbors: SpatialNeighborInfo[] = [];
  const neighborTemps: number[] = [];
  const neighborPressures: number[] = [];
  const neighborHumidities: number[] = [];

  for (const n of neighborsList) {
    const nObs = allLatestObservations.get(n.stationId);
    if (nObs && !nObs.isMissing) {
      const tempDelta = Math.round((currentObs.temperature - nObs.temperature) * 10) / 10;
      validNeighbors.push({
        stationId: n.stationId,
        name: n.name,
        distanceKm: n.distanceKm,
        temperature: nObs.temperature,
        pressure: nObs.pressure,
        humidity: nObs.humidity,
        tempDelta,
        isCorrelated: Math.abs(tempDelta) < 5.0
      });
      neighborTemps.push(nObs.temperature);
      neighborPressures.push(nObs.pressure);
      neighborHumidities.push(nObs.humidity);
    }
  }

  if (validNeighbors.length === 0) {
    return {
      neighbors: [],
      spatialScore: 0,
      isConsensusEvent: false,
      medianTemp: currentObs.temperature,
      medianPressure: currentObs.pressure,
      medianHumidity: currentObs.humidity,
      flags: ['Neighbour telemetry currently offline']
    };
  }

  const median = (arr: number[]) => {
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };

  const medianTemp = median(neighborTemps);
  const medianPressure = median(neighborPressures);
  const medianHumidity = median(neighborHumidities);

  const deltaTemp = Math.abs(currentObs.temperature - medianTemp);
  const deltaPressure = Math.abs(currentObs.pressure - medianPressure);
  const deltaHumidity = Math.abs(currentObs.humidity - medianHumidity);

  let spatialScore = 0;

  if (deltaTemp > 7.0) {
    spatialScore += Math.min(50, (deltaTemp - 7.0) * 10);
    flags.push(`Temperature deviates by ${deltaTemp.toFixed(1)}°C from spatial cluster median (${medianTemp.toFixed(1)}°C)`);
  }

  if (deltaPressure > 15.0) {
    spatialScore += Math.min(30, (deltaPressure - 15.0) * 4);
    flags.push(`Pressure deviates by ${deltaPressure.toFixed(1)} hPa from cluster median (${medianPressure.toFixed(1)} hPa)`);
  }

  if (deltaHumidity > 35) {
    spatialScore += Math.min(20, (deltaHumidity - 35) * 1.5);
    flags.push(`Humidity deviates by ${deltaHumidity.toFixed(0)}% from cluster median (${medianHumidity.toFixed(0)}%)`);
  }

  // Determine if neighbors also moved significantly together (Weather Event vs Isolated Sensor Fault)
  // Calculate variance among neighbors themselves
  let neighborTempVar = 0;
  if (neighborTemps.length > 1) {
    const mean = neighborTemps.reduce((a, b) => a + b, 0) / neighborTemps.length;
    neighborTempVar = neighborTemps.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / neighborTemps.length;
  }

  // If neighbors also have higher variation or moved together in a similar gradient, it suggests a dynamic frontal boundary
  const isConsensusEvent = neighborTempVar > 12.0 || (validNeighbors.filter(n => Math.abs(n.tempDelta) < 3.5).length >= 2 && spatialScore < 45);

  return {
    neighbors: validNeighbors,
    spatialScore: Math.min(100, Math.round(spatialScore)),
    isConsensusEvent,
    medianTemp,
    medianPressure,
    medianHumidity,
    flags
  };
}
