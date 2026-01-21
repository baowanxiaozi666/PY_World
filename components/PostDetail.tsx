import React, { useState, useEffect } from 'react';
import { BlogPost, Comment } from '../types';
import { Clock, Tag, ArrowLeft, Heart, Send, User, Edit, Trash2, Reply, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface PostDetailProps {
  post: BlogPost;
  onBack: () => void;
  onUpdatePost: (updatedPost: BlogPost) => void;
  onEdit?: (post: BlogPost) => void;
  isLoggedIn?: boolean;
  aboutProfile?: { avatarUrl: string };
}

const PostDetail: React.FC<PostDetailProps> = ({ post, onBack, onUpdatePost, onEdit, isLoggedIn, aboutProfile }) => {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({});
  const [isLiked, setIsLiked] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set()); // Track which comments are expanded

  // Ensure comments and replies are loaded when component mounts or post changes
  useEffect(() => {
    const fetchPostDetail = async () => {
      try {
        const response = await fetch(`/api/posts/${post.id}`);
        if (response.ok) {
          const result = await response.json();
          if (result.code === 200 && result.data) {
            // Always update to ensure we have the latest data with replies loaded
            onUpdatePost(result.data);
            // Auto-expand all comment threads by default
            const allCommentIds = new Set<string>();
            const collectCommentIds = (comments: Comment[]) => {
              comments.forEach(comment => {
                if (comment.replies && comment.replies.length > 0) {
                  allCommentIds.add(comment.id);
                  collectCommentIds(comment.replies);
                }
              });
            };
            if (result.data.comments) {
              collectCommentIds(result.data.comments);
            }
            setExpandedComments(allCommentIds);
          }
        }
      } catch (error) {
        console.error("Failed to refresh post detail:", error);
      }
    };

    // Fetch post detail to ensure comments and replies are loaded
    fetchPostDetail();
  }, [post.id]); // Only fetch when post ID changes

  const handleLike = async () => {
    // 1. Toggle Logic
    const newIsLiked = !isLiked;
    const newLikeCount = newIsLiked ? post.likes + 1 : Math.max(0, post.likes - 1);
    
    // 2. Optimistic UI update
    setIsLiked(newIsLiked);
    onUpdatePost({
      ...post,
      likes: newLikeCount
    });

    // 3. Call Backend
    const endpoint = newIsLiked ? 'like' : 'unlike';
    try {
      await fetch(`/api/posts/${post.id}/${endpoint}`, {
        method: 'POST'
      });
      // Backend returns a Result object, assume success
    } catch (error) {
      console.error(`Failed to sync ${endpoint} with backend`, error);
      // In a real app, revert state here on failure
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    // 1. Optimistic UI update (author will be set by backend based on IP)
    const tempComment: Comment = {
      id: Date.now().toString(),
      author: 'Loading...', // Will be updated after backend response
      content: newComment,
      date: new Date().toISOString().split('T')[0]
    };
    
    onUpdatePost({
      ...post,
      comments: [...post.comments, tempComment]
    });
    setNewComment('');

    // 2. Call Backend (backend will get IP and assign username, or "The Developer" if logged in)
    try {
      // Get token from localStorage for authentication
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          content: tempComment.content
        })
      });
      
      if (response.ok) {
        // Refresh post to get the actual comment with correct username
        const postResponse = await fetch(`/api/posts/${post.id}`);
        if (postResponse.ok) {
          const postResult = await postResponse.json();
          if (postResult.code === 200) {
            onUpdatePost(postResult.data);
          }
        }
      } else {
        // Remove optimistic comment on error
        onUpdatePost({
          ...post,
          comments: post.comments.filter(c => c.id !== tempComment.id)
        });
        alert("Failed to post comment");
      }
    } catch (error) {
      console.error("Failed to post comment to backend", error);
      // Remove optimistic comment on error
      onUpdatePost({
        ...post,
        comments: post.comments.filter(c => c.id !== tempComment.id)
      });
    }
  };

  const handleDeleteComment = async (commentId: string | number) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    // Optimistic UI update - remove from top-level or replies
    const updatedPost = { ...post };
    updatedPost.comments = post.comments.map(comment => {
      if (comment.id === commentId) {
        return null; // Mark for removal
      }
      // Check replies
      if (comment.replies) {
        const updatedReplies = comment.replies.filter(reply => reply.id !== commentId);
        return { ...comment, replies: updatedReplies };
      }
      return comment;
    }).filter(Boolean) as Comment[];

    onUpdatePost(updatedPost);

    try {
      const response = await fetch(`/api/posts/${post.id}/comments/${commentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        // Restore comment on error
        onUpdatePost(post);
        const result = await response.json();
        alert(result.message || 'Failed to delete comment');
      } else {
        // Refresh post to ensure consistency
        const postResponse = await fetch(`/api/posts/${post.id}`);
        if (postResponse.ok) {
          const postResult = await postResponse.json();
          if (postResult.code === 200) {
            onUpdatePost(postResult.data);
          }
        }
      }
    } catch (error) {
      console.error("Failed to delete comment", error);
      // Restore comment on error
      onUpdatePost(post);
      alert("Failed to delete comment");
    }
  };

  const handleAddReply = async (parentCommentId: string | number) => {
    const replyText = replyContent[parentCommentId];
    if (!replyText || !replyText.trim()) return;

    // Optimistic UI update
    const tempReply: Comment = {
      id: Date.now().toString(),
      author: 'Loading...',
      content: replyText,
      date: new Date().toISOString().split('T')[0],
      parentId: typeof parentCommentId === 'string' ? parseInt(parentCommentId) : parentCommentId
    };

    const updatedPost = { ...post };
    updatedPost.comments = post.comments.map(comment => {
      if (comment.id === parentCommentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), tempReply]
        };
      }
      return comment;
    });
    onUpdatePost(updatedPost);
    setReplyContent({ ...replyContent, [parentCommentId]: '' });
    setReplyingTo(null);

    try {
      // Get token from localStorage for authentication
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/posts/${post.id}/comments/${parentCommentId}/reply`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          content: replyText
        })
      });

      if (response.ok) {
        // Refresh post to get the actual reply with correct username
        const postResponse = await fetch(`/api/posts/${post.id}`);
        if (postResponse.ok) {
          const postResult = await postResponse.json();
          if (postResult.code === 200) {
            onUpdatePost(postResult.data);
          }
        }
      } else {
        // Remove optimistic reply on error
        onUpdatePost({
          ...post,
          comments: post.comments.map(comment => {
            if (comment.id === parentCommentId) {
              return {
                ...comment,
                replies: (comment.replies || []).filter(r => r.id !== tempReply.id)
              };
            }
            return comment;
          })
        });
        alert("Failed to post reply");
      }
    } catch (error) {
      console.error("Failed to post reply", error);
      // Remove optimistic reply on error
      onUpdatePost({
        ...post,
        comments: post.comments.map(comment => {
          if (comment.id === parentCommentId) {
            return {
              ...comment,
              replies: (comment.replies || []).filter(r => r.id !== tempReply.id)
            };
          }
          return comment;
        })
      });
    }
  };

  // Recursive component for rendering nested replies
  const RenderReplies: React.FC<{
    replies: Comment[];
    parentAuthor: string;
    postId: string;
    onUpdatePost: (post: BlogPost) => void;
    onDeleteComment: (id: string | number) => void;
    replyingTo: string | null;
    setReplyingTo: (id: string | null) => void;
    replyContent: { [key: string]: string };
    setReplyContent: (content: { [key: string]: string }) => void;
    onAddReply: (parentId: string | number) => void;
    depth: number;
    expandedComments: Set<string>;
    setExpandedComments: React.Dispatch<React.SetStateAction<Set<string>>>;
    aboutProfile?: { avatarUrl: string };
  }> = ({ replies, parentAuthor, postId, onUpdatePost, onDeleteComment, replyingTo, setReplyingTo, replyContent, setReplyContent, onAddReply, depth, expandedComments, setExpandedComments, aboutProfile }) => {
    const maxDepth = 5; // Limit nesting depth to prevent UI issues
    if (depth >= maxDepth) {
      return null;
    }

    const marginLeft = 14 + depth * 4;

    return (
      <div style={{ marginLeft: `${marginLeft * 4}px` }} className="space-y-3 border-l-2 border-anime-accent/20 pl-4">
        {replies.map(reply => (
          <div key={reply.id} className="space-y-3">
            <div className="flex gap-3 animate-fade-in group/reply">
              {reply.author === "The Developer" && aboutProfile?.avatarUrl ? (
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 border-anime-accent">
                  <img 
                    src={aboutProfile.avatarUrl} 
                    alt="The Developer" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to default icon if image fails to load
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="w-8 h-8 rounded-full bg-gradient-to-br from-anime-secondary to-anime-accent flex items-center justify-center text-white shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>';
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-anime-secondary to-anime-accent flex items-center justify-center text-white shrink-0">
                  <User size={16} />
                </div>
              )}
              <div className="flex-grow">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-anime-text text-sm">{reply.author}</span>
                    <span className="text-xs text-anime-text/40">↳ replying to {parentAuthor}</span>
                    {reply.replies && reply.replies.length > 0 && (
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedComments);
                          if (newExpanded.has(reply.id)) {
                            newExpanded.delete(reply.id);
                          } else {
                            newExpanded.add(reply.id);
                          }
                          setExpandedComments(newExpanded);
                        }}
                        className="flex items-center gap-1 px-1.5 py-0.5 text-xs text-anime-text/50 hover:text-anime-accent transition-colors rounded hover:bg-anime-accent/10"
                        title={expandedComments.has(reply.id) ? "Collapse replies" : "Expand replies"}
                      >
                        {expandedComments.has(reply.id) ? (
                          <>
                            <ChevronUp size={10} />
                            <span>{reply.replies.length}</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown size={10} />
                            <span>{reply.replies.length}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-anime-text/50">{reply.date}</span>
                    <button
                      onClick={() => setReplyingTo(replyingTo === reply.id ? null : reply.id)}
                      className="opacity-0 group-hover/reply:opacity-100 transition-opacity p-1.5 hover:bg-anime-accent/20 rounded-lg text-anime-accent hover:text-anime-secondary"
                      title="Reply"
                    >
                      <Reply size={12} />
                    </button>
                    <button
                      onClick={() => onDeleteComment(reply.id)}
                      className="opacity-0 group-hover/reply:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-500"
                      title="Delete reply"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <p className="text-anime-text/80 text-sm bg-anime-bg/50 p-2 rounded-lg border border-anime-text/5">
                  {reply.content}
                </p>
                
                {/* Reply Input for nested replies */}
                {replyingTo === reply.id && (
                  <div className="mt-3 ml-4 space-y-2">
                    <textarea
                      value={replyContent[reply.id] || ''}
                      onChange={(e) => setReplyContent({ ...replyContent, [reply.id]: e.target.value })}
                      placeholder={`Reply to ${reply.author}...`}
                      className="w-full bg-anime-bg/80 border border-anime-text/20 rounded-xl p-3 pr-12 focus:ring-2 focus:ring-anime-accent focus:border-transparent outline-none resize-none h-20 text-sm text-anime-text placeholder-anime-text/40"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent({ ...replyContent, [reply.id]: '' });
                        }}
                        className="px-3 py-1.5 text-sm text-anime-text/60 hover:text-anime-text transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => onAddReply(reply.id)}
                        disabled={!replyContent[reply.id]?.trim()}
                        className="px-3 py-1.5 text-sm bg-anime-accent text-white rounded-lg hover:bg-anime-secondary disabled:bg-gray-300 transition-colors"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Recursively render nested replies */}
            {reply.replies && reply.replies.length > 0 && expandedComments.has(reply.id) && (
              <div className="mt-2 transition-all duration-300">
                <RenderReplies
                  replies={reply.replies}
                  parentAuthor={reply.author}
                  postId={postId}
                  onUpdatePost={onUpdatePost}
                  onDeleteComment={onDeleteComment}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  replyContent={replyContent}
                  setReplyContent={setReplyContent}
                  onAddReply={onAddReply}
                  depth={depth + 1}
                  expandedComments={expandedComments}
                  setExpandedComments={setExpandedComments}
                  aboutProfile={aboutProfile}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-anime-card backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden border border-anime-accent/20 animate-fade-in">
      <div className="h-64 sm:h-96 relative group">
        <img 
          src={post.imageUrl} 
          alt={post.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 bg-white/90 p-3 rounded-full text-anime-text shadow-lg hover:bg-anime-accent hover:text-white transition-all transform hover:scale-110"
        >
          <ArrowLeft size={24} />
        </button>
        
        {isLoggedIn && onEdit && (
          <button 
            onClick={() => onEdit(post)}
            className="absolute top-6 right-6 bg-anime-accent/90 p-3 rounded-full text-white shadow-lg hover:bg-white hover:text-anime-accent transition-all transform hover:scale-110"
            title="Edit Post"
          >
            <Edit size={24} />
          </button>
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 drop-shadow-md">{post.title}</h1>
        </div>
      </div>
      
      <div className="px-6 py-8 md:px-12 md:py-12 max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center gap-6 mb-8 text-sm text-anime-text/70 border-b border-anime-text/10 pb-6">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-anime-accent" />
              {post.date}
            </div>
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-anime-secondary" />
              {post.category}
            </div>
            <div className="ml-auto flex items-center gap-2">
               <button 
                 onClick={handleLike}
                 className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all duration-300 transform active:scale-95
                   ${isLiked 
                     ? 'bg-pink-100 text-pink-500 shadow-inner' 
                     : 'bg-gray-100 hover:bg-pink-50 text-gray-500 hover:text-pink-400'
                   }`}
               >
                 <Heart size={18} className={`transition-all ${isLiked ? "fill-current scale-110" : ""}`} />
                 <span className="font-bold">{post.likes} Likes</span>
               </button>
            </div>
          </div>

          <div className="prose prose-lg prose-headings:text-anime-text prose-p:text-anime-text/80 prose-strong:text-anime-accent prose-a:text-anime-secondary prose-code:text-anime-accent prose-pre:bg-anime-bg prose-pre:text-anime-text prose-img:rounded-xl prose-img:shadow-lg max-w-none leading-relaxed font-sans">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
            >
              {post.content}
            </ReactMarkdown>
          </div>
          
          <div className="mt-12 pt-8 border-t border-anime-text/10">
            <h3 className="font-bold text-anime-text mb-4">Related Tags</h3>
            <div className="flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <span key={tag} className="bg-anime-bg border border-anime-accent/30 text-anime-text px-3 py-1 rounded-full text-sm hover:bg-anime-accent hover:text-white transition-colors cursor-default">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-16 bg-anime-bg/50 p-6 rounded-2xl border border-anime-text/5">
             <h3 className="text-2xl font-bold text-anime-text mb-6 flex items-center gap-2">
               Comments <span className="text-anime-accent text-lg">({post.comments.length})</span>
             </h3>
             
             <div className="space-y-6 mb-8">
                {post.comments.length === 0 ? (
                  <p className="text-anime-text/50 italic text-center py-4">No comments yet. Be the first!</p>
                ) : (
                  post.comments.map(comment => (
                    <div key={comment.id} className="space-y-3">
                      {/* Main Comment */}
                      <div className="flex gap-4 animate-fade-in group">
                         {comment.author === "The Developer" && aboutProfile?.avatarUrl ? (
                           <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-anime-accent">
                             <img 
                               src={aboutProfile.avatarUrl} 
                               alt="The Developer" 
                               className="w-full h-full object-cover"
                               onError={(e) => {
                                 // Fallback to default icon if image fails to load
                                 e.currentTarget.style.display = 'none';
                                 const parent = e.currentTarget.parentElement;
                                 if (parent) {
                                   parent.innerHTML = '<div class="w-10 h-10 rounded-full bg-gradient-to-br from-anime-accent to-anime-secondary flex items-center justify-center text-white shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>';
                                 }
                               }}
                             />
                           </div>
                         ) : (
                           <div className="w-10 h-10 rounded-full bg-gradient-to-br from-anime-accent to-anime-secondary flex items-center justify-center text-white shrink-0">
                             <User size={20} />
                           </div>
                         )}
                         <div className="flex-grow">
                           <div className="flex items-center justify-between mb-1">
                             <div className="flex items-center gap-2">
                               <span className="font-bold text-anime-text">{comment.author}</span>
                               {comment.replies && comment.replies.length > 0 && (
                                 <button
                                   onClick={() => {
                                     const newExpanded = new Set(expandedComments);
                                     if (newExpanded.has(comment.id)) {
                                       newExpanded.delete(comment.id);
                                     } else {
                                       newExpanded.add(comment.id);
                                     }
                                     setExpandedComments(newExpanded);
                                   }}
                                   className="flex items-center gap-1 px-2 py-1 text-xs text-anime-text/60 hover:text-anime-accent transition-colors rounded-lg hover:bg-anime-accent/10"
                                   title={expandedComments.has(comment.id) ? "Collapse replies" : "Expand replies"}
                                 >
                                   {expandedComments.has(comment.id) ? (
                                     <>
                                       <ChevronUp size={14} />
                                       <span>Hide {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</span>
                                     </>
                                   ) : (
                                     <>
                                       <ChevronDown size={14} />
                                       <span>Show {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</span>
                                     </>
                                   )}
                                 </button>
                               )}
                             </div>
                             <div className="flex items-center gap-2">
                               <span className="text-xs text-anime-text/50">{comment.date}</span>
                               <button
                                 onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                 className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-anime-accent/20 rounded-lg text-anime-accent hover:text-anime-secondary"
                                 title="Reply"
                               >
                                 <Reply size={14} />
                               </button>
                               <button
                                 onClick={() => handleDeleteComment(comment.id)}
                                 className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-500"
                                 title="Delete comment"
                               >
                                 <Trash2 size={14} />
                               </button>
                             </div>
                           </div>
                           <p className="text-anime-text/80 text-sm bg-anime-bg/50 p-3 rounded-tr-xl rounded-bl-xl rounded-br-xl border border-anime-text/5">
                             {comment.content}
                           </p>
                           
                           {/* Reply Input */}
                           {replyingTo === comment.id && (
                             <div className="mt-3 ml-4 space-y-2">
                               <textarea
                                 value={replyContent[comment.id] || ''}
                                 onChange={(e) => setReplyContent({ ...replyContent, [comment.id]: e.target.value })}
                                 placeholder={`Reply to ${comment.author}...`}
                                 className="w-full bg-anime-bg/80 border border-anime-text/20 rounded-xl p-3 pr-12 focus:ring-2 focus:ring-anime-accent focus:border-transparent outline-none resize-none h-20 text-sm text-anime-text placeholder-anime-text/40"
                               />
                               <div className="flex gap-2 justify-end">
                                 <button
                                   onClick={() => {
                                     setReplyingTo(null);
                                     setReplyContent({ ...replyContent, [comment.id]: '' });
                                   }}
                                   className="px-3 py-1.5 text-sm text-anime-text/60 hover:text-anime-text transition-colors"
                                 >
                                   Cancel
                                 </button>
                                 <button
                                   onClick={() => handleAddReply(comment.id)}
                                   disabled={!replyContent[comment.id]?.trim()}
                                   className="px-3 py-1.5 text-sm bg-anime-accent text-white rounded-lg hover:bg-anime-secondary disabled:bg-gray-300 transition-colors"
                                 >
                                   Reply
                                 </button>
                               </div>
                             </div>
                           )}
                         </div>
                      </div>
                      
                      {/* Replies - Recursive rendering for nested replies */}
                      {comment.replies && comment.replies.length > 0 && expandedComments.has(comment.id) && (
                        <div className="mt-3 transition-all duration-300">
                          <RenderReplies
                            replies={comment.replies}
                            parentAuthor={comment.author}
                            postId={post.id}
                            onUpdatePost={onUpdatePost}
                            onDeleteComment={handleDeleteComment}
                            replyingTo={replyingTo}
                            setReplyingTo={setReplyingTo}
                            replyContent={replyContent}
                            setReplyContent={setReplyContent}
                            onAddReply={handleAddReply}
                            depth={0}
                            expandedComments={expandedComments}
                            setExpandedComments={setExpandedComments}
                            aboutProfile={aboutProfile}
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
             </div>

             <div className="flex gap-3 items-start">
               <div className="w-10 h-10 rounded-full bg-anime-text/10 flex items-center justify-center shrink-0">
                 <span className="text-xl">✍️</span>
               </div>
               <div className="flex-grow relative">
                 <textarea
                   value={newComment}
                   onChange={(e) => setNewComment(e.target.value)}
                   placeholder="Write a comment..."
                   className="w-full bg-anime-bg/80 border border-anime-text/20 rounded-xl p-3 pr-12 focus:ring-2 focus:ring-anime-accent focus:border-transparent outline-none resize-none h-24 text-sm text-anime-text placeholder-anime-text/40"
                 />
                 <button 
                   onClick={handleAddComment}
                   disabled={!newComment.trim()}
                   className="absolute bottom-3 right-3 p-2 bg-anime-accent text-white rounded-lg hover:bg-anime-secondary disabled:bg-gray-300 transition-colors"
                 >
                   <Send size={16} />
                 </button>
               </div>
             </div>
          </div>
      </div>
    </div>
  );
};

export default PostDetail;