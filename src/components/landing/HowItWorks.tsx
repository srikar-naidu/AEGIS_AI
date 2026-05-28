'use client';

import React from 'react';
import { FileUp, Eye, BellRing, HeartHandshake } from 'lucide-react';
import { motion } from 'framer-motion';

export function HowItWorks() {
  const steps = [
    {
      step: '01',
      title: 'Report Incident',
      description: 'Citizens submit reports detailing location coordinates, disaster type, urgency levels, and upload real-time images or videos.',
      icon: FileUp,
    },
    {
      step: '02',
      title: 'AI Verification',
      description: 'The engine cross-checks timestamps, weather conditions, known satellite hotspots, and conducts visual image analysis.',
      icon: Eye,
    },
    {
      step: '03',
      title: 'Geo-Fenced Alerts',
      description: 'Once verified, active boundaries are computed, and emergency broadcasts are distributed to near-location responders.',
      icon: BellRing,
    },
    {
      step: '04',
      title: 'Mobilized Rescue',
      description: 'Response forces allocate shelters, compute optimal driving routes, deploy resources, and direct citizens along safe zones.',
      icon: HeartHandshake,
    },
  ];

  return (
    <section className="py-20 relative z-20 bg-bg-deep/20 border-y border-accent-sage/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-16">
          <span className="font-mono text-[9px] uppercase tracking-widest text-accent-sage/75">
            [Tactical Workflow Operations]
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-accent-mint font-heading uppercase">
            Platform Response Cycle
          </h2>
          <div className="h-[1px] w-20 bg-accent-sage/30 mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connector Line for Desktop */}
          <div className="hidden lg:block absolute top-[52px] left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-accent-sage/15 to-transparent pointer-events-none" />

          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                key={step.title}
                className="flex flex-col items-center text-center space-y-4 relative group"
              >
                {/* Step indicator */}
                <span className="font-mono text-xs text-accent-sage/40 group-hover:text-accent-sage/70 transition-colors select-none">
                  PHASE_{step.step}
                </span>

                {/* Circle Icon Container */}
                <div className="h-14 w-14 rounded-full border border-accent-sage/20 bg-bg-abyss flex items-center justify-center text-accent-sage group-hover:border-accent-sage group-hover:text-accent-mint group-hover:shadow-[0_0_20px_rgba(142,182,155,0.15)] transition-all duration-300 relative z-10">
                  <Icon className="h-5 w-5" />
                </div>

                <div className="space-y-1">
                  <h3 className="font-heading text-sm font-bold text-accent-mint uppercase">
                    {step.title}
                  </h3>
                  <p className="text-[11px] text-accent-sage/70 leading-relaxed px-4">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
