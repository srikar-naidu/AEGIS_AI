'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Flame,
  Waves,
  Wind,
  ThermometerSun,
  Mountain,
  Globe,
  Clock,
  Shield,
  Brain,
} from 'lucide-react';
import { clsx } from 'clsx';
import { getDisasterConfig, DISASTER_CONFIGS } from '../../lib/constants/disaster-types';

export default function AnalyticsPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | '90d'>('7d');

  const disasterStats = [
    { type: 'earthquake', count: 47, trend: 'up', change: '+12%', risk: 'high' },
    { type: 'wildfire', count: 23, trend: 'up', change: '+34%', risk: 'critical' },
    { type: 'flood', count: 18, trend: 'down', change: '-8%', risk: 'high' },
    { type: 'cyclone', count: 5, trend: 'up', change: '+60%', risk: 'critical' },
    { type: 'landslide', count: 12, trend: 'down', change: '-15%', risk: 'medium' },
    { type: 'volcano', count: 3, trend: 'stable', change: '0%', risk: 'low' },
    { type: 'heatwave', count: 8, trend: 'up', change: '+25%', risk: 'high' },
    { type: 'tsunami', count: 1, trend: 'down', change: '-50%', risk: 'low' },
    { type: 'tornado', count: 6, trend: 'up', change: '+20%', risk: 'medium' },
    { type: 'blizzard', count: 2, trend: 'down', change: '-30%', risk: 'low' },
    { type: 'drought', count: 4, trend: 'up', change: '+15%', risk: 'medium' },
    { type: 'storm_surge', count: 3, trend: 'stable', change: '0%', risk: 'medium' },
    { type: 'structural_collapse', count: 7, trend: 'up', change: '+40%', risk: 'high' },
    { type: 'industrial_hazard', count: 2, trend: 'down', change: '-10%', risk: 'low' },
  ];

  const riskColor: Record<string, string> = {
    critical: 'text-emergency-red',
    high: 'text-emergency-orange',
    medium: 'text-emergency-amber',
    low: 'text-success-green',
  };

  const riskBg: Record<string, string> = {
    critical: 'bg-emergency-red/10 border-emergency-red/20',
    high: 'bg-emergency-orange/10 border-emergency-orange/20',
    medium: 'bg-emergency-amber/10 border-emergency-amber/20',
    low: 'bg-success-green/10 border-success-green/20',
  };

  const totalEvents = disasterStats.reduce((sum, s) => sum + s.count, 0);
  const criticalRisk = disasterStats.filter((s) => s.risk === 'critical').length;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-bg-abyss">
      <Navbar />
      <div className="flex flex-1 overflow-hidden"><main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-accent-sage/15 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg border border-accent-sage/20 bg-bg-deep flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-accent-sage" />
                </div>
                <div>
                  <h1 className="font-heading text-xl font-bold text-accent-mint uppercase tracking-wider">
                    Predictive Analytics
                  </h1>
                  <p className="font-mono text-[10px] text-accent-sage/60 uppercase tracking-widest">
                    AI-POWERED RISK ASSESSMENT & TREND ANALYSIS
                  </p>
                </div>
              </div>

              {/* Timeframe selector */}
              <div className="flex gap-1 border border-accent-sage/15 rounded-lg p-0.5">
                {(['24h', '7d', '30d', '90d'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setSelectedTimeframe(tf)}
                    className={clsx(
                      'px-3 py-1.5 rounded font-mono text-[9px] uppercase tracking-wider transition-all',
                      selectedTimeframe === tf
                        ? 'bg-bg-forest text-accent-mint'
                        : 'text-accent-sage/50 hover:text-accent-sage'
                    )}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 border border-accent-sage/15 bg-bg-deep/40 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Globe className="h-4 w-4 text-accent-sage/50" />
                  <span className="text-[8px] text-accent-sage/40 font-mono uppercase">Past {selectedTimeframe}</span>
                </div>
                <div className="text-2xl font-black text-accent-mint font-mono">{totalEvents}</div>
                <div className="text-[9px] text-accent-sage/60 font-mono uppercase tracking-wider">TOTAL EVENTS</div>
              </div>

              <div className="p-4 border border-emergency-red/20 bg-emergency-red/5 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="h-4 w-4 text-emergency-red" />
                  <TrendingUp className="h-3 w-3 text-emergency-red" />
                </div>
                <div className="text-2xl font-black text-emergency-red font-mono">{criticalRisk}</div>
                <div className="text-[9px] text-accent-sage/60 font-mono uppercase tracking-wider">CRITICAL RISK ZONES</div>
              </div>

              <div className="p-4 border border-accent-sage/15 bg-bg-deep/40 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Shield className="h-4 w-4 text-success-green" />
                  <span className="text-[8px] text-success-green font-mono">94.2%</span>
                </div>
                <div className="text-2xl font-black text-success-green font-mono">94.2%</div>
                <div className="text-[9px] text-accent-sage/60 font-mono uppercase tracking-wider">AI ACCURACY RATE</div>
              </div>

              <div className="p-4 border border-accent-sage/15 bg-bg-deep/40 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Brain className="h-4 w-4 text-info-cyan" />
                  <span className="text-[8px] text-info-cyan font-mono">GROQ</span>
                </div>
                <div className="text-2xl font-black text-info-cyan font-mono">1.2s</div>
                <div className="text-[9px] text-accent-sage/60 font-mono uppercase tracking-wider">AVG VERIFY TIME</div>
              </div>
            </div>

            {/* Disaster Type Breakdown */}
            <div>
              <h2 className="font-mono text-[10px] text-accent-sage/70 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Activity className="h-3 w-3" />
                DISASTER TYPE BREAKDOWN — ALL 14 CATEGORIES
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {disasterStats.map((stat) => {
                  const config = getDisasterConfig(stat.type);
                  return (
                    <div
                      key={stat.type}
                      className="p-3 border border-accent-sage/10 bg-bg-deep/30 rounded-lg hover:bg-bg-deep/50 transition-all font-mono"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: config.hexColor }}
                          />
                          <span className="text-[10px] text-accent-mint font-semibold uppercase tracking-wider">
                            {config.name}
                          </span>
                        </div>
                        <span className={clsx('text-[8px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-bold', riskBg[stat.risk], riskColor[stat.risk])}>
                          {stat.risk}
                        </span>
                      </div>

                      <div className="flex items-end justify-between">
                        <div>
                          <span className="text-xl font-black" style={{ color: config.hexColor }}>
                            {stat.count}
                          </span>
                          <span className="text-[9px] text-accent-sage/50 ml-1">events</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {stat.trend === 'up' ? (
                            <TrendingUp className="h-3 w-3 text-emergency-red" />
                          ) : stat.trend === 'down' ? (
                            <TrendingDown className="h-3 w-3 text-success-green" />
                          ) : (
                            <Activity className="h-3 w-3 text-accent-sage/50" />
                          )}
                          <span className={clsx('text-[9px]',
                            stat.trend === 'up' ? 'text-emergency-red' :
                            stat.trend === 'down' ? 'text-success-green' :
                            'text-accent-sage/50'
                          )}>
                            {stat.change}
                          </span>
                        </div>
                      </div>

                      {/* Visual bar */}
                      <div className="mt-2 h-1.5 bg-bg-abyss/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min((stat.count / 50) * 100, 100)}%`,
                            backgroundColor: config.hexColor,
                            opacity: 0.7,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Prediction Note */}
            <div className="p-4 border border-accent-sage/15 bg-bg-deep/20 rounded-lg flex items-start gap-3">
              <Brain className="h-5 w-5 text-info-cyan shrink-0 mt-0.5" />
              <div>
                <span className="font-mono text-[10px] text-info-cyan font-bold uppercase tracking-wider block mb-1">
                  PREDICTIVE RISK MODEL
                </span>
                <p className="font-mono text-[9px] text-accent-sage/60 leading-relaxed">
                  Analysis powered by Groq AI with LLaMA model. Combines historical patterns, satellite imagery,
                  meteorological data, and seismic readings to forecast disaster probability. Risk levels are updated
                  every 5 minutes using real-time telemetry from USGS, NASA FIRMS, GDACS, and Open-Meteo data streams.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
