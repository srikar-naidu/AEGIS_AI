'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radio, AlertTriangle, Shield, Activity, FileText, BarChart3, Settings, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { clsx } from 'clsx';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: 'Live Dashboard', href: '/dashboard', icon: Radio },
    { name: 'Report Emergency', href: '/report', icon: AlertTriangle },
    { name: 'AI Verification', href: '/verification', icon: Shield },
    { name: 'Rescue Teams', href: '/rescue', icon: Activity },
    { name: 'Active Alerts', href: '/alerts', icon: FileText },
    { name: 'Predictions', href: '/analytics', icon: BarChart3 },
    { name: 'System Settings', href: '/admin', icon: Settings },
  ];

  return (
    <aside
      className={clsx(
        'hidden md:flex flex-col border-r border-accent-sage/15 bg-bg-abyss transition-all duration-300 relative',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-4 right-[-12px] h-6 w-6 rounded-full border border-accent-sage/35 bg-bg-deep flex items-center justify-center text-accent-sage hover:text-accent-mint hover:bg-bg-pine z-30 transition-all duration-200"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      <div className="flex flex-col flex-1 py-6 overflow-y-auto">
        {/* Navigation list */}
        <nav className="flex-1 space-y-1.5 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md font-mono text-xs uppercase tracking-wider transition-all duration-150 border group relative',
                  isActive
                    ? 'bg-bg-forest border-accent-sage/35 text-accent-mint font-semibold'
                    : 'border-transparent text-accent-sage hover:text-accent-mint hover:bg-bg-deep/40'
                )}
              >
                <Icon className={clsx('h-4 w-4 shrink-0', isActive ? 'text-accent-mint' : 'text-accent-sage group-hover:text-accent-mint')} />
                
                {!collapsed && <span>{item.name}</span>}

                {/* Tooltip on collapse */}
                {collapsed && (
                  <div className="absolute left-16 pl-2 hidden group-hover:block z-50">
                    <div className="bg-bg-deep border border-accent-sage/30 text-accent-mint px-2.5 py-1.5 rounded text-[10px] uppercase tracking-wider font-mono whitespace-nowrap glow-mint">
                      {item.name}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* System diagnostics in footer */}
      {!collapsed && (
        <div className="p-4 border-t border-accent-sage/10 bg-bg-deep/30 font-mono text-[9px] text-accent-sage/60 space-y-1 select-none">
          <div className="flex justify-between">
            <span>SYS_STATUS:</span>
            <span className="text-success-green font-semibold">SECURE</span>
          </div>
          <div className="flex justify-between">
            <span>SOCKET_CONN:</span>
            <span className="text-success-green">ONLINE</span>
          </div>
          <div className="flex justify-between">
            <span>GEO_INDEXES:</span>
            <span>2DSPHERE</span>
          </div>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
