import axios from 'axios';

// ============================================
// NASA EONET (Earth Observatory Natural Event Tracker) Service
// Tracks: wildfires, volcanoes, severe storms, sea ice, etc.
// API Docs: https://eonet.gsfc.nasa.gov/docs/v3
// ============================================

export interface EONETEvent {
  id: string;
  title: string;
  description: string | null;
  link: string;
  closed: string | null; // ISO date or null if active
  categories: Array<{
    id: string;
    title: string;
  }>;
  sources: Array<{
    id: string;
    url: string;
  }>;
  geometry: Array<{
    magnitudeValue: number | null;
    magnitudeUnit: string | null;
    date: string; // ISO date
    type: 'Point' | 'Polygon';
    coordinates: number[] | number[][];
  }>;
}

export interface EONETResponse {
  title: string;
  description: string;
  link: string;
  events: EONETEvent[];
}

// EONET Category IDs mapping to our disaster types
export const EONET_CATEGORY_MAP: Record<string, string> = {
  wildfires: 'wildfire',
  volcanoes: 'volcano',
  severeStorms: 'cyclone',
  floods: 'flood',
  earthquakes: 'earthquake',
  landslides: 'landslide',
  seaLakeIce: 'blizzard',
  snow: 'blizzard',
  tempExtremes: 'heatwave',
  drought: 'drought',
  dustHaze: 'industrial_hazard',
  waterColor: 'flood',
  manmade: 'industrial_hazard',
};

const EONET_BASE = 'https://eonet.gsfc.nasa.gov/api/v3';

/**
 * Fetch recent active natural events from NASA EONET
 */
export async function fetchNaturalEvents(limit = 50): Promise<EONETEvent[]> {
  try {
    const response = await axios.get<EONETResponse>(`${EONET_BASE}/events`, {
      params: {
        limit,
        status: 'open', // Only active events
        days: 30, // Last 30 days
      },
      timeout: 15000,
    });
    console.log(`[NASA EONET] Fetched ${response.data.events.length} active natural events`);
    return response.data.events;
  } catch (error) {
    console.error('[NASA EONET] Error fetching events:', error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Fetch events by specific category
 */
export async function fetchEventsByCategory(categoryId: string, limit = 20): Promise<EONETEvent[]> {
  try {
    const response = await axios.get<EONETResponse>(`${EONET_BASE}/events`, {
      params: {
        category: categoryId,
        limit,
        status: 'open',
      },
      timeout: 15000,
    });
    console.log(`[NASA EONET] Fetched ${response.data.events.length} ${categoryId} events`);
    return response.data.events;
  } catch (error) {
    console.error(`[NASA EONET] Error fetching ${categoryId}:`, error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Map EONET category to our disaster type
 */
export function mapEONETCategory(categories: Array<{ id: string; title: string }>): string {
  for (const cat of categories) {
    const mapped = EONET_CATEGORY_MAP[cat.id];
    if (mapped) return mapped;
  }
  return 'industrial_hazard'; // fallback
}

/**
 * Determine severity from EONET event magnitude
 */
export function eonetSeverity(event: EONETEvent): 'critical' | 'high' | 'medium' | 'low' {
  const latestGeo = event.geometry[event.geometry.length - 1];
  if (!latestGeo?.magnitudeValue) return 'medium';

  const mag = latestGeo.magnitudeValue;
  const unit = latestGeo.magnitudeUnit || '';

  // For fires (brightness in Kelvin)
  if (unit === 'kts' || unit.includes('K')) {
    if (mag > 400) return 'critical';
    if (mag > 350) return 'high';
    if (mag > 300) return 'medium';
    return 'low';
  }

  // Generic magnitude
  if (mag > 100) return 'critical';
  if (mag > 50) return 'high';
  if (mag > 10) return 'medium';
  return 'low';
}

/**
 * Normalize EONET event to Incident model format
 */
export function normalizeEONETEvent(event: EONETEvent): Partial<import('../../db/models').IIncident> {
  const type = mapEONETCategory(event.categories) as any;
  const severity = eonetSeverity(event);
  
  let lng = 0, lat = 0;
  for (const geo of event.geometry) {
    if (geo.type === 'Point' && Array.isArray(geo.coordinates) && geo.coordinates.length >= 2) {
      if (typeof geo.coordinates[0] === 'number') {
         lng = geo.coordinates[0];
         lat = geo.coordinates[1];
         break;
      }
    }
  }

  return {
    title: event.title,
    type,
    severity,
    status: 'active',
    location: {
      type: 'Point',
      coordinates: [lng, lat],
    },
    description: event.description || event.title,
    source: 'nasa_eonet',
    sourceId: event.id,
    createdAt: new Date(event.geometry[0]?.date || Date.now()),
  };
}
