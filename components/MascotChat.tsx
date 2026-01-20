import React, { useState, useEffect, useRef } from 'react';
import { generateMascotResponse } from '../services/geminiService';
import { ChatMessage } from '../types';
import { MessageCircle, X, Send, Sparkles, Trash2 } from 'lucide-react';

const MascotChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Initialize with a welcome message
  const initialMessage: ChatMessage = {
      id: 'welcome',
      role: 'model',
      text: "Hello! I'm Sakura-chan! 🌸 Welcome to the blog. Ask me anything about code or anime! ✨",
      timestamp: Date.now()
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    // 2. Prepare history for backend
    // IMPORTANT: DeepSeek needs context. We pass the *current* state of messages + the new user message
    // Note: 'messages' state in this scope is the old one due to closure, so we use updatedMessages
    const history = updatedMessages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    try {
      const responseText = await generateMascotResponse(userMsg.text, history);
      
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

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 flex items-center justify-center
          ${isOpen ? 'bg-gray-200 text-gray-600 rotate-90' : 'bg-gradient-to-r from-anime-pink to-anime-purple text-white animate-bounce-slow'}
        `}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
      </button>

      <div 
        className={`fixed bottom-24 right-6 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/50 z-40 overflow-hidden transition-all duration-300 origin-bottom-right
          ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}
        `}
      >
        <div className="bg-gradient-to-r from-anime-pink to-anime-purple p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-anime-pink overflow-hidden">
            <span className="text-2xl">👩🏻‍🎤</span>
          </div>
          <div className="flex-grow">
            <h3 className="text-white font-bold text-lg">Sakura-chan AI</h3>
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

        <div className="h-80 overflow-y-auto p-4 space-y-4 bg-anime-light/30">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm relative whitespace-pre-wrap leading-relaxed
                  ${msg.role === 'user' 
                    ? 'bg-anime-blue text-white rounded-br-none' 
                    : 'bg-white text-gray-700 rounded-bl-none border border-anime-pink/20'
                  }
                `}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start animate-fade-in">
               <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none border border-anime-pink/20 text-anime-pink text-xs flex items-center gap-2">
                 <Sparkles size={14} className="animate-spin" /> Thinking...
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 bg-white border-t border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50 rounded-full px-4 py-2 border border-gray-200 focus-within:border-anime-pink focus-within:ring-2 focus-within:ring-anime-pink/20 transition-all">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything..."
              className="flex-grow bg-transparent outline-none text-sm text-gray-700"
              disabled={isThinking}
            />
            <button 
              onClick={handleSend}
              disabled={!inputText.trim() || isThinking}
              className="text-anime-pink disabled:text-gray-300 hover:scale-110 transition-transform"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MascotChat;