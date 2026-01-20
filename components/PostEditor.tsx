import React, { useState, useEffect } from 'react';
import { BlogPost } from '../types';
import { Save, Image as ImageIcon, Tag, Hash, Layout, Type, ArrowLeft } from 'lucide-react';

interface PostEditorProps {
  initialPost?: BlogPost | null;
  onSave: (post: Partial<BlogPost>) => void;
  onCancel: () => void;
}

const PostEditor: React.FC<PostEditorProps> = ({ initialPost, onSave, onCancel }) => {
  const [title, setTitle] = useState(initialPost?.title || '');
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt || '');
  const [content, setContent] = useState(initialPost?.content || '');
  const [category, setCategory] = useState(initialPost?.category || '');
  const [imageUrl, setImageUrl] = useState(initialPost?.imageUrl || 'https://picsum.photos/800/600?random=' + Date.now());
  const [tagsInput, setTagsInput] = useState(initialPost?.tags.join(', ') || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);

    const postData: Partial<BlogPost> = {
      id: initialPost?.id,
      title,
      excerpt,
      content,
      category,
      imageUrl,
      tags
    };

    await onSave(postData);
    setIsLoading(false);
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onCancel}
          className="flex items-center gap-2 text-anime-text hover:text-anime-accent transition-colors"
        >
          <ArrowLeft size={20} /> Back
        </button>
        <h2 className="text-2xl font-bold text-anime-text">
            {initialPost ? 'Edit Scroll' : 'I need Suggestions & Love'}
        </h2>
      </div>

      <div className="bg-anime-card backdrop-blur-md rounded-3xl p-8 border border-anime-accent/20 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-anime-text/80 flex items-center gap-2">
              <Type size={16} /> Title
            </label>
            <input 
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-white/60 border border-anime-text/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50 text-lg font-bold"
              placeholder="Enter a catchy title..."
              required
            />
          </div>

          {/* Category & Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
                <label className="text-sm font-bold text-anime-text/80 flex items-center gap-2">
                  <Layout size={16} /> Category
                </label>
                <input 
                  type="text" 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-white/60 border border-anime-text/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50"
                  placeholder="e.g. Anime, Code..."
                  required
                />
             </div>
             <div className="space-y-2">
                <label className="text-sm font-bold text-anime-text/80 flex items-center gap-2">
                  <Hash size={16} /> Tags (comma separated)
                </label>
                <input 
                  type="text" 
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  className="w-full bg-white/60 border border-anime-text/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50"
                  placeholder="e.g. React, Life, Music"
                />
             </div>
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-anime-text/80 flex items-center gap-2">
              <ImageIcon size={16} /> Cover Image URL
            </label>
            <div className="flex gap-4">
                <input 
                  type="text" 
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="flex-grow bg-white/60 border border-anime-text/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50 text-sm font-mono"
                  placeholder="https://..."
                />
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-anime-text/10 shrink-0 bg-gray-100">
                   <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150')} />
                </div>
            </div>
          </div>

          {/* Excerpt */}
          <div className="space-y-2">
             <label className="text-sm font-bold text-anime-text/80 flex items-center gap-2">
               <Tag size={16} /> Short Excerpt
             </label>
             <textarea 
               value={excerpt}
               onChange={e => setExcerpt(e.target.value)}
               className="w-full bg-white/60 border border-anime-text/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50 min-h-[80px] resize-none"
               placeholder="A brief summary shown on the card..."
               required
             />
          </div>

          {/* Content */}
          <div className="space-y-2">
             <label className="text-sm font-bold text-anime-text/80 flex items-center gap-2">
               <Layout size={16} /> Content (HTML Supported)
             </label>
             <textarea 
               value={content}
               onChange={e => setContent(e.target.value)}
               className="w-full bg-white/60 border border-anime-text/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50 min-h-[300px] font-mono text-sm leading-relaxed"
               placeholder="<p>Write your story here...</p>"
               required
             />
             <p className="text-xs text-anime-text/50">Tip: You can use standard HTML tags for formatting.</p>
          </div>

          {/* Actions */}
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
                   <Save size={18} /> Save Post
                 </>
               )}
             </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default PostEditor;