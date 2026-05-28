import axios from 'axios';

// ============================================
// GDACS (Global Disaster Alert and Coordination System)
// Real-time global disaster alerts for ALL disaster types
// API: https://www.gdacs.org/gdacsapi/
// ============================================

export interface GDACSEvent {
  eventid: number;
  episodeid: number;
  eventtype: string; // EQ, TC, FL, VO, DR, WF, TS
  eventname: string;
  description: string;
  htmldescription?: string;
  alertlevel: string; // Green, Orange, Red
  alertscore: number;
  severity: {
    value: number;
    unit: string;
  };
  population: {
    value: number;
    unit: string;
  };
  vulnerability?: {
    value: number;
  };
  country: string;
  fromdate: string;
  todate: string;
  url: {
    report: string;
    details: string;
    geometry: string;
  };
  geo: {
    lat: number;
    lng: number;
  };
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  Class?: string;
  iscurrent?: string;
}

export interface GDACSResponse {
  type: string;
  features: Array<{
    type: 'Feature';
    properties: GDACSEvent;
    geometry: {
      type: 'Point';
      coordinates: [number, number];
    };
    bbox?: [number, number, number, number];
  }>;
}

// GDACS event type mapping to our disaster types
export const GDACS_TYPE_MAP: Record<string, string> = {
  EQ: 'earthquake',
  TC: 'cyclone',
  FL: 'flood',
  VO: 'volcano',
  DR: 'drought',
  WF: 'wildfire',
  TS: 'tsunami',
};

const GDACS_BASE = 'https://www.gdacs.org/gdacsapi/api/events';

/**
 * Fetch recent GDACS events (all disaster types)
 */
export async function fetchGDACSEvents(limit = 100): Promise<GDACSResponse['features']> {
  try {
    const response = await axios.get(`${GDACS_BASE}/geteventlist/SEARCH`, {
      params: {
        alertlevel: 'Green;Orange;Red',
        eventlist: '', // All types
        fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        limit,
      },
      timeout: 15000,
      headers: {
        Accept: 'application/json',
      },
    });

    const features = response.data?.features || [];
    console.log(`[GDACS] Fetched ${features.length} global disaster alerts`);
    return features;
  } catch (error) {
    console.error('[GDACS] Error fetching events:', error instanceof Error ? error.message : error);
    // Fallback: try RSS feed approach
    return fetchGDACSRSS();
  }
}

/**
 * Fallback: Fetch from GDACS RSS and parse
 */
async function fetchGDACSRSS(): Promise<GDACSResponse['features']> {
  try {
    const response = await axios.get('https://www.gdacs.org/xml/rss.xml', {
      timeout: 15000,
      responseType: 'text',
    });

    // Basic XML parsing for fallback
    const events: GDACSResponse['features'] = [];
    const items = response.data.split('<item>').slice(1);

    for (const item of items.slice(0, 50)) {
      const getTag = (tag: string): string => {
        const match = item.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
        return match ? match[1] : '';
      };

      const getGdacsTag = (tag: string): string => {
        const match = item.match(new RegExp(`<gdacs:${tag}>([^<]*)</gdacs:${tag}>`));
        return match ? match[1] : '';
      };

      const lat = parseFloat(item.match(/<geo:lat>([^<]*)/)?.[1] || '0');
      const lng = parseFloat(item.match(/<geo:long>([^<]*)/)?.[1] || '0');
      const eventtype = getGdacsTag('eventtype') || 'EQ';
      const alertlevel = getGdacsTag('alertlevel') || 'Green';

      if (lat && lng) {
        events.push({
          type: 'Feature',
          properties: {
            eventid: parseInt(getGdacsTag('eventid')) || Math.random() * 10000,
            episodeid: parseInt(getGdacsTag('episodeid')) || 0,
            eventtype,
            eventname: getTag('title'),
            description: getTag('description'),
            alertlevel,
            alertscore: parseFloat(getGdacsTag('alertscore')) || 0,
            severity: { value: parseFloat(getGdacsTag('severity')) || 0, unit: '' },
            population: { value: parseFloat(getGdacsTag('population')) || 0, unit: 'people' },
            country: getGdacsTag('country') || '',
            fromdate: getTag('pubDate'),
            todate: getTag('pubDate'),
            url: {
              report: getTag('link'),
              details: getTag('link'),
              geometry: '',
            },
            geo: { lat, lng },
          },
          geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
        });
      }
    }

    console.log(`[GDACS RSS Fallback] Parsed ${events.length} events`);
    return events;
  } catch (error) {
    console.error('[GDACS RSS Fallback] Error:', error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Map GDACS alert level to our severity
 */
export function gdacsSeverity(alertlevel: string): 'critical' | 'high' | 'medium' | 'low' {
  switch (alertlevel.toLowerCase()) {
    case 'red':
      return 'critical';
    case 'orange':
      return 'high';
    case 'green':
      return 'medium';
    default:
      return 'low';
  }
}

/**
 * Map GDACS event type to our disaster type
 */
export function mapGDACSType(eventtype: string): string {
  return GDACS_TYPE_MAP[eventtype] || 'industrial_hazard';
}

/**
 * Normalize GDACS event to Incident model format
 */
export function normalizeGDACSEvent(feat: { properties: GDACSEvent; geometry?: { coordinates: [number, number] } }): Partial<import('../../db/models').IIncident> {
  const event = feat.properties;
  const severity = gdacsSeverity(event.alertlevel);
  const type = mapGDACSType(event.eventtype) as any;
  
  const lng = feat.geometry?.coordinates?.[0] || event.geo?.lng || 0;
  const lat = feat.geometry?.coordinates?.[1] || event.geo?.lat || 0;
  
  return {
    title: event.eventname,
    type,
    severity,
    status: 'active',
    location: {
      type: 'Point',
      coordinates: [lng, lat],
    },
    description: event.description,
    source: 'gdacs',
    sourceId: `gdacs_${event.eventid}`,
    affectedPopulation: event.population?.value,
    createdAt: new Date(event.fromdate),
  };
}
