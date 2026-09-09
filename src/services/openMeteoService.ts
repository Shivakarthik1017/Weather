import { OpenMeteoReferenceData, StationMetadata } from '../types';

export async function fetchOpenMeteoReference(station: StationMetadata): Promise<OpenMeteoReferenceData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${station.lat}&longitude=${station.lng}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code&timezone=auto`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Open-Meteo HTTP error: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  const current = data.current;

  // Weather code descriptions (WMO interpretation)
  const weatherCode = current.weather_code || 0;
  let weatherDescription = 'Clear sky';
  if (weatherCode >= 1 && weatherCode <= 3) weatherDescription = 'Partly cloudy';
  else if (weatherCode >= 45 && weatherCode <= 48) weatherDescription = 'Foggy / Hazy';
  else if (weatherCode >= 51 && weatherCode <= 67) weatherDescription = 'Rain / Drizzle';
  else if (weatherCode >= 71 && weatherCode <= 77) weatherDescription = 'Snowfall';
  else if (weatherCode >= 80 && weatherCode <= 82) weatherDescription = 'Rain showers';
  else if (weatherCode >= 95) weatherDescription = 'Thunderstorm';

  return {
    stationId: station.id,
    source: 'Open-Meteo API (Live)',
    fetchedAt: Date.now(),
    temperature: current.temperature_2m,
    pressure: current.surface_pressure,
    relativeHumidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    weatherCode,
    weatherDescription
  };
}
