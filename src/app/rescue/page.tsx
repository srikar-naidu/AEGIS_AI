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
  Radio
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

export default function RescuePage() {
  const [selectedResource, setSelectedResource] = useState<EmergencyResource | null>(null);
  const [resources, setResources] = useState<EmergencyResource[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchCenter, setSearchCenter] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    // Fetch active incidents to allow selection
    fetch('http://localhost:3001/api/incidents')
      .then(res => res.json())
      .then(data => {
        const active = data.filter((inc: any) => inc.status === 'active' || inc.status === 'monitoring');
        setIncidents(active);
      })
      .catch(console.error);

    // Default to user's location
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
                  Emergency Resources
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
            </div>

            {/* Resource Cards */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
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
            </div>
          </div>

          {/* Map Area */}
          <div className="flex-1 relative">
            <div className="absolute top-3 left-3 z-20 glass-panel px-3 py-2 rounded-lg flex items-center gap-2 font-mono text-[10px] text-accent-sage/70 uppercase tracking-widest">
              <Radio className="h-3 w-3" />
              RESOURCE RADAR (OSM & ReliefWeb)
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
              shelters={[]} // Handled below in rescueTeams for uniform map markers temporarily
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
              activeLayers={{ incidents: true, shelters: false, rescueTeams: true, dangerZones: false, routes: false }}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
