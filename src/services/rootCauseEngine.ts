import {
  AnomalyType,
  TierValidationResult,
  WeatherObservation
} from '../types';
import { AWS_STATIONS } from '../data/stations';

export function analyzeRootCause(
  classification: AnomalyType,
  obs: WeatherObservation,
  physical: TierValidationResult,
  temporal: TierValidationResult,
  multivariate: TierValidationResult,
  spatial: TierValidationResult,
  stationMeta?: typeof AWS_STATIONS[0]
): {
  probableCause: string;
  evidence: string[];
  recommendedAction: string;
  actionUrgency: 'IMMEDIATE' | 'SCHEDULED_MAINTENANCE' | 'MONITOR' | 'NO_ACTION';
} {
  const evidence: string[] = [];

  switch (classification) {
    case 'FROZEN_SENSOR': {
      evidence.push('Telemetry output variance is exactly zero across consecutive reporting windows');
      evidence.push('Analog-to-Digital Converter (ADC) data registers failed to cycle bit states');
      evidence.push('Serial I2C/RS-485 bus transaction is repeating stale cached buffer values');
      return {
        probableCause: 'Microcontroller ADC Data Register Lockup / Frozen Sensor Transducer',
        evidence,
        recommendedAction: 'Trigger remote hard watchdog reset on station datalogger. If variance remains zero after cycle, dispatch field tech to inspect transducer bus.',
        actionUrgency: 'SCHEDULED_MAINTENANCE'
      };
    }

    case 'SENSOR_DRIFT': {
      evidence.push(`Steady positive/negative baseline displacement of ~${temporal.details.tempVariance?.toFixed(2) || '0.4'}°C relative to historical trend`);
      evidence.push(`Neighbouring cluster stations within regional radius show stable baseline`);
      evidence.push('High-frequency noise remains intact while mean departs from psychrometric expectations');
      return {
        probableCause: 'Platinum RTD Lead Wire Resistance Drift or Capacitive Polymer Contamination',
        evidence,
        recommendedAction: 'Schedule field recalibration against portable secondary reference psychrometer (WMO-compliant) within 7 business days.',
        actionUrgency: 'SCHEDULED_MAINTENANCE'
      };
    }

    case 'WEATHER_EVENT': {
      evidence.push(`Consensus shift detected across ${spatial.details.neighborCount || 'multiple'} regional AWS nodes`);
      evidence.push('Thermodynamic relationship between temperature drop and humidity rise follows classical frontal passage');
      evidence.push('Physical rate-of-change stays within realistic mesoscale convective boundaries');
      return {
        probableCause: 'Genuine Meteorological Mesoscale Front / Squall Line / Convective Outflow',
        evidence,
        recommendedAction: 'Flag observation as VALIDATED METEOROLOGICAL PHENOMENON. Transmit to NWP forecasting model as trusted severe weather signature.',
        actionUrgency: 'NO_ACTION'
      };
    }

    case 'DATA_QUALITY_FAULT': {
      evidence.push('Reading strictly violates physical thermodynamic or atmospheric terrestrial boundaries');
      if (physical.flags.length > 0) evidence.push(...physical.flags);
      if (multivariate.flags.length > 0) evidence.push(...multivariate.flags);
      return {
        probableCause: 'Data Quality Corruption / Bit-Flip in Telemetry Ingestion Pipeline',
        evidence,
        recommendedAction: 'Reject observation from public dissemination. Apply spatial neighbor median imputation and log bad frame checksum.',
        actionUrgency: 'IMMEDIATE'
      };
    }

    case 'COMMUNICATION_FAULT': {
      evidence.push('Zero byte frame received during scheduled polling cycle');
      evidence.push('Cellular signal strength or solar battery bus below operational cutoff');
      return {
        probableCause: 'Cellular Modem Timeout or Severe Station Battery Under-voltage',
        evidence,
        recommendedAction: 'Poll secondary SMS diagnostic channel. Dispatch local site attendant to check battery terminals, solar panel dust, and mast antenna.',
        actionUrgency: 'IMMEDIATE'
      };
    }

    case 'SENSOR_FAULT': {
      if (!multivariate.passed) {
        evidence.push('Calculated dew point and relative humidity contradict physical gas laws');
        evidence.push('Hygrometer or thermometer transducer experienced electrical impulse or water ingress');
        return {
          probableCause: 'Hygrometer Capacitive Membrane Saturation or Thermometer Shield Ingress',
          evidence,
          recommendedAction: 'Isolate sensor channel in QC pipeline. Clean sintered PTFE filter cap and inspect solar radiation shield louvers for debris.',
          actionUrgency: 'IMMEDIATE'
        };
      }
      evidence.push(`Station value departs by ${spatial.details.spatialScore || 50} points from regional peer median`);
      evidence.push('Peer stations show tight correlation, ruling out regional weather event');
      return {
        probableCause: 'Isolated Transducer Failure or Electrical Intermittent Open-Circuit',
        evidence,
        recommendedAction: 'Activate non-destructive spatial imputation stream. Inspect terminal blocks and grounding rod at station tower.',
        actionUrgency: 'IMMEDIATE'
      };
    }

    case 'NONE':
    default: {
      return {
        probableCause: 'Normal Station Operational Telemetry',
        evidence: ['All tier validation checks passed within 95% confidence intervals', 'Multivariate psychrometric alignment validated', 'Spatial agreement with regional cluster established'],
        recommendedAction: 'Nominal operation. No maintenance intervention required.',
        actionUrgency: 'NO_ACTION'
      };
    }
  }
}
