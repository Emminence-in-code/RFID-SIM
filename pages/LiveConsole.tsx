import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  ShieldCheck, 
  AlertTriangle,
  Activity,
  User,
  List,
  Printer
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
      
      try {
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
      } catch (e) {
        console.error("Live Console init failed", e);
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
    try {
        const { data } = await supabase
        .from('attendance_logs')
        .select('*, student:students(*)')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: false });
        if(data) setAttendees(data as any);
    } catch(e) { console.error(e); }
  };

  const handleNewScan = (log: AttendanceLog) => {
    setCurrentScan(log);
    // Add to list after a delay so the main animation can play
    setTimeout(() => {
      setAttendees(prev => [log, ...prev.filter(p => p.id !== log.id)]);
    }, 500);
    
    // Clear the main card after 4 seconds
    setTimeout(() => {
      setCurrentScan(null);
    }, 4000);
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
      <div className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6 shrink-0 relative z-30">
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
        {/* Left: Main Stage (Printer Animation) */}
        <div className="flex-1 flex flex-col relative bg-slate-950">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>
          
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-px bg-slate-800 border-b border-slate-800 relative z-20">
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

          {/* Center Stage: The Printer */}
          <div className="flex-1 flex flex-col items-center justify-start pt-10 relative overflow-hidden">
            
            {/* The "Printer Slot" Graphic */}
            <div className="w-96 h-4 bg-slate-800 rounded-full mb-[-2px] relative z-20 shadow-[0_10px_20px_rgba(0,0,0,0.5)] border-b border-slate-700 flex items-center justify-center">
                <div className="w-80 h-1.5 bg-black rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]"></div>
            </div>

            {/* The Animation Container (Clipped at top) */}
            <div className="relative w-full max-w-2xl px-4 z-10 flex justify-center h-full">
                <AnimatePresence mode="wait">
                {currentScan ? (
                    <motion.div 
                        key={currentScan.id}
                        initial={{ y: -400, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 200, opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                        transition={{ type: "spring", damping: 14, stiffness: 60, mass: 1.2 }}
                        className="w-full max-w-xl bg-white text-slate-900 rounded-b-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] border-x-2 border-b-2 border-slate-700/50"
                        style={{ transformOrigin: "top center" }}
                    >
                        {/* Realistic Card Header */}
                        <div className="bg-primary-600 h-2 w-full"></div>
                        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 tracking-widest uppercase">ID VERIFICATION SYSTEM</span>
                            <span className="text-xs font-mono font-bold text-primary-600">AUTH_OK</span>
                        </div>

                        <div className="p-8 flex gap-8 items-start">
                            {/* Large Photo */}
                            <div className="w-40 h-48 bg-slate-200 rounded-lg shadow-inner overflow-hidden border border-slate-300 relative shrink-0">
                                {currentScan.student?.photo_url ? (
                                    <img src={currentScan.student.photo_url} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                                        <User className="w-16 h-16 mb-2" />
                                        <span className="text-xs font-bold">NO PHOTO</span>
                                    </div>
                                )}
                                <div className="absolute bottom-0 inset-x-0 bg-emerald-500 text-white text-[10px] font-bold text-center py-1 uppercase tracking-wider">
                                    Verified
                                </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 pt-2">
                                <h1 className="text-4xl font-black text-slate-900 leading-tight mb-2">
                                    {currentScan.student?.first_name} <br/>
                                    {currentScan.student?.last_name}
                                </h1>
                                <div className="text-xl font-mono font-bold text-slate-500 mb-6 border-b border-slate-200 pb-4 inline-block">
                                    {currentScan.student?.student_id}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Time Logged</span>
                                        <span className="font-mono font-bold text-lg">
                                            {new Date(currentScan.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Status</span>
                                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-md text-xs font-bold uppercase inline-block">
                                            Present
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card Footer (Barcode) */}
                        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center mt-2">
                             <div className="flex flex-col">
                                 <span className="text-[8px] font-bold text-slate-400 uppercase">Transaction ID</span>
                                 <span className="text-[10px] font-mono text-slate-600">{currentScan.id.split('-')[0].toUpperCase()}</span>
                             </div>
                             <div className="h-6 w-32 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/UPC-A-036000291452.svg/1200px-UPC-A-036000291452.svg.png')] bg-cover opacity-40 mix-blend-multiply grayscale"></div>
                        </div>
                    </motion.div>
                ) : duplicateScan ? (
                    <motion.div 
                    initial={{ y: -200, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center p-8 bg-red-900/90 border border-red-500 rounded-b-2xl backdrop-blur shadow-2xl mt-4"
                    >
                    <AlertTriangle className="w-16 h-16 text-white mx-auto mb-4 animate-pulse" />
                    <h3 className="text-2xl font-bold text-white">DUPLICATE ENTRY</h3>
                    <p className="text-red-200 mt-2">ID already logged in this session.</p>
                    </motion.div>
                ) : (
                    <div className="mt-20 text-center opacity-20">
                        <Printer className="w-24 h-24 text-slate-500 mx-auto mb-4" />
                        <p className="tracking-[0.5em] font-bold text-slate-400">WAITING FOR ENTRY...</p>
                    </div>
                )}
                </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right: Log List */}
        <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col z-30 shadow-xl">
          <div className="h-12 border-b border-slate-800 flex items-center px-4 bg-slate-900/50 gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <List className="w-4 h-4" /> Activity Log
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
             <AnimatePresence>
             {attendees.map(log => (
               <motion.div 
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 key={log.id} 
                 className="p-3 bg-slate-800/80 border border-slate-700/50 rounded flex items-center gap-3 hover:bg-slate-800 transition-colors group relative overflow-hidden"
               >
                  <div className="text-xs font-mono text-slate-500 w-12">{new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                  
                  {/* Small Avatar in List */}
                  <div className="w-8 h-8 rounded bg-slate-700 overflow-hidden flex-shrink-0">
                      {log.student?.photo_url ? (
                          <img src={log.student.photo_url} className="w-full h-full object-cover" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                             {log.student?.first_name[0]}
                          </div>
                      )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-bold truncate">{log.student?.last_name}</div>
                    <div className="text-slate-500 text-xs truncate">{log.student?.student_id}</div>
                  </div>
                  <div className="w-1 h-full absolute right-0 top-0 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
               </motion.div>
             ))}
             </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};