import React, { useState, useEffect } from 'react';
import { User, Camera, Save, Loader2 } from 'lucide-react';
import { Card, Button, Input } from '../components/ui';
import { getSupabase } from '../supabaseClient';
import { Student } from '../types';

export const StudentProfile: React.FC = () => {
  const supabase = getSupabase();
  const [profile, setProfile] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', photo_url: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('students').select('*').eq('email', user.email).single();
        if (data) {
          setProfile(data);
          setFormData({ 
            first_name: data.first_name, 
            last_name: data.last_name, 
            photo_url: data.photo_url || '' 
          });
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, [supabase]);

  const handleSave = async () => {
    if (!supabase || !profile) return;
    setSaving(true);
    await supabase.from('students').update(formData).eq('id', profile.id);
    setSaving(false);
    alert('Profile updated successfully.');
  };

  if (loading) return <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mt-20" />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-black text-slate-900 tracking-tight">Student Profile</h1>
      
      <Card className="p-8">
        <div className="flex flex-col items-center mb-8">
           <div className="w-32 h-32 rounded-full bg-slate-100 mb-4 border-4 border-white shadow-lg overflow-hidden relative group">
              {formData.photo_url ? (
                <img src={formData.photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-slate-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              )}
           </div>
           <p className="text-sm text-slate-500">Matric No: <span className="font-mono font-bold text-slate-900">{profile?.student_id}</span></p>
        </div>

        <div className="space-y-6">
           <div className="grid grid-cols-2 gap-4">
              <Input 
                label="First Name" 
                value={formData.first_name} 
                onChange={e => setFormData({...formData, first_name: e.target.value})} 
              />
              <Input 
                label="Last Name" 
                value={formData.last_name} 
                onChange={e => setFormData({...formData, last_name: e.target.value})} 
              />
           </div>
           
           <Input 
             label="Photo URL" 
             icon={<Camera className="w-4 h-4" />}
             value={formData.photo_url} 
             onChange={e => setFormData({...formData, photo_url: e.target.value})} 
             placeholder="https://example.com/my-photo.jpg"
           />
           <p className="text-xs text-slate-500">Provide a direct link to an image file for your ID card photo.</p>

           <div className="pt-4 flex justify-end">
              <Button onClick={handleSave} isLoading={saving}>
                 <Save className="w-4 h-4 mr-2" /> Save Changes
              </Button>
           </div>
        </div>
      </Card>
    </div>
  );
};
