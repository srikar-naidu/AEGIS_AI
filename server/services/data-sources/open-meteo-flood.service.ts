import axios from 'axios';

// ============================================
// Open-Meteo Flood API Service
// River discharge data and flood forecasting
// API Docs: https://open-meteo.com/en/docs/flood-api
// 100% Free, no API key required
// ============================================

export interface FloodData {
  latitude: number;
  longitude: number;
  daily: {
    time: string[];
    river_discharge: number[];
    river_discharge_mean: number[];
    river_discharge_median: number[];
    river_discharge_max: number[];
    river_discharge_min: number[];
    river_discharge_p25: number[];
    river_discharge_p75: number[];
  };
}

const FLOOD_API_BASE = 'https://flood-api.open-meteo.com/v1/flood';

/**
 * Fetch flood/river discharge data for given coordinates
 */
export async function fetchFloodData(lat: number, lon: number, forecastDays = 30): Promise<FloodData | null> {
  try {
    const response = await axios.get<FloodData>(FLOOD_API_BASE, {
      params: {
        latitude: lat,
        longitude: lon,
        daily: 'river_discharge',
        forecast_days: forecastDays,
      },
      timeout: 10000,
    });

    return response.data;
  } catch (error) {
    console.error('[Open-Meteo Flood] Error:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Fetch flood data with statistical ensemble for risk analysis
 */
export async function fetchFloodRiskData(lat: number, lon: number): Promise<FloodData | null> {
  try {
    const response = await axios.get<FloodData>(FLOOD_API_BASE, {
      params: {
        latitude: lat,
        longitude: lon,
        daily: [
          'river_discharge',
          'river_discharge_mean',
          'river_discharge_median',
          'river_discharge_max',
          'river_discharge_min',
          'river_discharge_p25',
          'river_discharge_p75',
        ].join(','),
        forecast_days: 90,
        past_days: 7,
      },
      timeout: 15000,
    });

    return response.data;
  } catch (error) {
    console.error('[Open-Meteo Flood Risk] Error:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Analyze flood risk from discharge data
 */
export function analyzeFloodRisk(data: FloodData): {
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  currentDischarge: number;
  maxForecastDischarge: number;
  trend: 'rising' | 'falling' | 'stable';
  peakDate?: string;
} {
  const dischargeValues = data.daily.river_discharge.filter((v) => v !== null && v !== undefined);

  if (dischargeValues.length === 0) {
    return {
      riskLevel: 'low',
      currentDischarge: 0,
      maxForecastDischarge: 0,
      trend: 'stable',
    };
  }

  const currentDischarge = dischargeValues[0];
  const maxForecastDischarge = Math.max(...dischargeValues);
  const maxIndex = dischargeValues.indexOf(maxForecastDischarge);
  const peakDate = data.daily.time[maxIndex];

  // Determine trend from recent values
  const recentValues = dischargeValues.slice(0, Math.min(7, dischargeValues.length));
  const avgRecent = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
  const futureValues = dischargeValues.slice(7, 14);
  const avgFuture = futureValues.length > 0 ? futureValues.reduce((a, b) => a + b, 0) / futureValues.length : avgRecent;

  let trend: 'rising' | 'falling' | 'stable' = 'stable';
  if (avgFuture > avgRecent * 1.2) trend = 'rising';
  else if (avgFuture < avgRecent * 0.8) trend = 'falling';

  // Rough risk assessment based on discharge magnitude
  // These thresholds should be calibrated per river, but this gives a general idea
  let riskLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
  if (maxForecastDischarge > 5000) riskLevel = 'critical';
  else if (maxForecastDischarge > 2000) riskLevel = 'high';
  else if (maxForecastDischarge > 500) riskLevel = 'medium';

  // Rising trend increases risk
  if (trend === 'rising' && riskLevel === 'medium') riskLevel = 'high';
  if (trend === 'rising' && riskLevel === 'low') riskLevel = 'medium';

  return {
    riskLevel,
    currentDischarge,
    maxForecastDischarge,
    trend,
    peakDate,
  };
}
