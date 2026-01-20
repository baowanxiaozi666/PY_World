import React, { useState } from 'react';
import { BlogPost, Comment } from '../types';
import { Clock, Tag, ArrowLeft, Heart, Send, User, Edit } from 'lucide-react';

interface PostDetailProps {
  post: BlogPost;
  onBack: () => void;
  onUpdatePost: (updatedPost: BlogPost) => void;
  onEdit?: (post: BlogPost) => void;
  isLoggedIn?: boolean;
}

const PostDetail: React.FC<PostDetailProps> = ({ post, onBack, onUpdatePost, onEdit, isLoggedIn }) => {
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);

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
    
    const commentAuthor = 'Guest User';
    
    // 1. Optimistic UI update
    const tempComment: Comment = {
      id: Date.now().toString(),
      author: commentAuthor, 
      content: newComment,
      date: new Date().toISOString().split('T')[0]
    };
    
    onUpdatePost({
      ...post,
      comments: [...post.comments, tempComment]
    });
    setNewComment('');

    // 2. Call Backend
    try {
      await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          author: commentAuthor,
          content: tempComment.content
        })
      });
      // Backend returns a Result object, but we assume success for optimistic UI
    } catch (error) {
      console.error("Failed to post comment to backend", error);
    }
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

          <div 
            className="prose prose-lg prose-headings:text-anime-text prose-p:text-anime-text/80 prose-strong:text-anime-accent max-w-none leading-relaxed font-sans"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
          
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
                    <div key={comment.id} className="flex gap-4 animate-fade-in">
                       <div className="w-10 h-10 rounded-full bg-gradient-to-br from-anime-accent to-anime-secondary flex items-center justify-center text-white shrink-0">
                         <User size={20} />
                       </div>
                       <div className="flex-grow">
                         <div className="flex items-center justify-between mb-1">
                           <span className="font-bold text-anime-text">{comment.author}</span>
                           <span className="text-xs text-anime-text/50">{comment.date}</span>
                         </div>
                         <p className="text-anime-text/80 text-sm bg-anime-bg/50 p-3 rounded-tr-xl rounded-bl-xl rounded-br-xl border border-anime-text/5">
                           {comment.content}
                         </p>
                       </div>
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