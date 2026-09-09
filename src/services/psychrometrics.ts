/**
 * Meteorological and Thermodynamic Psychrometric Calculations
 * Implements Magnus-Tetens / August-Roche-Magnus equations recommended by WMO (WMO-No. 8).
 */

export function calculateSaturationVaporPressure(tempC: number): number {
  // Over liquid water (Magnus form): es(T) = 6.112 * exp((17.67 * T) / (T + 243.5)) hPa
  return 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5));
}

export function calculateActualVaporPressure(tempC: number, relativeHumidity: number): number {
  const es = calculateSaturationVaporPressure(tempC);
  const clampedRh = Math.max(0, Math.min(100, relativeHumidity));
  return (clampedRh / 100) * es;
}

export function calculateDewPoint(tempC: number, relativeHumidity: number): number {
  const clampedRh = Math.max(0.1, Math.min(100, relativeHumidity));
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * tempC) / (b + tempC)) + Math.log(clampedRh / 100.0);
  const td = (b * alpha) / (a - alpha);
  return Math.round(td * 10) / 10;
}

/**
 * Checks thermodynamic plausibility:
 * 1. Dew point must never exceed ambient air temperature by more than physical margin of error (0.5°C).
 * 2. Super-saturation: RH > 102% is physically unviable under standard surface conditions.
 * 3. Extreme heat with tropical humidity: Wet-bulb / dew point exceeding 35°C is physically lethal/unheard of on earth.
 */
export function checkThermodynamicConsistency(
  tempC: number,
  relativeHumidity: number,
  pressureHpa: number
): { isConsistent: boolean; reasons: string[]; dewPoint: number } {
  const reasons: string[] = [];
  const dewPoint = calculateDewPoint(tempC, relativeHumidity);

  if (relativeHumidity > 102) {
    reasons.push(`Super-saturation detected: RH (${relativeHumidity.toFixed(1)}%) exceeds physical atmospheric ceiling of 100%`);
  }

  if (relativeHumidity < 1.0) {
    reasons.push(`Impossible dryness: RH (${relativeHumidity.toFixed(1)}%) is below ambient terrestrial threshold`);
  }

  // Dew point cannot physically exceed air temperature by more than standard sensor uncertainty
  if (dewPoint > tempC + 0.6) {
    reasons.push(`Thermodynamic violation: Dew Point (${dewPoint}°C) strictly exceeds Air Temp (${tempC}°C)`);
  }

  // Record world-record dew point is 35°C (Dhahran, Saudi Arabia). Anything above 36°C indicates sensor failure.
  if (dewPoint > 36.0) {
    reasons.push(`Psychrometric impossibility: Calculated Dew Point (${dewPoint}°C) exceeds global planetary record (35°C)`);
  }

  // High temperature (> 48°C) accompanied by very high humidity (> 75%) is physically impossible in natural atmosphere
  if (tempC > 48 && relativeHumidity > 70) {
    reasons.push(`Joint thermodynamic contradiction: Extreme heat (${tempC}°C) combined with high RH (${relativeHumidity}%) violates convective lifting limits`);
  }

  // Pressure sanity check for surface stations
  if (pressureHpa < 650 || pressureHpa > 1090) {
    reasons.push(`Barometric anomaly: Surface pressure ${pressureHpa.toFixed(1)} hPa outside global terrestrial bounds (650 - 1090 hPa)`);
  }

  return {
    isConsistent: reasons.length === 0,
    reasons,
    dewPoint
  };
}
