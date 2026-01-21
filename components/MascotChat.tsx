import React, { useState, useEffect, useRef } from 'react';
import { sendChatMessage } from '../services/chatService';
import { ChatMessage } from '../types';
import { MessageCircle, X, Send, Sparkles, Trash2, GripHorizontal } from 'lucide-react';

const MascotChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Initialize with a welcome message
  const initialMessage: ChatMessage = {
      id: 'welcome',
      role: 'model',
      text: "hi，我是阿尼亚，我负责守护这个界面",
      timestamp: Date.now()
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  // Drag and Resize State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 384, height: 600 }); // Default: w-80 sm:w-96 (320-384px), height includes header+input
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Load saved position and size from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatWindowState');
      if (saved) {
        try {
          const { position: savedPos, size: savedSize } = JSON.parse(saved);
          if (savedPos) setPosition(savedPos);
          if (savedSize) setSize(savedSize);
        } catch (e) {
          console.warn('Failed to load chat window state:', e);
        }
      } else {
        // Default position: bottom-right
        setPosition({ 
          x: window.innerWidth - 400, 
          y: window.innerHeight - 650 
        });
      }
    }
  }, []);

  // Save position and size to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      localStorage.setItem('chatWindowState', JSON.stringify({ position, size }));
    }
  }, [position, size, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isThinking]);

  const handleSend = async () => {
    if (!inputText.trim() || isThinking) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: Date.now()
    };

    // 1. Update UI with User Message immediately
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setIsThinking(true);

    // 2. Send to backend DeepSeek API
    // Pass the current messages (including the new user message) as history
    try {
      const responseText = await sendChatMessage(userMsg.text, updatedMessages);
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("Chat error", error);
      const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: "My connection to the server broke! (Network Error) 💥",
          timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleClearChat = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent closing the chat window
      if (window.confirm("Clear conversation history?")) {
          setMessages([initialMessage]);
      }
  };

  // Drag Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        const maxX = window.innerWidth - size.width;
        const maxY = window.innerHeight - size.height;
        setPosition({ 
          x: Math.max(0, Math.min(newX, maxX)), 
          y: Math.max(0, Math.min(newY, maxY)) 
        });
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        const newWidth = Math.max(320, Math.min(800, resizeStart.width + deltaX));
        const newHeight = Math.max(400, Math.min(window.innerHeight - 100, resizeStart.height + deltaY));
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none'; // Prevent text selection while dragging
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging, isResizing, dragOffset, resizeStart, size]);

  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || 
        (e.target as HTMLElement).closest('input') ||
        (e.target as HTMLElement).closest('textarea') ||
        (e.target as HTMLElement).closest('.resize-handle')) {
      return;
    }
    setIsDragging(true);
    setDragOffset({ 
      x: e.clientX - position.x, 
      y: e.clientY - position.y 
    });
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 flex items-center justify-center
          ${isOpen ? 'bg-anime-card text-anime-text rotate-90' : 'bg-gradient-to-r from-anime-accent to-anime-secondary text-white animate-bounce-slow'}
        `}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
      </button>

      <div 
        ref={chatWindowRef}
        className={`fixed bg-anime-card/95 backdrop-blur-md rounded-2xl shadow-2xl border border-anime-accent/20 z-40 overflow-hidden transition-all duration-300
          ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}
          ${isDragging ? 'cursor-move' : ''}
        `}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
        }}
      >
        {/* Drag Handle - Header Area */}
        <div 
          className="bg-gradient-to-r from-anime-accent to-anime-secondary p-4 flex items-center gap-3 cursor-move select-none"
          onMouseDown={handleDragStart}
        >
          <div className="w-10 h-10 bg-anime-card rounded-full flex items-center justify-center border-2 border-anime-accent overflow-hidden">
            <img 
              src="https://tse3-mm.cn.bing.net/th/id/OIP-C.dPl6H8p2V8oHvH4NxPHAbwHaEK?w=312&h=180&c=7&r=0&o=7&dpr=1.1&pid=1.7&rm=3" 
              alt="阿尼亚" 
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                // 如果图片加载失败，显示默认 emoji
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const fallback = document.createElement('span');
                  fallback.className = 'text-2xl';
                  fallback.textContent = '😊';
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
          <div className="flex-grow">
            <h3 className="text-white font-bold text-lg">阿尼亚</h3>
            <p className="text-white/80 text-xs flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Powered by DeepSeek
            </p>
          </div>
          
          <button 
             onClick={handleClearChat} 
             className="text-white/70 hover:text-white hover:bg-white/20 p-1.5 rounded-full transition-colors"
             title="Clear Chat"
          >
              <Trash2 size={18} />
          </button>
        </div>

        <div 
          className="overflow-y-auto p-4 space-y-4 bg-anime-bg/30"
          style={{ height: `${size.height - 180}px` }} // Subtract header (~60px) + input area (~120px)
        >
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm relative whitespace-pre-wrap leading-relaxed
                  ${msg.role === 'user' 
                    ? 'bg-anime-accent text-white rounded-br-none' 
                    : 'bg-anime-card text-anime-text rounded-bl-none border border-anime-accent/20'
                  }
                `}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start animate-fade-in">
               <div className="bg-anime-card px-4 py-3 rounded-2xl rounded-bl-none border border-anime-accent/20 text-anime-accent text-xs flex items-center gap-2">
                 <Sparkles size={14} className="animate-spin" /> Thinking...
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 bg-anime-card border-t border-anime-accent/20">
          <div className="flex items-center gap-2 bg-anime-bg rounded-full px-4 py-2 border border-anime-accent/20 focus-within:border-anime-accent focus-within:ring-2 focus-within:ring-anime-accent/20 transition-all">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything..."
              className="flex-grow bg-transparent outline-none text-sm text-anime-text placeholder-anime-text/40"
              disabled={isThinking}
            />
            <button 
              onClick={handleSend}
              disabled={!inputText.trim() || isThinking}
              className="text-anime-accent disabled:text-anime-text/30 hover:scale-110 transition-transform"
            >
              <Send size={18} />
            </button>
          </div>
        </div>

        {/* Resize Handle - Bottom Right Corner */}
        {isOpen && (
          <div
            className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize resize-handle opacity-0 hover:opacity-100 transition-opacity group"
            onMouseDown={handleResizeStart}
            style={{
              background: 'linear-gradient(135deg, transparent 0%, transparent 40%, var(--color-accent) 40%, var(--color-accent) 45%, transparent 45%, transparent 60%, var(--color-accent) 60%, var(--color-accent) 65%, transparent 65%)',
            }}
          >
            <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-anime-accent/50 group-hover:border-anime-accent"></div>
          </div>
        )}
      </div>
    </>
  );
};

export default MascotChat;