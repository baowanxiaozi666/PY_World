import React, { useState, useEffect, useRef } from 'react';
import { BlogPost } from '../types';
import { Save, Image as ImageIcon, Tag, Hash, Layout, Type, ArrowLeft, Upload, Eye, Edit3, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import CodeBlock from './CodeBlock';

interface PostEditorProps {
  initialPost?: BlogPost | null;
  onSave: (post: Partial<BlogPost>) => void;
  onCancel: () => void;
  availableTags?: string[]; // 已有的标签列表
  availableCategories?: string[]; // 已有的分类列表
}

const PostEditor: React.FC<PostEditorProps> = ({ 
  initialPost, 
  onSave, 
  onCancel, 
  availableTags = [], 
  availableCategories = [] 
}) => {
  const [title, setTitle] = useState(initialPost?.title || '');
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt || '');
  const [content, setContent] = useState(initialPost?.content || '');
  const [category, setCategory] = useState(initialPost?.category || '');
  const [imageUrl, setImageUrl] = useState(initialPost?.imageUrl || 'https://picsum.photos/800/600?random=' + Date.now());
  const [selectedTags, setSelectedTags] = useState<string[]>(initialPost?.tags || []);
  const [tagInput, setTagInput] = useState(''); // 用于输入新标签
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split'); // 编辑模式：编辑/预览/分屏
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showImageUrlDialog, setShowImageUrlDialog] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageAltInput, setImageAltInput] = useState('');
  const [showFontSizeDialog, setShowFontSizeDialog] = useState(false);
  const [customFontSize, setCustomFontSize] = useState('');
  const [showLineBreakDialog, setShowLineBreakDialog] = useState(false);
  const [contentHistory, setContentHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const isUndoRedoRef = useRef(false);

  // 初始化历史记录
  useEffect(() => {
    const initialContent = initialPost?.content || '';
    setContentHistory([initialContent]);
    setHistoryIndex(0);
  }, [initialPost?.id]); // 当帖子ID变化时重置历史

  // 内容变化时添加到历史记录（防抖，但排除撤销/重做操作）
  useEffect(() => {
    // 如果是撤销/重做操作，不添加到历史记录
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setContentHistory(prevHistory => {
        const currentContent = prevHistory[historyIndex];
        if (currentContent !== content) {
          // 如果当前不在历史记录的末尾，删除后面的记录
          const newHistory = prevHistory.slice(0, historyIndex + 1);
          newHistory.push(content);
          // 限制历史记录数量（最多50条）
          if (newHistory.length > 50) {
            newHistory.shift();
            setHistoryIndex(prev => newHistory.length - 1);
          } else {
            setHistoryIndex(prev => newHistory.length - 1);
          }
          return newHistory;
        }
        return prevHistory;
      });
    }, 500); // 500ms 防抖

    return () => clearTimeout(timer);
  }, [content, historyIndex]);
  
  // 合并已有标签和已选标签，去重
  const allAvailableTags = Array.from(new Set([...availableTags, ...selectedTags]));

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    
    // 检查是否与已选标签重复（不区分大小写）
    const isDuplicateInSelected = selectedTags.some(t => t.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicateInSelected) {
      alert(`Tag "${trimmed}" is already selected.`);
      setTagInput('');
      return;
    }
    
    // 检查是否与已有标签重复（不区分大小写）
    const isDuplicateInAvailable = availableTags.some(t => t.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicateInAvailable) {
      // 如果已有标签，直接使用已有的标签（保持大小写一致）
      const existingTag = availableTags.find(t => t.toLowerCase() === trimmed.toLowerCase());
      if (existingTag && !selectedTags.includes(existingTag)) {
        setSelectedTags([...selectedTags, existingTag]);
        setTagInput('');
      } else {
        alert(`Tag "${trimmed}" already exists. Please select it from the dropdown.`);
        setTagInput('');
      }
      return;
    }
    
    // 添加新标签
    setSelectedTags([...selectedTags, trimmed]);
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tagToRemove));
  };

  // 图片上传处理
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // 检查文件大小（限制为 10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size should be less than 10MB');
      return;
    }

    setIsUploadingImage(true);
    const token = localStorage.getItem('token');
    
    if (!token) {
      alert('Please login first');
      setIsUploadingImage(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        if (result.code === 200 && result.data) {
          // 在光标位置插入 Markdown 图片语法
          const imageMarkdown = `![${file.name}](${result.data})`;
          const textarea = contentTextareaRef.current;
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = content;
            const newText = text.substring(0, start) + imageMarkdown + text.substring(end);
            setContent(newText);
            // 恢复光标位置
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(start + imageMarkdown.length, start + imageMarkdown.length);
            }, 0);
          } else {
            // 如果没有找到 textarea，直接追加到内容末尾
            setContent(content + '\n\n' + imageMarkdown);
          }
        } else {
          alert(result.message || 'Upload failed');
        }
      } else {
        const result = await response.json();
        alert(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Network error during upload');
    } finally {
      setIsUploadingImage(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 插入 Markdown 语法辅助函数
  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = contentTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = content;
      const selectedText = text.substring(start, end);
      const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
      setContent(newText);
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + before.length + selectedText.length + after.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  // 插入外部图片链接
  const handleInsertImageUrl = () => {
    if (!imageUrlInput.trim()) {
      alert('Please enter an image URL');
      return;
    }
    const alt = imageAltInput.trim() || 'Image';
    const imageMarkdown = `![${alt}](${imageUrlInput.trim()})`;
    insertMarkdown(imageMarkdown);
    setShowImageUrlDialog(false);
    setImageUrlInput('');
    setImageAltInput('');
  };

  // 插入字体大小标签
  const handleInsertFontSize = (size: string) => {
    const textarea = contentTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = content;
      const selectedText = text.substring(start, end);
      
      // 如果没有选中文本，插入占位符
      const contentToWrap = selectedText || 'Your text here';
      const fontSizeHtml = `<span style="font-size: ${size};">${contentToWrap}</span>`;
      
      const newText = text.substring(0, start) + fontSizeHtml + text.substring(end);
      setContent(newText);
      setTimeout(() => {
        textarea.focus();
        if (selectedText) {
          // 如果有选中文本，光标移到标签末尾
          const newCursorPos = start + fontSizeHtml.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        } else {
          // 如果没有选中文本，选中占位符以便替换
          const placeholderStart = start + fontSizeHtml.indexOf('Your text here');
          const placeholderEnd = placeholderStart + 'Your text here'.length;
          textarea.setSelectionRange(placeholderStart, placeholderEnd);
        }
      }, 0);
    }
    setShowFontSizeDialog(false);
  };

  // 处理键盘快捷键（撤销/重做）
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Z 或 Cmd+Z: 撤销
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      setContentHistory(prevHistory => {
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          isUndoRedoRef.current = true;
          setContent(prevHistory[newIndex]);
        }
        return prevHistory;
      });
      return;
    }
    
    // Ctrl+Shift+Z 或 Cmd+Shift+Z: 重做
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      setContentHistory(prevHistory => {
        if (historyIndex < prevHistory.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          isUndoRedoRef.current = true;
          setContent(prevHistory[newIndex]);
        }
        return prevHistory;
      });
      return;
    }
    
    // Ctrl+Y: 重做（Windows/Linux）
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      setContentHistory(prevHistory => {
        if (historyIndex < prevHistory.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          isUndoRedoRef.current = true;
          setContent(prevHistory[newIndex]);
        }
        return prevHistory;
      });
      return;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // 合并已选标签和手动输入的标签（如果有）
    const finalTags = tagInput.trim() 
      ? [...selectedTags, tagInput.trim()].filter((t, i, arr) => arr.indexOf(t) === i)
      : selectedTags;

    const postData: Partial<BlogPost> = {
      id: initialPost?.id,
      title,
      excerpt,
      content,
      category,
      imageUrl,
      tags: finalTags
    };

    await onSave(postData);
    setIsLoading(false);
  };

  return (
    <div className="animate-fade-in" style={{ 
      width: '100vw', 
      maxWidth: '100vw',
      marginLeft: 'calc(-50vw + 50%)',
      marginRight: 'calc(-50vw + 50%)',
      height: 'calc(100vh - 60px)', 
      display: 'flex', 
      flexDirection: 'column',
      paddingLeft: '0.5vw',
      paddingRight: '0.5vw',
      boxSizing: 'border-box'
    }}>
      <div className="flex items-center justify-between mb-4 shrink-0">
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

      <div className="bg-anime-card backdrop-blur-md rounded-3xl p-3 border border-anime-accent/20 shadow-xl flex-1 overflow-hidden flex flex-col">
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="space-y-2 shrink-0" style={{ flexShrink: 0 }}>
            {/* Title */}
            <div className="space-y-2">
            <label className="text-sm font-bold text-anime-text/80 flex items-center gap-2">
              <Type size={16} /> Title
            </label>
            <input 
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-anime-card/60 border border-anime-text/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50 text-lg font-bold text-anime-text placeholder-anime-text/40"
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
                {/* 下拉选择已有分类 */}
                <div className="relative">
                  <select
                    value={availableCategories.includes(category) ? category : ''}
                    onChange={e => {
                      if (e.target.value) {
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full bg-anime-card/60 border border-anime-text/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50 appearance-none cursor-pointer pr-10 text-anime-text"
                  >
                    <option value="">-- Select Existing Category --</option>
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <Layout className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-anime-text/40" size={18} />
                </div>
                {/* 手动输入新分类或编辑当前分类 */}
                <div className="flex gap-2 items-center">
                  <div className="flex-grow relative">
                <input 
                  type="text" 
                  value={category}
                      onChange={e => {
                        const newCategory = e.target.value;
                        // 检查是否与已有分类重复（不区分大小写）
                        const isDuplicate = availableCategories.some(cat => cat.toLowerCase() === newCategory.toLowerCase());
                        if (isDuplicate && newCategory !== '') {
                          // 如果重复，使用已有分类的原始大小写
                          const existingCategory = availableCategories.find(cat => cat.toLowerCase() === newCategory.toLowerCase());
                          if (existingCategory) {
                            setCategory(existingCategory);
                            return;
                          }
                        }
                        setCategory(newCategory);
                      }}
                      onBlur={() => {
                        // 失去焦点时，如果输入的分类与已有分类重复（不区分大小写），使用已有分类
                        if (category) {
                          const existingCategory = availableCategories.find(cat => cat.toLowerCase() === category.toLowerCase());
                          if (existingCategory && existingCategory !== category) {
                            setCategory(existingCategory);
                          }
                        }
                      }}
                  className="w-full bg-anime-card/60 border border-anime-text/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50 text-anime-text placeholder-anime-text/40"
                      placeholder="Type category name..."
                  required
                />
                    {/* 删除分类按钮 */}
                    {category && (
                      <button
                        type="button"
                        onClick={() => setCategory('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-anime-accent/20 rounded-full transition-colors text-anime-text/60 hover:text-anime-accent"
                        title="Clear category"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {category && !availableCategories.some(cat => cat.toLowerCase() === category.toLowerCase()) && (
                    <div className="flex items-center px-2 text-xs text-anime-accent font-medium shrink-0">
                      New
                    </div>
                  )}
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-sm font-bold text-anime-text/80 flex items-center gap-2">
                  <Hash size={16} /> Tags
                </label>
                {/* 已选标签显示 */}
                <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 bg-anime-card/30 rounded-lg border border-anime-text/5">
                  {selectedTags.length === 0 ? (
                    <span className="text-anime-text/40 text-sm">No tags selected</span>
                  ) : (
                    selectedTags.map(tag => (
                      <span 
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-anime-accent/20 text-anime-accent rounded-full text-xs font-medium"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:bg-anime-accent/30 rounded-full p-0.5 transition-colors"
                          title="Remove tag"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))
                  )}
                </div>
                {/* 标签选择下拉 */}
                <div className="relative">
                  <select
                    value=""
                    onChange={e => {
                      const tag = e.target.value;
                      if (tag && !selectedTags.includes(tag)) {
                        setSelectedTags([...selectedTags, tag]);
                      }
                      e.target.value = ''; // 重置选择
                    }}
                    className="w-full bg-anime-card/60 border border-anime-text/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50 appearance-none cursor-pointer pr-10 text-anime-text"
                  >
                    <option value="">-- Select Existing Tag --</option>
                    {allAvailableTags.filter(t => !selectedTags.includes(t)).map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                  <Hash className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-anime-text/40" size={18} />
                </div>
                {/* 直接输入新标签（按 Enter 或失去焦点时自动添加） */}
                <div className="flex gap-2">
                <input 
                  type="text" 
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(tagInput);
                      }
                    }}
                    onBlur={() => {
                      // 失去焦点时，如果有内容且不在已选列表中，自动添加
                      if (tagInput.trim() && !selectedTags.some(t => t.toLowerCase() === tagInput.trim().toLowerCase())) {
                        handleAddTag(tagInput);
                      }
                    }}
                    className="flex-grow bg-anime-card/60 border border-anime-text/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50 text-anime-text placeholder-anime-text/40"
                    placeholder="Type tag name and press Enter or click outside..."
                  />
                  {tagInput.trim() && 
                   !selectedTags.some(t => t.toLowerCase() === tagInput.trim().toLowerCase()) &&
                   !availableTags.some(t => t.toLowerCase() === tagInput.trim().toLowerCase()) && (
                    <div className="flex items-center px-2 text-xs text-anime-accent font-medium">
                      New
                    </div>
                  )}
                </div>
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
                  className="flex-grow bg-anime-card/60 border border-anime-text/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50 text-sm font-mono text-anime-text placeholder-anime-text/40"
                  placeholder="https://..."
                />
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-anime-text/10 shrink-0 bg-anime-card">
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
               className="w-full bg-anime-card/60 border border-anime-text/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50 min-h-[80px] resize-none text-anime-text placeholder-anime-text/40"
               placeholder="A brief summary shown on the card..."
               required
             />
            </div>
          </div>

          {/* Content - Markdown Editor */}
          <div className="flex-1 flex flex-col min-h-0" style={{ minHeight: '40vh' }}>
             <div className="flex items-center justify-between mb-2 shrink-0">
             <label className="text-sm font-bold text-anime-text/80 flex items-center gap-2">
                 <Layout size={16} /> Content (Markdown Supported)
               </label>
               <div className="flex items-center gap-2">
                 {/* 视图模式切换 */}
                 <div className="flex bg-anime-card/40 rounded-lg p-1 border border-anime-text/10">
                   <button
                     type="button"
                     onClick={() => setViewMode('edit')}
                     className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                       viewMode === 'edit' 
                         ? 'bg-anime-accent text-white' 
                         : 'text-anime-text/60 hover:text-anime-text'
                     }`}
                   >
                     <Edit3 size={14} className="inline mr-1" /> Edit
                   </button>
                   <button
                     type="button"
                     onClick={() => setViewMode('preview')}
                     className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                       viewMode === 'preview' 
                         ? 'bg-anime-accent text-white' 
                         : 'text-anime-text/60 hover:text-anime-text'
                     }`}
                   >
                     <Eye size={14} className="inline mr-1" /> Preview
                   </button>
                   <button
                     type="button"
                     onClick={() => setViewMode('split')}
                     className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                       viewMode === 'split' 
                         ? 'bg-anime-accent text-white' 
                         : 'text-anime-text/60 hover:text-anime-text'
                     }`}
                   >
                     Split
                   </button>
                 </div>
                 {/* 图片上传按钮 */}
                 <input
                   ref={fileInputRef}
                   type="file"
                   accept="image/*"
                   onChange={handleImageUpload}
                   className="hidden"
                 />
                 <button
                   type="button"
                   onClick={() => fileInputRef.current?.click()}
                   disabled={isUploadingImage}
                   className="px-3 py-1.5 bg-anime-secondary/20 text-anime-secondary rounded-lg hover:bg-anime-secondary/30 transition-colors text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                 >
                   <Upload size={14} />
                   {isUploadingImage ? 'Uploading...' : 'Upload Image'}
                 </button>
               </div>
             </div>

             {/* Markdown 工具栏 */}
             <div className="flex flex-wrap gap-1 p-2 bg-anime-card/30 rounded-lg border border-anime-text/5">
               <button
                 type="button"
                 onClick={() => insertMarkdown('**', '**')}
                 className="px-2 py-1 text-xs bg-anime-card/60 hover:bg-anime-card/80 rounded text-anime-text"
                 title="Bold"
               >
                 <strong>B</strong>
               </button>
               <button
                 type="button"
                 onClick={() => insertMarkdown('*', '*')}
                 className="px-2 py-1 text-xs bg-anime-card/60 hover:bg-anime-card/80 rounded text-anime-text"
                 title="Italic"
               >
                 <em>I</em>
               </button>
               <button
                 type="button"
                 onClick={() => insertMarkdown('`', '`')}
                 className="px-2 py-1 text-xs bg-white/60 hover:bg-white/80 rounded text-anime-text font-mono"
                 title="Code"
               >
                 {'</>'}
               </button>
               <button
                 type="button"
                 onClick={() => insertMarkdown('```\n', '\n```')}
                 className="px-2 py-1 text-xs bg-white/60 hover:bg-white/80 rounded text-anime-text font-mono"
                 title="Code Block"
               >
                 {'{ }'}
               </button>
               <button
                 type="button"
                 onClick={() => insertMarkdown('- ')}
                 className="px-2 py-1 text-xs bg-anime-card/60 hover:bg-anime-card/80 rounded text-anime-text"
                 title="List"
               >
                 •
               </button>
               <button
                 type="button"
                 onClick={() => insertMarkdown('1. ')}
                 className="px-2 py-1 text-xs bg-anime-card/60 hover:bg-anime-card/80 rounded text-anime-text"
                 title="Numbered List"
               >
                 1.
               </button>
               <button
                 type="button"
                 onClick={() => insertMarkdown('> ')}
                 className="px-2 py-1 text-xs bg-anime-card/60 hover:bg-anime-card/80 rounded text-anime-text"
                 title="Quote"
               >
                 "
               </button>
               <button
                 type="button"
                 onClick={() => insertMarkdown('[', '](url)')}
                 className="px-2 py-1 text-xs bg-anime-card/60 hover:bg-anime-card/80 rounded text-anime-text"
                 title="Link"
               >
                 🔗
               </button>
               <button
                 type="button"
                 onClick={() => setShowImageUrlDialog(true)}
                 className="px-2 py-1 text-xs bg-anime-card/60 hover:bg-anime-card/80 rounded text-anime-text"
                 title="Insert Image URL"
               >
                 🖼️
               </button>
               <button
                 type="button"
                 onClick={() => setShowFontSizeDialog(true)}
                 className="px-2 py-1 text-xs bg-white/60 hover:bg-white/80 rounded text-anime-text font-bold"
                 title="Font Size"
               >
                 A+
               </button>
               <button
                 type="button"
                 onClick={() => setShowLineBreakDialog(true)}
                 className="px-2 py-1 text-xs bg-anime-card/60 hover:bg-anime-card/80 rounded text-anime-text"
                 title="Insert Line Break"
               >
                 ⏎
               </button>
             </div>

             {/* 换行选择对话框 */}
             {showLineBreakDialog && (
               <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLineBreakDialog(false)}>
                 <div className="bg-anime-card rounded-2xl p-6 max-w-md w-full mx-4 border border-anime-accent/20 shadow-xl" onClick={(e) => e.stopPropagation()}>
                   <h3 className="text-lg font-bold text-anime-text mb-4">Insert Line Break</h3>
                   <p className="text-sm text-anime-text/60 mb-4">Choose the type of line break you want to insert</p>
                   <div className="space-y-3">
                     <button
                       type="button"
                       onClick={() => {
                         const textarea = contentTextareaRef.current;
                         if (textarea) {
                           const start = textarea.selectionStart;
                           const end = textarea.selectionEnd;
                           const text = content;
                           // Markdown 软换行：两个空格 + 换行
                           const lineBreak = '  \n';
                           const newText = text.substring(0, start) + lineBreak + text.substring(end);
                           setContent(newText);
                           setTimeout(() => {
                             textarea.focus();
                             const newCursorPos = start + lineBreak.length;
                             textarea.setSelectionRange(newCursorPos, newCursorPos);
                           }, 0);
                         }
                         setShowLineBreakDialog(false);
                       }}
                       className="w-full px-4 py-3 bg-anime-card/60 hover:bg-anime-accent/20 rounded-xl transition-colors text-left text-anime-text"
                     >
                       <div className="font-medium mb-1">Soft Line Break (Markdown)</div>
                       <div className="text-xs text-anime-text/60">Two spaces + Enter - Creates a line break within the same paragraph</div>
                       <div className="text-xs font-mono text-anime-text/40 mt-1">Example: "Line 1  \nLine 2"</div>
                     </button>
                     <button
                       type="button"
                       onClick={() => {
                         const textarea = contentTextareaRef.current;
                         if (textarea) {
                           const start = textarea.selectionStart;
                           const end = textarea.selectionEnd;
                           const text = content;
                           // HTML 硬换行
                           const lineBreak = '<br>';
                           const newText = text.substring(0, start) + lineBreak + text.substring(end);
                           setContent(newText);
                           setTimeout(() => {
                             textarea.focus();
                             const newCursorPos = start + lineBreak.length;
                             textarea.setSelectionRange(newCursorPos, newCursorPos);
                           }, 0);
                         }
                         setShowLineBreakDialog(false);
                       }}
                       className="w-full px-4 py-3 bg-anime-card/60 hover:bg-anime-accent/20 rounded-xl transition-colors text-left text-anime-text"
                     >
                       <div className="font-medium mb-1">Hard Line Break (HTML)</div>
                       <div className="text-xs text-anime-text/60">HTML &lt;br&gt; tag - Forces a line break</div>
                       <div className="text-xs font-mono text-anime-text/40 mt-1">Example: "Line 1&lt;br&gt;Line 2"</div>
                     </button>
                     <button
                       type="button"
                       onClick={() => {
                         const textarea = contentTextareaRef.current;
                         if (textarea) {
                           const start = textarea.selectionStart;
                           const end = textarea.selectionEnd;
                           const text = content;
                           // 新段落：两个换行
                           const lineBreak = '\n\n';
                           const newText = text.substring(0, start) + lineBreak + text.substring(end);
                           setContent(newText);
                           setTimeout(() => {
                             textarea.focus();
                             const newCursorPos = start + lineBreak.length;
                             textarea.setSelectionRange(newCursorPos, newCursorPos);
                           }, 0);
                         }
                         setShowLineBreakDialog(false);
                       }}
                       className="w-full px-4 py-3 bg-anime-card/60 hover:bg-anime-accent/20 rounded-xl transition-colors text-left text-anime-text"
                     >
                       <div className="font-medium mb-1">New Paragraph</div>
                       <div className="text-xs text-anime-text/60">Two line breaks - Creates a new paragraph</div>
                       <div className="text-xs font-mono text-anime-text/40 mt-1">Example: "Paragraph 1\n\nParagraph 2"</div>
                     </button>
                   </div>
                   <div className="mt-4 flex justify-end">
                     <button
                       type="button"
                       onClick={() => setShowLineBreakDialog(false)}
                       className="px-4 py-2 text-anime-text hover:bg-anime-card/40 rounded-lg transition-colors"
                     >
                       Cancel
                     </button>
                   </div>
                 </div>
               </div>
             )}

             {/* 字体大小选择对话框 */}
             {showFontSizeDialog && (
               <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowFontSizeDialog(false)}>
                 <div className="bg-anime-card rounded-2xl p-6 max-w-md w-full mx-4 border border-anime-accent/20 shadow-xl" onClick={(e) => e.stopPropagation()}>
                   <h3 className="text-lg font-bold text-anime-text mb-4">Select Font Size</h3>
                   <p className="text-sm text-anime-text/60 mb-4">Select text first, or insert placeholder text</p>
                   <div className="grid grid-cols-3 gap-3">
                     {[
                       { label: 'Small', size: '0.875rem' },
                       { label: 'Normal', size: '1rem' },
                       { label: 'Large', size: '1.25rem' },
                       { label: 'XL', size: '1.5rem' },
                       { label: '2XL', size: '2rem' },
                       { label: '3XL', size: '2.5rem' },
                     ].map(({ label, size }) => (
                       <button
                         key={size}
                         type="button"
                         onClick={() => handleInsertFontSize(size)}
                         className="px-4 py-3 bg-anime-card/60 hover:bg-anime-accent/20 rounded-xl transition-colors text-anime-text font-medium"
                         style={{ fontSize: size }}
                       >
                         {label}
                       </button>
                     ))}
                   </div>
                   <div className="mt-4 pt-4 border-t border-anime-text/10">
                     <p className="text-xs text-anime-text/50 mb-2">Or use custom size:</p>
                     <div className="flex gap-2">
                       <input
                         type="text"
                         value={customFontSize}
                         onChange={(e) => setCustomFontSize(e.target.value)}
                         placeholder="e.g., 18px, 1.2em"
                         className="flex-grow bg-anime-card/60 border border-anime-text/10 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-anime-accent/50 text-sm text-anime-text placeholder-anime-text/40"
                         onKeyDown={(e) => {
                           if (e.key === 'Enter') {
                             if (customFontSize.trim()) {
                               handleInsertFontSize(customFontSize.trim());
                               setCustomFontSize('');
                             }
                           }
                           if (e.key === 'Escape') {
                             setShowFontSizeDialog(false);
                             setCustomFontSize('');
                           }
                         }}
                       />
                       <button
                         type="button"
                         onClick={() => {
                           if (customFontSize.trim()) {
                             handleInsertFontSize(customFontSize.trim());
                             setCustomFontSize('');
                           }
                         }}
                         className="px-4 py-2 bg-anime-accent text-white rounded-lg hover:bg-anime-secondary transition-colors text-sm"
                       >
                         Apply
                       </button>
                     </div>
                   </div>
                   <div className="mt-4 flex justify-end">
                     <button
                       type="button"
                       onClick={() => {
                         setShowFontSizeDialog(false);
                         setCustomFontSize('');
                       }}
                       className="px-4 py-2 text-anime-text hover:bg-anime-card/40 rounded-lg transition-colors"
                     >
                       Cancel
                     </button>
                   </div>
                 </div>
               </div>
             )}

             {/* 外部图片链接输入对话框 */}
             {showImageUrlDialog && (
               <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowImageUrlDialog(false)}>
                 <div className="bg-anime-card rounded-2xl p-6 max-w-md w-full mx-4 border border-anime-accent/20 shadow-xl" onClick={(e) => e.stopPropagation()}>
                   <h3 className="text-lg font-bold text-anime-text mb-4">Insert Image URL</h3>
                   <div className="space-y-4">
                     <div>
                       <label className="block text-sm font-medium text-anime-text/80 mb-2">
                         Image URL <span className="text-red-400">*</span>
                       </label>
                       <input
                         type="url"
                         value={imageUrlInput}
                         onChange={(e) => setImageUrlInput(e.target.value)}
                         placeholder="https://example.com/image.jpg"
                         className="w-full bg-anime-card/60 border border-anime-text/10 rounded-xl py-2 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50 text-anime-text placeholder-anime-text/40"
                         autoFocus
                         onKeyDown={(e) => {
                           if (e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault();
                             handleInsertImageUrl();
                           }
                           if (e.key === 'Escape') {
                             setShowImageUrlDialog(false);
                             setImageUrlInput('');
                             setImageAltInput('');
                           }
                         }}
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-anime-text/80 mb-2">
                         Alt Text (optional)
             </label>
                       <input
                         type="text"
                         value={imageAltInput}
                         onChange={(e) => setImageAltInput(e.target.value)}
                         placeholder="Image description"
                         className="w-full bg-anime-card/60 border border-anime-text/10 rounded-xl py-2 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50 text-anime-text placeholder-anime-text/40"
                         onKeyDown={(e) => {
                           if (e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault();
                             handleInsertImageUrl();
                           }
                           if (e.key === 'Escape') {
                             setShowImageUrlDialog(false);
                             setImageUrlInput('');
                             setImageAltInput('');
                           }
                         }}
                       />
                     </div>
                     <div className="flex gap-3 justify-end">
                       <button
                         type="button"
                         onClick={() => {
                           setShowImageUrlDialog(false);
                           setImageUrlInput('');
                           setImageAltInput('');
                         }}
                         className="px-4 py-2 text-anime-text hover:bg-anime-card/40 rounded-lg transition-colors"
                       >
                         Cancel
                       </button>
                       <button
                         type="button"
                         onClick={handleInsertImageUrl}
                         className="px-4 py-2 bg-anime-accent text-white rounded-lg hover:bg-anime-secondary transition-colors"
                       >
                         Insert
                       </button>
                     </div>
                   </div>
                 </div>
               </div>
             )}

             {/* 编辑器/预览区域 - 各占整个屏幕的一半 */}
             <div 
               className={`flex gap-4 flex-1 ${viewMode === 'split' ? 'flex-row' : 'flex-col'}`} 
               style={{ 
                 minHeight: 0
               }}
             >
               {/* 编辑区域 */}
               {(viewMode === 'edit' || viewMode === 'split') && (
                 <div 
                   className={`space-y-2 ${viewMode === 'split' ? 'flex-1 w-1/2' : 'w-full'}`} 
                   style={{ 
                     height: viewMode === 'split' ? '100%' : 'auto',
                     display: 'flex',
                     flexDirection: 'column'
                   }}
                 >
                   <div className="text-xs text-anime-text/60 mb-2 font-medium shrink-0">Editor</div>
                   <textarea 
                     ref={contentTextareaRef}
                     name="content"
                     value={content}
                     onChange={e => setContent(e.target.value)}
                     onKeyDown={handleKeyDown}
                     className="w-full flex-1 bg-anime-card/60 border border-anime-text/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-anime-accent/50 font-mono text-sm leading-relaxed resize-none text-anime-text placeholder-anime-text/40 whitespace-pre"
                     style={{ 
                       tabSize: 2,
                       fontFamily: 'monospace',
                       whiteSpace: 'pre',
                       wordWrap: 'normal',
                       overflowWrap: 'normal',
                       minHeight: viewMode === 'split' ? '0' : '400px'
                     }}
                     placeholder="# Title&#10;&#10;Write your story in Markdown...&#10;&#10;- Use **bold** for emphasis&#10;- Use ![alt](url) for images&#10;- Use `code` for inline code&#10;&#10;Tip: Press Enter to create a new line, Ctrl+Z to undo"
                     required
                   />
                 </div>
               )}

               {/* 预览区域 */}
               {(viewMode === 'preview' || viewMode === 'split') && (
                 <div 
                   className={`space-y-2 ${viewMode === 'split' ? 'flex-1 w-1/2' : 'w-full'}`} 
                   style={{ 
                     height: viewMode === 'split' ? '100%' : 'auto',
                     display: 'flex',
                     flexDirection: 'column'
                   }}
                 >
                   <div className="text-xs text-anime-text/60 mb-2 font-medium shrink-0">Preview</div>
                   <div 
                     className="bg-anime-card/60 border border-anime-text/10 rounded-xl py-3 px-4 overflow-y-auto text-anime-text flex-1" 
                     style={{ minHeight: viewMode === 'split' ? '0' : '400px' }}
                   >
                     {content ? (
                       <div className="prose prose-sm max-w-none prose-headings:text-anime-text prose-p:text-anime-text/80 prose-strong:text-anime-accent prose-a:text-anime-secondary prose-code:text-anime-accent prose-pre:bg-anime-bg prose-pre:text-anime-text">
                         <ReactMarkdown
                           remarkPlugins={[remarkGfm]}
                           rehypePlugins={[rehypeRaw]}
                           components={{
                             code({ node, inline, className, children, ...props }: any) {
                               return (
                                 <CodeBlock
                                   inline={inline}
                                   className={className}
                                   {...props}
                                 >
                                   {children}
                                 </CodeBlock>
                               );
                             },
                           }}
                         >
                           {content}
                         </ReactMarkdown>
                       </div>
                     ) : (
                       <p className="text-anime-text/40 text-sm">Preview will appear here...</p>
                     )}
                   </div>
                 </div>
               )}
             </div>
             <p className="text-xs text-anime-text/50 shrink-0 mt-2">
                       Tip: Use Markdown syntax for formatting. Click "Upload Image" to insert images, or use <code className="bg-anime-card/40 px-1 rounded text-anime-text">![alt](url)</code> syntax.
             </p>
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