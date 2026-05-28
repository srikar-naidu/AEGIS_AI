'use client';

import React from 'react';
import { Radio, ShieldAlert, HeartHandshake, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedCounter } from '../shared/AnimatedCounter';

export function LiveStatsBar() {
  const stats = [
    {
      label: 'Disasters Monitored',
      value: 1249,
      icon: Radio,
      color: 'text-info-cyan',
      glow: 'shadow-[0_0_15px_rgba(6,182,212,0.15)]',
    },
    {
      label: 'Verified Reports',
      value: 843,
      icon: ShieldAlert,
      color: 'text-success-green',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    },
    {
      label: 'Active Rescuers',
      value: 382,
      icon: HeartHandshake,
      color: 'text-accent-mint',
      glow: 'shadow-[0_0_15px_rgba(214,239,226,0.15)]',
    },
    {
      label: 'Meters Tracked',
      value: 99.4,
      suffix: '%',
      decimals: true,
      icon: Eye,
      color: 'text-emergency-amber',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-20">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              key={stat.label}
              className="glass-panel bg-bg-deep/45 p-5 rounded-lg border border-accent-sage/10 flex items-center justify-between group hover:border-accent-sage/30 transition-all duration-300"
            >
              <div className="space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-widest text-accent-sage/65 select-none block">
                  {stat.label}
                </span>
                <span className="font-heading text-xl sm:text-2xl font-black text-accent-mint tracking-tight flex items-baseline">
                  {stat.decimals ? (
                    <span className="font-mono">{stat.value.toFixed(1)}{stat.suffix}</span>
                  ) : (
                    <AnimatedCounter value={stat.value} duration={1.5} suffix={stat.suffix} />
                  )}
                </span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent-sage/10 bg-bg-abyss/60 text-accent-sage group-hover:border-accent-sage/35 group-hover:text-accent-mint transition-colors duration-300">
                <Icon className="h-4 w-4" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default LiveStatsBar;
