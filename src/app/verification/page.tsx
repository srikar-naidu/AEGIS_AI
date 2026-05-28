'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '../../providers/socket-provider';
import { Navbar } from '../../components/layout/Navbar';
import { Sidebar } from '../../components/layout/Sidebar';
import {
  Shield,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Brain,
  Satellite,
  Thermometer,
  MapPin,
  BarChart3,
  Eye,
} from 'lucide-react';
import { clsx } from 'clsx';

interface VerificationEntry {
  id: string;
  reportTitle: string;
  type: string;
  submittedBy: string;
  submittedAt: string;
  status: 'pending' | 'in_progress' | 'verified' | 'rejected';
  credibilityScore: number;
  steps: {
    name: string;
    status: 'pass' | 'fail' | 'warning' | 'pending';
    detail: string;
  }[];
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-emergency-amber/10 border-emergency-amber/25', text: 'text-emergency-amber', label: 'PENDING' },
  in_progress: { bg: 'bg-info-cyan/10 border-info-cyan/25', text: 'text-info-cyan', label: 'ANALYZING' },
  verified: { bg: 'bg-success-green/10 border-success-green/25', text: 'text-success-green', label: 'VERIFIED' },
  rejected: { bg: 'bg-emergency-red/10 border-emergency-red/25', text: 'text-emergency-red', label: 'REJECTED' },
};

const stepIcons: Record<string, React.ElementType> = {
  'Temporal Analysis': Clock,
  'Geospatial Check': MapPin,
  'Meteorological Validation': Thermometer,
  'Satellite Correlation': Satellite,
  'LLM Logic Audit': Brain,
};

export default function VerificationPage() {
  const { socket, isConnected } = useSocket();
  const [entries, setEntries] = useState<VerificationEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<VerificationEntry | null>(null);

  useEffect(() => {
    // Fetch initial queue
    fetch('http://localhost:3001/api/reports/verification-queue')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setEntries(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    socket.on('report:new', () => {
      // Refresh queue on new report
      fetch('http://localhost:3001/api/reports/verification-queue')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setEntries(data);
        });
    });

    socket.on('report:verified', () => {
      // Refresh queue on verification finish
      fetch('http://localhost:3001/api/reports/verification-queue')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setEntries(data);
        });
    });

    return () => {
      socket.off('report:new');
      socket.off('report:verified');
    };
  }, [socket]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-bg-abyss">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="border-b border-accent-sage/15 pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg border border-accent-sage/20 bg-bg-deep flex items-center justify-center">
                  <Shield className="h-5 w-5 text-accent-sage" />
                </div>
                <div>
                  <h1 className="font-heading text-xl font-bold text-accent-mint uppercase tracking-wider">
                    AI Verification Panel
                  </h1>
                  <p className="font-mono text-[10px] text-accent-sage/60 uppercase tracking-widest">
                    5-STEP GROQ AI VERIFICATION PIPELINE — REAL-TIME CREDIBILITY SCORING
                  </p>
                </div>
              </div>
            </div>

            {/* Pipeline Overview */}
            <div className="grid grid-cols-5 gap-2">
              {['Temporal Analysis', 'Geospatial Check', 'Meteorological Validation', 'Satellite Correlation', 'LLM Logic Audit'].map((step, i) => {
                const Icon = stepIcons[step] || Brain;
                return (
                  <div key={step} className="p-3 border border-accent-sage/10 bg-bg-deep/40 rounded-lg text-center relative">
                    <div className="h-8 w-8 rounded-full border border-accent-sage/20 bg-bg-abyss flex items-center justify-center mx-auto mb-2">
                      <Icon className="h-4 w-4 text-accent-sage" />
                    </div>
                    <span className="font-mono text-[8px] text-accent-sage/70 uppercase tracking-wider block">
                      STEP {i + 1}
                    </span>
                    <span className="font-mono text-[9px] text-accent-mint font-semibold uppercase tracking-wider">
                      {step}
                    </span>
                    {i < 4 && (
                      <div className="absolute top-1/2 -right-1.5 w-3 h-[1px] bg-accent-sage/20" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Entries Table */}
            <div className="border border-accent-sage/10 rounded-lg overflow-hidden">
              <div className="bg-bg-deep/40 px-4 py-2.5 border-b border-accent-sage/10 flex items-center justify-between">
                <span className="font-mono text-[10px] text-accent-sage/70 uppercase tracking-widest">
                  VERIFICATION QUEUE — {entries.length} REPORTS
                </span>
              </div>

              <div className="divide-y divide-accent-sage/8">
                {entries.map((entry) => {
                  const style = statusStyles[entry.status];
                  const isSelected = selectedEntry?.id === entry.id;
                  return (
                    <div key={entry.id}>
                      <button
                        onClick={() => setSelectedEntry(isSelected ? null : entry)}
                        className="w-full text-left px-4 py-3 hover:bg-bg-deep/30 transition-all font-mono"
                      >
                        <div className="flex items-center gap-3">
                          <div className={clsx('h-2 w-2 rounded-full', entry.status === 'verified' ? 'bg-success-green' : entry.status === 'rejected' ? 'bg-emergency-red' : 'bg-emergency-amber')} />

                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-accent-mint font-semibold truncate block">{entry.reportTitle}</span>
                            <span className="text-[9px] text-accent-sage/50">{entry.type} • {entry.submittedBy} • {entry.submittedAt}</span>
                          </div>

                          {/* Score */}
                          <div className="text-right shrink-0">
                            <div className={clsx('text-sm font-black', entry.credibilityScore >= 0.7 ? 'text-success-green' : entry.credibilityScore >= 0.4 ? 'text-emergency-amber' : 'text-emergency-red')}>
                              {Math.round(entry.credibilityScore * 100)}%
                            </div>
                            <span className="text-[8px] text-accent-sage/50 uppercase">CREDIBILITY</span>
                          </div>

                          <span className={clsx('text-[8px] px-2 py-1 rounded border uppercase tracking-wider font-bold', style.bg, style.text)}>
                            {style.label}
                          </span>

                          <Eye className={clsx('h-3.5 w-3.5 transition-colors', isSelected ? 'text-accent-mint' : 'text-accent-sage/30')} />
                        </div>
                      </button>

                      {/* Expanded Detail */}
                      {isSelected && (
                        <div className="px-4 py-3 bg-bg-deep/20 border-t border-accent-sage/8">
                          <div className="grid grid-cols-5 gap-2">
                            {entry.steps.map((step, i) => (
                              <div key={i} className={clsx(
                                'p-2.5 rounded border text-center',
                                step.status === 'pass' ? 'border-success-green/20 bg-success-green/5' :
                                step.status === 'fail' ? 'border-emergency-red/20 bg-emergency-red/5' :
                                step.status === 'warning' ? 'border-emergency-amber/20 bg-emergency-amber/5' :
                                'border-accent-sage/10 bg-bg-abyss/30'
                              )}>
                                <div className="flex items-center justify-center mb-1">
                                  {step.status === 'pass' ? <CheckCircle className="h-4 w-4 text-success-green" /> :
                                   step.status === 'fail' ? <XCircle className="h-4 w-4 text-emergency-red" /> :
                                   step.status === 'warning' ? <AlertTriangle className="h-4 w-4 text-emergency-amber" /> :
                                   <Clock className="h-4 w-4 text-accent-sage/50" />}
                                </div>
                                <span className="font-mono text-[8px] text-accent-sage/70 uppercase tracking-wider block mb-0.5">
                                  {step.name}
                                </span>
                                <span className="font-mono text-[8px] text-accent-sage/50 block">
                                  {step.detail}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}


