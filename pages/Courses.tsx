import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Book } from 'lucide-react';
import { Card, Button, Input, TableHeader, Modal } from '../components/ui';
import { getSupabase } from '../supabaseClient';
import { Course, Lecturer } from '../types';

export const CoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [current, setCurrent] = useState<Partial<Course>>({});
  const supabase = getSupabase();
  const isAdmin = localStorage.getItem('user_role') === 'admin';

  const fetchData = async () => {
    if (!supabase) return;
    const { data: cData } = await supabase.from('courses').select('*, lecturer:lecturers(first_name, last_name)');
    const { data: lData } = await supabase.from('lecturers').select('*');
    if (cData) setCourses(cData as any);
    if (lData) setLecturers(lData);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!supabase) return;
    const payload = {
        code: current.code,
        name: current.name,
        lecturer_id: current.lecturer_id,
        description: current.description
    };
    
    if (current.id) {
      await supabase.from('courses').update(payload).eq('id', current.id);
    } else {
      await supabase.from('courses').insert([payload]);
    }
    setIsModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    await supabase.from('courses').delete().eq('id', id);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Courses</h1>
          <p className="text-slate-500 mt-1">Curriculum management.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setCurrent({}); setIsModalOpen(true); }}>
            <Plus className="w-5 h-5 mr-2" />
            Add Course
          </Button>
        )}
      </div>

      <Card noPadding>
        <table className="min-w-full divide-y divide-slate-100">
          <TableHeader headers={isAdmin ? ['Course Code', 'Course Name', 'Lecturer', 'Actions'] : ['Course Code', 'Course Name', 'Lecturer']} />
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
                {isAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setCurrent(course); setIsModalOpen(true); }} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(course.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700 ml-1">Assigned Lecturer</label>
            <div className="relative">
              <select 
                className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 appearance-none"
                value={current.lecturer_id || ''}
                onChange={e => setCurrent({...current, lecturer_id: e.target.value})}
              >
                <option value="">Select Lecturer...</option>
                {lecturers.map(l => (
                  <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
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
