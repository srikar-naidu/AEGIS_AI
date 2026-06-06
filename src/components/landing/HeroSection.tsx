'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, ArrowRight, Activity, Terminal, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { GradientText } from '../shared/GradientText';

export function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-[85vh] text-center px-4 overflow-hidden pt-12">
      {/* Cinematic grid lines backing */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accent-sage/5 via-transparent to-transparent pointer-events-none" />

      {/* Floating decorative elements */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-10 left-[10%] w-72 h-72 rounded-full bg-accent-sage/5 blur-[80px] pointer-events-none hidden md:block"
      />
      
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute bottom-10 right-[15%] w-96 h-96 rounded-full bg-bg-forest/20 blur-[100px] pointer-events-none hidden md:block"
      />

      <div className="max-w-4xl mx-auto z-10 space-y-6">
        {/* Cyber tag banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent-sage/20 bg-bg-deep/80 text-accent-sage text-[10px] uppercase tracking-widest font-mono glow-mint select-none"
        >
          <Shield className="h-3.5 w-3.5 animate-pulse text-accent-mint" />
          SYSTEM STATUS: ONLINE // AI VERIFICATION ACTIVE
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] font-heading"
        >
          <GradientText variant="mint-sage">AEGIS AI</GradientText>
          <br />
          <span className="text-accent-mint">AI-powered disaster intelligence and rescue coordination system</span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto text-sm sm:text-base text-accent-sage/80 leading-relaxed font-sans"
        >
          AEGIS AI combines realtime environmental monitoring, AI-powered verification, predictive risk analysis, and rescue coordination into one intelligent disaster response platform.
        </motion.p>

        {/* CTA Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          <Link
            href="/dashboard"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-bg-pine border border-accent-sage/40 rounded-lg text-accent-mint font-mono text-sm uppercase tracking-wider hover:bg-accent-sage hover:text-bg-abyss hover:shadow-[0_0_25px_rgba(142,182,155,0.35)] transition-all duration-300 group"
          >
            Launch Command Dashboard
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <Link
            href="/report"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-bg-deep border border-emergency-red/40 rounded-lg text-emergency-red font-mono text-sm uppercase tracking-wider hover:bg-emergency-red/10 hover:border-emergency-red hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all duration-300"
          >
            <Activity className="h-4 w-4 animate-pulse" />
            File Emergency SOS
          </Link>
        </motion.div>
      </div>

      {/* Futuristic Technical Terminal HUD Preview */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="w-full max-w-5xl mx-auto mt-16 rounded-xl border border-accent-sage/20 bg-bg-deep/90 p-1.5 shadow-2xl relative overflow-hidden"
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-bg-abyss rounded-t-lg border-b border-accent-sage/10 font-mono text-[10px] text-accent-sage/60 select-none">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]/50" />
            </div>
            <span>AEGIS_TERM://LIVE_TELEMETRY</span>
          </div>
          <span className="flex items-center gap-1.5 text-success-green animate-pulse">
            <Terminal className="h-3 w-3" /> SECURE_LINK
          </span>
        </div>

        {/* Display Panel */}
        <div className="h-56 sm:h-80 bg-bg-abyss/45 rounded-b-lg border border-accent-sage/5 p-4 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Mock Map Radar Sweep Visual representation */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-64 h-64 border border-accent-sage rounded-full animate-pulse flex items-center justify-center">
              <div className="w-48 h-48 border border-accent-sage rounded-full flex items-center justify-center">
                <div className="w-32 h-32 border border-accent-sage rounded-full" />
              </div>
            </div>
          </div>
          <div className="z-10 font-mono text-center space-y-3 flex flex-col items-center">
            {/* Realistic Revolving 3D Earth */}
            <motion.div 
              animate={{ backgroundPosition: ["0px 0px", "-256px 0px"] }} 
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="w-32 h-32 rounded-full shadow-[inset_-16px_-16px_24px_rgba(0,0,0,0.8),_inset_0_0_10px_rgba(255,255,255,0.2)] opacity-30 mb-2"
              style={{
                backgroundImage: "url('https://upload.wikimedia.org/wikipedia/commons/c/cd/Land_ocean_ice_2048.jpg')",
                backgroundSize: "auto 100%",
                backgroundRepeat: "repeat-x"
              }}
            />
            <div className="text-xs text-accent-sage uppercase tracking-widest animate-pulse">
              [Establishing secure geo-spatial dashboard link]
            </div>
            <div className="text-[10px] text-accent-sage/50">
              Querying USGS seismographs... Connecting NASA FIRMS channels... Querying GDACS global arrays...
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export default HeroSection;
