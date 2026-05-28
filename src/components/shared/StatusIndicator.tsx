'use client';

import React from 'react';
import { clsx } from 'clsx';

interface StatusIndicatorProps {
  type: 'severity' | 'credibility' | 'status';
  value: string;
  className?: string;
}

export function StatusIndicator({ type, value, className }: StatusIndicatorProps) {
  const getStyles = () => {
    const val = value.toLowerCase();

    // Severity mapping
    if (type === 'severity') {
      switch (val) {
        case 'critical':
          return 'bg-emergency-red/10 text-emergency-red border-emergency-red/25';
        case 'high':
          return 'bg-emergency-orange/10 text-emergency-orange border-emergency-orange/25';
        case 'medium':
          return 'bg-emergency-amber/10 text-emergency-amber border-emergency-amber/25';
        case 'low':
          return 'bg-accent-sage/10 text-accent-sage border-accent-sage/25';
        default:
          return 'bg-bg-pine/20 text-accent-sage border-bg-pine/30';
      }
    }

    // Credibility classification mapping
    if (type === 'credibility') {
      switch (val) {
        case 'highly_reliable':
        case 'highly reliable':
          return 'bg-success-green/10 text-success-green border-success-green/25';
        case 'likely_true':
        case 'likely true':
          return 'bg-info-cyan/10 text-info-cyan border-info-cyan/25';
        case 'needs_verification':
        case 'needs verification':
          return 'bg-emergency-amber/10 text-emergency-amber border-emergency-amber/25';
        case 'suspicious':
          return 'bg-emergency-red/10 text-emergency-red border-emergency-red/25';
        default:
          return 'bg-bg-pine/20 text-accent-sage border-bg-pine/30';
      }
    }

    // Active status mapping
    if (type === 'status') {
      switch (val) {
        case 'active':
          return 'bg-emergency-red/15 text-emergency-red border-emergency-red/30 animate-pulse';
        case 'monitoring':
          return 'bg-info-cyan/15 text-info-cyan border-info-cyan/30';
        case 'contained':
          return 'bg-emergency-amber/15 text-emergency-amber border-emergency-amber/30';
        case 'resolved':
          return 'bg-success-green/15 text-success-green border-success-green/30';
        case 'false_alarm':
          return 'bg-bg-pine/30 text-accent-sage border-bg-pine/40';
        default:
          return 'bg-bg-pine/20 text-accent-sage border-bg-pine/30';
      }
    }

    return 'bg-bg-pine/20 text-accent-sage border-bg-pine/30';
  };

  const getLabel = () => {
    return value
      .replace(/_/g, ' ')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  return (
    <span
      className={clsx(
        'px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-mono font-semibold border inline-flex items-center gap-1.5',
        getStyles(),
        className
      )}
    >
      {getLabel()}
    </span>
  );
}

export default StatusIndicator;
