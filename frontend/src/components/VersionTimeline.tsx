import React, { useEffect, useState } from 'react';
import { VersionLog } from '../types';
import { Calendar, GitCommit, Rocket } from 'lucide-react';

const VersionTimeline: React.FC = () => {
  const [logs, setLogs] = useState<VersionLog[]>([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/versions');
      if (response.ok) {
        const res = await response.json();
        if (res.code === 200) {
          setLogs(res.data);
        }
      }
    } catch (error) {
      console.log("Using static data as fallback");
      setLogs([
        { id: 1, version: 'v1.0.0', content: 'Initial release of SakuraVerse! Added blog posts, anime style UI, and background music.', releaseDate: '2023-10-01' },
      ]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold text-anime-text mb-4 flex justify-center items-center gap-3">
            <Rocket className="text-anime-accent animate-bounce-slow" size={32} />
            World Timeline
        </h2>
        <p className="text-anime-text/60">Tracking the evolution of this digital space.</p>
      </div>

      <div className="relative">
        {/* Center Line */}
        <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-anime-accent to-anime-secondary opacity-50"></div>

        <div className="space-y-12">
          {logs.map((log, index) => {
            const isLeft = index % 2 === 0;
            return (
              <div key={log.id} className={`relative flex items-center md:justify-between ${isLeft ? 'md:flex-row-reverse' : ''}`}>
                
                {/* Empty Half for Desktop Alignment */}
                <div className="hidden md:block w-5/12"></div>

                {/* Dot */}
                <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-anime-accent border-4 border-white shadow-lg z-10"></div>

                {/* Content Card */}
                <div className="ml-12 md:ml-0 w-full md:w-5/12">
                   <div className="bg-anime-card backdrop-blur-md p-6 rounded-2xl border border-anime-accent/20 shadow-lg hover:-translate-y-1 transition-transform duration-300 group">
                      <div className="flex items-center justify-between mb-3 border-b border-anime-text/5 pb-2">
                          <span className="font-bold text-xl text-anime-accent flex items-center gap-2">
                             <GitCommit size={20} /> {log.version}
                          </span>
                          <span className="text-xs text-anime-text/50 flex items-center gap-1">
                             <Calendar size={12} /> {log.releaseDate}
                          </span>
                      </div>
                      <p className="text-anime-text/80 whitespace-pre-wrap leading-relaxed">
                          {log.content}
                      </p>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VersionTimeline;