'use client';

import React from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glowColor?: 'mint' | 'red' | 'orange' | 'amber' | 'none';
  interactive?: boolean;
}

export function GlowCard({
  children,
  className,
  glowColor = 'mint',
  interactive = true,
  ...props
}: GlowCardProps) {
  const glowStyles = {
    mint: 'hover:border-accent-sage/40 hover:shadow-[0_0_20px_rgba(142,182,155,0.15)]',
    red: 'hover:border-emergency-red/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)]',
    orange: 'hover:border-emergency-orange/40 hover:shadow-[0_0_20px_rgba(249,115,22,0.2)]',
    amber: 'hover:border-emergency-amber/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]',
    none: '',
  };

  return (
    <motion.div
      whileHover={interactive ? { y: -2 } : {}}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={clsx(
        'glass-panel bg-bg-deep/80 rounded-lg p-5 border border-accent-sage/15 transition-all duration-300 relative overflow-hidden group',
        interactive && glowStyles[glowColor],
        className
      )}
      {...props}
    >
      {/* Corner lights */}
      <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-accent-sage/30 group-hover:border-accent-sage transition-colors duration-300" />
      <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-accent-sage/30 group-hover:border-accent-sage transition-colors duration-300" />
      <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-accent-sage/30 group-hover:border-accent-sage transition-colors duration-300" />
      <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-accent-sage/30 group-hover:border-accent-sage transition-colors duration-300" />

      {/* Decorative scanline overlay on hover */}
      {interactive && (
        <div className="absolute inset-0 bg-gradient-to-b from-accent-sage/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}

      {children}
    </motion.div>
  );
}

export default GlowCard;
