import React, { useState, useEffect } from 'react';
import { Radio, CreditCard, Play, Square, Settings, RefreshCw, Power } from 'lucide-react';
import { getSupabase } from '../supabaseClient';
import { Course, Lecturer, Student } from '../types';

export const HardwareSimulator: React.FC = () => {
  const supabase = getSupabase();
  
  // Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  // Device State
  const [selectedLecturer, setSelectedLecturer] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [deviceState, setDeviceState] = useState<'booting' | 'standby' | 'active' | 'error'>('booting');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [oledLines, setOledLines] = useState<string[]>(['> SYSTEM BOOT', '> CHECKING NET...']);
  const [leds, setLeds] = useState({ pwr: true, net: false, read: false });

  // Init
  useEffect(() => {
    const init = async () => {
      if (!supabase) return;
      setTimeout(() => setLeds(prev => ({...prev, net: true})), 1000);
      
      const [cRes, lRes, sRes, sessionRes] = await Promise.all([
        supabase.from('courses').select('*'),
        supabase.from('lecturers').select('*'),
        supabase.from('students').select('*'),
        supabase.from('sessions').select('*').eq('is_active', true).single()
      ]);

      if (cRes.data) setCourses(cRes.data as any);
      if (lRes.data) setLecturers(lRes.data as any);
      if (sRes.data) setStudents(sRes.data as any);

      if (sessionRes.data) {
        setActiveSessionId(sessionRes.data.id);
        setSelectedCourse(sessionRes.data.course_id);
        setDeviceState('active');
        setOledLines(['> SESSION ACTIVE', '> READY TO SCAN']);
      } else {
        setDeviceState('standby');
        setOledLines(['> SYSTEM READY', '> AWAITING CONFIG']);
      }
    };
    init();
  }, [supabase]);

  // Actions
  const updateScreen = (lines: string[]) => setOledLines(lines);
  const blinkRead = () => {
    setLeds(prev => ({...prev, read: true}));
    setTimeout(() => setLeds(prev => ({...prev, read: false})), 300);
  };

  const startSession = async () => {
    if (!supabase || !selectedCourse) return;
    updateScreen(['> INITIALIZING...', '> CONTACTING DB']);
    
    // Stop previous
    await supabase.from('sessions').update({ is_active: false }).eq('is_active', true);
    
    const { data } = await supabase.from('sessions').insert({
        course_id: selectedCourse,
        lecturer_id: selectedLecturer || courses.find(c => c.id === selectedCourse)?.lecturer_id,
        start_time: new Date().toISOString(),
        is_active: true
    }).select().single();

    if (data) {
        setActiveSessionId(data.id);
        setDeviceState('active');
        updateScreen(['> SESSION STARTED', '> READY TO SCAN']);
    }
  };

  const stopSession = async () => {
    if (!supabase || !activeSessionId) return;
    updateScreen(['> TERMINATING...']);
    await supabase.from('sessions').update({ is_active: false, end_time: new Date().toISOString() }).eq('id', activeSessionId);
    setActiveSessionId(null);
    setDeviceState('standby');
    updateScreen(['> SESSION ENDED', '> STANDBY MODE']);
  };

  const scanTag = async (student: Student) => {
    if (!supabase || deviceState !== 'active' || !activeSessionId) return;
    
    blinkRead();
    updateScreen(['> READING TAG...', `> ID: ${student.rfid_tag?.slice(0,6) || 'UNK'}`]);
    
    // Fake delay
    await new Promise(r => setTimeout(r, 600));

    const { error } = await supabase.from('attendance_logs').insert({
        session_id: activeSessionId,
        student_id: student.id,
        course_id: selectedCourse,
        status: 'present'
    });

    if (error) {
        if (error.code === '23505') {
             updateScreen(['> ERROR: DUPLICATE', '> ALREADY LOGGED']);
        } else {
             updateScreen(['> SYS ERROR', `> ${error.code}`]);
        }
        setDeviceState('error');
        setTimeout(() => {
          setDeviceState('active');
          updateScreen(['> READY TO SCAN']);
        }, 2000);
    } else {
        updateScreen(['> ACCESS GRANTED', `> ${student.first_name}`]);
        setTimeout(() => {
          updateScreen(['> READY TO SCAN']);
        }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center font-sans p-8">
      <div className="flex gap-12 w-full max-w-6xl items-start">
        
        {/* PHYSICAL DEVICE */}
        <div className="flex-1">
            <div className="relative aspect-[4/5] max-w-[500px] mx-auto bg-neutral-800 rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.1)] p-8 border border-neutral-700 flex flex-col gap-8">
                {/* Screw holes */}
                <div className="absolute top-6 left-6 w-3 h-3 bg-neutral-900 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] opacity-50"></div>
                <div className="absolute top-6 right-6 w-3 h-3 bg-neutral-900 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] opacity-50"></div>
                <div className="absolute bottom-6 left-6 w-3 h-3 bg-neutral-900 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] opacity-50"></div>
                <div className="absolute bottom-6 right-6 w-3 h-3 bg-neutral-900 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] opacity-50"></div>

                {/* Header */}
                <div className="flex justify-between items-center px-4">
                    <div className="flex gap-2">
                         <div className="text-[10px] font-bold text-neutral-500">PWR</div>
                         <div className={`w-2 h-2 rounded-full ${leds.pwr ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-neutral-900'}`}></div>
                    </div>
                    <div className="font-mono font-bold text-neutral-600 tracking-widest text-xs">RFID-TERMINAL V2</div>
                    <div className="flex gap-2">
                         <div className="text-[10px] font-bold text-neutral-500">NET</div>
                         <div className={`w-2 h-2 rounded-full ${leds.net ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'bg-neutral-900'}`}></div>
                    </div>
                </div>

                {/* Screen */}
                <div className="bg-black rounded-lg border-8 border-neutral-700 h-48 relative overflow-hidden p-4 shadow-[inset_0_0_20px_black]">
                    <div className="font-mono text-green-500 text-lg leading-relaxed relative z-10">
                        {oledLines.map((l,i) => <div key={i}>{l}</div>)}
                    </div>
                    {/* Scanlines */}
                    <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[size:100%_4px] opacity-30 pointer-events-none"></div>
                </div>

                {/* Sensor Area */}
                <div className="flex-1 bg-neutral-700 rounded-2xl border-2 border-neutral-600 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center relative group">
                    <Radio className={`w-24 h-24 text-neutral-500 transition-colors ${leds.read ? 'text-blue-400' : ''}`} />
                    <div className="absolute bottom-4 text-xs font-bold text-neutral-500 tracking-widest">NFC TARGET AREA</div>
                    {deviceState === 'active' && <div className="absolute inset-0 border-4 border-blue-500/20 rounded-2xl animate-pulse"></div>}
                </div>

                {/* Status Bar */}
                <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${deviceState === 'active' ? 'bg-blue-500 w-full' : deviceState === 'error' ? 'bg-red-500 w-full' : 'bg-neutral-600 w-1/3'}`}></div>
                </div>
            </div>
        </div>

        {/* CONFIG PANEL */}
        <div className="w-80 bg-neutral-800 p-6 rounded-2xl border border-neutral-700 text-white h-fit">
            <h2 className="font-bold text-lg mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5 text-neutral-400" /> Control Panel
            </h2>

            <div className="space-y-6">
                <div>
                    <label className="text-xs font-bold text-neutral-500 uppercase">Configuration</label>
                    <div className="mt-2 space-y-3">
                        <select 
                            className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm"
                            value={selectedLecturer}
                            onChange={(e) => setSelectedLecturer(e.target.value)}
                            disabled={deviceState === 'active'}
                        >
                            <option value="">Select Lecturer</option>
                            {lecturers.map(l => <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>)}
                        </select>
                        <select 
                            className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm"
                            value={selectedCourse}
                            onChange={(e) => setSelectedCourse(e.target.value)}
                            disabled={deviceState === 'active'}
                        >
                            <option value="">Select Course</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    {deviceState !== 'active' ? (
                        <button 
                            onClick={startSession}
                            disabled={!selectedCourse}
                            className="w-full bg-green-700 hover:bg-green-600 py-3 rounded font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Play className="w-4 h-4 fill-current" /> BOOT SESSION
                        </button>
                    ) : (
                        <button 
                            onClick={stopSession}
                            className="w-full bg-red-700 hover:bg-red-600 py-3 rounded font-bold text-sm flex items-center justify-center gap-2"
                        >
                            <Square className="w-4 h-4 fill-current" /> KILL SESSION
                        </button>
                    )}
                </div>

                <div className="border-t border-neutral-700 pt-6">
                    <label className="text-xs font-bold text-neutral-500 uppercase mb-3 block">Test Cards (Click to Tap)</label>
                    <div className="space-y-2">
                        {students.map(s => (
                            <button 
                                key={s.id}
                                onClick={() => scanTag(s)}
                                disabled={deviceState !== 'active'}
                                className="w-full bg-neutral-700 hover:bg-neutral-600 p-3 rounded flex items-center gap-3 text-left disabled:opacity-50"
                            >
                                <CreditCard className="w-4 h-4 text-neutral-400" />
                                <div>
                                    <div className="text-xs font-bold">{s.first_name} {s.last_name}</div>
                                    <div className="text-[10px] text-neutral-400 font-mono">{s.student_id}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};