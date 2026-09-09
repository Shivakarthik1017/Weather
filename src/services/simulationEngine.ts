import { AWS_STATIONS } from '../data/stations';
import { calculateDewPoint } from './psychrometrics';
import {
  WeatherObservation,
  InjectedAnomalyConfig,
  GroundTruthAnnotation
} from '../types';

export class SimulationEngine {
  private tickCount: number = 0;
  private startTime: number = Date.now() - 3600 * 1000;
  private observationsHistory: Map<string, WeatherObservation[]> = new Map();
  private activeInjections: Map<string, InjectedAnomalyConfig> = new Map();
  private groundTruths: Map<string, GroundTruthAnnotation> = new Map();
  private frozenValues: Map<string, WeatherObservation> = new Map();
  private driftAcc: Map<string, { temp: number; pressure: number; humidity: number }> = new Map();

  constructor() {
    // Initialize station history buffers
    for (const s of AWS_STATIONS) {
      this.observationsHistory.set(s.id, []);
      this.driftAcc.set(s.id, { temp: 0, pressure: 0, humidity: 0 });
    }
    // Pre-seed buffer with 30 realistic past readings
    this.preSeedHistory(30);
  }

  private preSeedHistory(count: number) {
    for (let i = count; i > 0; i--) {
      const pastTime = Date.now() - i * 3000;
      for (const s of AWS_STATIONS) {
        const obs = this.generateBaseObservation(s, pastTime, false);
        const history = this.observationsHistory.get(s.id) || [];
        history.push(obs);
        this.observationsHistory.set(s.id, history);
      }
    }
  }

  public injectAnomaly(config: InjectedAnomalyConfig) {
    this.activeInjections.set(config.stationId, { ...config });
    this.groundTruths.set(config.stationId, {
      isInjected: true,
      trueType: config.type,
      injectedParameter: config.parameter,
      injectionTime: Date.now(),
      notes: `Injected ${config.type} on parameter ${config.parameter} with magnitude ${config.magnitude}`
    });

    // If affectSpatialCluster is true (simulating a genuine regional weather event like a squall line or cold front),
    // inject congruent changes in nearby stations too!
    if (config.affectSpatialCluster) {
      const target = AWS_STATIONS.find(s => s.id === config.stationId);
      if (target) {
        const nearby = AWS_STATIONS.filter(s => {
          if (s.id === target.id) return false;
          const dLat = Math.abs(s.lat - target.lat);
          const dLng = Math.abs(s.lng - target.lng);
          return Math.sqrt(dLat * dLat + dLng * dLng) < 4.0; // ~400km
        });

        for (const nb of nearby.slice(0, 3)) {
          this.activeInjections.set(nb.id, {
            stationId: nb.id,
            type: 'WEATHER_EVENT',
            parameter: config.parameter,
            magnitude: config.magnitude * 0.85,
            durationTicks: config.durationTicks,
            affectSpatialCluster: false
          });
          this.groundTruths.set(nb.id, {
            isInjected: true,
            trueType: 'WEATHER_EVENT',
            injectedParameter: config.parameter,
            injectionTime: Date.now(),
            notes: 'Regional weather event cluster propagation'
          });
        }
      }
    }
  }

  public clearAnomaly(stationId?: string) {
    if (stationId) {
      this.activeInjections.delete(stationId);
      this.groundTruths.delete(stationId);
      this.frozenValues.delete(stationId);
      this.driftAcc.set(stationId, { temp: 0, pressure: 0, humidity: 0 });
    } else {
      this.activeInjections.clear();
      this.groundTruths.clear();
      this.frozenValues.clear();
      for (const s of AWS_STATIONS) {
        this.driftAcc.set(s.id, { temp: 0, pressure: 0, humidity: 0 });
      }
    }
  }

  public getActiveInjections(): Map<string, InjectedAnomalyConfig> {
    return this.activeInjections;
  }

  public getGroundTruth(stationId: string): GroundTruthAnnotation | undefined {
    return this.groundTruths.get(stationId);
  }

  public step(): Map<string, WeatherObservation> {
    this.tickCount++;
    const now = Date.now();
    const latestMap = new Map<string, WeatherObservation>();

    for (const station of AWS_STATIONS) {
      let obs = this.generateObservationForStation(station, now);

      // Decrement duration if active
      const injection = this.activeInjections.get(station.id);
      if (injection) {
        injection.durationTicks--;
        if (injection.durationTicks <= 0) {
          this.activeInjections.delete(station.id);
          this.groundTruths.delete(station.id);
          this.frozenValues.delete(station.id);
        }
      }

      // Maintain rolling history (up to 80 observations)
      const hist = this.observationsHistory.get(station.id) || [];
      hist.push(obs);
      if (hist.length > 80) {
        hist.shift();
      }
      this.observationsHistory.set(station.id, hist);
      latestMap.set(station.id, obs);
    }

    return latestMap;
  }

  private generateBaseObservation(
    station: typeof AWS_STATIONS[0],
    timestamp: number,
    addNoise: boolean = true
  ): WeatherObservation {
    const elapsedMinutes = (timestamp - this.startTime) / (60 * 1000);
    // Diurnal cycle (~24-hour frequency)
    const solarHour = ((timestamp / (1000 * 3600)) % 24);
    const diurnalTempOffset = 5.5 * Math.sin(((solarHour - 9) / 24) * 2 * Math.PI);

    // Semi-diurnal barometric tide (~12-hour period, ~1.2 hPa amplitude)
    const pressureTide = 1.2 * Math.sin(((solarHour) / 12) * 2 * Math.PI);

    const noiseT = addNoise ? (Math.random() - 0.5) * 0.4 : 0;
    const noiseP = addNoise ? (Math.random() - 0.5) * 0.3 : 0;
    const noiseH = addNoise ? (Math.random() - 0.5) * 0.8 : 0;

    let temperature = station.baseTemp + diurnalTempOffset + noiseT;
    let pressure = station.basePressure + pressureTide + noiseP;
    // Relative humidity inversely tracks temperature variation
    let humidity = Math.max(10, Math.min(98, station.baseHumidity - diurnalTempOffset * 2.2 + noiseH));

    temperature = Math.round(temperature * 10) / 10;
    pressure = Math.round(pressure * 10) / 10;
    humidity = Math.round(humidity * 10) / 10;
    const dewPoint = calculateDewPoint(temperature, humidity);

    return {
      stationId: station.id,
      timestamp,
      temperature,
      pressure,
      humidity,
      dewPoint,
      batteryVoltage: 12.6 + (Math.random() - 0.5) * 0.15,
      signalStrength: -75 + (Math.random() - 0.5) * 6,
      isMissing: false,
      rawPayloadId: `PLD-${station.code}-${timestamp.toString().slice(-6)}`
    };
  }

  private generateObservationForStation(
    station: typeof AWS_STATIONS[0],
    timestamp: number
  ): WeatherObservation {
    const base = this.generateBaseObservation(station, timestamp, true);
    const injection = this.activeInjections.get(station.id);

    if (!injection) {
      return base;
    }

    // Apply specific anomaly injection logic
    switch (injection.type) {
      case 'COMMUNICATION_FAULT': {
        // Intermittent or complete telemetry packet drop
        return {
          ...base,
          isMissing: true,
          batteryVoltage: 10.1, // drop indicative of solar/battery outage
          signalStrength: -115 // poor/no signal
        };
      }

      case 'FROZEN_SENSOR': {
        // Sensor output locked into unchanging bit pattern (ADC lockup)
        let frozen = this.frozenValues.get(station.id);
        if (!frozen) {
          frozen = { ...base };
          this.frozenValues.set(station.id, frozen);
        }
        return {
          ...base,
          temperature: frozen.temperature,
          pressure: frozen.pressure,
          humidity: frozen.humidity,
          dewPoint: frozen.dewPoint
        };
      }

      case 'SENSOR_DRIFT': {
        // Slow systematic monotonic deviation while retaining normal high-frequency variance
        const currentDrift = this.driftAcc.get(station.id) || { temp: 0, pressure: 0, humidity: 0 };
        const rate = (injection.magnitude || 0.4);
        currentDrift.temp += rate;
        this.driftAcc.set(station.id, currentDrift);

        const newTemp = Math.round((base.temperature + currentDrift.temp) * 10) / 10;
        return {
          ...base,
          temperature: newTemp,
          dewPoint: calculateDewPoint(newTemp, base.humidity)
        };
      }

      case 'SENSOR_FAULT': {
        // Sudden spike or physically impossible jump (e.g. wire break, impedance error)
        let temp = base.temperature;
        let press = base.pressure;
        let hum = base.humidity;

        if (injection.parameter === 'temperature' || injection.parameter === 'all') {
          temp += injection.magnitude;
        }
        if (injection.parameter === 'pressure' || injection.parameter === 'all') {
          press += injection.magnitude * 2.5;
        }
        if (injection.parameter === 'humidity' || injection.parameter === 'all') {
          hum = Math.max(0, Math.min(105, hum + injection.magnitude));
        }

        temp = Math.round(temp * 10) / 10;
        press = Math.round(press * 10) / 10;
        hum = Math.round(hum * 10) / 10;

        return {
          ...base,
          temperature: temp,
          pressure: press,
          humidity: hum,
          dewPoint: calculateDewPoint(temp, hum)
        };
      }

      case 'DATA_QUALITY_FAULT': {
        // Extreme values violating physics (e.g., 68°C in India or RH = 105%)
        return {
          ...base,
          temperature: injection.magnitude > 0 ? 68.4 : -25.2,
          humidity: 104.5,
          dewPoint: 42.1
        };
      }

      case 'WEATHER_EVENT': {
        // Genuine meteorological front / thunderstorm outflow / microburst
        // In a genuine event, temperature drops rapidly (cold outflow), pressure surges (meso-high), humidity spikes
        const temp = Math.round((base.temperature - Math.abs(injection.magnitude || 7.0)) * 10) / 10;
        const press = Math.round((base.pressure + 4.5) * 10) / 10;
        const hum = Math.min(99, Math.round((base.humidity + 30) * 10) / 10);
        return {
          ...base,
          temperature: temp,
          pressure: press,
          humidity: hum,
          dewPoint: calculateDewPoint(temp, hum)
        };
      }

      default:
        return base;
    }
  }

  public getStationHistory(stationId: string): WeatherObservation[] {
    return this.observationsHistory.get(stationId) || [];
  }
}
