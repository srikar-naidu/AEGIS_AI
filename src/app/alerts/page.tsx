'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '../../providers/socket-provider';
import { Navbar } from '../../components/layout/Navbar';
import { AlertsFeed } from '../../components/dashboard/AlertsFeed';
import { PulsingDot } from '../../components/shared/PulsingDot';
import {
  Bell,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Alert } from '../../lib/types/incidents';
import { getDisasterConfig, DISASTER_CONFIGS } from '../../lib/constants/disaster-types';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [showActive, setShowActive] = useState(true);

  const { socket } = useSocket();

  useEffect(() => {
    // Fetch real alerts
    fetch('http://localhost:3001/api/alerts')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAlerts(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const onNewAlert = (alert: Alert) => setAlerts((prev) => [alert, ...prev]);
    const onAlertsUpdate = (data: Alert[]) => setAlerts(data);
    
    socket.on('alert:new', onNewAlert);
    socket.on('alerts:update', onAlertsUpdate);

    return () => {
      socket.off('alert:new', onNewAlert);
      socket.off('alerts:update', onAlertsUpdate);
    };
  }, [socket]);

  const filtered = alerts.filter((a) => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    if (showActive && !a.isActive) return false;
    return true;
  });

  const criticalCount = alerts.filter((a) => a.severity === 'critical' && a.isActive).length;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-bg-abyss">
      <Navbar />
      <div className="flex flex-1 overflow-hidden"><main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-accent-sage/15 pb-4">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  'h-10 w-10 rounded-lg border flex items-center justify-center',
                  criticalCount > 0
                    ? 'border-emergency-red/30 bg-emergency-red/10'
                    : 'border-accent-sage/20 bg-bg-deep'
                )}>
                  <Bell className={clsx('h-5 w-5', criticalCount > 0 ? 'text-emergency-red' : 'text-accent-sage')} />
                </div>
                <div>
                  <h1 className="font-heading text-xl font-bold text-accent-mint uppercase tracking-wider flex items-center gap-2">
                    Active Alerts
                    {criticalCount > 0 && (
                      <span className="text-sm bg-emergency-red/20 text-emergency-red px-2 py-0.5 rounded-full font-mono animate-pulse">
                        {criticalCount} CRITICAL
                      </span>
                    )}
                  </h1>
                  <p className="font-mono text-[10px] text-accent-sage/60 uppercase tracking-widest flex items-center gap-1.5">
                    <PulsingDot color="amber" size="sm" />
                    REAL-TIME ADVISORY MONITORING SYSTEM
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-accent-sage/50">
                  {filtered.length} ADVISORIES
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3 w-3 text-accent-sage/50" />
                <span className="font-mono text-[9px] text-accent-sage/60 uppercase tracking-widest">FILTERS:</span>
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-2.5 py-1.5 bg-bg-deep/60 border border-accent-sage/15 rounded text-[9px] font-mono text-accent-sage uppercase tracking-wider focus:outline-none focus:border-accent-sage/40 appearance-none cursor-pointer"
              >
                <option value="all">ALL TYPES</option>
                {Object.keys(DISASTER_CONFIGS).map((type) => (
                  <option key={type} value={type}>{getDisasterConfig(type).name.toUpperCase()}</option>
                ))}
              </select>

              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="px-2.5 py-1.5 bg-bg-deep/60 border border-accent-sage/15 rounded text-[9px] font-mono text-accent-sage uppercase tracking-wider focus:outline-none focus:border-accent-sage/40 appearance-none cursor-pointer"
              >
                <option value="all">ALL SEVERITY</option>
                <option value="critical">CRITICAL</option>
                <option value="high">HIGH</option>
                <option value="medium">MEDIUM</option>
                <option value="low">LOW</option>
              </select>

              <button
                onClick={() => setShowActive(!showActive)}
                className={clsx(
                  'px-2.5 py-1.5 border rounded text-[9px] font-mono uppercase tracking-wider transition-all',
                  showActive
                    ? 'border-success-green/30 bg-success-green/10 text-success-green'
                    : 'border-accent-sage/15 text-accent-sage/60 hover:border-accent-sage/30'
                )}
              >
                {showActive ? 'ACTIVE ONLY' : 'ALL STATUS'}
              </button>
            </div>

            {/* Alerts Grid */}
            <AlertsFeed alerts={filtered} maxItems={50} />
          </div>
        </main>
      </div>
    </div>
  );
}


