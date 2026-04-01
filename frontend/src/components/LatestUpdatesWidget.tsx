import React, { useEffect, useState } from 'react';
import { VersionLog } from '../types';
import { GitCommit, ArrowRight, Sparkles } from 'lucide-react';

interface LatestUpdatesWidgetProps {
  onNavigate: () => void;
}

const LatestUpdatesWidget: React.FC<LatestUpdatesWidgetProps> = ({ onNavigate }) => {
  const [latestLog, setLatestLog] = useState<VersionLog | null>(null);

  useEffect(() => {
    fetch('/api/versions')
      .then(res => res.json())
      .then(res => {
        if (res.code === 200 && res.data.length > 0) {
          setLatestLog(res.data[0]);
        }
      })
      .catch(() => {});
  }, []);

  if (!latestLog) return null;

  return (
    <div className="bg-anime-card backdrop-blur-sm rounded-2xl p-6 border border-anime-accent/20 mb-8 animate-fade-in hover:shadow-lg transition-shadow">
      <h3 className="font-bold text-anime-text flex items-center gap-2 mb-4 border-b border-anime-text/10 pb-2">
        <Sparkles className="text-anime-accent" size={18} />
        Latest Update
      </h3>
      
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
                <GitCommit className="text-anime-secondary" size={16} />
                <span className="font-bold text-anime-secondary">{latestLog.version}</span>
            </div>
            <span className="text-xs text-anime-text/60 bg-anime-bg/50 px-2 py-0.5 rounded-full">{latestLog.releaseDate}</span>
        </div>
        <p className="text-sm text-anime-text/80 line-clamp-3 whitespace-pre-wrap bg-anime-bg/40 p-3 rounded-xl border border-anime-text/5 italic">
            "{latestLog.content}"
        </p>
      </div>

      <button 
        onClick={onNavigate}
        className="w-full py-2 flex items-center justify-center gap-2 text-sm font-bold text-white bg-anime-accent/90 hover:bg-anime-accent rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
      >
        View Full Timeline <ArrowRight size={14} />
      </button>
    </div>
  );
};

export default LatestUpdatesWidget;