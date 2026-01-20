import React from 'react';
import { BlogPost } from '../types';
import { Calendar, ArrowRight, Heart, MessageSquare, Edit, Trash2 } from 'lucide-react';

interface PostCardProps {
  post: BlogPost;
  onClick: (post: BlogPost) => void;
  isLoggedIn?: boolean;
  onEdit?: (post: BlogPost) => void;
  onDelete?: (postId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onClick, isLoggedIn, onEdit, onDelete }) => {
  
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit(post);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && window.confirm(`Are you sure you want to delete "${post.title}"?`)) {
      onDelete(post.id);
    }
  };

  return (
    <div 
      className="group bg-anime-card backdrop-blur-sm rounded-2xl overflow-hidden border border-anime-accent/20 shadow-sm hover:shadow-xl hover:shadow-anime-accent/20 transition-all duration-300 hover:-translate-y-2 cursor-pointer flex flex-col h-full relative"
      onClick={() => onClick(post)}
    >
      <div className="relative h-48 overflow-hidden">
        <img 
          src={post.imageUrl} 
          alt={post.title} 
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute top-3 right-3 bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-anime-accent shadow-sm">
          {post.category}
        </div>
        
        {/* Admin Actions Overlay */}
        {isLoggedIn && (
          <div className="absolute top-3 left-3 flex gap-2">
            <button 
              onClick={handleEditClick}
              className="p-2 bg-blue-500/90 text-white rounded-full hover:bg-blue-600 transition-colors shadow-md hover:scale-105"
              title="Edit Post"
            >
              <Edit size={14} />
            </button>
            <button 
              onClick={handleDeleteClick}
              className="p-2 bg-red-500/90 text-white rounded-full hover:bg-red-600 transition-colors shadow-md hover:scale-105"
              title="Delete Post"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
      
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-center gap-2 text-xs text-anime-text/60 mb-2">
          <Calendar size={12} />
          <span>{post.date}</span>
        </div>
        
        <h3 className="text-xl font-bold text-anime-text mb-3 line-clamp-2 group-hover:text-anime-accent transition-colors">
          {post.title}
        </h3>
        
        <p className="text-anime-text/80 text-sm line-clamp-3 mb-4 flex-grow">
          {post.excerpt}
        </p>
        
        <div className="mt-auto pt-4 border-t border-anime-text/10 flex items-center justify-between">
          <div className="flex gap-2">
            <span className="flex items-center gap-1 text-xs text-anime-text/60">
                <Heart size={12} className="fill-anime-accent text-anime-accent" /> {post.likes}
            </span>
            <span className="flex items-center gap-1 text-xs text-anime-text/60">
                <MessageSquare size={12} className="text-anime-secondary" /> {post.comments.length}
            </span>
          </div>
          <button className="text-anime-accent hover:translate-x-1 transition-transform">
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostCard;