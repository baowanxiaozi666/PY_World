import React, { useState } from 'react';
import { AboutProfile } from '../types';
import { Save, User, Image as ImageIcon, Heart, Star, FileText, ArrowLeft, Video, UploadCloud, Loader2 } from 'lucide-react';

interface ProfileEditorProps {
  initialData: AboutProfile;
  onSave: (data: AboutProfile) => void;
  onCancel: () => void;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ initialData, onSave, onCancel }) => {
  const [displayName, setDisplayName] = useState(initialData.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl || '');
  const [backgroundUrl, setBackgroundUrl] = useState(initialData.backgroundUrl || '');
  const [content, setContent] = useState(initialData.content || '');
  const [interests, setInterests] = useState(initialData.interests || '');
  const [animeTaste, setAnimeTaste] = useState(initialData.animeTaste || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const updatedProfile: AboutProfile = {
      displayName,
      avatarUrl,
      backgroundUrl,
      content,
      interests,
      animeTaste
    };

    await onSave(updatedProfile);
    setIsLoading(false);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
          const token = localStorage.getItem('token');
          // Demo fallback
          if (token === 'offline-demo-token') {
             setTimeout(() => {
                 setBackgroundUrl('https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4'); // Demo URL
                 setIsUploading(false);
             }, 1500);
             return;
          }

          const response = await fetch('/api/admin/upload', {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${token}`
              },
              body: formData
          });

          if (response.ok) {
              const res = await response.json();
              if (res.code === 200) {
                  setBackgroundUrl(res.data);
              } else {
                  alert("Upload failed: " + res.message);
              }
          } else {
              alert("Upload failed");
          }
      } catch (e) {
          console.error(e);
          alert("Network error");
      } finally {
          setIsUploading(false);
      }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onCancel}
          className="flex items-center gap-2 text-anime-text hover:text-anime-accent transition-colors"
        >
          <ArrowLeft size={20} /> Back to Dashboard
        </button>
        <h2 className="text-2xl font-bold text-anime-text">Edit Profile Info</h2>
      </div>

      <div className="bg-anime-card backdrop-blur-md rounded-3xl p-8 border border-anime-accent/20 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="flex flex-col md:flex-row gap-8">
              {/* Left Column: Avatar Preview */}
              <div className="w-full md:w-1/3 flex flex-col items-center">
                  <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-lg mb-4 bg-gray-100">
                      <img 
                        src={avatarUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                        onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/200')} 
                      />
                  </div>
                  <p className="text-xs text-anime-text/60">Avatar Preview</p>
              </div>

              {/* Right Column: Fields */}
              <div className="w-full md:w-2/3 space-y-6">
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-anime-text/80 flex items-center gap-2">
                      <User size={16} /> Display Name
                    </label>
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      className="w-full bg-white/60 border border-anime-text/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-anime-text/80 flex items-center gap-2">
                      <ImageIcon size={16} /> Avatar URL
                    </label>
                    <input 
                      type="text" 
                      value={avatarUrl}
                      onChange={e => setAvatarUrl(e.target.value)}
                      className="w-full bg-white/60 border border-anime-text/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50 text-sm font-mono"
                      required
                    />
                  </div>
              </div>
          </div>

          {/* Background Video Section */}
          <div className="p-4 bg-white/50 rounded-xl border border-anime-text/10">
              <label className="text-sm font-bold text-anime-text/80 flex items-center gap-2 mb-3">
                 <Video size={16} /> Background Video (MP4)
              </label>
              
              <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-grow space-y-2">
                      <input 
                          type="text" 
                          value={backgroundUrl}
                          onChange={e => setBackgroundUrl(e.target.value)}
                          placeholder="https://... (or upload file)"
                          className="w-full bg-white border border-anime-text/10 rounded-xl py-2 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50 text-sm font-mono"
                      />
                  </div>
                  <div className="relative">
                      <input 
                          type="file" 
                          accept="video/mp4" 
                          onChange={handleVideoUpload}
                          disabled={isUploading}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <button 
                          type="button" 
                          className="bg-anime-secondary text-white px-4 py-2 rounded-xl font-bold shadow-sm hover:bg-anime-accent transition-all flex items-center gap-2 h-full disabled:opacity-70"
                      >
                          {isUploading ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                          {isUploading ? 'Uploading...' : 'Upload Video'}
                      </button>
                  </div>
              </div>
              <p className="text-xs text-anime-text/50 mt-2">
                  Recommend 1920x1080 MP4 files. File size limit: 50MB.
              </p>
          </div>

          <div className="space-y-2">
             <label className="text-sm font-bold text-anime-text/80 flex items-center gap-2">
               <FileText size={16} /> Bio / Introduction
             </label>
             <textarea 
               value={content}
               onChange={e => setContent(e.target.value)}
               className="w-full bg-white/60 border border-anime-text/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50 min-h-[150px] resize-none leading-relaxed"
               placeholder="Tell the world about yourself..."
               required
             />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
                <label className="text-sm font-bold text-anime-text/80 flex items-center gap-2">
                  <Heart size={16} /> Interests (Comma separated)
                </label>
                <input 
                  type="text" 
                  value={interests}
                  onChange={e => setInterests(e.target.value)}
                  className="w-full bg-white/60 border border-anime-text/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50"
                  placeholder="e.g. Coding, Gaming"
                />
             </div>
             <div className="space-y-2">
                <label className="text-sm font-bold text-anime-text/80 flex items-center gap-2">
                  <Star size={16} /> Anime Taste (Comma separated)
                </label>
                <input 
                  type="text" 
                  value={animeTaste}
                  onChange={e => setAnimeTaste(e.target.value)}
                  className="w-full bg-white/60 border border-anime-text/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50"
                  placeholder="e.g. Isekai, Mecha"
                />
             </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-anime-text/10">
             <button 
               type="button"
               onClick={onCancel}
               className="px-6 py-3 mr-4 text-anime-text hover:bg-black/5 rounded-xl transition-colors font-medium"
             >
               Cancel
             </button>
             <button 
               type="submit"
               disabled={isLoading}
               className="bg-anime-accent text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-anime-accent/30 hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
             >
               {isLoading ? 'Saving...' : (
                 <>
                   <Save size={18} /> Update Profile
                 </>
               )}
             </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ProfileEditor;