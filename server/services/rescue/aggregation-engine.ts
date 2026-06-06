import axios from 'axios';

export interface EmergencyResource {
  id: string;
  name: string;
  type: 'Hospital' | 'Fire Station' | 'Ambulance Station' | 'Shelter' | 'Rescue Facility' | 'Organization' | 'Operations Center';
  lat: number;
  lng: number;
  distance?: number; // in meters
  eta?: string; // from OSRM
  routeDistance?: string; // from OSRM
  verificationSource: string;
  contactInfo?: string;
  activeStatus?: string;
}

/**
 * Fetch resources from OpenStreetMap Overpass API
 * Radius in meters.
 */
export async function fetchOSMResources(lat: number, lng: number, radius: number = 10000): Promise<EmergencyResource[]> {
  const overpassQuery = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:${radius},${lat},${lng});
      way["amenity"="hospital"](around:${radius},${lat},${lng});
      
      node["amenity"="clinic"](around:${radius},${lat},${lng});
      way["amenity"="clinic"](around:${radius},${lat},${lng});
      
      node["amenity"="fire_station"](around:${radius},${lat},${lng});
      way["amenity"="fire_station"](around:${radius},${lat},${lng});
      
      node["emergency"="ambulance_station"](around:${radius},${lat},${lng});
      node["emergency"="rescue_station"](around:${radius},${lat},${lng});
      
      node["amenity"="shelter"](around:${radius},${lat},${lng});
      way["amenity"="shelter"](around:${radius},${lat},${lng});
      
      node["amenity"="community_centre"](around:${radius},${lat},${lng});
      way["amenity"="community_centre"](around:${radius},${lat},${lng});
    );
    out center;
  `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'AegisAI/1.0 (contact@aegis-ai.org)'
      },
      body: 'data=' + encodeURIComponent(overpassQuery)
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.statusText}`);
    }

    const data = await response.json();
    const elements = data.elements || [];
    const resources: EmergencyResource[] = [];

    elements.forEach((el: any) => {
      const tags = el.tags || {};
      const elLat = el.lat || el.center?.lat;
      const elLng = el.lon || el.center?.lon;
      const name = tags.name || tags['name:en'] || 'Unnamed Resource';

      let type: EmergencyResource['type'] = 'Shelter';
      if (tags.amenity === 'hospital' || tags.amenity === 'clinic') type = 'Hospital';
      else if (tags.amenity === 'fire_station') type = 'Fire Station';
      else if (tags.emergency === 'ambulance_station') type = 'Ambulance Station';
      else if (tags.emergency === 'rescue_station') type = 'Rescue Facility';

      if (elLat && elLng) {
        resources.push({
          id: `osm-${el.id}`,
          name,
          type,
          lat: elLat,
          lng: elLng,
          verificationSource: 'OpenStreetMap',
          contactInfo: tags.phone || undefined,
        });
      }
    });

    return resources;
  } catch (error) {
    console.error('[RescueOps] Error fetching from OSM Overpass:', error);
    return [];
  }
}

/**
 * Fetch active organizations from ReliefWeb
 * This is a simplified approach fetching recent reports/disasters for the approximate country.
 */
export async function fetchReliefWebOrgs(lat: number, lng: number): Promise<EmergencyResource[]> {
  try {
    // We reverse geocode first or just fetch global recent active orgs
    // Since ReliefWeb doesn't have a strict lat/lng bounding box for orgs, we fetch active disasters
    const response = await fetch('https://api.reliefweb.int/v1/disasters?appname=aegis-ai&profile=full&preset=latest&limit=5');
    const dataObj = await response.json();
    const data = dataObj.data || [];
    const orgs: EmergencyResource[] = [];

    // Extracting primary organizations involved in recent disasters
    // (This is a generic representation as ReliefWeb doesn't map orgs to exact coordinates easily)
    data.forEach((d: any) => {
      if (d.fields && d.fields.primary_country) {
        orgs.push({
          id: `rw-${d.id}`,
          name: `ReliefWeb Response: ${d.fields.name}`,
          type: 'Organization',
          lat: d.fields.primary_country.location.lat,
          lng: d.fields.primary_country.location.lon,
          verificationSource: 'ReliefWeb',
          activeStatus: 'Active Disaster Response',
        });
      }
    });

    return orgs;
  } catch (error) {
    console.error('[RescueOps] Error fetching from ReliefWeb:', error);
    return [];
  }
}

/**
 * Fetch active events from NASA EONET
 */
export async function fetchNasaEonetEvents(radiusDegrees = 5): Promise<any[]> {
  try {
    const response = await axios.get('https://eonet.gsfc.nasa.gov/api/v3/events');
    const events = response.data.events || [];
    return events;
  } catch (error) {
    console.error('[RescueOps] Error fetching from EONET:', error);
    return [];
  }
}
