'use client';

import React, { useState, useEffect } from 'react';
import { FilterState, Zone } from '@/types';
import { apiClient } from '@/api/client';

interface FilterPanelProps {
  onFilterChange: (filters: FilterState) => void;
  loading?: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ onFilterChange, loading }) => {
  const [filters, setFilters] = useState<FilterState>({
    startDate: '2019-01-01',
    endDate: '2019-01-31',
  });
  const [zones, setZones] = useState<Zone[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadZones = async () => {
      try {
        const data = await apiClient.getZones();
        setZones(data);
      } catch (error) {
        console.error('Failed to load zones:', error);
      }
    };
    loadZones();
  }, []);

  const handleChange = (key: keyof FilterState, value: any) => {
    const updated = { ...filters, [key]: value || undefined };

    if (key === 'startDate' || key === 'endDate') {
      const start = key === 'startDate' ? value : updated.startDate;
      const end = key === 'endDate' ? value : updated.endDate;

      if (start && end && start > end) {
        setError('Start date must be before end date');
        setTimeout(() => setError(''), 3000);
        return;
      }
      setError('');
    }

    setFilters(updated);
    onFilterChange(updated);
  };

  const boroughs = Array.from(new Set(zones.map((z) => z.borough))).sort();

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border border-border">
      <h3 className="font-display font-semibold text-foreground">Filters</h3>
      {error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-md text-red-600 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Start Date</label>
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => handleChange('startDate', e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground text-sm"
          disabled={loading}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">End Date</label>
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => handleChange('endDate', e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground text-sm"
          disabled={loading}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Pickup Zone</label>
        <select
          value={filters.puZone || ''}
          onChange={(e) => handleChange('puZone', e.target.value ? parseInt(e.target.value) : undefined)}
          className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground text-sm"
          disabled={loading}
        >
          <option value="">All zones</option>
          {zones.map((z) => (
            <option key={z.location_id} value={z.location_id}>
              {z.zone} ({z.borough})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Min Fare</label>
        <input
          type="number"
          min="0"
          placeholder="$0"
          value={filters.minFare || ''}
          onChange={(e) => handleChange('minFare', e.target.value ? parseFloat(e.target.value) : undefined)}
          className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground text-sm"
          disabled={loading}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Max Fare</label>
        <input
          type="number"
          min="0"
          placeholder="$100"
          value={filters.maxFare || ''}
          onChange={(e) => handleChange('maxFare', e.target.value ? parseFloat(e.target.value) : undefined)}
          className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground text-sm"
          disabled={loading}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Payment Type</label>
        <select
          value={filters.paymentType || ''}
          onChange={(e) => handleChange('paymentType', e.target.value ? parseInt(e.target.value) : undefined)}
          className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground text-sm"
          disabled={loading}
        >
          <option value="">All types</option>
          <option value="1">Credit Card</option>
          <option value="2">Cash</option>
          <option value="3">No Charge</option>
          <option value="4">Dispute</option>
        </select>
      </div>

      {Object.values(filters).some((v) => v !== undefined && v !== '2019-01-01' && v !== '2019-01-31') && (
        <button
          onClick={() => {
            setFilters({ startDate: '2019-01-01', endDate: '2019-01-31' });
            onFilterChange({ startDate: '2019-01-01', endDate: '2019-01-31' });
          }}
          className="w-full px-3 py-2 text-sm bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
          disabled={loading}
        >
          Clear Filters
        </button>
      )}
    </div>
  );
};
