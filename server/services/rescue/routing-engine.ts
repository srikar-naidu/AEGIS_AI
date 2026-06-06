import { EmergencyResource } from './aggregation-engine';
import * as turf from '@turf/turf';

// ============================================
// Types
// ============================================

export interface RouteResult {
  distance: number;        // meters
  duration: number;        // seconds
  geometry: number[][];    // GeoJSON [[lng,lat], ...] coordinates
}

export interface HazardZone {
  id: string;
  type: string;            // flood, wildfire, earthquake, etc.
  polygon: number[][][];   // GeoJSON polygon coordinates
  source: string;          // 'incident' | 'alert'
}

export type RouteStatus = 'SAFE' | 'CAUTION' | 'UNSAFE';

export interface EvacuationRoute {
  resourceId: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  distance: number;
  duration: number;
  routeDistance: string;
  eta: string;
  safetyScore: number;     // 0-100
  routeStatus: RouteStatus;
  hazardsAvoided: string[];
  hazardsIntersected: string[];
  geometry: number[][];
  verificationSource: string;
  contactInfo?: string;
  rank: number;            // 1 = primary, 2 = secondary, 3 = backup
}

// ============================================
// OSRM Route Fetching (with full GeoJSON geometry)
// ============================================

export async function getRouteWithGeometry(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): Promise<RouteResult | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson&alternatives=true`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry.coordinates, // [[lng,lat], ...]
      };
    }
    return null;
  } catch (error) {
    console.error(`[RescueOps] OSRM route failed: ${lat1},${lng1} → ${lat2},${lng2}`);
    return null;
  }
}

// ============================================
// Hazard Zone Intersection
// ============================================

/**
 * Check if a route (LineString) intersects any hazard polygons.
 * Returns the list of hazard types that were intersected and those that were avoided.
 */
export function checkHazardIntersections(
  routeCoords: number[][],
  hazardZones: HazardZone[]
): { intersected: string[]; avoided: string[] } {
  if (!routeCoords || routeCoords.length < 2 || hazardZones.length === 0) {
    return { intersected: [], avoided: hazardZones.map(h => h.type) };
  }

  const routeLine = turf.lineString(routeCoords);
  const intersected: string[] = [];
  const avoided: string[] = [];

  for (const hz of hazardZones) {
    try {
      const polygon = turf.polygon(hz.polygon);
      if (turf.booleanIntersects(routeLine, polygon)) {
        intersected.push(hz.type);
      } else {
        avoided.push(hz.type);
      }
    } catch {
      // Invalid polygon geometry — skip it
      avoided.push(hz.type);
    }
  }

  return { intersected, avoided };
}

// ============================================
// Scoring Engine
// ============================================

/**
 * Compute a composite route score (0–100) using the weighted factors:
 * - Safety: 50% (100 base, -30 per hazard intersection)
 * - Travel time: 20% (shorter = better, max 100)
 * - Distance: 15% (shorter = better, max 100)
 * - Road accessibility: 15% (default 100 unless blocked)
 */
export function computeRouteScore(
  route: RouteResult,
  hazardsIntersected: number,
  maxDuration: number,
  maxDistance: number
): { score: number; status: RouteStatus } {
  // Safety component: start at 100, lose 30 per intersection, floor at 0
  const safetyRaw = Math.max(0, 100 - hazardsIntersected * 30);

  // Travel time: shorter is better (linear scale relative to worst route)
  const timeScore = maxDuration > 0
    ? Math.max(0, 100 * (1 - route.duration / (maxDuration * 1.2)))
    : 100;

  // Distance: shorter is better
  const distScore = maxDistance > 0
    ? Math.max(0, 100 * (1 - route.distance / (maxDistance * 1.2)))
    : 100;

  // Road accessibility: default full (100). Could be reduced if YOLO detects blockages.
  const accessScore = 100;

  const composite =
    safetyRaw * 0.50 +
    timeScore * 0.20 +
    distScore * 0.15 +
    accessScore * 0.15;

  const score = Math.round(Math.min(100, Math.max(0, composite)));

  let status: RouteStatus = 'SAFE';
  if (score < 40) status = 'UNSAFE';
  else if (score < 70) status = 'CAUTION';

  return { score, status };
}

// ============================================
// Format Helpers
// ============================================

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const remainingM = m % 60;
  return `${h} hr ${remainingM} min`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters.toFixed(0)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// ============================================
// Straight-line distance for pre-sorting
// ============================================

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================
// Legacy enrichWithRoutes (backwards compat for basic resource list)
// ============================================

export async function enrichWithRoutes(
  lat: number, lng: number,
  resources: EmergencyResource[]
): Promise<EmergencyResource[]> {
  // Pre-sort by straight-line distance, only OSRM-enrich top 15
  resources.forEach(r => {
    r.distance = haversineDistance(lat, lng, r.lat, r.lng);
  });
  resources.sort((a, b) => (a.distance || 0) - (b.distance || 0));

  const toEnrich = resources.slice(0, 15);
  await Promise.all(toEnrich.map(async (res) => {
    const route = await getRouteWithGeometry(lat, lng, res.lat, res.lng);
    if (route) {
      res.distance = route.distance;
      res.routeDistance = formatDistance(route.distance);
      res.eta = formatDuration(route.duration);
    }
  }));

  resources.sort((a, b) => (a.distance || 9999999) - (b.distance || 9999999));
  return resources;
}

// ============================================
// Full Evacuation Route Generator
// ============================================

/**
 * For the top N closest resources per category, generate full evacuation routes,
 * check hazard intersections, score and rank them.
 */
export async function generateEvacuationRoutes(
  lat: number,
  lng: number,
  resources: EmergencyResource[],
  hazardZones: HazardZone[],
  topN: number = 5
): Promise<EvacuationRoute[]> {
  // Pre-sort by straight-line distance
  resources.forEach(r => {
    r.distance = haversineDistance(lat, lng, r.lat, r.lng);
  });
  resources.sort((a, b) => (a.distance || 0) - (b.distance || 0));

  // Pick top N closest resources overall (across all types)
  const candidates = resources.slice(0, topN);

  // Fetch OSRM routes with full geometry in parallel
  const routeResults = await Promise.all(
    candidates.map(async (res) => {
      const route = await getRouteWithGeometry(lat, lng, res.lat, res.lng);
      return { resource: res, route };
    })
  );

  // Filter out resources where OSRM failed
  const validRoutes = routeResults.filter(r => r.route !== null) as
    { resource: EmergencyResource; route: RouteResult }[];

  if (validRoutes.length === 0) return [];

  // Compute max values for normalization
  const maxDuration = Math.max(...validRoutes.map(r => r.route.duration));
  const maxDistance = Math.max(...validRoutes.map(r => r.route.distance));

  // Unique hazard type names for the "avoided" list
  const allHazardTypes = [...new Set(hazardZones.map(h => h.type))];

  // Score each route
  const evacRoutes: EvacuationRoute[] = validRoutes.map(({ resource, route }) => {
    const { intersected, avoided } = checkHazardIntersections(route.geometry, hazardZones);
    const { score, status } = computeRouteScore(route, intersected.length, maxDuration, maxDistance);

    return {
      resourceId: resource.id,
      name: resource.name,
      type: resource.type,
      lat: resource.lat,
      lng: resource.lng,
      distance: route.distance,
      duration: route.duration,
      routeDistance: formatDistance(route.distance),
      eta: formatDuration(route.duration),
      safetyScore: score,
      routeStatus: status,
      hazardsAvoided: hazardZones.length > 0 ? avoided : ['No active hazards detected'],
      hazardsIntersected: intersected,
      geometry: route.geometry,
      verificationSource: resource.verificationSource,
      contactInfo: resource.contactInfo,
      rank: 0, // Assigned below
    };
  });

  // Sort by composite score descending
  evacRoutes.sort((a, b) => b.safetyScore - a.safetyScore);

  // Assign ranks
  evacRoutes.forEach((r, i) => { r.rank = i + 1; });

  return evacRoutes;
}
