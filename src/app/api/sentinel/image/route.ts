import { NextResponse } from 'next/server';

// Evalscripts for different disaster types
const EVALSCRIPTS = {
  // NDWI (Normalized Difference Water Index) - Highlights water in blue
  flood: `
    //VERSION=3
    function setup() {
      return {
        input: ["B03", "B08", "dataMask"],
        output: { bands: 4 }
      };
    }
    
    function evaluatePixel(sample) {
      if (sample.dataMask === 0) return [0, 0, 0, 0];
      
      let ndwi = (sample.B03 - sample.B08) / (sample.B03 + sample.B08);
      
      // Interpolate color based on NDWI value
      if (ndwi < 0) {
        return [1, 1, 1, 1]; // non-water (white/transparent)
      } else {
        // Water is blue, darker for higher NDWI
        return [0, 0.5 - (ndwi * 0.5), 1, 1];
      }
    }
  `,

  // NBR (Normalized Burn Ratio) - Highlights burned areas
  wildfire: `
    //VERSION=3
    function setup() {
      return {
        input: ["B08", "B12", "dataMask"],
        output: { bands: 4 }
      };
    }
    
    function evaluatePixel(sample) {
      if (sample.dataMask === 0) return [0, 0, 0, 0];
      
      let nbr = (sample.B08 - sample.B12) / (sample.B08 + sample.B12);
      
      // Highlight low NBR (burned areas) in red/dark colors
      if (nbr < -0.1) {
        return [1, 0, 0, 1]; // severe burn
      } else if (nbr < 0.1) {
        return [1, 0.5, 0, 0.8]; // moderate burn
      } else {
        return [0, 0, 0, 0]; // unburned/healthy
      }
    }
  `,

  // NDVI (Normalized Difference Vegetation Index) - Drought/vegetation health
  drought: `
    //VERSION=3
    function setup() {
      return {
        input: ["B04", "B08", "dataMask"],
        output: { bands: 4 }
      };
    }
    
    function evaluatePixel(sample) {
      if (sample.dataMask === 0) return [0, 0, 0, 0];
      
      let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
      
      if (ndvi < 0.2) {
        return [0.8, 0.4, 0, 1]; // severe stress / barren
      } else if (ndvi < 0.4) {
        return [1, 0.8, 0, 1]; // moderate stress
      } else {
        return [0, 1, 0, 1]; // healthy vegetation
      }
    }
  `,

  // True color composite - Default fallback / earthquake damage assessment
  truecolor: `
    //VERSION=3
    function setup() {
      return {
        input: ["B02", "B03", "B04", "dataMask"],
        output: { bands: 4 }
      };
    }
    
    function evaluatePixel(sample) {
      if (sample.dataMask === 0) return [0, 0, 0, 0];
      return [sample.B04 * 2.5, sample.B03 * 2.5, sample.B02 * 2.5, sample.dataMask];
    }
  `,

  earthquake: `
    //VERSION=3
    function setup() {
      return {
        input: ["B02", "B03", "B04", "dataMask"],
        output: { bands: 4 }
      };
    }
    
    function evaluatePixel(sample) {
      if (sample.dataMask === 0) return [0, 0, 0, 0];
      // Enhance contrast for earthquake damage inspection
      return [sample.B04 * 3.0, sample.B03 * 3.0, sample.B02 * 3.0, sample.dataMask];
    }
  `
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bbox, dateFrom, dateTo, disasterType } = body;

    if (!bbox || !dateFrom || !dateTo) {
      return NextResponse.json({ error: 'Missing required parameters: bbox, dateFrom, dateTo' }, { status: 400 });
    }

    const type = disasterType && EVALSCRIPTS[disasterType as keyof typeof EVALSCRIPTS] 
      ? (disasterType as keyof typeof EVALSCRIPTS) 
      : 'truecolor';

    const evalscript = EVALSCRIPTS[type];

    // 1. Get OAuth Token from Copernicus Data Space
    const tokenResponse = await fetch('https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.SENTINEL_CLIENT_ID || '',
        client_secret: process.env.SENTINEL_CLIENT_SECRET || ''
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Sentinel Auth Error:', errText);
      return NextResponse.json({ error: 'Failed to authenticate with Copernicus API' }, { status: 500 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Request Image from Processing API
    // bbox should be [minX, minY, maxX, maxY] (Longitude, Latitude)
    // Clamp the bounding box so the area isn't too large for Sentinel-2's
    // max resolution of 1500 m/pixel. We limit the span to ~5 degrees and
    // compute output dimensions so each pixel stays under 1400 m.
    const MAX_SPAN_DEG = 5;
    let [minX, minY, maxX, maxY] = bbox as number[];
    const midLon = (minX + maxX) / 2;
    const midLat = (minY + maxY) / 2;
    if (maxX - minX > MAX_SPAN_DEG) {
      minX = midLon - MAX_SPAN_DEG / 2;
      maxX = midLon + MAX_SPAN_DEG / 2;
    }
    if (maxY - minY > MAX_SPAN_DEG) {
      minY = midLat - MAX_SPAN_DEG / 2;
      maxY = midLat + MAX_SPAN_DEG / 2;
    }
    const clampedBbox = [minX, minY, maxX, maxY];

    // Approximate meters per degree at this latitude
    const metersPerDegLat = 111320;
    const metersPerDegLon = 111320 * Math.cos((midLat * Math.PI) / 180);
    const bboxWidthM = (maxX - minX) * metersPerDegLon;
    const bboxHeightM = (maxY - minY) * metersPerDegLat;

    // Target ≤ 1400 m/pixel (under the 1500 limit), min 256px, max 2500px
    const TARGET_MPC = 1400;
    const width = Math.max(256, Math.min(2500, Math.ceil(bboxWidthM / TARGET_MPC)));
    const height = Math.max(256, Math.min(2500, Math.ceil(bboxHeightM / TARGET_MPC)));

    const payload = {
      input: {
        bounds: {
          properties: {
            crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84"
          },
          bbox: clampedBbox
        },
        data: [
          {
            type: "sentinel-2-l2a",
            dataFilter: {
              timeRange: {
                from: (() => {
                  const d = new Date(dateFrom);
                  if (dateFrom === dateTo) {
                    // Expand search window back 15 days to ensure we catch a satellite pass
                    d.setDate(d.getDate() - 15);
                  }
                  return d.toISOString();
                })(),
                to: (() => {
                  const d = new Date(dateTo);
                  d.setHours(23, 59, 59, 999); // Include the entire end day
                  return d.toISOString();
                })()
              },
              maxCloudCoverage: 30
            }
          }
        ]
      },
      output: {
        width,
        height,
        responses: [
          {
            identifier: "default",
            format: {
              type: "image/png"
            }
          }
        ]
      },
      evalscript: evalscript
    };

    const processResponse = await fetch('https://sh.dataspace.copernicus.eu/api/v1/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'image/png'
      },
      body: JSON.stringify(payload)
    });

    if (!processResponse.ok) {
      const errText = await processResponse.text();
      console.error('Sentinel Processing Error:', errText);
      return NextResponse.json({ error: errText }, { status: 500 });
    }

    // 3. Return the image as a buffer
    const imageBuffer = await processResponse.arrayBuffer();
    
    // We return it with the proper content type so it can be directly used as an image source if needed,
    // or the frontend can parse the arrayBuffer and create a blob URL.
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error: any) {
    console.error('API Error in Sentinel Route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
