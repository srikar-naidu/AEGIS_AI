'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Navbar } from '../../components/layout/Navbar';
import { Sidebar } from '../../components/layout/Sidebar';
import { PulsingDot } from '../../components/shared/PulsingDot';
import {
  Activity,
  Users,
  MapPin,
  Phone,
  Truck,
  Radio,
  CheckCircle,
  Clock,
  Navigation,
  Shield,
} from 'lucide-react';
import { clsx } from 'clsx';

const DisasterMap = dynamic(() => import('../../components/map/DisasterMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-bg-abyss flex items-center justify-center font-mono text-xs text-accent-sage animate-pulse">
      [INITIALIZING FIELD OPS RADAR...]
    </div>
  ),
});

interface RescueTeamUI {
  id: string;
  name: string;
  status: 'available' | 'deployed' | 'returning' | 'offline';
  specialization: string[];
  vehicleType: string;
  membersCount: number;
  contactInfo: string;
  assignedMission?: string;
  location: { lat: number; lng: number };
  lastUpdate: string;
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  available: { color: 'text-success-green', bg: 'bg-success-green', label: 'AVAILABLE' },
  deployed: { color: 'text-emergency-amber', bg: 'bg-emergency-amber', label: 'DEPLOYED' },
  returning: { color: 'text-info-cyan', bg: 'bg-info-cyan', label: 'RETURNING' },
  offline: { color: 'text-accent-sage/40', bg: 'bg-accent-sage/40', label: 'OFFLINE' },
};

export default function RescuePage() {
  const [selectedTeam, setSelectedTeam] = useState<RescueTeamUI | null>(null);
  const teams = getDemoTeams();

  const available = teams.filter((t) => t.status === 'available').length;
  const deployed = teams.filter((t) => t.status === 'deployed').length;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-bg-abyss">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex overflow-hidden">
          {/* Teams List */}
          <div className="w-80 xl:w-96 shrink-0 border-r border-accent-sage/10 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-accent-sage/10 bg-bg-abyss/50">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-accent-sage" />
                <h2 className="font-heading text-sm font-bold text-accent-mint uppercase tracking-wider">
                  Rescue Operations
                </h2>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 p-2 rounded border border-accent-sage/10 bg-bg-deep/30 text-center">
                  <div className="text-lg font-black text-success-green font-mono">{available}</div>
                  <div className="text-[8px] text-accent-sage/50 uppercase tracking-wider">Available</div>
                </div>
                <div className="flex-1 p-2 rounded border border-accent-sage/10 bg-bg-deep/30 text-center">
                  <div className="text-lg font-black text-emergency-amber font-mono">{deployed}</div>
                  <div className="text-[8px] text-accent-sage/50 uppercase tracking-wider">Deployed</div>
                </div>
                <div className="flex-1 p-2 rounded border border-accent-sage/10 bg-bg-deep/30 text-center">
                  <div className="text-lg font-black text-accent-mint font-mono">{teams.length}</div>
                  <div className="text-[8px] text-accent-sage/50 uppercase tracking-wider">Total</div>
                </div>
              </div>
            </div>

            {/* Team Cards */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {teams.map((team) => {
                const config = statusConfig[team.status];
                const isSelected = selectedTeam?.id === team.id;
                return (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(isSelected ? null : team)}
                    className={clsx(
                      'w-full text-left p-3 rounded-lg border font-mono transition-all duration-200',
                      isSelected
                        ? 'bg-bg-forest/50 border-accent-sage/35'
                        : 'bg-bg-deep/30 border-accent-sage/8 hover:bg-bg-deep/50 hover:border-accent-sage/20'
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={clsx('h-2 w-2 rounded-full mt-1.5 shrink-0', config.bg)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-accent-mint font-bold truncate">{team.name}</span>
                          <span className={clsx('text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider border', config.color,
                            team.status === 'available' ? 'border-success-green/20 bg-success-green/10' :
                            team.status === 'deployed' ? 'border-emergency-amber/20 bg-emergency-amber/10' :
                            'border-accent-sage/10 bg-bg-abyss/30'
                          )}>
                            {config.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[9px] text-accent-sage/55 mb-1">
                          <span className="flex items-center gap-0.5"><Users className="h-2.5 w-2.5" />{team.membersCount}</span>
                          <span className="flex items-center gap-0.5"><Truck className="h-2.5 w-2.5" />{team.vehicleType}</span>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-1">
                          {team.specialization.map((spec) => (
                            <span key={spec} className="text-[7px] bg-bg-forest/60 px-1 py-0.5 rounded uppercase tracking-wider text-accent-sage/60">
                              {spec}
                            </span>
                          ))}
                        </div>

                        {team.assignedMission && (
                          <div className="text-[8px] text-emergency-amber/80 mt-1 flex items-center gap-1">
                            <Navigation className="h-2.5 w-2.5" />
                            {team.assignedMission}
                          </div>
                        )}

                        <div className="text-[8px] text-accent-sage/40 mt-1 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          Updated {team.lastUpdate}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Map Area */}
          <div className="flex-1 relative">
            <div className="absolute top-3 left-3 z-20 glass-panel px-3 py-2 rounded-lg flex items-center gap-2 font-mono text-[10px] text-accent-sage/70 uppercase tracking-widest">
              <Radio className="h-3 w-3" />
              FIELD OPERATIONS RADAR
              <PulsingDot color="green" size="sm" />
            </div>
            <DisasterMap
              incidents={[]}
              shelters={[]}
              rescueTeams={teams.map((t) => ({
                _id: t.id,
                name: t.name,
                status: t.status,
                currentLocation: { type: 'Point' as const, coordinates: [t.location.lng, t.location.lat] },
                membersCount: t.membersCount,
                vehicleType: t.vehicleType,
                specialization: t.specialization,
                contactInfo: t.contactInfo,
                lastUpdate: t.lastUpdate,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }))}
              selectedIncident={null}
              onSelectIncident={() => {}}
              activeLayers={{ incidents: false, shelters: false, rescueTeams: true, dangerZones: false, routes: false }}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function getDemoTeams(): RescueTeamUI[] {
  return [
    { id: '1', name: 'NDRF Alpha Squad', status: 'deployed', specialization: ['earthquake', 'structural_collapse'], vehicleType: 'Armored Truck', membersCount: 12, contactInfo: '+91-1234567890', assignedMission: 'Kathmandu Valley Earthquake Response', location: { lat: 27.7172, lng: 85.3240 }, lastUpdate: '5 min ago' },
    { id: '2', name: 'Marine Rescue Unit 7', status: 'deployed', specialization: ['flood', 'tsunami'], vehicleType: 'Rescue Boat', membersCount: 8, contactInfo: '+91-9876543210', assignedMission: 'Brahmaputra Flood Evacuation', location: { lat: 26.1445, lng: 91.7362 }, lastUpdate: '12 min ago' },
    { id: '3', name: 'Air Wing Bravo', status: 'available', specialization: ['wildfire', 'cyclone', 'landslide'], vehicleType: 'Helicopter', membersCount: 6, contactInfo: '+91-5551234567', location: { lat: 28.6139, lng: 77.2090 }, lastUpdate: '3 min ago' },
    { id: '4', name: 'Coastal Guard Delta', status: 'available', specialization: ['cyclone', 'storm_surge', 'tsunami'], vehicleType: 'Coast Guard Vessel', membersCount: 15, contactInfo: '+91-4445556667', location: { lat: 13.0827, lng: 80.2707 }, lastUpdate: '8 min ago' },
    { id: '5', name: 'Mountain Response Echo', status: 'returning', specialization: ['landslide', 'blizzard', 'earthquake'], vehicleType: 'All-terrain Vehicle', membersCount: 10, contactInfo: '+91-3332221110', location: { lat: 31.1048, lng: 77.1734 }, lastUpdate: '20 min ago' },
    { id: '6', name: 'Hazmat Unit Foxtrot', status: 'available', specialization: ['industrial_hazard', 'volcano'], vehicleType: 'Hazmat Vehicle', membersCount: 8, contactInfo: '+91-7778889990', location: { lat: 19.0760, lng: 72.8777 }, lastUpdate: '15 min ago' },
  ];
}
