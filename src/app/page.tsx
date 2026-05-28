import React from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import GridBackground from '../components/shared/GridBackground';
import HeroSection from '../components/landing/HeroSection';
import LiveStatsBar from '../components/landing/LiveStatsBar';
import FeatureShowcase from '../components/landing/FeatureShowcase';
import HowItWorks from '../components/landing/HowItWorks';
import AIExplainer from '../components/landing/AIExplainer';

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Cinematic Cyber Grid Background */}
      <GridBackground />

      {/* Main Header Header */}
      <Navbar />

      {/* Landing Layout Container */}
      <main className="flex-1 w-full relative z-10">
        {/* Animated Hero Section */}
        <HeroSection />

        {/* Real-time counters stats bar */}
        <LiveStatsBar />

        {/* Features list */}
        <FeatureShowcase />

        {/* Step by step Operations cycle */}
        <HowItWorks />

        {/* AI verification breakdown */}
        <AIExplainer />
      </main>

      {/* Bottom Legal protocols footer */}
      <Footer />
    </div>
  );
}
