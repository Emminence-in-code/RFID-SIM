import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Key, Save, AlertCircle, Copy, Check, Hexagon } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { saveSupabaseConfig, SETUP_SQL } from '../supabaseClient';

export const SetupPage: React.FC = () => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && key) {
      saveSupabaseConfig({ url, key });
      navigate('/');
      window.location.reload(); 
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 lg:p-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-xl shadow-primary-500/30">
             <Hexagon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Configuration</h1>
          <p className="text-slate-500 mt-2 text-lg">Connect your database to initialize the AttendancePro system.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Step 1 */}
           <Card className="flex flex-col h-full border-t-4 border-t-primary-500">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-lg">1</div>
                <h2 className="text-xl font-bold text-slate-800">Database Schema</h2>
             </div>
             
             <p className="text-slate-600 mb-4 text-sm leading-relaxed">
               Run this SQL script in your Supabase project's <span className="font-semibold">SQL Editor</span> to generate the required tables and security policies.
             </p>
             
             <div className="relative bg-slate-900 rounded-xl p-4 overflow-hidden flex-1 group">
                <div className="absolute top-0 right-0 p-2">
                  <button 
                    onClick={handleCopy}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors backdrop-blur-sm"
                    title="Copy SQL"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <pre className="text-xs text-primary-100 font-mono overflow-auto h-64 custom-scrollbar">
                  {SETUP_SQL}
                </pre>
             </div>
           </Card>

           {/* Step 2 */}
           <Card className="flex flex-col h-full border-t-4 border-t-secondary-500">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-secondary-50 text-secondary-600 flex items-center justify-center font-bold text-lg">2</div>
                <h2 className="text-xl font-bold text-slate-800">API Credentials</h2>
             </div>
             
             <p className="text-slate-600 mb-6 text-sm">
               Enter your Supabase <span className="font-semibold">Project URL</span> and <span className="font-semibold">anon public key</span>. These are found in Project Settings &gt; API.
             </p>
             
             <form onSubmit={handleSubmit} className="space-y-6 flex-1">
                <Input
                  label="Project URL"
                  placeholder="https://xyz.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
                <Input
                  label="Anon / Public Key"
                  placeholder="eyJh..."
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  required
                />
                
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 text-amber-800 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-500" />
                  <p>Credentials are saved locally for this demo. In production, use environment variables.</p>
                </div>

                <div className="pt-4">
                  <Button type="submit" className="w-full py-3 text-base shadow-xl shadow-primary-500/20">
                    <Save className="w-5 h-5 mr-2" />
                    Save Configuration & Connect
                  </Button>
                </div>
             </form>
           </Card>
        </div>
      </div>
    </div>
  );
};