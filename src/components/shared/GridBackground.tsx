'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function GridBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Base Dark/Green background gradient */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#051F20] via-[#0B2B26] to-[#051F20]" />

      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 grid-background opacity-75" />

      {/* Glowing tactical grids and circles */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-accent-sage/10 to-transparent blur-[120px]" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-[#163832]/35 to-transparent blur-[150px]" />

      {/* Horizontal scanline sweeping down */}
      <div className="scanline" />

      {/* Futuristic technical crosshairs in corners */}
      <div className="absolute top-10 left-10 w-20 h-20 opacity-20 pointer-events-none select-none hidden md:block">
        <div className="absolute top-0 left-0 w-8 h-[1px] bg-accent-sage" />
        <div className="absolute top-0 left-0 w-[1px] h-8 bg-accent-sage" />
        <div className="absolute top-2 left-2 text-[8px] font-mono text-accent-sage select-none">
          SYS_LOC // 05.1F
        </div>
      </div>
      
      <div className="absolute bottom-10 right-10 w-20 h-20 opacity-20 pointer-events-none select-none hidden md:block">
        <div className="absolute bottom-0 right-0 w-8 h-[1px] bg-accent-sage" />
        <div className="absolute bottom-0 right-0 w-[1px] h-8 bg-accent-sage" />
        <div className="absolute bottom-6 right-2 text-[8px] font-mono text-accent-sage select-none text-right">
          SYS_SEC // 0B.2B
        </div>
      </div>
    </div>
  );
}

export default GridBackground;
