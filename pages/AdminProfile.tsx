import React, { useEffect, useState } from 'react';
import { Card, Button } from '../components/ui';
import { getSupabase } from '../supabaseClient';

export const AdminProfile: React.FC = () => {
  const [email, setEmail] = useState('');
  
  useEffect(() => {
    getSupabase()?.auth.getUser().then(({data}) => setEmail(data.user?.email || ''));
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-black text-slate-900">Administrator Profile</h1>
      <Card className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center font-bold text-2xl text-slate-500">
            {email.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold">Admin User</h2>
            <p className="text-slate-500">{email}</p>
          </div>
        </div>
        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm">
          You have full administrative privileges.
        </div>
      </Card>
    </div>
  );
}