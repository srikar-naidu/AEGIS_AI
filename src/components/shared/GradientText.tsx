'use client';

import React from 'react';
import { clsx } from 'clsx';

interface GradientTextProps {
  children: React.ReactNode;
  variant?: 'mint-sage' | 'red-orange' | 'cyan-blue';
  className?: string;
}

export function GradientText({ children, variant = 'mint-sage', className }: GradientTextProps) {
  const variantStyles = {
    'mint-sage': 'from-accent-mint via-accent-sage to-accent-mint',
    'red-orange': 'from-emergency-red via-emergency-orange to-emergency-red',
    'cyan-blue': 'from-info-cyan via-accent-sage to-[#3B82F6]',
  };

  return (
    <span
      className={clsx(
        'bg-clip-text text-transparent bg-gradient-to-r font-bold',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export default GradientText;
