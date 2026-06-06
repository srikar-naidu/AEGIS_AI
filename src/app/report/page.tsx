'use client';

import React, { useState } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import {
  AlertTriangle,
  MapPin,
  Camera,
  Upload,
  Phone,
  Shield,
  Send,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { DISASTER_CONFIGS, getDisasterConfig } from '../../lib/constants/disaster-types';
import { DisasterType, SeverityLevel } from '../../lib/types/incidents';

export default function ReportPage() {
  const [formState, setFormState] = useState({
    type: '' as string,
    severity: '' as string,
    description: '',
    latitude: '',
    longitude: '',
    address: '',
    emergencyContact: '',
    isSOS: false,
  });
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Encode first file to base64 if it exists
      let uploadedMedia: string[] = [];
      if (mediaFiles.length > 0) {
        const file = mediaFiles[0];
        const base64Str = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
        });
        uploadedMedia.push(base64Str);
      }

      const payload = {
        type: formState.type,
        severity: formState.severity,
        description: formState.description,
        location: {
          type: 'Point',
          coordinates: [
            parseFloat(formState.longitude) || 0,
            parseFloat(formState.latitude) || 0
          ]
        },
        address: formState.address,
        emergencyContact: formState.emergencyContact,
        isSOS: formState.isSOS,
        mediaUrls: uploadedMedia,
        userId: 'citizen_' + Math.floor(Math.random() * 10000) // Mock user ID for now
      };

      const res = await fetch('http://localhost:3001/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to submit report');
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('Failed to submit report. Please check connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormState((prev) => ({
            ...prev,
            latitude: pos.coords.latitude.toFixed(6),
            longitude: pos.coords.longitude.toFixed(6),
          }));
        },
        (err) => console.error('Geolocation error:', err)
      );
    }
  };

  if (submitted) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-bg-abyss">
        <Navbar />
        <div className="flex flex-1 overflow-hidden"><main className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 p-8">
              <div className="h-16 w-16 rounded-full border-2 border-success-green/40 bg-success-green/10 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-success-green" />
              </div>
              <h2 className="font-heading text-2xl font-bold text-accent-mint uppercase tracking-wider">
                Report Submitted
              </h2>
              <p className="font-mono text-xs text-accent-sage/70 max-w-md mx-auto">
                Your report has been received and is being processed by the AEGIS AI verification engine.
                You will receive updates as the AI cross-references your submission with satellite and sensor data.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setFormState({
                    type: '',
                    severity: '',
                    description: '',
                    latitude: '',
                    longitude: '',
                    address: '',
                    emergencyContact: '',
                    isSOS: false,
                  });
                  setMediaFiles([]);
                }}
                className="mt-4 px-6 py-2.5 border border-accent-sage/30 rounded-md font-mono text-xs uppercase tracking-wider text-accent-sage hover:text-accent-mint hover:bg-bg-deep transition-all"
              >
                Submit Another Report
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-bg-abyss">
      <Navbar />
      <div className="flex flex-1 overflow-hidden"><main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="border-b border-accent-sage/15 pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg border border-emergency-red/30 bg-emergency-red/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-emergency-red" />
                </div>
                <div>
                  <h1 className="font-heading text-xl font-bold text-accent-mint uppercase tracking-wider">
                    Report Emergency
                  </h1>
                  <p className="font-mono text-[10px] text-accent-sage/60 uppercase tracking-widest">
                    CITIZEN SUBMISSION → AI VERIFICATION → COMMAND DISPATCH
                  </p>
                </div>
              </div>
            </div>

            {/* SOS Toggle */}
            <div
              onClick={() => setFormState((prev) => ({ ...prev, isSOS: !prev.isSOS }))}
              className={clsx(
                'p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 flex items-center gap-3',
                formState.isSOS
                  ? 'border-emergency-red bg-emergency-red/10 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                  : 'border-accent-sage/15 bg-bg-deep/30 hover:border-accent-sage/30'
              )}
            >
              <div className={clsx(
                'h-12 w-12 rounded-full flex items-center justify-center font-heading font-black text-lg transition-all',
                formState.isSOS
                  ? 'bg-emergency-red text-white animate-pulse'
                  : 'bg-bg-forest text-accent-sage'
              )}>
                SOS
              </div>
              <div>
                <span className={clsx(
                  'font-mono text-sm font-bold uppercase tracking-wider',
                  formState.isSOS ? 'text-emergency-red' : 'text-accent-sage'
                )}>
                  {formState.isSOS ? 'SOS ACTIVE — PRIORITY ROUTING' : 'ACTIVATE SOS BEACON'}
                </span>
                <p className="font-mono text-[9px] text-accent-sage/55 mt-0.5">
                  Enable for life-threatening emergencies. Triggers immediate dispatch protocol.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Type + Severity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] text-accent-sage/70 uppercase tracking-widest mb-1.5">
                    Disaster Type *
                  </label>
                  <select
                    value={formState.type}
                    onChange={(e) => setFormState((prev) => ({ ...prev, type: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 bg-bg-deep/60 border border-accent-sage/15 rounded-md font-mono text-xs text-accent-mint focus:outline-none focus:border-accent-sage/40 focus:ring-1 focus:ring-accent-sage/20 appearance-none cursor-pointer"
                  >
                    <option value="">Select type...</option>
                    {Object.keys(DISASTER_CONFIGS).map((type) => (
                      <option key={type} value={type}>
                        {getDisasterConfig(type).name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-[10px] text-accent-sage/70 uppercase tracking-widest mb-1.5">
                    Severity Level *
                  </label>
                  <select
                    value={formState.severity}
                    onChange={(e) => setFormState((prev) => ({ ...prev, severity: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 bg-bg-deep/60 border border-accent-sage/15 rounded-md font-mono text-xs text-accent-mint focus:outline-none focus:border-accent-sage/40 focus:ring-1 focus:ring-accent-sage/20 appearance-none cursor-pointer"
                  >
                    <option value="">Select severity...</option>
                    <option value="critical">CRITICAL — Life threatening</option>
                    <option value="high">HIGH — Significant damage</option>
                    <option value="medium">MEDIUM — Moderate impact</option>
                    <option value="low">LOW — Minor / monitoring</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-mono text-[10px] text-accent-sage/70 uppercase tracking-widest mb-1.5">
                  Description *
                </label>
                <textarea
                  value={formState.description}
                  onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                  required
                  rows={4}
                  placeholder="Describe the situation, damage, and any immediate threats..."
                  className="w-full px-3 py-2.5 bg-bg-deep/60 border border-accent-sage/15 rounded-md font-mono text-xs text-accent-mint placeholder:text-accent-sage/35 focus:outline-none focus:border-accent-sage/40 focus:ring-1 focus:ring-accent-sage/20 resize-none"
                />
              </div>

              {/* Location */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-mono text-[10px] text-accent-sage/70 uppercase tracking-widest">
                    Location
                  </label>
                  <button
                    type="button"
                    onClick={requestLocation}
                    className="flex items-center gap-1 px-2 py-1 rounded border border-accent-sage/20 font-mono text-[9px] text-accent-sage hover:text-accent-mint hover:bg-bg-deep transition-all"
                  >
                    <MapPin className="h-3 w-3" />
                    AUTO-DETECT GPS
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={formState.latitude}
                    onChange={(e) => setFormState((prev) => ({ ...prev, latitude: e.target.value }))}
                    placeholder="Latitude"
                    className="px-3 py-2.5 bg-bg-deep/60 border border-accent-sage/15 rounded-md font-mono text-xs text-accent-mint placeholder:text-accent-sage/35 focus:outline-none focus:border-accent-sage/40"
                  />
                  <input
                    type="text"
                    value={formState.longitude}
                    onChange={(e) => setFormState((prev) => ({ ...prev, longitude: e.target.value }))}
                    placeholder="Longitude"
                    className="px-3 py-2.5 bg-bg-deep/60 border border-accent-sage/15 rounded-md font-mono text-xs text-accent-mint placeholder:text-accent-sage/35 focus:outline-none focus:border-accent-sage/40"
                  />
                  <input
                    type="text"
                    value={formState.address}
                    onChange={(e) => setFormState((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Address / Landmark"
                    className="px-3 py-2.5 bg-bg-deep/60 border border-accent-sage/15 rounded-md font-mono text-xs text-accent-mint placeholder:text-accent-sage/35 focus:outline-none focus:border-accent-sage/40"
                  />
                </div>
              </div>

              {/* Media Upload */}
              <div>
                <label className="block font-mono text-[10px] text-accent-sage/70 uppercase tracking-widest mb-1.5">
                  Evidence Media
                </label>
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-accent-sage/20 rounded-lg cursor-pointer hover:border-accent-sage/40 transition-all bg-bg-deep/20">
                  <Upload className="h-6 w-6 text-accent-sage/40 mb-2" />
                  <span className="font-mono text-[10px] text-accent-sage/50 uppercase tracking-wider">
                    Upload photos or videos
                  </span>
                  <span className="font-mono text-[8px] text-accent-sage/35 mt-1">
                    Max 10MB per file • JPG, PNG, MP4
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        setMediaFiles(Array.from(e.target.files));
                      }
                    }}
                  />
                </label>
                {mediaFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {mediaFiles.map((f, i) => (
                      <span key={i} className="px-2 py-1 bg-bg-forest/50 border border-accent-sage/15 rounded text-[9px] font-mono text-accent-sage">
                        {f.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Emergency Contact */}
              <div>
                <label className="block font-mono text-[10px] text-accent-sage/70 uppercase tracking-widest mb-1.5">
                  Emergency Contact
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-accent-sage/40" />
                  <input
                    type="tel"
                    value={formState.emergencyContact}
                    onChange={(e) => setFormState((prev) => ({ ...prev, emergencyContact: e.target.value }))}
                    placeholder="+91 XXXXXXXXXX"
                    className="w-full pl-9 pr-3 py-2.5 bg-bg-deep/60 border border-accent-sage/15 rounded-md font-mono text-xs text-accent-mint placeholder:text-accent-sage/35 focus:outline-none focus:border-accent-sage/40"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-md font-mono text-xs uppercase tracking-wider font-bold transition-all duration-300',
                    formState.isSOS
                      ? 'bg-emergency-red text-white hover:bg-emergency-red/90 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                      : 'bg-bg-pine text-accent-mint hover:bg-bg-forest border border-accent-sage/30'
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      TRANSMITTING TO AEGIS...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {formState.isSOS ? 'TRANSMIT SOS REPORT' : 'SUBMIT REPORT'}
                    </>
                  )}
                </button>
              </div>

              {/* AI Notice */}
              <div className="p-3 border border-accent-sage/10 bg-bg-deep/20 rounded-lg flex items-start gap-2">
                <Shield className="h-4 w-4 text-accent-sage/40 shrink-0 mt-0.5" />
                <p className="font-mono text-[9px] text-accent-sage/50 leading-relaxed">
                  Your report will be processed through our 5-step AI verification pipeline, including
                  temporal analysis, geospatial cross-referencing, meteorological validation, satellite
                  correlation, and LLM logic audit. This ensures rapid, accurate emergency response.
                </p>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
