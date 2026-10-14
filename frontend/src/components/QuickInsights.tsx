'use client';

import React from 'react';
import { HourlyInsight } from '@/types';

interface QuickInsightsProps {
  hourlyData?: HourlyInsight[];
  stats?: any;
}

export const QuickInsights: React.FC<QuickInsightsProps> = ({ hourlyData, stats }) => {
  // Find peak hour
  const peakHour = hourlyData?.reduce((max, curr) =>
    (curr.trip_count > max.trip_count) ? curr : max
  );

  const formatHour = (hour: number) => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}:00 ${ampm}`;
  };

  const peakTime = peakHour ? formatHour(peakHour.hour) : '—';
  const peakCount = peakHour?.trip_count.toLocaleString() || '—';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="font-display font-semibold text-foreground mb-3">Peak Hour</h3>
        <div className="text-3xl font-bold text-primary mb-1">{peakTime}</div>
        <div className="text-sm text-muted-foreground">{peakCount} trips</div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="font-display font-semibold text-foreground mb-3">Data Coverage</h3>
        <div className="text-3xl font-bold text-secondary mb-1">{hourlyData?.length || 0}</div>
        <div className="text-sm text-muted-foreground">hourly periods captured</div>
      </div>
    </div>
  );
};
