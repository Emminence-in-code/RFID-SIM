import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';
import { Card, Button, Input, TableHeader, Modal } from '../components/ui';
import { getSupabase } from '../supabaseClient';
import { Student } from '../types';

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<Student>>({});
  const supabase = getSupabase();

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

  const handleSave = async () => {
    if (!supabase) return;
    try {
      if (currentStudent.id) {
        await supabase.from('students').update(currentStudent).eq('id', currentStudent.id);
      } else {
        await supabase.from('students').insert([currentStudent]);
      }
      setIsModalOpen(false);
      fetchStudents();
    } catch (error) {
      console.error(error);
      alert('Error saving student');
    }
  };

  const handleDelete = async (id: string) => {
    if (!supabase || !confirm('Are you sure you want to delete this student?')) return;
    await supabase.from('students').delete().eq('id', id);
    fetchStudents();
  };

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
          <p className="text-slate-500 mt-1">Manage enrollments and RFID assignments.</p>
        </div>
        <Button onClick={() => { setCurrentStudent({}); setIsModalOpen(true); }} className="shadow-primary-500/30">
          <Plus className="w-5 h-5 mr-2" />
          Add New Student
        </Button>
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
            <TableHeader headers={['Student ID', 'Full Name', 'Email Address', 'RFID Tag', 'Actions']} />
            <tbody className="bg-white divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading directory...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No students found.</td></tr>
              ) : filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-slate-600">
                    {student.student_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold mr-3 group-hover:bg-white group-hover:shadow-sm transition-all">
                        {student.first_name.charAt(0)}{student.last_name.charAt(0)}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setCurrentStudent(student); setIsModalOpen(true); }} 
                        className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(student.id)} 
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentStudent.id ? 'Edit Student Details' : 'Register New Student'}>
        <div className="space-y-5">
          <Input 
            label="Student ID" 
            value={currentStudent.student_id || ''} 
            onChange={e => setCurrentStudent({...currentStudent, student_id: e.target.value})}
            placeholder="e.g. S123456"
          />
          <div className="grid grid-cols-2 gap-5">
            <Input 
              label="First Name" 
              value={currentStudent.first_name || ''} 
              onChange={e => setCurrentStudent({...currentStudent, first_name: e.target.value})}
            />
            <Input 
              label="Last Name" 
              value={currentStudent.last_name || ''} 
              onChange={e => setCurrentStudent({...currentStudent, last_name: e.target.value})}
            />
          </div>
          <Input 
            label="Email Address" 
            type="email"
            value={currentStudent.email || ''} 
            onChange={e => setCurrentStudent({...currentStudent, email: e.target.value})}
          />
          <div>
            <Input 
              label="RFID Tag Number" 
              value={currentStudent.rfid_tag || ''} 
              onChange={e => setCurrentStudent({...currentStudent, rfid_tag: e.target.value})}
              placeholder="Scan card to auto-fill..."
            />
            <p className="text-xs text-slate-500 mt-1 ml-1">Place cursor in box and scan card.</p>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Student</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};