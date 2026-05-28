import { NextResponse } from 'next/server';

const USGS_API = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
const NASA_EONET_API = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const severity = searchParams.get('severity');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    // Fetch from multiple sources concurrently
    const [usgsRes, eonetRes] = await Promise.allSettled([
      fetch(USGS_API, { next: { revalidate: 300 } }),
      fetch(NASA_EONET_API, { next: { revalidate: 300 } }),
    ]);

    const incidents: any[] = [];

    // Parse USGS earthquakes
    if (usgsRes.status === 'fulfilled' && usgsRes.value.ok) {
      const usgsData = await usgsRes.value.json();
      const quakes = (usgsData.features || []).map((f: any) => ({
        title: f.properties.title || f.properties.place,
        type: 'earthquake',
        severity: getSeverityFromMag(f.properties.mag),
        status: 'active',
        location: {
          type: 'Point',
          coordinates: [f.geometry.coordinates[0], f.geometry.coordinates[1]],
        },
        description: `Magnitude ${f.properties.mag} earthquake at depth ${f.geometry.coordinates[2]}km.`,
        source: 'usgs',
        sourceId: f.id,
        magnitude: f.properties.mag,
        depth: f.geometry.coordinates[2],
        tsunamiFlag: f.properties.tsunami === 1,
        credibilityScore: 0.98,
        createdAt: new Date(f.properties.time).toISOString(),
        updatedAt: new Date(f.properties.updated).toISOString(),
      }));
      incidents.push(...quakes);
    }

    // Parse NASA EONET events
    if (eonetRes.status === 'fulfilled' && eonetRes.value.ok) {
      const eonetData = await eonetRes.value.json();
      const events = (eonetData.events || [])
        .filter((e: any) => e.geometry && e.geometry.length > 0)
        .map((e: any) => {
          const latestGeo = e.geometry[e.geometry.length - 1];
          const eonetType = mapEonetCategory(e.categories?.[0]?.id);
          return {
            title: e.title,
            type: eonetType,
            severity: 'medium' as const,
            status: 'active',
            location: {
              type: 'Point',
              coordinates: latestGeo.coordinates,
            },
            description: e.description || `NASA EONET: ${e.title}`,
            source: 'nasa_eonet',
            sourceId: e.id,
            credibilityScore: 0.92,
            createdAt: latestGeo.date || new Date().toISOString(),
            updatedAt: latestGeo.date || new Date().toISOString(),
          };
        });
      incidents.push(...events);
    }

    // Apply filters
    let result = incidents;

    if (type && type !== 'all') {
      result = result.filter((i) => i.type === type);
    }
    if (severity && severity !== 'all') {
      result = result.filter((i) => i.severity === severity);
    }

    // Sort by severity then time
    const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    result.sort((a, b) => {
      const aSev = sevOrder[a.severity] ?? 4;
      const bSev = sevOrder[b.severity] ?? 4;
      if (aSev !== bSev) return aSev - bSev;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json(result.slice(0, limit));
  } catch (error) {
    console.error('Incidents API error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

function getSeverityFromMag(mag: number): string {
  if (mag >= 7) return 'critical';
  if (mag >= 5.5) return 'high';
  if (mag >= 4) return 'medium';
  return 'low';
}

function mapEonetCategory(categoryId: string): string {
  const mapping: Record<string, string> = {
    wildfires: 'wildfire',
    volcanoes: 'volcano',
    severeStorms: 'cyclone',
    floods: 'flood',
    earthquakes: 'earthquake',
    landslides: 'landslide',
    drought: 'drought',
    dustHaze: 'industrial_hazard',
    seaLakeIce: 'blizzard',
    tempExtremes: 'heatwave',
    waterColor: 'flood',
    snow: 'blizzard',
  };
  return mapping[categoryId] || 'earthquake';
}
