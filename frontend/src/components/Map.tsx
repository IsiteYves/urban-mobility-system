'use client';

import { useEffect, useRef } from 'react';

type Metric = 'trips' | 'speed' | 'fare' | 'tip';

interface MapProps {
  mapId: string;
  geojson: any;
  zoneData: any[];
  metric: Metric;
}

const COLOURS = ['#1d2b4a', '#2f4b7c', '#665191', '#a05195', '#d45087', '#f95d6a', '#ffa600'];

function ZoneMap(props: MapProps) {
  const { mapId, geojson, zoneData, metric } = props;
  const mapInstanceRef = useRef<any>(null);
  const zoneLayerRef = useRef<any>(null);
  const zoneDataMapRef = useRef<Map<number, any>>(new Map());

  const getMetricValue = (zone: any): number => {
    if (metric === 'trips') return zone.trip_count || 0;
    if (metric === 'speed') return zone.avg_speed || 0;
    if (metric === 'fare') return zone.avg_fare_per_mile || 0;
    return (zone.tip_ratio || 0) * 100;
  };

  const getLimits = (): number[] => {
    const values = zoneData
      .map(getMetricValue)
      .filter((v) => v !== null && Number.isFinite(v))
      .sort((a, b) => a - b);

    if (values.length === 0) return [];

    const result: number[] = [];
    for (let i = 1; i < COLOURS.length; i++) {
      const pos = Math.min(values.length - 1, Math.floor((i * values.length) / COLOURS.length));
      result.push(values[pos]);
    }
    return result;
  };

  const getColour = (value: number | null, limits: number[]): string => {
    if (value === null || value === undefined) return '#141b2b';
    let group = 0;
    while (group < limits.length && value > limits[group]) group++;
    return COLOURS[group];
  };

  const formatValue = (value: number): string => {
    if (metric === 'trips') return Math.round(value).toLocaleString();
    if (metric === 'speed') return value.toFixed(1);
    if (metric === 'fare') return '$' + value.toFixed(2);
    return value.toFixed(1) + '%';
  };

  const drawLegend = (limits: number[]) => {
    const legend = document.getElementById('map-legend');
    if (!legend || limits.length === 0) return;

    const metricLabel = metric === 'trips' ? 'Trips' : metric === 'speed' ? 'Speed (mph)' : metric === 'fare' ? 'Fare/Mile ($)' : 'Tip %';
    let html = `<strong>${metricLabel}:</strong> `;

    for (let i = 0; i < COLOURS.length; i++) {
      let text = '';
      if (i === 0) text = `up to ${formatValue(limits[0])}`;
      else if (i === COLOURS.length - 1) text = `over ${formatValue(limits[i - 1])}`;
      else text = `${formatValue(limits[i - 1])} - ${formatValue(limits[i])}`;
      html += `<span class="flex items-center gap-1"><i style="background:${COLOURS[i]}" class="w-3 h-3 rounded"></i>${text}</span>`;
    }
    legend.innerHTML = html;
  };

  useEffect(() => {
    if (!geojson || typeof document === 'undefined' || mapInstanceRef.current) return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      const container = document.getElementById(mapId);
      if (!container) return;

      const map = L.map(container).setView([40.71, -73.95], 10);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      const zoneLayer = L.geoJSON(geojson, {
        style: () => ({ color: '#fff', weight: 0.6, fillOpacity: 0.1 }),
        onEachFeature: (feature: any, layer: any) => {
          layer.bindTooltip('', { sticky: true });
          layer.on('mouseover', () => layer.setStyle({ weight: 2, color: '#ffffff' }));
          layer.on('mouseout', () => {
            zoneLayer.resetStyle(layer);
          });
        },
      }).addTo(map);

      mapInstanceRef.current = map;
      zoneLayerRef.current = zoneLayer;
      map.fitBounds(zoneLayer.getBounds());
    };

    initMap();
  }, [geojson, mapId]);

  useEffect(() => {
    if (!zoneLayerRef.current || !mapInstanceRef.current) return;

    zoneDataMapRef.current = new Map(zoneData.map((z) => [z.location_id, z]));
    const limits = getLimits();
    const zoneLayer = zoneLayerRef.current;

    const zoneStyle = (feature: any) => {
      const data = zoneDataMapRef.current.get(feature.properties?.LocationID);
      const value = data ? getMetricValue(data) : null;
      return {
        color: 'rgba(255,255,255,.25)',
        weight: 0.6,
        fillColor: getColour(value, limits),
        fillOpacity: data ? 0.82 : 0.25,
      };
    };

    const tooltipContent = (feature: any): string => {
      const data = zoneDataMapRef.current.get(feature.properties?.LocationID);
      const zone = feature.properties?.Zone || 'Unknown';
      const borough = feature.properties?.Borough || '';

      if (!data) return `<strong>${zone}</strong><br><small>${borough}</small><br>No trips`;

      const trips = data.trip_count?.toLocaleString() || '0';
      const speed = data.avg_speed?.toFixed(1) || '0';
      const fare = '$' + (data.avg_fare_per_mile?.toFixed(2) || '0');
      const tip = (data.tip_ratio * 100).toFixed(1) + '%';

      return `<strong>${zone}</strong><br><small>${borough}</small><br>${trips} trips - ${speed} mph - ${fare}/mi - tip ${tip}`;
    };

    zoneLayer.setStyle(zoneStyle);
    zoneLayer.eachLayer((layer: any) => {
      layer.setTooltipContent(tooltipContent(layer.feature));
    });

    drawLegend(limits);
  }, [metric, zoneData]);

  return null;
}

export default ZoneMap;
