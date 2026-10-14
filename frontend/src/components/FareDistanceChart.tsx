'use client';

import React, { useEffect, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface FareDistanceData {
  distance_bin: string;
  trip_count: number;
  avg_fare_per_mile: number;
  avg_distance: number;
  avg_fare: number;
}

export const FareDistanceChart: React.FC = () => {
  const [data, setData] = useState<FareDistanceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('http://localhost:5001/api/insights/fare-by-distance?start_date=2019-01-01&end_date=2019-01-31');
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error('Failed to load fare by distance data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="font-display font-semibold text-foreground mb-4">Fare by Distance</h3>
        <div className="h-80 flex items-center justify-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="mb-4">
        <h3 className="font-display font-semibold text-foreground mb-1">Fare by Distance</h3>
        <p className="text-sm text-muted-foreground">Trip volume and pricing across distance bands</p>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 80, bottom: 20, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="distance_bin"
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: '12px' }}
            label={{ value: 'Distance (miles)', position: 'insideBottomRight', offset: -10 }}
          />
          <YAxis
            yAxisId="left"
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: '12px' }}
            label={{ value: 'Trip Count', angle: -90, position: 'insideLeft' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: '12px' }}
            label={{ value: 'Avg $/Mile', angle: 90, position: 'insideRight' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(20, 27, 43, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
            }}
            formatter={(value: any, name: string) => {
              if (name === 'trip_count') return [value.toLocaleString(), 'Trips'];
              if (name === 'avg_fare_per_mile') return [`$${value.toFixed(2)}`, 'Avg $/Mile'];
              return [value, name];
            }}
            labelStyle={{ color: 'rgba(255,255,255,0.8)' }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}
            iconType="line"
          />
          <Bar yAxisId="left" dataKey="trip_count" fill="#2f4b7c" name="Trips" radius={4} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avg_fare_per_mile"
            stroke="#ffa600"
            strokeWidth={2}
            name="Avg $/Mile"
            dot={{ fill: '#ffa600', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {data.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            <p>
              Short-haul trips (0-1 mi) cost <span className="text-amber-400 font-semibold">${data[0]?.avg_fare_per_mile.toFixed(2)}/mi</span> vs long-haul (20+ mi) at{' '}
              <span className="text-green-400 font-semibold">${data[data.length - 1]?.avg_fare_per_mile.toFixed(2)}/mi</span>
              {data[0] && data[data.length - 1] && (
                <span className="text-gray-300">
                  {' '}({((data[0].avg_fare_per_mile / data[data.length - 1].avg_fare_per_mile).toFixed(1))}× premium)
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
