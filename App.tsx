import React, { useState, useEffect } from 'react';
import { Search, Cloud, Sparkles } from 'lucide-react';
import Header from './components/Header';
import Footer from './components/Footer';
import PostCard from './components/PostCard';
import PostDetail from './components/PostDetail';
import TagManager from './components/TagManager';
import MascotChat from './components/MascotChat';
import ParticleEffect from './components/ParticleEffect';
import MusicPlayer from './components/MusicPlayer';
import Login from './components/Login';
import PostEditor from './components/PostEditor';
import AdminDashboard from './components/AdminDashboard';
import ProfileEditor from './components/ProfileEditor';
import MusicManager from './components/MusicManager';
import VersionTimeline from './components/VersionTimeline';
import VersionManager from './components/VersionManager';
import LatestUpdatesWidget from './components/LatestUpdatesWidget';
import BackgroundVideo from './components/BackgroundVideo';
import { Page, BlogPost, Theme, CloudKeyword, AboutProfile } from './types';
import { BLOG_POSTS, INITIAL_TAGS, APP_NAME } from './constants';
import { apiFetch } from './services/api';

const App: React.FC = () => {
  const getTimeBasedTheme = (): Theme => {
    const hour = new Date().getHours();
    // 晚上 20:00 到第二天 07:00 默认暗黑
    const isNight = hour >= 20 || hour < 7;
    // 当前语义：sakura=暗黑，cyber=明亮
    return isNight ? 'sakura' : 'cyber';
  };

  const [activePage, setActivePage] = useState<Page>(Page.HOME);
  const [posts, setPosts] = useState<BlogPost[]>(BLOG_POSTS);
  const [tags, setTags] = useState<string[]>([]); // 不使用默认常量，从后端获取
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // 默认主题：优先读 localStorage；否则按时间自动选择（20:00~07:00 暗黑）
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'sakura' || saved === 'cyber') return saved;
    return getTimeBasedTheme();
  });
  const [cloudKeywords, setCloudKeywords] = useState<CloudKeyword[]>([]);
  
  // Profile Data (Default fallback)
  const [aboutProfile, setAboutProfile] = useState<AboutProfile>({
      displayName: "The Developer",
      avatarUrl: "https://picsum.photos/400/400?random=10",
      content: "I'm a frontend engineer who loves building beautiful interfaces...",
      interests: "React, TypeScript, AI",
      animeTaste: "Slice of Life, Sci-Fi"
  });

  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Initialize Auth
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
        setIsLoggedIn(true);
    }
  }, []);

  const handleLoginSuccess = (token: string) => {
      localStorage.setItem('token', token);
      setIsLoggedIn(true);
      // Redirect to Dashboard upon login
      setActivePage(Page.ADMIN_DASHBOARD);
  };

  const handleLogout = async () => {
      const token = localStorage.getItem('token');
      if (token && token !== 'offline-demo-token') {
        try {
          // Notify backend to remove token from Redis
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        } catch (error) {
          console.error("Logout error (Backend might be offline)", error);
        }
      }
      
      // Clear local state regardless of backend success
      localStorage.removeItem('token');
      setIsLoggedIn(false);
      setActivePage(Page.HOME);
  };

  // Handle Theme Change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Fetch Tags from Backend
  const fetchTags = async () => {
    try {
      const res = await apiFetch<string[]>('/tags');
      if (res.code === 200) setTags(res.data);
      return;
    } catch (e) {
      console.log("Backend offline, using local tags");
    }
  };

  // Fetch About Profile from Backend
  const fetchProfile = async () => {
      try {
          const res = await apiFetch<AboutProfile>('/about');
          if (res.code === 200 && res.data) setAboutProfile(res.data);
      } catch (e) {
          console.log("Backend offline, using default profile");
      }
  };

  useEffect(() => {
    fetchCloudData();
    fetchTags();
    fetchProfile();
    fetchPosts(); // 初始化时从后端获取帖子列表
  }, []);

  // Fetch Posts from Backend (handles Search AND Tag filtering)
  const fetchPosts = async () => {
    let url = '/api/posts';
    const params = new URLSearchParams();

    // Priority: Search > Tag > All
    if (searchQuery) {
        params.append('search', searchQuery);
    } else if (selectedTag) {
        params.append('tag', selectedTag);
    }

    const queryString = params.toString();
    if (queryString) {
        url += `?${queryString}`;
    }

    try {
        const response = await fetch(url);
        if (response.ok) {
          const res = await response.json();
          if (res.code === 200) {
            setPosts(res.data);
            if (searchQuery) fetchCloudData();
          }
          return;
        }
    } catch (e) {
        console.log("Backend offline, using local filtering");
    }
    
    // Fallback Local Filtering (Backend Offline)
    const filtered = (posts.length > 0 && posts !== BLOG_POSTS ? posts : BLOG_POSTS).filter(post => {
        const matchesTag = selectedTag ? (post.tags.includes(selectedTag) || post.category === selectedTag) : true;
        const matchesSearch = searchQuery 
          ? post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
          : true;
        return matchesTag && matchesSearch;
    });
    // Only reset if we are falling back to initial data, otherwise keep current state
    if (posts === BLOG_POSTS) {
        setPosts(filtered);
    }
  };

  // Fetch Cloud Data from Backend
  const fetchCloudData = async () => {
      try {
          const res = await apiFetch<any[]>('/search/cloud');
          if (res.code === 200) {
                const data = res.data; 
                const maxCount = Math.max(...data.map((d: any) => d.count), 1);
                
                const mappedKeywords: CloudKeyword[] = data.map((item: any, index: number) => {
                    const scale = item.count / maxCount;
                    const size = 60 + (scale * 100);
                    const top = `${10 + (index * 8) % 80}%`;
                    const delay = `${-(index * 2)}s`; 
                    const animationTypes = ['animate-drift', 'animate-drift-slow', 'animate-drift-slower'];
                    const animation = animationTypes[index % 3];
                    
                    return {
                        id: index,
                        text: item.text,
                        count: item.count,
                        size: size,
                        top: top,
                        animation: animation,
                        delay: delay,
                        opacity: 0.6 + (scale * 0.35), 
                        rotate: `${(index % 2 === 0 ? 1 : -1) * (index % 15)}deg`
                    };
                });
                setCloudKeywords(mappedKeywords);
                return;
          }
      } catch (e) {
          console.log("Backend offline, using default cloud");
      }
      
      // Fallback Default Cloud
      setCloudKeywords([
        { id: 1, text: 'Anime', count: 100, size: 150, top: '15%', animation: 'animate-drift', delay: '0s', opacity: 0.95, rotate: '0deg' },
        { id: 2, text: 'Java', count: 80, size: 135, top: '45%', animation: 'animate-drift-slow', delay: '-8s', opacity: 0.9, rotate: '5deg' },
        { id: 3, text: 'Travel', count: 60, size: 125, top: '75%', animation: 'animate-drift-slower', delay: '-15s', opacity: 0.85, rotate: '-3deg' },
        { id: 4, text: 'Design', count: 50, size: 110, top: '60%', animation: 'animate-drift', delay: '-5s', opacity: 0.8, rotate: '8deg' },
        { id: 5, text: 'Game', count: 45, size: 105, top: '30%', animation: 'animate-drift-slow', delay: '-12s', opacity: 0.8, rotate: '-5deg' },
      ]);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
        // 当搜索词或标签变化时，从后端获取过滤后的帖子
        fetchPosts();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedTag]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'sakura' ? 'cyber' : 'sakura';
      localStorage.setItem('theme', next);
      return next;
    });
  };

  const handlePostClick = async (post: BlogPost) => {
    // Always fetch fresh post detail from backend to ensure comments and replies are loaded
    try {
      const response = await fetch(`/api/posts/${post.id}`);
      if (response.ok) {
        const result = await response.json();
        if (result.code === 200) {
          setSelectedPost(result.data);
        } else {
          // Fallback to the post from list if API fails
          setSelectedPost(post);
        }
      } else {
        // Fallback to the post from list if API fails
        setSelectedPost(post);
      }
    } catch (error) {
      console.error("Failed to fetch post detail:", error);
      // Fallback to the post from list if API fails
      setSelectedPost(post);
    }
    setActivePage(Page.BLOG_DETAIL);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (page: Page) => {
    setActivePage(page);
    if (page === Page.CREATE_POST) {
        setSelectedPost(null);
    }
    if (page !== Page.BLOG_DETAIL && page !== Page.EDIT_POST) {
      setSelectedPost(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleEditPost = (post: BlogPost) => {
      setSelectedPost(post);
      setActivePage(Page.EDIT_POST);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdatePost = (updatedPost: BlogPost) => {
    setPosts(prevPosts => prevPosts.map(p => p.id === updatedPost.id ? updatedPost : p));
    setSelectedPost(updatedPost);
  };
  
  const handleSavePost = async (post: Partial<BlogPost>) => {
      const token = localStorage.getItem('token');
      if (!token) {
          alert("You must be logged in!");
          return;
      }

      // Offline / Demo Mode Logic
      if (token === 'offline-demo-token') {
          console.log("Saving in offline demo mode");
          const now = new Date().toISOString().split('T')[0];
          
          if (post.id) {
              // Update existing
              setPosts(prev => prev.map(p => p.id === post.id ? { ...p, ...post } as BlogPost : p));
          } else {
              // Create new
              const newPost: BlogPost = {
                  ...post,
                  id: Date.now().toString(),
                  date: now,
                  likes: 0,
                  comments: [],
                  tags: post.tags || [],
                  imageUrl: post.imageUrl || "https://picsum.photos/800/600",
                  category: post.category || "General",
                  title: post.title || "Untitled",
                  content: post.content || "",
                  excerpt: post.excerpt || ""
              } as BlogPost;
              setPosts(prev => [newPost, ...prev]);
          }
          setActivePage(Page.ADMIN_DASHBOARD);
          return;
      }

      const method = post.id ? 'PUT' : 'POST';
      // UPDATED: Use /api/admin/posts for management operations
      const url = post.id 
        ? `/api/admin/posts/${post.id}` 
        : `/api/admin/posts`;

      try {
          // 准备发送的数据：只包含后端 PostDTO 需要的字段
          const postData: any = {
              title: post.title || '',
              excerpt: post.excerpt || '',
              content: post.content || '',
              category: post.category || '',
              imageUrl: post.imageUrl || '',
              tags: post.tags || []
          };
          
          // 编辑时，id 在 URL 路径中，不需要在 body 里
          // 确保所有必需字段都有值
          if (!postData.title || !postData.content || !postData.category) {
              alert("Please fill in all required fields (Title, Content, Category)");
              return;
          }

          console.log("Saving post:", postData); // 调试用

          const response = await fetch(url, {
              method,
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(postData)
          });

          // 先尝试读取响应体（无论成功还是失败）
          let responseData: any = {};
          try {
              const text = await response.text();
              if (text) {
                  responseData = JSON.parse(text);
              }
          } catch (e) {
              console.warn("Failed to parse response:", e);
          }

          if (response.ok) {
              if (responseData.code === 200) {
                  // 保存成功后刷新列表
                  await fetchPosts();
                  await fetchTags();
                  setActivePage(Page.ADMIN_DASHBOARD);
              } else {
                  alert(responseData.message || "Failed to save post");
              }
          } else {
              // 400 或其他错误，显示详细错误信息
              const errorMessage = responseData.message || responseData.error || 
                                  `Failed to save post (Status: ${response.status})`;
              console.error("Save post error:", responseData);
              alert(errorMessage);
          }
      } catch (e) {
          console.error("Error saving post", e);
          alert("Network error: " + (e instanceof Error ? e.message : "Backend seems offline."));
      }
  };
  
  const handleDeletePost = async (postId: string) => {
      const token = localStorage.getItem('token');
      if (!token) {
          alert("You must be logged in!");
          return;
      }

      if (token === 'offline-demo-token') {
           setPosts(prev => prev.filter(p => p.id !== postId));
           if (activePage === Page.ADMIN_DASHBOARD) {
               // Force re-render if needed, but state update handles it
           }
           return;
      }
      
      try {
          // UPDATED: Use /api/admin/posts for management operations
          const response = await fetch(`/api/admin/posts/${postId}`, {
              method: 'DELETE',
              headers: {
                  'Authorization': `Bearer ${token}`
              }
          });
          
          if (response.ok) {
              await fetchPosts(); 
          } else {
              alert("Failed to delete post");
          }
      } catch (e) {
          console.error("Error deleting post", e);
          alert("Network error. Backend seems offline.");
      }
  };

  const handleUpdateProfile = async (profile: AboutProfile) => {
      const token = localStorage.getItem('token');
      if (!token) {
          alert("You must be logged in!");
          return;
      }
      
      // Offline fallback
      if (token === 'offline-demo-token') {
          setAboutProfile(profile);
          setActivePage(Page.ADMIN_DASHBOARD);
          return;
      }

      try {
          const response = await fetch(`/api/admin/about`, {
              method: 'PUT',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(profile)
          });
          
          if (response.ok) {
              setAboutProfile(profile);
              setActivePage(Page.ADMIN_DASHBOARD);
          } else {
              alert("Failed to update profile");
          }
      } catch (e) {
          console.error("Error updating profile", e);
          alert("Network error");
      }
  };

  const handleDeleteTag = async (tagToDelete: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert("You must be logged in!");
      return;
    }
    
    if (token === 'offline-demo-token') {
      // Offline mode: just update local state
      setTags(tags.filter(t => t !== tagToDelete));
      if (selectedTag === tagToDelete) setSelectedTag(null);
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/tags/${encodeURIComponent(tagToDelete)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        // Refresh tags after successful deletion
        const res = await response.json();
        if (res.code === 200) {
          // Fetch updated tags list
          try {
            const tagsResponse = await fetch('/api/tags');
            if (tagsResponse.ok) {
              const tagsRes = await tagsResponse.json();
              if (tagsRes.code === 200) {
                setTags(tagsRes.data);
              }
            }
          } catch (e) {
            console.log("Backend offline, using local tags");
          }
          
          if (selectedTag === tagToDelete) setSelectedTag(null);
        } else {
          alert(res.message || "Failed to delete tag");
        }
      } else {
        alert("Failed to delete tag");
      }
    } catch (e) {
      console.error("Error deleting tag", e);
      alert("Network error. Backend seems offline.");
    }
  };

  // Helper: 当前我们让 sakura = 暗黑深海主题，cyber = 明亮天蓝主题
  const isDark = theme === 'sakura';

  const renderContent = () => {
    switch (activePage) {
      case Page.HOME:
        return (
          <>
            {/* Hero Section */}
            <div className={`relative rounded-3xl overflow-hidden mb-12 min-h-[300px] md:min-h-[400px] flex items-center justify-center shadow-2xl transition-all duration-700
                ${isDark 
                  ? 'bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 shadow-indigo-500/20' 
                  : 'bg-gradient-to-b from-sky-400 via-sky-300 to-sky-100 shadow-sky-200/40'
                }`}>
              
              {/* Floating Clouds */}
              {cloudKeywords.map((cloud) => (
                <div 
                  key={cloud.id}
                  className={`absolute left-0 ${cloud.animation} flex items-center justify-center hover:[animation-play-state:paused] z-0 hover:z-20 transition-all duration-700
                      ${isDark ? 'text-indigo-200/20' : 'text-white'}
                  `} 
                  style={{ 
                    top: cloud.top, 
                    animationDelay: cloud.delay, 
                    opacity: cloud.opacity,
                  }}
                >
                  <div style={{ transform: `rotate(${cloud.rotate})` }}>
                     <div 
                        className="relative flex items-center justify-center group cursor-pointer transition-transform hover:scale-110 duration-500"
                        onClick={() => setSearchQuery(cloud.text)} 
                     >
                        <Cloud size={cloud.size} fill="currentColor" className={`transition-all duration-700 ${isDark ? "drop-shadow-none" : "drop-shadow-md"}`} />
                        <span 
                          className={`absolute font-bold tracking-widest pointer-events-none select-none transition-colors duration-700
                             ${isDark ? 'text-indigo-300/80' : 'text-sky-500/80'}
                          `}
                          style={{ fontSize: Math.max(11, (cloud.size || 100) * 0.2) }}
                        >
                          {cloud.text}
                        </span>
                     </div>
                  </div>
                </div>
              ))}
              
              <div className="relative z-10 px-8 md:px-16 w-full max-w-4xl flex flex-col items-center text-center">
                <div className="mb-8 text-center animate-fade-in-up">
                    <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg mb-2 font-sans tracking-tight">
                        Welcome to {APP_NAME}
                    </h1>
                    <p className={`text-lg md:text-xl font-medium drop-shadow-md flex items-center justify-center gap-2 transition-colors duration-500 ${isDark ? 'text-indigo-100' : 'text-white/90'}`}>
                        <Sparkles size={20} className="animate-pulse" />
                        I need Suggestions & Love
                        <Sparkles size={20} className="animate-pulse" />
                    </p>
                </div>

                <div className="relative w-full max-w-2xl group animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                  <div className={`absolute inset-0 blur-xl rounded-full transition-colors duration-500 ${isDark ? 'bg-indigo-500/20 group-hover:bg-indigo-500/30' : 'bg-white/40 group-hover:bg-white/50'}`}></div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search posts or tags..."
                    className={`relative w-full backdrop-blur-md border rounded-full py-5 pl-14 pr-6 text-xl focus:outline-none transition-all duration-500 shadow-lg text-shadow-sm
                        ${isDark 
                          ? 'bg-slate-900/40 border-indigo-500/30 text-indigo-100 placeholder-indigo-300/30 focus:bg-slate-900/60 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/50' 
                          : 'bg-white/20 border-white/60 text-white placeholder-white/80 focus:bg-white/30 focus:border-white'
                        }
                    `}
                  />
                  <Search className={`absolute left-6 top-1/2 -translate-y-1/2 transition-colors duration-500 ${isDark ? 'text-indigo-300' : 'text-white drop-shadow-md'}`} size={28} />
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-1/4">
                <TagManager 
                  tags={tags}
                  selectedTag={selectedTag}
                  onSelectTag={setSelectedTag}
                  onDeleteTag={handleDeleteTag}
                  isLoggedIn={isLoggedIn}
                />
                
                {/* Profile Card - Made Clickable */}
                <div 
                   onClick={() => handleNavigate(Page.ABOUT)}
                   className="bg-anime-card backdrop-blur-sm rounded-2xl p-6 border border-anime-accent/20 hidden md:block cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group"
                >
                   <div className="text-center">
                     <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-anime-accent to-anime-secondary p-1 mb-3 group-hover:rotate-6 transition-transform">
                        <img src={aboutProfile.avatarUrl} className="w-full h-full rounded-full object-cover border-2 border-white" alt="Avatar"/>
                     </div>
                     <h3 className="font-bold text-anime-text group-hover:text-anime-accent transition-colors">{aboutProfile.displayName}</h3>
                     {isLoggedIn && <span className="text-[10px] bg-anime-accent text-white px-2 py-0.5 rounded-full">Admin</span>}
                     <p className="text-xs text-anime-text/60 mt-1">且趁余花谋一笑</p>
                   </div>
                </div>

                {/* Latest Updates Widget (Added here for Visibility) */}
                <LatestUpdatesWidget onNavigate={() => handleNavigate(Page.CHANGELOG)} />

              </div>

              <div className="w-full md:w-3/4">
                 <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-anime-text border-l-4 border-anime-accent pl-4 flex items-center gap-2">
                      {selectedTag ? `#${selectedTag}` : (searchQuery ? `Search: "${searchQuery}"` : 'Latest Entries')}
                    </h2>
                    <div className="text-sm text-anime-text/60">
                      {posts.length} post{posts.length !== 1 ? 's' : ''} found
                    </div>
                 </div>

                 {posts.length > 0 ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {posts.map((post) => (
                       <PostCard 
                         key={post.id} 
                         post={post} 
                         onClick={handlePostClick} 
                         isLoggedIn={isLoggedIn}
                         onEdit={handleEditPost}
                         onDelete={handleDeletePost}
                       />
                     ))}
                   </div>
                 ) : (
                   <div className="text-center py-20 bg-anime-card rounded-2xl border border-anime-text/5">
                     <p className="text-anime-text/50 text-lg">No posts found in this dimension... (｡•́︿•̀｡)</p>
                     <button 
                       onClick={() => { 
                           setSelectedTag(null); 
                           setSearchQuery(''); 
                           fetchPosts(); 
                       }} 
                       className="text-anime-accent mt-2 hover:underline"
                     >
                       Clear Filters
                     </button>
                   </div>
                 )}
              </div>
            </div>
          </>
        );

      case Page.BLOG_DETAIL:
        if (!selectedPost) return null;
        return (
          <PostDetail 
            post={selectedPost} 
            onBack={() => handleNavigate(Page.HOME)}
            onUpdatePost={handleUpdatePost}
            isLoggedIn={isLoggedIn}
            onEdit={handleEditPost}
          />
        );
        
      case Page.CREATE_POST:
          // 从已有帖子中提取所有分类
          const allCategories = Array.from(new Set(posts.map(p => p.category).filter(Boolean)));
          return (
              <PostEditor 
                  onSave={handleSavePost}
                  onCancel={() => handleNavigate(Page.ADMIN_DASHBOARD)}
                  availableTags={tags}
                  availableCategories={allCategories}
              />
          );

      case Page.EDIT_POST:
          // 从已有帖子中提取所有分类
          const allCategoriesEdit = Array.from(new Set(posts.map(p => p.category).filter(Boolean)));
          return (
              <PostEditor 
                  initialPost={selectedPost}
                  onSave={handleSavePost}
                  onCancel={() => handleNavigate(Page.ADMIN_DASHBOARD)}
                  availableTags={tags}
                  availableCategories={allCategoriesEdit}
              />
          );

      case Page.EDIT_PROFILE:
          return (
              <ProfileEditor 
                  initialData={aboutProfile}
                  onSave={handleUpdateProfile}
                  onCancel={() => handleNavigate(Page.ADMIN_DASHBOARD)}
              />
          );

      case Page.ADMIN_MUSIC:
          return (
             <MusicManager onBack={() => handleNavigate(Page.ADMIN_DASHBOARD)} />
          );
      
      case Page.ADMIN_VERSIONS:
          return (
              <VersionManager onBack={() => handleNavigate(Page.ADMIN_DASHBOARD)} />
          );
      
      case Page.CHANGELOG:
          return (
             <VersionTimeline />
          );
      
      case Page.ADMIN_DASHBOARD:
          if (!isLoggedIn) {
              setActivePage(Page.LOGIN);
              return null;
          }
          return (
              <AdminDashboard 
                  posts={posts}
                  tags={tags}
                  onCreate={() => handleNavigate(Page.CREATE_POST)}
                  onEdit={handleEditPost}
                  onDelete={handleDeletePost}
                  onEditProfile={() => handleNavigate(Page.EDIT_PROFILE)}
                  onManageMusic={() => handleNavigate(Page.ADMIN_MUSIC)}
                  onManageVersions={() => handleNavigate(Page.ADMIN_VERSIONS)}
              />
          );

      case Page.LOGIN:
        return (
            <Login onLoginSuccess={handleLoginSuccess} />
        );

      case Page.ABOUT:
        return (
          <div className="bg-anime-card backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-xl border border-anime-accent/20 flex flex-col md:flex-row gap-12 items-center">
            <div className="w-full md:w-1/3 flex justify-center">
               <div className="relative w-64 h-64">
                 <div className="absolute inset-0 bg-gradient-to-tr from-anime-accent to-anime-secondary rounded-full animate-spin-slow blur-lg opacity-70"></div>
                 <img 
                   src={aboutProfile.avatarUrl} 
                   alt="Profile" 
                   className="relative z-10 w-full h-full object-cover rounded-full border-4 border-white shadow-2xl"
                   onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/400')}
                 />
               </div>
            </div>
            <div className="w-full md:w-2/3">
              <h1 className="text-4xl font-bold text-anime-text mb-4">
                Hello, I'm <span className="text-transparent bg-clip-text bg-gradient-to-r from-anime-accent to-anime-secondary">{aboutProfile.displayName}</span>
              </h1>
              <p className="text-lg text-anime-text/80 mb-6 leading-relaxed whitespace-pre-line">
                {aboutProfile.content}
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="bg-anime-bg p-4 rounded-xl border border-anime-accent/20">
                   <h3 className="font-bold text-anime-text mb-1">Interests</h3>
                   <p className="text-sm text-anime-text/60">{aboutProfile.interests}</p>
                 </div>
                 <div className="bg-anime-bg p-4 rounded-xl border border-anime-secondary/20">
                   <h3 className="font-bold text-anime-text mb-1">Film & TV Enthusiast</h3>
                   <p className="text-sm text-anime-text/60">{aboutProfile.animeTaste}</p>
                 </div>
              </div>

              <button 
                onClick={() => handleNavigate(Page.HOME)}
                className="px-6 py-2 border-2 border-anime-accent text-anime-accent rounded-full font-bold hover:bg-anime-accent hover:text-white transition-all"
              >
                Back to Home
              </button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen font-sans text-anime-text pb-20 transition-colors duration-500 relative">
      {/* BackgroundVideo logic controller: updates HTML video src if custom url exists */}
      <BackgroundVideo videoUrl={aboutProfile.backgroundUrl} />
      
      <ParticleEffect theme={theme} />
      
      {/* Changed to Flex Column Layout for Sticky Footer */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header 
          activePage={activePage} 
          onNavigate={handleNavigate} 
          currentTheme={theme}
          toggleTheme={toggleTheme}
          isLoggedIn={isLoggedIn}
          onLogout={handleLogout}
        />
        
        {/* Main content grows to fill available space */}
        <main className="max-w-6xl mx-auto px-4 py-8 flex-grow w-full">
          {renderContent()}
        </main>

        <Footer />
      </div>
      
      <MusicPlayer />
      <MascotChat />
    </div>
  );
};

export default App;