
import React, { useState, useEffect } from 'react';
import { getSupabase } from '../supabaseClient';
import { Card, Button, TableHeader, Input } from '../components/ui';
import { Course } from '../types';
import { BarChart, FileText, Download, AlertCircle, Mail } from 'lucide-react';
import { sendReportEmail } from '../utils/emailService';

export const ReportsPage: React.FC = () => {
  const supabase = getSupabase();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  
  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    setReportData([]);

    try {
        // 1. Get all students enrolled in this course
        const { data: enrollments, error: enrollError } = await supabase
            .from('enrollments')
            .select('student_id, student:students(first_name, last_name, student_id)')
            .eq('course_id', selectedCourseId);

        if (enrollError) throw enrollError;
        if (!enrollments || enrollments.length === 0) {
            setError("No students are enrolled in this course.");
            setLoading(false);
            return;
        }

        // 2. Get total completed sessions for this course within the timeline
        let sessionQuery = supabase
            .from('sessions')
            .select('id, start_time')
            .eq('course_id', selectedCourseId)
            .eq('is_active', false);
        
        if (startDate) {
            sessionQuery = sessionQuery.gte('start_time', new Date(startDate).toISOString());
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            sessionQuery = sessionQuery.lte('start_time', end.toISOString());
        }
        
        const { data: sessions, error: sessionError } = await sessionQuery;
        if (sessionError) throw sessionError;

        const sessionIds = sessions?.map(s => s.id) || [];
        const totalSessions = sessionIds.length;

        if (totalSessions === 0) {
            setError("No completed sessions found for this course in the selected timeframe.");
            setLoading(false);
            return;
        }

        // 3. Batch fetch all attendance logs for these sessions
        let logs: any[] = [];
        if (sessionIds.length > 0) {
             const { data: logData, error: logError } = await supabase
                .from('attendance_logs')
                .select('student_id, status')
                .eq('course_id', selectedCourseId)
                .in('session_id', sessionIds);
            
             if (logError) throw logError;
             if (logData) logs = logData;
        }

        // 4. Aggregate Data in Memory
        const report = enrollments.map((e: any) => {
            const studentLogs = logs.filter(l => l.student_id === e.student_id && ['present', 'late'].includes(l.status));
            const attendedCount = studentLogs.length;
            const percentage = Math.round((attendedCount / totalSessions) * 100);

            return {
                student: e.student,
                attended: attendedCount,
                total: totalSessions,
                percentage
            };
        });

        // Sort by Last Name
        setReportData(report.sort((a, b) => a.student.last_name.localeCompare(b.student.last_name)));

    } catch (err: any) {
        console.error("Report Generation Error:", err);
        setError(err.message || "Failed to generate report.");
    } finally {
        setLoading(false);
    }
  };

  const exportCSV = () => {
    if (reportData.length === 0) return;

    const headers = ['Student ID', 'Last Name', 'First Name', 'Sessions Attended', 'Total Sessions', 'Attendance %'];
    const rows = reportData.map(r => [
        r.student.student_id,
        r.student.last_name,
        r.student.first_name,
        r.attended,
        r.total,
        `${r.percentage}%`
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `attendance_report_${selectedCourseId}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEmailReport = async () => {
    if (reportData.length === 0 || !supabase) return;
    setSendingEmail(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("No user email found");

      const courseName = courses.find(c => c.id === selectedCourseId)?.code || 'Unknown Course';
      const totalStudents = reportData.length;
      const totalAttended = reportData.filter(r => r.attended > 0).length; // Just a simple metric for the email body

      await sendReportEmail(user.email, courseName, {
        total: totalStudents,
        attended: totalAttended,
        date: new Date().toLocaleDateString()
      });
      alert(`Report sent to ${user.email}`);
    } catch (e: any) {
      alert("Failed to send email: " + e.message);
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
         <h1 className="text-3xl font-black text-slate-900 tracking-tight">Attendance Reports</h1>
         <p className="text-slate-500 mt-1">Generate detailed attendance analytics and export data.</p>
      </div>

      <Card className="p-6">
          <div className="flex flex-col xl:flex-row gap-6 items-end">
              <div className="flex-1 w-full min-w-[200px]">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Select Course</label>
                  <select 
                     className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                     value={selectedCourseId}
                     onChange={(e) => setSelectedCourseId(e.target.value)}
                  >
                      <option value="">-- Choose Course --</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                  </select>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                 <div className="w-full sm:w-40">
                     <Input 
                        type="date" 
                        label="Start Date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)} 
                        className="bg-white"
                     />
                 </div>
                 <div className="w-full sm:w-40">
                     <Input 
                        type="date" 
                        label="End Date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)} 
                        className="bg-white"
                     />
                 </div>
              </div>

              <div className="w-full xl:w-auto">
                <Button onClick={generateReport} isLoading={loading} disabled={!selectedCourseId} className="w-full xl:w-auto h-[42px]">
                    <BarChart className="w-4 h-4 mr-2" /> Generate Report
                </Button>
              </div>
          </div>
      </Card>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">{error}</span>
        </div>
      )}

      {reportData.length > 0 && (
          <Card noPadding className="animate-in fade-in slide-in-from-bottom-4">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      Results ({reportData.length} students)
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleEmailReport} isLoading={sendingEmail} className="py-1 px-3 h-8 text-xs">
                        <Mail className="w-3 h-3 mr-1" /> Email Report
                    </Button>
                    <Button variant="secondary" onClick={exportCSV} className="py-1 px-3 h-8 text-xs">
                        <Download className="w-3 h-3 mr-1" /> Export CSV
                    </Button>
                  </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                    <TableHeader headers={['Student Name', 'Matric No', 'Sessions Attended', 'Total Sessions', 'Percentage']} />
                    <tbody className="bg-white divide-y divide-slate-50">
                        {reportData.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-700">{row.student.last_name}, {row.student.first_name}</div>
                                </td>
                                <td className="px-6 py-4 font-mono text-xs text-slate-500 font-medium bg-slate-50 inline-block rounded mt-3 ml-6 mb-3 px-2 py-0.5 border border-slate-100">
                                    {row.student.student_id}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-slate-600">{row.attended}</td>
                                <td className="px-6 py-4 text-sm text-slate-500">{row.total}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-500 ${row.percentage >= 75 ? 'bg-emerald-500' : row.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                                style={{ width: `${row.percentage}%` }}
                                            ></div>
                                        </div>
                                        <span className={`text-xs font-bold w-8 ${row.percentage >= 75 ? 'text-emerald-600' : row.percentage >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                            {row.percentage}%
                                        </span>
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
