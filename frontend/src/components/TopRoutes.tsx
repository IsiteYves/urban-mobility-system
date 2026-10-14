'use client';

import React, { useState, useEffect } from 'react';

interface Route {
  from_zone: string;
  to_zone: string;
  trips: number;
  avg_speed: number;
  avg_fare: number;
}

type SortKey = 'route' | 'trips' | 'speed' | 'fare';

export const TopRoutes: React.FC<{ loading?: boolean }> = ({ loading }) => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [limitOption, setLimitOption] = useState('top-15');
  const [sortKey, setSortKey] = useState<SortKey>('trips');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    const loadRoutes = async () => {
      try {
        const isBottom = limitOption.startsWith('bottom-');
        const num = parseInt(limitOption.split('-')[1]);
        const res = await fetch(`http://localhost:5001/api/insights/top-routes?start_date=2019-01-01&end_date=2019-01-31&limit=${num * 3}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        if (isBottom) {
          data.reverse();
        }
        setRoutes(data);
      } catch (err) {
        console.error('Routes load failed:', err);
      }
    };
    loadRoutes();
  }, [limitOption]);

  const num = parseInt(limitOption.split('-')[1]);
  const filteredRoutes = routes.filter((r: any) => r.from_zone !== 'N/A' && r.to_zone !== 'N/A').slice(0, num);

  const sortedRoutes = [...filteredRoutes].sort((a, b) => {
    let aVal: any, bVal: any;
    if (sortKey === 'route') {
      aVal = `${a.from_zone}${a.to_zone}`;
      bVal = `${b.from_zone}${b.to_zone}`;
    } else if (sortKey === 'trips') {
      aVal = a.trips;
      bVal = b.trips;
    } else if (sortKey === 'speed') {
      aVal = a.avg_speed;
      bVal = b.avg_speed;
    } else if (sortKey === 'fare') {
      aVal = a.avg_fare;
      bVal = b.avg_fare;
    }
    return sortAsc ? (aVal > bVal ? 1 : -1) : (aVal > bVal ? -1 : 1);
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/40 rounded-3xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display font-bold text-lg text-slate-100">Routes</h3>
        <select
          value={limitOption}
          onChange={(e) => setLimitOption(e.target.value)}
          className="px-2 py-1 rounded text-sm bg-slate-700/60 text-slate-200 border border-slate-600/40"
        >
          <option value="top-10">Top 10</option>
          <option value="top-14">Top 14</option>
          <option value="top-15">Top 15</option>
          <option value="top-20">Top 20</option>
          <option value="top-25">Top 25</option>
          <option value="top-30">Top 30</option>
          <option value="bottom-10">Bottom 10</option>
          <option value="bottom-14">Bottom 14</option>
          <option value="bottom-15">Bottom 15</option>
          <option value="bottom-20">Bottom 20</option>
          <option value="bottom-25">Bottom 25</option>
          <option value="bottom-30">Bottom 30</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/30">
              <th className="text-left px-3 py-2 text-xs uppercase font-semibold text-slate-400 cursor-pointer hover:text-slate-300" onClick={() => handleSort('route')}>
                Route {sortKey === 'route' && (sortAsc ? '↑' : '↓')}
              </th>
              <th className="text-right px-3 py-2 text-xs uppercase font-semibold text-slate-400 cursor-pointer hover:text-slate-300" onClick={() => handleSort('trips')}>
                Trips {sortKey === 'trips' && (sortAsc ? '↑' : '↓')}
              </th>
              <th className="text-right px-3 py-2 text-xs uppercase font-semibold text-slate-400 cursor-pointer hover:text-slate-300" onClick={() => handleSort('speed')}>
                Speed {sortKey === 'speed' && (sortAsc ? '↑' : '↓')}
              </th>
              <th className="text-right px-3 py-2 text-xs uppercase font-semibold text-slate-400 cursor-pointer hover:text-slate-300" onClick={() => handleSort('fare')}>
                Fare {sortKey === 'fare' && (sortAsc ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRoutes.map((r, i) => (
              <tr key={i} className="border-b border-slate-700/20 hover:bg-slate-700/20">
                <td className="px-3 py-2 text-slate-300">{r.from_zone?.split(/\(|\)/)[0].trim() || '—'} → {r.to_zone?.split(/\(|\)/)[0].trim() || '—'}</td>
                <td className="text-right px-3 py-2 text-slate-200 font-medium">{(r.trips / 1000).toFixed(1)}k</td>
                <td className="text-right px-3 py-2 text-slate-300">{r.avg_speed} mph</td>
                <td className="text-right px-3 py-2 text-slate-200 font-medium">${r.avg_fare}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
