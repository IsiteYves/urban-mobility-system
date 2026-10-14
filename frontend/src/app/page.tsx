'use client';

import React, { useState, useEffect } from 'react';
import { FilterState, SummaryStats, HourlyInsight, ZoneProfitability, PaymentBehavior } from '@/types';
import { apiClient } from '@/api/client';
import { FilterPanel } from '@/components/FilterPanel';
import { StatCards } from '@/components/StatCards';
import { HourlyChart } from '@/components/HourlyChart';
import { InsightsPanel } from '@/components/InsightsPanel';
import { DemandHeatmap } from '@/components/DemandHeatmap';
import { TopRoutes } from '@/components/TopRoutes';
import { ZoneMetricsChart } from '@/components/ZoneMetricsChart';
import { DataInsights } from '@/components/DataInsights';
import { MapSection } from '@/components/MapSection';
import { FareDistanceChart } from '@/components/FareDistanceChart';

export default function Dashboard() {
  const [filters, setFilters] = useState<FilterState>({
    startDate: '2019-01-01',
    endDate: '2019-01-31',
  });
  const [stats, setStats] = useState<SummaryStats>();
  const [hourlyData, setHourlyData] = useState<HourlyInsight[]>();
  const [profitability, setProfitability] = useState<ZoneProfitability[]>();
  const [payment, setPayment] = useState<PaymentBehavior[]>();
  const [geojson, setGeojson] = useState<any>();
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [statsData, hourlyData, profitabilityData, paymentData, geojsonData] = await Promise.all([
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
          apiClient.getZoneProfitability({
            start_date: filters.startDate,
            end_date: filters.endDate,
          }),
          apiClient.getPaymentBehavior({
            start_date: filters.startDate,
            end_date: filters.endDate,
          }),
          apiClient.getZonesGeoJSON().catch(() => null),
        ]);

        setStats(statsData);
        setHourlyData(hourlyData);
        setProfitability(profitabilityData);
        setPayment(paymentData);
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
    <div className="min-h-screen bg-background dark">
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 sticky top-0 z-50">
        <div className="px-6 py-4">
          <h1 className="text-4xl font-bold text-white" style={{fontFamily: 'Courier New, monospace', letterSpacing: '0.02em', fontWeight: 700}}>Team 1 | NYC Taxi Mobility</h1>
          <p className="text-white text-sm mt-1" style={{fontFamily: 'Courier New, monospace', letterSpacing: '0.01em', fontWeight: 500}}>Urban Movement Analytics</p>
        </div>
      </header>

      <main className="flex h-[calc(100vh-6rem)] bg-slate-950 relative">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden absolute top-4 left-4 z-50 p-2 bg-slate-800 text-slate-200 rounded hover:bg-slate-700">
          ☰
        </button>

        <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block fixed md:relative w-72 md:w-72 h-full md:h-auto border-r border-slate-700/30 overflow-y-auto bg-slate-900 z-40 md:z-0 flex-shrink-0`}>
          <div className="p-6">
            <FilterPanel onFilterChange={setFilters} loading={loading} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 w-full">
          <StatCards stats={stats} loading={loading} />

          <MapSection filters={filters} geojson={geojson} />

          <DataInsights />

          <HourlyChart data={hourlyData} loading={loading} />

          <FareDistanceChart />

          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="font-display font-semibold text-foreground mb-4">Data Quality</h3>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Average Quality Score for data in the database</div>
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

          <div className="grid grid-cols-1 gap-6">
            <DemandHeatmap loading={loading} />
            <ZoneMetricsChart loading={loading} />
            <TopRoutes loading={loading} />
          </div>
        </div>
      </main>
    </div>
  );
}
