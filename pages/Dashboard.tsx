import React, { useEffect, useState } from 'react';
import { Users, BookOpen, Clock, UserCheck, TrendingUp, Calendar } from 'lucide-react';
import { Card } from '../components/ui';
import { getSupabase } from '../supabaseClient';
import { AttendanceLog } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({ students: 0, lecturers: 0, courses: 0, todayLogs: 0 });
  const [recentLogs, setRecentLogs] = useState<AttendanceLog[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const supabase = getSupabase();

  useEffect(() => {
    const fetchStats = async () => {
      if (!supabase) return;
      
      const [
        { count: sCount }, 
        { count: lCount }, 
        { count: cCount },
        { data: logs }
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('lecturers').select('*', { count: 'exact', head: true }),
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('attendance_logs')
          .select('*, student:students(first_name, last_name), course:courses(code, name)')
          .order('timestamp', { ascending: false })
          .limit(5)
      ]);

      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const { count: todayCount } = await supabase
        .from('attendance_logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', todayStart.toISOString());

      setStats({
        students: sCount || 0,
        lecturers: lCount || 0,
        courses: cCount || 0,
        todayLogs: todayCount || 0
      });

      setRecentLogs(logs as AttendanceLog[] || []);

      setChartData([
        { name: 'Mon', present: 40, late: 5, absent: 2 },
        { name: 'Tue', present: 35, late: 8, absent: 4 },
        { name: 'Wed', present: 45, late: 2, absent: 1 },
        { name: 'Thu', present: 30, late: 10, absent: 5 },
        { name: 'Fri', present: 42, late: 3, absent: 0 },
      ]);
    };

    fetchStats();
  }, [supabase]);

  const statCards = [
    { label: 'Total Students', value: stats.students, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Active Courses', value: stats.courses, icon: BookOpen, color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-100' },
    { label: 'Lecturers', value: stats.lecturers, icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
    { label: "Today's Scans", value: stats.todayLogs, icon: Clock, color: 'text-secondary-600', bg: 'bg-secondary-50', border: 'border-secondary-100' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your institution's performance.</p>
      </div>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, idx) => (
          <div key={idx} className={`bg-white rounded-2xl p-6 border ${stat.border} shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.bg} ${stat.color} flex items-center`}>
                <TrendingUp className="w-3 h-3 mr-1" /> +12%
              </span>
            </div>
            <div>
              <p className="text-3xl font-black text-slate-800 tracking-tight">{stat.value}</p>
              <p className="text-sm font-medium text-slate-500 mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="h-[450px] relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Weekly Attendance</h2>
                <p className="text-sm text-slate-500">Comparing presence vs absence</p>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="flex items-center gap-1 text-slate-600"><span className="w-3 h-3 rounded-full bg-primary-500"></span> Present</span>
                <span className="flex items-center gap-1 text-slate-600"><span className="w-3 h-3 rounded-full bg-amber-400"></span> Late</span>
              </div>
            </div>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 12}} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="#94a3b8" tick={{fontSize: 12}} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                    cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                  />
                  <Area type="monotone" dataKey="present" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorPresent)" />
                  <Area type="monotone" dataKey="late" stroke="#fbbf24" strokeWidth={3} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col" noPadding>
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Recent Activity</h2>
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-1 overflow-auto p-2">
              <div className="space-y-1">
                {recentLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                    <Clock className="w-10 h-10 mb-2 opacity-20" />
                    <p>No recent scans</p>
                  </div>
                ) : (
                  recentLogs.map((log) => (
                    <div key={log.id} className="group flex items-center p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm mr-3 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                        {log.student?.first_name.charAt(0)}{log.student?.last_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {log.student?.first_name} {log.student?.last_name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{log.course?.code} • {log.course?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-600">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          log.status === 'present' ? 'bg-green-100 text-green-700' : 
                          log.status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};