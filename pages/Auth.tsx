import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle, ArrowRight, Radio, User, CreditCard, Briefcase, Building, KeyRound, ArrowLeft } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { getSupabase } from '../supabaseClient';

export const AuthPage: React.FC = () => {
  const [role, setRole] = useState<'student' | 'staff'>('student');
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot_password'>('login');
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [matricNo, setMatricNo] = useState('');
  const [staffId, setStaffId] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  
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
      // --- FORGOT PASSWORD FLOW ---
      if (authMode === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin, // Users will be redirected back to the app logged in
        });
        if (error) throw error;
        alert("Password reset instructions sent! Please check your email.");
        setAuthMode('login');
        setLoading(false);
        return;
      }

      if (role === 'staff') {
        if (authMode === 'signup') {
            // --- STAFF SIGNUP ---
            // Validate Staff ID Format: SMAF/0000
            const staffIdRegex = /^SMAF\/\d{4}$/;
            if (!staffIdRegex.test(staffId)) {
                throw new Error("Invalid Staff ID format. Must be SMAF/####");
            }

            const { data: authData, error: authError } = await supabase.auth.signUp({ 
                email, 
                password,
                options: { data: { full_name: fullName, role: 'staff' } }
            });
            if (authError) throw authError;

            if (authData.user) {
                const splitName = fullName.split(' ');
                const { error: dbError } = await supabase.from('lecturers').insert({
                    email: email,
                    staff_id: staffId,
                    first_name: splitName[0],
                    last_name: splitName.slice(1).join(' ') || '',
                    department: department
                });
                if (dbError) {
                    console.error(dbError);
                    // Note: If DB insert fails, the Auth user still exists. 
                    // In a prod app, you'd want a transaction or cleanup.
                    throw new Error("Failed to create staff profile. Staff ID might be taken.");
                }
            }
            alert("Account created! Please check your email to confirm your account.");
            setAuthMode('login');

        } else {
            // --- STAFF LOGIN ---
            const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
            if (authError) throw authError;
            
            // Verify they are actually staff in our DB
            const { data: staff } = await supabase.from('lecturers').select('id').eq('email', email).single();
            if (!staff) {
               await supabase.auth.signOut();
               throw new Error("No staff record found for this user.");
            }

            localStorage.setItem('user_role', 'staff');
            navigate('/');
        }
      } else {
        // --- STUDENT LOGIC ---
        if (authMode === 'signup') {
          // 1. Sign up with Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.signUp({ 
            email, 
            password,
            options: { data: { full_name: fullName, role: 'student' } }
          });
          if (authError) throw authError;

          // 2. Create Student Record with AUTO-ASSIGNED RFID
          if (authData.user) {
            const splitName = fullName.split(' ');
            // Generate pseudo-random unique RFID for simulation
            const autoRfid = Math.random().toString(36).substring(2, 10).toUpperCase();

            const { error: dbError } = await supabase.from('students').insert({
              email: email,
              student_id: matricNo,
              first_name: splitName[0],
              last_name: splitName.slice(1).join(' ') || '',
              rfid_tag: autoRfid, 
            });
            if (dbError) {
              console.error(dbError);
              throw new Error("Failed to create student profile. Matric number might be taken.");
            }
          }
          alert("Account created! Please check your email to confirm your account.");
          setAuthMode('login');

        } else {
          // --- STUDENT LOGIN (Matric No + Pass) ---
          const { data: student, error: lookupError } = await supabase
            .from('students')
            .select('email')
            .eq('student_id', matricNo)
            .single();

          if (lookupError || !student) throw new Error("Matric number not found.");

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

  const getTitle = () => {
    if (authMode === 'forgot_password') return 'Reset Password';
    if (role === 'student') return authMode === 'login' ? 'Student Login' : 'Student Registration';
    return authMode === 'login' ? 'Staff Login' : 'New Staff Registration';
  };

  const getDescription = () => {
    if (authMode === 'forgot_password') return 'Enter your email to receive reset instructions.';
    if (role === 'student') return 'Access your attendance history.';
    return 'Manage courses and view reports.';
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
          {/* Role Switcher - Hide during Forgot Password */}
          {authMode !== 'forgot_password' && (
            <div className="flex p-1 bg-slate-200 rounded-xl mb-8">
                <button 
                onClick={() => { setRole('student'); setAuthMode('login'); setError(null); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'student' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                Student Portal
                </button>
                <button 
                onClick={() => { setRole('staff'); setAuthMode('login'); setError(null); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'staff' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                Staff Portal
                </button>
            </div>
          )}

          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 mb-2">{getTitle()}</h1>
            <p className="text-slate-500">{getDescription()}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-start gap-3 text-sm font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            
            {/* FORGOT PASSWORD FORM */}
            {authMode === 'forgot_password' ? (
                <>
                    <Input
                        label="Email Address"
                        type="email"
                        icon={<Mail className="w-4 h-4" />}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your registered email"
                        required
                    />
                     <div className="pt-4 space-y-3">
                        <Button type="submit" className="w-full py-3" isLoading={loading}>
                             Send Reset Link <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                        <button 
                            type="button"
                            onClick={() => setAuthMode('login')}
                            className="w-full py-3 text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                        </button>
                     </div>
                </>
            ) : role === 'staff' ? (
              // STAFF FORM
              <>
                {authMode === 'signup' && (
                    <>
                        <Input
                            label="Full Name"
                            icon={<User className="w-4 h-4" />}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                        />
                         <Input
                            label="Department"
                            icon={<Building className="w-4 h-4" />}
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            placeholder="e.g. Electrical Engineering"
                            required
                        />
                         <Input
                            label="Staff ID (SMAF/####)"
                            icon={<Briefcase className="w-4 h-4" />}
                            value={staffId}
                            onChange={(e) => setStaffId(e.target.value.toUpperCase())}
                            placeholder="SMAF/0001"
                            required
                        />
                    </>
                )}
                <Input
                  label="Email Address"
                  type="email"
                  icon={<Mail className="w-4 h-4" />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <div className="space-y-1">
                    <Input
                    label="Password"
                    type="password"
                    icon={<Lock className="w-4 h-4" />}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    />
                    {authMode === 'login' && (
                        <div className="flex justify-end">
                            <button 
                                type="button"
                                onClick={() => setAuthMode('forgot_password')}
                                className="text-xs font-semibold text-primary-600 hover:text-primary-800"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    )}
                </div>
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
                
                <div className="space-y-1">
                    <Input
                        label="Password"
                        type="password"
                        icon={<Lock className="w-4 h-4" />}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    {authMode === 'login' && (
                        <div className="flex justify-end">
                            <button 
                                type="button"
                                onClick={() => setAuthMode('forgot_password')}
                                className="text-xs font-semibold text-primary-600 hover:text-primary-800"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    )}
                </div>
              </>
            )}
            
            {/* Submit Button (Hidden in Forgot Password mode as it has its own) */}
            {authMode !== 'forgot_password' && (
                <div className="pt-4">
                <Button type="submit" className="w-full py-3" isLoading={loading}>
                    {authMode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                </div>
            )}
          </form>

          {authMode !== 'forgot_password' && (
            <div className="mt-6 text-center text-sm">
                <span className="text-slate-500">
                {authMode === 'login' ? "Don't have an account?" : "Already registered?"}
                </span>
                <button
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className="ml-2 font-bold text-primary-600 hover:text-primary-800"
                >
                {authMode === 'login' ? "Register Now" : "Log in"}
                </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};