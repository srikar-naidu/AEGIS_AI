'use client';

import React from 'react';
import { Clock, Thermometer, Orbit, ShieldCheck, FileSearch } from 'lucide-react';
import { motion } from 'framer-motion';

export function AIExplainer() {
  const checks = [
    {
      name: 'Temporal Assessment',
      desc: 'Compares report ingestion stamp with historical curves of disaster telemetry.',
      icon: Clock,
      weight: '15%',
    },
    {
      name: 'Spatial Geofencing',
      desc: 'Performs intersection checks against verified active hazard polygons.',
      icon: Orbit,
      weight: '20%',
    },
    {
      name: 'Micro-Meteo Consistency',
      desc: 'Cross-checks reported conditions against Open-Meteo actual parameters.',
      icon: Thermometer,
      weight: '20%',
    },
    {
      name: 'Agency Cross-Analysis',
      desc: 'Searches matching alerts inside USGS, NASA FIRMS, and GDACS feeds within 50km.',
      icon: ShieldCheck,
      weight: '25%',
    },
    {
      name: 'NLP Logic Audit',
      desc: 'Groq LLM inspects report description text for urgency indicators and contradictions.',
      icon: FileSearch,
      weight: '20%',
    },
  ];

  return (
    <section className="py-20 relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Side text */}
        <div className="space-y-6">
          <span className="font-mono text-[9px] uppercase tracking-widest text-accent-sage/75">
            [Verification Algorithm Breakdown]
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-accent-mint font-heading uppercase leading-tight">
            How AEGIS Filters Misinformation
          </h2>
          <p className="text-xs text-accent-sage/75 leading-relaxed font-sans">
            Fake crisis reports delay responders and endanger lives. AEGIS uses a multi-faceted verification system that calculates a composite reliability score from multiple independent channels before sounding public evacuation alarms.
          </p>
          <div className="p-5 border border-accent-sage/15 bg-bg-deep/45 rounded-lg flex items-center gap-4">
            <div className="h-10 w-10 shrink-0 rounded bg-success-green/10 border border-success-green/20 flex items-center justify-center text-success-green">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-heading text-xs font-bold text-accent-mint uppercase">
                Consensus Verification
              </h4>
              <p className="text-[10px] text-accent-sage/70 leading-relaxed mt-0.5">
                Only reports passing strict spatial, meteorological, and algorithmic thresholds are mapped as active priority emergencies.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side visual list */}
        <div className="space-y-4">
          {checks.map((check, idx) => {
            const Icon = check.icon;
            return (
              <motion.div
                initial={{ opacity: 0, x: 25 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                key={check.name}
                className="p-4 border border-accent-sage/10 bg-bg-deep/40 rounded-lg flex items-center justify-between hover:border-accent-sage/20 hover:bg-bg-deep/60 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-lg border border-accent-sage/10 bg-bg-abyss/80 flex items-center justify-center text-accent-sage group-hover:text-accent-mint group-hover:border-accent-sage/30 transition-all duration-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-heading text-xs font-bold text-accent-mint uppercase">
                      {check.name}
                    </h3>
                    <p className="text-[10px] text-accent-sage/65 mt-0.5 leading-relaxed max-w-xs sm:max-w-sm">
                      {check.desc}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-[9px] text-accent-sage/40 block uppercase select-none">
                    WEIGHT
                  </span>
                  <span className="font-mono text-xs font-bold text-accent-mint">
                    {check.weight}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default AIExplainer;
