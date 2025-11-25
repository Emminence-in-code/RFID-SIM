import React, { useEffect, useState } from 'react';
import { Users, BookOpen, Clock, UserCheck, TrendingUp, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui';
import { getSupabase } from '../supabaseClient';
import { AttendanceLog } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Dashboard: React.FC = () => {
  const supabase = getSupabase();
  const role = localStorage.getItem('user_role');
  const isStaff = role === 'staff';
  const [loading, setLoading] = useState(true);

  // Staff State
  const [staffStats, setStaffStats] = useState({ students: 0, lecturers: 0, courses: 0, todayLogs: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  
  // Student State
  const [studentLogs, setStudentLogs] = useState<AttendanceLog[]>([]);
  const [studentStats, setStudentStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) return;
      
      if (isStaff) {
        // --- STAFF DASHBOARD DATA ---
        const [
          { count: sCount }, 
          { count: lCount }, 
          { count: cCount }
        ] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('lecturers').select('*', { count: 'exact', head: true }),
          supabase.from('courses').select('*', { count: 'exact', head: true })
        ]);

        const today = new Date();
        today.setHours(0,0,0,0);
        const { count: todayCount } = await supabase.from('attendance_logs').select('*', { count: 'exact', head: true }).gte('timestamp', today.toISOString());

        setStaffStats({ students: sCount || 0, lecturers: lCount || 0, courses: cCount || 0, todayLogs: todayCount || 0 });
        
        // Mock Chart Data for visualization
        setChartData([
          { name: 'Mon', present: 40, late: 5 }, { name: 'Tue', present: 35, late: 8 },
          { name: 'Wed', present: 45, late: 2 }, { name: 'Thu', present: 30, late: 10 },
          { name: 'Fri', present: 42, late: 3 },
        ]);

      } else {
        // --- STUDENT DASHBOARD DATA ---
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Get Student ID first
          const { data: student } = await supabase.from('students').select('id').eq('email', user.email).single();
          
          if (student) {
            const { data: logs } = await supabase
              .from('attendance_logs')
              .select('*, course:courses(code, name, lecturer:lecturers(first_name, last_name))')
              .eq('student_id', student.id)
              .order('timestamp', { ascending: false });

            if (logs) {
              setStudentLogs(logs as any);
              const present = logs.filter(l => l.status === 'present').length;
              const late = logs.filter(l => l.status === 'late').length;
              const absent = logs.filter(l => l.status === 'absent').length;
              setStudentStats({ present, late, absent, total: logs.length });
            }
          }
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [supabase, isStaff]);

  if (loading) return <div className="text-slate-500">Loading dashboard...</div>;

  // --- RENDER STAFF ---
  if (isStaff) {
    const cards = [
      { label: 'Total Students', value: staffStats.students, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Staff Members', value: staffStats.lecturers, icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
      { label: 'Total Courses', value: staffStats.courses, icon: BookOpen, color: 'text-primary-600', bg: 'bg-primary-50' },
      { label: "Today's Scans", value: staffStats.todayLogs, icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    return (
      <div className="space-y-8">
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Overview</h1>
           <p className="text-slate-500">System status and general statistics.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
           {cards.map((c, i) => (
             <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                   <p className="text-3xl font-black text-slate-800">{c.value}</p>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{c.label}</p>
                </div>
                <div className={`p-3 rounded-xl ${c.bg}`}>
                   <c.icon className={`w-6 h-6 ${c.color}`} />
                </div>
             </div>
           ))}
        </div>
        <Card className="h-[400px] p-6">
           <h3 className="text-lg font-bold mb-6">Attendance Trends (Weekly)</h3>
           <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <Tooltip />
                <Area type="monotone" dataKey="present" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} />
             </AreaChart>
           </ResponsiveContainer>
        </Card>
      </div>
    );
  }

  // --- RENDER STUDENT ---
  return (
    <div className="space-y-8">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Attendance</h1>
            <p className="text-slate-500">Track your class participation history.</p>
          </div>
          <div className="flex gap-4">
             <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <div>
                   <div className="text-xs text-slate-400 font-bold uppercase">Present</div>
                   <div className="text-lg font-bold">{studentStats.present}</div>
                </div>
             </div>
             <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <div>
                   <div className="text-xs text-slate-400 font-bold uppercase">Late</div>
                   <div className="text-lg font-bold">{studentStats.late}</div>
                </div>
             </div>
          </div>
       </div>

       <Card noPadding>
          <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                   <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Course</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Lecturer</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                   {studentLogs.length === 0 ? (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-400">No attendance records found.</td></tr>
                   ) : studentLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                         <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            {new Date(log.timestamp).toLocaleDateString()} <span className="text-slate-400">at</span> {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            <span className="font-mono font-bold text-primary-600 mr-2">{log.course?.code}</span>
                            {log.course?.name}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {log.course?.lecturer?.first_name} {log.course?.lecturer?.last_name}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                               log.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                               log.status === 'late' ? 'bg-amber-100 text-amber-700' :
                               'bg-red-100 text-red-700'
                            }`}>
                               {log.status}
                            </span>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </Card>
    </div>
  );
};