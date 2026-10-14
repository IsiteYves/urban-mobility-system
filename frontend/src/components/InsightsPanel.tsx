'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { ZoneProfitability, PaymentBehavior } from '@/types';

interface InsightsPanelProps {
  profitability?: ZoneProfitability[];
  payment?: PaymentBehavior[];
  loading?: boolean;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ profitability, payment, loading }) => {
  if (loading) {
    return <div className="text-muted-foreground">Loading insights...</div>;
  }

  // Profitability insight: Top zones by revenue efficiency
  const profitData = profitability?.slice(0, 5).map(z => ({
    zone: z.zone_name,
    profitability: parseFloat(z.avg_profitability as any) || 0,
    trips: z.trip_count,
  })) || [];

  // Payment behavior: Tip ratio by payment type
  const paymentData = payment?.map(p => ({
    type: p.payment_type_name,
    tipRatio: (parseFloat(p.tip_ratio as any) || 0) * 100,
    avgTip: parseFloat(p.avg_tip as any) || 0,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="font-display font-semibold text-foreground mb-4">Zone Profitability Ranking</h3>
        <p className="text-sm text-muted-foreground mb-4">Top 5 zones by revenue efficiency per trip</p>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={profitData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="zone" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
            <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
            <Bar dataKey="profitability" fill="hsl(var(--success))" name="Profitability Ratio" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="font-display font-semibold text-foreground mb-4">Payment Behavior Analysis</h3>
        <p className="text-sm text-muted-foreground mb-4">Tip ratio by payment method</p>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={paymentData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="type" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              formatter={(value: any) => `${(value as number).toFixed(1)}%`}
            />
            <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
            <Bar dataKey="tipRatio" fill="hsl(var(--secondary))" name="Tip Ratio %" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
