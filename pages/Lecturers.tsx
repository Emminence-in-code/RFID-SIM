import React, { useEffect, useState } from 'react';
import { Card, TableHeader } from '../components/ui';
import { getSupabase } from '../supabaseClient';
import { Lecturer } from '../types';

export const LecturersPage: React.FC = () => {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const supabase = getSupabase();
  const role = localStorage.getItem('user_role');
  const isStaff = role === 'staff';

  const fetchLecturers = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('lecturers').select('*');
    if (data) setLecturers(data);
  };

  useEffect(() => { fetchLecturers(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Directory</h1>
          <p className="text-slate-500 mt-1">Academic staff members.</p>
        </div>
      </div>

      <Card noPadding>
        <table className="min-w-full divide-y divide-slate-100">
          <TableHeader headers={isStaff ? ['Staff ID', 'Name', 'Email Address', 'Department'] : ['Staff ID', 'Name', 'Department']} />
          <tbody className="bg-white divide-y divide-slate-50">
            {lecturers.map((lecturer) => (
              <tr key={lecturer.id} className="hover:bg-slate-50 transition-colors group">
                 <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500">{lecturer.staff_id || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                   <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold mr-3">
                        {lecturer.first_name.charAt(0)}{lecturer.last_name.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-slate-900">{lecturer.first_name} {lecturer.last_name}</span>
                    </div>
                </td>
                {isStaff && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{lecturer.email}</td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                   <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">
                     {lecturer.department}
                   </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};