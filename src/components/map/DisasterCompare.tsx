'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface DisasterCompareProps {
  bbox: number[];
  dateBefore: string;
  dateAfter: string;
  disasterType: string;
}

export default function DisasterCompare({ bbox, dateBefore, dateAfter, disasterType }: DisasterCompareProps) {
  const [imgBefore, setImgBefore] = useState<string | null>(null);
  const [imgAfter, setImgAfter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    let active = true;

    async function fetchImages() {
      if (!bbox || bbox.length !== 4 || !dateBefore || !dateAfter) return;
      setLoading(true);
      try {
        const [resBefore, resAfter] = await Promise.all([
          fetch('/api/sentinel/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bbox, dateFrom: dateBefore, dateTo: dateBefore, disasterType })
          }),
          fetch('/api/sentinel/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bbox, dateFrom: dateAfter, dateTo: dateAfter, disasterType })
          })
        ]);

        if (!active) return;

        if (resBefore.ok && resAfter.ok) {
          const blobBefore = await resBefore.blob();
          const blobAfter = await resAfter.blob();
          
          if (imgBefore) URL.revokeObjectURL(imgBefore);
          if (imgAfter) URL.revokeObjectURL(imgAfter);

          setImgBefore(URL.createObjectURL(blobBefore));
          setImgAfter(URL.createObjectURL(blobAfter));
        } else {
          console.error('Failed to fetch images');
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchImages();
    
    // Cleanup
    return () => {
      active = false;
      if (imgBefore) URL.revokeObjectURL(imgBefore);
      if (imgAfter) URL.revokeObjectURL(imgAfter);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bbox.join(','), dateBefore, dateAfter, disasterType]);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setSliderPosition(percentage);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) handleMove(e.clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (isDragging.current) handleMove(e.touches[0].clientX);
  };

  if (loading) {
    return (
      <div className="w-full h-[600px] bg-bg-deep/50 flex items-center justify-center font-mono text-accent-sage flex-col gap-4 border border-accent-sage/20 rounded-lg shadow-inner">
        <Loader2 className="w-8 h-8 animate-spin text-info-cyan" />
        <div className="animate-pulse tracking-widest text-xs">PROCESSING SATELLITE IMAGERY...</div>
      </div>
    );
  }

  if (!imgBefore || !imgAfter) {
    return (
      <div className="w-full h-[600px] bg-bg-deep/50 flex items-center justify-center font-mono text-accent-sage/50 border border-accent-sage/20 rounded-lg shadow-inner uppercase tracking-wider text-sm">
        Awaiting Parameters / Failed to Load
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-[600px] overflow-hidden rounded-lg cursor-ew-resize select-none border border-accent-sage/30 shadow-2xl bg-black"
      ref={containerRef}
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
      onMouseUp={() => isDragging.current = false}
      onTouchEnd={() => isDragging.current = false}
      onMouseLeave={() => isDragging.current = false}
    >
      {/* After Image (Background) */}
      <div className="absolute inset-0 w-full h-full">
        <img src={imgAfter} alt="After" className="w-full h-full object-cover" draggable={false} />
        <div className="absolute top-4 right-4 bg-bg-abyss/80 text-accent-mint px-3 py-1.5 font-mono text-xs uppercase tracking-wider rounded border border-accent-sage/30 backdrop-blur-md z-20">
          After: {dateAfter}
        </div>
      </div>

      {/* Before Image (Clipped overlay) */}
      <div 
        className="absolute inset-0 w-full h-full z-10"
        style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
      >
        <img src={imgBefore} alt="Before" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        <div className="absolute top-4 left-4 bg-bg-abyss/80 text-accent-mint px-3 py-1.5 font-mono text-xs uppercase tracking-wider rounded border border-accent-sage/30 backdrop-blur-md">
          Before: {dateBefore}
        </div>
      </div>

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-info-cyan cursor-ew-resize hover:bg-white transition-colors z-30 shadow-[0_0_15px_rgba(0,255,255,0.8)]"
        style={{ left: `calc(${sliderPosition}% - 2px)` }}
        onMouseDown={() => isDragging.current = true}
        onTouchStart={() => isDragging.current = true}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-bg-abyss border-2 border-info-cyan rounded-full flex items-center justify-center shadow-lg cursor-ew-resize">
          <div className="flex gap-1.5">
            <div className="w-0.5 h-4 bg-info-cyan/80"></div>
            <div className="w-0.5 h-4 bg-info-cyan/80"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
