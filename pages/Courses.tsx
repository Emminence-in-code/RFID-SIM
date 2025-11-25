import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Book, UserPlus } from 'lucide-react';
import { Card, Button, Input, TableHeader, Modal } from '../components/ui';
import { getSupabase } from '../supabaseClient';
import { Course, Lecturer } from '../types';

export const CoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [current, setCurrent] = useState<Partial<Course>>({});
  const supabase = getSupabase();
  const role = localStorage.getItem('user_role');
  const isStaff = role === 'staff';
  const [currentStaffId, setCurrentStaffId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!supabase) return;
    const { data: cData } = await supabase.from('courses').select('*, lecturer:lecturers(first_name, last_name)');
    if (cData) setCourses(cData as any);
    
    // Get current staff ID if applicable
    if (isStaff) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: staff } = await supabase.from('lecturers').select('id').eq('email', user.email).single();
            if (staff) setCurrentStaffId(staff.id);
        }
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!supabase) return;
    const payload = {
        code: current.code,
        name: current.name,
        description: current.description,
        lecturer_id: current.lecturer_id // Optional
    };
    
    if (current.id) {
      await supabase.from('courses').update(payload).eq('id', current.id);
    } else {
      await supabase.from('courses').insert([payload]);
    }
    setIsModalOpen(false);
    fetchData();
  };

  const handleClaim = async (courseId: string) => {
      if (!supabase || !currentStaffId) return;
      await supabase.from('courses').update({ lecturer_id: currentStaffId }).eq('id', courseId);
      fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Courses</h1>
          <p className="text-slate-500 mt-1">Curriculum directory.</p>
        </div>
        {isStaff && (
          <Button onClick={() => { setCurrent({}); setIsModalOpen(true); }}>
            <Plus className="w-5 h-5 mr-2" />
            Add Course
          </Button>
        )}
      </div>

      <Card noPadding>
        <table className="min-w-full divide-y divide-slate-100">
          <TableHeader headers={isStaff ? ['Course Code', 'Course Name', 'Lecturer', 'Actions'] : ['Course Code', 'Course Name', 'Lecturer']} />
          <tbody className="bg-white divide-y divide-slate-50">
            {courses.map((course) => (
              <tr key={course.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap">
                   <div className="flex items-center">
                     <div className="bg-blue-100 p-1.5 rounded text-blue-700 mr-3">
                        <Book className="w-4 h-4" />
                     </div>
                     <span className="text-sm font-bold text-primary-600 font-mono">{course.code}</span>
                   </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{course.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {course.lecturer ? (
                    <span className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-green-400"></span>
                       {course.lecturer.first_name} {course.lecturer.last_name}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Unassigned</span>
                  )}
                </td>
                {isStaff && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {!course.lecturer_id && currentStaffId && (
                        <button 
                            onClick={() => handleClaim(course.id)}
                            className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-100 hover:bg-emerald-100 mr-2"
                        >
                            Claim Course
                        </button>
                    )}
                    <button onClick={() => { setCurrent(course); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-primary-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={current.id ? 'Edit Course' : 'Create New Course'}>
        <div className="space-y-5">
          <Input label="Course Code" value={current.code || ''} onChange={e => setCurrent({...current, code: e.target.value})} placeholder="e.g. CS101" />
          <Input label="Course Name" value={current.name || ''} onChange={e => setCurrent({...current, name: e.target.value})} placeholder="Intro to Programming" />
          
          <Input label="Description (Optional)" value={current.description || ''} onChange={e => setCurrent({...current, description: e.target.value})} />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Course</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};