import React, { useEffect, useState } from 'react';
import { Card, Button, Input } from '../components/ui';
import { getSupabase } from '../supabaseClient';
import { Lecturer, Course } from '../types';
import { Save, Loader2, BookOpen } from 'lucide-react';

export const StaffProfile: React.FC = () => {
  const supabase = getSupabase();
  const [profile, setProfile] = useState<Lecturer | null>(null);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', department: '' });

  useEffect(() => {
    const fetch = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('lecturers').select('*').eq('email', user.email).single();
        if (data) {
           setProfile(data);
           setFormData({ first_name: data.first_name, last_name: data.last_name, department: data.department });
           
           // Fetch assigned courses
           const { data: c } = await supabase.from('courses').select('*').eq('lecturer_id', data.id);
           if (c) setMyCourses(c as any);
        }
      }
      setLoading(false);
    };
    fetch();
  }, [supabase]);

  const handleSave = async () => {
      if(!supabase || !profile) return;
      await supabase.from('lecturers').update(formData).eq('id', profile.id);
      alert("Details updated");
  };

  if (loading) return <Loader2 className="w-8 h-8 animate-spin mx-auto mt-20" />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-black text-slate-900">Staff Profile</h1>
      
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center font-bold text-xl text-slate-500">
            {profile?.first_name[0]}{profile?.last_name[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold">{profile?.first_name} {profile?.last_name}</h2>
            <p className="text-slate-500">{profile?.email}</p>
            <p className="text-primary-600 font-mono text-sm font-bold mt-1">{profile?.staff_id}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
            <Input label="First Name" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
            <Input label="Last Name" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
        </div>
        <Input label="Department" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
        
        <div className="pt-4 flex justify-end">
            <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Save Changes</Button>
        </div>
      </Card>

      <div className="space-y-4">
          <h3 className="font-bold text-lg text-slate-700">Assigned Courses</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myCourses.length > 0 ? myCourses.map(c => (
                  <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-start gap-3">
                      <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                          <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                          <div className="font-bold text-slate-900">{c.code}</div>
                          <div className="text-sm text-slate-500">{c.name}</div>
                      </div>
                  </div>
              )) : (
                  <p className="text-slate-500 italic col-span-2">No courses assigned to your Staff ID yet.</p>
              )}
          </div>
      </div>
    </div>
  );
};