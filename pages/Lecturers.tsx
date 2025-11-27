import React, { useEffect, useState } from 'react';
import { Card, TableHeader } from '../components/ui';
import { getSupabase } from '../supabaseClient';
import { Lecturer } from '../types';
import { User } from 'lucide-react';

export const LecturersPage: React.FC = () => {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const supabase = getSupabase();
  const role = localStorage.getItem('user_role');
  const isStaff = role === 'staff';

  const fetchLecturers = async () => {
    if (!supabase) return;
    // Explicitly select only public fields, EXCLUDING staff_id to ensure privacy
    const { data } = await supabase
      .from('lecturers')
      .select('id, first_name, last_name, email, department, photo_url')
      .order('last_name');
      
    if (data) setLecturers(data as any);
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
          <TableHeader headers={isStaff ? ['Name', 'Email Address', 'Department'] : ['Name', 'Department']} />
          <tbody className="bg-white divide-y divide-slate-50">
            {lecturers.map((lecturer) => (
              <tr key={lecturer.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap">
                   <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold mr-3 overflow-hidden">
                        {lecturer.photo_url ? (
                            <img src={lecturer.photo_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <span className="text-slate-500 text-lg"><User className="w-5 h-5" /></span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-slate-900">{lecturer.first_name} {lecturer.last_name}</span>
                    </div>
                </td>
                {isStaff && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{lecturer.email}</td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                   <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
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