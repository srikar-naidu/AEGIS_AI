'use client';

import React, { useState } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { PulsingDot } from '../../components/shared/PulsingDot';
import {
  Settings,
  ShieldAlert,
  Server,
  Database,
  Users,
  Activity,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  Radio,
  Bell,
  Cpu,
} from 'lucide-react';
import { clsx } from 'clsx';

export default function AdminPage() {
  const [toggles, setToggles] = useState({
    autoDispatch: true,
    aiVerification: true,
    publicAPI: false,
    strictMode: true,
    maintenance: false,
  });

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-bg-abyss">
      <Navbar />
      <div className="flex flex-1 overflow-hidden"><main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="border-b border-accent-sage/15 pb-4 flex justify-between items-end">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg border border-emergency-red/30 bg-emergency-red/10 flex items-center justify-center">
                  <ShieldAlert className="h-5 w-5 text-emergency-red" />
                </div>
                <div>
                  <h1 className="font-heading text-xl font-bold text-accent-mint uppercase tracking-wider">
                    System Administration
                  </h1>
                  <p className="font-mono text-[10px] text-accent-sage/60 uppercase tracking-widest">
                    RESTRICTED ACCESS — COMMAND CLEARANCE LEVEL 5 REQUIRED
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-accent-sage/70">
                <span className="uppercase tracking-wider text-success-green flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  AUTH VERIFIED
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column - System Health */}
              <div className="space-y-6">
                <div className="p-4 border border-accent-sage/15 bg-bg-deep/40 rounded-lg">
                  <h2 className="font-mono text-[10px] text-accent-sage/70 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5" />
                    SYSTEM HEALTH
                  </h2>
                  <div className="space-y-3">
                    {[
                      { label: 'API Server', status: 'Online', icon: Server, color: 'text-success-green' },
                      { label: 'MongoDB Cluster', status: 'Connected', icon: Database, color: 'text-success-green' },
                      { label: 'Socket.IO Hub', status: 'Active (243 conn)', icon: Radio, color: 'text-success-green' },
                      { label: 'Groq LLM Engine', status: 'Latency: 24ms', icon: Cpu, color: 'text-info-cyan' },
                      { label: 'Notification Relay', status: 'Operational', icon: Bell, color: 'text-success-green' },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="flex items-center justify-between font-mono">
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-accent-sage/50" />
                            <span className="text-xs text-accent-sage">{item.label}</span>
                          </div>
                          <span className={clsx('text-[10px] uppercase tracking-wider', item.color)}>
                            {item.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 border border-accent-sage/15 bg-bg-deep/40 rounded-lg">
                  <h2 className="font-mono text-[10px] text-accent-sage/70 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    ACTIVE PERSONNEL
                  </h2>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-3xl font-black text-accent-mint font-mono">1,248</span>
                    <span className="text-[9px] text-success-green font-mono uppercase tracking-wider mb-1">+12 today</span>
                  </div>
                  <div className="w-full bg-bg-abyss rounded-full h-1.5 mb-2">
                    <div className="bg-info-cyan h-1.5 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                  <div className="flex justify-between font-mono text-[9px] text-accent-sage/50 uppercase tracking-wider">
                    <span>Admin: 12</span>
                    <span>Rescue: 450</span>
                    <span>Citizen: 786</span>
                  </div>
                </div>
              </div>

              {/* Middle & Right Column - Config */}
              <div className="md:col-span-2 space-y-6">
                <div className="p-4 border border-accent-sage/15 bg-bg-deep/40 rounded-lg">
                  <h2 className="font-mono text-[10px] text-accent-sage/70 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Settings className="h-3.5 w-3.5" />
                    GLOBAL CONFIGURATION OVERRIDES
                  </h2>
                  <div className="space-y-4">
                    {[
                      {
                        key: 'autoDispatch',
                        label: 'Auto-Dispatch Rescue Teams',
                        desc: 'AI automatically assigns closest available rescue teams to verified critical incidents without human approval.',
                      },
                      {
                        key: 'aiVerification',
                        label: 'AI Incident Verification Pipeline',
                        desc: 'Route citizen reports through the 5-step Groq validation process. Disabling sets all reports to pending.',
                      },
                      {
                        key: 'publicAPI',
                        label: 'Public Read-Only API',
                        desc: 'Allow external systems to query the /api/incidents endpoint without authentication.',
                      },
                      {
                        key: 'strictMode',
                        label: 'Strict Verification Threshold',
                        desc: 'Require credibility score > 0.85 (instead of 0.70) for automatic public alerts.',
                      },
                      {
                        key: 'maintenance',
                        label: 'System Maintenance Mode',
                        desc: 'Disables new citizen reports. Existing command center operations remain active.',
                        warning: true,
                      },
                    ].map((setting) => (
                      <div key={setting.key} className="flex items-start justify-between p-3 border border-accent-sage/10 rounded-lg hover:bg-bg-deep/60 transition-colors">
                        <div className="pr-4">
                          <div className={clsx(
                            'font-mono text-xs uppercase tracking-wider font-bold mb-1',
                            setting.warning && toggles[setting.key as keyof typeof toggles] ? 'text-emergency-red' : 'text-accent-mint'
                          )}>
                            {setting.label}
                          </div>
                          <div className="font-mono text-[9px] text-accent-sage/60 leading-relaxed">
                            {setting.desc}
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggle(setting.key as keyof typeof toggles)}
                          className={clsx(
                            'shrink-0 transition-colors',
                            toggles[setting.key as keyof typeof toggles] ? 'text-success-green' : 'text-accent-sage/40'
                          )}
                        >
                          {toggles[setting.key as keyof typeof toggles] ? (
                            <ToggleRight className="h-8 w-8" />
                          ) : (
                            <ToggleLeft className="h-8 w-8" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="p-4 border border-emergency-red/30 bg-emergency-red/5 rounded-lg">
                  <h2 className="font-mono text-[10px] text-emergency-red uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    DANGER ZONE
                  </h2>
                  <div className="flex items-center gap-4">
                    <button className="px-4 py-2 bg-emergency-red/10 border border-emergency-red/30 text-emergency-red rounded font-mono text-xs uppercase tracking-wider hover:bg-emergency-red hover:text-white transition-colors">
                      Purge All Unverified Reports
                    </button>
                    <button className="px-4 py-2 bg-emergency-red/10 border border-emergency-red/30 text-emergency-red rounded font-mono text-xs uppercase tracking-wider hover:bg-emergency-red hover:text-white transition-colors">
                      Trigger Global SOS Override
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
