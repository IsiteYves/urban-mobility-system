'use client';

import React, { useState, useEffect } from 'react';
import { FilterState, SummaryStats, HourlyInsight } from '@/types';
import { apiClient } from '@/api/client';
import { FilterPanel } from '@/components/FilterPanel';
import { StatCards } from '@/components/StatCards';
import { HourlyChart } from '@/components/HourlyChart';

export default function Dashboard() {
  const [filters, setFilters] = useState<FilterState>({
    startDate: '2019-01-01',
    endDate: '2019-01-31',
  });
  const [stats, setStats] = useState<SummaryStats>();
  const [hourlyData, setHourlyData] = useState<HourlyInsight[]>();
  const [geojson, setGeojson] = useState<any>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [statsData, hourlyData, geojsonData] = await Promise.all([
          apiClient.getSummary({
            start_date: filters.startDate,
            end_date: filters.endDate,
          }),
          apiClient.getHourlyInsights({
            start_date: filters.startDate,
            end_date: filters.endDate,
            pu_zone: filters.puZone,
            min_fare: filters.minFare,
            max_fare: filters.maxFare,
            payment_type: filters.paymentType,
          }),
          apiClient.getZonesGeoJSON().catch(() => null),
        ]);

        setStats(statsData);
        setHourlyData(hourlyData);
        setGeojson(geojsonData);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(() => loadData(), 500);
    return () => clearTimeout(debounce);
  }, [filters]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-display font-bold tracking-tight">Team 1 | New York City Taxi Mobility</h1>
          <p className="text-muted-foreground mt-2">Explore urban mobility patterns through taxi trip data</p>
        </div>
      </header>

      <main className="flex gap-6 px-6 py-8">
        <div className="w-64 flex-shrink-0">
          <FilterPanel onFilterChange={setFilters} loading={loading} />
        </div>

        <div className="flex-1 space-y-6">
          <StatCards stats={stats} loading={loading} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HourlyChart data={hourlyData} loading={loading} />

            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-display font-semibold text-foreground mb-4">Data Quality</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Average Quality Score</div>
                  <div className="text-2xl font-semibold text-primary">
                    {stats?.avg_stats?.avg_quality ? (stats.avg_stats.avg_quality * 10).toFixed(1) : '—'} / 100
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-500"
                    style={{
                      width: `${((stats?.avg_stats?.avg_quality || 0) * 10) * 1}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
