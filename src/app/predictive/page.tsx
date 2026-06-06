'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { PulsingDot } from '../../components/shared/PulsingDot';
import {
  BrainCircuit,
  Droplets,
  Flame,
  TrendingUp,
  Ambulance,
  Home,
  NavigationOff,
  ShieldAlert,
  Loader2,
  MapPin,
  Clock,
  Database
} from 'lucide-react';
import { clsx } from 'clsx';
import { Incident } from '../../lib/types/incidents';

interface PredictiveForecast {
  floodRisk: {
    score: number;
    level: 'Low' | 'Moderate' | 'High' | 'Critical';
    confidence: number;
    factors: string[];
    timestamp: string;
    sources: string[];
  };
  wildfireSpread: {
    direction: string;
    expansionKm2: number;
    timeHorizonHours: number;
    confidence: number;
    factors: string[];
    timestamp: string;
    sources: string[];
  };
  escalation: {
    currentStatus: 'Stable' | 'Elevated' | 'High Risk' | 'Critical';
    predictedStatus: 'Stable' | 'Elevated' | 'High Risk' | 'Critical';
    confidence: number;
    factors: string[];
    timestamp: string;
    sources: string[];
  };
  resourceDemand: {
    timeHorizonHours: number;
    expectedRequests: number;
    recommended: string[];
    confidence: number;
    factors: string[];
    timestamp: string;
    sources: string[];
  };
  shelterCapacity: {
    currentOccupancy: number;
    totalCapacity: number;
    projectedOccupancy: number;
    expectedFullHours: number | null;
    recommendation: string;
    confidence: number;
    factors: string[];
    timestamp: string;
    sources: string[];
  };
  roadAccessibility: {
    roadName: string;
    currentStatus: 'Open' | 'Closed' | 'Restricted';
    closureRisk: number;
    predictedTimeHours: number;
    confidence: number;
    factors: string[];
    timestamp: string;
    sources: string[];
  };
}

const getLevelColor = (level: string) => {
  if (['Critical', 'Closed', 'High Risk'].includes(level)) return 'text-red-400 border-red-400/30 bg-red-400/10';
  if (['High', 'Restricted', 'Elevated'].includes(level)) return 'text-emergency-amber border-emergency-amber/30 bg-emergency-amber/10';
  if (['Moderate'].includes(level)) return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
  return 'text-success-green border-success-green/30 bg-success-green/10';
};

export default function PredictiveIntelligencePage() {
  const [forecast, setForecast] = useState<PredictiveForecast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<string>('user-loc');

  useEffect(() => {
    fetch('http://localhost:3001/api/incidents')
      .then(res => res.json())
      .then(data => {
        const active = data.filter((inc: any) => inc.status === 'active' || inc.status === 'monitoring');
        setIncidents(active);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    let lat = 0;
    let lng = 0;

    const fetchForecast = (latitude: number, longitude: number) => {
      setIsLoading(true);
      fetch(`http://localhost:3001/api/predictive/forecast?lat=${latitude}&lng=${longitude}`)
        .then(res => res.json())
        .then(data => setForecast(data))
        .catch(console.error)
        .finally(() => setIsLoading(false));
    };

    if (selectedIncident === 'user-loc') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => fetchForecast(pos.coords.latitude, pos.coords.longitude),
          () => fetchForecast(37.7749, -122.4194) // Fallback to SF if blocked
        );
      } else {
        fetchForecast(37.7749, -122.4194);
      }
    } else {
      const inc = incidents.find(i => i._id === selectedIncident);
      if (inc) fetchForecast(inc.location.coordinates[1], inc.location.coordinates[0]);
    }
  }, [selectedIncident, incidents]);

  const PredictionExplanation = ({ title, data }: { title: string, data: any }) => (
    <div className="mt-4 pt-3 border-t border-accent-sage/10 text-[10px] font-mono">
      <div className="flex justify-between mb-2">
        <span className="text-accent-sage/60 uppercase tracking-widest flex items-center gap-1"><BrainCircuit className="h-3 w-3"/> Confidence Score</span>
        <span className="text-info-cyan font-bold">{data.confidence}%</span>
      </div>
      <div className="text-accent-sage/60 uppercase tracking-widest mb-1 mt-3">Contributing Factors:</div>
      <ul className="space-y-1 mb-3">
        {data.factors.map((f: string, i: number) => (
          <li key={i} className="text-accent-sage/80 flex items-start gap-1">
            <span className="text-accent-mint mt-0.5">✓</span> {f}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 text-accent-sage/40 mt-3 pt-2 border-t border-accent-sage/5">
        <Database className="h-3 w-3" />
        Sources: {data.sources.join(', ')}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-bg-abyss text-accent-sage">
      <Navbar />
      
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-bg-deep/30 p-4 rounded-xl border border-accent-sage/10 glass-panel">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BrainCircuit className="h-5 w-5 text-info-cyan" />
                <h1 className="text-xl font-heading font-bold text-accent-mint uppercase tracking-widest">
                  Predictive Intelligence Engine
                </h1>
                <PulsingDot color="cyan" size="sm" />
              </div>
              <p className="text-xs font-mono text-accent-sage/60">Forecasting risks, resource demand, and disaster escalation using real-time Open-Meteo & Database integrations.</p>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <MapPin className="h-4 w-4 text-accent-sage/50" />
              <select 
                className="w-full md:w-64 bg-bg-deep border border-accent-sage/20 rounded-lg p-2 text-xs text-accent-sage font-mono focus:border-info-cyan/50 focus:outline-none"
                value={selectedIncident}
                onChange={(e) => setSelectedIncident(e.target.value)}
              >
                <option value="user-loc">My Current Location</option>
                {incidents.map(inc => (
                  <option key={inc._id} value={inc._id}>
                    {inc.title} ({inc.severity})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading || !forecast ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <Loader2 className="h-10 w-10 text-info-cyan animate-spin" />
              <p className="font-mono text-xs text-accent-sage/60 uppercase tracking-widest animate-pulse">Running predictive models...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Feature 1: Flood Risk */}
              <div className="glass-panel p-5 rounded-xl border border-accent-sage/10 relative overflow-hidden group hover:border-info-cyan/30 transition-colors">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="flex items-center gap-2 mb-4">
                  <Droplets className="h-4 w-4 text-blue-400" />
                  <h3 className="font-mono text-xs font-bold text-accent-sage/80 uppercase tracking-widest">Flood Risk Forecast</h3>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <div className="text-3xl font-black font-mono text-white">{forecast.floodRisk.score}%</div>
                  <div className={clsx('text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border', getLevelColor(forecast.floodRisk.level))}>
                    {forecast.floodRisk.level} Risk
                  </div>
                </div>
                <PredictionExplanation title="Flood Risk" data={forecast.floodRisk} />
              </div>

              {/* Feature 2: Wildfire Spread */}
              <div className="glass-panel p-5 rounded-xl border border-accent-sage/10 relative overflow-hidden group hover:border-orange-500/30 transition-colors">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="h-4 w-4 text-orange-400" />
                  <h3 className="font-mono text-xs font-bold text-accent-sage/80 uppercase tracking-widest">Wildfire Spread</h3>
                </div>
                <div className="space-y-2 font-mono text-xs mb-4">
                  <div className="flex justify-between"><span className="text-accent-sage/60">Direction:</span><span className="text-white">{forecast.wildfireSpread.direction}</span></div>
                  <div className="flex justify-between"><span className="text-accent-sage/60">Expansion:</span><span className="text-emergency-amber font-bold">+{forecast.wildfireSpread.expansionKm2} km²</span></div>
                  <div className="flex justify-between"><span className="text-accent-sage/60">Time Horizon:</span><span className="text-info-cyan">{forecast.wildfireSpread.timeHorizonHours} Hours</span></div>
                </div>
                <PredictionExplanation title="Wildfire Spread" data={forecast.wildfireSpread} />
              </div>

              {/* Feature 3: Disaster Escalation */}
              <div className="glass-panel p-5 rounded-xl border border-accent-sage/10 relative overflow-hidden group hover:border-red-400/30 transition-colors">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-red-400" />
                  <h3 className="font-mono text-xs font-bold text-accent-sage/80 uppercase tracking-widest">Disaster Escalation</h3>
                </div>
                <div className="space-y-3 font-mono text-xs mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-accent-sage/60">Current Status:</span>
                    <span className={clsx('px-2 py-0.5 rounded text-[10px] border', getLevelColor(forecast.escalation.currentStatus))}>{forecast.escalation.currentStatus}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-accent-sage/60">Predicted Status:</span>
                    <span className={clsx('px-2 py-0.5 rounded text-[10px] border font-bold', getLevelColor(forecast.escalation.predictedStatus))}>{forecast.escalation.predictedStatus}</span>
                  </div>
                </div>
                <PredictionExplanation title="Escalation" data={forecast.escalation} />
              </div>

              {/* Feature 4: Resource Demand */}
              <div className="glass-panel p-5 rounded-xl border border-accent-sage/10 relative overflow-hidden group hover:border-info-cyan/30 transition-colors">
                <div className="flex items-center gap-2 mb-4">
                  <Ambulance className="h-4 w-4 text-info-cyan" />
                  <h3 className="font-mono text-xs font-bold text-accent-sage/80 uppercase tracking-widest">Resource Demand Forecast</h3>
                </div>
                <div className="mb-4">
                  <div className="text-[10px] text-accent-sage/60 font-mono mb-1">Expected Requests (Next {forecast.resourceDemand.timeHorizonHours} Hrs)</div>
                  <div className="text-3xl font-black font-mono text-white">+{forecast.resourceDemand.expectedRequests}</div>
                </div>
                <div className="mb-2 font-mono text-xs text-accent-sage/60 uppercase tracking-widest">Recommended Action:</div>
                <ul className="space-y-1 mb-4 font-mono text-[11px]">
                  {forecast.resourceDemand.recommended.map((r, i) => (
                    <li key={i} className="text-info-cyan flex items-center gap-1">• {r}</li>
                  ))}
                </ul>
                <PredictionExplanation title="Resource Demand" data={forecast.resourceDemand} />
              </div>

              {/* Feature 5: Shelter Capacity */}
              <div className="glass-panel p-5 rounded-xl border border-accent-sage/10 relative overflow-hidden group hover:border-success-green/30 transition-colors">
                <div className="flex items-center gap-2 mb-4">
                  <Home className="h-4 w-4 text-success-green" />
                  <h3 className="font-mono text-xs font-bold text-accent-sage/80 uppercase tracking-widest">Shelter Capacity Forecast</h3>
                </div>
                <div className="space-y-2 font-mono text-xs mb-4">
                  <div className="flex justify-between"><span className="text-accent-sage/60">Current:</span><span className="text-white">{forecast.shelterCapacity.currentOccupancy} / {forecast.shelterCapacity.totalCapacity}</span></div>
                  <div className="flex justify-between">
                    <span className="text-accent-sage/60">Projected:</span>
                    <span className={clsx('font-bold', forecast.shelterCapacity.projectedOccupancy >= forecast.shelterCapacity.totalCapacity ? 'text-red-400' : 'text-emergency-amber')}>
                      {forecast.shelterCapacity.projectedOccupancy} / {forecast.shelterCapacity.totalCapacity}
                    </span>
                  </div>
                  {forecast.shelterCapacity.expectedFullHours && (
                    <div className="flex justify-between"><span className="text-accent-sage/60">Expected Full:</span><span className="text-red-400">{forecast.shelterCapacity.expectedFullHours} Hours</span></div>
                  )}
                </div>
                <div className="mb-4 p-2 rounded bg-bg-deep/50 border border-accent-sage/10 text-center font-mono text-[10px] text-accent-sage/80 uppercase">
                  {forecast.shelterCapacity.recommendation}
                </div>
                <PredictionExplanation title="Shelter Capacity" data={forecast.shelterCapacity} />
              </div>

              {/* Feature 6: Road Accessibility */}
              <div className="glass-panel p-5 rounded-xl border border-accent-sage/10 relative overflow-hidden group hover:border-emergency-amber/30 transition-colors">
                <div className="flex items-center gap-2 mb-4">
                  <NavigationOff className="h-4 w-4 text-emergency-amber" />
                  <h3 className="font-mono text-xs font-bold text-accent-sage/80 uppercase tracking-widest">Road Accessibility</h3>
                </div>
                <div className="space-y-3 font-mono text-xs mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-accent-sage/60">Route:</span>
                    <span className="text-white text-right max-w-[150px] truncate" title={forecast.roadAccessibility.roadName}>{forecast.roadAccessibility.roadName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-accent-sage/60">Current Status:</span>
                    <span className={clsx('px-2 py-0.5 rounded text-[10px] border', getLevelColor(forecast.roadAccessibility.currentStatus))}>{forecast.roadAccessibility.currentStatus}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-accent-sage/60">Closure Risk:</span>
                    <span className={clsx('font-bold', forecast.roadAccessibility.closureRisk > 70 ? 'text-red-400' : 'text-emergency-amber')}>{forecast.roadAccessibility.closureRisk}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-accent-sage/60">Predicted Impact:</span>
                    <span className="text-info-cyan">{forecast.roadAccessibility.predictedTimeHours} Hours</span>
                  </div>
                </div>
                <PredictionExplanation title="Road Accessibility" data={forecast.roadAccessibility} />
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
