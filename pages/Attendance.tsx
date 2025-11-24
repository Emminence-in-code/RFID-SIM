import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the new Live Session page
    const timer = setTimeout(() => {
        navigate('/live');
    }, 100);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="h-[calc(100vh-140px)] flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
        <p className="text-slate-500 font-medium">Initializing Live Session...</p>
    </div>
  );
};