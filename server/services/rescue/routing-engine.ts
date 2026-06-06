import axios from 'axios';
import { EmergencyResource } from './aggregation-engine';

export interface RouteResult {
  distance: number; // in meters
  duration: number; // in seconds
  geometry?: string; // polyline
}

/**
 * Get route using public OSRM API.
 * lat1, lng1 = source (e.g. disaster location)
 * lat2, lng2 = destination (e.g. hospital)
 */
export async function getRouteOSRM(lat1: number, lng1: number, lat2: number, lng2: number): Promise<RouteResult | null> {
  try {
    // OSRM coordinates format: lng,lat
    const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`;
    const response = await axios.get(url, { timeout: 5000 });
    
    if (response.data.code === 'Ok' && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      return {
        distance: route.distance,
        duration: route.duration,
      };
    }
    return null;
  } catch (error) {
    console.error(`[RescueOps] OSRM route failed for ${lat1},${lng1} to ${lat2},${lng2}`);
    return null;
  }
}

/**
 * Format duration to human readable string
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const remainingM = m % 60;
  return `${h} hr ${remainingM} min`;
}

/**
 * Format distance to human readable string
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters.toFixed(0)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Enrich a list of resources with routing information from a given central point
 */
export async function enrichWithRoutes(lat: number, lng: number, resources: EmergencyResource[]): Promise<EmergencyResource[]> {
  // To avoid hitting rate limits, process in small batches or limit to closest 15
  const promises = resources.slice(0, 15).map(async (res) => {
    const route = await getRouteOSRM(lat, lng, res.lat, res.lng);
    if (route) {
      res.distance = route.distance;
      res.routeDistance = formatDistance(route.distance);
      res.eta = formatDuration(route.duration);
    }
    return res;
  });

  await Promise.all(promises);
  
  // Sort by calculated route distance (or straight line if undefined)
  resources.sort((a, b) => (a.distance || 9999999) - (b.distance || 9999999));
  return resources;
}
