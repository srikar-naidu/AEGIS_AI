import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

import { connectDB } from './db/connection';
import { initJobs } from './jobs/data-poller';
import { Incident, Report, RescueTeam, Shelter, Alert } from './db/models';
import { verifyReport } from './services/ai/verification-engine';

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
      .limit(100);

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

    const list = await Incident.find(query).sort({ createdAt: -1 }).limit(100);
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

      return {
        id: report._id.toString(),
        reportTitle: `${report.type.toUpperCase()} - ${report.severity} Severity`,
        type: report.type,
        submittedBy: report.userId || 'anon',
        submittedAt: report.createdAt.toISOString(),
        status: report.verificationStatus,
        credibilityScore: score?.overallScore || 0,
        steps: [
          { name: 'Temporal Analysis', status: getStatus(score?.timestampCheck), detail: 'Freshness Check' },
          { name: 'Geospatial Check', status: getStatus(score?.gpsValidation), detail: 'Proximity Check' },
          { name: 'Meteorological Validation', status: getStatus(score?.weatherConsistency), detail: 'Weather Check' },
          { name: 'Satellite Correlation', status: getStatus(score?.satelliteCorrelation), detail: 'Global Agency Data' },
          { name: 'Sentinel Vision AI', status: getStatus(score?.aiImageAnalysis), detail: 'Roboflow Damage Check' },
          { name: 'LLM Logic Audit', status: getStatus(score?.aiContentAnalysis), detail: score?.reasoning || 'Groq AI Audit' },
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

    const report = await Report.create({
      userId,
      type,
      severity,
      location,
      address,
      description,
      mediaUrls,
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

// Get shelters
app.get('/api/shelters', async (req, res) => {
  try {
    const list = await Shelter.find({ status: { $ne: 'closed' } });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shelters' });
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
