import React, { useState, useEffect } from 'react';
import { User, Camera, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { Card, Button, Input, Modal } from '../components/ui';
import { getSupabase } from '../supabaseClient';
import { Student, Course, Enrollment } from '../types';

export const StudentProfile: React.FC = () => {
  const supabase = getSupabase();
  const [profile, setProfile] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', photo_url: '' });
  
  // Courses State
  const [enrolledCourses, setEnrolledCourses] = useState<Enrollment[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);

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
          
          // Fetch Enrollments
          const { data: enrolls } = await supabase
            .from('enrollments')
            .select('*, course:courses(*)')
            .eq('student_id', data.id);
          if (enrolls) setEnrolledCourses(enrolls as any);
        }
      }
      // Fetch All Courses for dropdown
      const { data: c } = await supabase.from('courses').select('*');
      if (c) setAllCourses(c);

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

  const handleAddCourse = async (courseId: string) => {
    if (!supabase || !profile) return;
    const { error } = await supabase.from('enrollments').insert({
        student_id: profile.id,
        course_id: courseId
    });
    if (!error) {
        const { data: newEnrolls } = await supabase.from('enrollments').select('*, course:courses(*)').eq('student_id', profile.id);
        if (newEnrolls) setEnrolledCourses(newEnrolls as any);
        setIsCourseModalOpen(false);
    }
  };

  const handleRemoveCourse = async (id: string) => {
    if (!supabase) return;
    await supabase.from('enrollments').delete().eq('id', id);
    setEnrolledCourses(prev => prev.filter(e => e.id !== id));
  };

  if (loading) return <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mt-20" />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Profile</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Photo & Details */}
        <div className="md:col-span-1 space-y-6">
            <Card className="p-6 text-center">
                <div className="w-32 h-32 mx-auto rounded-full bg-slate-100 mb-4 border-4 border-white shadow-lg overflow-hidden relative group">
                    {formData.photo_url ? (
                        <img src={formData.photo_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-16 h-16 text-slate-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    )}
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                        <Camera className="w-8 h-8 text-white" />
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                </div>
                <h2 className="font-bold text-lg">{profile?.first_name} {profile?.last_name}</h2>
                <p className="text-slate-500 font-mono text-sm">{profile?.student_id}</p>
                <div className="mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100 text-left">
                    <p className="text-xs text-slate-500 uppercase font-bold">RFID TAG</p>
                    <p className="font-mono text-sm">{profile?.rfid_tag}</p>
                </div>
            </Card>
        </div>

        {/* Right Column: Edit Form & Courses */}
        <div className="md:col-span-2 space-y-6">
            <Card className="p-6">
                <h3 className="font-bold text-lg mb-4">Edit Details</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
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
                <div className="flex justify-end">
                    <Button onClick={handleSave} isLoading={saving} className="text-sm">
                        <Save className="w-4 h-4 mr-2" /> Save Changes
                    </Button>
                </div>
            </Card>

            <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">My Courses</h3>
                    <Button variant="secondary" onClick={() => setIsCourseModalOpen(true)} className="py-1 px-3 text-xs">
                        <Plus className="w-3 h-3 mr-1" /> Add Course
                    </Button>
                </div>
                <div className="space-y-2">
                    {enrolledCourses.length === 0 ? (
                        <p className="text-slate-400 italic text-sm">No courses enrolled.</p>
                    ) : enrolledCourses.map(e => (
                        <div key={e.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div>
                                <span className="font-bold text-primary-600 font-mono text-sm mr-2">{e.course?.code}</span>
                                <span className="text-sm text-slate-700">{e.course?.name}</span>
                            </div>
                            <button onClick={() => handleRemoveCourse(e.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
      </div>

      <Modal isOpen={isCourseModalOpen} onClose={() => setIsCourseModalOpen(false)} title="Enroll in Course">
        <div className="space-y-2">
            {allCourses.filter(c => !enrolledCourses.find(e => e.course_id === c.id)).map(c => (
                <button 
                    key={c.id} 
                    onClick={() => handleAddCourse(c.id)}
                    className="w-full text-left p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-all flex justify-between group"
                >
                    <span>
                        <span className="font-bold font-mono text-slate-600 mr-2">{c.code}</span>
                        {c.name}
                    </span>
                    <Plus className="w-4 h-4 text-slate-300 group-hover:text-primary-500" />
                </button>
            ))}
        </div>
      </Modal>
    </div>
  );
};