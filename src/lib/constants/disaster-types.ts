import { AlertOctagon, Flame, ShieldAlert, Waves, Compass, Activity, ShieldX, HelpCircle } from 'lucide-react';
import React from 'react';

export interface DisasterConfig {
  id: string;
  name: string;
  color: string; // Tailwind class
  hexColor: string; // Hex color for Map markers and heatmaps
  glowColor: string;
  icon: string; // Identifier for UI icon
  description: string;
}

export const DISASTER_CONFIGS: Record<string, DisasterConfig> = {
  earthquake: {
    id: 'earthquake',
    name: 'Earthquake',
    color: 'emerald',
    hexColor: '#10B981', // green for seismic
    glowColor: 'rgba(16, 185, 129, 0.4)',
    icon: 'activity',
    description: 'Sudden shaking of the ground, caused by volcanic activity or movement of the earth\'s crust.',
  },
  flood: {
    id: 'flood',
    name: 'Flood',
    color: 'cyan',
    hexColor: '#06B6D4', // cyan for water
    glowColor: 'rgba(6, 182, 212, 0.4)',
    icon: 'waves',
    description: 'An overflowing of a large amount of water beyond its normal confines, especially over what is normally dry land.',
  },
  wildfire: {
    id: 'wildfire',
    name: 'Wildfire',
    color: 'red',
    hexColor: '#EF4444', // red for fire
    glowColor: 'rgba(239, 68, 68, 0.4)',
    icon: 'flame',
    description: 'A large, destructive fire that spreads quickly over woodland or brush.',
  },
  tsunami: {
    id: 'tsunami',
    name: 'Tsunami',
    color: 'blue',
    hexColor: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    icon: 'waves',
    description: 'A long, high sea wave caused by an earthquake or other disturbance.',
  },
  cyclone: {
    id: 'cyclone',
    name: 'Cyclone / Storm',
    color: 'orange',
    hexColor: '#F97316',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    icon: 'compass',
    description: 'A system of winds rotating inward to an area of low atmospheric pressure.',
  },
  volcano: {
    id: 'volcano',
    name: 'Volcanic Eruption',
    color: 'red',
    hexColor: '#EF4444',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    icon: 'flame',
    description: 'An eruption of lava, tephra, and various gases from a volcanic vent.',
  },
  landslide: {
    id: 'landslide',
    name: 'Landslide',
    color: 'amber',
    hexColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    icon: 'alert-octagon',
    description: 'The sliding down of a mass of earth or rock from a mountain or cliff.',
  },
  tornado: {
    id: 'tornado',
    name: 'Tornado',
    color: 'orange',
    hexColor: '#F97316',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    icon: 'compass',
    description: 'A mobile, destructive vortex of violently rotating winds having the appearance of a funnel-shaped cloud.',
  },
  blizzard: {
    id: 'blizzard',
    name: 'Blizzard / Storm',
    color: 'sky',
    hexColor: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.4)',
    icon: 'compass',
    description: 'A severe snowstorm with high winds and low visibility.',
  },
  drought: {
    id: 'drought',
    name: 'Drought',
    color: 'amber',
    hexColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    icon: 'alert-octagon',
    description: 'A prolonged period of abnormally low rainfall, leading to a shortage of water.',
  },
  heatwave: {
    id: 'heatwave',
    name: 'Heatwave',
    color: 'red',
    hexColor: '#EF4444',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    icon: 'flame',
    description: 'A prolonged period of abnormally hot weather.',
  },
  storm_surge: {
    id: 'storm_surge',
    name: 'Storm Surge',
    color: 'cyan',
    hexColor: '#06B6D4',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    icon: 'waves',
    description: 'A rising of the sea as a result of atmospheric pressure changes and wind associated with a storm.',
  },
  structural_collapse: {
    id: 'structural_collapse',
    name: 'Structural Collapse',
    color: 'rose',
    hexColor: '#F43F5E',
    glowColor: 'rgba(244, 63, 94, 0.4)',
    icon: 'shield-x',
    description: 'The failure and breakdown of building components resulting in collapse.',
  },
  industrial_hazard: {
    id: 'industrial_hazard',
    name: 'Industrial Hazard',
    color: 'rose',
    hexColor: '#F43F5E',
    glowColor: 'rgba(244, 63, 94, 0.4)',
    icon: 'shield-alert',
    description: 'Accidents involving chemical spills, leaks, explosions, or radiological releases.',
  },
};

export function getDisasterConfig(type: string): DisasterConfig {
  return (
    DISASTER_CONFIGS[type] || {
      id: type,
      name: type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      color: 'slate',
      hexColor: '#64748B',
      glowColor: 'rgba(100, 116, 139, 0.4)',
      icon: 'help-circle',
      description: 'Disaster event.',
    }
  );
}
