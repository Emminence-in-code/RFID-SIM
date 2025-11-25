
import React, { useEffect, useState } from 'react';
import { Card, Button, Input } from '../components/ui';
import { getSupabase } from '../supabaseClient';
import { Lecturer, Course } from '../types';
import { Save, Loader2, BookOpen, Camera, User } from 'lucide-react';

export const StaffProfile: React.FC = () => {
  const supabase = getSupabase();
  const [profile, setProfile] = useState<Lecturer | null>(null);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', department: '', photo_url: '' });

  useEffect(() => {
    const fetch = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('lecturers').select('*').eq('email', user.email).single();
        if (data) {
           setProfile(data);
           setFormData({ 
             first_name: data.first_name, 
             last_name: data.last_name, 
             department: data.department,
             photo_url: data.photo_url || '' 
            });
           
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
      setSaving(true);
      await supabase.from('lecturers').update(formData).eq('id', profile.id);
      setSaving(false);
      alert("Details updated successfully");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, photo_url: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }
  };

  if (loading) return <Loader2 className="w-8 h-8 animate-spin mx-auto mt-20" />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-black text-slate-900">Staff Profile</h1>
      
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 pb-8 border-b border-slate-100">
          <div className="relative group shrink-0">
             <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center font-bold text-3xl text-slate-500 overflow-hidden border-4 border-slate-50 shadow-lg">
                {formData.photo_url ? (
                    <img src={formData.photo_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <User className="w-10 h-10 text-slate-400" />
                )}
             </div>
             <label className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                <Camera className="w-6 h-6 text-white" />
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
          </div>
          
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold text-slate-900">{formData.first_name} {formData.last_name}</h2>
            <p className="text-slate-500 font-medium">{profile?.email}</p>
            <div className="inline-block mt-2 px-3 py-1 bg-primary-50 text-primary-700 text-sm font-mono font-bold rounded-full border border-primary-100">
                {profile?.staff_id}
            </div>
          </div>
        </div>

        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <Input label="First Name" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                <Input label="Last Name" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
            </div>
            <Input label="Department" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
            
            <div className="pt-4 flex justify-end">
                <Button onClick={handleSave} isLoading={saving}>
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                </Button>
            </div>
        </div>
      </Card>

      <div className="space-y-4">
          <h3 className="font-bold text-lg text-slate-700 flex items-center gap-2">
            <BookOpen className="w-5 h-5" /> Assigned Courses
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myCourses.length > 0 ? myCourses.map(c => (
                  <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-start gap-4 transition-transform hover:-translate-y-1">
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-lg text-white shadow-lg shadow-blue-500/30">
                          <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                          <div className="font-bold text-slate-900 font-mono text-lg">{c.code}</div>
                          <div className="text-sm text-slate-500 font-medium leading-tight">{c.name}</div>
                      </div>
                  </div>
              )) : (
                  <div className="col-span-2 p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500 italic">No courses assigned to your Staff ID yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Claim courses in the Courses tab.</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
