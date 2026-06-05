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
  FileText,
  ChevronDown,
  ChevronUp,
  Flag,
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
  reasoning: string;
  flags: string[];
  detailedReport: string;
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

export default function VerificationPage() {
  const { socket, isConnected } = useSocket();
  const [entries, setEntries] = useState<VerificationEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<VerificationEntry | null>(null);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/reports/verification-queue')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setEntries(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const refreshQueue = () => {
      fetch('http://localhost:3001/api/reports/verification-queue')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setEntries(data);
        });
    };

    socket.on('report:new', refreshQueue);
    socket.on('report:verified', refreshQueue);

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
          <div className="max-w-5xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="border-b border-accent-sage/15 pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg border border-info-cyan/30 bg-info-cyan/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-info-cyan" />
                </div>
                <div>
                  <h1 className="font-heading text-xl font-bold text-accent-mint uppercase tracking-wider">
                    AI Verification Engine
                  </h1>
                  <p className="font-mono text-[10px] text-accent-sage/60 uppercase tracking-widest">
                    GROQ VISION + LLM FORENSIC ANALYSIS • 6-STEP PIPELINE
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <div className={clsx(
                    'h-2 w-2 rounded-full',
                    isConnected ? 'bg-success-green animate-pulse' : 'bg-emergency-red'
                  )} />
                  <span className="font-mono text-[9px] text-accent-sage/50 uppercase">
                    {isConnected ? 'LIVE FEED ACTIVE' : 'DISCONNECTED'}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total Reports', value: entries.length, color: 'text-accent-mint' },
                { label: 'Verified', value: entries.filter(e => e.status === 'verified').length, color: 'text-success-green' },
                { label: 'Rejected', value: entries.filter(e => e.status === 'rejected').length, color: 'text-emergency-red' },
                { label: 'Pending', value: entries.filter(e => e.status === 'pending' || e.status === 'in_progress').length, color: 'text-emergency-amber' },
              ].map((stat, i) => (
                <div key={i} className="p-3 bg-bg-deep/30 border border-accent-sage/10 rounded-lg text-center">
                  <div className={clsx('text-xl font-black font-heading', stat.color)}>{stat.value}</div>
                  <div className="text-[8px] font-mono text-accent-sage/50 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Queue */}
            {entries.length === 0 ? (
              <div className="text-center py-16 text-accent-sage/40 font-mono text-sm">
                No reports in the verification queue. Submit a report to begin.
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry) => {
                  const style = statusStyles[entry.status] || statusStyles.pending;
                  const isSelected = selectedEntry?.id === entry.id;
                  const isReportExpanded = expandedReport === entry.id;

                  return (
                    <div key={entry.id} className="border border-accent-sage/10 rounded-lg overflow-hidden bg-bg-deep/20">
                      {/* Entry Header */}
                      <button
                        onClick={() => setSelectedEntry(isSelected ? null : entry)}
                        className="w-full text-left px-4 py-3 hover:bg-bg-deep/40 transition-all font-mono"
                      >
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            'h-2.5 w-2.5 rounded-full shrink-0',
                            entry.status === 'verified' ? 'bg-success-green' :
                            entry.status === 'rejected' ? 'bg-emergency-red' :
                            entry.status === 'in_progress' ? 'bg-info-cyan animate-pulse' :
                            'bg-emergency-amber'
                          )} />

                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-accent-mint font-semibold truncate block">
                              {entry.reportTitle}
                            </span>
                            <span className="text-[9px] text-accent-sage/50">
                              {entry.type} • {entry.submittedBy} • {new Date(entry.submittedAt).toLocaleString()}
                            </span>
                          </div>

                          {/* Score */}
                          <div className="text-right shrink-0">
                            <div className={clsx(
                              'text-lg font-black',
                              entry.credibilityScore >= 0.7 ? 'text-success-green' :
                              entry.credibilityScore >= 0.4 ? 'text-emergency-amber' :
                              'text-emergency-red'
                            )}>
                              {Math.round(entry.credibilityScore * 100)}%
                            </div>
                            <span className="text-[7px] text-accent-sage/50 uppercase">CREDIBILITY</span>
                          </div>

                          <span className={clsx(
                            'text-[8px] px-2 py-1 rounded border uppercase tracking-wider font-bold shrink-0',
                            style.bg, style.text
                          )}>
                            {style.label}
                          </span>

                          {isSelected ? (
                            <ChevronUp className="h-4 w-4 text-accent-mint shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-accent-sage/30 shrink-0" />
                          )}
                        </div>
                      </button>

                      {/* Expanded: Step Breakdown */}
                      {isSelected && (
                        <div className="px-4 py-4 border-t border-accent-sage/8 space-y-4">
                          {/* 6-Step Grid */}
                          <div className="grid grid-cols-6 gap-2">
                            {entry.steps.map((step, i) => (
                              <div key={i} className={clsx(
                                'p-2.5 rounded border text-center',
                                step.status === 'pass' ? 'border-success-green/25 bg-success-green/5' :
                                step.status === 'fail' ? 'border-emergency-red/25 bg-emergency-red/5' :
                                step.status === 'warning' ? 'border-emergency-amber/25 bg-emergency-amber/5' :
                                'border-accent-sage/10 bg-bg-abyss/30'
                              )}>
                                <div className="flex items-center justify-center mb-1">
                                  {step.status === 'pass' ? <CheckCircle className="h-4 w-4 text-success-green" /> :
                                   step.status === 'fail' ? <XCircle className="h-4 w-4 text-emergency-red" /> :
                                   step.status === 'warning' ? <AlertTriangle className="h-4 w-4 text-emergency-amber" /> :
                                   <Clock className="h-4 w-4 text-accent-sage/50 animate-spin" />}
                                </div>
                                <span className="font-mono text-[7px] text-accent-sage/80 uppercase tracking-wider block mb-0.5 leading-tight">
                                  {step.name}
                                </span>
                                <span className="font-mono text-[7px] text-accent-sage/50 block leading-tight">
                                  {step.detail}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Flags */}
                          {entry.flags && entry.flags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {entry.flags.map((flag, i) => (
                                <span key={i} className={clsx(
                                  'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider border',
                                  flag.includes('FAKE') || flag.includes('MISMATCH') || flag.includes('CONTRADICTION') || flag.includes('AI_GENERATED')
                                    ? 'border-emergency-red/30 bg-emergency-red/10 text-emergency-red'
                                    : flag.includes('CONFIRMED') || flag.includes('CORROBORATED') || flag.includes('CONSISTENT') || flag.includes('AUTHENTIC')
                                    ? 'border-success-green/30 bg-success-green/10 text-success-green'
                                    : 'border-emergency-amber/30 bg-emergency-amber/10 text-emergency-amber'
                                )}>
                                  <Flag className="h-2.5 w-2.5" />
                                  {flag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* AI Reasoning Summary */}
                          {entry.reasoning && (
                            <div className="p-3 bg-bg-abyss/50 border border-accent-sage/10 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Brain className="h-3.5 w-3.5 text-info-cyan" />
                                <span className="text-[9px] font-mono text-info-cyan uppercase tracking-wider font-bold">
                                  AI Forensic Summary
                                </span>
                              </div>
                              <p className="text-[11px] font-mono text-accent-sage/70 leading-relaxed">
                                {entry.reasoning}
                              </p>
                            </div>
                          )}

                          {/* Detailed Report Toggle */}
                          {entry.detailedReport && (
                            <div>
                              <button
                                onClick={() => setExpandedReport(isReportExpanded ? null : entry.id)}
                                className="flex items-center gap-2 px-3 py-1.5 border border-accent-sage/15 rounded hover:bg-bg-deep/30 transition-all"
                              >
                                <FileText className="h-3.5 w-3.5 text-accent-sage/60" />
                                <span className="text-[9px] font-mono text-accent-sage/70 uppercase tracking-wider">
                                  {isReportExpanded ? 'Hide Full Forensic Report' : 'View Full Forensic Report'}
                                </span>
                                {isReportExpanded ? (
                                  <ChevronUp className="h-3 w-3 text-accent-sage/40" />
                                ) : (
                                  <ChevronDown className="h-3 w-3 text-accent-sage/40" />
                                )}
                              </button>

                              {isReportExpanded && (
                                <pre className="mt-2 p-4 bg-bg-abyss/60 border border-accent-sage/10 rounded-lg text-[10px] font-mono text-accent-sage/70 leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                                  {entry.detailedReport}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
