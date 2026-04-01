import React, { useState, useEffect } from 'react';
import { BlogPost } from '../types';
import { Edit, Trash2, Plus, FileText, Heart, MessageSquare, LayoutDashboard, UserCog, Music, Search, Filter, ArrowDownWideNarrow, RefreshCw, History } from 'lucide-react';
import { BLOG_POSTS } from '../constants';

interface AdminDashboardProps {
  posts: BlogPost[]; // Initial posts passed from App.tsx
  tags?: string[]; // New prop for tag filtering
  onCreate: () => void;
  onEdit: (post: BlogPost) => void;
  onDelete: (postId: string) => void;
  onEditProfile?: () => void;
  onManageMusic?: () => void;
  onManageVersions?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ posts: initialPosts, tags = [], onCreate, onEdit, onDelete, onEditProfile, onManageMusic, onManageVersions }) => {
  // Local state for dashboard-specific filtering/sorting to avoid reloading the whole app
  const [localPosts, setLocalPosts] = useState<BlogPost[]>(initialPosts);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync with prop updates (e.g. after delete/create)
  useEffect(() => {
    setLocalPosts(initialPosts);
  }, [initialPosts]);

  const applyLocalFilters = () => {
      // Use initialPosts if available (to keep changes), else fallback to constant
      let sorted = initialPosts.length > 0 ? [...initialPosts] : [...BLOG_POSTS];
      
      if (searchTerm) {
          sorted = sorted.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      if (selectedTag) {
          sorted = sorted.filter(p => p.tags.includes(selectedTag) || p.category === selectedTag);
      }
      
      if (sortBy === 'likes') {
          sorted.sort((a, b) => b.likes - a.likes);
      } else if (sortBy === 'comments') {
          sorted.sort((a, b) => b.comments.length - a.comments.length);
      } else {
          // Latest
          sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
      setLocalPosts(sorted);
  };

  const fetchAdminPosts = async () => {
    setIsRefreshing(true);
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (selectedTag) params.append('tag', selectedTag);
    if (sortBy) params.append('sort', sortBy);

    const token = localStorage.getItem('token');
    
    // Explicit Offline Check: Avoid fetch call if we know we are offline
    if (token === 'offline-demo-token') {
        applyLocalFilters();
        setIsRefreshing(false);
        return;
    }

    try {
        const response = await fetch(`/api/posts?${params.toString()}`);
        if (response.ok) {
            const res = await response.json();
            if (res.code === 200) {
                setLocalPosts(res.data);
            }
        } else {
            // Fallback on server error
            applyLocalFilters();
        }
    } catch (e) {
        // Fallback on network error (don't log error to avoid console noise)
        applyLocalFilters();
    } finally {
        setIsRefreshing(false);
    }
  };

  // Debounce search or trigger on filter change
  useEffect(() => {
    const timer = setTimeout(() => {
        fetchAdminPosts();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedTag, sortBy]);

  const totalLikes = localPosts.reduce((sum, post) => sum + post.likes, 0);
  const totalComments = localPosts.reduce((sum, post) => sum + post.comments.length, 0);

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
        onDelete(id);
    }
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-anime-text flex items-center gap-3">
            <LayoutDashboard className="text-anime-accent" /> 
            Admin Dashboard
          </h2>
          <p className="text-anime-text/60 mt-1">Manage your world content from here.</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
        {onManageVersions && (
          <button 
            onClick={onManageVersions}
            className="bg-anime-card text-anime-text border border-anime-accent/30 px-4 py-3 rounded-xl font-bold shadow-sm hover:shadow-md hover:bg-anime-bg transition-all flex items-center gap-2"
          >
            <History size={20} className="text-anime-secondary" /> Timeline
          </button>
        )}
        {onManageMusic && (
          <button 
            onClick={onManageMusic}
            className="bg-anime-card text-anime-text border border-anime-accent/30 px-4 py-3 rounded-xl font-bold shadow-sm hover:shadow-md hover:bg-anime-bg transition-all flex items-center gap-2"
          >
            <Music size={20} className="text-anime-secondary" /> Music
          </button>
        )}
        {onEditProfile && (
          <button 
            onClick={onEditProfile}
            className="bg-anime-card text-anime-text border border-anime-accent/30 px-4 py-3 rounded-xl font-bold shadow-sm hover:shadow-md hover:bg-anime-bg transition-all flex items-center gap-2"
          >
            <UserCog size={20} className="text-anime-secondary" /> Profile
          </button>
        )}
        <button 
          onClick={onCreate}
          className="bg-anime-accent text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-anime-accent/30 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
        >
          <Plus size={20} /> New Post
        </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-anime-card backdrop-blur-md p-6 rounded-2xl border border-anime-text/10 shadow-sm flex items-center gap-4">
            <div className="p-4 bg-blue-100 text-blue-500 rounded-full">
                <FileText size={24} />
            </div>
            <div>
                <p className="text-sm text-anime-text/70 font-bold">Total Posts</p>
                <h3 className="text-2xl font-bold text-anime-text">{localPosts.length}</h3>
            </div>
        </div>
        <div className="bg-anime-card backdrop-blur-md p-6 rounded-2xl border border-anime-text/10 shadow-sm flex items-center gap-4">
            <div className="p-4 bg-pink-100 text-pink-500 rounded-full">
                <Heart size={24} />
            </div>
            <div>
                <p className="text-sm text-anime-text/70 font-bold">Total Likes</p>
                <h3 className="text-2xl font-bold text-anime-text">{totalLikes}</h3>
            </div>
        </div>
        <div className="bg-anime-card backdrop-blur-md p-6 rounded-2xl border border-anime-text/10 shadow-sm flex items-center gap-4">
            <div className="p-4 bg-purple-100 text-purple-500 rounded-full">
                <MessageSquare size={24} />
            </div>
            <div>
                <p className="text-sm text-anime-text/70 font-bold">Total Comments</p>
                <h3 className="text-2xl font-bold text-anime-text">{totalComments}</h3>
            </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-anime-card backdrop-blur-md rounded-t-3xl border border-anime-accent/20 border-b-0 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-64">
              <input 
                type="text" 
                placeholder="Search your posts..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/60 border border-anime-text/10 rounded-xl py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-anime-accent/50 text-sm"
              />
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-anime-text/50" />
          </div>

          <div className="flex gap-4 w-full md:w-auto">
              {/* Tag Filter */}
              <div className="relative flex-grow md:flex-grow-0">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-anime-text/50">
                      <Filter size={16} />
                  </div>
                  <select 
                     value={selectedTag}
                     onChange={(e) => setSelectedTag(e.target.value)}
                     className="w-full md:w-40 appearance-none bg-white/60 border border-anime-text/10 rounded-xl py-2 pl-10 pr-8 outline-none focus:ring-2 focus:ring-anime-accent/50 text-sm cursor-pointer"
                  >
                      <option value="">All Tags</option>
                      {tags.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                      ))}
                  </select>
              </div>

              {/* Sort By */}
              <div className="relative flex-grow md:flex-grow-0">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-anime-text/50">
                      <ArrowDownWideNarrow size={16} />
                  </div>
                  <select 
                     value={sortBy}
                     onChange={(e) => setSortBy(e.target.value)}
                     className="w-full md:w-40 appearance-none bg-white/60 border border-anime-text/10 rounded-xl py-2 pl-10 pr-8 outline-none focus:ring-2 focus:ring-anime-accent/50 text-sm cursor-pointer"
                  >
                      <option value="latest">Latest</option>
                      <option value="likes">Most Liked</option>
                      <option value="comments">Most Discussed</option>
                  </select>
              </div>

              <button 
                 onClick={fetchAdminPosts}
                 className={`p-2 rounded-xl bg-white/60 border border-anime-text/10 text-anime-text/70 hover:text-anime-accent transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                 title="Refresh"
              >
                  <RefreshCw size={18} />
              </button>
          </div>
      </div>

      {/* Posts Table */}
      <div className="bg-anime-card backdrop-blur-md rounded-b-3xl border border-anime-accent/20 border-t-0 shadow-xl overflow-hidden mb-12">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-anime-accent/10 text-anime-text border-b border-anime-accent/20">
                <th className="p-5 font-bold">Title</th>
                <th className="p-5 font-bold">Category</th>
                <th className="p-5 font-bold">Date</th>
                <th className="p-5 font-bold text-center">Stats</th>
                <th className="p-5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {localPosts.map((post) => (
                <tr key={post.id} className="border-b border-anime-text/5 hover:bg-white/40 transition-colors group">
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                        <img src={post.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        <span className="font-medium text-anime-text line-clamp-1 max-w-[200px] group-hover:text-anime-accent transition-colors">{post.title}</span>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className="bg-anime-bg border border-anime-text/10 px-3 py-1 rounded-full text-xs font-medium text-anime-text/80">
                        {post.category}
                    </span>
                  </td>
                  <td className="p-5 text-sm text-anime-text/60">
                    {post.date}
                  </td>
                  <td className="p-5">
                    <div className="flex items-center justify-center gap-4 text-xs text-anime-text/60">
                        <span className="flex items-center gap-1 font-semibold" title="Likes">
                            <Heart size={14} className="text-pink-400" /> {post.likes}
                        </span>
                        <span className="flex items-center gap-1 font-semibold" title="Comments">
                            <MessageSquare size={14} className="text-blue-400" /> {post.comments.length}
                        </span>
                    </div>
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button 
                            onClick={() => onEdit(post)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                        >
                            <Edit size={18} />
                        </button>
                        <button 
                            onClick={() => handleDelete(post.id, post.title)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {localPosts.length === 0 && (
                  <tr>
                      <td colSpan={5} className="p-10 text-center text-anime-text/50">
                          {searchTerm || selectedTag ? 'No posts match your filters.' : 'No posts found. Create your first one!'}
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;