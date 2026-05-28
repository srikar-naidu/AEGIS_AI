'use client';

import React from 'react';
import { clsx } from 'clsx';

interface PulsingDotProps {
  color?: 'mint' | 'red' | 'orange' | 'amber' | 'cyan' | 'green';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PulsingDot({ color = 'mint', size = 'md', className }: PulsingDotProps) {
  const colorMap = {
    mint: 'bg-accent-mint',
    red: 'bg-emergency-red',
    orange: 'bg-emergency-orange',
    amber: 'bg-emergency-amber',
    cyan: 'bg-info-cyan',
    green: 'bg-success-green',
  };

  const glowMap = {
    mint: 'bg-accent-mint/40',
    red: 'bg-emergency-red/40',
    orange: 'bg-emergency-orange/40',
    amber: 'bg-emergency-amber/40',
    cyan: 'bg-info-cyan/40',
    green: 'bg-success-green/40',
  };

  const sizeMap = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2.5 h-2.5',
    lg: 'w-4 h-4',
  };

  return (
    <span className={clsx('relative flex', sizeMap[size], className)}>
      <span className={clsx('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', glowMap[color])} />
      <span className={clsx('relative inline-flex rounded-full', sizeMap[size], colorMap[color])} />
    </span>
  );
}

export default PulsingDot;
