'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSocket } from '../../providers/socket-provider';
import { Navbar } from '../../components/layout/Navbar';
import { Sidebar } from '../../components/layout/Sidebar';
import { StatsGrid } from '../../components/dashboard/StatsGrid';
import { AlertsFeed } from '../../components/dashboard/AlertsFeed';
import { IncidentsSidebar } from '../../components/dashboard/IncidentsSidebar';
import { LayerControls } from '../../components/dashboard/LayerControls';
import { WeatherWidget } from '../../components/dashboard/WeatherWidget';
import { PulsingDot } from '../../components/shared/PulsingDot';
import { Incident, Alert, RescueTeam, Shelter } from '../../lib/types/incidents';
import {
  Radio,
  Maximize2,
  Minimize2,
  Bell,
  PanelLeftOpen,
  PanelLeftClose,
} from 'lucide-react';
import { clsx } from 'clsx';

// Dynamic import for Leaflet map (SSR incompatible)
const DisasterMap = dynamic(
  () => import('../../components/map/DisasterMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-bg-abyss flex items-center justify-center font-mono text-xs text-accent-sage animate-pulse">
        [INITIALIZING GEOSPATIAL ENGINE...]
      </div>
    ),
  }
);

export default function DashboardPage() {
  // ── State ──────────────────────────────────────────────────────────────
  const { socket, isConnected } = useSocket();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rescueTeams, setRescueTeams] = useState<RescueTeam[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [showIncidentPanel, setShowIncidentPanel] = useState(true);
  const [activeLayers, setActiveLayers] = useState({
    incidents: true,
    shelters: true,
    rescueTeams: true,
    dangerZones: true,
    routes: false,
  });

  // ── Socket.IO Listeners ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Handle initial data sync from server
    const onDashboardSync = (data: {
      incidents?: Incident[];
      alerts?: Alert[];
      rescueTeams?: RescueTeam[];
      shelters?: Shelter[];
    }) => {
      console.log('[Dashboard] Received dashboard:sync with', {
        incidents: data.incidents?.length || 0,
        alerts: data.alerts?.length || 0,
        rescueTeams: data.rescueTeams?.length || 0,
        shelters: data.shelters?.length || 0,
      });
      if (data.incidents) setIncidents(data.incidents);
      if (data.alerts) setAlerts(data.alerts);
      if (data.rescueTeams) setRescueTeams(data.rescueTeams);
      if (data.shelters) setShelters(data.shelters);
    };

    // Batch data updates from server
    const onIncidentsUpdate = (data: Incident[]) => {
      setIncidents(data);
    };

    const onNewIncident = (incident: Incident) => {
      setIncidents((prev) => {
        const exists = prev.find(
          (i) => (i._id && i._id === incident._id) || (i.sourceId && i.sourceId === incident.sourceId)
        );
        if (exists) {
          return prev.map((i) =>
            (i._id === incident._id || i.sourceId === incident.sourceId) ? { ...i, ...incident } : i
          );
        }
        return [incident, ...prev];
      });
    };

    const onAlertsUpdate = (data: Alert[]) => {
      setAlerts(data);
    };

    const onNewAlert = (alert: Alert) => {
      setAlerts((prev) => [alert, ...prev.filter((a) => a._id !== alert._id)]);
    };

    const onRescueTeamsUpdate = (data: RescueTeam[]) => {
      setRescueTeams(data);
    };

    const onSheltersUpdate = (data: Shelter[]) => {
      setShelters(data);
    };

    socket.on('dashboard:sync', onDashboardSync);
    socket.on('incidents:live', onIncidentsUpdate); // From background poller
    socket.on('incident:new', onNewIncident);
    socket.on('alerts:update', onAlertsUpdate);
    socket.on('alert:new', onNewAlert);
    socket.on('rescueTeams:update', onRescueTeamsUpdate);
    socket.on('shelters:update', onSheltersUpdate);

    // Request initial data
    socket.emit('data:request', { types: ['incidents', 'alerts', 'rescueTeams', 'shelters'] });

    return () => {
      socket.off('dashboard:sync', onDashboardSync);
      socket.off('incidents:live', onIncidentsUpdate);
      socket.off('incident:new', onNewIncident);
      socket.off('alerts:update', onAlertsUpdate);
      socket.off('alert:new', onNewAlert);
      socket.off('rescueTeams:update', onRescueTeamsUpdate);
      socket.off('shelters:update', onSheltersUpdate);
    };
  }, [socket]);

  // ── Fallback API fetch if socket isn't connected ──────────────────────
  useEffect(() => {
    const fetchFallback = async () => {
      try {
        const [incRes, alertRes] = await Promise.allSettled([
          fetch('http://localhost:3001/api/incidents').then((r) => r.json()),
          fetch('http://localhost:3001/api/alerts').then((r) => r.json()),
        ]);

        if (incRes.status === 'fulfilled' && Array.isArray(incRes.value)) {
          setIncidents(incRes.value);
        }
        if (alertRes.status === 'fulfilled' && Array.isArray(alertRes.value)) {
          setAlerts(alertRes.value);
        }
      } catch {
        // Server may not be running — use mock data below
      }
    };

    // Only fetch fallback if socket not connected after 3 seconds
    const timer = setTimeout(() => {
      if (!isConnected) {
        fetchFallback();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isConnected]);

  // ── No Demo Data Seeding ─────────────────────────────────────────────
  // (Removed to ensure only real data is shown as requested)

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleSelectIncident = useCallback((inc: Incident) => {
    setSelectedIncident(inc);
  }, []);

  const handleToggleLayer = useCallback(
    (layer: keyof typeof activeLayers) => {
      setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
    },
    []
  );

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-bg-abyss">
      {/* Top Nav */}
      <Navbar />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Navigation */}
        <Sidebar />

        {/* Dashboard Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Stats Bar */}
          <div className="p-3 border-b border-accent-sage/10 bg-bg-abyss/50">
            <StatsGrid
              incidents={incidents}
              rescueTeams={rescueTeams}
              shelters={shelters}
              alerts={alerts}
              isConnected={isConnected}
            />
          </div>

          {/* Map + Panels Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Incidents Sidebar Panel */}
            {showIncidentPanel && !mapExpanded && (
              <div className="w-72 xl:w-80 shrink-0 border-r border-accent-sage/10 overflow-hidden">
                <IncidentsSidebar
                  incidents={incidents}
                  selectedIncident={selectedIncident}
                  onSelectIncident={handleSelectIncident}
                />
              </div>
            )}

            {/* Center: Map + Controls */}
            <div className="flex-1 flex flex-col relative">
              {/* Map Toolbar */}
              <div className="flex items-center justify-between px-3 py-2 bg-bg-abyss border-b border-accent-sage/10 z-20">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowIncidentPanel(!showIncidentPanel)}
                    className="p-1.5 rounded border border-accent-sage/15 text-accent-sage hover:text-accent-mint hover:bg-bg-deep transition-all"
                    title={showIncidentPanel ? 'Hide panel' : 'Show panel'}
                  >
                    {showIncidentPanel ? (
                      <PanelLeftClose className="h-3.5 w-3.5" />
                    ) : (
                      <PanelLeftOpen className="h-3.5 w-3.5" />
                    )}
                  </button>

                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-accent-sage/60 uppercase tracking-widest">
                    <Radio className="h-3 w-3 text-accent-sage/50" />
                    <span>GEOSPATIAL RADAR</span>
                    <PulsingDot color={isConnected ? 'green' : 'red'} size="sm" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <LayerControls
                    activeLayers={activeLayers}
                    onToggleLayer={handleToggleLayer}
                  />

                  <button
                    onClick={() => setMapExpanded(!mapExpanded)}
                    className="p-1.5 rounded border border-accent-sage/15 text-accent-sage hover:text-accent-mint hover:bg-bg-deep transition-all"
                    title={mapExpanded ? 'Minimize' : 'Maximize'}
                  >
                    {mapExpanded ? (
                      <Minimize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Map */}
              <div className="flex-1 relative">
                <DisasterMap
                  incidents={incidents}
                  shelters={shelters}
                  rescueTeams={rescueTeams}
                  selectedIncident={selectedIncident}
                  onSelectIncident={handleSelectIncident}
                  activeLayers={activeLayers}
                />

                {/* Connection indicator overlay */}
                {!isConnected && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 glass-panel px-4 py-2 rounded-lg flex items-center gap-2 font-mono text-[10px] text-emergency-amber uppercase tracking-wider animate-pulse">
                    <div className="h-2 w-2 rounded-full bg-emergency-amber" />
                    SOCKET DISCONNECTED — ATTEMPTING RECONNECT
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Weather + Alerts */}
            {!mapExpanded && (
              <div className="w-72 xl:w-80 shrink-0 border-l border-accent-sage/10 flex flex-col overflow-hidden bg-bg-abyss/50">
                {/* Weather */}
                <div className="p-3 border-b border-accent-sage/10">
                  <div className="font-mono text-[9px] text-accent-sage/60 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Bell className="h-3 w-3" />
                    METEO DIAGNOSTICS
                  </div>
                  <WeatherWidget incident={selectedIncident} />
                </div>

                {/* Alerts Feed */}
                <div className="flex-1 p-3 overflow-hidden flex flex-col">
                  <div className="font-mono text-[9px] text-accent-sage/60 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <PulsingDot color="amber" size="sm" />
                    ADVISORY FEED
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <AlertsFeed alerts={alerts} maxItems={12} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}


