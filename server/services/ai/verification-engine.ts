import mongoose from 'mongoose';
import { Report, Incident, Alert, VerificationScore, IReport, CredibilityClassification } from '../../db/models';
import { fetchCurrentWeather, getWeatherDescription } from '../data-sources/open-meteo-weather.service';
import { askGroqJSON } from './groq-client';
import { calculateSpreadPrediction } from './spread-prediction';

export interface VerificationResult {
  score: number; // 0 to 1
  classification: CredibilityClassification;
  reasoning: string;
  flags: string[];
  breakdown: {
    timestampCheck: number;
    gpsValidation: number;
    weatherConsistency: number;
    satelliteCorrelation: number;
    aiContentAnalysis: number;
    metadataAnalysis: number;
  };
  detailedReport: string;
}

// =============================================
// DATA GATHERING FUNCTIONS (No scoring — just raw facts)
// =============================================

/**
 * Gather timestamp context as a human-readable string
 */
function gatherTimestampContext(report: IReport): string {
  const ageMs = Date.now() - report.createdAt.getTime();
  const ageMinutes = Math.floor(ageMs / 60000);
  const ageHours = Math.floor(ageMinutes / 60);
  const ageDays = Math.floor(ageHours / 24);

  let ageDescription: string;
  if (ageMinutes < 5) ageDescription = `Report was submitted ${ageMinutes} minutes ago — EXTREMELY FRESH.`;
  else if (ageMinutes < 60) ageDescription = `Report was submitted ${ageMinutes} minutes ago — very recent.`;
  else if (ageHours < 6) ageDescription = `Report was submitted ${ageHours} hours ago — fairly recent.`;
  else if (ageHours < 24) ageDescription = `Report was submitted ${ageHours} hours ago — same day.`;
  else if (ageDays < 3) ageDescription = `Report was submitted ${ageDays} days ago — getting stale.`;
  else ageDescription = `Report was submitted ${ageDays} days ago — OLD REPORT, potentially outdated.`;

  return `Report submitted at: ${report.createdAt.toISOString()}\nCurrent time: ${new Date().toISOString()}\n${ageDescription}`;
}

/**
 * Gather GPS & nearby incident context
 */
async function gatherGPSContext(report: IReport, lat: number, lng: number): Promise<string> {
  const lines: string[] = [];
  lines.push(`Report coordinates: Latitude ${lat.toFixed(6)}, Longitude ${lng.toFixed(6)}`);

  // Check if coords look valid
  if (lat === 0 && lng === 0) {
    lines.push('⚠️ CRITICAL: Coordinates are exactly [0, 0] — this is the Gulf of Guinea, not a real location. Almost certainly fake or missing GPS data.');
    return lines.join('\n');
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    lines.push('⚠️ CRITICAL: Coordinates are out of valid range. This is impossible GPS data.');
    return lines.join('\n');
  }

  // Check for nearby incidents of the same disaster type
  try {
    const sameTypeNearby = await Incident.find({
      type: report.type,
      status: { $in: ['active', 'monitoring'] },
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: 50000, // 50km
        },
      },
    }).limit(5);

    if (sameTypeNearby.length > 0) {
      lines.push(`\nNEARBY MATCHING INCIDENTS (same type "${report.type}" within 50km):`);
      for (const inc of sameTypeNearby) {
        const dist = getDistanceMeters(lat, lng, inc.location.coordinates[1], inc.location.coordinates[0]);
        lines.push(`  - "${inc.title}" — ${(dist / 1000).toFixed(1)}km away | Source: ${inc.source} | Severity: ${inc.severity}`);
      }
    } else {
      lines.push(`\nNo nearby incidents of type "${report.type}" found within 50km. This is an ISOLATED report with no corroboration.`);
    }

    // Check for any nearby incidents (any type)
    const anyNearby = await Incident.find({
      status: { $in: ['active', 'monitoring'] },
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: 25000,
        },
      },
    }).limit(3);

    if (anyNearby.length > 0 && sameTypeNearby.length === 0) {
      lines.push(`\nNearby incidents of OTHER types within 25km:`);
      for (const inc of anyNearby) {
        const dist = getDistanceMeters(lat, lng, inc.location.coordinates[1], inc.location.coordinates[0]);
        lines.push(`  - "${inc.title}" (${inc.type}) — ${(dist / 1000).toFixed(1)}km away`);
      }
    }
  } catch (err) {
    lines.push('GPS database query failed — unable to check nearby incidents.');
  }

  // Check for matching citizen reports in the area
  try {
    const nearbyReports = await Report.find({
      _id: { $ne: report._id },
      type: report.type,
      createdAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: 15000,
        },
      },
    }).limit(5);

    if (nearbyReports.length > 0) {
      lines.push(`\nNEARBY CITIZEN REPORTS (same type, last 48hrs, within 15km): ${nearbyReports.length} report(s) found — corroborates this submission.`);
    }
  } catch (err) {
    // Silently continue
  }

  return lines.join('\n');
}

/**
 * Gather live weather context
 */
async function gatherWeatherContext(report: IReport, lat: number, lng: number): Promise<string> {
  const weather = await fetchCurrentWeather(lat, lng);
  if (!weather) {
    return 'Weather data unavailable — Open-Meteo API did not respond. Cannot validate weather consistency.';
  }

  const c = weather.current;
  const weatherDesc = getWeatherDescription(c.weather_code);

  const lines: string[] = [
    `LIVE WEATHER AT REPORT LOCATION (${lat.toFixed(2)}, ${lng.toFixed(2)}):`,
    `  Conditions: ${weatherDesc} (WMO Code: ${c.weather_code})`,
    `  Temperature: ${c.temperature_2m}°C (feels like ${c.apparent_temperature}°C)`,
    `  Humidity: ${c.relative_humidity_2m}%`,
    `  Precipitation: ${c.precipitation} mm`,
    `  Rain: ${c.rain} mm`,
    `  Snowfall: ${c.snowfall} cm`,
    `  Wind Speed: ${c.wind_speed_10m} km/h`,
    `  Wind Gusts: ${c.wind_gusts_10m} km/h`,
    `  Wind Direction: ${c.wind_direction_10m}°`,
    `  Cloud Cover: ${c.cloud_cover}%`,
    `  Pressure: ${c.pressure_msl} hPa`,
    `  Daytime: ${c.is_day ? 'Yes' : 'No'}`,
    ``,
    `REPORTED DISASTER TYPE: ${report.type}`,
    `Weather-Disaster compatibility notes:`,
  ];

  // Add contextual hints for the LLM
  switch (report.type) {
    case 'wildfire':
      lines.push(`  → Wildfires thrive in hot (>25°C), dry (0mm rain), windy conditions.`);
      lines.push(`  → Current: temp=${c.temperature_2m}°C, rain=${c.precipitation}mm, wind=${c.wind_speed_10m}km/h`);
      if (c.precipitation > 10) lines.push(`  ⚠️ Heavy rain (${c.precipitation}mm) makes wildfire VERY UNLIKELY right now.`);
      break;
    case 'flood':
      lines.push(`  → Floods require heavy precipitation (>10mm) or recent extreme rainfall.`);
      lines.push(`  → Current precipitation: ${c.precipitation}mm, rain: ${c.rain}mm`);
      if (c.precipitation < 1 && c.rain < 1) lines.push(`  ⚠️ No current precipitation — flood would need prior river/dam overflow.`);
      break;
    case 'blizzard':
      lines.push(`  → Blizzards need sub-zero temps and heavy snowfall.`);
      lines.push(`  → Current: temp=${c.temperature_2m}°C, snowfall=${c.snowfall}cm`);
      if (c.temperature_2m > 5) lines.push(`  ⚠️ Temperature is ${c.temperature_2m}°C — blizzard is PHYSICALLY IMPOSSIBLE at this temperature.`);
      break;
    case 'cyclone':
      lines.push(`  → Cyclones have extreme winds (>60km/h) and heavy rain.`);
      lines.push(`  → Current: wind=${c.wind_speed_10m}km/h, gusts=${c.wind_gusts_10m}km/h`);
      break;
    case 'heatwave':
      lines.push(`  → Heatwaves feature sustained temps >35°C.`);
      lines.push(`  → Current: temp=${c.temperature_2m}°C`);
      if (c.temperature_2m < 25) lines.push(`  ⚠️ Temperature is only ${c.temperature_2m}°C — heatwave claim is SUSPICIOUS.`);
      break;
    case 'earthquake':
    case 'volcano':
    case 'tsunami':
      lines.push(`  → Geological events are NOT weather-dependent. Weather data is neutral for this type.`);
      break;
    default:
      lines.push(`  → General disaster type. Evaluate weather relevance yourself.`);
  }

  return lines.join('\n');
}

/**
 * Gather satellite/agency correlation context
 */
async function gatherSatelliteContext(report: IReport, lat: number, lng: number): Promise<string> {
  const lines: string[] = [];
  const cutoffTime = new Date(Date.now() - 72 * 60 * 60 * 1000); // Last 72 hours

  try {
    const matches = await Incident.find({
      type: report.type,
      source: { $in: ['usgs', 'nasa_firms', 'nasa_eonet', 'gdacs', 'reliefweb'] },
      createdAt: { $gte: cutoffTime },
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: 100000, // 100km
        },
      },
    }).limit(10);

    if (matches.length > 0) {
      lines.push(`SATELLITE/AGENCY CORRELATION (same disaster type, last 72hrs, within 100km):`);
      lines.push(`Found ${matches.length} matching agency-verified event(s):`);
      for (const m of matches) {
        const dist = getDistanceMeters(lat, lng, m.location.coordinates[1], m.location.coordinates[0]);
        lines.push(`  ✅ "${m.title}" — ${(dist / 1000).toFixed(1)}km away | Source: ${m.source.toUpperCase()} | Severity: ${m.severity} | Date: ${m.createdAt.toISOString().split('T')[0]}`);
      }
      lines.push(`\nThis is STRONG corroboration from trusted global agencies.`);
    } else {
      lines.push(`SATELLITE/AGENCY CORRELATION:`);
      lines.push(`NO matching events of type "${report.type}" found from NASA, USGS, GDACS, or EONET within 100km in the last 72 hours.`);
      lines.push(`This means no trusted satellite or agency has independently detected this disaster in this area.`);
      
      // Check for any type nearby
      const anyMatches = await Incident.find({
        source: { $in: ['usgs', 'nasa_firms', 'nasa_eonet', 'gdacs', 'reliefweb'] },
        createdAt: { $gte: cutoffTime },
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: 50000,
          },
        },
      }).limit(5);

      if (anyMatches.length > 0) {
        lines.push(`\nHowever, these OTHER disaster types were detected nearby:`);
        for (const m of anyMatches) {
          const dist = getDistanceMeters(lat, lng, m.location.coordinates[1], m.location.coordinates[0]);
          lines.push(`  - "${m.title}" (${m.type}) — ${(dist / 1000).toFixed(1)}km away | Source: ${m.source.toUpperCase()}`);
        }
      }
    }
  } catch (err) {
    lines.push('Satellite correlation query failed — unable to check agency data.');
  }

  return lines.join('\n');
}

// =============================================
// UNIFIED GROQ VERIFICATION ENGINE
// =============================================

/**
 * Runs the full AI-driven verification pipeline on a citizen report.
 * Gathers raw context from all sources, then sends everything to Groq
 * in a single unified mega-prompt for holistic analysis.
 */
export async function verifyReport(reportId: string | mongoose.Types.ObjectId): Promise<VerificationResult> {
  const report = await Report.findById(reportId);
  if (!report) {
    throw new Error(`Report not found: ${reportId}`);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`[AEGIS AI VERIFICATION] Starting pipeline for Report ID: ${report._id}`);
  console.log(`  Type: ${report.type} | Severity: ${report.severity}`);
  console.log(`  Description: "${report.description?.substring(0, 80)}..."`);
  console.log(`  Media: ${report.mediaUrls?.length || 0} file(s)`);
  console.log(`${'='.repeat(70)}`);

  // Update report status
  report.verificationStatus = 'in_progress';
  await report.save();

  const [lng, lat] = report.location.coordinates;

  // ── Gather all raw context in parallel ──
  console.log('[AEGIS AI] Gathering context from all sources...');
  const [timestampCtx, gpsCtx, weatherCtx, satelliteCtx] = await Promise.all([
    Promise.resolve(gatherTimestampContext(report)),
    gatherGPSContext(report, lat, lng),
    gatherWeatherContext(report, lat, lng),
    gatherSatelliteContext(report, lat, lng),
  ]);

  console.log('[AEGIS AI] Context gathered. Building Groq mega-prompt...');

  // ── Build the image URL for vision analysis (if media exists) ──
  const imageUrl = report.mediaUrls && report.mediaUrls.length > 0 ? report.mediaUrls[0] : undefined;

  let clipDataString = 'No CLIP data available.';
  if (imageUrl) {
    // CRITICAL FIX: Roboflow CLIP API throws 500 Internal Error if prompt array has > 8 classes.
    const classes = [...new Set([report.type, 'flood', 'wildfire', 'earthquake damage', 'drought', 'storm', 'cyclone', 'normal clear scene', 'building debris', 'heavy smoke'])].slice(0, 8);
    const roboflowApiKey = process.env.ROBOFLOW_API_KEY || '21IpOwYOPyTyHWw6in1p';

    /**
     * Helper: call Roboflow CLIP with a given subject payload.
     * Returns the mapped similarity scores or null on failure.
     */
    async function callClip(payload: any, label: string): Promise<Record<string, number> | null> {
      try {
        console.log(`[AEGIS AI] CLIP attempt (${label})...`);
        const clipResponse = await fetch(`https://infer.roboflow.com/clip/compare?api_key=${roboflowApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: payload,
            subject_type: "image",
            prompt: classes
          })
        });
        if (clipResponse.ok) {
          const clipData = await clipResponse.json();
          console.log(`[AEGIS AI] CLIP (${label}) raw response:`, JSON.stringify(clipData).substring(0, 200));
          if (clipData.similarity && clipData.similarity.length === classes.length) {
            const mapped: Record<string, number> = {};
            classes.forEach((c, idx) => { mapped[c] = clipData.similarity[idx]; });
            return mapped;
          }
          // Unexpected format but still data
          return clipData as any;
        } else {
          const errText = await clipResponse.text();
          console.warn(`[AEGIS AI] CLIP (${label}) failed: ${clipResponse.status} - ${errText}`);
          return null;
        }
      } catch (e: any) {
        console.error(`[AEGIS AI] CLIP (${label}) error:`, e?.message || e);
        return null;
      }
    }

    console.log(`[AEGIS AI] Starting CLIP analysis for image: ${imageUrl.substring(0, 80)}...`);

    let clipResult: Record<string, number> | null = null;

    if (imageUrl.startsWith('data:image/')) {
      // Already a data URI — extract base64
      const base64Data = imageUrl.split(',')[1];
      clipResult = await callClip({ type: "base64", value: base64Data }, 'data-uri');
    } else if (imageUrl.includes('res.cloudinary.com')) {
      // Cloudinary URL — use resize transformation for reliability, then base64 fallback
      const resizedUrl = imageUrl.replace('/upload/', '/upload/w_512,q_80/');
      console.log(`[AEGIS AI] Using Cloudinary resize: ${resizedUrl.substring(0, 80)}...`);
      try {
        const imgRes = await fetch(resizedUrl);
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          const base64Data = Buffer.from(buffer).toString('base64');
          console.log(`[AEGIS AI] Fetched resized image, base64 length: ${base64Data.length}`);
          clipResult = await callClip({ type: "base64", value: base64Data }, 'cloudinary-resized-b64');
        } else {
          console.warn(`[AEGIS AI] Cloudinary resize fetch failed: ${imgRes.status}`);
        }
      } catch (e: any) {
        console.warn(`[AEGIS AI] Cloudinary resize fetch error: ${e?.message}`);
      }

      // Fallback: try original URL as base64
      if (!clipResult) {
        console.log(`[AEGIS AI] Retrying with original Cloudinary image as base64...`);
        try {
          const imgRes = await fetch(imageUrl);
          if (imgRes.ok) {
            const buffer = await imgRes.arrayBuffer();
            const base64Data = Buffer.from(buffer).toString('base64');
            clipResult = await callClip({ type: "base64", value: base64Data }, 'cloudinary-full-b64');
          }
        } catch (e: any) {
          console.warn(`[AEGIS AI] Original fetch error: ${e?.message}`);
        }
      }

      // Final fallback: try direct URL
      if (!clipResult) {
        console.log(`[AEGIS AI] Final fallback: sending URL directly to Roboflow...`);
        clipResult = await callClip({ type: "url", value: imageUrl }, 'direct-url');
      }
    } else if (imageUrl.startsWith('http')) {
      // Non-Cloudinary HTTP URL — try base64 first, then direct URL
      try {
        const imgRes = await fetch(imageUrl);
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          const base64Data = Buffer.from(buffer).toString('base64');
          clipResult = await callClip({ type: "base64", value: base64Data }, 'http-b64');
        }
      } catch (e: any) {
        console.warn(`[AEGIS AI] HTTP fetch error: ${e?.message}`);
      }
      if (!clipResult) {
        clipResult = await callClip({ type: "url", value: imageUrl }, 'direct-url');
      }
    }

    if (clipResult) {
      clipDataString = JSON.stringify(clipResult, null, 2);
      console.log(`[AEGIS AI] ✅ CLIP analysis successful! Data:\n${clipDataString}`);
    } else {
      console.error(`[AEGIS AI] ❌ All CLIP attempts failed. Proceeding without image analysis.`);
    }
  }

  // ── Construct the Unified Mega-Prompt ──
  const systemPrompt = `You are the CENTRAL VERIFICATION INTELLIGENCE of AEGIS AI — a military-grade disaster management platform used by governments worldwide. You have ONE job: rigorously verify citizen-submitted disaster reports for authenticity, accuracy, and credibility.

You will receive:
1. The citizen's report (disaster type, severity, description)
2. An uploaded image (if provided) — YOU MUST EXAMINE IT CAREFULLY
3. Live weather data from the report's exact GPS coordinates
4. Satellite/agency data showing what NASA, USGS, GDACS have detected nearby
5. GPS proximity analysis showing nearby verified incidents
6. Timestamp freshness information

YOUR VERIFICATION CHECKLIST — Score each dimension 0.0 to 1.0:

## 1. GPS VALIDATION (gpsValidation)
- Are the coordinates valid and realistic?
- Is [0,0] submitted (Gulf of Guinea — almost always fake)?
- Do any verified incidents exist near this location?
- Are there corroborating citizen reports?

## 2. TIMESTAMP ANALYSIS (timestampCheck)
- How fresh is the report? (within minutes = excellent, days old = suspicious)
- Could the timing be exploitative (e.g., submitting during a trending news event)?

## 3. WEATHER CONSISTENCY (weatherConsistency)
- Does the LIVE weather at the GPS coordinates support the claimed disaster type?
- Wildfire during heavy rain = IMPOSSIBLE → score 0.05
- Blizzard at 30°C = IMPOSSIBLE → score 0.05
- Flood with zero precipitation = SUSPICIOUS (unless river overflow)
- Earthquake/volcano = weather-independent → score 0.80

## 4. SATELLITE CORRELATION (satelliteCorrelation)
- Have NASA, USGS, GDACS, or EONET independently detected this type of disaster in this area?
- Strong satellite match = score 0.95+
- No satellite data at all = score 0.25 (doesn't mean fake, but unverified)

## 5. IMAGE/MEDIA ANALYSIS (imageAnalysis)
- If an image is provided, EXAMINE IT and determine:
  a) What does the image ACTUALLY show? (flood, fire, dry land, clear sky, etc.)
  b) Does the image MATCH the claimed disaster type? (flood image for drought = MISMATCH → score 0.05)
  c) Is the image AI-GENERATED? Look for: unnatural smoothness, distorted objects, impossible geometry, weird text, extra limbs, too-perfect lighting, watermarks
  d) Does the image look like a stock photo or screenshot from the internet?
  e) Quality and authenticity indicators
- If no image: score 0.40 (can't verify visually)

## 6. METADATA & CONTENT ANALYSIS (metadataAnalysis)  
- Is the description detailed and specific, or vague and generic?
- Does the description match the disaster type and severity?
- Are there spam indicators or sensationalist language?
- Does everything tell a consistent story, or are there contradictions?

## CRITICAL RULES:
- If the image shows a COMPLETELY DIFFERENT disaster than claimed (e.g., flood image for drought report), the overall score MUST be below 0.20
- If the image is clearly AI-generated, overall score MUST be below 0.15
- If GPS is [0,0], overall score MUST be below 0.25
- If weather CONTRADICTS the disaster type (e.g., heavy rain during wildfire claim), the weatherConsistency MUST be below 0.15
- Be SKEPTICAL by default. Only highly corroborated reports with matching images deserve scores above 0.80.

RESPOND ONLY IN VALID JSON:
{
  "overallScore": number (0.0 to 1.0),
  "classification": "highly_reliable" | "likely_true" | "needs_verification" | "suspicious",
  "breakdown": {
    "gpsValidation": number,
    "timestampCheck": number,
    "weatherConsistency": number,
    "satelliteCorrelation": number,
    "imageAnalysis": number,
    "metadataAnalysis": number
  },
  "flags": string[] (from: "FAKE_IMAGE", "AI_GENERATED_IMAGE", "IMAGE_DISASTER_MISMATCH", "WEATHER_CONTRADICTION", "NO_SATELLITE_CONFIRMATION", "ISOLATED_LOCATION", "STALE_REPORT", "GPS_INVALID", "SPAM_CONTENT", "VAGUE_DESCRIPTION", "SENSATIONALIST", "CORROBORATED", "SATELLITE_CONFIRMED", "WEATHER_CONSISTENT", "AUTHENTIC_IMAGE"),
  "reasoning": string (MUST be a DETAILED 5-8 sentence forensic report. Explicitly state: what the image shows, whether it matches the claim, weather analysis, satellite matches, GPS validity, and your final conclusion. This is the most important field — it MUST be thorough.),
  "imageDescription": string (1-2 sentence description of what the uploaded image actually shows. If no image, say "No image uploaded."),
  "stepDetails": {
    "gps": string (2-3 sentence analysis of GPS validation),
    "timestamp": string (1-2 sentence analysis of freshness),
    "weather": string (2-3 sentence analysis of weather-disaster match),
    "satellite": string (2-3 sentence analysis of satellite corroboration),
    "image": string (2-3 sentence analysis of image authenticity and match),
    "metadata": string (2-3 sentence analysis of description quality and consistency)
  }
}`;

  const userPrompt = `VERIFY THIS CITIZEN DISASTER REPORT:

═══════════════════════════════════════════
REPORT DETAILS
═══════════════════════════════════════════
Disaster Type Claimed: ${report.type}
Severity Claimed: ${report.severity}
Description: "${report.description}"
SOS Emergency: ${report.isSOS ? 'YES — life threatening' : 'No'}
Address/Landmark: ${report.address || 'Not provided'}
Has Image Uploaded: ${imageUrl ? 'YES — examine the attached image carefully' : 'NO — no visual evidence provided'}

═══════════════════════════════════════════
STEP 1: TIMESTAMP CONTEXT
═══════════════════════════════════════════
${timestampCtx}

═══════════════════════════════════════════
STEP 2: GPS & PROXIMITY ANALYSIS
═══════════════════════════════════════════
${gpsCtx}

═══════════════════════════════════════════
STEP 3: LIVE WEATHER AT LOCATION
═══════════════════════════════════════════
${weatherCtx}

═══════════════════════════════════════════
STEP 4: SATELLITE/AGENCY CORRELATION
═══════════════════════════════════════════
${satelliteCtx}

═══════════════════════════════════════════
STEP 5: IMAGE ANALYSIS (VIA ROBOFLOW CLIP)
═══════════════════════════════════════════
${imageUrl ? `An image was uploaded. We ran it through a Roboflow CLIP model to classify the scene.
Here is the raw output from the Roboflow CLIP model:
${clipDataString}

[CRITICAL INSTRUCTION FOR CLIP DATA]: The values above are CLIP cosine similarity scores. 
- In CLIP, scores around 0.20 - 0.35 indicate a STRONG visual match. 
- DO NOT treat these as percentages (0.25 is NOT 25% confidence, it is a very high match!).
- The class with the HIGHEST score is the most accurate description of the image.

EXAMINE THIS CLIP DATA and analyze for: disaster type match with the citizen's claim. Does the image data confirm the claimed disaster?` : 'NO IMAGE WAS UPLOADED. The citizen did not provide visual evidence. Score image analysis at 0.40 (neutral — cannot verify visually).'}

═══════════════════════════════════════════
STEP 6: METADATA ANALYSIS
═══════════════════════════════════════════
Description length: ${report.description?.length || 0} characters
Has emergency contact: ${report.emergencyContact ? 'Yes' : 'No'}
User ID: ${report.userId || 'anonymous'}

Now provide your complete forensic verification analysis in the JSON format specified.`;

  // ── Call Groq with unified prompt ──
  console.log(`[AEGIS AI] Sending to Groq (TEXT ONLY — utilizing Roboflow CLIP output)...`);

  const fallbackResult = {
    overallScore: 0.5,
    classification: 'needs_verification' as const,
    breakdown: {
      gpsValidation: 0.5,
      timestampCheck: 0.5,
      weatherConsistency: 0.5,
      satelliteCorrelation: 0.5,
      imageAnalysis: 0.4,
      metadataAnalysis: 0.5,
    },
    flags: ['AI_VERIFICATION_FALLBACK'],
    reasoning: 'AI verification engine returned a fallback response. The Groq API may be unavailable or the API key may be invalid. Manual review is recommended.',
    imageDescription: 'Unable to analyze — AI service unavailable.',
    stepDetails: {
      gps: 'GPS validation could not be completed by AI.',
      timestamp: 'Timestamp analysis could not be completed by AI.',
      weather: 'Weather consistency check could not be completed by AI.',
      satellite: 'Satellite correlation could not be completed by AI.',
      image: 'Image analysis could not be completed by AI.',
      metadata: 'Metadata analysis could not be completed by AI.',
    },
  };

  const groqResult = await askGroqJSON<typeof fallbackResult>(
    systemPrompt,
    userPrompt,
    fallbackResult,
    undefined // Force Groq to use text model since Roboflow CLIP already processed the image
  );

  console.log(`[AEGIS AI] Groq response received!`);
  console.log(`  Overall Score: ${groqResult.overallScore}`);
  console.log(`  Classification: ${groqResult.classification}`);
  console.log(`  Flags: [${groqResult.flags.join(', ')}]`);

  // ── Normalize and clamp scores ──
  const clamp = (v: number) => Math.max(0, Math.min(1, Number(v) || 0));
  const breakdown = {
    timestampCheck: clamp(groqResult.breakdown?.timestampCheck ?? 0.5),
    gpsValidation: clamp(groqResult.breakdown?.gpsValidation ?? 0.5),
    weatherConsistency: clamp(groqResult.breakdown?.weatherConsistency ?? 0.5),
    satelliteCorrelation: clamp(groqResult.breakdown?.satelliteCorrelation ?? 0.5),
    aiContentAnalysis: clamp(groqResult.breakdown?.imageAnalysis ?? 0.4),
    metadataAnalysis: clamp(groqResult.breakdown?.metadataAnalysis ?? 0.5),
  };
  const overallScore = clamp(groqResult.overallScore ?? 0.5);

  // Classify
  let classification: CredibilityClassification = 'needs_verification';
  if (overallScore >= 0.80) classification = 'highly_reliable';
  else if (overallScore >= 0.65) classification = 'likely_true';
  else if (overallScore < 0.40) classification = 'suspicious';

  const flags = Array.isArray(groqResult.flags) ? groqResult.flags : [];
  const reasoning = typeof groqResult.reasoning === 'string' ? groqResult.reasoning : 'No reasoning provided by AI.';

  // ── Build detailed forensic report string ──
  const stepDetails = groqResult.stepDetails || {};
  const detailedReport = [
    `╔══════════════════════════════════════════════════════════════╗`,
    `║           AEGIS AI — VERIFICATION FORENSIC REPORT          ║`,
    `╚══════════════════════════════════════════════════════════════╝`,
    ``,
    `REPORT: ${report.type.toUpperCase()} — ${report.severity} severity`,
    `OVERALL CREDIBILITY SCORE: ${(overallScore * 100).toFixed(1)}% (${classification.toUpperCase()})`,
    ``,
    `━━━ STEP 1: GPS VALIDATION ━━━ Score: ${(breakdown.gpsValidation * 100).toFixed(1)}%`,
    stepDetails.gps || 'No GPS analysis available.',
    ``,
    `━━━ STEP 2: TIMESTAMP ANALYSIS ━━━ Score: ${(breakdown.timestampCheck * 100).toFixed(1)}%`,
    stepDetails.timestamp || 'No timestamp analysis available.',
    ``,
    `━━━ STEP 3: WEATHER CONSISTENCY ━━━ Score: ${(breakdown.weatherConsistency * 100).toFixed(1)}%`,
    stepDetails.weather || 'No weather analysis available.',
    ``,
    `━━━ STEP 4: SATELLITE CORRELATION ━━━ Score: ${(breakdown.satelliteCorrelation * 100).toFixed(1)}%`,
    stepDetails.satellite || 'No satellite analysis available.',
    ``,
    `━━━ STEP 5: IMAGE/MEDIA ANALYSIS ━━━ Score: ${(breakdown.aiContentAnalysis * 100).toFixed(1)}%`,
    `Image: ${groqResult.imageDescription || 'No description.'}`,
    stepDetails.image || 'No image analysis available.',
    ``,
    `━━━ STEP 6: METADATA ANALYSIS ━━━ Score: ${(breakdown.metadataAnalysis * 100).toFixed(1)}%`,
    stepDetails.metadata || 'No metadata analysis available.',
    ``,
    `━━━ FLAGS RAISED ━━━`,
    flags.length > 0 ? flags.map(f => `  🚩 ${f}`).join('\n') : '  ✅ No flags raised.',
    ``,
    `━━━ AI FORENSIC SUMMARY ━━━`,
    reasoning,
  ].join('\n');

  const result: VerificationResult = {
    score: Number(overallScore.toFixed(2)),
    classification,
    reasoning,
    flags,
    breakdown,
    detailedReport,
  };

  // ── Save verification scores to DB ──
  await VerificationScore.create({
    reportId: report._id,
    timestampCheck: breakdown.timestampCheck,
    gpsValidation: breakdown.gpsValidation,
    weatherConsistency: breakdown.weatherConsistency,
    satelliteCorrelation: breakdown.satelliteCorrelation,
    aiImageAnalysis: breakdown.aiContentAnalysis,
    aiContentAnalysis: breakdown.metadataAnalysis,
    overallScore: result.score,
    classification: result.classification,
    reasoning: result.reasoning,
    flags: result.flags,
  });

  // ── Link to existing incident or create new one ──
  const nearbyIncidents = await findNearbyIncidents(lat, lng, report.type, 10000);
  const matchedIncident = nearbyIncidents[0];

  if (result.classification === 'highly_reliable' || result.classification === 'likely_true') {
    report.verificationStatus = 'verified';
  } else if (result.classification === 'suspicious') {
    report.verificationStatus = 'rejected';
  } else {
    report.verificationStatus = 'pending';
  }

  report.credibilityScore = result.score;
  report.credibilityClassification = result.classification;

  if (matchedIncident) {
    report.incidentId = matchedIncident._id as mongoose.Types.ObjectId;
    if (result.classification === 'highly_reliable' || result.classification === 'likely_true') {
      await calculateSpreadPrediction(matchedIncident, lat, lng);
    }
  } else if (result.classification === 'highly_reliable') {
    // Escalate to new Incident
    const newIncident = await Incident.create({
      title: `${report.type.toUpperCase()} — Citizen Reported (AI Verified)`,
      type: report.type,
      severity: report.severity,
      status: 'active',
      location: report.location,
      description: report.description,
      credibilityScore: result.score,
      source: 'citizen_report',
      sourceId: report._id.toString(),
      mediaUrls: report.mediaUrls,
    });
    report.incidentId = newIncident._id as mongoose.Types.ObjectId;
    await calculateSpreadPrediction(newIncident, lat, lng);
  }

  // ── Create Alert for verified reports ──
  if (result.classification === 'highly_reliable') {
    try {
      await Alert.create({
        type: report.type,
        severity: report.severity,
        title: `⚠️ VERIFIED: ${report.type.toUpperCase()} reported by citizen`,
        message: `AI-verified with ${(result.score * 100).toFixed(0)}% credibility. Location: [${lat.toFixed(4)}, ${lng.toFixed(4)}]. ${report.description?.substring(0, 150) || ''}`,
        source: 'aegis_ai_verification',
        affectedRegion: report.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        instructions: `Auto-generated after AI verification. Classification: ${result.classification}. Score: ${(result.score * 100).toFixed(0)}%.`,
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      console.log(`[AEGIS AI] Alert created for verified report ${report._id}`);
    } catch (alertErr) {
      console.error('[AEGIS AI] Failed to create alert:', alertErr);
    }
  }

  // ── Store detailed analysis on the report ──
  report.aiAnalysisResults = {
    contentAnalysis: detailedReport,
    flags: result.flags,
  };
  await report.save();

  console.log(`[AEGIS AI] ✅ Verification complete: Score=${result.score}, Classification=${result.classification}`);
  console.log(`${'='.repeat(70)}\n`);

  return result;
}

// =============================================
// HELPERS
// =============================================

async function findNearbyIncidents(lat: number, lng: number, type?: string, maxDistMeters = 10000) {
  const query: any = {
    status: { $in: ['active', 'monitoring'] },
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: maxDistMeters,
      },
    },
  };
  if (type) query.type = type;
  return await Incident.find(query).limit(5);
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
