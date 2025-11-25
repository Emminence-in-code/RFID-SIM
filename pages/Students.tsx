import React, { useEffect, useState } from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { Card, Button, TableHeader } from '../components/ui';
import { getSupabase } from '../supabaseClient';
import { Student } from '../types';

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const supabase = getSupabase();
  const isStaff = localStorage.getItem('user_role') === 'staff';

  const fetchStudents = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase.from('students').select('*').order('last_name');
    if (data) setStudents(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = students.filter(s => 
    s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.student_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Student Directory</h1>
          <p className="text-slate-500 mt-1">Registered students database.</p>
        </div>
      </div>

      <Card className="overflow-hidden" noPadding>
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="secondary" className="hidden sm:flex">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <TableHeader headers={['Student ID', 'Full Name', 'Email Address', 'RFID Tag']} />
            <tbody className="bg-white divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400">Loading directory...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400">No students found.</td></tr>
              ) : filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-slate-600">
                    {student.student_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold mr-3 overflow-hidden">
                        {student.photo_url ? <img src={student.photo_url} className="w-full h-full object-cover"/> : `${student.first_name[0]}${student.last_name[0]}`}
                      </div>
                      <span className="text-sm font-bold text-slate-900">{student.first_name} {student.last_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{student.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {student.rfid_tag ? (
                      <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-mono border border-green-100">
                        {student.rfid_tag}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-xs">Not Assigned</span>
                    )}
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