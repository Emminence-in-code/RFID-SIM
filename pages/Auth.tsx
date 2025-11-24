import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle, ArrowRight, Radio, User, CreditCard } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { getSupabase } from '../supabaseClient';

export const AuthPage: React.FC = () => {
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [matricNo, setMatricNo] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const supabase = getSupabase();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!supabase) {
      setError("System offline. Please reload.");
      setLoading(false);
      return;
    }

    try {
      if (role === 'admin') {
        // --- ADMIN LOGIN (Email Only) ---
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        localStorage.setItem('user_role', 'admin');
        navigate('/');
      } else {
        // --- STUDENT LOGIC ---
        if (authMode === 'signup') {
          // 1. Sign up with Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.signUp({ 
            email, 
            password,
            options: { data: { full_name: fullName } }
          });
          if (authError) throw authError;

          // 2. Create Student Record
          if (authData.user) {
            const splitName = fullName.split(' ');
            const { error: dbError } = await supabase.from('students').insert({
              email: email,
              student_id: matricNo,
              first_name: splitName[0],
              last_name: splitName.slice(1).join(' ') || '',
              rfid_tag: '', // Empty initially
            });
            if (dbError) {
              // Rollback auth if db fails (simplified)
              console.error(dbError);
              throw new Error("Failed to create student profile. Matric number might be taken.");
            }
          }
          alert("Account created! Please sign in.");
          setAuthMode('login');

        } else {
          // --- STUDENT LOGIN (Matric No + Pass) ---
          // 1. Lookup Email from Matric No
          const { data: student, error: lookupError } = await supabase
            .from('students')
            .select('email')
            .eq('student_id', matricNo)
            .single();

          if (lookupError || !student) throw new Error("Matric number not found.");

          // 2. Sign in with resolved email
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: student.email,
            password
          });
          
          if (signInError) throw signInError;
          localStorage.setItem('user_role', 'student');
          navigate('/student');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Left Panel - Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-950 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(37,99,235,0.1),_transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        
        <div className="relative z-10 text-center px-12 max-w-lg">
          <div className="mb-8 flex justify-center">
            <div className="w-20 h-20 bg-primary-600 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.4)]">
              <Radio className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white mb-6 tracking-tight">RFID Attendance System</h2>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
              <div className="text-primary-400 font-mono text-xs mb-1">MODULE</div>
              <div className="text-white font-bold">Real-time Tracking</div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
              <div className="text-primary-400 font-mono text-xs mb-1">MODULE</div>
              <div className="text-white font-bold">Secure Hardware</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          {/* Role Switcher */}
          <div className="flex p-1 bg-slate-200 rounded-xl mb-8">
            <button 
              onClick={() => { setRole('student'); setAuthMode('login'); setError(null); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'student' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Student Portal
            </button>
            <button 
              onClick={() => { setRole('admin'); setAuthMode('login'); setError(null); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'admin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Admin Access
            </button>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 mb-2">
              {role === 'student' ? (authMode === 'login' ? 'Student Login' : 'Student Registration') : 'Administrator Login'}
            </h1>
            <p className="text-slate-500">
              {role === 'student' ? 'Access your attendance history and profile.' : 'Manage courses, students, and devices.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-start gap-3 text-sm font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {role === 'admin' ? (
              // ADMIN FORM
              <>
                <Input
                  label="Email Address"
                  type="email"
                  icon={<Mail className="w-4 h-4" />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  icon={<Lock className="w-4 h-4" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </>
            ) : (
              // STUDENT FORM
              <>
                {authMode === 'signup' && (
                  <>
                     <Input
                      label="Full Name"
                      icon={<User className="w-4 h-4" />}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      icon={<Mail className="w-4 h-4" />}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </>
                )}
                
                <Input
                  label="Matric Number"
                  icon={<CreditCard className="w-4 h-4" />}
                  value={matricNo}
                  onChange={(e) => setMatricNo(e.target.value.toUpperCase())}
                  placeholder="S12345"
                  required
                />
                
                <Input
                  label="Password"
                  type="password"
                  icon={<Lock className="w-4 h-4" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </>
            )}
            
            <div className="pt-4">
              <Button type="submit" className="w-full py-3" isLoading={loading}>
                {authMode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>

          {role === 'student' && (
            <div className="mt-6 text-center text-sm">
              <span className="text-slate-500">
                {authMode === 'login' ? "Don't have an account?" : "Already registered?"}
              </span>
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className="ml-2 font-bold text-primary-600 hover:text-primary-800"
              >
                {authMode === 'login' ? "Sign up now" : "Log in"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
