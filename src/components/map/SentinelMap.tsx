'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, ImageOverlay, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SentinelMapProps {
  onBoundsChange: (bbox: number[]) => void;
  satelliteUrl: string | null;
  satelliteBounds: [[number, number], [number, number]] | null;
  overlayOpacity: number;
}

// Component to handle map events (panning/zooming) and report bbox to parent
function MapEvents({ onBoundsChange }: { onBoundsChange: (bbox: number[]) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      // bbox format: [minX, minY, maxX, maxY]
      const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
      onBoundsChange(bbox);
    },
    zoomend: () => {
      const bounds = map.getBounds();
      const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
      onBoundsChange(bbox);
    },
  });

  // Initial bounds reporting
  useEffect(() => {
    const bounds = map.getBounds();
    const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
    onBoundsChange(bbox);
  }, [map, onBoundsChange]);

  return null;
}

export default function SentinelMap({ onBoundsChange, satelliteUrl, satelliteBounds, overlayOpacity }: SentinelMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-full flex items-center justify-center font-mono text-xs text-accent-sage animate-pulse bg-bg-abyss">
        [INITIALIZING MAP MODULE...]
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-bg-abyss">
      <MapContainer
        center={[20.5937, 78.9629]} // Default to Central India
        zoom={5}
        zoomControl={true}
        className="w-full h-full z-10"
      >
        <MapEvents onBoundsChange={onBoundsChange} />

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          className="dark-map-tiles"
        />

        {satelliteUrl && satelliteBounds && (
          <ImageOverlay
            url={satelliteUrl}
            bounds={satelliteBounds}
            opacity={overlayOpacity}
            zIndex={10}
          />
        )}
      </MapContainer>
    </div>
  );
}
