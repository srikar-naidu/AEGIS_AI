import axios from 'axios';

// ============================================
// Open-Meteo Weather API Service
// Real-time weather data for any coordinates
// API Docs: https://open-meteo.com/en/docs
// 100% Free, no API key required
// ============================================

export interface WeatherData {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    rain: number;
    showers: number;
    snowfall: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    surface_pressure: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    wind_speed_10m: number[];
  };
}

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';

/**
 * Fetch current weather for given coordinates
 */
export async function fetchCurrentWeather(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const response = await axios.get<WeatherData>(OPEN_METEO_BASE, {
      params: {
        latitude: lat,
        longitude: lon,
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'is_day',
          'precipitation',
          'rain',
          'showers',
          'snowfall',
          'weather_code',
          'cloud_cover',
          'pressure_msl',
          'surface_pressure',
          'wind_speed_10m',
          'wind_direction_10m',
          'wind_gusts_10m',
        ].join(','),
        timezone: 'auto',
      },
      timeout: 10000,
    });

    return response.data;
  } catch (error) {
    console.error('[Open-Meteo] Error fetching weather:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Fetch weather with hourly forecast (for prediction analysis)
 */
export async function fetchWeatherForecast(lat: number, lon: number, days = 3): Promise<WeatherData | null> {
  try {
    const response = await axios.get<WeatherData>(OPEN_METEO_BASE, {
      params: {
        latitude: lat,
        longitude: lon,
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'is_day',
          'precipitation',
          'rain',
          'showers',
          'snowfall',
          'weather_code',
          'cloud_cover',
          'pressure_msl',
          'surface_pressure',
          'wind_speed_10m',
          'wind_direction_10m',
          'wind_gusts_10m',
        ].join(','),
        hourly: [
          'temperature_2m',
          'precipitation_probability',
          'precipitation',
          'weather_code',
          'wind_speed_10m',
        ].join(','),
        forecast_days: days,
        timezone: 'auto',
      },
      timeout: 10000,
    });

    return response.data;
  } catch (error) {
    console.error('[Open-Meteo] Error fetching forecast:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Fetch weather for multiple locations at once
 */
export async function fetchBulkWeather(
  locations: Array<{ lat: number; lon: number }>
): Promise<Map<string, WeatherData>> {
  const results = new Map<string, WeatherData>();

  // Open-Meteo supports comma-separated coords for bulk
  const batchSize = 10;
  for (let i = 0; i < locations.length; i += batchSize) {
    const batch = locations.slice(i, i + batchSize);

    const promises = batch.map(async (loc) => {
      const data = await fetchCurrentWeather(loc.lat, loc.lon);
      if (data) {
        results.set(`${loc.lat},${loc.lon}`, data);
      }
    });

    await Promise.all(promises);

    // Rate limiting - small delay between batches
    if (i + batchSize < locations.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return results;
}

/**
 * WMO Weather interpretation codes mapping
 */
export const WEATHER_CODES: Record<number, { description: string; severity: string }> = {
  0: { description: 'Clear sky', severity: 'low' },
  1: { description: 'Mainly clear', severity: 'low' },
  2: { description: 'Partly cloudy', severity: 'low' },
  3: { description: 'Overcast', severity: 'low' },
  45: { description: 'Fog', severity: 'low' },
  48: { description: 'Depositing rime fog', severity: 'medium' },
  51: { description: 'Light drizzle', severity: 'low' },
  53: { description: 'Moderate drizzle', severity: 'low' },
  55: { description: 'Dense drizzle', severity: 'medium' },
  56: { description: 'Light freezing drizzle', severity: 'medium' },
  57: { description: 'Dense freezing drizzle', severity: 'high' },
  61: { description: 'Slight rain', severity: 'low' },
  63: { description: 'Moderate rain', severity: 'medium' },
  65: { description: 'Heavy rain', severity: 'high' },
  66: { description: 'Light freezing rain', severity: 'high' },
  67: { description: 'Heavy freezing rain', severity: 'critical' },
  71: { description: 'Slight snow fall', severity: 'medium' },
  73: { description: 'Moderate snow fall', severity: 'high' },
  75: { description: 'Heavy snow fall', severity: 'critical' },
  77: { description: 'Snow grains', severity: 'medium' },
  80: { description: 'Slight rain showers', severity: 'low' },
  81: { description: 'Moderate rain showers', severity: 'medium' },
  82: { description: 'Violent rain showers', severity: 'critical' },
  85: { description: 'Slight snow showers', severity: 'medium' },
  86: { description: 'Heavy snow showers', severity: 'high' },
  95: { description: 'Thunderstorm', severity: 'high' },
  96: { description: 'Thunderstorm with slight hail', severity: 'high' },
  99: { description: 'Thunderstorm with heavy hail', severity: 'critical' },
};

/**
 * Get weather description from WMO code
 */
export function getWeatherDescription(code: number): string {
  return WEATHER_CODES[code]?.description || 'Unknown';
}

/**
 * Check if weather conditions are dangerous
 */
export function isWeatherDangerous(weather: WeatherData['current']): {
  isDangerous: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (weather.wind_speed_10m > 80) reasons.push(`Extreme wind: ${weather.wind_speed_10m} km/h`);
  else if (weather.wind_speed_10m > 50) reasons.push(`High wind: ${weather.wind_speed_10m} km/h`);

  if (weather.precipitation > 20) reasons.push(`Heavy precipitation: ${weather.precipitation} mm`);

  if (weather.temperature_2m > 45) reasons.push(`Extreme heat: ${weather.temperature_2m}°C`);
  else if (weather.temperature_2m < -20) reasons.push(`Extreme cold: ${weather.temperature_2m}°C`);

  if (weather.snowfall > 5) reasons.push(`Heavy snowfall: ${weather.snowfall} cm`);

  if (weather.wind_gusts_10m > 100) reasons.push(`Dangerous gusts: ${weather.wind_gusts_10m} km/h`);

  const weatherSev = WEATHER_CODES[weather.weather_code]?.severity;
  if (weatherSev === 'critical' || weatherSev === 'high') {
    reasons.push(`Severe weather: ${getWeatherDescription(weather.weather_code)}`);
  }

  return {
    isDangerous: reasons.length > 0,
    reasons,
  };
}
