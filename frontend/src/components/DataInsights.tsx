'use client';

import React, { useEffect, useState } from 'react';

interface InsightData {
  peakHour?: number;
  peakCount?: number;
  slowestHour?: number;
  slowestSpeed?: number;
  fastestHour?: number;
  fastestSpeed?: number;
  topZone?: string;
  topZoneTrips?: number;
  avgTipRate?: number;
}

export const DataInsights: React.FC = () => {
  const [insights, setInsights] = useState<InsightData>({});

  useEffect(() => {
    const loadInsights = async () => {
      try {
        const [hourly, zones] = await Promise.all([
          fetch('http://localhost:5001/api/insights/hourly?start_date=2019-01-01&end_date=2019-01-31').then(r => r.json()),
          fetch('http://localhost:5001/api/insights/zone-metrics?start_date=2019-01-01&end_date=2019-01-31').then(r => r.json()),
        ]);

        const zonesList = Array.isArray(zones) ? zones : Object.values(zones);
        const topZone = zonesList
          .filter((z: any) => z.zone && z.zone !== 'N/A')
          .sort((a: any, b: any) => (b.trip_count || 0) - (a.trip_count || 0))[0];

        let peak = { hour: 0, count: 0 };
        let slowest = { hour: 0, speed: 100 };
        let fastest = { hour: 0, speed: 0 };

        hourly.forEach((h: any) => {
          if (h.trip_count > peak.count) {
            peak = { hour: h.hour, count: h.trip_count };
          }
          if (parseFloat(h.avg_speed) < slowest.speed) {
            slowest = { hour: h.hour, speed: parseFloat(h.avg_speed) };
          }
          if (parseFloat(h.avg_speed) > fastest.speed) {
            fastest = { hour: h.hour, speed: parseFloat(h.avg_speed) };
          }
        });

        setInsights({
          peakHour: peak.hour,
          peakCount: peak.count,
          slowestHour: slowest.hour,
          slowestSpeed: slowest.speed,
          fastestHour: fastest.hour,
          fastestSpeed: fastest.speed,
          topZone: topZone?.zone,
          topZoneTrips: topZone?.trip_count,
          avgTipRate: topZone?.tip_ratio,
        });
      } catch (err) {
        console.error('Failed to load insights:', err);
      }
    };

    loadInsights();
  }, []);

  const formatHour = (hour: number) => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}:00 ${ampm}`;
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="font-display font-semibold text-foreground mb-4">Data Implications</h3>
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-64 bg-gradient-to-br from-blue-900/30 to-blue-950/30 rounded-lg p-4 border border-blue-700/20">
          <div className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-1">Peak Demand</div>
          <div className="text-2xl font-bold text-blue-100">{insights.peakHour !== undefined ? formatHour(insights.peakHour) : '—'}</div>
          <div className="text-sm text-blue-300/80 mt-1">{(insights.peakCount || 0).toLocaleString()} trips</div>
        </div>

        <div className="flex-1 min-w-64 bg-gradient-to-br from-amber-900/30 to-amber-950/30 rounded-lg p-4 border border-amber-700/20">
          <div className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-1">Slowest Period</div>
          <div className="text-2xl font-bold text-amber-100">{insights.slowestHour !== undefined ? formatHour(insights.slowestHour) : '—'}</div>
          <div className="text-sm text-amber-300/80 mt-1">{insights.slowestSpeed?.toFixed(1) || '—'} mph avg</div>
        </div>

        <div className="flex-1 min-w-64 bg-gradient-to-br from-green-900/30 to-green-950/30 rounded-lg p-4 border border-green-700/20">
          <div className="text-xs uppercase tracking-wider text-green-400 font-semibold mb-1">Fastest Period</div>
          <div className="text-2xl font-bold text-green-100">{insights.fastestHour !== undefined ? formatHour(insights.fastestHour) : '—'}</div>
          <div className="text-sm text-green-300/80 mt-1">{insights.fastestSpeed?.toFixed(1) || '—'} mph avg</div>
        </div>

        <div className="flex-1 min-w-64 bg-gradient-to-br from-purple-900/30 to-purple-950/30 rounded-lg p-4 border border-purple-700/20">
          <div className="text-xs uppercase tracking-wider text-purple-400 font-semibold mb-1">Top Pickup Zone</div>
          <div className="text-2xl font-bold text-purple-100">{insights.topZone || '—'}</div>
          <div className="text-sm text-purple-300/80 mt-1">{(insights.topZoneTrips || 0).toLocaleString()} trips</div>
        </div>
      </div>
    </div>
  );
};
