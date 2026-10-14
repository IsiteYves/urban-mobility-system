'use client';

import React, { useEffect, useRef } from 'react';

type Metric = 'trips' | 'speed' | 'fare';

interface ZoneMapProps {
  geojson: any;
  zoneMetrics: any;
  metric?: Metric;
  onZoneHover?: (id: string | null, props?: any) => void;
}

const COLOUR_RAMP = ['#dbeafe', '#93c5fd', '#60a5fa', '#2563eb', '#1e3a8a'];
const NO_DATA_COLOUR = '#cbd5e1';

function extractFirstCoord(coords: any): [number, number] | null {
  if (!Array.isArray(coords) || coords.length === 0) return null;
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    return [coords[0], coords[1]];
  }
  return extractFirstCoord(coords[0]);
}

function sanitizeAndRepairGeoJSON(raw: any): any {
  if (!raw) return null;

  const rawFeatures = Array.isArray(raw) ? raw : raw.features || raw.data || [];

  if (rawFeatures.length > 0) {
    console.group('🔍 RAW FEATURE[0] INSPECTION');
    console.log('Raw feature[0]:', rawFeatures[0]);
    console.log('typeof geometry:', typeof rawFeatures[0]?.geometry);
    console.log('geometry value:', rawFeatures[0]?.geometry);
    console.groupEnd();
  }

  function repairCoords(coords: any): any {
    if (!Array.isArray(coords) || coords.length === 0) return coords;
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const [a, b] = coords;
      if (a >= 40.0 && a <= 41.5 && b >= -74.6 && b <= -73.4) {
        return [b, a];
      }
      return [a, b];
    }
    return coords.map(repairCoords);
  }

  const validFeatures: any[] = [];

  for (const item of rawFeatures) {
    if (!item) continue;

    let geom = item.geometry ?? item.geom ?? item.geojson ?? item.the_geom;

    if (typeof geom === 'string') {
      try {
        geom = JSON.parse(geom);
      } catch {
        continue;
      }
    }

    if (!geom || !geom.type || !Array.isArray(geom.coordinates)) continue;

    const normType =
      geom.type.toLowerCase() === 'polygon'
        ? 'Polygon'
        : geom.type.toLowerCase() === 'multipolygon'
          ? 'MultiPolygon'
          : geom.type;

    if (normType !== 'Polygon' && normType !== 'MultiPolygon') continue;

    const repairedCoordinates = repairCoords(geom.coordinates);
    const properties = item.properties || { ...item };

    validFeatures.push({
      type: 'Feature',
      properties,
      geometry: {
        type: normType,
        coordinates: repairedCoordinates,
      },
    });
  }

  console.log(`Sanitized: ${validFeatures.length} / ${rawFeatures.length} valid NYC polygons`);

  return {
    type: 'FeatureCollection',
    features: validFeatures,
  };
}

function isValidNYCPolygon(feature: any): boolean {
  if (!feature?.geometry) return false;
  const type = feature.geometry.type;
  return type === 'Polygon' || type === 'MultiPolygon';
}

function getLocationId(feature: any): string {
  const props = feature?.properties || {};
  const id = props.LocationID ?? props.location_id ?? props.locationid ?? props.OBJECTID ?? props.id ?? feature?.id;
  return id !== undefined && id !== null ? String(id) : '';
}

function normalizeMetrics(raw: any): Record<string, any> {
  if (!raw) return {};

  const payload = raw.data ?? raw.zones ?? raw;
  const result: Record<string, any> = {};

  if (Array.isArray(payload)) {
    for (const row of payload) {
      if (!row) continue;
      const id = row.LocationID ?? row.location_id ?? row.locationid ?? row.zone_id ?? row.id;
      if (id !== undefined && id !== null) {
        result[String(id)] = row;
      }
    }
    return result;
  }

  if (typeof payload === 'object') {
    for (const [key, val] of Object.entries(payload)) {
      result[String(key)] = val;
    }
  }

  return result;
}

function getMetricValue(zone: any, metric: string): number | null {
  if (!zone) return null;
  if (typeof zone[metric] === 'number') return zone[metric];

  const aliases: Record<string, string[]> = {
    trips: ['trips', 'trip_count', 'total_trips'],
    trip_count: ['trip_count', 'trips', 'total_trips'],
    speed: ['speed', 'avg_speed', 'average_speed'],
    avg_speed: ['avg_speed', 'speed', 'average_speed'],
    fare: ['fare', 'avg_fare', 'avg_fare_per_mile'],
    avg_fare_per_mile: ['avg_fare_per_mile', 'fare', 'avg_fare'],
  };

  for (const key of aliases[metric] || [metric]) {
    const val = zone[key];
    if (val !== undefined && val !== null && !isNaN(Number(val))) {
      return Number(val);
    }
  }
  return null;
}

function computeLimits(values: number[]): number[] {
  const sorted = values.filter((v) => typeof v === 'number' && !isNaN(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return [0, 1, 2, 3, 4];
  const quantiles = [0.2, 0.4, 0.6, 0.8, 1.0];
  return quantiles.map((q) => {
    const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
    return sorted[idx];
  });
}

function getColour(val: number | null, limits: number[]): string {
  if (val === null || val === undefined || isNaN(val)) return NO_DATA_COLOUR;
  for (let i = 0; i < limits.length; i++) {
    if (val <= limits[i]) return COLOUR_RAMP[i];
  }
  return COLOUR_RAMP[COLOUR_RAMP.length - 1];
}

export const ZoneMap: React.FC<ZoneMapProps> = ({ geojson, zoneMetrics, metric = 'trip_count', onZoneHover }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const geoJsonLayerRef = useRef<any>(null);

  const stateRef = useRef({
    statsByZone: {} as Record<string, any>,
    currentMetric: metric,
    limits: [] as number[],
  });

  const getFeatureStyle = (feature: any) => {
    const locId = getLocationId(feature);
    const zone = stateRef.current.statsByZone[locId];
    const val = getMetricValue(zone, stateRef.current.currentMetric);
    const colour = getColour(val, stateRef.current.limits);

    return {
      color: '#1e293b',
      weight: 1.2,
      opacity: 0.85,
      fillColor: colour,
      fillOpacity: val !== null ? 0.75 : 0.35,
    };
  };

  const updateMap = () => {
    const layer = geoJsonLayerRef.current;
    if (!layer) return;

    const normalized = normalizeMetrics(zoneMetrics);
    const allValues = Object.values(normalized)
      .map((row) => getMetricValue(row, metric))
      .filter((v): v is number => v !== null);

    stateRef.current.statsByZone = normalized;
    stateRef.current.currentMetric = metric;
    stateRef.current.limits = computeLimits(allValues);

    layer.setStyle(getFeatureStyle);

    layer.eachLayer((lyr: any) => {
      const feature = lyr.feature;
      if (!feature) return;
      const locId = getLocationId(feature);
      const props = feature.properties || {};
      const zoneName = props.Zone || props.zone || `Zone #${locId}`;
      const borough = props.Borough || props.borough || '';
      const zone = stateRef.current.statsByZone[locId];
      const val = getMetricValue(zone, stateRef.current.currentMetric);

      const tooltip = `<strong>${zoneName}</strong> ${borough ? `(${borough})` : ''}<br/><span style="color:#64748b">LocationID: ${locId}</span><br/><strong>${stateRef.current.currentMetric}:</strong> ${val !== null ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'No data'}`;

      if (typeof lyr.setTooltipContent === 'function') {
        lyr.setTooltipContent(tooltip);
      } else if (typeof lyr.bindTooltip === 'function') {
        lyr.bindTooltip(tooltip, { sticky: true });
      }
    });

    const legend = document.getElementById('map-legend');
    if (legend && stateRef.current.limits.length > 0) {
      const lims = stateRef.current.limits;
      legend.innerHTML = COLOUR_RAMP.map((col, idx) => {
        const low = idx === 0 ? 0 : lims[idx - 1];
        const high = lims[idx] ?? 0;
        return `<div style="display:inline-flex;align-items:center;margin-right:12px;font-size:12px;"><span style="width:14px;height:14px;background:${col};display:inline-block;margin-right:5px;border:1px solid #334155;border-radius:2px;"></span><span>${low.toFixed(1)} – ${high.toFixed(1)}</span></div>`;
      }).join('');
    }

    console.log('Zones rendered:', layer.getLayers().length, '| Metrics:', Object.keys(stateRef.current.statsByZone).length, '| Limits:', stateRef.current.limits);
  };

  useEffect(() => {
    const L = (window as any).L;
    if (!L) {
      console.error('Leaflet not loaded');
      return;
    }

    const container = mapContainerRef.current || document.getElementById('zone-map');
    if (!container) {
      console.error('Map container not found');
      return;
    }

    if ((container as any)._leaflet_id) {
      (container as any)._leaflet_id = null;
    }

    const map = L.map(container).setView([40.7128, -73.95], 11);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      geoJsonLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map || !geojson) return;

    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
    }

    const cleanGeoJson = sanitizeAndRepairGeoJSON(geojson);
    if (!cleanGeoJson || cleanGeoJson.features.length === 0) {
      console.error('❌ 0 valid features after sanitize! Check 🔍 RAW FEATURE[0] log above');
      return;
    }

    const layer = L.geoJSON(cleanGeoJson, {
      style: getFeatureStyle,
      onEachFeature: (feature: any, fLayer: any) => {
        fLayer.bindTooltip('', { sticky: true });

        fLayer.on({
          mouseover: (e: any) => {
            const target = e.target;
            if (typeof target.setStyle === 'function') {
              target.setStyle({ weight: 3, color: '#0f172a', fillOpacity: 0.92 });
              if (typeof target.bringToFront === 'function') {
                target.bringToFront();
              }
            }
            onZoneHover?.(getLocationId(feature), feature.properties);
          },
          mouseout: (e: any) => {
            const target = e.target;
            if (typeof target.setStyle === 'function') {
              target.setStyle(getFeatureStyle(feature));
            }
            onZoneHover?.(null);
          },
        });
      },
    }).addTo(map);

    geoJsonLayerRef.current = layer;

    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }

    updateMap();
  }, [geojson]);

  useEffect(() => {
    updateMap();
  }, [zoneMetrics, metric]);

  if (typeof document !== 'undefined' && document.getElementById('zone-map')) {
    return null;
  }

  return <div ref={mapContainerRef} style={{ height: '600px', width: '100%', borderRadius: '8px' }} />;
};
