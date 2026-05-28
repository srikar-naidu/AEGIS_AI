import axios from 'axios';

// ============================================
// USGS Earthquake API Service
// Real-time earthquake data worldwide
// API Docs: https://earthquake.usgs.gov/fdsnws/event/1/
// ============================================

export interface USGSEarthquake {
  id: string;
  properties: {
    mag: number;
    place: string;
    time: number; // Unix timestamp ms
    updated: number;
    url: string;
    title: string;
    status: string;
    tsunami: number; // 0 or 1
    sig: number; // significance 0-1000
    alert: string | null; // green, yellow, orange, red
    type: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number, number]; // [lng, lat, depth]
  };
}

export interface USGSResponse {
  type: 'FeatureCollection';
  metadata: {
    generated: number;
    url: string;
    title: string;
    count: number;
  };
  features: USGSEarthquake[];
}

const USGS_BASE = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary';

/**
 * Fetch all earthquakes from the last hour
 */
export async function fetchRecentEarthquakes(): Promise<USGSEarthquake[]> {
  try {
    const response = await axios.get<USGSResponse>(`${USGS_BASE}/all_hour.geojson`, {
      timeout: 10000,
    });
    console.log(`[USGS] Fetched ${response.data.features.length} earthquakes (last hour)`);
    return response.data.features;
  } catch (error) {
    console.error('[USGS] Error fetching earthquakes:', error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Fetch significant earthquakes from the last day
 */
export async function fetchSignificantEarthquakes(): Promise<USGSEarthquake[]> {
  try {
    const response = await axios.get<USGSResponse>(`${USGS_BASE}/significant_day.geojson`, {
      timeout: 10000,
    });
    console.log(`[USGS] Fetched ${response.data.features.length} significant earthquakes (last day)`);
    return response.data.features;
  } catch (error) {
    console.error('[USGS] Error fetching significant earthquakes:', error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Fetch all earthquakes from the last day (M2.5+)
 */
export async function fetchDailyEarthquakes(): Promise<USGSEarthquake[]> {
  try {
    const response = await axios.get<USGSResponse>(`${USGS_BASE}/2.5_day.geojson`, {
      timeout: 10000,
    });
    console.log(`[USGS] Fetched ${response.data.features.length} earthquakes M2.5+ (last day)`);
    return response.data.features;
  } catch (error) {
    console.error('[USGS] Error fetching daily earthquakes:', error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Fetch all earthquakes from the last week (M4.5+)
 */
export async function fetchWeeklyEarthquakes(): Promise<USGSEarthquake[]> {
  try {
    const response = await axios.get<USGSResponse>(`${USGS_BASE}/4.5_week.geojson`, {
      timeout: 10000,
    });
    console.log(`[USGS] Fetched ${response.data.features.length} earthquakes M4.5+ (last week)`);
    return response.data.features;
  } catch (error) {
    console.error('[USGS] Error fetching weekly earthquakes:', error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Convert USGS magnitude to our severity levels
 */
export function earthquakeSeverity(magnitude: number): 'critical' | 'high' | 'medium' | 'low' {
  if (magnitude >= 7.0) return 'critical';
  if (magnitude >= 5.0) return 'high';
  if (magnitude >= 3.0) return 'medium';
  return 'low';
}
