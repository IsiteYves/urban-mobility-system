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
  const [toast, setToast] = useState<string>('');
  const [isOpen, setIsOpen] = useState(true);

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

    if (key === 'minFare' || key === 'maxFare') {
      const min = key === 'minFare' ? value : updated.minFare;
      const max = key === 'maxFare' ? value : updated.maxFare;

      if (min !== undefined && max !== undefined && min > max) {
        const swapped = { ...updated, minFare: max, maxFare: min };
        setToast('Min/Max swapped to valid range');
        setTimeout(() => setToast(''), 3000);
        setFilters(swapped);
        onFilterChange(swapped);
        return;
      }
    }

    setFilters(updated);
    onFilterChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-foreground text-sm" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>Filters</h3>
        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-slate-400 hover:text-slate-200">
          {isOpen ? '▼' : '▶'}
        </button>
      </div>

      {isOpen && (
        <>
          {error && <div className="px-3 py-2 bg-red-900/20 rounded text-red-400 text-xs">{error}</div>}
          {toast && <div className="px-3 py-2 bg-blue-900/20 rounded text-blue-400 text-xs">{toast}</div>}

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">From</label>
            <input type="date" value={filters.startDate} onChange={(e) => handleChange('startDate', e.target.value)} className="w-full px-3 py-2 rounded-md bg-slate-800 text-slate-100 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50" disabled={loading} />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">To</label>
            <input type="date" value={filters.endDate} onChange={(e) => handleChange('endDate', e.target.value)} className="w-full px-3 py-2 rounded-md bg-slate-800 text-slate-100 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50" disabled={loading} />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">Pickup Zone</label>
            <select value={filters.puZone || ''} onChange={(e) => handleChange('puZone', e.target.value ? parseInt(e.target.value) : undefined)} className="w-full px-3 py-2 rounded-md bg-slate-800 text-slate-100 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50" disabled={loading}>
              <option value="">All zones</option>
              {zones.map((z) => (<option key={z.location_id} value={z.location_id}>{z.zone}</option>))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">Fare Range</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500">Min</label>
                <input type="number" min="0" placeholder="$0" value={filters.minFare || ''} onChange={(e) => handleChange('minFare', e.target.value ? parseFloat(e.target.value) : undefined)} className="w-full px-3 py-2 rounded-md bg-slate-800 text-slate-100 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50" disabled={loading} />
              </div>
              <div>
                <label className="text-xs text-slate-500">Max</label>
                <input type="number" min="0" placeholder="$999" value={filters.maxFare || ''} onChange={(e) => handleChange('maxFare', e.target.value ? parseFloat(e.target.value) : undefined)} className="w-full px-3 py-2 rounded-md bg-slate-800 text-slate-100 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50" disabled={loading} />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">Payment Type</label>
            <select value={filters.paymentType || ''} onChange={(e) => handleChange('paymentType', e.target.value ? parseInt(e.target.value) : undefined)} className="w-full px-3 py-2 rounded-md bg-slate-800 text-slate-100 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50" disabled={loading}>
              <option value="">All payment</option>
              <option value="1">Card</option>
              <option value="2">Cash</option>
            </select>
          </div>

          {Object.values(filters).some((v) => v !== undefined && v !== '2019-01-01' && v !== '2019-01-31') && (
            <button onClick={() => { setFilters({ startDate: '2019-01-01', endDate: '2019-01-31' }); onFilterChange({ startDate: '2019-01-01', endDate: '2019-01-31' }); }} className="w-full px-3 py-2 text-sm bg-slate-700 text-slate-100 rounded-md hover:bg-slate-600 transition-colors" disabled={loading}>Reset</button>
          )}
        </>
      )}
    </div>
  );
};
