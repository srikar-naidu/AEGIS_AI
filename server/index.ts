import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local'), override: true });

import { connectDB } from './db/connection';
import { initJobs } from './jobs/data-poller';
import { Incident, Report, RescueTeam, Shelter, Alert } from './db/models';
import { verifyReport } from './services/ai/verification-engine';
import { fetchOSMResources, fetchReliefWebOrgs } from './services/rescue/aggregation-engine';
import { enrichWithRoutes, generateEvacuationRoutes, HazardZone } from './services/rescue/routing-engine';
import { generatePredictiveIntelligence } from './services/ai/predictive-engine';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a base64 data URI to Cloudinary and return the secure HTTPS URL.
 * If the input is already an HTTPS URL, return it as-is.
 */
async function uploadToCloudinary(dataUri: string): Promise<string> {
  if (dataUri.startsWith('http://') || dataUri.startsWith('https://')) {
    return dataUri; // Already a URL
  }
  try {
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'aegis-reports',
      resource_type: 'auto',
    });
    console.log(`[Cloudinary] Uploaded image: ${result.secure_url}`);
    return result.secure_url;
  } catch (err) {
    console.error('[Cloudinary] Upload failed:', err);
    return dataUri; // Fallback to original
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));

// Create HTTP and Socket.IO Server
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.IO connection event
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Send initial data to client on connect
  sendInitialData(socket);

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });

  socket.on('report:submit', async (reportData) => {
    try {
      console.log('📝 Received new report via WebSocket:', reportData);
      // We will handle report submission and verification trigger here
      io.emit('report:received', reportData);
    } catch (err) {
      console.error('Socket report submission error:', err);
    }
  });
});

async function sendInitialData(socket: any) {
  try {
    const activeIncidents = await Incident.find({ status: { $in: ['active', 'monitoring'] } })
      .sort({ createdAt: -1 })
      .limit(500);

    const activeAlerts = await Alert.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(20);

    const rescueTeams = await RescueTeam.find({});
    const shelters = await Shelter.find({ status: 'open' });

    socket.emit('dashboard:sync', {
      incidents: activeIncidents,
      alerts: activeAlerts,
      rescueTeams,
      shelters,
    });
  } catch (err) {
    console.error('Error fetching initial sync data for socket client:', err);
  }
}

// ============================================
// API Endpoints
// ============================================

// Base checks
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Get all active incidents
app.get('/api/incidents', async (req, res) => {
  try {
    const type = req.query.type as string;
    const severity = req.query.severity as string;

    const query: any = { status: { $in: ['active', 'monitoring'] } };
    if (type) query.type = type;
    if (severity) query.severity = severity;

    const list = await Incident.find(query).sort({ createdAt: -1 }).limit(500);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// Get reports
app.get('/api/reports', async (req, res) => {
  try {
    const list = await Report.find().sort({ createdAt: -1 }).limit(50);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get verification queue
app.get('/api/reports/verification-queue', async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }).limit(50);
    const reportIds = reports.map(r => r._id);
    const scores = await import('./db/models').then(m => m.VerificationScore.find({ reportId: { $in: reportIds } }));
    
    const entries = reports.map(report => {
      const score = scores.find(s => s.reportId.toString() === report._id.toString());
      
      const getStatus = (val: number | undefined) => {
        if (val === undefined) return 'pending';
        if (val > 0.8) return 'pass';
        if (val > 0.4) return 'warning';
        return 'fail';
      };

      const pct = (v: number | undefined) => v !== undefined ? `${(v * 100).toFixed(0)}%` : '—';

      return {
        id: report._id.toString(),
        reportTitle: `${report.type.toUpperCase()} - ${report.severity} Severity`,
        type: report.type,
        submittedBy: report.userId || 'anon',
        submittedAt: report.createdAt.toISOString(),
        status: report.verificationStatus,
        credibilityScore: score?.overallScore || 0,
        reasoning: score?.reasoning || '',
        flags: score?.flags || [],
        detailedReport: report.aiAnalysisResults?.contentAnalysis || '',
        steps: [
          { name: 'GPS Validation', status: getStatus(score?.gpsValidation), detail: `Score: ${pct(score?.gpsValidation)} — Location proximity check` },
          { name: 'Timestamp', status: getStatus(score?.timestampCheck), detail: `Score: ${pct(score?.timestampCheck)} — Report freshness` },
          { name: 'Weather Match', status: getStatus(score?.weatherConsistency), detail: `Score: ${pct(score?.weatherConsistency)} — Live weather vs disaster type` },
          { name: 'Satellite Data', status: getStatus(score?.satelliteCorrelation), detail: `Score: ${pct(score?.satelliteCorrelation)} — NASA/USGS/GDACS correlation` },
          { name: 'Image Analysis', status: getStatus(score?.aiImageAnalysis), detail: `Score: ${pct(score?.aiImageAnalysis)} — Groq Vision AI forensics` },
          { name: 'Metadata Audit', status: getStatus(score?.aiContentAnalysis), detail: `Score: ${pct(score?.aiContentAnalysis)} — Description & content quality` },
        ]
      };
    });
    
    res.json(entries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch verification queue' });
  }
});

// Submit a new citizen report
app.post('/api/reports', async (req, res) => {
  try {
    const { type, severity, location, description, address, mediaUrls, emergencyContact, isSOS, userId } = req.body;

    if (!type || !severity || !location || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Upload any base64 images to Cloudinary to get proper HTTPS URLs
    let processedMediaUrls: string[] = [];
    if (mediaUrls && mediaUrls.length > 0) {
      console.log(`[Report] Uploading ${mediaUrls.length} media file(s) to Cloudinary...`);
      processedMediaUrls = await Promise.all(
        mediaUrls.map((url: string) => uploadToCloudinary(url))
      );
      console.log(`[Report] Cloudinary upload complete. URLs:`, processedMediaUrls.map((u: string) => u.substring(0, 60)));
    }

    const report = await Report.create({
      userId,
      type,
      severity,
      location,
      address,
      description,
      mediaUrls: processedMediaUrls,
      emergencyContact,
      isSOS: isSOS || false,
      verificationStatus: 'pending',
    });
    // Broadcast new report to dashboard instantly
    io.emit('report:new', report);

    // Trigger AI Verification pipeline asynchronously
    verifyReport(report._id as string)
      .then(async (verificationResult) => {
        io.emit('report:verified', {
          reportId: report._id,
          result: verificationResult,
        });

        // If verification created a new alert, broadcast it
        if (verificationResult.classification === 'highly_reliable') {
          const latestAlerts = await Alert.find({ isActive: true }).sort({ createdAt: -1 }).limit(20);
          io.emit('alerts:update', latestAlerts);
          
          // Also refresh incidents for dashboard
          const activeIncidents = await Incident.find({ status: { $in: ['active', 'monitoring'] } })
            .sort({ createdAt: -1 })
            .limit(100);
          io.emit('incidents:live', activeIncidents);
        }
      })
      .catch((err) => {
        console.error(`AI verification failed for report ${report._id}:`, err);
      });

    res.status(201).json({ success: true, report });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Get alerts
app.get('/api/alerts', async (req, res) => {
  try {
    const list = await Alert.find({ isActive: true }).sort({ createdAt: -1 }).limit(20);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Create alert (Admin only)
app.post('/api/alerts', async (req, res) => {
  try {
    const { type, severity, title, message, source, affectedArea, affectedRegion, instructions, expiresAt } = req.body;

    const alert = await Alert.create({
      type,
      severity,
      title,
      message,
      source: source || 'AEGIS Command Center',
      affectedArea,
      affectedRegion,
      instructions,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    io.emit('alert:new', alert);
    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// Get rescue teams
app.get('/api/rescue-teams', async (req, res) => {
  try {
    const list = await RescueTeam.find();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rescue teams' });
  }
});

// Get real-time aggregated emergency resources
app.get('/api/rescue/resources', async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const searchRadius = radius ? parseInt(radius as string) : 10000;

    const [osmResources, reliefWebOrgs] = await Promise.all([
      fetchOSMResources(latitude, longitude, searchRadius),
      fetchReliefWebOrgs(latitude, longitude),
    ]);

    let combined = [...osmResources, ...reliefWebOrgs];
    combined = await enrichWithRoutes(latitude, longitude, combined);

    res.json(combined);
  } catch (error) {
    console.error('Error in /api/rescue/resources:', error);
    res.status(500).json({ error: 'Failed to fetch emergency resources' });
  }
});

// Generate safe evacuation routes with hazard avoidance
app.get('/api/rescue/evacuation-routes', async (req, res) => {
  try {
    const { lat, lng, radius, topN } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const searchRadius = radius ? parseInt(radius as string) : 10000;
    const top = topN ? parseInt(topN as string) : 5;

    // 1. Fetch resources from OSM
    const osmResources = await fetchOSMResources(latitude, longitude, searchRadius);

    if (osmResources.length === 0) {
      return res.json({ routes: [], message: 'No verified emergency resource available from connected data sources.' });
    }

    // 2. Fetch active hazard zones from database (Incidents with dangerZone polygons + Alerts with affectedArea)
    const hazardZones: HazardZone[] = [];

    const activeIncidents = await Incident.find({
      status: { $in: ['active', 'monitoring'] },
      dangerZone: { $exists: true, $ne: null },
    }).lean();

    activeIncidents.forEach((inc: any) => {
      if (inc.dangerZone && inc.dangerZone.coordinates) {
        hazardZones.push({
          id: inc._id.toString(),
          type: inc.type || 'hazard',
          polygon: inc.dangerZone.coordinates,
          source: 'incident',
        });
      }
    });

    const activeAlerts = await Alert.find({
      isActive: true,
      affectedArea: { $exists: true, $ne: null },
    }).lean();

    activeAlerts.forEach((alert: any) => {
      if (alert.affectedArea && alert.affectedArea.coordinates) {
        hazardZones.push({
          id: alert._id.toString(),
          type: alert.type || 'hazard',
          polygon: alert.affectedArea.coordinates,
          source: 'alert',
        });
      }
    });

    console.log(`[RescueOps] Evacuation: ${osmResources.length} resources, ${hazardZones.length} hazard zones`);

    // 3. Generate scored evacuation routes
    const routes = await generateEvacuationRoutes(latitude, longitude, osmResources, hazardZones, top);

    if (routes.length === 0) {
      return res.json({ routes: [], message: 'No verified safe evacuation route available. Manual coordination required.' });
    }

    res.json({ routes, hazardZoneCount: hazardZones.length });
  } catch (error) {
    console.error('Error in /api/rescue/evacuation-routes:', error);
    res.status(500).json({ error: 'Failed to generate evacuation routes' });
  }
});

// Get shelters
app.get('/api/shelters', async (req, res) => {
  try {
    const list = await Shelter.find({ status: { $ne: 'closed' } });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shelters' });
  }
});

// Get predictive intelligence forecast
app.get('/api/predictive/forecast', async (req, res) => {
  try {
    const lat = req.query.lat as string;
    const lng = req.query.lng as string;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng parameters are required' });
    }
    
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const forecast = await generatePredictiveIntelligence(latitude, longitude);
    
    res.json(forecast);
  } catch (error) {
    console.error('Error generating predictive forecast:', error);
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
});

// Get weather for location
app.get('/api/weather', async (req, res) => {
  try {
    const lat = req.query.lat as string;
    const lon = req.query.lon as string;
    if (!lat || !lon) return res.status(400).json({ error: 'Missing lat/lon' });

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code`
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

// Trigger full ingest job manually (Admin endpoint)
app.post('/api/admin/ingest', async (req, res) => {
  try {
    const { runAllJobs } = require('./jobs/data-poller');
    runAllJobs();
    res.json({ success: true, message: 'Ingest jobs started' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start ingestion jobs' });
  }
});

// Start Express Server
async function startServer() {
  try {
    try {
      await connectDB();
      // Start cron background polling only if DB connected successfully
      initJobs(io);
    } catch (dbError) {
      console.error('⚠️ Failed to connect to MongoDB. Starting server in degraded mode. Please check your network or IP Whitelist in Atlas.');
      console.error(dbError);
    }

    httpServer.listen(PORT, () => {
      console.log(`🚀 Realtime Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
export { io };
