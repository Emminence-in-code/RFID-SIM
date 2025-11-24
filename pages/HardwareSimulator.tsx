import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Power, Wifi, Radio, Zap, Settings, Play, Square, CreditCard, RefreshCw } from 'lucide-react';
import { getSupabase } from '../supabaseClient';
import { Course, Lecturer, Student } from '../types';

export const HardwareSimulator: React.FC = () => {
  const supabase = getSupabase();
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  // Setup State
  const [selectedLecturer, setSelectedLecturer] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  
  // Device State
  const [deviceState, setDeviceState] = useState<'off' | 'standby' | 'active' | 'error'>('standby');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [oledLines, setOledLines] = useState<string[]>(['> SYSTEM READY', '> WAITING FOR CONFIG']);
  const [leds, setLeds] = useState({ power: true, net: false, act: false });
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Initialization ---
  useEffect(() => {
    const init = async () => {
      if (!supabase) return;
      
      // Simulate network boot
      setTimeout(() => setLeds(prev => ({ ...prev, net: true })), 1500);

      const [cRes, lRes, sRes, sessionRes] = await Promise.all([
        supabase.from('courses').select('*'),
        supabase.from('lecturers').select('*'),
        supabase.from('students').select('*'),
        supabase.from('sessions').select('*').eq('is_active', true).single()
      ]);

      if (cRes.data) setCourses(cRes.data as any);
      if (lRes.data) setLecturers(lRes.data as any);
      if (sRes.data) setStudents(sRes.data as any);

      // Restore session if exists
      if (sessionRes.data) {
        setActiveSessionId(sessionRes.data.id);
        setSelectedCourse(sessionRes.data.course_id);
        setSelectedLecturer(sessionRes.data.lecturer_id);
        setDeviceState('active');
        updateOled(['> SESSION RESTORED', '> READY TO SCAN']);
      }

      setLoading(false);
    };
    init();
  }, [supabase]);

  // --- Logic ---

  const updateOled = (lines: string[]) => {
    setOledLines(lines);
  };

  const blinkLed = (led: 'net' | 'act', duration = 200) => {
    setLeds(prev => ({ ...prev, [led]: true }));
    setTimeout(() => setLeds(prev => ({ ...prev, [led]: false })), duration);
  };

  const handleStartSession = async () => {
    if (!supabase || !selectedCourse || !selectedLecturer) return;
    
    setIsProcessing(true);
    updateOled(['> INITIALIZING...', '> CONTACTING SERVER']);
    blinkLed('net', 1000);

    // Stop any existing
    await supabase.from('sessions').update({ is_active: false }).eq('is_active', true);

    const { data, error } = await supabase.from('sessions').insert({
      course_id: selectedCourse,
      lecturer_id: selectedLecturer,
      start_time: new Date().toISOString(),
      is_active: true
    }).select().single();

    setIsProcessing(false);

    if (error) {
      console.error("Session Start Error:", error);
      updateOled(['> ERROR: INIT FAILED', `> ${error.code || 'UNKNOWN'}`]);
      setDeviceState('error');
    } else {
      setActiveSessionId(data.id);
      setDeviceState('active');
      const courseCode = courses.find(c => c.id === selectedCourse)?.code || 'UNK';
      updateOled(['> SESSION ACTIVE', `> COURSE: ${courseCode}`, '> READY FOR INPUT']);
    }
  };

  const handleStopSession = async () => {
    if (!supabase || !activeSessionId) return;
    
    setIsProcessing(true);
    updateOled(['> TERMINATING...', '> UPLOADING LOGS']);
    blinkLed('net', 1000);

    await supabase.from('sessions').update({ 
      is_active: false,
      end_time: new Date().toISOString()
    }).eq('id', activeSessionId);

    setActiveSessionId(null);
    setDeviceState('standby');
    setIsProcessing(false);
    updateOled(['> SESSION ENDED', '> SYSTEM STANDBY']);
  };

  const handleScan = async (student: Student) => {
    if (!supabase || !activeSessionId || isProcessing) return;
    
    setIsProcessing(true);
    blinkLed('act', 500);
    updateOled(['> READING TAG...', `> ID: ${student.rfid_tag || 'UNKNOWN'}`]);

    // Artificial delay for realism
    await new Promise(r => setTimeout(r, 600));

    // Attempt Insert
    const { error } = await supabase.from('attendance_logs').insert({
      session_id: activeSessionId,
      student_id: student.id,
      course_id: selectedCourse,
      status: 'present'
    });

    if (error) {
      setDeviceState('error');
      if (error.code === '23505') { // Postgres duplicate key error
        updateOled(['> ERROR: DUPLICATE', '> ALREADY LOGGED']);
      } else {
        console.error("Scan Error:", error);
        updateOled(['> SYSTEM ERROR', `> CODE: ${error.code}`]);
      }
      
      // Play error sound effect visual
      setTimeout(() => {
        setDeviceState('active');
        const courseCode = courses.find(c => c.id === selectedCourse)?.code || 'UNK';
        updateOled(['> SESSION ACTIVE', `> COURSE: ${courseCode}`]);
      }, 2000);
    } else {
      updateOled(['> ID VERIFIED', `> ${student.first_name.toUpperCase()}`, '> ENTRY RECORDED']);
      setTimeout(() => {
        const courseCode = courses.find(c => c.id === selectedCourse)?.code || 'UNK';
        updateOled(['> SESSION ACTIVE', `> COURSE: ${courseCode}`]);
      }, 2000);
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row text-slate-200 overflow-hidden font-sans">
      
      {/* --- LEFT: DEVICE SIMULATION --- */}
      <div className="flex-1 flex items-center justify-center p-8 relative bg-gradient-to-br from-slate-900 to-slate-950">
         {/* Background Grid */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
         
         {/* THE DEVICE */}
         <div className="relative w-full max-w-xl aspect-[4/3] bg-slate-800 rounded-3xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] border border-slate-700/50 flex flex-col p-8 z-10 overflow-hidden">
            
            {/* Texture Overlay */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum-dark.png')] opacity-50 mix-blend-overlay pointer-events-none"></div>
            
            {/* Top Branding / Screws */}
            <div className="flex justify-between items-center mb-8 opacity-50">
               <div className="w-3 h-3 rounded-full bg-slate-600 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5),1px_1px_0_rgba(255,255,255,0.1)]"></div>
               <div className="text-xs font-black tracking-[0.3em] text-slate-400">RFID-PRO MK-II</div>
               <div className="w-3 h-3 rounded-full bg-slate-600 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5),1px_1px_0_rgba(255,255,255,0.1)]"></div>
            </div>

            {/* Main Interface Area */}
            <div className="flex-1 flex gap-8">
               
               {/* Left: OLED SCREEN */}
               <div className="flex-1 bg-black rounded-xl border-4 border-slate-700 shadow-[inset_0_0_20px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col p-4">
                  {/* Screen Glare */}
                  <div className="absolute top-0 right-0 w-full h-2/3 bg-gradient-to-b from-white/5 to-transparent skew-y-12 pointer-events-none"></div>
                  
                  {/* Content */}
                  <div className="flex-1 font-digital text-green-500 text-lg leading-relaxed relative z-10">
                     {oledLines.map((line, i) => (
                       <div key={i} className="animate-pulse">{line}</div>
                     ))}
                     {isProcessing && <div className="mt-2 animate-pulse">_</div>}
                  </div>

                  {/* Scanlines */}
                  <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[size:100%_4px] pointer-events-none opacity-50"></div>
               </div>

               {/* Right: Controls & LEDs */}
               <div className="w-24 flex flex-col items-center gap-6 py-2">
                  {/* Status LEDs */}
                  <div className="space-y-3 w-full">
                     <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                        <span>PWR</span>
                        <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] transition-colors duration-300 ${leds.power ? 'bg-green-500 text-green-500' : 'bg-slate-700'}`}></div>
                     </div>
                     <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                        <span>NET</span>
                        <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] transition-colors duration-100 ${leds.net ? 'bg-blue-500 text-blue-500' : 'bg-slate-700'}`}></div>
                     </div>
                     <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                        <span>ACT</span>
                        <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] transition-colors duration-100 ${deviceState === 'error' ? 'bg-red-500 text-red-500' : leds.act ? 'bg-amber-500 text-amber-500' : 'bg-slate-700'}`}></div>
                     </div>
                  </div>

                  {/* RFID Icon / Contact Point */}
                  <div className="mt-auto w-20 h-20 rounded-full border-2 border-slate-600 flex items-center justify-center opacity-50 relative group">
                     <Radio className="w-10 h-10 text-slate-500 group-hover:text-primary-400 transition-colors" />
                     {deviceState === 'active' && (
                       <div className="absolute inset-0 border-2 border-primary-500 rounded-full animate-ping opacity-20"></div>
                     )}
                  </div>
               </div>
            </div>

            {/* Bottom Screws */}
            <div className="flex justify-between items-center mt-8 opacity-50">
               <div className="w-3 h-3 rounded-full bg-slate-600 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5),1px_1px_0_rgba(255,255,255,0.1)]"></div>
               <div className="w-3 h-3 rounded-full bg-slate-600 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5),1px_1px_0_rgba(255,255,255,0.1)]"></div>
            </div>
         </div>
      </div>

      {/* --- RIGHT: CONFIG PANEL --- */}
      <div className="w-full lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col z-20 shadow-2xl">
         <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <h2 className="text-xl font-bold flex items-center gap-3">
               <Settings className="w-5 h-5 text-primary-500" /> 
               <span>Device Config</span>
            </h2>
         </div>
         
         <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Session Controls */}
            <div className="space-y-4">
               <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Session Parameters</h3>
               
               <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Select Lecturer</label>
                  <select 
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all disabled:opacity-50"
                    value={selectedLecturer}
                    onChange={(e) => setSelectedLecturer(e.target.value)}
                    disabled={deviceState === 'active'}
                  >
                     <option value="">-- Choose Personnel --</option>
                     {lecturers.map(l => (
                       <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
                     ))}
                  </select>
               </div>

               <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Select Course</label>
                  <select 
                     className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all disabled:opacity-50"
                     value={selectedCourse}
                     onChange={(e) => setSelectedCourse(e.target.value)}
                     disabled={deviceState === 'active'}
                  >
                     <option value="">-- Choose Protocol --</option>
                     {courses.filter(c => !selectedLecturer || c.lecturer_id === selectedLecturer).map(c => (
                       <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                     ))}
                  </select>
               </div>

               {deviceState !== 'active' ? (
                  <button 
                    onClick={handleStartSession}
                    disabled={!selectedCourse || !selectedLecturer || isProcessing}
                    className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-900/20 hover:shadow-green-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                     <Play className="w-4 h-4 fill-current" /> BOOT SESSION
                  </button>
               ) : (
                  <button 
                    onClick={handleStopSession}
                    disabled={isProcessing}
                    className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-900/20 hover:shadow-red-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                     <Square className="w-4 h-4 fill-current" /> END SESSION
                  </button>
               )}
            </div>

            {/* Simulation Cards */}
            {deviceState === 'active' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Test Subjects</h3>
                    <RefreshCw className="w-3 h-3 text-slate-600 cursor-pointer hover:text-white" onClick={() => {/* refresh logic */}} />
                 </div>
                 <p className="text-xs text-slate-400">Tap a card to simulate an RFID scan.</p>
                 
                 <div className="grid grid-cols-1 gap-3">
                    {students.map((student) => (
                       <button
                          key={student.id}
                          onClick={() => handleScan(student)}
                          disabled={isProcessing}
                          className="group relative bg-slate-800 p-4 rounded-xl border border-slate-700 text-left hover:border-primary-500 hover:bg-slate-750 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                       >
                          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                             <CreditCard className="w-12 h-12 -rotate-12" />
                          </div>
                          <div className="relative z-10">
                             <div className="text-sm font-bold text-white">{student.first_name} {student.last_name}</div>
                             <div className="text-xs text-slate-500 font-mono mt-1">{student.student_id}</div>
                             <div className="text-[10px] text-primary-400 font-mono mt-2 flex items-center gap-1">
                                <Wifi className="w-3 h-3" /> RFID: {student.rfid_tag?.substring(0, 8)}...
                             </div>
                          </div>
                       </button>
                    ))}
                 </div>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};