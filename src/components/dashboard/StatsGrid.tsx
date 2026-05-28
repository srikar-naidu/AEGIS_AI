'use client';

import React from 'react';
import {
  Activity,
  AlertTriangle,
  Users,
  Home,
  TrendingUp,
  ShieldCheck,
  Radio,
  Zap,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Incident, RescueTeam, Shelter, Alert } from '../../lib/types/incidents';

interface StatsGridProps {
  incidents: Incident[];
  rescueTeams: RescueTeam[];
  shelters: Shelter[];
  alerts: Alert[];
  isConnected: boolean;
}

interface StatCard {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  glowClass: string;
  subtext?: string;
}

export function StatsGrid({
  incidents,
  rescueTeams,
  shelters,
  alerts,
  isConnected,
}: StatsGridProps) {
  const activeIncidents = incidents.filter(
    (i) => i.status === 'active' || i.status === 'monitoring'
  );
  const criticalCount = incidents.filter((i) => i.severity === 'critical').length;
  const deployedTeams = rescueTeams.filter((t) => t.status === 'deployed').length;
  const openShelters = shelters.filter((s) => s.status === 'open').length;
  const activeAlerts = alerts.filter((a) => a.isActive).length;
  const totalCapacity = shelters.reduce((sum, s) => sum + s.capacity, 0);
  const totalOccupancy = shelters.reduce((sum, s) => sum + s.currentOccupancy, 0);
  const verifiedCount = incidents.filter(
    (i) => i.credibilityScore && i.credibilityScore >= 0.7
  ).length;

  const stats: StatCard[] = [
    {
      label: 'ACTIVE EVENTS',
      value: activeIncidents.length,
      icon: Activity,
      color: 'text-emergency-red',
      glowClass: criticalCount > 0 ? 'border-emergency-red/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-accent-sage/15',
      subtext: `${criticalCount} critical`,
    },
    {
      label: 'LIVE ALERTS',
      value: activeAlerts,
      icon: AlertTriangle,
      color: 'text-emergency-amber',
      glowClass: activeAlerts > 5 ? 'border-emergency-amber/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-accent-sage/15',
      subtext: `${alerts.length} total`,
    },
    {
      label: 'RESCUE OPS',
      value: deployedTeams,
      icon: Users,
      color: 'text-success-green',
      glowClass: 'border-accent-sage/15',
      subtext: `${rescueTeams.length} teams total`,
    },
    {
      label: 'SHELTERS OPEN',
      value: openShelters,
      icon: Home,
      color: 'text-info-cyan',
      glowClass: 'border-accent-sage/15',
      subtext: totalCapacity > 0 ? `${Math.round((totalOccupancy / totalCapacity) * 100)}% capacity` : 'No data',
    },
    {
      label: 'AI VERIFIED',
      value: verifiedCount,
      icon: ShieldCheck,
      color: 'text-accent-sage',
      glowClass: 'border-accent-sage/15',
      subtext: `${incidents.length > 0 ? Math.round((verifiedCount / incidents.length) * 100) : 0}% verified`,
    },
    {
      label: 'SOCKET FEED',
      value: isConnected ? 'ONLINE' : 'OFFLINE',
      icon: isConnected ? Radio : Zap,
      color: isConnected ? 'text-success-green' : 'text-emergency-red',
      glowClass: isConnected
        ? 'border-success-green/20 shadow-[0_0_12px_rgba(16,185,129,0.08)]'
        : 'border-emergency-red/20 shadow-[0_0_12px_rgba(239,68,68,0.08)]',
      subtext: isConnected ? 'Real-time active' : 'Reconnecting...',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={clsx(
              'relative p-3.5 rounded-lg border bg-bg-deep/60 backdrop-blur-sm font-mono transition-all duration-300 hover:bg-bg-deep/80 group overflow-hidden',
              stat.glowClass
            )}
          >
            {/* Corner accent */}
            <div className="absolute top-0 left-0 w-6 h-[1px] bg-accent-sage/20 group-hover:bg-accent-sage/40 transition-colors" />
            <div className="absolute top-0 left-0 w-[1px] h-6 bg-accent-sage/20 group-hover:bg-accent-sage/40 transition-colors" />

            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] text-accent-sage/60 uppercase tracking-widest">
                {stat.label}
              </span>
              <Icon className={clsx('h-3.5 w-3.5', stat.color)} />
            </div>

            <div className={clsx('text-xl font-black tracking-tight', stat.color)}>
              {stat.value}
            </div>

            {stat.subtext && (
              <div className="text-[9px] text-accent-sage/50 mt-1 uppercase tracking-wider">
                {stat.subtext}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default StatsGrid;
