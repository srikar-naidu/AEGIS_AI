'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Navbar } from '../../components/layout/Navbar';
import { PulsingDot } from '../../components/shared/PulsingDot';
import {
  Activity,
  MapPin,
  Phone,
  Clock,
  Navigation,
  Shield,
  Loader2,
  Crosshair,
  Radio,
  Route,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Incident } from '../../lib/types/incidents';

const DisasterMap = dynamic(() => import('../../components/map/DisasterMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-bg-abyss flex items-center justify-center font-mono text-xs text-accent-sage animate-pulse">
      [INITIALIZING FIELD OPS RADAR...]
    </div>
  ),
});

interface EmergencyResource {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  distance?: number;
  eta?: string;
  routeDistance?: string;
  verificationSource: string;
  contactInfo?: string;
  activeStatus?: string;
}

interface EvacuationRoute {
  resourceId: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  distance: number;
  duration: number;
  routeDistance: string;
  eta: string;
  safetyScore: number;
  routeStatus: 'SAFE' | 'CAUTION' | 'UNSAFE';
  hazardsAvoided: string[];
  hazardsIntersected: string[];
  geometry: number[][];
  verificationSource: string;
  contactInfo?: string;
  rank: number;
}

type ActiveTab = 'resources' | 'evacuation';

export default function RescuePage() {
  const [selectedResource, setSelectedResource] = useState<EmergencyResource | null>(null);
  const [resources, setResources] = useState<EmergencyResource[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchCenter, setSearchCenter] = useState<{lat: number, lng: number} | null>(null);

  // Evacuation routing state
  const [activeTab, setActiveTab] = useState<ActiveTab>('resources');
  const [evacRoutes, setEvacRoutes] = useState<EvacuationRoute[]>([]);
  const [isLoadingEvac, setIsLoadingEvac] = useState(false);
  const [evacMessage, setEvacMessage] = useState<string | null>(null);
  const [hazardZoneCount, setHazardZoneCount] = useState(0);
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/incidents')
      .then(res => res.json())
      .then(data => {
        const active = data.filter((inc: any) => inc.status === 'active' || inc.status === 'monitoring');
        setIncidents(active);
      })
      .catch(console.error);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!searchCenter) {
            setSearchCenter({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          }
        },
        () => console.warn('Geolocation blocked or failed')
      );
    }
  }, []);

  useEffect(() => {
    if (selectedIncident) {
      const [lng, lat] = selectedIncident.location.coordinates;
      setSearchCenter({ lat, lng });
    }
  }, [selectedIncident]);

  useEffect(() => {
    if (!searchCenter) return;

    setIsLoading(true);
    fetch(`http://localhost:3001/api/rescue/resources?lat=${searchCenter.lat}&lng=${searchCenter.lng}&radius=15000`)
      .then(res => res.json())
      .then(data => {
        setResources(data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [searchCenter]);

  // Fetch evacuation routes when tab switches or center changes
  useEffect(() => {
    if (activeTab !== 'evacuation' || !searchCenter) return;

    setIsLoadingEvac(true);
    setEvacMessage(null);
    fetch(`http://localhost:3001/api/rescue/evacuation-routes?lat=${searchCenter.lat}&lng=${searchCenter.lng}&radius=15000&topN=5`)
      .then(res => res.json())
      .then(data => {
        setEvacRoutes(data.routes || []);
        setEvacMessage(data.message || null);
        setHazardZoneCount(data.hazardZoneCount || 0);
      })
      .catch(err => {
        console.error(err);
        setEvacMessage('Failed to generate evacuation routes.');
      })
      .finally(() => setIsLoadingEvac(false));
  }, [activeTab, searchCenter]);

  const statusColor = (status: string) => {
    if (status === 'SAFE') return 'text-success-green';
    if (status === 'CAUTION') return 'text-emergency-amber';
    return 'text-red-400';
  };

  const statusBg = (status: string) => {
    if (status === 'SAFE') return 'border-success-green/30 bg-success-green/10';
    if (status === 'CAUTION') return 'border-emergency-amber/30 bg-emergency-amber/10';
    return 'border-red-400/30 bg-red-400/10';
  };

  const rankLabel = (rank: number) => {
    if (rank === 1) return 'PRIMARY';
    if (rank === 2) return 'SECONDARY';
    return 'BACKUP';
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-bg-abyss">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 xl:w-96 shrink-0 border-r border-accent-sage/10 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-accent-sage/10 bg-bg-abyss/50">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-accent-sage" />
                <h2 className="font-heading text-sm font-bold text-accent-mint uppercase tracking-wider">
                  RescueOps Command
                </h2>
              </div>
              
              {/* Location Controls */}
              <div className="mb-2">
                <label className="text-[10px] text-accent-sage/60 uppercase tracking-widest block mb-1">Center Operations On:</label>
                <select 
                  className="w-full bg-bg-deep border border-accent-sage/20 rounded p-1.5 text-xs text-accent-sage font-mono focus:border-accent-mint/50 focus:outline-none"
                  value={selectedIncident ? selectedIncident._id : 'user-loc'}
                  onChange={(e) => {
                    if (e.target.value === 'user-loc') {
                      setSelectedIncident(null);
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(pos => {
                          setSearchCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        });
                      }
                    } else {
                      const inc = incidents.find(i => i._id === e.target.value);
                      if (inc) setSelectedIncident(inc);
                    }
                  }}
                >
                  <option value="user-loc">My Current Location (GPS)</option>
                  {incidents.map(inc => (
                    <option key={inc._id} value={inc._id}>
                      Incident: {inc.title} ({inc.severity})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tab Switcher */}
              <div className="flex gap-1 mt-3">
                <button
                  onClick={() => setActiveTab('resources')}
                  className={clsx(
                    'flex-1 py-1.5 px-2 rounded text-[10px] font-mono uppercase tracking-widest border transition-all',
                    activeTab === 'resources'
                      ? 'bg-accent-mint/15 border-accent-mint/40 text-accent-mint'
                      : 'bg-bg-deep/30 border-accent-sage/10 text-accent-sage/50 hover:text-accent-sage/80'
                  )}
                >
                  <Shield className="h-3 w-3 inline mr-1" />Resources
                </button>
                <button
                  onClick={() => setActiveTab('evacuation')}
                  className={clsx(
                    'flex-1 py-1.5 px-2 rounded text-[10px] font-mono uppercase tracking-widest border transition-all',
                    activeTab === 'evacuation'
                      ? 'bg-info-cyan/15 border-info-cyan/40 text-info-cyan'
                      : 'bg-bg-deep/30 border-accent-sage/10 text-accent-sage/50 hover:text-accent-sage/80'
                  )}
                >
                  <Route className="h-3 w-3 inline mr-1" />Evacuation
                </button>
              </div>

              {/* Stats Row */}
              {activeTab === 'resources' && (
                <div className="flex gap-2 mt-3">
                  <div className="flex-1 p-2 rounded border border-accent-sage/10 bg-bg-deep/30 text-center">
                    <div className="text-lg font-black text-info-cyan font-mono">{resources.filter(r => r.type === 'Hospital' || r.type === 'Clinic').length}</div>
                    <div className="text-[8px] text-accent-sage/50 uppercase tracking-wider">Medical</div>
                  </div>
                  <div className="flex-1 p-2 rounded border border-accent-sage/10 bg-bg-deep/30 text-center">
                    <div className="text-lg font-black text-emergency-amber font-mono">{resources.filter(r => r.type === 'Fire Station' || r.type === 'Ambulance Station').length}</div>
                    <div className="text-[8px] text-accent-sage/50 uppercase tracking-wider">Responders</div>
                  </div>
                  <div className="flex-1 p-2 rounded border border-accent-sage/10 bg-bg-deep/30 text-center">
                    <div className="text-lg font-black text-accent-mint font-mono">{resources.filter(r => r.type === 'Shelter' || r.type === 'Organization').length}</div>
                    <div className="text-[8px] text-accent-sage/50 uppercase tracking-wider">Shelters/Orgs</div>
                  </div>
                </div>
              )}

              {activeTab === 'evacuation' && (
                <div className="flex gap-2 mt-3">
                  <div className="flex-1 p-2 rounded border border-accent-sage/10 bg-bg-deep/30 text-center">
                    <div className="text-lg font-black text-info-cyan font-mono">{evacRoutes.length}</div>
                    <div className="text-[8px] text-accent-sage/50 uppercase tracking-wider">Routes</div>
                  </div>
                  <div className="flex-1 p-2 rounded border border-accent-sage/10 bg-bg-deep/30 text-center">
                    <div className="text-lg font-black text-emergency-amber font-mono">{hazardZoneCount}</div>
                    <div className="text-[8px] text-accent-sage/50 uppercase tracking-wider">Hazard Zones</div>
                  </div>
                  <div className="flex-1 p-2 rounded border border-accent-sage/10 bg-bg-deep/30 text-center">
                    <div className="text-lg font-black text-success-green font-mono">{evacRoutes.filter(r => r.routeStatus === 'SAFE').length}</div>
                    <div className="text-[8px] text-accent-sage/50 uppercase tracking-wider">Safe</div>
                  </div>
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {/* ===== RESOURCES TAB ===== */}
              {activeTab === 'resources' && (
                <>
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 text-accent-sage/50">
                      <Loader2 className="h-6 w-6 animate-spin mb-2" />
                      <span className="text-[10px] font-mono tracking-widest uppercase">Aggregating APIs...</span>
                    </div>
                  ) : resources.length === 0 ? (
                    <div className="text-center py-6 px-4 bg-bg-deep/30 border border-emergency-amber/20 rounded-lg">
                      <p className="text-[11px] font-mono text-emergency-amber/80 uppercase">No verified emergency resource available from connected data sources.</p>
                    </div>
                  ) : (
                    resources.map((res) => {
                      const isSelected = selectedResource?.id === res.id;
                      return (
                        <button
                          key={res.id}
                          onClick={() => setSelectedResource(isSelected ? null : res)}
                          className={clsx(
                            'w-full text-left p-3 rounded-lg border font-mono transition-all duration-200 relative overflow-hidden',
                            isSelected
                              ? 'bg-bg-forest/50 border-accent-sage/35'
                              : 'bg-bg-deep/30 border-accent-sage/8 hover:bg-bg-deep/50 hover:border-accent-sage/20'
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] text-accent-mint font-bold truncate">{res.name}</span>
                                <span className="text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider border border-accent-sage/10 bg-bg-abyss/30 text-accent-sage/80">
                                  {res.type}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[9px] text-accent-sage/55 mb-2">
                                {res.routeDistance && (
                                  <span className="flex items-center gap-1 text-info-cyan/80"><Navigation className="h-2.5 w-2.5" />{res.routeDistance}</span>
                                )}
                                {res.eta && (
                                  <span className="flex items-center gap-1 text-emergency-amber/80"><Clock className="h-2.5 w-2.5" />ETA: {res.eta}</span>
                                )}
                              </div>
                              {res.contactInfo && (
                                <div className="text-[8px] text-accent-sage/60 mb-1 flex items-center gap-1">
                                  <Phone className="h-2.5 w-2.5" />
                                  {res.contactInfo}
                                </div>
                              )}
                              <div className="text-[7px] text-accent-sage/40 mt-1 flex items-center gap-1">
                                <Shield className="h-2.5 w-2.5" />
                                Verified via {res.verificationSource}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </>
              )}

              {/* ===== EVACUATION TAB ===== */}
              {activeTab === 'evacuation' && (
                <>
                  {isLoadingEvac ? (
                    <div className="flex flex-col items-center justify-center py-10 text-accent-sage/50">
                      <Loader2 className="h-6 w-6 animate-spin mb-2" />
                      <span className="text-[10px] font-mono tracking-widest uppercase">Generating safe routes via OSRM...</span>
                      <span className="text-[9px] font-mono text-accent-sage/30 mt-1">Checking hazard intersections...</span>
                    </div>
                  ) : evacRoutes.length === 0 ? (
                    <div className="text-center py-6 px-4 bg-bg-deep/30 border border-emergency-amber/20 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-emergency-amber/60 mx-auto mb-2" />
                      <p className="text-[11px] font-mono text-emergency-amber/80 uppercase">
                        {evacMessage || 'No verified safe evacuation route available. Manual coordination required.'}
                      </p>
                    </div>
                  ) : (
                    evacRoutes.map((route) => {
                      const isExpanded = expandedRoute === route.resourceId;
                      return (
                        <div
                          key={route.resourceId}
                          className={clsx(
                            'rounded-lg border font-mono transition-all duration-200 overflow-hidden',
                            route.rank === 1
                              ? 'border-info-cyan/30 bg-info-cyan/5'
                              : 'border-accent-sage/10 bg-bg-deep/30'
                          )}
                        >
                          {/* Route Header */}
                          <button
                            onClick={() => setExpandedRoute(isExpanded ? null : route.resourceId)}
                            className="w-full text-left p-3"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className={clsx(
                                  'text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider border font-bold',
                                  route.rank === 1 ? 'border-info-cyan/30 bg-info-cyan/15 text-info-cyan' :
                                  route.rank === 2 ? 'border-accent-sage/20 bg-bg-deep/50 text-accent-sage/70' :
                                  'border-accent-sage/10 bg-bg-abyss/30 text-accent-sage/50'
                                )}>
                                  {rankLabel(route.rank)}
                                </span>
                                <span className="text-[11px] text-accent-mint font-bold truncate">{route.name}</span>
                              </div>
                              {isExpanded ? <ChevronUp className="h-3 w-3 text-accent-sage/50" /> : <ChevronDown className="h-3 w-3 text-accent-sage/50" />}
                            </div>

                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider border border-accent-sage/10 bg-bg-abyss/30 text-accent-sage/80">
                                {route.type}
                              </span>
                              <span className={clsx('text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider border font-bold', statusBg(route.routeStatus), statusColor(route.routeStatus))}>
                                {route.routeStatus}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-[9px] mt-2">
                              <span className="flex items-center gap-1 text-info-cyan/80">
                                <Navigation className="h-2.5 w-2.5" />{route.routeDistance}
                              </span>
                              <span className="flex items-center gap-1 text-emergency-amber/80">
                                <Clock className="h-2.5 w-2.5" />ETA: {route.eta}
                              </span>
                              <span className={clsx('flex items-center gap-1 font-bold', statusColor(route.routeStatus))}>
                                <Shield className="h-2.5 w-2.5" />{route.safetyScore}%
                              </span>
                            </div>
                          </button>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="px-3 pb-3 border-t border-accent-sage/10 pt-2 space-y-2">
                              {/* Hazards Avoided */}
                              {route.hazardsAvoided.length > 0 && (
                                <div>
                                  <div className="text-[8px] text-accent-sage/50 uppercase tracking-widest mb-1">Hazards Avoided</div>
                                  <div className="flex flex-wrap gap-1">
                                    {route.hazardsAvoided.map((h, i) => (
                                      <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-success-green/10 border border-success-green/20 text-success-green flex items-center gap-0.5">
                                        <CheckCircle2 className="h-2.5 w-2.5" />{h}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Hazards Intersected */}
                              {route.hazardsIntersected.length > 0 && (
                                <div>
                                  <div className="text-[8px] text-accent-sage/50 uppercase tracking-widest mb-1">Hazards On Route</div>
                                  <div className="flex flex-wrap gap-1">
                                    {route.hazardsIntersected.map((h, i) => (
                                      <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-red-400/10 border border-red-400/20 text-red-400 flex items-center gap-0.5">
                                        <AlertTriangle className="h-2.5 w-2.5" />{h}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Contact & Verification */}
                              {route.contactInfo && (
                                <div className="text-[8px] text-accent-sage/60 flex items-center gap-1">
                                  <Phone className="h-2.5 w-2.5" />{route.contactInfo}
                                </div>
                              )}
                              <div className="text-[7px] text-accent-sage/40 flex items-center gap-1">
                                <Shield className="h-2.5 w-2.5" />
                                Verified via {route.verificationSource} • OSRM Routing
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </div>
          </div>

          {/* Map Area */}
          <div className="flex-1 relative">
            <div className="absolute top-3 left-3 z-20 glass-panel px-3 py-2 rounded-lg flex items-center gap-2 font-mono text-[10px] text-accent-sage/70 uppercase tracking-widest">
              <Radio className="h-3 w-3" />
              {activeTab === 'evacuation' ? 'EVACUATION ROUTING ENGINE' : 'RESOURCE RADAR (OSM & ReliefWeb)'}
              <PulsingDot color="green" size="sm" />
            </div>
            {searchCenter && (
              <div className="absolute bottom-3 left-3 z-20 glass-panel px-3 py-2 rounded-lg flex items-center gap-2 font-mono text-[10px] text-accent-sage/70 uppercase tracking-widest border-info-cyan/20">
                <Crosshair className="h-3 w-3 text-info-cyan" />
                CENTER: {searchCenter.lat.toFixed(4)}, {searchCenter.lng.toFixed(4)}
              </div>
            )}
            <DisasterMap
              incidents={incidents}
              shelters={[]}
              rescueTeams={resources.map((r) => ({
                _id: r.id,
                name: r.name,
                status: 'available',
                currentLocation: { type: 'Point' as const, coordinates: [r.lng, r.lat] },
                membersCount: 0,
                vehicleType: r.type,
                specialization: [r.verificationSource],
                contactInfo: r.contactInfo,
                lastUpdate: 'Live',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }))}
              selectedIncident={selectedIncident}
              onSelectIncident={setSelectedIncident}
              activeLayers={{ incidents: true, shelters: false, rescueTeams: activeTab === 'resources', dangerZones: true, routes: true }}
              evacuationRoutes={activeTab === 'evacuation' ? evacRoutes.map(r => ({
                geometry: r.geometry,
                status: r.routeStatus,
                name: r.name,
                rank: r.rank,
              })) : undefined}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
