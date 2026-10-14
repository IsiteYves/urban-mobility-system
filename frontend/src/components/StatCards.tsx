'use client';

import React from 'react';
import { SummaryStats } from '@/types';

interface StatCardsProps {
  stats?: SummaryStats;
  loading?: boolean;
}

export const StatCards: React.FC<StatCardsProps> = ({ stats, loading }) => {
  const formatNumber = (num: number | undefined, decimals = 2) => {
    if (num === undefined || num === null) return '—';
    const rounded = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    return rounded.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
  };

  const cards = [
    {
      label: 'Total Trips',
      value: formatNumber(stats?.total_trips?.count, 0),
      color: 'primary',
    },
    {
      label: 'Avg Fare',
      value: `$${formatNumber(stats?.avg_stats?.avg_fare, 2)}`,
      color: 'secondary',
    },
    {
      label: 'Avg Speed',
      value: `${formatNumber(stats?.avg_stats?.avg_speed, 2)} mph`,
      color: 'success',
    },
    {
      label: 'Anomalies',
      value: formatNumber(stats?.anomalies?.count, 0),
      color: 'warning',
    },
  ];

  const borderRadii = [20, 24, 28, 32];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className={`bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/40 p-6 ${loading ? 'opacity-50' : ''} hover:border-slate-600/60 transition-colors`}
          style={{borderRadius: borderRadii[i % 4] + 'px'}}
        >
          <div className="text-xs uppercase tracking-widest font-semibold text-slate-400 mb-3">{card.label}</div>
          <div className="text-3xl font-bold text-slate-100">{card.value}</div>
        </div>
      ))}
    </div>
  );
};
