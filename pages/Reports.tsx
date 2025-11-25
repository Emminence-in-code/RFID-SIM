import React, { useState, useEffect } from 'react';
import { getSupabase } from '../supabaseClient';
import { Card, Button, TableHeader } from '../components/ui';
import { Course } from '../types';
import { BarChart, FileText, Filter, Calendar } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const supabase = getSupabase();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState('all'); // all, 30days, semester

  useEffect(() => {
    const init = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: staff } = await supabase.from('lecturers').select('id').eq('email', user.email).single();
        if (staff) {
           const { data: c } = await supabase.from('courses').select('*').eq('lecturer_id', staff.id);
           if (c) setCourses(c as any);
        }
      }
    };
    init();
  }, [supabase]);

  const generateReport = async () => {
    if (!supabase || !selectedCourseId) return;
    setLoading(true);

    // 1. Get all students enrolled in this course
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, student:students(first_name, last_name, student_id)')
        .eq('course_id', selectedCourseId);

    if (!enrollments) {
        setLoading(false);
        return;
    }

    // 2. Get total sessions for this course
    let query = supabase.from('sessions').select('id, start_time').eq('course_id', selectedCourseId).eq('is_active', false);
    
    if (filterPeriod === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        query = query.gte('start_time', d.toISOString());
    }
    
    const { data: sessions } = await query;
    const totalSessions = sessions?.length || 0;

    // 3. For each student, count attendance
    const report = await Promise.all(enrollments.map(async (e: any) => {
        const { count } = await supabase
            .from('attendance_logs')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', e.student_id)
            .eq('course_id', selectedCourseId)
            .in('session_id', sessions?.map(s => s.id) || []); // Only count within filtered sessions

        const attended = count || 0;
        const percentage = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;

        return {
            student: e.student,
            attended,
            total: totalSessions,
            percentage
        };
    }));

    setReportData(report.sort((a, b) => a.student.last_name.localeCompare(b.student.last_name)));
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
         <h1 className="text-3xl font-black text-slate-900">Attendance Reports</h1>
         <p className="text-slate-500">Compile session data and calculate student averages.</p>
      </div>

      <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Select Course</label>
                  <select 
                     className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20"
                     value={selectedCourseId}
                     onChange={(e) => setSelectedCourseId(e.target.value)}
                  >
                      <option value="">-- Choose Course --</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                  </select>
              </div>
              
              <div className="w-full md:w-48">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Time Period</label>
                  <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <select 
                         className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 appearance-none"
                         value={filterPeriod}
                         onChange={(e) => setFilterPeriod(e.target.value)}
                      >
                          <option value="all">All Time</option>
                          <option value="30days">Last 30 Days</option>
                          <option value="semester">Current Semester</option>
                      </select>
                  </div>
              </div>

              <Button onClick={generateReport} isLoading={loading} disabled={!selectedCourseId}>
                  <BarChart className="w-4 h-4 mr-2" /> Generate
              </Button>
          </div>
      </Card>

      {reportData.length > 0 && (
          <Card noPadding>
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-slate-700">Results</h3>
                  <Button variant="secondary" className="py-1 px-3 h-8 text-xs">
                      <FileText className="w-3 h-3 mr-1" /> Export CSV
                  </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                    <TableHeader headers={['Student Name', 'Matric No', 'Sessions Attended', 'Total Sessions', 'Percentage']} />
                    <tbody className="bg-white divide-y divide-slate-50">
                        {reportData.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-bold text-slate-700">{row.student.last_name}, {row.student.first_name}</td>
                                <td className="px-6 py-4 font-mono text-xs text-slate-500">{row.student.student_id}</td>
                                <td className="px-6 py-4">{row.attended}</td>
                                <td className="px-6 py-4">{row.total}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${row.percentage >= 75 ? 'bg-green-500' : row.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                                style={{ width: `${row.percentage}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs font-bold w-8">{row.percentage}%</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </Card>
      )}
    </div>
  );
};