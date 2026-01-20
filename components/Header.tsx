import React from 'react';
import { Page, Theme } from '../types';
import { Sparkles, Home, User, Heart, Moon, Sun, LogIn, LogOut, PenTool, LayoutDashboard, History } from 'lucide-react';
import { APP_NAME } from '../constants';

interface HeaderProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  currentTheme: Theme;
  toggleTheme: () => void;
  isLoggedIn: boolean;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ activePage, onNavigate, currentTheme, toggleTheme, isLoggedIn, onLogout }) => {
  const navItems = [
    { label: 'Home', page: Page.HOME, icon: Home },
    { label: 'About', page: Page.ABOUT, icon: User },
    // Removed hidden class for text on Timeline to make it more visible
    { label: 'Timeline', page: Page.CHANGELOG, icon: History },
  ];

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-anime-card border-b border-anime-accent/20 shadow-sm transition-all duration-300">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <button 
          onClick={() => onNavigate(Page.HOME)}
          className="flex items-center gap-2 group"
        >
          <div className="bg-gradient-to-tr from-anime-accent to-anime-secondary p-2 rounded-xl shadow-inner group-hover:rotate-12 transition-transform duration-300">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-anime-accent to-anime-secondary tracking-wide">
            {APP_NAME}
          </span>
        </button>

        <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1 md:gap-4">
            {navItems.map((item) => {
                const isActive = activePage === item.page;
                const Icon = item.icon;
                return (
                <button
                    key={item.label}
                    onClick={() => onNavigate(item.page)}
                    className={`
                    relative px-4 py-2 rounded-full font-medium transition-all duration-300 flex items-center gap-2
                    ${isActive 
                        ? 'bg-anime-accent text-white shadow-lg shadow-anime-accent/30 scale-105' 
                        : 'text-anime-text hover:bg-anime-bg hover:text-anime-accent hover:shadow-md'
                    }
                    `}
                >
                    <Icon size={18} />
                    {/* Make label visible on small screens for Timeline specifically if needed, or all */}
                    <span className="hidden sm:inline">{item.label}</span>
                    {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full animate-ping" />
                    )}
                </button>
                );
            })}
            </nav>

            <div className="h-6 w-px bg-anime-text/20 mx-1"></div>

            <button 
                onClick={toggleTheme}
                className="p-2 rounded-full text-anime-text hover:bg-anime-bg hover:text-anime-accent transition-colors"
                title="Switch Theme"
            >
                {currentTheme === 'sakura' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            
            {isLoggedIn ? (
                <>
                    <button 
                        onClick={() => onNavigate(Page.ADMIN_DASHBOARD)}
                        className={`p-2 rounded-full transition-colors ${activePage === Page.ADMIN_DASHBOARD ? 'bg-anime-accent text-white' : 'text-anime-text hover:bg-anime-bg hover:text-anime-accent'}`}
                        title="Dashboard"
                    >
                        <LayoutDashboard size={20} />
                    </button>
                    <button 
                        onClick={() => onNavigate(Page.CREATE_POST)}
                        className={`p-2 rounded-full transition-colors ${activePage === Page.CREATE_POST ? 'bg-anime-accent text-white' : 'text-anime-text hover:bg-anime-bg hover:text-anime-accent'}`}
                        title="New Post"
                    >
                        <PenTool size={20} />
                    </button>
                    <button 
                        onClick={onLogout}
                        className="p-2 rounded-full text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </>
            ) : (
                <button 
                    onClick={() => onNavigate(Page.LOGIN)}
                    className={`p-2 rounded-full transition-colors ${activePage === Page.LOGIN ? 'text-anime-accent bg-anime-bg' : 'text-anime-text hover:text-anime-accent'}`}
                    title="Login"
                >
                    <LogIn size={20} />
                </button>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;