import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  ShieldCheck, 
  AlertTriangle,
  Activity,
  User,
  List
} from 'lucide-react';
import { getSupabase } from '../supabaseClient';
import { Session, AttendanceLog, Student } from '../types';

// --- Constants ---
const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 Hour

export const LiveConsole: React.FC = () => {
  const supabase = getSupabase();
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  
  const [attendees, setAttendees] = useState<AttendanceLog[]>([]);
  const [currentScan, setCurrentScan] = useState<AttendanceLog | null>(null);
  const [duplicateScan, setDuplicateScan] = useState<Partial<Student> | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // --- Effects ---
  useEffect(() => {
    const fetchInit = async () => {
      if (!supabase) return;
      
      const { data: session } = await supabase
        .from('sessions')
        .select('*, course:courses(*, lecturer:lecturers(*))')
        .eq('is_active', true)
        .order('start_time', { ascending: false })
        .limit(1)
        .single();
      
      if (session) {
        setActiveSession(session as any);
        fetchSessionLogs(session.id);
      }
    };
    fetchInit();

    // Listen for new sessions starting
    const sessionChannel = supabase?.channel('session-monitor')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sessions' }, (payload) => {
            if (payload.new.is_active) {
                // Refresh full session data
                fetchInit(); 
            }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions' }, (payload) => {
            if (!payload.new.is_active && activeSession?.id === payload.new.id) {
                setActiveSession(null);
            }
        })
        .subscribe();

    return () => {
        supabase?.removeChannel(sessionChannel);
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !activeSession) return;

    const endTime = new Date(activeSession.start_time).getTime() + SESSION_DURATION_MS;
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, endTime - Date.now()));
    }, 1000);

    const channel = supabase
      .channel('live-attendance')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'attendance_logs',
        filter: `session_id=eq.${activeSession.id}`
      }, async (payload) => {
        const { data: fullLog } = await supabase
          .from('attendance_logs')
          .select('*, student:students(*)')
          .eq('id', payload.new.id)
          .single();
        
        if (fullLog) handleNewScan(fullLog as any);
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [activeSession, supabase]);

  // --- Logic ---
  const fetchSessionLogs = async (sessionId: string) => {
    if(!supabase) return;
    const { data } = await supabase
      .from('attendance_logs')
      .select('*, student:students(*)')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false });
    if(data) setAttendees(data as any);
  };

  const handleNewScan = (log: AttendanceLog) => {
    setCurrentScan(log);
    setTimeout(() => {
      setAttendees(prev => [log, ...prev.filter(p => p.id !== log.id)]);
      setCurrentScan(null);
    }, 3000);
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  // --- Render: Idle State ---
  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] bg-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="z-10 text-center max-w-md w-full p-10 bg-slate-950 border border-slate-800 rounded-2xl shadow-xl">
          <Activity className="w-16 h-16 text-slate-700 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-2">System Standby</h2>
          <p className="text-slate-400 mb-8">Waiting for hardware terminal to initialize session.</p>
          <div className="flex items-center justify-center gap-2 text-slate-500 bg-slate-900 p-2 rounded border border-slate-800">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              LISTENING FOR HARDWARE SIGNAL
            </div>
        </div>
      </div>
    );
  }

  // --- Render: Active State ---
  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-950 text-slate-200 overflow-hidden font-mono text-sm rounded-lg border border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-emerald-500">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
            <span className="font-bold tracking-wider">LIVE FEED</span>
          </div>
          <div className="h-6 w-px bg-slate-800"></div>
          <div>
            <div className="text-white font-bold text-lg leading-none">{activeSession.course?.code}</div>
            <div className="text-slate-500 text-xs">{activeSession.course?.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest">Elapsed</div>
            <div className="text-xl font-bold text-white font-variant-numeric">{formatTime(SESSION_DURATION_MS - timeLeft)}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Main Stage (Stats & Current Scan) */}
        <div className="flex-1 flex flex-col relative bg-slate-950">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>
          
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-px bg-slate-800 border-b border-slate-800">
            <div className="bg-slate-900 p-4 flex items-center justify-between">
              <span className="text-slate-500 uppercase text-xs">Present</span>
              <span className="text-2xl font-bold text-white">{attendees.length}</span>
            </div>
            <div className="bg-slate-900 p-4 flex items-center justify-between">
              <span className="text-slate-500 uppercase text-xs">Rate</span>
              <span className="text-2xl font-bold text-white">{(attendees.length / 60).toFixed(1)}/m</span>
            </div>
            <div className="bg-slate-900 p-4 flex items-center justify-between">
              <span className="text-slate-500 uppercase text-xs">Status</span>
              <span className="text-emerald-500 font-bold flex items-center gap-2"><Wifi className="w-4 h-4" /> ONLINE</span>
            </div>
          </div>

          {/* Center Stage */}
          <div className="flex-1 flex items-center justify-center p-8 relative">
            <AnimatePresence mode="wait">
              {currentScan ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                  className="w-full max-w-xl bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                >
                  <div className="h-1 w-full bg-emerald-500 relative overflow-hidden">
                     <div className="absolute inset-0 bg-white/50 animate-[shimmer_1s_infinite]"></div>
                  </div>
                  <div className="p-8 flex gap-6">
                    <div className="w-32 h-32 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700 overflow-hidden relative">
                      {currentScan.student?.photo_url ? (
                        <img src={currentScan.student.photo_url} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 text-slate-600" />
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-center py-1 text-slate-300">
                        IMG_VERIFIED
                      </div>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="text-emerald-500 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Identity Confirmed
                        </div>
                        <div className="text-3xl font-bold text-white">{currentScan.student?.first_name} {currentScan.student?.last_name}</div>
                        <div className="text-slate-400 text-lg">{currentScan.student?.student_id}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-800 p-2 rounded border border-slate-700">
                          <span className="text-slate-500 block">Time</span>
                          <span className="text-white font-mono">{new Date(currentScan.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="bg-slate-800 p-2 rounded border border-slate-700">
                          <span className="text-slate-500 block">Status</span>
                          <span className="text-emerald-400 font-bold uppercase">Present</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : duplicateScan ? (
                <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }} 
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0 }}
                   className="text-center p-8 bg-red-900/20 border border-red-500/50 rounded-2xl backdrop-blur-sm"
                >
                   <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
                   <h3 className="text-2xl font-bold text-red-500">DUPLICATE ENTRY</h3>
                   <p className="text-red-300 mt-2">ID already logged in this session.</p>
                </motion.div>
              ) : (
                <div className="text-center opacity-20">
                   <div className="w-32 h-32 border-2 border-slate-600 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                      <div className="absolute inset-0 border-2 border-slate-600 rounded-full animate-ping"></div>
                      <Wifi className="w-12 h-12 text-slate-500" />
                   </div>
                   <p className="tracking-[0.5em] font-bold text-slate-400">SCANNING</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Log List */}
        <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col z-10">
          <div className="h-12 border-b border-slate-800 flex items-center px-4 bg-slate-900/50 gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <List className="w-4 h-4" /> Activity Log
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
             {attendees.map(log => (
               <div key={log.id} className="p-3 bg-slate-800/50 border border-slate-800 rounded flex items-center gap-3 hover:bg-slate-800 transition-colors group">
                  <div className="text-xs font-mono text-slate-500 w-12">{new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-bold truncate">{log.student?.last_name}</div>
                    <div className="text-slate-500 text-xs truncate">{log.student?.student_id}</div>
                  </div>
                  <div className="w-1 h-8 bg-emerald-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};