import React, { useState, useEffect } from 'react';

interface RegionData {
  region: string;
  views: number;
}

const RegionChart: React.FC = () => {
  const [data, setData] = useState<RegionData[]>([]);

  useEffect(() => {
    fetch('/api/stats/regions')
      .then(res => res.json())
      .then(res => {
        if (res.code === 200) setData(res.data);
      })
      .catch(() => {});
  }, []);

  if (data.length === 0) return null;

  const max = Math.max(...data.map(d => Number(d.views)));

  return (
    <div className="bg-anime-card backdrop-blur-sm rounded-2xl p-4 border border-anime-accent/20 mt-4">
      <h3 className="text-sm font-bold text-anime-text mb-3">访客地区 Top 10</h3>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.region} className="flex items-center gap-2">
            <span className="text-xs text-anime-text/70 w-16 shrink-0 truncate">{item.region}</span>
            <div className="flex-1 bg-anime-text/10 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-anime-accent transition-all duration-500"
                style={{ width: `${(Number(item.views) / max) * 100}%` }}
              />
            </div>
            <span className="text-xs text-anime-text/60 w-8 text-right shrink-0">{item.views}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RegionChart;
