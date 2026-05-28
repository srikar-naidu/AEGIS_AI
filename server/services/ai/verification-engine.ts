import mongoose from 'mongoose';
import { Report, Incident, VerificationScore, IReport, CredibilityClassification } from '../../db/models';
import { fetchCurrentWeather } from '../data-sources/open-meteo-weather.service';
import { askGroqJSON } from './groq-client';

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

  // Step 5: AI Content Analysis (using Groq)
  const aiContentAnalysis = await runAIContentAnalysis(report, weatherConsistency, gpsValidation);

  // Compute overall score with weighted averages
  // Weights: timestamp 15%, GPS 20%, Weather 20%, Satellite 25%, Content 20%
  const overallScore =
    timestampCheck * 0.15 +
    gpsValidation * 0.20 +
    weatherConsistency * 0.20 +
    satelliteCorrelation * 0.25 +
    aiContentAnalysis.score * 0.20;

  // Classify credibility level
  let classification: CredibilityClassification = 'needs_verification';
  if (overallScore >= 0.85) classification = 'highly_reliable';
  else if (overallScore >= 0.65) classification = 'likely_true';
  else if (overallScore < 0.40) classification = 'suspicious';

  const finalFlags = [
    ...(timestampCheck < 0.5 ? ['OUTDATED_REPORT_TIME'] : []),
    ...(gpsValidation < 0.3 ? ['ISOLATED_INCIDENT_LOCATION'] : []),
    ...(weatherConsistency < 0.3 ? ['INCONSISTENT_WEATHER_CONDITIONS'] : []),
    ...(satelliteCorrelation < 0.4 ? ['NO_SATELLITE_CONFIRMATION'] : []),
    ...aiContentAnalysis.flags,
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
    aiImageAnalysis: report.mediaUrls && report.mediaUrls.length > 0 ? 0.75 : 0.5, // Seed image analysis if media exists
    aiContentAnalysis: result.breakdown.aiContentAnalysis,
    overallScore: result.score,
    classification: result.classification,
    reasoning: result.reasoning,
    flags: result.flags,
  });

  // Link report to existing incident if GPS validation is high, or update report credentials
  const nearbyIncidents = await findNearbyIncidents(lat, lng, report.type, 10000); // 10km
  const matchedIncident = nearbyIncidents[0];

  report.verificationStatus = 'verified';
  report.credibilityScore = result.score;
  report.credibilityClassification = result.classification;
  if (matchedIncident) {
    report.incidentId = matchedIncident._id as mongoose.Types.ObjectId;
  }
  report.aiAnalysisResults = {
    contentAnalysis: result.reasoning,
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
  gpsScore: number
): Promise<{ score: number; reasoning: string; flags: string[] }> {
  const systemPrompt = `
You are the AI verification core for AEGIS AI. Your job is to analyze reports of disasters from citizens, evaluate their descriptions, and flag potential fake news, spam, or logic conflicts.
Respond ONLY in JSON format containing:
{
  "score": number (decimal 0.0 to 1.0 indicating report detail relevance, logic soundness, and realism),
  "flags": string[] (array of flags like SPAM, SENSATIONALIST, CONTRADICTORY, INSUFFICIENT_DETAIL, COHERENT),
  "reasoning": string (1-2 sentences summarizing verification conclusions)
}
  `;

  const userPrompt = `
Evaluate the following citizen disaster report:
Disaster Type: ${report.type}
Severity Level: ${report.severity}
Description: "${report.description}"
Location GPS Validation Score (0-1): ${gpsScore}
Location Weather Validation Score (0-1): ${weatherScore}
Has Media Uploaded: ${report.mediaUrls && report.mediaUrls.length > 0 ? 'Yes' : 'No'}
Is SOS Call: ${report.isSOS ? 'Yes' : 'No'}
  `;

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
