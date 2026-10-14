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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`stat-card ${loading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <div className={`stat-label text-${card.color}`}>{card.label}</div>
          <div className="stat-value mt-2">{card.value}</div>
        </div>
      ))}
    </div>
  );
};
