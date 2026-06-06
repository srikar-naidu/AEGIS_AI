'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Navbar } from '../../components/layout/Navbar';
import {
  Layers,
  ScanSearch,
  Loader2,
  Satellite,
  Eye,
  EyeOff,
  Maximize2,
  SplitSquareHorizontal,
  X,
} from 'lucide-react';

// Dynamically import the map component to avoid SSR issues with Leaflet
const SentinelMap = dynamic(() => import('../../components/map/SentinelMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-bg-abyss flex items-center justify-center font-mono text-xs text-accent-sage animate-pulse">
      [INITIALIZING GEOSPATIAL ENGINE...]
    </div>
  ),
});

export default function SentinelVisionPage() {
  // Map-driven bbox state
  const [bbox, setBbox] = useState<number[]>([73.0, 18.0, 80.0, 24.0]); // Default: Central India
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [disasterType, setDisasterType] = useState('truecolor');

  // Satellite overlay state
  const [satelliteUrl, setSatelliteUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(80);
  const [error, setError] = useState<string | null>(null);

  // Compare mode state
  const [compareMode, setCompareMode] = useState(false);
  const [compareBeforeUrl, setCompareBeforeUrl] = useState<string | null>(null);
  const [compareAfterUrl, setCompareAfterUrl] = useState<string | null>(null);
  const [compareDateBefore, setCompareDateBefore] = useState('');
  const [compareDateAfter, setCompareDateAfter] = useState('');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isCompareLoading, setIsCompareLoading] = useState(false);
  const isDragging = useRef(false);
  const compareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 14);
    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(lastWeek.toISOString().split('T')[0]);

    // Compare defaults
    const twoMonthsAgo = new Date(today);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    setCompareDateBefore(twoMonthsAgo.toISOString().split('T')[0]);
    setCompareDateAfter(today.toISOString().split('T')[0]);
  }, []);

  const fetchSatelliteImage = async () => {
    if (!bbox || bbox.length !== 4 || !dateFrom || !dateTo) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sentinel/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bbox, dateFrom, dateTo, disasterType }),
      });
      if (res.ok) {
        const blob = await res.blob();
        if (satelliteUrl) URL.revokeObjectURL(satelliteUrl);
        setSatelliteUrl(URL.createObjectURL(blob));
        setShowOverlay(true);
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to fetch satellite image');
      }
    } catch (e) {
      setError('Network error fetching satellite image');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompareImages = async () => {
    if (!bbox || bbox.length !== 4 || !compareDateBefore || !compareDateAfter) return;
    setIsCompareLoading(true);
    setError(null);
    try {
      const [resBefore, resAfter] = await Promise.all([
        fetch('/api/sentinel/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bbox, dateFrom: compareDateBefore, dateTo: compareDateBefore, disasterType }),
        }),
        fetch('/api/sentinel/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bbox, dateFrom: compareDateAfter, dateTo: compareDateAfter, disasterType }),
        }),
      ]);
      if (resBefore.ok && resAfter.ok) {
        const blobBefore = await resBefore.blob();
        const blobAfter = await resAfter.blob();
        if (compareBeforeUrl) URL.revokeObjectURL(compareBeforeUrl);
        if (compareAfterUrl) URL.revokeObjectURL(compareAfterUrl);
        setCompareBeforeUrl(URL.createObjectURL(blobBefore));
        setCompareAfterUrl(URL.createObjectURL(blobAfter));
      } else {
        setError('Failed to fetch comparison images');
      }
    } catch (e) {
      setError('Network error fetching comparison images');
    } finally {
      setIsCompareLoading(false);
    }
  };

  const handleCompareMove = useCallback((clientX: number) => {
    if (!compareRef.current) return;
    const rect = compareRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  }, []);

  const analysisTypes = [
    { value: 'truecolor', label: 'True Color', desc: 'Natural optical view' },
    { value: 'flood', label: 'Flood (NDWI)', desc: 'Water extent detection' },
    { value: 'wildfire', label: 'Wildfire (NBR)', desc: 'Burn area mapping' },
    { value: 'drought', label: 'Drought (NDVI)', desc: 'Vegetation stress' },
    { value: 'earthquake', label: 'Earthquake', desc: 'Enhanced damage view' },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-bg-abyss text-accent-sage">
      <Navbar />
      <div className="flex flex-1 overflow-hidden"><main className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-accent-sage/15 bg-bg-deep/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg border border-info-cyan/30 bg-info-cyan/10 flex items-center justify-center">
                <Satellite className="h-4 w-4 text-info-cyan" />
              </div>
              <div>
                <h1 className="font-heading text-sm font-bold text-accent-mint uppercase tracking-wider">
                  Copernicus Sentinel Vision
                </h1>
                <p className="font-mono text-[9px] text-accent-sage/50 uppercase tracking-widest">
                  Sentinel-2 L2A • 10m Resolution • Multispectral Analysis
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCompareMode(false)}
                className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-wider transition-all border ${
                  !compareMode
                    ? 'bg-info-cyan/15 border-info-cyan/40 text-info-cyan'
                    : 'border-accent-sage/20 text-accent-sage/60 hover:text-accent-sage'
                }`}
              >
                <Maximize2 className="w-3 h-3 inline mr-1.5" />
                Map Scan
              </button>
              <button
                onClick={() => setCompareMode(true)}
                className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-wider transition-all border ${
                  compareMode
                    ? 'bg-info-cyan/15 border-info-cyan/40 text-info-cyan'
                    : 'border-accent-sage/20 text-accent-sage/60 hover:text-accent-sage'
                }`}
              >
                <SplitSquareHorizontal className="w-3 h-3 inline mr-1.5" />
                Before / After
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Control Panel */}
            <div className="w-80 shrink-0 border-r border-accent-sage/15 bg-bg-deep/20 flex flex-col overflow-y-auto">
              {/* Analysis Mode */}
              <div className="p-4 border-b border-accent-sage/10">
                <div className="font-mono text-[10px] text-accent-sage/60 uppercase tracking-widest mb-3">
                  Analysis Mode
                </div>
                <div className="space-y-1.5">
                  {analysisTypes.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setDisasterType(t.value)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all text-left border ${
                        disasterType === t.value
                          ? 'bg-info-cyan/10 border-info-cyan/30 text-info-cyan'
                          : 'border-transparent text-accent-sage/70 hover:bg-bg-deep/50 hover:text-accent-sage'
                      }`}
                    >
                      <div>
                        <div className="font-mono text-[11px] font-semibold uppercase tracking-wider">{t.label}</div>
                        <div className="font-mono text-[9px] opacity-60">{t.desc}</div>
                      </div>
                      {disasterType === t.value && (
                        <div className="w-2 h-2 rounded-full bg-info-cyan shadow-[0_0_6px_rgba(0,255,255,0.6)]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="p-4 border-b border-accent-sage/10">
                <div className="font-mono text-[10px] text-accent-sage/60 uppercase tracking-widest mb-3">
                  {compareMode ? 'Comparison Dates' : 'Date Range'}
                </div>
                {compareMode ? (
                  <div className="space-y-3">
                    <div>
                      <label className="font-mono text-[9px] text-accent-sage/50 uppercase block mb-1">Before Date</label>
                      <input
                        type="date"
                        value={compareDateBefore}
                        onChange={(e) => setCompareDateBefore(e.target.value)}
                        className="w-full bg-bg-abyss border border-accent-sage/25 rounded-md p-2 text-accent-mint font-mono text-xs focus:outline-none focus:border-info-cyan transition-colors"
                      />
                    </div>
                    <div>
                      <label className="font-mono text-[9px] text-accent-sage/50 uppercase block mb-1">After Date</label>
                      <input
                        type="date"
                        value={compareDateAfter}
                        onChange={(e) => setCompareDateAfter(e.target.value)}
                        className="w-full bg-bg-abyss border border-accent-sage/25 rounded-md p-2 text-accent-mint font-mono text-xs focus:outline-none focus:border-info-cyan transition-colors"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="font-mono text-[9px] text-accent-sage/50 uppercase block mb-1">From</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full bg-bg-abyss border border-accent-sage/25 rounded-md p-2 text-accent-mint font-mono text-xs focus:outline-none focus:border-info-cyan transition-colors"
                      />
                    </div>
                    <div>
                      <label className="font-mono text-[9px] text-accent-sage/50 uppercase block mb-1">To</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full bg-bg-abyss border border-accent-sage/25 rounded-md p-2 text-accent-mint font-mono text-xs focus:outline-none focus:border-info-cyan transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Region Info */}
              <div className="p-4 border-b border-accent-sage/10">
                <div className="font-mono text-[10px] text-accent-sage/60 uppercase tracking-widest mb-3">
                  Selected Region (BBOX)
                </div>
                <div className="bg-bg-abyss/60 border border-accent-sage/15 rounded-md p-2.5 font-mono text-[10px] text-accent-mint/80 space-y-1">
                  <div className="flex justify-between"><span className="text-accent-sage/50">W:</span> <span>{bbox[0]?.toFixed(4)}</span></div>
                  <div className="flex justify-between"><span className="text-accent-sage/50">S:</span> <span>{bbox[1]?.toFixed(4)}</span></div>
                  <div className="flex justify-between"><span className="text-accent-sage/50">E:</span> <span>{bbox[2]?.toFixed(4)}</span></div>
                  <div className="flex justify-between"><span className="text-accent-sage/50">N:</span> <span>{bbox[3]?.toFixed(4)}</span></div>
                </div>
                <p className="font-mono text-[8px] text-accent-sage/40 mt-2 uppercase">
                  Pan & zoom the map to change region
                </p>
              </div>

              {/* Overlay Controls (Map Scan mode) */}
              {!compareMode && satelliteUrl && (
                <div className="p-4 border-b border-accent-sage/10">
                  <div className="font-mono text-[10px] text-accent-sage/60 uppercase tracking-widest mb-3">
                    Overlay Controls
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-accent-sage/70">Visibility</span>
                      <button
                        onClick={() => setShowOverlay(!showOverlay)}
                        className="text-accent-sage/70 hover:text-accent-mint transition-colors"
                      >
                        {showOverlay ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-mono text-[9px] text-accent-sage/50">Opacity</span>
                        <span className="font-mono text-[9px] text-info-cyan">{overlayOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={overlayOpacity}
                        onChange={(e) => setOverlayOpacity(parseInt(e.target.value))}
                        className="w-full accent-info-cyan h-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="p-4 mt-auto">
                {error && (
                  <div className="mb-3 p-2 border border-emergency-red/30 bg-emergency-red/5 rounded-md font-mono text-[10px] text-emergency-red flex items-start gap-2">
                    <X className="w-3 h-3 shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}
                <button
                  onClick={compareMode ? fetchCompareImages : fetchSatelliteImage}
                  disabled={isLoading || isCompareLoading}
                  className="w-full bg-info-cyan/10 hover:bg-info-cyan/20 border border-info-cyan/40 text-info-cyan py-3 rounded-lg uppercase tracking-widest font-mono text-xs font-bold transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,255,255,0.08)] hover:shadow-[0_0_30px_rgba(0,255,255,0.15)]"
                >
                  {(isLoading || isCompareLoading) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ScanSearch className="w-4 h-4" />
                      {compareMode ? 'Compare Images' : 'Scan Area'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Map / Compare View */}
            <div className="flex-1 relative">
              {!compareMode ? (
                /* === Map Scan Mode === */
                <SentinelMap
                  onBoundsChange={setBbox}
                  satelliteUrl={showOverlay ? satelliteUrl : null}
                  satelliteBounds={
                    bbox
                      ? ([[bbox[1], bbox[0]], [bbox[3], bbox[2]]] as [[number, number], [number, number]])
                      : null
                  }
                  overlayOpacity={overlayOpacity / 100}
                />
              ) : (
                /* === Before/After Compare Mode === */
                <div className="w-full h-full flex items-center justify-center bg-bg-abyss">
                  {isCompareLoading ? (
                    <div className="flex flex-col items-center gap-4 font-mono text-accent-sage">
                      <Loader2 className="w-10 h-10 animate-spin text-info-cyan" />
                      <span className="text-xs uppercase tracking-widest animate-pulse">
                        Processing Satellite Imagery...
                      </span>
                    </div>
                  ) : compareBeforeUrl && compareAfterUrl ? (
                    <div
                      ref={compareRef}
                      className="relative w-full h-full cursor-ew-resize select-none overflow-hidden"
                      onMouseMove={(e) => { if (isDragging.current) handleCompareMove(e.clientX); }}
                      onTouchMove={(e) => { if (isDragging.current) handleCompareMove(e.touches[0].clientX); }}
                      onMouseUp={() => (isDragging.current = false)}
                      onTouchEnd={() => (isDragging.current = false)}
                      onMouseLeave={() => (isDragging.current = false)}
                    >
                      {/* After (full background) */}
                      <img src={compareAfterUrl} alt="After" className="absolute inset-0 w-full h-full object-contain bg-black" draggable={false} />
                      <div className="absolute top-4 right-4 bg-bg-abyss/80 text-emergency-orange px-3 py-1.5 font-mono text-xs uppercase tracking-wider rounded border border-emergency-orange/30 backdrop-blur-md z-20">
                        After: {compareDateAfter}
                      </div>

                      {/* Before (clipped) */}
                      <div
                        className="absolute inset-0 w-full h-full z-10"
                        style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
                      >
                        <img src={compareBeforeUrl} alt="Before" className="absolute inset-0 w-full h-full object-contain bg-black" draggable={false} />
                        <div className="absolute top-4 left-4 bg-bg-abyss/80 text-info-cyan px-3 py-1.5 font-mono text-xs uppercase tracking-wider rounded border border-info-cyan/30 backdrop-blur-md">
                          Before: {compareDateBefore}
                        </div>
                      </div>

                      {/* Slider handle */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white/80 cursor-ew-resize z-30"
                        style={{ left: `${sliderPosition}%` }}
                        onMouseDown={() => (isDragging.current = true)}
                        onTouchStart={() => (isDragging.current = true)}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-bg-abyss/90 border-2 border-white/80 rounded-full flex items-center justify-center shadow-lg">
                          <SplitSquareHorizontal className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 font-mono text-accent-sage/40">
                      <SplitSquareHorizontal className="w-14 h-14 opacity-30" />
                      <p className="text-xs uppercase tracking-widest text-center px-8">
                        Select dates and click "Compare Images" to analyze temporal changes
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
