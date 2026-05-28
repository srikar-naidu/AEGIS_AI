import mongoose from 'mongoose';
import { Report, Incident, Alert, VerificationScore, IReport, CredibilityClassification } from '../../db/models';
import { fetchCurrentWeather } from '../data-sources/open-meteo-weather.service';
import { askGroqJSON } from './groq-client';
import { analyzeImage } from './vision-engine';
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
  };
}

/**
 * Runs the full 5-step verification pipeline on a citizen report
 */
export async function verifyReport(reportId: string | mongoose.Types.ObjectId): Promise<VerificationResult> {
  const report = await Report.findById(reportId);
  if (!report) {
    throw new Error(`Report not found: ${reportId}`);
  }

  console.log(`[Verification Engine] Starting verification for Report ID: ${report._id} (${report.type})`);

  // Update report status
  report.verificationStatus = 'in_progress';
  await report.save();

  const [lng, lat] = report.location.coordinates;

  // Step 1: Timestamp check
  const timestampCheck = runTimestampCheck(report);

  // Step 2: GPS Validation (proximity to existing incidents or locations)
  const gpsValidation = await runGPSValidation(report, lat, lng);

  // Step 3: Weather Consistency
  const weatherConsistency = await runWeatherConsistency(report, lat, lng);

  // Step 4: Satellite Correlation (NASA/USGS events within 50km in last 48 hours)
  const satelliteCorrelation = await runSatelliteCorrelation(report, lat, lng);

  // Step 5: Sentinel Vision AI (Groq Vision) if media is present
  let aiImageAnalysis = 0.5; // neutral fallback
  let visionFlags: string[] = [];
  let visionRawAnalysis = 'No media uploaded for vision analysis.';
  if (report.mediaUrls && report.mediaUrls.length > 0) {
    const visionResult = await analyzeImage(report.mediaUrls[0]);
    aiImageAnalysis = visionResult.confidence;
    visionFlags = visionResult.tags;
    visionRawAnalysis = visionResult.rawAnalysis || 'Vision analysis completed.';
    console.log(`[Verification Engine] Vision AI: confidence=${aiImageAnalysis}, tags=[${visionFlags.join(', ')}]`);
  }

  // Step 6: AI Content Analysis (using Groq LLM) - Cross-references vision tags
  const aiContentAnalysis = await runAIContentAnalysis(report, weatherConsistency, gpsValidation, visionFlags);

  // Compute overall score with weighted averages
  // Weights: timestamp 10%, GPS 20%, Weather 15%, Satellite 20%, Content 20%, Vision 15%
  const overallScore =
    timestampCheck * 0.10 +
    gpsValidation * 0.20 +
    weatherConsistency * 0.15 +
    satelliteCorrelation * 0.20 +
    aiContentAnalysis.score * 0.20 +
    aiImageAnalysis * 0.15;

  // Classify credibility level
  let classification: CredibilityClassification = 'needs_verification';
  if (overallScore >= 0.80) classification = 'highly_reliable';
  else if (overallScore >= 0.65) classification = 'likely_true';
  else if (overallScore < 0.40) classification = 'suspicious';

  const finalFlags = [
    ...(timestampCheck < 0.5 ? ['OUTDATED_REPORT_TIME'] : []),
    ...(gpsValidation < 0.3 ? ['ISOLATED_INCIDENT_LOCATION'] : []),
    ...(weatherConsistency < 0.3 ? ['INCONSISTENT_WEATHER_CONDITIONS'] : []),
    ...(satelliteCorrelation < 0.4 ? ['NO_SATELLITE_CONFIRMATION'] : []),
    ...aiContentAnalysis.flags,
    ...visionFlags,
  ];

  const result: VerificationResult = {
    score: Number(overallScore.toFixed(2)),
    classification,
    reasoning: aiContentAnalysis.reasoning,
    flags: finalFlags,
    breakdown: {
      timestampCheck: Number(timestampCheck.toFixed(2)),
      gpsValidation: Number(gpsValidation.toFixed(2)),
      weatherConsistency: Number(weatherConsistency.toFixed(2)),
      satelliteCorrelation: Number(satelliteCorrelation.toFixed(2)),
      aiContentAnalysis: Number(aiContentAnalysis.score.toFixed(2)),
    },
  };

  // Save the verification scores to DB
  await VerificationScore.create({
    reportId: report._id,
    timestampCheck: result.breakdown.timestampCheck,
    gpsValidation: result.breakdown.gpsValidation,
    weatherConsistency: result.breakdown.weatherConsistency,
    satelliteCorrelation: result.breakdown.satelliteCorrelation,
    aiImageAnalysis,
    aiContentAnalysis: result.breakdown.aiContentAnalysis,
    overallScore: result.score,
    classification: result.classification,
    reasoning: result.reasoning,
    flags: result.flags,
  });

  // Link report to existing incident if GPS validation is high, or update report credentials
  const nearbyIncidents = await findNearbyIncidents(lat, lng, report.type, 10000); // 10km
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
    
    // Trigger Spread Prediction if it's a verifiable existing incident
    if (result.classification === 'highly_reliable' || result.classification === 'likely_true') {
      await calculateSpreadPrediction(matchedIncident, lat, lng);
    }
  } else if (result.classification === 'highly_reliable') {
    // Escalate to new Incident
    const newIncident = await Incident.create({
      title: `${report.type.toUpperCase()} - Citizen Reported`,
      type: report.type,
      severity: report.severity,
      status: 'active',
      location: report.location,
      description: report.description,
      credibilityScore: result.score,
      source: 'citizen_report',
      sourceId: report._id.toString(),
      mediaUrls: report.mediaUrls
    });
    report.incidentId = newIncident._id as mongoose.Types.ObjectId;
    await calculateSpreadPrediction(newIncident, lat, lng);
  }

  // Create an Alert for highly reliable verified reports so they appear in the Alerts Feed
  if (result.classification === 'highly_reliable') {
    try {
      await Alert.create({
        type: report.type,
        severity: report.severity,
        title: `⚠️ VERIFIED: ${report.type.toUpperCase()} reported by citizen`,
        message: `A citizen report for ${report.type} has been AI-verified with a credibility score of ${(result.score * 100).toFixed(0)}%. Location: [${lat.toFixed(4)}, ${lng.toFixed(4)}]. ${report.description?.substring(0, 150) || ''}`,
        source: 'aegis_ai_verification',
        affectedRegion: report.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        instructions: `This alert was automatically generated after AI verification confirmed the report. Credibility: ${result.classification}. Score: ${(result.score * 100).toFixed(0)}%.`,
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires in 24 hours
      });
      console.log(`[Verification Engine] Alert created for verified report ${report._id}`);
    } catch (alertErr) {
      console.error('[Verification Engine] Failed to create alert:', alertErr);
    }
  }
  
  // Store detailed step-by-step analysis results
  report.aiAnalysisResults = {
    contentAnalysis: [
      `=== VERIFICATION SUMMARY ==="`,
      `Overall Credibility Score: ${(result.score * 100).toFixed(1)}% (${result.classification})`,
      ``,
      `--- Step 1: Timestamp Validation ---`,
      `Score: ${(result.breakdown.timestampCheck * 100).toFixed(1)}%`,
      `Analysis: Report age evaluated. ${result.breakdown.timestampCheck >= 0.9 ? 'Report is very fresh (within 1 hour) — highly credible timing.' : result.breakdown.timestampCheck >= 0.7 ? 'Report submitted within last 24 hours — acceptable timing.' : 'Report is older — reduced timestamp credibility.'}`,
      ``,
      `--- Step 2: GPS Validation ---`,
      `Score: ${(result.breakdown.gpsValidation * 100).toFixed(1)}%`,
      `Analysis: ${result.breakdown.gpsValidation >= 0.8 ? 'Location matches or is near existing verified incidents — strong spatial correlation.' : result.breakdown.gpsValidation >= 0.5 ? 'Location is in a general area of activity but not confirmed.' : 'Isolated location — no nearby incidents corroborate this report.'}`,
      ``,
      `--- Step 3: Weather Consistency ---`,
      `Score: ${(result.breakdown.weatherConsistency * 100).toFixed(1)}%`,
      `Analysis: ${result.breakdown.weatherConsistency >= 0.7 ? 'Current weather conditions are consistent with the reported disaster type.' : result.breakdown.weatherConsistency >= 0.4 ? 'Weather conditions partially align with the disaster type.' : 'Weather conditions CONTRADICT the reported disaster type — suspicious.'}`,
      ``,
      `--- Step 4: Satellite Correlation ---`,
      `Score: ${(result.breakdown.satelliteCorrelation * 100).toFixed(1)}%`,
      `Analysis: ${result.breakdown.satelliteCorrelation >= 0.7 ? 'Satellite/agency data (NASA, USGS, GDACS) confirms activity in this region.' : result.breakdown.satelliteCorrelation >= 0.4 ? 'Some satellite data available but not a direct match.' : 'No satellite or agency confirmation found for this disaster in the area.'}`,
      ``,
      `--- Step 5: Vision AI Image Analysis ---`,
      `Score: ${(aiImageAnalysis * 100).toFixed(1)}%`,
      `Tags: ${visionFlags.length > 0 ? visionFlags.join(', ') : 'N/A'}`,
      `Analysis: ${visionRawAnalysis}`,
      ``,
      `--- Step 6: AI Content Analysis (LLM) ---`,
      `Score: ${(result.breakdown.aiContentAnalysis * 100).toFixed(1)}%`,
      `Analysis: ${result.reasoning}`,
      ``,
      `--- Flags ---`,
      result.flags.length > 0 ? result.flags.join(', ') : 'No flags raised.',
    ].join('\n'),
    flags: result.flags,
  };
  await report.save();

  console.log(`[Verification Engine] Complete: Score=${result.score}, Credibility=${result.classification}`);
  return result;
}

/**
 * Step 1: Timestamp check
 * Fresh reports are highly credited. Outdated reports are discounted.
 */
function runTimestampCheck(report: IReport): number {
  const ageInMs = Date.now() - report.createdAt.getTime();
  const ageInHours = ageInMs / (1000 * 60 * 60);

  if (ageInHours <= 1) return 1.0;
  if (ageInHours <= 6) return 0.9;
  if (ageInHours <= 24) return 0.7;
  if (ageInHours <= 48) return 0.5;
  return Math.max(0.1, 1 - ageInHours / 168); // Decay over 1 week
}

/**
 * Step 2: GPS Validation
 * Validates report location against other reports and registered danger zones.
 */
async function runGPSValidation(report: IReport, lat: number, lng: number): Promise<number> {
  // Check if coordinates lie inside any active danger zone (represented as polygons)
  const intersectingIncidents = await Incident.find({
    status: { $in: ['active', 'monitoring'] },
    dangerZone: {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
      },
    },
  });

  if (intersectingIncidents.length > 0) {
    return 1.0; // Directly inside a designated evacuation / danger zone
  }

  // Find other incidents of the same type within 15km
  const nearbySameType = await findNearbyIncidents(lat, lng, report.type, 15000);
  if (nearbySameType.length > 0) {
    const closestDistance = getDistanceMeters(lat, lng, nearbySameType[0].location.coordinates[1], nearbySameType[0].location.coordinates[0]);
    if (closestDistance < 2000) return 0.95; // Within 2km of existing report
    if (closestDistance < 5000) return 0.8;  // Within 5km
    return 0.6; // Within 15km
  }

  // Find any general incidents within 5km
  const nearbyAny = await findNearbyIncidents(lat, lng, undefined, 5000);
  if (nearbyAny.length > 0) {
    return 0.5;
  }

  return 0.3; // Isolated incident report
}

/**
 * Step 3: Weather Consistency
 * Checks if current weather parameters match the disaster type
 */
async function runWeatherConsistency(report: IReport, lat: number, lng: number): Promise<number> {
  const weather = await fetchCurrentWeather(lat, lng);
  if (!weather) return 0.5; // Neutral weight if weather service is offline

  const current = weather.current;
  const temp = current.temperature_2m;
  const rain = current.precipitation;
  const wind = current.wind_speed_10m;
  const snow = current.snowfall;

  switch (report.type) {
    case 'wildfire':
      // Wildfires thrive in dry, warm, and windy weather
      if (temp > 25 && rain === 0) return 0.95;
      if (temp > 15 && rain < 1) return 0.75;
      if (rain > 10) return 0.1; // Highly unlikely to have wildfire during heavy rain
      break;

    case 'flood':
      // Floods need heavy rain/precipitation
      if (rain > 10 || current.weather_code === 65 || current.weather_code === 82) return 0.95;
      if (rain > 2) return 0.7;
      if (temp < 0 && snow > 5) return 0.8; // Snowmelt / freezing rain flood
      return 0.4; // Can happen due to river bursting, but immediate precipitation is low

    case 'blizzard':
      if (temp <= 0 && (snow > 2 || current.weather_code >= 71)) return 0.95;
      if (temp > 5) return 0.05; // Blizzard above 5C is physically impossible
      break;

    case 'heatwave':
      if (temp > 40) return 0.95;
      if (temp > 32) return 0.75;
      return 0.2;

    case 'cyclone':
      if (wind > 60) return 0.95;
      if (wind > 35) return 0.75;
      return 0.3;

    case 'earthquake':
    case 'volcano':
    case 'tsunami':
      return 0.8; // Geological events are independent of weather

    default:
      return 0.6;
  }

  return 0.5;
}

/**
 * Step 4: Satellite Correlation
 * Check if trusted global agencies (NASA, USGS, GDACS) have detected events within 50km
 */
async function runSatelliteCorrelation(report: IReport, lat: number, lng: number): Promise<number> {
  const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000); // Last 48 hrs

  const matches = await Incident.find({
    type: report.type,
    source: { $in: ['usgs', 'nasa_firms', 'nasa_eonet', 'gdacs', 'reliefweb'] },
    createdAt: { $gte: cutoffTime },
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        $maxDistance: 50000, // 50km
      },
    },
  });

  if (matches.length > 0) {
    const closest = matches[0];
    const dist = getDistanceMeters(lat, lng, closest.location.coordinates[1], closest.location.coordinates[0]);
    if (dist < 10000) return 1.0; // satellite confirm within 10km
    if (dist < 25000) return 0.85; // within 25km
    return 0.7; // within 50km
  }

  return 0.3; // No satellite detection matching this disaster nearby
}

/**
 * Step 5: AI Content Analysis
 * Uses Groq to read description and cross-reference variables, assessing logic & potential spam
 */
async function runAIContentAnalysis(
  report: IReport,
  weatherScore: number,
  gpsScore: number,
  visionTags: string[]
): Promise<{ score: number; reasoning: string; flags: string[] }> {
  const systemPrompt = `You are the STRICT AI verification core for AEGIS AI — a disaster management platform. Your job is to rigorously analyze citizen disaster reports and flag ANY inconsistencies, fake data, or contradictions.

CRITICAL RULES:
1. CROSS-REFERENCE the declared Disaster Type with the Vision Tags. The Vision Tags tell you what our computer vision AI ACTUALLY SEES in the uploaded image. If the user says "drought" but the image tags include "flood", "water", "submerged" — this is a BLATANT CONTRADICTION. Score MUST be below 0.15.
2. If Vision Tags include "AI_GENERATED_IMAGE", "unnatural_smoothness", "distorted_objects", or similar AI artifact indicators — the image is FAKE. Score MUST be below 0.10 and you MUST flag FAKE_MEDIA_DETECTED.
3. If the description is vague, generic, or doesn't match the disaster type — penalize heavily.
4. If weather validation score is very low (< 0.3), it means current weather CONTRADICTS the disaster type — factor this in.
5. If GPS validation is very low (< 0.3), the location is isolated with no corroborating reports.

Scoring guidelines:
- 0.90-1.00: Everything aligns perfectly — description, image, weather, location all consistent
- 0.70-0.89: Mostly consistent with minor concerns
- 0.40-0.69: Significant concerns or missing data
- 0.15-0.39: Major contradictions detected
- 0.00-0.14: Clearly fake, AI-generated image, or completely contradictory data

Respond ONLY in valid JSON:
{
  "score": number (0.0 to 1.0),
  "flags": string[] (from: SPAM, SENSATIONALIST, CONTRADICTORY, INSUFFICIENT_DETAIL, COHERENT, FAKE_MEDIA_DETECTED, IMAGE_DISASTER_MISMATCH, WEATHER_MISMATCH, LOCATION_UNVERIFIED, AI_GENERATED_CONTENT),
  "reasoning": string (DETAILED 3-5 sentence analysis. MUST explicitly state what the image shows vs what was reported. MUST explain any contradictions found. MUST mention if image appears AI-generated.)
}`;

  const userPrompt = `Rigorously evaluate this citizen disaster report for authenticity:

== REPORT DATA ==
Disaster Type Claimed: ${report.type}
Severity Level Claimed: ${report.severity}
Description: "${report.description}"

== VALIDATION SCORES FROM OTHER STEPS ==
GPS Location Validation Score: ${gpsScore.toFixed(2)} (1.0 = confirmed location, 0.3 = isolated/unverified)
Weather Consistency Score: ${weatherScore.toFixed(2)} (1.0 = weather matches disaster type, 0.1 = weather contradicts)

== IMAGE ANALYSIS ==
Has Media Uploaded: ${report.mediaUrls && report.mediaUrls.length > 0 ? 'Yes' : 'No'}
Vision AI Tags (what computer vision ACTUALLY SEES in the image): ${visionTags.length > 0 ? visionTags.join(', ') : 'No image uploaded or analysis unavailable'}

== METADATA ==
Is SOS Emergency Call: ${report.isSOS ? 'Yes' : 'No'}

Based on ALL the above data, provide your score, flags, and detailed reasoning. Pay special attention to any mismatch between the claimed disaster type and what the Vision AI tags show in the image.`;

  const fallback = {
    score: 0.7,
    flags: ['COHERENT'],
    reasoning: 'The description appears consistent and detailed, matching emergency criteria.',
  };

  return await askGroqJSON<{ score: number; flags: string[]; reasoning: string }>(
    systemPrompt,
    userPrompt,
    fallback
  );
}

// Helpers
async function findNearbyIncidents(lat: number, lng: number, type?: string, maxDistMeters = 10000) {
  const query: any = {
    status: { $in: ['active', 'monitoring'] },
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        $maxDistance: maxDistMeters,
      },
    },
  };

  if (type) {
    query.type = type;
  }

  return await Incident.find(query).limit(5);
}

// Haversine formula to find distance in meters
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
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
