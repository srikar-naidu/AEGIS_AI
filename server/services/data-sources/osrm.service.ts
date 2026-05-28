import axios from 'axios';

// ============================================
// OSRM (Open Source Routing Machine) Service
// Dynamic routing, distance, duration, and route geometry calculation
// API Docs: http://project-osrm.org/docs/v1/api/
// 100% Free, no API key required
// ============================================

export interface RouteStep {
  distance: number;
  duration: number;
  geometry: string; // Polyline geometry
  name: string;
  mode: string;
  maneuver: {
    location: [number, number]; // [lng, lat]
    instruction: string;
    type: string;
  };
}

export interface RouteGeometry {
  coordinates: Array<[number, number]>; // Array of [lng, lat]
  type: 'LineString';
}

export interface OSRMRoute {
  geometry: string | RouteGeometry;
  legs: Array<{
    steps: RouteStep[];
    summary: string;
    weight: number;
    duration: number;
    distance: number;
  }>;
  weight_name: string;
  weight: number;
  duration: number; // in seconds
  distance: number; // in meters
}

export interface OSRMResponse {
  code: string;
  routes: OSRMRoute[];
  waypoints: Array<{
    hint: string;
    distance: number;
    name: string;
    location: [number, number];
  }>;
}

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

/**
 * Fetch driving route coordinates between a start point and end point
 * Coordinates should be [longitude, latitude]
 */
export async function getRoute(
  start: [number, number],
  end: [number, number],
  geometries: 'geojson' | 'polyline' = 'geojson'
): Promise<OSRMRoute | null> {
  try {
    const startStr = `${start[0]},${start[1]}`;
    const endStr = `${end[0]},${end[1]}`;
    const url = `${OSRM_BASE}/${startStr};${endStr}`;

    const response = await axios.get<OSRMResponse>(url, {
      params: {
        overview: 'full',
        geometries,
        steps: 'true',
      },
      timeout: 10000,
    });

    if (response.data.code !== 'Ok' || response.data.routes.length === 0) {
      console.warn(`[OSRM] Failed to route: ${response.data.code}`);
      return null;
    }

    return response.data.routes[0];
  } catch (error) {
    console.error('[OSRM] Routing error:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Calculate distance matrix for multiple destinations (useful for assigning closest rescue team)
 * Coordinates should be array of [longitude, latitude]
 */
export async function getDistanceMatrix(
  sources: Array<[number, number]>,
  destinations: Array<[number, number]>
): Promise<{
  durations: number[][]; // sources x destinations matrix in seconds
  distances: number[][]; // sources x destinations matrix in meters
} | null> {
  try {
    const allCoords = [...sources, ...destinations];
    const coordsStr = allCoords.map((c) => `${c[0]},${c[1]}`).join(';');
    const url = `https://router.project-osrm.org/table/v1/driving/${coordsStr}`;

    const sourceIndices = sources.map((_, i) => i);
    const destIndices = destinations.map((_, i) => sources.length + i);

    const response = await axios.get(url, {
      params: {
        sources: sourceIndices.join(';'),
        destinations: destIndices.join(';'),
        annotations: 'distance,duration',
      },
      timeout: 15000,
    });

    if (response.data.code !== 'Ok') {
      console.warn(`[OSRM Table] Failed to compute table: ${response.data.code}`);
      return null;
    }

    return {
      durations: response.data.durations,
      distances: response.data.distances,
    };
  } catch (error) {
    console.error('[OSRM Table] Table error:', error instanceof Error ? error.message : error);
    return null;
  }
}
