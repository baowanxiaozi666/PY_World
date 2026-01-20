import React, { useState } from 'react';
import { Lock, User, ArrowRight, Sparkles, Info, WifiOff } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const res = await response.json();

      if (response.ok && res.code === 200) {
        onLoginSuccess(res.data.token);
      } else {
        setError(res.message || 'Login failed');
      }
    } catch (err) {
      // Offline Fallback Logic
      console.warn("Backend offline. Attempting offline login verification.");
      
      if (username === 'admin' && password === 'password') {
          // Simulate network delay for realism
          setTimeout(() => {
              onLoginSuccess('offline-demo-token');
          }, 800);
      } else {
          setError('Backend is offline. Use default credentials (admin/password) to enter Demo Mode.');
      }
    } finally {
      if (username !== 'admin' || password !== 'password') {
          setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="relative w-full max-w-md">
        {/* Decorative Elements */}
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-anime-accent/30 rounded-full blur-xl animate-float"></div>
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-anime-secondary/30 rounded-full blur-xl animate-float" style={{ animationDelay: '1s' }}></div>

        <div className="bg-anime-card backdrop-blur-md rounded-3xl p-8 border border-anime-accent/20 shadow-2xl relative overflow-hidden">
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-anime-accent to-anime-secondary rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg rotate-3 hover:rotate-6 transition-transform">
               <Sparkles className="text-white" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-anime-text">Welcome Back!</h2>
            <p className="text-anime-text/60 text-sm">Log in to manage your world</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-anime-text/80 ml-1">Username</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-anime-text/40 group-focus-within:text-anime-accent transition-colors" size={20} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/50 border border-anime-text/10 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-anime-accent/50 focus:border-transparent transition-all"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-anime-text/80 ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-anime-text/40 group-focus-within:text-anime-accent transition-colors" size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/50 border border-anime-text/10 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-anime-accent/50 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {/* Credential Hint */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
              <Info className="text-blue-500 shrink-0 mt-0.5" size={16} />
              <div className="text-xs text-blue-600">
                <span className="font-bold block mb-1">提示:</span>
                Username: <code>Github_Name</code><br/>
                Password: <code>pre_phone</code>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm text-center bg-red-100/50 p-2 rounded-lg border border-red-200 justify-center">
                 {error.includes('Backend') && <WifiOff size={16} />}
                 {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-anime-accent to-anime-secondary text-white font-bold py-3.5 rounded-xl shadow-lg shadow-anime-accent/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  Login <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;