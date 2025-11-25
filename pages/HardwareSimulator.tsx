import React, { useState, useEffect } from 'react';
import { Radio, CreditCard, Play, Square, Settings, Grid, Delete, WifiOff, Cpu, Barcode } from 'lucide-react';
import { getSupabase } from '../supabaseClient';
import { Course, Lecturer, Student } from '../types';

export const HardwareSimulator: React.FC = () => {
  const supabase = getSupabase();
  
  // Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]); // Filtered list
  
  // Device State
  const [inputBuffer, setInputBuffer] = useState('');
  const [deviceState, setDeviceState] = useState<'booting' | 'idle' | 'enter_id' | 'select_course' | 'active' | 'error' | 'offline'>('booting');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [currentStaff, setCurrentStaff] = useState<Lecturer | null>(null);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [isScanningLock, setIsScanningLock] = useState(false);
  
  const [oledLines, setOledLines] = useState<string[]>(['> SYSTEM BOOT...']);
  const [leds, setLeds] = useState({ pwr: true, net: false, read: false });

  // Init
  useEffect(() => {
    const init = async () => {
      if (!supabase) {
        setDeviceState('offline');
        setOledLines(['> NO NETWORK', '> CHECK CONFIG']);
        return;
      }
      
      try {
        setTimeout(() => setLeds(prev => ({...prev, net: true})), 1000);
        
        const [cRes, sRes, sessionRes] = await Promise.all([
          supabase.from('courses').select('*'),
          supabase.from('students').select('*'),
          supabase.from('sessions').select('*').eq('is_active', true).single()
        ]);

        if (cRes.error) throw cRes.error;
        if (sRes.error) throw sRes.error;

        if (cRes.data) setCourses(cRes.data as any);
        if (sRes.data) setAllStudents(sRes.data as any);

        if (sessionRes.data) {
          // Resume session
          const sess = sessionRes.data;
          setActiveSessionId(sess.id);
          setActiveCourseId(sess.course_id);
          setDeviceState('active');
          setOledLines(['> SESSION ACTIVE', '> READY TO SCAN']);
          
          // Fetch enrolled students for this course immediately
          fetchEnrollments(sess.course_id, sRes.data as any);
        } else {
          setDeviceState('idle');
          setOledLines(['> WELCOME', '> PRESS # TO START']);
        }
      } catch (e) {
        console.error("Hardware Init Failed", e);
        setDeviceState('offline');
        setOledLines(['> NETWORK ERROR', '> RETRY LATER']);
        setLeds(prev => ({...prev, net: false}));
      }
    };
    init();
  }, [supabase]);

  const fetchEnrollments = async (courseId: string, studentsList: Student[]) => {
      if (!supabase) return;
      // Get student IDs enrolled in this course
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('course_id', courseId);
      
      if (enrollments) {
          const enrolledIds = new Set(enrollments.map(e => e.student_id));
          const filtered = studentsList.filter(s => enrolledIds.has(s.id));
          setEnrolledStudents(filtered);
      } else {
          setEnrolledStudents([]);
      }
  };

  // Actions
  const updateScreen = (lines: string[]) => setOledLines(lines);
  const blinkRead = () => {
    setLeds(prev => ({...prev, read: true}));
    setTimeout(() => setLeds(prev => ({...prev, read: false})), 300);
  };

  const handleKeypad = async (key: string) => {
    if (deviceState === 'offline') return;

    if (deviceState === 'idle') {
        if (key === '#') {
            setDeviceState('enter_id');
            setInputBuffer('');
            updateScreen(['ENTER STAFF ID:', 'SMAF/____']);
        }
        return;
    }

    if (deviceState === 'enter_id') {
        if (key === 'C') {
            setInputBuffer(prev => prev.slice(0, -1));
            updateScreen(['ENTER STAFF ID:', `SMAF/${inputBuffer.slice(0, -1)}`]);
        } else if (key === '#') {
            // Submit ID
            if (inputBuffer.length !== 4) {
                updateScreen(['INVALID ID LENGTH', 'TRY AGAIN']);
                setTimeout(() => {
                    setInputBuffer('');
                    updateScreen(['ENTER STAFF ID:', 'SMAF/____']);
                }, 1500);
                return;
            }
            // Fetch Staff
            updateScreen(['VERIFYING ID...']);
            try {
                const fullId = `SMAF/${inputBuffer}`;
                const { data: staff } = await supabase!.from('lecturers').select('*').eq('staff_id', fullId).single();
                
                if (staff) {
                    setCurrentStaff(staff);
                    // Fetch courses for this staff
                    const { data: myCourses } = await supabase!.from('courses').select('*').eq('lecturer_id', staff.id);
                    if (myCourses && myCourses.length > 0) {
                        setAvailableCourses(myCourses as any);
                        setDeviceState('select_course');
                        updateScreen(['SELECT COURSE (1-9):', ...myCourses.slice(0, 3).map((c, i) => `${i+1}. ${c.code}`)]);
                    } else {
                        updateScreen(['NO COURSES FOUND', 'FOR THIS ID']);
                        setTimeout(() => {
                            setDeviceState('idle');
                            updateScreen(['> WELCOME', '> PRESS # TO START']);
                        }, 2000);
                    }
                } else {
                    updateScreen(['ID NOT FOUND']);
                    setTimeout(() => {
                        setInputBuffer('');
                        setDeviceState('idle');
                        updateScreen(['> WELCOME', '> PRESS # TO START']);
                    }, 2000);
                }
            } catch (e) {
                updateScreen(['> NET ERROR']);
                setTimeout(() => setDeviceState('idle'), 2000);
            }
        } else if (/^\d$/.test(key)) {
             if (inputBuffer.length < 4) {
                 const newVal = inputBuffer + key;
                 setInputBuffer(newVal);
                 updateScreen(['ENTER STAFF ID:', `SMAF/${newVal}`]);
             }
        }
        return;
    }

    if (deviceState === 'select_course') {
        const idx = parseInt(key) - 1;
        if (idx >= 0 && idx < availableCourses.length) {
            const selected = availableCourses[idx];
            await startSession(selected.id);
        }
        return;
    }

    if (deviceState === 'active') {
        if (key === '*') {
            // End session
            await stopSession();
        }
    }
  };

  const startSession = async (courseId: string) => {
    if (!supabase || !currentStaff) return;
    updateScreen(['> INITIALIZING...', '> CONTACTING DB']);
    
    try {
        // Stop previous
        await supabase.from('sessions').update({ is_active: false }).eq('is_active', true);
        
        const { data } = await supabase.from('sessions').insert({
            course_id: courseId,
            lecturer_id: currentStaff.id,
            start_time: new Date().toISOString(),
            is_active: true
        }).select().single();

        if (data) {
            setActiveSessionId(data.id);
            setActiveCourseId(courseId);
            setDeviceState('active');
            updateScreen(['> SESSION STARTED', '> READY TO SCAN', '> PRESS * TO END']);
            
            // Filter students for this course
            fetchEnrollments(courseId, allStudents);
        }
    } catch (e) {
        updateScreen(['> ERROR STARTING', '> RETRYING...']);
        setTimeout(() => setDeviceState('idle'), 2000);
    }
  };

  const stopSession = async () => {
    if (!supabase || !activeSessionId) return;
    updateScreen(['> TERMINATING...']);
    await supabase.from('sessions').update({ is_active: false, end_time: new Date().toISOString() }).eq('id', activeSessionId);
    setActiveSessionId(null);
    setActiveCourseId(null);
    setEnrolledStudents([]);
    setDeviceState('idle');
    updateScreen(['> SESSION ENDED', '> PRESS # TO START']);
  };

  const scanTag = async (student: Student) => {
    if (isScanningLock) return; // Prevent double taps
    if (!supabase || deviceState !== 'active' || !activeSessionId || !activeCourseId) {
        if (!activeCourseId) updateScreen(['> ERROR: NO COURSE', '> RESTART SESSION']);
        return;
    }
    
    setIsScanningLock(true);
    blinkRead();
    updateScreen(['> READING TAG...', `> ID: ${student.rfid_tag?.slice(0,6) || 'UNK'}`]);
    
    // Fake delay
    await new Promise(r => setTimeout(r, 600));

    try {
        // STRICT DOUBLE ENTRY CHECK
        // 1. Check DB for existing log in this session
        const { data: existing } = await supabase
            .from('attendance_logs')
            .select('id')
            .eq('session_id', activeSessionId)
            .eq('student_id', student.id)
            .single();

        if (existing) {
             updateScreen(['> ERROR: DUPLICATE', '> ALREADY LOGGED']);
             setTimeout(() => {
                updateScreen(['> SESSION ACTIVE', '> READY TO SCAN']);
                setIsScanningLock(false);
             }, 1500);
             return;
        }

        // 2. Insert
        const { error } = await supabase.from('attendance_logs').insert({
            session_id: activeSessionId,
            student_id: student.id,
            course_id: activeCourseId,
            status: 'present'
        });

        if (error) {
            if (error.code === '23505') {
                updateScreen(['> ERROR: DUPLICATE', '> ALREADY LOGGED']);
            } else {
                console.error(error);
                updateScreen(['> SYS ERROR', `> ${error.code || 'UNKNOWN'}`]);
            }
        } else {
            updateScreen(['> ACCESS GRANTED', `> ${student.first_name}`]);
        }
        
        // Reset screen after delay
        setTimeout(() => {
            updateScreen(['> SESSION ACTIVE', '> READY TO SCAN']);
            setIsScanningLock(false);
        }, 1500);

    } catch (e) {
        updateScreen(['> CONNECTION LOST']);
        setIsScanningLock(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center font-sans p-8">
      <div className="flex flex-col md:flex-row gap-12 w-full max-w-7xl items-start justify-center">
        
        {/* PHYSICAL DEVICE */}
        <div className="flex-shrink-0 w-full max-w-[400px] mx-auto md:mx-0">
            <div className="relative bg-neutral-800 rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.1)] p-8 border border-neutral-700 flex flex-col gap-6 sticky top-8">
                
                {/* Header */}
                <div className="flex justify-between items-center px-2">
                    <div className="flex gap-2 items-center">
                         <div className={`w-2 h-2 rounded-full ${leds.pwr ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-neutral-900'}`}></div>
                         <div className="text-[10px] font-bold text-neutral-500">PWR</div>
                    </div>
                    <div className="font-mono font-bold text-neutral-600 tracking-widest text-xs">RFID-TERMINAL</div>
                    <div className="flex gap-2 items-center">
                         <div className="text-[10px] font-bold text-neutral-500">NET</div>
                         <div className={`w-2 h-2 rounded-full ${leds.net ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'bg-red-500'}`}></div>
                    </div>
                </div>

                {/* Smaller OLED Screen */}
                <div className="bg-black rounded border-4 border-neutral-700 h-24 relative overflow-hidden p-3 shadow-[inset_0_0_20px_black]">
                    <div className="font-mono text-green-500 text-sm leading-snug relative z-10">
                        {oledLines.map((l,i) => <div key={i}>{l}</div>)}
                    </div>
                    <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[size:100%_2px] opacity-30 pointer-events-none"></div>
                </div>

                {/* Sensor Area */}
                <div className="bg-neutral-700 h-32 rounded-xl border-2 border-neutral-600 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center relative group">
                    <Radio className={`w-16 h-16 text-neutral-500 transition-colors ${leds.read ? 'text-blue-400' : ''}`} />
                    <div className="absolute bottom-2 text-[10px] font-bold text-neutral-500 tracking-widest">TAP CARD HERE</div>
                    {deviceState === 'active' && <div className="absolute inset-0 border-4 border-blue-500/20 rounded-xl animate-pulse"></div>}
                </div>

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-3 px-4">
                    {[1,2,3,4,5,6,7,8,9].map(n => (
                        <button key={n} onClick={() => handleKeypad(n.toString())} className="h-10 bg-neutral-700 rounded shadow-[0_4px_0_#404040] active:shadow-none active:translate-y-[4px] text-white font-mono font-bold hover:bg-neutral-600 transition-colors">
                            {n}
                        </button>
                    ))}
                    <button onClick={() => handleKeypad('C')} className="h-10 bg-red-900/50 rounded shadow-[0_4px_0_#450a0a] active:shadow-none active:translate-y-[4px] text-red-200 font-bold hover:bg-red-900/70 text-xs">CLR</button>
                    <button onClick={() => handleKeypad('0')} className="h-10 bg-neutral-700 rounded shadow-[0_4px_0_#404040] active:shadow-none active:translate-y-[4px] text-white font-mono font-bold hover:bg-neutral-600">0</button>
                    <button onClick={() => handleKeypad(deviceState === 'active' ? '*' : '#')} className="h-10 bg-green-900/50 rounded shadow-[0_4px_0_#052e16] active:shadow-none active:translate-y-[4px] text-green-200 font-bold hover:bg-green-900/70 text-xs">
                        {deviceState === 'active' ? 'END' : 'ENT'}
                    </button>
                </div>
            </div>
        </div>

        {/* TEST CARDS PANEL */}
        <div className="flex-1 w-full bg-neutral-800 p-6 rounded-2xl border border-neutral-700 text-white min-h-[500px]">
            <h2 className="font-bold text-lg mb-2 flex items-center gap-2 text-white">
                <Settings className="w-5 h-5" /> Test Cards
            </h2>
            <p className="text-neutral-400 text-sm mb-6">
                {deviceState === 'active' 
                    ? `Showing ${enrolledStudents.length} students enrolled in active course.`
                    : "Start a session to see enrolled student cards."}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {deviceState === 'active' && enrolledStudents.length === 0 && (
                    <div className="col-span-full text-center py-10 text-neutral-500 italic border border-dashed border-neutral-700 rounded-xl">
                        No students enrolled in this course.
                    </div>
                )}
                
                {deviceState !== 'active' && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-neutral-500 gap-4 border border-dashed border-neutral-700 rounded-xl">
                        <CreditCard className="w-12 h-12 opacity-20" />
                        <p>Waiting for Session Start...</p>
                    </div>
                )}

                {deviceState === 'active' && enrolledStudents.map(s => (
                    <button 
                        key={s.id}
                        onClick={() => scanTag(s)}
                        disabled={isScanningLock}
                        className="relative bg-white text-slate-900 rounded-xl shadow-lg overflow-hidden group hover:-translate-y-1 transition-transform duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {/* ID Card Header */}
                        <div className="h-3 bg-blue-600 w-full"></div>
                        
                        <div className="p-4 flex gap-3">
                            {/* Photo */}
                            <div className="w-16 h-20 bg-slate-200 rounded-md shrink-0 overflow-hidden border border-slate-300">
                                {s.photo_url ? (
                                    <img src={s.photo_url} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl">
                                        {s.first_name[0]}{s.last_name[0]}
                                    </div>
                                )}
                            </div>
                            
                            {/* Details */}
                            <div className="min-w-0 flex-1 flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-sm leading-tight truncate">{s.first_name} {s.last_name}</h3>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">{s.student_id}</p>
                                </div>
                                
                                <div className="flex items-end justify-between mt-2">
                                     <div className="flex flex-col">
                                         <span className="text-[8px] text-slate-400 uppercase font-bold">RFID TAG</span>
                                         <span className="text-[10px] font-mono text-slate-700 tracking-wider">{s.rfid_tag?.slice(0,6)}...</span>
                                     </div>
                                     <Cpu className="w-6 h-6 text-yellow-500 opacity-80" />
                                </div>
                            </div>
                        </div>

                        {/* Barcode Strip */}
                        <div className="bg-slate-50 px-4 py-1 border-t border-slate-100 flex justify-between items-center">
                            <Barcode className="w-16 h-4 text-slate-300" />
                            <div className="text-[8px] font-bold text-blue-600 uppercase tracking-widest">STUDENT</div>
                        </div>

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors flex items-center justify-center">
                             <div className="bg-white/90 backdrop-blur text-blue-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                                 TAP TO SCAN
                             </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};