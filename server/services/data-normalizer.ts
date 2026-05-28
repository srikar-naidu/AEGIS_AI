import { IIncident, DisasterType, SeverityLevel } from '../db/models';
import { USGSEarthquake, earthquakeSeverity } from './data-sources/usgs.service';
import { EONETEvent, mapEONETCategory, eonetSeverity } from './data-sources/nasa-eonet.service';
import { FIRMSHotspot, fireSeverity } from './data-sources/nasa-firms.service';
import { GDACSEvent, mapGDACSType, gdacsSeverity } from './data-sources/gdacs.service';
import { ReliefWebDisaster, mapReliefWebType } from './data-sources/reliefweb.service';

/**
 * Normalizes USGS Earthquake into Incident format
 */
export function normalizeEarthquake(eq: USGSEarthquake): Partial<IIncident> {
  const [lng, lat, depth] = eq.geometry.coordinates;
  const severity = earthquakeSeverity(eq.properties.mag);

  return {
    title: eq.properties.title || `Earthquake M${eq.properties.mag} - ${eq.properties.place}`,
    type: 'earthquake' as DisasterType,
    severity,
    status: 'active',
    location: {
      type: 'Point',
      coordinates: [lng, lat],
    },
    description: `Earthquake magnitude ${eq.properties.mag} detected. Depth: ${depth} km. Significance score: ${eq.properties.sig}.`,
    source: 'usgs',
    sourceId: eq.id,
    magnitude: eq.properties.mag,
    depth,
    tsunamiFlag: eq.properties.tsunami === 1,
    confidence: eq.properties.sig ? Math.min(100, Math.round((eq.properties.sig / 1000) * 100)) : 80,
    credibilityScore: 0.99, // USGS seismograph data is highly reliable
  };
}

/**
 * Normalizes NASA EONET events into Incident format
 */
export function normalizeEONETEvent(event: EONETEvent): Partial<IIncident> {
  const latestGeo = event.geometry[event.geometry.length - 1];
  if (!latestGeo) throw new Error(`[Normalizer] EONET event ${event.id} lacks geometry`);

  const type = mapEONETCategory(event.categories) as DisasterType;
  const severity = eonetSeverity(event) as SeverityLevel;

  // EONET coords can be Point [lng, lat] or Polygon [ [ [lng, lat], ... ] ]
  let coordinates: [number, number] = [0, 0];
  let dangerZone: Partial<IIncident['dangerZone']> | undefined;

  if (latestGeo.type === 'Point') {
    const coords = latestGeo.coordinates as number[];
    coordinates = [coords[0], coords[1]];
  } else if (latestGeo.type === 'Polygon') {
    const polygon = latestGeo.coordinates as number[][][];
    // Find center point of polygon for incident location
    let sumLng = 0,
      sumLat = 0,
      count = 0;
    polygon[0].forEach((coord) => {
      sumLng += coord[0];
      sumLat += coord[1];
      count++;
    });
    coordinates = [sumLng / count, sumLat / count];
    dangerZone = {
      type: 'Polygon',
      coordinates: polygon,
    };
  }

  const sourceName = event.sources[0]?.id || 'nasa_eonet';

  return {
    title: event.title,
    type,
    severity,
    status: 'active',
    location: {
      type: 'Point',
      coordinates,
    },
    dangerZone: dangerZone as IIncident['dangerZone'],
    description: event.description || `Natural event (${event.categories[0]?.title}) logged by ${sourceName}.`,
    source: 'nasa_eonet',
    sourceId: event.id,
    confidence: 80,
    credibilityScore: 0.9,
  };
}

/**
 * Normalizes NASA FIRMS Fire Hotspots into Incident format
 */
export function normalizeFireHotspot(fire: FIRMSHotspot): Partial<IIncident> {
  const severity = fireSeverity(fire.brightness);
  const confNum = typeof fire.confidence === 'number' ? fire.confidence : fire.confidence === 'high' ? 90 : fire.confidence === 'nominal' ? 65 : 30;

  return {
    title: `Wildfire detected via Satellite - Active hotspot at [${fire.latitude.toFixed(4)}, ${fire.longitude.toFixed(4)}]`,
    type: 'wildfire' as DisasterType,
    severity,
    status: 'active',
    location: {
      type: 'Point',
      coordinates: [fire.longitude, fire.latitude],
    },
    description: `Active thermal anomaly detected by ${fire.satellite} satellite. Fire Radiative Power (FRP): ${fire.frp} MW. Brightness Temp: ${fire.brightness} K.`,
    source: 'nasa_firms',
    sourceId: `firms_${fire.latitude}_${fire.longitude}_${fire.acq_date}_${fire.acq_time}`,
    brightness: fire.brightness,
    confidence: confNum,
    credibilityScore: confNum / 100,
  };
}

/**
 * Normalizes GDACS Alert into Incident format
 */
export function normalizeGDACSEvent(feat: any): Partial<IIncident> {
  const ev = feat.properties as GDACSEvent;
  const [lng, lat] = feat.geometry.coordinates;

  const type = mapGDACSType(ev.eventtype) as DisasterType;
  const severity = gdacsSeverity(ev.alertlevel) as SeverityLevel;

  return {
    title: ev.eventname || `${ev.eventtype} Event in ${ev.country}`,
    type,
    severity,
    status: 'active',
    location: {
      type: 'Point',
      coordinates: [lng, lat],
    },
    description: ev.description || `Global alert level: ${ev.alertlevel}. Affected population estimated: ${ev.population?.value || 0} ${ev.population?.unit || ''}.`,
    source: 'gdacs',
    sourceId: `gdacs_${ev.eventid}_${ev.episodeid}`,
    affectedPopulation: ev.population?.value || undefined,
    confidence: ev.alertscore ? Math.min(100, Math.round(ev.alertscore * 20)) : 75,
    credibilityScore: ev.alertlevel === 'Red' ? 0.95 : ev.alertlevel === 'Orange' ? 0.85 : 0.7,
  };
}

/**
 * Normalizes ReliefWeb disaster entry into Incident format
 */
export function normalizeReliefWebDisaster(disaster: ReliefWebDisaster): Partial<IIncident> {
  const f = disaster.fields;
  const type = mapReliefWebType(f.type) as DisasterType;

  // Retrieve location coordinates from primary country or first listed country
  let coordinates: [number, number] = [0, 0];
  if (f.primary_country?.location) {
    coordinates = [f.primary_country.location.lon, f.primary_country.location.lat];
  } else {
    const countryWithLoc = f.country.find((c) => c.location);
    if (countryWithLoc?.location) {
      coordinates = [countryWithLoc.location.lon, countryWithLoc.location.lat];
    }
  }

  return {
    title: f.name,
    type,
    severity: 'medium', // Default to medium as ReliefWeb doesn't provide fine alert levels in summary
    status: f.status === 'current' ? 'active' : 'resolved',
    location: {
      type: 'Point',
      coordinates,
    },
    description: f.description || `Humanitarian disaster report tracking ${f.name}. Source: ReliefWeb.`,
    source: 'reliefweb',
    sourceId: disaster.id,
    confidence: 85,
    credibilityScore: 0.85,
  };
}
