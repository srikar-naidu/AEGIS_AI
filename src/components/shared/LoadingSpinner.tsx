'use client';

import React from 'react';
import { clsx } from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export function LoadingSpinner({ size = 'md', className, label }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 'w-5 h-5 border-2',
    md: 'w-10 h-10 border-[3px]',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3', className)}>
      <div className="relative flex items-center justify-center">
        {/* Outer glowing ring */}
        <div
          className={clsx(
            'rounded-full border-accent-sage/10 animate-pulse absolute',
            size === 'sm' ? 'w-7 h-7' : size === 'md' ? 'w-14 h-14' : 'w-22 h-22'
          )}
        />
        {/* Spinner */}
        <div
          className={clsx(
            'rounded-full border-t-accent-mint border-r-transparent border-b-accent-sage/20 border-l-transparent animate-spin',
            sizeMap[size]
          )}
        />
      </div>
      {label && (
        <span className="font-mono text-xs text-accent-sage uppercase tracking-widest animate-pulse">
          {label}
        </span>
      )}
    </div>
  );
}

export default LoadingSpinner;
