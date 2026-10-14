'use client';

import React, { useEffect, useState } from 'react';
import { FilterState } from '@/types';
import { ZoneMap } from './ZoneMap';

type Metric = 'trips' | 'speed' | 'fare';

interface MapSectionProps {
  filters?: FilterState;
  geojson?: any;
}

export const MapSection: React.FC<MapSectionProps> = ({ filters = { startDate: '2019-01-01', endDate: '2019-01-31' }, geojson: initialGeojson }) => {
  const [metric, setMetric] = useState<Metric>('trips');
  const [geojson, setGeojson] = useState<any>(initialGeojson);
  const [zoneMetrics, setZoneMetrics] = useState<any>(null);
  const [hoveredZone, setHoveredZone] = useState<{ id: string; props: any } | null>(null);

  useEffect(() => {
    if (initialGeojson) {
      setGeojson(initialGeojson);
    }
  }, [initialGeojson]);

  useEffect(() => {
    if (geojson) {
      setGeojson(geojson);
    }
  }, [geojson]);

  useEffect(() => {
    const loadMapData = async () => {
      try {
        const params = new URLSearchParams({
          start_date: filters.startDate,
          end_date: filters.endDate,
        });
        if (filters.puZone) params.append('pu_zone', String(filters.puZone));
        if (filters.minFare !== undefined) params.append('min_fare', String(filters.minFare));
        if (filters.maxFare !== undefined) params.append('max_fare', String(filters.maxFare));
        if (filters.paymentType) params.append('payment_type', String(filters.paymentType));

        const metricsRes = await fetch(`http://localhost:5001/api/insights/zone-metrics?${params}`);
        if (!metricsRes.ok) throw new Error(`API error: ${metricsRes.status}`);
        const metrics = await metricsRes.json();

        setZoneMetrics(metrics);
      } catch (err) {
        console.error('Failed to load zone metrics:', err);
      }
    };

    loadMapData();
  }, [filters]);

  const metricLabels: Record<Metric, string> = {
    trips: 'Trips',
    speed: 'Speed (mph)',
    fare: 'Fare/Mile ($)',
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 overflow-hidden space-y-4">
      <div>
        <h3 className="font-display font-semibold text-foreground mb-3">Pickup Zones by Metric</h3>
        <div className="flex gap-2 flex-wrap">
          {(['trips', 'speed', 'fare'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                metric === m ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-white'
              }`}
            >
              {metricLabels[m]}
            </button>
          ))}
        </div>
      </div>

      {geojson && zoneMetrics && (
        <ZoneMap
          geojson={geojson}
          zoneMetrics={zoneMetrics}
          metric={metric}
          onZoneHover={(id, props) => {
            setHoveredZone(id ? { id, props } : null);
          }}
        />
      )}

      {hoveredZone && (
        <div className="px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-slate-200">
          <div className="font-semibold text-white">
            {hoveredZone.props?.Zone} ({hoveredZone.props?.Borough})
          </div>
          <div className="text-[11px] text-slate-400 mt-1">ID: {hoveredZone.id}</div>
        </div>
      )}

      <div id="map-legend" className="mt-3 text-xs text-muted-foreground flex flex-wrap gap-1" />
    </div>
  );
};
