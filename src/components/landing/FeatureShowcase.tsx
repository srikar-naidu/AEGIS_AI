'use client';

import React from 'react';
import { ShieldAlert, Map, Route, Radio, Users, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlowCard } from '../shared/GlowCard';

export function FeatureShowcase() {
  const features = [
    {
      title: 'AI Verification Core',
      description: 'Combines weather validation, GPS cross-referencing, image metadata, and satellite scans to identify fraudulent incident reports.',
      icon: Cpu,
      glow: 'mint' as const,
    },
    {
      title: 'Realtime GIS Dashboard',
      description: 'Full interactive OpenStreetMap overlay indicating live fires, storm paths, flooding rivers, and seismic activities globally.',
      icon: Map,
      glow: 'mint' as const,
    },
    {
      title: 'Emergency SOS Broadcasts',
      description: 'Instant alert feeds triggering geo-fenced push alerts, instructions, and route advisories to affected citizens.',
      icon: Radio,
      glow: 'amber' as const,
    },
    {
      title: 'Rescue Coordination Center',
      description: 'Manage safe evacuation paths, monitor rescue team dispatches, and coordinate safe zones/shelter allocation live.',
      icon: Route,
      glow: 'mint' as const,
    },
    {
      title: 'Citizen Portal',
      description: 'Allows on-site citizens to upload media, pinpoint coordinates, check in safe statuses, and request immediate SOS aid.',
      icon: Users,
      glow: 'red' as const,
    },
    {
      title: 'Spread Predictions',
      description: 'Estimates probable wildfire expansions, storm projections, flood levels, and volcanic ash trails using automated models.',
      icon: ShieldAlert,
      glow: 'orange' as const,
    },
  ];

  return (
    <section className="py-20 relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center space-y-3 mb-16">
        <span className="font-mono text-[9px] uppercase tracking-widest text-accent-sage/75">
          [System Architect Capabilities]
        </span>
        <h2 className="text-2xl sm:text-4xl font-black text-accent-mint font-heading uppercase">
          Proactive Disaster Intelligence
        </h2>
        <div className="h-[1px] w-20 bg-accent-sage/30 mx-auto" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
              key={feat.title}
            >
              <GlowCard glowColor={feat.glow} className="h-full flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-accent-sage/15 bg-bg-abyss/85 text-accent-sage group-hover:text-accent-mint group-hover:border-accent-sage/35 transition-all duration-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading text-base font-bold text-accent-mint uppercase">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-accent-sage/75 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              </GlowCard>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

export default FeatureShowcase;
