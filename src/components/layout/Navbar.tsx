'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Radio, Activity, AlertTriangle, FileText, BarChart3, Settings } from 'lucide-react';
import { useAuth, UserButton, SignInButton } from '@clerk/nextjs';
import { clsx } from 'clsx';
import { PulsingDot } from '../shared/PulsingDot';

export function Navbar() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Radio },
    { name: 'Report SOS', href: '/report', icon: AlertTriangle },
    { name: 'AI Verify', href: '/verification', icon: Shield },
    { name: 'Rescue Ops', href: '/rescue', icon: Activity },
    { name: 'Alerts', href: '/alerts', icon: FileText },
    { name: 'Sentinel Vision', href: '/sentinel-vision', icon: FileText },
    { name: 'Predictive', href: '/predictive', icon: BarChart3 },
    { name: 'Admin', href: '/admin', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-accent-sage/15 bg-bg-abyss/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo / Branding */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-accent-sage/30 bg-bg-deep group-hover:border-accent-sage transition-colors duration-300 overflow-hidden">
            <img src="/logo.jpg" alt="AEGIS Logo" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-black tracking-wider text-base text-accent-mint uppercase">
              AEGIS <span className="text-accent-sage font-light">AI</span>
            </span>
            <span className="font-mono text-[8px] text-accent-sage/75 uppercase tracking-widest flex items-center gap-1">
              <PulsingDot color="green" size="sm" /> Live Intel Command
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-md font-mono text-xs uppercase tracking-wider transition-all duration-200 border',
                  isActive
                    ? 'bg-bg-forest border-accent-sage/35 text-accent-mint'
                    : 'border-transparent text-accent-sage hover:text-accent-mint hover:bg-bg-deep/50'
                )}
              >
                <Icon className={clsx('h-3.5 w-3.5', isActive ? 'text-accent-mint' : 'text-accent-sage')} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Auth / Action controls */}
        <div className="flex items-center gap-3">
          {(!isLoaded || !isSignedIn) ? (
            <SignInButton mode="modal">
              <button className="flex items-center gap-2 px-4 py-2 border border-accent-sage/30 rounded-md font-mono text-xs uppercase tracking-wider text-accent-sage hover:text-accent-mint hover:border-accent-sage hover:bg-bg-deep transition-all duration-300">
                Command Log
              </button>
            </SignInButton>
          ) : (
            <div className="flex items-center gap-3 pl-2 border-l border-accent-sage/20">
              {/* User Button */}
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: 'w-8 h-8 rounded border border-accent-sage/30 hover:border-accent-sage transition-all duration-200',
                  },
                }}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
