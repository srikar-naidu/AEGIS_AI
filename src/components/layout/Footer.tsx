'use client';

import React from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-accent-sage/10 bg-bg-abyss/80 py-8 relative z-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-[10px] text-accent-sage/55">
        
        {/* Branding */}
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent-sage" />
          <span>AEGIS SYSTEM PROTOCOLS // © {new Date().getFullYear()} ALL RIGHTS RESERVED</span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="hover:text-accent-mint transition-colors">DASHBOARD</Link>
          <Link href="/report" className="hover:text-accent-mint transition-colors">REPORT_SOS</Link>
          <Link href="/verification" className="hover:text-accent-mint transition-colors">AI_VERIFY</Link>
          <Link href="/rescue" className="hover:text-accent-mint transition-colors">RESCUE_OPS</Link>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-1.5 uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-success-green animate-ping" />
          <span>SYS_LATENCY: 14ms // DB_REFRESH: ACTIVE</span>
        </div>

      </div>
    </footer>
  );
}

export default Footer;
