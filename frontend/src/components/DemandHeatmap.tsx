'use client';

import React, { useState, useEffect } from 'react';

export const DemandHeatmap: React.FC<{ loading?: boolean }> = ({ loading }) => {
  const [data, setData] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadHeatmap = async () => {
      try {
        const res = await fetch('http://localhost:5001/api/insights/heatmap-data?start_date=2019-01-01&end_date=2019-01-31');
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const rows = await res.json();
        const map: Record<string, number> = {};
        rows.forEach((r: any) => {
          map[`${r.day}-${r.hour}`] = r.trip_count;
        });
        setData(map);
      } catch (err) {
        console.error('Heatmap load failed:', err);
      }
    };
    loadHeatmap();
  }, []);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxVal = Math.max(...Object.values(data), 1);

  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/40 rounded-3xl p-6">
      <h3 className="font-display font-bold text-lg text-slate-100 mb-4">Demand Patterns (Hour × Day)</h3>
      <div className="overflow-x-auto">
        <div className="inline-block">
          <div className="flex gap-2 mb-2">
            <div className="w-12"></div>
            {Array.from({ length: 24 }).map((_, h) => (
              <div key={h} className="w-8 text-center text-xs text-slate-500">{h}</div>
            ))}
          </div>
          {days.map((day, d) => (
            <div key={day} className="flex gap-2 mb-1">
              <div className="w-12 text-xs text-slate-400 text-right pt-1">{day}</div>
              {Array.from({ length: 24 }).map((_, h) => {
                const val = data[`${d}-${h}`] || 0;
                const intensity = val / maxVal;
                const hue = 200 + intensity * 60;
                const lum = 50 - intensity * 25;
                return <div key={h} className="w-8 h-8 rounded" style={{backgroundColor: `hsl(${hue}, 70%, ${lum}%)`}} title={`${val.toLocaleString()} trips`} />;
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
