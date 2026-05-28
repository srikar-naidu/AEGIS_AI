'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Incident, Shelter, RescueTeam } from '../../lib/types/incidents';
import { getDisasterConfig } from '../../lib/constants/disaster-types';

interface DisasterMapProps {
  incidents: Incident[];
  shelters: Shelter[];
  rescueTeams: RescueTeam[];
  selectedIncident: Incident | null;
  onSelectIncident: (inc: Incident) => void;
  activeLayers: {
    incidents: boolean;
    shelters: boolean;
    rescueTeams: boolean;
    dangerZones: boolean;
    routes: boolean;
  };
}

// Map Adjuster to programmatically pan/zoom when selected incident changes
function MapRecenter({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView(coords, 8, { animate: true, duration: 1.5 });
    }
  }, [coords, map]);
  return null;
}

export default function DisasterMap({
  incidents,
  shelters,
  rescueTeams,
  selectedIncident,
  onSelectIncident,
  activeLayers,
}: DisasterMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-full bg-bg-abyss flex items-center justify-center font-mono text-xs text-accent-sage animate-pulse">
        [INITIALIZING GEOSPATIAL ENGINE...]
      </div>
    );
  }

  // Create custom neon div-icons for disasters
  const createDisasterIcon = (type: string, severity: string) => {
    const config = getDisasterConfig(type);
    const colorMap = {
      critical: '#EF4444',
      high: '#F97316',
      medium: '#F59E0B',
      low: '#10B981',
    };
    const color = colorMap[severity as keyof typeof colorMap] || config.hexColor;

    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center w-8 h-8">
          <div class="absolute w-full h-full rounded-full animate-ping opacity-25" style="background-color: ${color}"></div>
          <div class="absolute w-5 h-5 rounded-full border border-bg-abyss shadow-md flex items-center justify-center" style="background-color: ${color}">
            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
          </div>
        </div>
      `,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  // Create shelter icons
  const shelterIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="absolute w-5 h-5 rounded border border-bg-abyss shadow-md bg-info-cyan flex items-center justify-center">
          <span style="font-size: 10px; font-weight: bold; color: #051F20;">H</span>
        </div>
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  // Create rescue team icons
  const rescueTeamIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="absolute w-5 h-5 rounded-full border border-bg-abyss shadow-md bg-success-green flex items-center justify-center">
          <span style="font-size: 8px; font-weight: bold; color: #051F20;">R</span>
        </div>
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  const recenterCoords: [number, number] | null = selectedIncident
    ? [selectedIncident.location.coordinates[1], selectedIncident.location.coordinates[0]]
    : null;

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[20.5937, 78.9629]} // Default centered on India/Global
        zoom={5}
        zoomControl={false}
        className="w-full h-full z-10"
      >
        {/* Recenter triggers */}
        <MapRecenter coords={recenterCoords} />

        {/* TileLayer with inversion filters applied in CSS for custom dark theme */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          className="dark-map-tiles"
        />

        {/* Render Disasters/Incidents */}
        {activeLayers.incidents &&
          incidents.map((inc) => {
            const coords: [number, number] = [inc.location.coordinates[1], inc.location.coordinates[0]];
            const config = getDisasterConfig(inc.type);

            return (
              <React.Fragment key={inc._id || inc.id}>
                <Marker
                  position={coords}
                  icon={createDisasterIcon(inc.type, inc.severity)}
                  eventHandlers={{
                    click: () => onSelectIncident(inc),
                  }}
                >
                  <Popup>
                    <div className="p-1 space-y-1.5 font-mono text-[10px] w-48">
                      <div className="font-bold uppercase text-accent-mint">{inc.title}</div>
                      <div className="flex gap-1.5">
                        <span className="bg-bg-forest px-1 rounded uppercase tracking-wider text-[8px]">
                          {config.name}
                        </span>
                        <span className="bg-bg-forest px-1 rounded uppercase tracking-wider text-[8px]">
                          {inc.severity}
                        </span>
                      </div>
                      {inc.description && <p className="text-accent-sage/80 leading-normal">{inc.description}</p>}
                      {inc.credibilityScore !== undefined && (
                        <div className="text-[9px] text-success-green border-t border-accent-sage/10 pt-1">
                          CREDIBILITY: {Math.round(inc.credibilityScore * 100)}%
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>

                {/* Render danger zone radius circle for active alerts */}
                {activeLayers.dangerZones && inc.severity === 'critical' && (
                  <Circle
                    center={coords}
                    radius={15000} // 15km
                    pathOptions={{
                      color: '#EF4444',
                      fillColor: '#EF4444',
                      fillOpacity: 0.1,
                      weight: 1,
                      dashArray: '5, 5',
                    }}
                  />
                )}
                {activeLayers.dangerZones && inc.severity === 'high' && (
                  <Circle
                    center={coords}
                    radius={8000} // 8km
                    pathOptions={{
                      color: '#F97316',
                      fillColor: '#F97316',
                      fillOpacity: 0.08,
                      weight: 1,
                      dashArray: '5, 5',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}

        {/* Render Shelters */}
        {activeLayers.shelters &&
          shelters.map((shelter) => {
            const coords: [number, number] = [
              shelter.location.coordinates[1],
              shelter.location.coordinates[0],
            ];
            return (
              <Marker key={shelter._id || shelter.id} position={coords} icon={shelterIcon}>
                <Popup>
                  <div className="p-1 space-y-1 font-mono text-[10px] w-44">
                    <div className="font-bold text-info-cyan uppercase">{shelter.name}</div>
                    <div className="text-[9px] text-accent-sage/85">{shelter.address}</div>
                    <div className="text-[9px] border-t border-accent-sage/10 pt-1">
                      CAPACITY: {shelter.currentOccupancy}/{shelter.capacity}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Render Rescue Teams */}
        {activeLayers.rescueTeams &&
          rescueTeams.map((team) => {
            const coords: [number, number] = [
              team.currentLocation.coordinates[1],
              team.currentLocation.coordinates[0],
            ];
            return (
              <Marker key={team._id || team.id} position={coords} icon={rescueTeamIcon}>
                <Popup>
                  <div className="p-1 space-y-1 font-mono text-[10px] w-44">
                    <div className="font-bold text-success-green uppercase">{team.name}</div>
                    <div className="text-[9px] text-accent-sage/85">STATUS: {team.status.toUpperCase()}</div>
                    <div className="text-[9px] border-t border-accent-sage/10 pt-1">
                      MEMBERS: {team.membersCount} // {team.vehicleType}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}
