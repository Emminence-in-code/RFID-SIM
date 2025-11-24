import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scan, 
  Wifi, 
  Activity, 
  Clock, 
  User, 
  ShieldCheck, 
  AlertTriangle,
  Play,
  Square,
  Users,
  Database
} from 'lucide-react';
import { getSupabase } from '../supabaseClient';
import { Course, Session, AttendanceLog, Student } from '../types';
import { Button } from '../components/ui';

// --- Constants ---
const SESSION_DURATION_MS = 40 * 60 * 1000; // 40 minutes

export const LiveConsole: React.FC = () => {
  const supabase = getSupabase();
  
  // --- State ---
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  
  // The 'Queue' is the visual buffer. We don't want to snap immediately if many scans come in.
  const [scanQueue, setScanQueue] = useState<AttendanceLog[]>([]); 
  const [processedAttendees, setProcessedAttendees] = useState<AttendanceLog[]>([]);
  const [currentScan, setCurrentScan] = useState<AttendanceLog | null>(null);
  const [duplicateScan, setDuplicateScan] = useState<Partial<Student> | null>(null);
  
  // Simulation Controls
  const [simRfid, setSimRfid] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);

  // --- Effects ---

  // 1. Initial Data Fetch
  useEffect(() => {
    const fetchInit = async () => {
      if (!supabase) return;
      const { data } = await supabase.from('courses').select('*, lecturer:lecturers(*)');
      if (data) setCourses(data as any);
      
      // Check for existing active session
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
  }, [supabase]);

  // 2. Realtime Subscriptions
  useEffect(() => {
    if (!supabase || !activeSession) return;

    // Timer Logic
    const endTime = new Date(activeSession.start_time).getTime() + SESSION_DURATION_MS;
    const interval = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) stopSession();
    }, 1000);

    // Supabase Subscription
    const channel = supabase
      .channel('live-attendance')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'attendance_logs',
        filter: `session_id=eq.${activeSession.id}`
      }, async (payload) => {
        // Fetch full student details for the log
        const { data: fullLog } = await supabase
          .from('attendance_logs')
          .select('*, student:students(*)')
          .eq('id', payload.new.id)
          .single();
        
        if (fullLog) {
          handleNewScan(fullLog as any);
        }
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [activeSession, supabase]);

  // 3. Animation Queue Processor
  useEffect(() => {
    if (!currentScan && scanQueue.length > 0) {
      // Dequeue next item
      const next = scanQueue[0];
      setScanQueue(prev => prev.slice(1));
      playCinematicSequence(next);
    }
  }, [scanQueue, currentScan]);


  // --- Logic ---

  const fetchSessionLogs = async (sessionId: string) => {
    if(!supabase) return;
    const { data } = await supabase
      .from('attendance_logs')
      .select('*, student:students(*)')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false });
    if(data) setProcessedAttendees(data as any);
  };

  const startSession = async () => {
    if (!supabase || !selectedCourseId) return;
    
    // Deactivate others
    await supabase.from('sessions').update({ is_active: false }).eq('is_active', true);

    const course = courses.find(c => c.id === selectedCourseId);
    
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        course_id: selectedCourseId,
        lecturer_id: course?.lecturer_id,
        start_time: new Date().toISOString(),
        is_active: true
      })
      .select('*, course:courses(*, lecturer:lecturers(*))')
      .single();

    if (data) {
      setActiveSession(data as any);
      setProcessedAttendees([]);
    }
  };

  const stopSession = async () => {
    if (!supabase || !activeSession) return;
    await supabase.from('sessions').update({ 
      is_active: false,
      end_time: new Date().toISOString()
    }).eq('id', activeSession.id);
    setActiveSession(null);
    setCurrentScan(null);
  };

  const handleNewScan = (log: AttendanceLog) => {
    setScanQueue(prev => [...prev, log]);
  };

  const playCinematicSequence = (log: AttendanceLog) => {
    setCurrentScan(log);
    // Sequence duration: 
    // 0s: Start Analysis
    // 1.5s: Match Found
    // 3.5s: Verified -> Move to list
    setTimeout(() => {
      setProcessedAttendees(prev => [log, ...prev]);
      setCurrentScan(null);
    }, 4000);
  };

  const handleSimulatedScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !activeSession || !simRfid) return;

    // Check if student exists
    const { data: student } = await supabase.from('students').select('*').eq('rfid_tag', simRfid).single();

    if (!student) {
      alert('Unknown RFID Tag');
      return;
    }

    // Attempt Insert (Database will reject if duplicate due to unique constraint)
    const { error } = await supabase.from('attendance_logs').insert({
      session_id: activeSession.id,
      student_id: student.id,
      course_id: activeSession.course_id,
      status: 'present'
    });

    if (error) {
      if (error.code === '23505') { // Postgres duplicate key error code
        // Trigger "Duplicate" animation
        setDuplicateScan(student);
        setTimeout(() => setDuplicateScan(null), 3000);
      } else {
        // Actual system error
        console.error('Attendance log insert failed:', error);
        alert(`Error logging attendance: ${error.message}`);
      }
    }
    
    setSimRfid('');
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- Render ---

  if (!activeSession) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-slate-950 rounded-3xl relative overflow-hidden border border-slate-800 shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        <div className="z-10 text-center space-y-8 max-w-md w-full p-8 bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-800">
          <div className="mx-auto w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center relative">
            <Wifi className="w-10 h-10 text-slate-500" />
            <div className="absolute inset-0 border-2 border-slate-700 rounded-full animate-ping opacity-20"></div>
          </div>
          <div>
            <h2 className="text-3xl font-mono font-bold text-white mb-2 tracking-tighter">TERMINAL STANDBY</h2>
            <p className="text-slate-400">Hardware connected. Waiting for session initialization.</p>
          </div>
          <div className="space-y-4">
            <select 
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-3 font-mono focus:ring-2 focus:ring-primary-500 focus:outline-none"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              <option value="">-- SELECT COURSE PROTOCOL --</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.code} :: {c.name}</option>
              ))}
            </select>
            <button 
              onClick={startSession}
              disabled={!selectedCourseId}
              className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-lg font-bold font-mono tracking-widest flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_40px_rgba(124,58,237,0.5)]"
            >
              <Play className="w-5 h-5 fill-current" /> INITIATE SESSION
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-slate-950 text-white overflow-hidden rounded-3xl font-mono relative border border-slate-800 shadow-2xl">
      {/* Background FX */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(14,165,233,0.05),_transparent_70%)]"></div>
        <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent"></div>
        <div className="absolute bottom-0 w-full h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent"></div>
      </div>

      {/* Header Bar */}
      <div className="h-20 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center justify-between px-8 z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
            <span className="text-green-500 font-bold tracking-widest text-sm">LIVE FEED</span>
          </div>
          <div className="h-8 w-px bg-slate-700"></div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">{activeSession.course?.code} <span className="text-slate-500">::</span> {activeSession.course?.name}</h1>
            <p className="text-xs text-primary-400 uppercase tracking-wider">Lecturer: {activeSession.course?.lecturer?.first_name} {activeSession.course?.lecturer?.last_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
           <div className="text-right">
             <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Session Timer</p>
             <div className="text-2xl font-bold font-mono tabular-nums text-white flex items-center gap-2">
               <Clock className="w-5 h-5 text-primary-500" />
               {formatTime(timeLeft)}
             </div>
           </div>
           <button 
             onClick={stopSession}
             className="bg-red-900/20 border border-red-500/50 hover:bg-red-500/20 text-red-400 px-6 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors flex items-center gap-2"
           >
             <Square className="w-3 h-3 fill-current" /> Terminate
           </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden z-10">
        {/* Left: Processed List */}
        <div className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col backdrop-blur-sm">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-3 h-3" /> Logged Personnel
            </span>
            <span className="bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded text-xs font-mono">{processedAttendees.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
             <AnimatePresence initial={false}>
              {processedAttendees.map((log) => (
                <motion.div 
                  key={log.id}
                  initial={{ opacity: 0, x: -20, backgroundColor: 'rgba(14, 165, 233, 0.2)' }}
                  animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(15, 23, 42, 0)' }}
                  transition={{ duration: 0.5 }}
                  className="p-3 rounded border border-slate-800/50 hover:bg-slate-800/50 transition-colors flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-700">
                    {log.student?.first_name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-200 truncate">{log.student?.last_name}, {log.student?.first_name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{log.student?.student_id}</p>
                  </div>
                  <div className="ml-auto text-[10px] text-green-500 font-mono opacity-50 group-hover:opacity-100">
                    {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Center: Spotlight / Cinematic Area */}
        <div className="flex-1 relative flex flex-col">
          {/* Main Visualizer */}
          <div className="flex-1 flex items-center justify-center p-12 relative">
             {/* Grid Overlay */}
             <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>

             {/* Crosshairs */}
             <div className="absolute top-10 left-10 w-8 h-8 border-t-2 border-l-2 border-primary-500/50"></div>
             <div className="absolute top-10 right-10 w-8 h-8 border-t-2 border-r-2 border-primary-500/50"></div>
             <div className="absolute bottom-10 left-10 w-8 h-8 border-b-2 border-l-2 border-primary-500/50"></div>
             <div className="absolute bottom-10 right-10 w-8 h-8 border-b-2 border-r-2 border-primary-500/50"></div>

             {/* Dynamic Content */}
             <AnimatePresence mode="wait">
               {currentScan ? (
                 <motion.div 
                    key="scanning"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                    transition={{ duration: 0.4 }}
                    className="relative z-10 max-w-2xl w-full"
                 >
                    {/* Scanning Card */}
                    <div className="glass-panel p-1 rounded-2xl overflow-hidden shadow-[0_0_100px_rgba(14,165,233,0.2)]">
                       <div className="bg-slate-950/80 rounded-xl p-8 border border-slate-700 relative overflow-hidden">
                          {/* Scanning Bar Animation */}
                          <motion.div 
                            initial={{ top: '-10%' }}
                            animate={{ top: '120%' }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                            className="absolute left-0 right-0 h-2 bg-primary-400 blur-sm opacity-50 z-20"
                          />
                          
                          <div className="flex gap-8 items-start">
                             <motion.div 
                               initial={{ opacity: 0, x: -20 }}
                               animate={{ opacity: 1, x: 0 }}
                               transition={{ delay: 0.2 }}
                               className="w-48 h-48 bg-slate-800 rounded-lg border-2 border-primary-500/30 overflow-hidden relative"
                             >
                                <User className="w-full h-full text-slate-600 p-8" />
                                <div className="absolute inset-0 bg-primary-500/10"></div>
                                {/* Tech overlay on image */}
                                <div className="absolute bottom-2 left-2 text-[10px] font-mono text-primary-300">IMG_ID_8832</div>
                             </motion.div>

                             <div className="flex-1 space-y-6">
                                <div>
                                   <div className="text-[10px] text-primary-400 uppercase tracking-widest mb-1 font-bold">Identity Confirmed</div>
                                   <motion.h2 
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: 0.5 }}
                                      className="text-4xl font-black text-white uppercase tracking-tight"
                                   >
                                      {currentScan.student?.last_name}
                                   </motion.h2>
                                   <motion.h3 
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: 0.7 }}
                                      className="text-2xl text-slate-300 uppercase tracking-widest font-light"
                                   >
                                     {currentScan.student?.first_name}
                                   </motion.h3>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                   <motion.div 
                                     initial={{ opacity: 0 }}
                                     animate={{ opacity: 1 }}
                                     transition={{ delay: 0.9 }}
                                     className="bg-slate-900 p-3 rounded border border-slate-800"
                                   >
                                      <div className="text-[10px] text-slate-500 uppercase">Student ID</div>
                                      <div className="text-lg font-mono text-primary-300">{currentScan.student?.student_id}</div>
                                   </motion.div>
                                   <motion.div 
                                     initial={{ opacity: 0 }}
                                     animate={{ opacity: 1 }}
                                     transition={{ delay: 1.1 }}
                                     className="bg-slate-900 p-3 rounded border border-slate-800"
                                   >
                                      <div className="text-[10px] text-slate-500 uppercase">Status</div>
                                      <div className="text-lg font-mono text-green-400 flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4" /> VERIFIED
                                      </div>
                                   </motion.div>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </motion.div>
               ) : duplicateScan ? (
                 <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="text-center"
                 >
                    <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-red-500/20 border-4 border-red-500 mb-6 shadow-[0_0_50px_rgba(239,68,68,0.4)] animate-pulse">
                      <AlertTriangle className="w-16 h-16 text-red-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-red-500 uppercase tracking-widest mb-2">Duplicate Entry</h2>
                    <p className="text-slate-400 font-mono text-lg">{duplicateScan.first_name} {duplicateScan.last_name} is already logged.</p>
                 </motion.div>
               ) : (
                 <div className="text-center opacity-30">
                    <Scan className="w-24 h-24 text-slate-500 mx-auto mb-4 animate-pulse-fast" />
                    <p className="text-sm font-mono tracking-[0.3em] text-slate-400">WAITING FOR SIGNAL...</p>
                 </div>
               )}
             </AnimatePresence>
          </div>

          {/* Bottom Control / Simulation Drawer */}
          <div className="h-24 border-t border-slate-800 bg-slate-900 px-8 flex items-center justify-between">
             <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                <span className="flex items-center gap-2"><div className="w-2 h-2 bg-primary-500 rounded-full"></div> SENSOR ARRAY: ONLINE</span>
                <span className="flex items-center gap-2"><div className="w-2 h-2 bg-primary-500 rounded-full"></div> DB LINK: STABLE</span>
             </div>

             {/* HARDWARE SIMULATION INPUT */}
             <form onSubmit={handleSimulatedScan} className="flex items-center gap-2">
                <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Hardware Sim Override</label>
                <input 
                  value={simRfid}
                  onChange={(e) => setSimRfid(e.target.value)}
                  placeholder="ENTER TAG ID..."
                  className="bg-black border border-slate-700 text-green-500 font-mono px-4 py-2 rounded focus:outline-none focus:border-green-500 w-64 text-sm"
                  autoFocus
                />
             </form>
          </div>
        </div>
      </div>
    </div>
  );
};