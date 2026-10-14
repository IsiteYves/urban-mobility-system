'use client';

import React, { useEffect, useState, useRef } from 'react';

type Metric = 'trips' | 'speed' | 'fare' | 'tip';

interface MobilityMapProps {
  geojson?: any;
  loading?: boolean;
}

export const MobilityMap: React.FC<MobilityMapProps> = ({ geojson, loading }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [zoneMetrics, setZoneMetrics] = useState<Record<number, any>>({});
  const [metric, setMetric] = useState<Metric>('trips');
  const [leafletReady, setLeafletReady] = useState(false);

  useEffect(() => {
    setLeafletReady(true);
  }, []);

  // Load zone metrics from API
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch(
          'http://localhost:5001/api/insights/zone-metrics?start_date=2019-01-01&end_date=2019-01-31'
        );
        const data = await res.json();
        setZoneMetrics(data);
      } catch (err) {
        console.error('Failed to load zone metrics:', err);
      }
    };
    fetchMetrics();
  }, []);

  useEffect(() => {
    if (!leafletReady || !mapRef.current || map) return;

    (async () => {
      const L = (await import('leaflet')).default;
      const newMap = L.map(mapRef.current).setView([40.7128, -74.006], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(newMap);
      setMap(newMap);
    })();

    return () => {
      if (map) map.remove();
    };
  }, [leafletReady, map]);

  useEffect(() => {
    if (!map || !geojson || Object.keys(zoneMetrics).length === 0) return;

    (async () => {
      const L = (await import('leaflet')).default;

      // Get min/max for current metric
      const values = Object.values(zoneMetrics).map((z: any) => {
        if (metric === 'trips') return z.trip_count;
        if (metric === 'speed') return z.avg_speed;
        if (metric === 'fare') return z.avg_fare_per_mile;
        return z.tip_ratio * 100;
      });

      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;

      const getColor = (zoneId: number) => {
        const metrics = zoneMetrics[zoneId];
        if (!metrics) return '#f0f0f0';

        let val = 0;
        if (metric === 'trips') val = metrics.trip_count;
        if (metric === 'speed') val = metrics.avg_speed;
        if (metric === 'fare') val = metrics.avg_fare_per_mile;
        if (metric === 'tip') val = metrics.tip_ratio * 100;

        const intensity = (val - min) / range;
        const h = 200 + intensity * 60;
        const s = 70;
        const l = 50 - intensity * 20;
        return `hsl(${h}, ${s}%, ${l}%)`;
      };

      const geoJsonLayer = L.geoJSON(geojson, {
        style: (feature: any) => ({
          fillColor: getColor(feature?.properties?.LocationID),
          weight: 1.5,
          opacity: 1,
          color: '#666',
          fillOpacity: 0.8,
        }),
        onEachFeature: (feature: any, layer: any) => {
          const zoneId = feature.properties?.LocationID;
          const metrics = zoneMetrics[zoneId];
          const zone = feature.properties?.Zone || 'Unknown';

          let val = 0, label = '';
          if (metric === 'trips') {
            val = metrics?.trip_count || 0;
            label = `${val.toLocaleString()} trips`;
          } else if (metric === 'speed') {
            val = metrics?.avg_speed || 0;
            label = `${val.toFixed(1)} mph`;
          } else if (metric === 'fare') {
            val = metrics?.avg_fare_per_mile || 0;
            label = `$${val.toFixed(2)}/mi`;
          } else {
            val = (metrics?.tip_ratio || 0) * 100;
            label = `${val.toFixed(1)}%`;
          }

          const popup = `<div style="font-size:12px"><strong>${zone}</strong><br/>${label}</div>`;
          layer.bindPopup(popup);
        },
      }).addTo(map);

      return () => {
        if (map && geoJsonLayer) map.removeLayer(geoJsonLayer);
      };
    })();
  }, [map, geojson, zoneMetrics, metric]);

  return (
    <div className="bg-card rounded-lg border border-border p-6 overflow-hidden">
      <div className="mb-3">
        <h3 className="font-display font-semibold text-foreground mb-3">Pickup Zones - Colored by Metric</h3>
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
              {m === 'speed' && 'Speed'}
              {m === 'fare' && 'Fare/Mile'}
              {m === 'tip' && 'Tip %'}
            </button>
          ))}
        </div>
      </div>
      <div ref={mapRef} className="h-96 w-full rounded-md bg-muted overflow-hidden" />
    </div>
  );
};
