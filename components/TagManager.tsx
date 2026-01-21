import React from 'react';
import { Tag, X } from 'lucide-react';

interface TagManagerProps {
  tags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  onDeleteTag: (tag: string) => void;
  isLoggedIn?: boolean;
}

const TagManager: React.FC<TagManagerProps> = ({ tags, selectedTag, onSelectTag, onDeleteTag, isLoggedIn }) => {
  return (
    <div className="bg-anime-card backdrop-blur-sm rounded-2xl p-6 border border-anime-accent/20 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-anime-text flex items-center gap-2">
          <Tag className="text-anime-accent" size={20} />
          Learning Tracks
        </h3>
      </div>

      <div className="max-h-60 overflow-y-auto p-2 bg-anime-bg/30 rounded-xl">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onSelectTag(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300
              ${selectedTag === null 
                ? 'bg-anime-accent text-white shadow-md' 
                : 'bg-anime-bg text-anime-text hover:bg-anime-text/10'
              }
            `}
          >
            All
          </button>
          {tags.map(tag => (
            <div 
              key={tag}
              className={`group flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-sm font-medium transition-all duration-300 border
                ${selectedTag === tag
                  ? 'bg-anime-accent text-white border-anime-accent shadow-md' 
                  : 'bg-anime-bg text-anime-text border-anime-text/10 hover:border-anime-accent/50'
                }
              `}
            >
              <span 
                onClick={() => onSelectTag(tag === selectedTag ? null : tag)}
                className="cursor-pointer max-w-[120px] truncate"
              >
                {tag}
              </span>
              
              {isLoggedIn && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteTag(tag); }}
                  className={`p-0.5 rounded-full hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity
                     ${selectedTag === tag ? 'text-white' : 'text-anime-text'}
                  `}
                  title="Delete Tag"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TagManager;