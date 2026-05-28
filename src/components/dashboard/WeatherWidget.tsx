'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Thermometer, Wind, CloudRain, ShieldAlert } from 'lucide-react';
import { Incident } from '../../lib/types/incidents';
import { LoadingSpinner } from '../shared/LoadingSpinner';

interface WeatherWidgetProps {
  incident: Incident | null;
}

export function WeatherWidget({ incident }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!incident) {
      setWeather(null);
      return;
    }

    const fetchWeather = async () => {
      setLoading(true);
      try {
        const [lng, lat] = incident.location.coordinates;
        // Query our server API directly for proxying weather (avoiding CORS issues)
        const response = await axios.get(`http://localhost:3001/api/weather`, {
          params: { lat, lon: lng },
        });
        setWeather(response.data);
      } catch (err) {
        // Fallback: fetch from open-meteo directly if Express server is starting up
        try {
          const [lng, lat] = incident.location.coordinates;
          const direct = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code`
          );
          setWeather(direct.data);
        } catch (e) {
          console.error('Failed to fetch weather:', e);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [incident]);

  if (!incident) {
    return (
      <div className="h-full flex items-center justify-center text-center font-mono text-[10px] text-accent-sage/55 p-4 border border-accent-sage/10 bg-bg-deep/30 rounded-lg">
        SELECT AN ACTIVE INCIDENT ON THE RADAR TO COMMENCE WEATHER DIAGNOSTICS
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-32 flex items-center justify-center border border-accent-sage/10 bg-bg-deep/30 rounded-lg">
        <LoadingSpinner size="sm" label="Telemetry Ingestion..." />
      </div>
    );
  }

  const current = weather?.current;

  // WMO weather interpretation
  const getWeatherDesc = (code: number) => {
    if (code === 0) return 'Clear';
    if (code <= 3) return 'Partly Cloudy';
    if (code <= 48) return 'Foggy';
    if (code <= 55) return 'Drizzle';
    if (code <= 65) return 'Raining';
    if (code <= 77) return 'Snowing';
    if (code <= 82) return 'Showers';
    if (code <= 99) return 'Thunderstorm';
    return 'Overcast';
  };

  return (
    <div className="p-4 border border-accent-sage/15 bg-bg-deep/75 rounded-lg font-mono text-xs space-y-3.5 relative overflow-hidden">
      {/* Corner indicators */}
      <div className="absolute top-0 right-0 w-8 h-[1px] bg-accent-sage/30" />
      <div className="absolute top-0 right-0 w-[1px] h-8 bg-accent-sage/30" />

      <div className="flex items-center justify-between border-b border-accent-sage/10 pb-2">
        <span className="text-[10px] text-accent-sage/75 uppercase tracking-wider">
          LOCAL METEO REPORT
        </span>
        <span className="text-[9px] bg-bg-pine px-1.5 py-0.5 rounded text-accent-mint uppercase">
          {getWeatherDesc(current?.weather_code || 0)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {/* Temp */}
        <div className="p-2 border border-accent-sage/10 bg-bg-abyss/40 rounded flex flex-col items-center justify-center gap-1">
          <Thermometer className="h-3.5 w-3.5 text-emergency-amber" />
          <span className="text-[9px] text-accent-sage/70">TEMP</span>
          <span className="font-bold text-accent-mint text-[11px]">{current?.temperature_2m !== undefined ? current.temperature_2m : '--'}°C</span>
        </div>

        {/* Rain */}
        <div className="p-2 border border-accent-sage/10 bg-bg-abyss/40 rounded flex flex-col items-center justify-center gap-1">
          <CloudRain className="h-3.5 w-3.5 text-info-cyan" />
          <span className="text-[9px] text-accent-sage/70">RAIN</span>
          <span className="font-bold text-accent-mint text-[11px]">{current?.precipitation !== undefined ? current.precipitation : '--'} mm</span>
        </div>

        {/* Wind */}
        <div className="p-2 border border-accent-sage/10 bg-bg-abyss/40 rounded flex flex-col items-center justify-center gap-1">
          <Wind className="h-3.5 w-3.5 text-accent-sage" />
          <span className="text-[9px] text-accent-sage/70">WIND</span>
          <span className="font-bold text-accent-mint text-[11px]">{current?.wind_speed_10m !== undefined ? current.wind_speed_10m : '--'} km/h</span>
        </div>
      </div>

      {/* Extreme Weather indicators */}
      {current?.wind_speed_10m > 40 || current?.precipitation > 15 ? (
        <div className="p-2 border border-emergency-red/25 bg-emergency-red/5 rounded flex items-center gap-2 text-emergency-red text-[10px] uppercase tracking-wider animate-pulse">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          <span>SYS_WARN: Extreme weather in sector</span>
        </div>
      ) : incident?.type === 'wildfire' && (current?.temperature_2m > 20 && current?.precipitation < 5) ? (
        <div className="p-2 border border-emergency-orange/25 bg-emergency-orange/5 rounded flex items-center gap-2 text-emergency-orange text-[10px] uppercase tracking-wider">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          <span>SYS_WARN: Hot & dry — high fire risk</span>
        </div>
      ) : incident?.type === 'flood' && current?.precipitation > 5 ? (
        <div className="p-2 border border-emergency-orange/25 bg-emergency-orange/5 rounded flex items-center gap-2 text-emergency-orange text-[10px] uppercase tracking-wider">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          <span>SYS_WARN: Continued rain worsening flood</span>
        </div>
      ) : (
        <div className="text-[9px] text-accent-sage/55 text-center pt-1 border-t border-accent-sage/5">
          METEOROLOGICAL CONDITIONS MATCH EXPECTATIONS
        </div>
      )}
    </div>
  );
}

export default WeatherWidget;
