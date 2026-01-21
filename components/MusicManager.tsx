import React, { useState, useEffect } from 'react';
import { MusicTrack } from '../types';
import { Plus, Trash2, Music, Disc, ArrowLeft, PlayCircle, UploadCloud, Loader2 } from 'lucide-react';

interface MusicManagerProps {
  onBack: () => void;
}

const MusicManager: React.FC<MusicManagerProps> = ({ onBack }) => {
  const [playlist, setPlaylist] = useState<MusicTrack[]>([]);
  
  // State for form fields
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const fetchMusic = async () => {
    try {
      const response = await fetch('/api/music');
      if (response.ok) {
        const res = await response.json();
        if (res.code === 200) {
          setPlaylist(res.data);
        }
      }
    } catch (e) {
      console.log("Error fetching music", e);
    }
  };

  useEffect(() => {
    fetchMusic();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (!file.type.startsWith('audio/')) {
              alert('Please select an audio file (MP3, WAV, etc.)');
              return;
          }
          setSelectedFile(file);
          // Auto-fill title from filename if empty
          if (!title) {
              setTitle(file.name.replace(/\.[^/.]+$/, ""));
          }
      }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
        alert("Please select a music file to upload.");
        return;
    }

    setIsLoading(true);
    const token = localStorage.getItem('token');

    if (!token) {
        alert("You must be logged in to add music!");
        setIsLoading(false);
        return;
    }

    // Build FormData for single-step upload + metadata save
    const formData = new FormData();
    formData.append('title', title);
    formData.append('artist', artist);
    formData.append('coverUrl', coverUrl);
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/admin/music', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Note: Content-Type is set automatically by browser with boundary for FormData
        },
        body: formData
      });

      if (response.ok) {
        await fetchMusic();
        resetForm();
      } else {
        const res = await response.json();
        alert(res.message || "Failed to add music");
      }
    } catch (e) {
      console.error(e);
      alert("Network error or file too large");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
      setTitle('');
      setArtist('');
      setCoverUrl('');
      setSelectedFile(null);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this track?")) return;
    
    const token = localStorage.getItem('token');
    
    if (!token) {
      alert("You must be logged in to delete music!");
      return;
    }

    try {
      const response = await fetch(`/api/admin/music/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const res = await response.json();
        if (res.code === 200) {
          // 重新获取列表，确保数据一致性
          await fetchMusic();
        } else {
          alert(res.message || "Failed to delete music");
        }
      } else {
        const res = await response.json().catch(() => ({ message: "Unknown error" }));
        alert(res.message || `Failed to delete (Status: ${response.status})`);
      }
    } catch (e) {
      console.error("Delete music error:", e);
      alert("Network error: " + (e instanceof Error ? e.message : "Unknown error"));
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-anime-text hover:text-anime-accent transition-colors"
        >
          <ArrowLeft size={20} /> Back to Dashboard
        </button>
        <h2 className="text-2xl font-bold text-anime-text flex items-center gap-2">
            <Music size={24} className="text-anime-secondary" /> Music Manager (DB Storage)
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form */}
        <div className="bg-anime-card backdrop-blur-md rounded-3xl p-6 border border-anime-accent/20 shadow-xl h-fit">
           <h3 className="text-lg font-bold text-anime-text mb-4">Upload New Track to DB</h3>
           <form onSubmit={handleAdd} className="space-y-4">
              
              {/* File Upload Area */}
              <div className="space-y-2">
                  <label className="text-sm font-bold text-anime-text/80 block">Music File (MP3)</label>
                  <div className={`relative border-2 border-dashed rounded-xl p-4 transition-colors ${selectedFile ? 'border-anime-accent bg-anime-accent/10' : 'border-anime-text/20 hover:border-anime-accent hover:bg-anime-card/50'}`}>
                      <input 
                          type="file" 
                          accept="audio/*"
                          onChange={handleFileSelect}
                          disabled={isLoading}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="flex flex-col items-center justify-center text-center">
                          {selectedFile ? (
                              <Music className="text-anime-accent mb-2" size={24} />
                          ) : (
                              <UploadCloud className="text-anime-text/40 mb-2" size={24} />
                          )}
                          
                          <p className="text-sm text-anime-text/70 font-medium">
                              {selectedFile ? "File Selected" : "Click to Upload MP3"}
                          </p>
                          {selectedFile && <p className="text-xs text-anime-accent mt-1 truncate max-w-full px-2">{selectedFile.name}</p>}
                      </div>
                  </div>
              </div>

              <div>
                  <input 
                    type="text" 
                    placeholder="Song Title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-anime-card/60 border border-anime-text/10 rounded-xl py-2 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50 text-anime-text"
                    required
                  />
              </div>
              <div>
                  <input 
                    type="text" 
                    placeholder="Artist"
                    value={artist}
                    onChange={e => setArtist(e.target.value)}
                    className="w-full bg-anime-card/60 border border-anime-text/10 rounded-xl py-2 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50 text-anime-text"
                    required
                  />
              </div>
              <div>
                  <input 
                    type="text" 
                    placeholder="Cover Image URL"
                    value={coverUrl}
                    onChange={e => setCoverUrl(e.target.value)}
                    className="w-full bg-white/60 border border-anime-text/10 rounded-xl py-2 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50 text-sm font-mono"
                  />
              </div>
              
              <div className="text-xs text-anime-text/70 bg-anime-card/50 p-2 rounded-lg border border-anime-accent/20">
                  <span className="font-bold">Note:</span> Files are stored directly in the database. Large files may take longer to process.
              </div>

              <button 
                type="submit"
                disabled={isLoading || !selectedFile}
                className="w-full bg-anime-accent text-white py-3 rounded-xl font-bold shadow-md hover:bg-anime-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? <><Loader2 className="animate-spin" size={18} /> Uploading to DB...</> : 'Save to Playlist'}
              </button>
           </form>
        </div>

        {/* List */}
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {playlist.length === 0 && (
                <div className="text-center py-10 bg-anime-card rounded-3xl border border-dashed border-anime-text/20">
                    <p className="text-anime-text/50">No music tracks yet.</p>
                </div>
            )}
            {playlist.map(track => (
                <div key={track.id} className="bg-anime-card/70 backdrop-blur-sm p-4 rounded-2xl flex items-center gap-4 border border-anime-text/5 shadow-sm hover:shadow-md transition-all group">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-anime-card shadow-sm shrink-0">
                        <img src={track.coverUrl || 'https://via.placeholder.com/50'} alt="cover" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow min-w-0">
                        <h4 className="font-bold text-anime-text truncate">{track.title}</h4>
                        <p className="text-xs text-anime-text/60 truncate">{track.artist}</p>
                    </div>
                    <a href={track.url} target="_blank" rel="noreferrer" className="text-anime-secondary hover:text-anime-accent" title="Preview Stream">
                        <PlayCircle size={20} />
                    </a>
                    <button 
                        onClick={() => handleDelete(track.id!)}
                        className="text-red-400 hover:text-red-500 p-2 hover:bg-red-500/20 rounded-full transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default MusicManager;