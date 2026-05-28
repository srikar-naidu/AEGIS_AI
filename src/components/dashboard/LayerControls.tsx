'use client';

import React from 'react';
import { clsx } from 'clsx';
import {
  Layers,
  AlertTriangle,
  Home,
  Users,
  CircleDot,
  Route,
  Eye,
  EyeOff,
} from 'lucide-react';

interface LayerControlsProps {
  activeLayers: {
    incidents: boolean;
    shelters: boolean;
    rescueTeams: boolean;
    dangerZones: boolean;
    routes: boolean;
  };
  onToggleLayer: (layer: keyof LayerControlsProps['activeLayers']) => void;
}

export function LayerControls({ activeLayers, onToggleLayer }: LayerControlsProps) {
  const layers = [
    {
      key: 'incidents' as const,
      label: 'Incidents',
      icon: AlertTriangle,
      color: 'text-emergency-red',
      activeColor: 'border-emergency-red/30 bg-emergency-red/8',
    },
    {
      key: 'shelters' as const,
      label: 'Shelters',
      icon: Home,
      color: 'text-info-cyan',
      activeColor: 'border-info-cyan/30 bg-info-cyan/8',
    },
    {
      key: 'rescueTeams' as const,
      label: 'Rescue',
      icon: Users,
      color: 'text-success-green',
      activeColor: 'border-success-green/30 bg-success-green/8',
    },
    {
      key: 'dangerZones' as const,
      label: 'Zones',
      icon: CircleDot,
      color: 'text-emergency-amber',
      activeColor: 'border-emergency-amber/30 bg-emergency-amber/8',
    },
    {
      key: 'routes' as const,
      label: 'Routes',
      icon: Route,
      color: 'text-accent-sage',
      activeColor: 'border-accent-sage/30 bg-accent-sage/8',
    },
  ];

  return (
    <div className="glass-panel rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2.5">
        <Layers className="h-3 w-3 text-accent-sage/60" />
        <span className="font-mono text-[9px] text-accent-sage/60 uppercase tracking-widest">
          MAP LAYERS
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {layers.map((layer) => {
          const Icon = layer.icon;
          const isActive = activeLayers[layer.key];

          return (
            <button
              key={layer.key}
              onClick={() => onToggleLayer(layer.key)}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded border font-mono text-[9px] uppercase tracking-wider transition-all duration-200',
                isActive
                  ? `${layer.activeColor} ${layer.color}`
                  : 'border-accent-sage/10 text-accent-sage/40 hover:text-accent-sage/70 hover:border-accent-sage/20'
              )}
            >
              <Icon className="h-3 w-3" />
              <span>{layer.label}</span>
              {isActive ? (
                <Eye className="h-2.5 w-2.5 ml-0.5 opacity-60" />
              ) : (
                <EyeOff className="h-2.5 w-2.5 ml-0.5 opacity-40" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default LayerControls;
