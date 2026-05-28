import cron from 'node-cron';
import { connectDB } from '../db/connection';
import { Incident, IIncident } from '../db/models';
import { fetchRecentEarthquakes, normalizeEarthquake } from '../services/data-sources/usgs.service';
import { fetchNaturalEvents, normalizeEONETEvent } from '../services/data-sources/nasa-eonet.service';
import { fetchActiveFiresCsv, normalizeFireHotspot } from '../services/data-sources/nasa-firms.service';
import { fetchGDACSEvents, normalizeGDACSEvent } from '../services/data-sources/gdacs.service';
import { fetchReliefWebDisasters, normalizeReliefWebDisaster } from '../services/data-sources/reliefweb.service';

let ioInstance: any = null;

export function initJobs(io: any) {
  ioInstance = io;

  // Run initial poll 5 seconds after startup
  setTimeout(() => {
    console.log('🔄 Running initial disaster feeds ingestion...');
    runAllJobs();
  }, 5000);

  // USGS Earthquakes - every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    console.log('⏱️ Scheduled Job: USGS Earthquakes polling...');
    await pollEarthquakes();
  });

  // NASA FIRMS Fire Hotspots - every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    console.log('⏱️ Scheduled Job: NASA FIRMS fires polling...');
    await pollFires();
  });

  // GDACS Alerts - every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('⏱️ Scheduled Job: GDACS alerts polling...');
    await pollGDACS();
  });

  // NASA EONET events - every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('⏱️ Scheduled Job: NASA EONET polling...');
    await pollEONET();
  });

  // ReliefWeb - every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('⏱️ Scheduled Job: ReliefWeb disasters polling...');
    await pollReliefWeb();
  });

  console.log('⏱️ Background cron jobs scheduled successfully');
}

export async function runAllJobs() {
  await connectDB();
  await Promise.all([
    pollEarthquakes(),
    pollFires(),
    pollGDACS(),
    pollEONET(),
    pollReliefWeb()
  ]);
  console.log('✨ All initial ingestion jobs complete.');
}

/**
 * Poll USGS for earthquakes and upsert
 */
async function pollEarthquakes() {
  try {
    const rawEvents = await fetchRecentEarthquakes();
    let updatedCount = 0;

    for (const eq of rawEvents) {
      const normalized = normalizeEarthquake(eq);
      const result = await upsertIncident(normalized);
      if (result.upsertedCount > 0 || result.modifiedCount > 0) {
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      console.log(`[Job - USGS] Ingested/updated ${updatedCount} earthquakes`);
      broadcastIncidentsUpdate();
    }
  } catch (error) {
    console.error('[Job - USGS] Error:', error);
  }
}

/**
 * Poll NASA FIRMS for fire hotspots and upsert
 */
async function pollFires() {
  try {
    const rawFires = await fetchActiveFiresCsv();
    let updatedCount = 0;

    // FIRMS can return thousands. Take top 150 significant ones
    const topFires = rawFires
      .sort((a, b) => b.frp - a.frp)
      .slice(0, 150);

    for (const fire of topFires) {
      const normalized = normalizeFireHotspot(fire);
      const result = await upsertIncident(normalized);
      if (result.upsertedCount > 0 || result.modifiedCount > 0) {
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      console.log(`[Job - NASA FIRMS] Ingested/updated ${updatedCount} fires`);
      broadcastIncidentsUpdate();
    }
  } catch (error) {
    console.error('[Job - NASA FIRMS] Error:', error);
  }
}

/**
 * Poll GDACS for alerts and upsert
 */
async function pollGDACS() {
  try {
    const rawEvents = await fetchGDACSEvents();
    let updatedCount = 0;

    for (const feat of rawEvents) {
      const normalized = normalizeGDACSEvent(feat);
      const result = await upsertIncident(normalized);
      if (result.upsertedCount > 0 || result.modifiedCount > 0) {
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      console.log(`[Job - GDACS] Ingested/updated ${updatedCount} GDACS events`);
      broadcastIncidentsUpdate();
    }
  } catch (error) {
    console.error('[Job - GDACS] Error:', error);
  }
}

/**
 * Poll NASA EONET for natural events and upsert
 */
async function pollEONET() {
  try {
    const rawEvents = await fetchNaturalEvents(50);
    let updatedCount = 0;

    for (const ev of rawEvents) {
      try {
        const normalized = normalizeEONETEvent(ev);
        const result = await upsertIncident(normalized);
        if (result.upsertedCount > 0 || result.modifiedCount > 0) {
          updatedCount++;
        }
      } catch (err) {
        // EONET items occasionally have empty geometry, skip those silently
      }
    }

    if (updatedCount > 0) {
      console.log(`[Job - NASA EONET] Ingested/updated ${updatedCount} EONET events`);
      broadcastIncidentsUpdate();
    }
  } catch (error) {
    console.error('[Job - NASA EONET] Error:', error);
  }
}

/**
 * Poll ReliefWeb and upsert
 */
async function pollReliefWeb() {
  try {
    const rawDisasters = await fetchReliefWebDisasters(20);
    let updatedCount = 0;

    for (const dis of rawDisasters) {
      const normalized = normalizeReliefWebDisaster(dis);
      const result = await upsertIncident(normalized);
      if (result.upsertedCount > 0 || result.modifiedCount > 0) {
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      console.log(`[Job - ReliefWeb] Ingested/updated ${updatedCount} disasters`);
      broadcastIncidentsUpdate();
    }
  } catch (error) {
    console.error('[Job - ReliefWeb] Error:', error);
  }
}

/**
 * Helper to upsert a normalized incident to MongoDB
 */
async function upsertIncident(normalized: Partial<IIncident>) {
  return await Incident.updateOne(
    { source: normalized.source, sourceId: normalized.sourceId },
    { $set: normalized },
    { upsert: true }
  );
}

/**
 * Broadcast updated active incidents list to all connected clients
 */
async function broadcastIncidentsUpdate() {
  if (!ioInstance) return;

  try {
    const activeIncidents = await Incident.find({ status: { $in: ['active', 'monitoring'] } })
      .sort({ createdAt: -1 })
      .limit(100);

    ioInstance.emit('incidents:live', activeIncidents);
  } catch (error) {
    console.error('[Job - Broadcast] Error fetching incidents for broadcast:', error);
  }
}
