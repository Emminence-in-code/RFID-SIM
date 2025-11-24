import React, { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthPage } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import { StudentsPage } from "./pages/Students";
import { LecturersPage } from "./pages/Lecturers";
import { CoursesPage } from "./pages/Courses";
import { AttendancePage } from "./pages/Attendance";
import { LiveConsole } from "./pages/LiveConsole";
import { HardwareSimulator } from "./pages/HardwareSimulator";
// import { SetupPage } from "./pages/Setup";
import { getSupabase, hasSupabaseConfig } from "./supabaseClient";
import { Loader2 } from "lucide-react";

// Protected Route Guard
const ProtectedRoute = () => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const isConfigured = hasSupabaseConfig();
      setConfigured(isConfigured);

      if (!isConfigured) {
        setLoading(false);
        return;
      }

      const supabase = getSupabase();
      if (supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setAuthenticated(!!session);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!configured) return <Navigate to="/setup" replace />;
  if (!authenticated) return <Navigate to="/login" replace />;

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        {/* <Route path="/setup" element={<SetupPage />} /> */}
        <Route path="/login" element={<AuthPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/live" element={<LiveConsole />} />
          <Route path="/hardware" element={<HardwareSimulator />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/lecturers" element={<LecturersPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          {/* <Route path="/settings" element={<SetupPage />} />{" "} */}
          {/* Reuse setup as settings */}
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
