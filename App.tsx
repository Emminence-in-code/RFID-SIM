import React, { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthPage } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import { StudentsPage } from "./pages/Students";
import { LecturersPage } from "./pages/Lecturers";
import { CoursesPage } from "./pages/Courses";
import { LiveConsole } from "./pages/LiveConsole";
import { HardwareSimulator } from "./pages/HardwareSimulator";
import { StudentProfile } from "./pages/StudentProfile";
import { AdminProfile } from "./pages/AdminProfile";
import { getSupabase, hasSupabaseConfig, initSupabase } from "./supabaseClient";
import { Loader2 } from "lucide-react";
import { UserRole } from "./types";

initSupabase();

// Wrapper to inject role into Layout
const AppLayout = ({ role }: { role: UserRole }) => {
  return (
    <Layout role={role}>
      <Outlet />
    </Layout>
  );
};

const ProtectedRoute = ({ allowedRoles }: { allowedRoles: UserRole[] }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const isConfigured = hasSupabaseConfig();
      if (!isConfigured) {
        setLoading(false);
        return;
      }

      const supabase = getSupabase();
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setAuthenticated(true);
          // Determine Role. 
          // Strategy: Check if email exists in 'students' table. If yes, Student. Else, Admin.
          // In a real app, use claims or a profiles table.
          const { data: student } = await supabase
            .from('students')
            .select('id')
            .eq('email', session.user.email)
            .single();

          const role = student ? 'student' : 'admin';
          setUserRole(role);
          
          // Store role in local storage for synchronous access in other components if needed
          localStorage.setItem('user_role', role);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!authenticated) return <Navigate to="/login" replace />;
  if (userRole && !allowedRoles.includes(userRole)) return <Navigate to="/" replace />;

  return <AppLayout role={userRole!} />;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        
        {/* Standalone Hardware Route (No Layout) */}
        <Route path="/hardware" element={<HardwareSimulator />} />

        {/* Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/live" element={<LiveConsole />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/lecturers" element={<LecturersPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/profile" element={<AdminProfile />} />
        </Route>

        {/* Student Routes */}
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path="/student" element={<Dashboard />} />
          <Route path="/student/live" element={<LiveConsole />} />
          <Route path="/student/lecturers" element={<LecturersPage />} />
          <Route path="/student/courses" element={<CoursesPage />} />
          <Route path="/student/profile" element={<StudentProfile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
