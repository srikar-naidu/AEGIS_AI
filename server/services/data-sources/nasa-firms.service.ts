import axios from 'axios';

// ============================================
// NASA FIRMS (Fire Information for Resource Management System)
// Real-time satellite fire hotspot data
// API Docs: https://firms.modaps.eosdis.nasa.gov/api/
// ============================================

export interface FIRMSHotspot {
  latitude: number;
  longitude: number;
  brightness: number; // Fire temperature in Kelvin
  scan: number;
  track: number;
  acq_date: string; // YYYY-MM-DD
  acq_time: string; // HHMM
  satellite: string; // MODIS, VIIRS
  confidence: string | number; // 'low', 'nominal', 'high' for VIIRS; 0-100 for MODIS
  version: string;
  bright_t31?: number;
  frp: number; // Fire Radiative Power in MW
  daynight: string; // 'D' or 'N'
  type?: number;
}

const FIRMS_BASE = 'https://firms.modaps.eosdis.nasa.gov/api';

// NASA FIRMS MAP_KEY is needed for API access but registration is free
// For open data, we can use the CSV endpoint directly
const FIRMS_OPEN_DATA = 'https://firms.modaps.eosdis.nasa.gov/data/active_fire';

/**
 * Fetch active fire hotspots worldwide using the open CSV feed
 * Uses MODIS data (free, no API key)
 */
export async function fetchActiveFiresCsv(source = 'MODIS_NRT', dayRange = 1): Promise<FIRMSHotspot[]> {
  try {
    // Use the FIRMS CSV endpoint for worldwide data
    const url = `${FIRMS_OPEN_DATA}/${source}/c6.1/csv/MODIS_C6_1_Global_24h.csv`;
    const response = await axios.get(url, {
      timeout: 30000,
      responseType: 'text',
    });

    const lines = response.data.split('\n').filter((line: string) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h: string) => h.trim());
    const hotspots: FIRMSHotspot[] = [];

    for (let i = 1; i < Math.min(lines.length, 5001); i++) {
      const values = lines[i].split(',');
      if (values.length < headers.length) continue;

      const record: Record<string, string> = {};
      headers.forEach((h: string, idx: number) => {
        record[h] = values[idx]?.trim() || '';
      });

      hotspots.push({
        latitude: parseFloat(record.latitude) || 0,
        longitude: parseFloat(record.longitude) || 0,
        brightness: parseFloat(record.brightness) || 0,
        scan: parseFloat(record.scan) || 0,
        track: parseFloat(record.track) || 0,
        acq_date: record.acq_date || '',
        acq_time: record.acq_time || '',
        satellite: record.satellite || 'MODIS',
        confidence: record.confidence || '0',
        version: record.version || '',
        bright_t31: parseFloat(record.bright_t31) || undefined,
        frp: parseFloat(record.frp) || 0,
        daynight: record.daynight || 'D',
      });
    }

    console.log(`[NASA FIRMS] Fetched ${hotspots.length} active fire hotspots`);
    return hotspots;
  } catch (error) {
    console.error('[NASA FIRMS] Error fetching fires:', error instanceof Error ? error.message : error);
    // Fallback: try the alternative endpoint
    return fetchFiresFromAlternate();
  }
}

/**
 * Fallback: Fetch fires from NASA EONET wildfire category
 */
async function fetchFiresFromAlternate(): Promise<FIRMSHotspot[]> {
  try {
    const response = await axios.get('https://eonet.gsfc.nasa.gov/api/v3/events', {
      params: {
        category: 'wildfires',
        status: 'open',
        limit: 100,
      },
      timeout: 15000,
    });

    const hotspots: FIRMSHotspot[] = [];
    for (const event of response.data.events) {
      const geo = event.geometry[event.geometry.length - 1];
      if (geo && geo.type === 'Point') {
        hotspots.push({
          latitude: geo.coordinates[1],
          longitude: geo.coordinates[0],
          brightness: geo.magnitudeValue || 350,
          scan: 1,
          track: 1,
          acq_date: geo.date.split('T')[0],
          acq_time: geo.date.split('T')[1]?.substring(0, 4) || '0000',
          satellite: 'EONET',
          confidence: 'high',
          version: '1.0',
          frp: geo.magnitudeValue || 0,
          daynight: 'D',
        });
      }
    }

    console.log(`[NASA FIRMS Fallback] Fetched ${hotspots.length} fires from EONET`);
    return hotspots;
  } catch (error) {
    console.error('[NASA FIRMS Fallback] Error:', error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Get fire severity based on brightness temperature
 */
export function fireSeverity(brightness: number): 'critical' | 'high' | 'medium' | 'low' {
  if (brightness >= 400) return 'critical';
  if (brightness >= 350) return 'high';
  if (brightness >= 310) return 'medium';
  return 'low';
}

/**
 * Get fire confidence level as normalized number
 */
export function normalizeFireConfidence(confidence: string | number): number {
  if (typeof confidence === 'number') return confidence / 100;
  switch (confidence.toLowerCase()) {
    case 'high':
      return 0.9;
    case 'nominal':
      return 0.6;
    case 'low':
      return 0.3;
    default:
      return 0.5;
  }
}
