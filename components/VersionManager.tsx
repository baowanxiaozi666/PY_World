import React, { useState, useEffect } from 'react';
import { VersionLog } from '../types';
import { ArrowLeft, Edit, Trash2, Plus, History, Check } from 'lucide-react';

interface VersionManagerProps {
  onBack: () => void;
}

const VersionManager: React.FC<VersionManagerProps> = ({ onBack }) => {
  const [logs, setLogs] = useState<VersionLog[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  
  // Form State
  const [version, setVersion] = useState('');
  const [content, setContent] = useState('');
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/versions');
      if (response.ok) {
        const res = await response.json();
        setLogs(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch logs");
    }
  };

  const showMessage = (msg: string) => {
      setMessage(msg);
      setTimeout(() => setMessage(''), 3000);
  };

  const resetForm = () => {
      setVersion('');
      setContent('');
      setReleaseDate(new Date().toISOString().split('T')[0]);
      setCurrentId(null);
      setIsEditing(false);
  };

  const handleEdit = (log: VersionLog) => {
      setVersion(log.version);
      setContent(log.content);
      setReleaseDate(log.releaseDate);
      setCurrentId(log.id!);
      setIsEditing(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const token = localStorage.getItem('token');
      
      const payload = { version, content, releaseDate };
      const method = currentId ? 'PUT' : 'POST';
      const url = currentId 
        ? `/api/admin/versions/${currentId}`
        : `/api/admin/versions`;

      try {
          const response = await fetch(url, {
              method,
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(payload)
          });
          
          if (response.ok) {
              await fetchLogs();
              resetForm();
              showMessage(currentId ? "Version Updated!" : "Version Added!");
          } else {
              alert("Failed to save version log");
          }
      } catch (e) {
          alert("Network error");
      }
  };

  const handleDelete = async (id: number) => {
      if (!confirm("Delete this log?")) return;
      const token = localStorage.getItem('token');
      try {
          await fetch(`/api/admin/versions/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          setLogs(logs.filter(l => l.id !== id));
          showMessage("Version Deleted!");
      } catch (e) {
          alert("Network error");
      }
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-anime-text hover:text-anime-accent transition-colors"
        >
          <ArrowLeft size={20} /> Back to Dashboard
        </button>
        <h2 className="text-2xl font-bold text-anime-text flex items-center gap-2">
            <History size={24} className="text-anime-secondary" /> Version Timeline Manager
        </h2>
      </div>
      
      {message && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-xl flex items-center gap-2 border border-green-200">
              <Check size={18} /> {message}
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="md:col-span-1">
            <div className="bg-anime-card backdrop-blur-md rounded-3xl p-6 border border-anime-accent/20 shadow-xl sticky top-24">
                <h3 className="font-bold text-lg mb-4 text-anime-text flex items-center gap-2">
                    {isEditing ? <Edit size={18}/> : <Plus size={18}/>}
                    {isEditing ? 'Edit Log' : 'Add New Log'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-anime-text/70 uppercase">Version</label>
                        <input 
                            type="text" 
                            value={version}
                            onChange={e => setVersion(e.target.value)}
                            placeholder="v1.0.0"
                            className="w-full bg-white/60 border border-anime-text/10 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-anime-accent/50"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-anime-text/70 uppercase">Release Date</label>
                        <input 
                            type="date" 
                            value={releaseDate}
                            onChange={e => setReleaseDate(e.target.value)}
                            className="w-full bg-white/60 border border-anime-text/10 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-anime-accent/50"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-anime-text/70 uppercase">Changes</label>
                        <textarea 
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="What's new?"
                            className="w-full bg-white/60 border border-anime-text/10 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-anime-accent/50 h-32 resize-none"
                            required
                        />
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                        {isEditing && (
                            <button 
                                type="button"
                                onClick={resetForm}
                                className="flex-1 bg-gray-200 text-gray-600 py-2 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                        <button 
                            type="submit"
                            className="flex-1 bg-anime-accent text-white py-2 rounded-xl font-bold shadow-md hover:bg-anime-secondary transition-all"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>

        {/* List Section */}
        <div className="md:col-span-2 space-y-4">
            {logs.length === 0 && (
                <div className="text-center py-12 bg-anime-card rounded-3xl border border-dashed border-anime-text/20">
                    <p className="text-anime-text/50">No logs found.</p>
                </div>
            )}
            {logs.map(log => (
                <div key={log.id} className="bg-white/70 backdrop-blur-sm p-5 rounded-2xl border border-anime-text/5 shadow-sm hover:shadow-md transition-all group flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-anime-secondary/10 text-anime-secondary px-2 py-0.5 rounded-lg text-sm font-bold border border-anime-secondary/20">
                                {log.version}
                            </span>
                            <span className="text-xs text-anime-text/50">
                                {log.releaseDate}
                            </span>
                        </div>
                        <p className="text-anime-text/80 whitespace-pre-wrap text-sm">
                            {log.content}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                         <button 
                            onClick={() => handleEdit(log)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                            title="Edit"
                         >
                             <Edit size={16} /> 
                         </button>
                         <button 
                            onClick={() => handleDelete(log.id!)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                            title="Delete"
                         >
                             <Trash2 size={16} /> 
                         </button>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default VersionManager;