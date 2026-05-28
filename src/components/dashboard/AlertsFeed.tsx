'use client';

import React from 'react';
import {
  AlertTriangle,
  Clock,
  MapPin,
  ChevronRight,
  Flame,
  Waves,
  Activity,
  Wind,
  Snowflake,
  ThermometerSun,
  Mountain,
  Building2,
  Biohazard,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Alert } from '../../lib/types/incidents';
import { getDisasterConfig } from '../../lib/constants/disaster-types';

interface AlertsFeedProps {
  alerts: Alert[];
  maxItems?: number;
}

const severityStyles: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  critical: {
    bg: 'bg-emergency-red/5',
    border: 'border-emergency-red/25',
    text: 'text-emergency-red',
    dot: 'bg-emergency-red',
  },
  high: {
    bg: 'bg-emergency-orange/5',
    border: 'border-emergency-orange/25',
    text: 'text-emergency-orange',
    dot: 'bg-emergency-orange',
  },
  medium: {
    bg: 'bg-emergency-amber/5',
    border: 'border-emergency-amber/20',
    text: 'text-emergency-amber',
    dot: 'bg-emergency-amber',
  },
  low: {
    bg: 'bg-accent-sage/5',
    border: 'border-accent-sage/15',
    text: 'text-accent-sage',
    dot: 'bg-accent-sage',
  },
};

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

export function AlertsFeed({ alerts, maxItems = 8 }: AlertsFeedProps) {
  const sortedAlerts = [...alerts]
    .sort((a, b) => {
      // Critical first, then by date
      const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const aSev = sevOrder[a.severity as keyof typeof sevOrder] ?? 4;
      const bSev = sevOrder[b.severity as keyof typeof sevOrder] ?? 4;
      if (aSev !== bSev) return aSev - bSev;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, maxItems);

  if (sortedAlerts.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 border border-accent-sage/10 bg-bg-deep/30 rounded-lg">
        <div className="h-10 w-10 rounded-full border border-accent-sage/20 bg-bg-abyss/60 flex items-center justify-center mb-3">
          <AlertTriangle className="h-4 w-4 text-accent-sage/50" />
        </div>
        <span className="font-mono text-[10px] text-accent-sage/55 uppercase tracking-wider text-center">
          NO ACTIVE ADVISORIES IN SECTOR
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
      {sortedAlerts.map((alert, idx) => {
        const severity = severityStyles[alert.severity] || severityStyles.low;
        const config = getDisasterConfig(alert.type);

        return (
          <div
            key={alert._id || alert.id || idx}
            className={clsx(
              'relative p-3 rounded-lg border font-mono transition-all duration-200 hover:bg-bg-deep/50 cursor-pointer group',
              severity.bg,
              severity.border,
              alert.severity === 'critical' && 'animate-pulse'
            )}
          >
            {/* Severity indicator bar */}
            <div className={clsx('absolute top-0 left-0 w-[2px] h-full rounded-l', severity.dot)} />

            <div className="flex items-start gap-2.5 ml-1.5">
              {/* Pulse dot */}
              <div className="mt-1 relative shrink-0">
                <div className={clsx('h-2 w-2 rounded-full', severity.dot)} />
                {alert.isActive && (
                  <div className={clsx('absolute inset-0 h-2 w-2 rounded-full animate-ping opacity-40', severity.dot)} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={clsx('text-[10px] font-bold uppercase tracking-wider truncate', severity.text)}>
                    {alert.title}
                  </span>
                  <span className="text-[8px] text-accent-sage/45 flex items-center gap-1 shrink-0">
                    <Clock className="h-2.5 w-2.5" />
                    {timeAgo(alert.createdAt)}
                  </span>
                </div>

                {/* Type badge + region */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[8px] bg-bg-forest/80 px-1.5 py-0.5 rounded uppercase tracking-wider text-accent-sage/80">
                    {config.name}
                  </span>
                  <span className={clsx('text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider', severity.bg, severity.text)}>
                    {alert.severity}
                  </span>
                  {alert.affectedRegion && (
                    <span className="text-[8px] text-accent-sage/50 flex items-center gap-0.5 truncate">
                      <MapPin className="h-2.5 w-2.5 shrink-0" />
                      {alert.affectedRegion}
                    </span>
                  )}
                </div>

                {/* Message preview */}
                <p className="text-[9px] text-accent-sage/65 leading-relaxed line-clamp-2">
                  {alert.message}
                </p>

                {/* Instructions */}
                {alert.instructions && (
                  <div className="mt-1.5 text-[8px] text-accent-sage/50 border-t border-accent-sage/10 pt-1.5 flex items-center gap-1">
                    <ChevronRight className="h-2.5 w-2.5 shrink-0 text-accent-sage/40 group-hover:text-accent-mint transition-colors" />
                    <span className="uppercase tracking-wider truncate">{alert.instructions}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AlertsFeed;
