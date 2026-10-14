'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { HourlyInsight } from '@/types';

interface HourlyChartProps {
  data?: HourlyInsight[];
  loading?: boolean;
}

export const HourlyChart: React.FC<HourlyChartProps> = ({ data, loading }) => {
  if (loading) {
    return <div className="h-80 flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="h-80 flex items-center justify-center text-muted-foreground">No data available</div>;
  }

  const processedData = data.map((d) => {
    const date = new Date(d.hour);
    return {
      ...d,
      hour: date.getHours(),
      hourLabel: `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:00`,
    };
  });

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="font-display font-semibold text-foreground mb-4">Hourly Trip Pattern</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={processedData}>
          <defs>
            <linearGradient id="tripGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="hourLabel"
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            formatter={(value: any) => typeof value === 'number' ? value.toFixed(2) : value}
          />
          <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
          <Area type="monotone" dataKey="trip_count" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#tripGradient)" name="Trip Count" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
