import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle, ArrowRight, Hexagon } from 'lucide-react';
import { Button, Input, Card } from '../components/ui';
import { getSupabase } from '../supabaseClient';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const supabase = getSupabase();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!supabase) {
      setError("Supabase client not initialized. Please reload.");
      setLoading(false);
      return;
    }

    try {
      const { error: authError } = isLogin 
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      if (authError) throw authError;
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 relative overflow-hidden">
        {/* Background blobs for flair */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary-100 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 opacity-60"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-secondary-100 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 opacity-60"></div>

        <div className="max-w-md w-full relative z-10">
          <div className="mb-10">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30 mb-6">
              <Hexagon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="text-slate-500 text-lg">
              Enter your details to access the dashboard.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              icon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@university.edu"
              className="py-3"
            />
            <Input
              label="Password"
              type="password"
              icon={<Lock className="w-4 h-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="py-3"
            />
            
            <div className="pt-2">
              <Button type="submit" className="w-full py-3.5 text-base" isLoading={loading}>
                {isLogin ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-600">
              {isLogin ? "New to the platform?" : "Already have an account?"}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 font-bold text-primary-600 hover:text-primary-800 transition-colors"
              >
                {isLogin ? "Sign up for free" : "Log in here"}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-slate-900 to-slate-900"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
        
        {/* Abstract Shapes */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary-600/30 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary-500/20 rounded-full blur-[100px]"></div>

        <div className="relative z-10 text-center px-12 max-w-lg">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-8 shadow-2xl">
            <h2 className="text-3xl font-bold text-white mb-4">Smart Attendance Tracking</h2>
            <p className="text-primary-100 text-lg leading-relaxed">
              Streamline your institution's attendance management with real-time RFID logging, insightful analytics, and secure data storage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};