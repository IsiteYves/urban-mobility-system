'use client';

import React, { useEffect, useState } from 'react';
import Map from './Map';

interface MapContainerProps {
  geojson?: any;
  loading?: boolean;
}

type Metric = 'trips' | 'speed' | 'fare' | 'tip';

export const MapContainer: React.FC<MapContainerProps> = ({ geojson, loading }) => {
  const [metric, setMetric] = useState<Metric>('trips');
  const [zoneData, setZoneData] = useState<any[]>([]);

  useEffect(() => {
    const loadZoneMetrics = async () => {
      try {
        const res = await fetch('http://localhost:5001/api/insights/zone-metrics?start_date=2019-01-01&end_date=2019-01-31');
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        setZoneData(Array.isArray(data) ? data : Object.values(data));
      } catch (err) {
        console.error('Zone metrics load failed:', err);
      }
    };
    loadZoneMetrics();
  }, []);

  const mapId = 'zone-map-container';

  return (
    <div className="bg-card rounded-lg border border-border p-6 overflow-hidden">
      <div className="mb-4">
        <h3 className="font-display font-semibold text-foreground mb-3">Pickup Zones by Metric</h3>
        <div className="flex gap-2 flex-wrap">
          {(['trips', 'speed', 'fare', 'tip'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                metric === m
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-secondary'
              }`}
            >
              {m === 'trips' && 'Trips'}
              {m === 'speed' && 'Speed (mph)'}
              {m === 'fare' && 'Fare/Mile ($)'}
              {m === 'tip' && 'Tip %'}
            </button>
          ))}
        </div>
      </div>

      <div id={mapId} className="bg-muted rounded-md overflow-hidden" style={{ height: '480px', width: '100%' }} />

      {geojson && zoneData.length > 0 && (
        <Map mapId={mapId} geojson={geojson} zoneData={zoneData} metric={metric} />
      )}

      <div id="map-legend" className="mt-3 text-xs text-muted-foreground flex flex-wrap gap-3"></div>
    </div>
  );
};
