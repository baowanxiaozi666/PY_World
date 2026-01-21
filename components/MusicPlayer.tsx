import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, Disc, Music, GripHorizontal, SkipBack, Volume2, VolumeX, Volume1 } from 'lucide-react';
import { MusicTrack } from '../types';

const MusicPlayer: React.FC = () => {
  const [playlist, setPlaylist] = useState<MusicTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Volume State
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const failedTracksRef = useRef<Set<number>>(new Set());

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Dragging State
  const [position, setPosition] = useState({ x: 24, y: typeof window !== 'undefined' ? window.innerHeight - 120 : 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const playerRef = useRef<HTMLDivElement>(null);

  // Fetch Music
  const fetchMusic = async () => {
      try {
          const response = await fetch('/api/music');
          if (response.ok) {
              const res = await response.json();
              if (res.code === 200) {
                  // 过滤掉无效的音乐（确保只显示数据库中存在的音乐）
                  if (res.data && Array.isArray(res.data)) {
                      // 过滤：只保留有 ID 的音乐
                      const validMusic = res.data.filter((track: MusicTrack) => 
                          track && track.id != null && track.id !== undefined
                      );
                      setPlaylist(validMusic);
                  } else {
                      setPlaylist([]);
                  }
              } else {
                  console.warn("Failed to fetch music:", res.message);
                  setPlaylist([]);
              }
          } else {
              console.warn("Music API returned non-OK status:", response.status);
              setPlaylist([]);
          }
      } catch (e) {
          console.warn("Failed to fetch music from backend:", e);
          // 不再使用默认音乐，直接设置为空列表
          setPlaylist([]);
      }
  };

  useEffect(() => {
    fetchMusic();
    // 每10秒自动刷新一次，确保新添加的音乐能显示
    const interval = setInterval(fetchMusic, 10000);
    // 监听页面可见性变化，当页面重新可见时刷新
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchMusic();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Initialize Audio
  useEffect(() => {
      if (playlist.length === 0) return;

      if (!audioRef.current) {
          audioRef.current = new Audio();
          // Ensure cross-origin is set if needed, though mostly for canvas visualization
          audioRef.current.crossOrigin = "anonymous";
      }

      const audio = audioRef.current;
      const currentTrack = playlist[currentIndex];
      if (!currentTrack) {
          console.warn("No current track available");
          return;
      }

      // 如果当前音乐已经失败，直接跳过（避免无限循环）
      if (failedTracksRef.current.has(currentTrack.id || 0)) {
          console.warn(`Track ${currentTrack.id} is already marked as failed, skipping...`);
          // 延迟执行，避免在 useEffect 中直接更新状态
          const skipTimer = setTimeout(() => {
              let attempts = 0;
              let nextIndex = currentIndex;
              while (attempts < playlist.length) {
                  nextIndex = (nextIndex + 1) % playlist.length;
                  const nextTrack = playlist[nextIndex];
                  if (nextTrack && !failedTracksRef.current.has(nextTrack.id || 0)) {
                      setCurrentIndex(nextIndex);
                      return;
                  }
                  attempts++;
              }
              // 如果所有都失败了，停止播放
              console.warn("No playable tracks available");
              setIsPlaying(false);
          }, 100);
          return () => clearTimeout(skipTimer);
      }

      // 优先使用外部 URL，如果没有则使用流式 URL
      let trackUrl = '';
      if (currentTrack.url && currentTrack.url.trim() !== '') {
          trackUrl = currentTrack.url;
          // 如果是流式 URL，检查是否是相对路径，需要转换为完整 URL
          if (trackUrl.startsWith('/api/music/stream/')) {
              // 保持相对路径，浏览器会自动处理
              trackUrl = trackUrl;
          }
      } else if (currentTrack.id) {
          trackUrl = `/api/music/stream/${currentTrack.id}`;
      }

      if (!trackUrl || trackUrl.trim() === '') {
          console.warn("No valid track URL available for playback, skipping track:", currentTrack);
          const trackId = currentTrack.id || 0;
          // 标记为失败
          failedTracksRef.current.add(trackId);
          
          // 如果当前音乐无法播放，尝试下一首未失败的音乐
          if (playlist.length > 1) {
              setTimeout(() => {
                  let attempts = 0;
                  let nextIndex = currentIndex;
                  while (attempts < playlist.length) {
                      nextIndex = (nextIndex + 1) % playlist.length;
                      const nextTrack = playlist[nextIndex];
                      if (nextTrack && !failedTracksRef.current.has(nextTrack.id || 0)) {
                          console.log(`Trying next track: ${nextTrack.title} (index ${nextIndex})`);
                          setCurrentIndex(nextIndex);
                          setIsPlaying(true);
                          return;
                      }
                      attempts++;
                  }
                  // 如果所有都失败了，停止播放
                  console.warn("No playable tracks available");
                  setIsPlaying(false);
              }, 500);
          } else {
              setIsPlaying(false);
          }
          return;
      }

      const handleTimeUpdate = () => {
          if (audio.duration) {
              setProgress((audio.currentTime / audio.duration) * 100);
          }
      };
      
      const handleEnded = () => {
          handleNext();
      };

      const handleError = (e: Event) => {
          const error = audio.error;
          if (error) {
              console.error("Audio error:", `Error Code: ${error.code}, Message: ${error.message}`);
              // Error Code 4 = MEDIA_ELEMENT_ERROR (usually 404 or format error)
              if (error.code === 4) {
                  const trackId = currentTrack.id || 0;
                  console.warn(`Track ${trackId} (${currentTrack.title}) cannot be loaded`);
                  
                  // 标记为失败
                  failedTracksRef.current.add(trackId);
                  
                  // 检查是否所有音乐都失败了
                  const allFailed = playlist.every(track => failedTracksRef.current.has(track.id || 0));
                  if (allFailed) {
                      console.warn("All tracks failed to load, stopping playback");
                      setIsPlaying(false);
                      return;
                  }
                  
                  // 延迟执行，避免在事件处理中直接更新状态导致循环
                  setTimeout(() => {
                      let attempts = 0;
                      let nextIndex = currentIndex;
                      while (attempts < playlist.length) {
                          nextIndex = (nextIndex + 1) % playlist.length;
                          const nextTrack = playlist[nextIndex];
                          if (nextTrack && !failedTracksRef.current.has(nextTrack.id || 0)) {
                              console.log(`Trying next track: ${nextTrack.title} (index ${nextIndex})`);
                              setCurrentIndex(nextIndex);
                              setIsPlaying(true);
                              return;
                          }
                          attempts++;
                      }
                      // 如果所有都失败了，停止播放
                      console.warn("No playable tracks available");
                      setIsPlaying(false);
                  }, 300);
                  return;
              }
          }
          setIsPlaying(false);
      };

      const handleCanPlay = () => {
          // 当音频可以播放时，如果之前是播放状态，继续播放
          if (isPlaying) {
              const playPromise = audio.play();
              if (playPromise !== undefined) {
                  playPromise.catch(error => {
                      console.log("Audio play error after canplay:", error);
                      setIsPlaying(false);
                  });
              }
          }
      };

      const handleLoadStart = () => {
          console.log("Audio loading started for:", trackUrl);
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('loadstart', handleLoadStart);

      // Only update src if changed to prevent reloading on re-renders
      if (audio.src !== trackUrl) {
          console.log("Loading new track:", trackUrl);
          audio.src = trackUrl;
          audio.load(); // Critical for some browsers after src change
      }

      return () => {
          audio.removeEventListener('timeupdate', handleTimeUpdate);
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('error', handleError);
          audio.removeEventListener('canplay', handleCanPlay);
          audio.removeEventListener('loadstart', handleLoadStart);
      }
  }, [playlist, currentIndex]);

  // Handle Play/Pause Toggle
  useEffect(() => {
      if (!audioRef.current) return;
      
      const audio = audioRef.current;
      
      // 确保音频已加载
      if (!audio.src) {
          console.warn("Cannot play: audio source not set");
          setIsPlaying(false);
          return;
      }

      if (isPlaying) {
          // 检查音频是否已准备好
          if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
              const playPromise = audio.play();
              if (playPromise !== undefined) {
                  playPromise
                      .then(() => {
                          console.log("Audio playing successfully");
                      })
                      .catch(e => {
                          console.error("Play interrupted:", e);
                          setIsPlaying(false);
                      });
              }
          } else {
              // 如果还没准备好，等待 canplay 事件
              const handleCanPlay = () => {
                  const playPromise = audio.play();
                  if (playPromise !== undefined) {
                      playPromise.catch(e => {
                          console.error("Play error after canplay:", e);
                          setIsPlaying(false);
                      });
                  }
                  audio.removeEventListener('canplay', handleCanPlay);
              };
              audio.addEventListener('canplay', handleCanPlay);
          }
      } else {
          audio.pause();
      }
  }, [isPlaying]);

  // Handle Volume
  useEffect(() => {
      if (audioRef.current) {
          audioRef.current.volume = isMuted ? 0 : volume;
      }
  }, [volume, isMuted]);

  const handleNext = () => {
      if (playlist.length <= 1) {
          // If only one track, replay it
          if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play();
          }
          return;
      }
      const nextIndex = (currentIndex + 1) % playlist.length;
      setCurrentIndex(nextIndex);
      setIsPlaying(true);
  };
  
  const handlePrev = () => {
      if (playlist.length <= 1) {
           if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play();
          }
          return;
      }
      setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
      setIsPlaying(true);
  };

  const toggleMute = () => {
      setIsMuted(!isMuted);
  };

  // --- Drag Logic ---
  useEffect(() => {
    setPosition({ x: 24, y: window.innerHeight - 140 });
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      const maxX = window.innerWidth - 50;
      const maxY = window.innerHeight - 50;
      setPosition({ x: Math.min(Math.max(0, newX), maxX), y: Math.min(Math.max(0, newY), maxY) });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  // 如果列表为空，不显示播放器（而不是显示占位符）
  if (playlist.length === 0) return null;

  const currentTrack = playlist[currentIndex];

  return (
    <div 
      ref={playerRef}
      onMouseDown={handleMouseDown}
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        position: 'fixed',
        zIndex: 50,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
      className={`flex items-center gap-3 bg-anime-card backdrop-blur-md p-3 pr-5 rounded-full border border-anime-accent/20 shadow-xl animate-fade-in group hover:bg-white/80 transition-all duration-300 ${isDragging ? 'scale-105 shadow-2xl' : ''}`}
      onMouseEnter={() => setShowVolume(true)}
      onMouseLeave={() => setShowVolume(false)}
    >
      
      <div className={`relative w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-tr from-anime-accent to-anime-secondary shadow-inner border-2 border-white/50 overflow-hidden ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
        {currentTrack.coverUrl ? (
            <img src={currentTrack.coverUrl} className="w-full h-full object-cover opacity-90" alt="art" />
        ) : (
            <Disc size={24} className="text-white opacity-80" />
        )}
        <div className="absolute w-3 h-3 bg-white/30 rounded-full blur-[1px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between w-32 md:w-40">
           <div className="flex flex-col overflow-hidden">
             <span className="text-xs font-bold text-anime-text drop-shadow-sm flex items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-[90px]">
               <Music size={10} /> {currentTrack.title}
             </span>
             <span className="text-[10px] text-anime-text/70 truncate max-w-[90px]">{currentTrack.artist}</span>
           </div>
           
           <div className="flex items-center gap-1">
             <button onClick={handlePrev} className="text-anime-text/80 hover:text-anime-accent hover:scale-110 transition-transform cursor-pointer" title="Previous">
                 <SkipBack size={12} />
             </button>
             <button 
               onClick={() => setIsPlaying(!isPlaying)}
               className="p-1.5 rounded-full bg-anime-text text-anime-bg hover:scale-110 transition-transform shadow-sm cursor-pointer"
               title={isPlaying ? "Pause" : "Play"}
             >
               {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
             </button>
             <button onClick={handleNext} className="text-anime-text/80 hover:text-anime-accent hover:scale-110 transition-transform cursor-pointer" title="Next">
               <SkipForward size={12} />
             </button>
           </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-anime-text/10 rounded-full overflow-hidden cursor-pointer relative group/bar" 
             onClick={(e) => {
                if (audioRef.current && audioRef.current.duration) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const pct = x / rect.width;
                    audioRef.current.currentTime = pct * audioRef.current.duration;
                }
             }}>
          <div 
            className="h-full bg-gradient-to-r from-anime-accent to-anime-secondary rounded-full transition-all duration-100 relative"
            style={{ width: `${progress}%` }}
          >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-sm opacity-0 group-hover/bar:opacity-100 transition-opacity"></div>
          </div>
        </div>
      </div>

      {/* Volume Control */}
      <div className={`flex items-center gap-1 transition-all duration-300 overflow-hidden ${showVolume ? 'w-20 opacity-100' : 'w-0 opacity-0'}`}>
         <button onClick={toggleMute} className="text-anime-text/60 hover:text-anime-accent">
            {isMuted ? <VolumeX size={14} /> : (volume < 0.5 ? <Volume1 size={14} /> : <Volume2 size={14} />)}
         </button>
         <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.05" 
            value={isMuted ? 0 : volume}
            onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (parseFloat(e.target.value) > 0) setIsMuted(false);
            }}
            className="w-12 h-1 accent-anime-accent bg-gray-200 rounded-lg appearance-none cursor-pointer" 
         />
      </div>
      
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-anime-text/40 bg-white/80 px-2 py-0.5 rounded-full text-[10px] pointer-events-none">
          <GripHorizontal size={12} />
      </div>
    </div>
  );
};

export default MusicPlayer;