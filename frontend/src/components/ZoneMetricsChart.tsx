'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const ZoneMetricsChart: React.FC<{ loading?: boolean }> = ({ loading }) => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const loadZoneData = async () => {
      try {
        const res = await fetch('http://localhost:5001/api/insights/zone-metrics?start_date=2019-01-01&end_date=2019-01-31');
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();

        const zones = Array.isArray(data) ? data : Object.values(data);
        const formatted = zones
          .filter((z: any) => z.zone && z.zone !== 'N/A' && z.trip_count > 0)
          .sort((a: any, b: any) => (b.trip_count || 0) - (a.trip_count || 0))
          .slice(0, 15)
          .map((z: any) => ({
            zone: z.zone?.substring(0, 18) || 'Unknown',
            trips: parseFloat(z.trip_count) || 0,
            speed: parseFloat(z.avg_speed) || 0,
            fare: parseFloat(z.avg_fare_per_mile) || 0,
          }));

        setData(formatted);
      } catch (err) {
        console.error('Zone metrics load failed:', err);
      }
    };
    loadZoneData();
  }, []);

  if (data.length === 0) return null;

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="font-display font-semibold text-foreground mb-4">Top 15 Zones: Trips, Speed & Fare/Mile</h3>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="zone"
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            label={{ value: 'Trips', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            label={{ value: 'Speed (mph) / Fare ($/mi)', angle: 90, position: 'insideRight', style: { fill: '#94a3b8' } }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
            labelStyle={{ color: '#e2e8f0' }}
            formatter={(value: any) => {
              if (typeof value === 'number') {
                if (value > 100) return value.toLocaleString();
                return value.toFixed(1);
              }
              return value;
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px', color: '#94a3b8' }} />
          <Bar yAxisId="left" dataKey="trips" fill="#3b82f6" name="Trip Count" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="speed" stroke="#f59e0b" name="Avg Speed (mph)" strokeWidth={2} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="fare" stroke="#10b981" name="Fare/Mile ($)" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
