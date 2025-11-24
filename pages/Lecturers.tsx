import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Card, Button, Input, TableHeader, Modal } from '../components/ui';
import { getSupabase } from '../supabaseClient';
import { Lecturer } from '../types';

export const LecturersPage: React.FC = () => {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [current, setCurrent] = useState<Partial<Lecturer>>({});
  const supabase = getSupabase();
  const isAdmin = localStorage.getItem('user_role') === 'admin';

  const fetchLecturers = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('lecturers').select('*');
    if (data) setLecturers(data);
  };

  useEffect(() => { fetchLecturers(); }, []);

  const handleSave = async () => {
    if (!supabase) return;
    if (current.id) {
      await supabase.from('lecturers').update(current).eq('id', current.id);
    } else {
      await supabase.from('lecturers').insert([current]);
    }
    setIsModalOpen(false);
    fetchLecturers();
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    await supabase.from('lecturers').delete().eq('id', id);
    fetchLecturers();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Lecturers</h1>
          <p className="text-slate-500 mt-1">Academic staff directory.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setCurrent({}); setIsModalOpen(true); }}>
            <Plus className="w-5 h-5 mr-2" />
            Add Lecturer
          </Button>
        )}
      </div>

      <Card noPadding>
        <table className="min-w-full divide-y divide-slate-100">
          <TableHeader headers={isAdmin ? ['Name', 'Email Address', 'Department', 'Actions'] : ['Name', 'Email Address', 'Department']} />
          <tbody className="bg-white divide-y divide-slate-50">
            {lecturers.map((lecturer) => (
              <tr key={lecturer.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap">
                   <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold mr-3">
                        {lecturer.first_name.charAt(0)}{lecturer.last_name.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-slate-900">{lecturer.first_name} {lecturer.last_name}</span>
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{lecturer.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                   <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">
                     {lecturer.department}
                   </span>
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setCurrent(lecturer); setIsModalOpen(true); }} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(lecturer.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={current.id ? 'Edit Lecturer' : 'New Lecturer'}>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <Input label="First Name" value={current.first_name || ''} onChange={e => setCurrent({...current, first_name: e.target.value})} />
            <Input label="Last Name" value={current.last_name || ''} onChange={e => setCurrent({...current, last_name: e.target.value})} />
          </div>
          <Input label="Email Address" type="email" value={current.email || ''} onChange={e => setCurrent({...current, email: e.target.value})} />
          <Input label="Department" value={current.department || ''} onChange={e => setCurrent({...current, department: e.target.value})} placeholder="e.g. Computer Science" />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
