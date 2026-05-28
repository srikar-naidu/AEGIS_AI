'use client';

import React, { useState } from 'react';
import { Search, Filter, ChevronRight, MapPin, Clock, ShieldCheck, ArrowUpDown } from 'lucide-react';
import { clsx } from 'clsx';
import { Incident, DisasterType } from '../../lib/types/incidents';
import { getDisasterConfig, DISASTER_CONFIGS } from '../../lib/constants/disaster-types';
import { PulsingDot } from '../shared/PulsingDot';

interface IncidentsSidebarProps {
  incidents: Incident[];
  selectedIncident: Incident | null;
  onSelectIncident: (inc: Incident) => void;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const severityColor: Record<string, string> = {
  critical: 'text-emergency-red',
  high: 'text-emergency-orange',
  medium: 'text-emergency-amber',
  low: 'text-success-green',
};

const severityBg: Record<string, string> = {
  critical: 'bg-emergency-red/10 border-emergency-red/25',
  high: 'bg-emergency-orange/10 border-emergency-orange/25',
  medium: 'bg-emergency-amber/10 border-emergency-amber/25',
  low: 'bg-success-green/10 border-success-green/25',
};

export function IncidentsSidebar({
  incidents,
  selectedIncident,
  onSelectIncident,
}: IncidentsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'severity' | 'time'>('severity');

  const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  const filtered = incidents
    .filter((inc) => {
      if (filterType !== 'all' && inc.type !== filterType) return false;
      if (filterSeverity !== 'all' && inc.severity !== filterSeverity) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          inc.title.toLowerCase().includes(q) ||
          inc.type.toLowerCase().includes(q) ||
          inc.description?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'severity') {
        const aSev = sevOrder[a.severity as keyof typeof sevOrder] ?? 4;
        const bSev = sevOrder[b.severity as keyof typeof sevOrder] ?? 4;
        if (aSev !== bSev) return aSev - bSev;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const disasterTypes = Object.keys(DISASTER_CONFIGS);

  return (
    <div className="flex flex-col h-full bg-bg-abyss border-r border-accent-sage/10">
      {/* Header */}
      <div className="p-3 border-b border-accent-sage/10">
        <div className="flex items-center justify-between mb-2.5">
          <span className="font-mono text-[10px] text-accent-sage/70 uppercase tracking-widest flex items-center gap-1.5">
            <PulsingDot color="red" size="sm" />
            INCIDENT FEED
          </span>
          <span className="font-mono text-[9px] text-accent-sage/50">
            {filtered.length}/{incidents.length}
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-2.5">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-accent-sage/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incidents..."
            className="w-full pl-8 pr-3 py-2 bg-bg-deep/60 border border-accent-sage/15 rounded-md font-mono text-[10px] text-accent-mint placeholder:text-accent-sage/35 focus:outline-none focus:border-accent-sage/40 focus:ring-1 focus:ring-accent-sage/20 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex-1 px-2 py-1.5 bg-bg-deep/60 border border-accent-sage/15 rounded text-[9px] font-mono text-accent-sage uppercase tracking-wider focus:outline-none focus:border-accent-sage/40 appearance-none cursor-pointer"
          >
            <option value="all">ALL TYPES</option>
            {disasterTypes.map((type) => (
              <option key={type} value={type}>
                {getDisasterConfig(type).name.toUpperCase()}
              </option>
            ))}
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="flex-1 px-2 py-1.5 bg-bg-deep/60 border border-accent-sage/15 rounded text-[9px] font-mono text-accent-sage uppercase tracking-wider focus:outline-none focus:border-accent-sage/40 appearance-none cursor-pointer"
          >
            <option value="all">ALL SEV</option>
            <option value="critical">CRITICAL</option>
            <option value="high">HIGH</option>
            <option value="medium">MEDIUM</option>
            <option value="low">LOW</option>
          </select>

          <button
            onClick={() => setSortBy(sortBy === 'severity' ? 'time' : 'severity')}
            className="px-2 py-1.5 bg-bg-deep/60 border border-accent-sage/15 rounded text-[9px] font-mono text-accent-sage hover:text-accent-mint hover:bg-bg-forest/40 transition-all"
            title={`Sort by ${sortBy === 'severity' ? 'time' : 'severity'}`}
          >
            <ArrowUpDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Incident List */}
      <div className="flex-1 overflow-y-auto py-1.5 space-y-1 px-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Filter className="h-5 w-5 text-accent-sage/30 mb-2" />
            <span className="font-mono text-[10px] text-accent-sage/45 uppercase tracking-wider">
              No incidents match filters
            </span>
          </div>
        ) : (
          filtered.map((inc) => {
            const config = getDisasterConfig(inc.type);
            const isSelected = selectedIncident?._id === inc._id || selectedIncident?.id === inc.id;

            return (
              <button
                key={inc._id || inc.id}
                onClick={() => onSelectIncident(inc)}
                className={clsx(
                  'w-full text-left p-2.5 rounded-md border font-mono transition-all duration-200 group',
                  isSelected
                    ? 'bg-bg-forest/50 border-accent-sage/35 shadow-[0_0_10px_rgba(142,182,155,0.06)]'
                    : 'bg-bg-deep/30 border-accent-sage/8 hover:bg-bg-deep/60 hover:border-accent-sage/20'
                )}
              >
                <div className="flex items-start gap-2">
                  {/* Severity dot */}
                  <div className="mt-1 shrink-0 relative">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: config.hexColor }}
                    />
                    {inc.severity === 'critical' && (
                      <div
                        className="absolute inset-0 h-2 w-2 rounded-full animate-ping opacity-40"
                        style={{ backgroundColor: config.hexColor }}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <div className="text-[10px] text-accent-mint font-semibold truncate mb-1 group-hover:text-white transition-colors">
                      {inc.title}
                    </div>

                    {/* Tags */}
                    <div className="flex items-center gap-1 flex-wrap mb-1">
                      <span className="text-[8px] bg-bg-forest/80 px-1 py-0.5 rounded uppercase tracking-wider text-accent-sage/70">
                        {config.name}
                      </span>
                      <span className={clsx('text-[8px] px-1 py-0.5 rounded uppercase tracking-wider border', severityBg[inc.severity])}>
                        <span className={severityColor[inc.severity]}>{inc.severity}</span>
                      </span>
                      {inc.credibilityScore !== undefined && inc.credibilityScore >= 0.7 && (
                        <span className="text-[8px] text-success-green flex items-center gap-0.5">
                          <ShieldCheck className="h-2.5 w-2.5" />
                          AI
                        </span>
                      )}
                    </div>

                    {/* Footer: coords + time */}
                    <div className="flex items-center justify-between text-[8px] text-accent-sage/45">
                      <span className="flex items-center gap-0.5 truncate">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        {inc.location.coordinates[1].toFixed(2)}, {inc.location.coordinates[0].toFixed(2)}
                      </span>
                      <span className="flex items-center gap-0.5 shrink-0">
                        <Clock className="h-2.5 w-2.5" />
                        {timeAgo(inc.createdAt)}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className={clsx(
                    'h-3 w-3 mt-1 shrink-0 transition-all duration-200',
                    isSelected ? 'text-accent-mint' : 'text-accent-sage/30 group-hover:text-accent-sage/60'
                  )} />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default IncidentsSidebar;
