import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
  LogOut,
  Radio,
  UserCircle,
  Briefcase,
  PieChart
} from 'lucide-react';
import { getSupabase } from '../supabaseClient';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
}

interface NavItemProps {
  item: any;
  isActive: boolean;
  mobile?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ item, isActive, mobile }) => {
  if (mobile) {
    return (
      <NavLink
        to={item.path}
        className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 ${
          isActive ? 'text-primary-500' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <item.icon className={`w-5 h-5 ${isActive ? 'fill-current opacity-20' : ''} stroke-[2px]`} />
        <span className="text-[10px] font-medium">{item.label}</span>
      </NavLink>
    );
  }

  return (
    <NavLink
      to={item.path}
      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-r-full transition-all duration-200 border-l-4 ${
        isActive 
          ? 'bg-slate-800/50 border-primary-500 text-white' 
          : 'border-transparent text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'
      }`}
    >
      <item.icon className={`w-4 h-4 mr-3 transition-colors ${isActive ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
      {item.label}
    </NavLink>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children, role }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const supabase = getSupabase();

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem('user_role');
    navigate('/login');
  };

  const staffNav = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Live Monitor', path: '/live', icon: Radio },
    { label: 'Reports', path: '/reports', icon: PieChart },
    { label: 'Students', path: '/students', icon: Users },
    { label: 'Staff Directory', path: '/lecturers', icon: GraduationCap },
    { label: 'Courses', path: '/courses', icon: BookOpen },
    { label: 'My Profile', path: '/profile', icon: Briefcase },
  ];

  const studentNav = [
    { label: 'My Attendance', path: '/student', icon: LayoutDashboard },
    { label: 'Live Session', path: '/student/live', icon: Radio },
    { label: 'Lecturers', path: '/student/lecturers', icon: GraduationCap },
    { label: 'Courses', path: '/student/courses', icon: BookOpen },
    { label: 'My Profile', path: '/student/profile', icon: UserCircle },
  ];

  const navItems = role === 'staff' ? staffNav : studentNav;

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden w-full font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-950 text-white shadow-2xl z-50 flex-shrink-0 h-full border-r border-slate-800">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="bg-primary-600 p-1.5 rounded">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-none">RFID<span className="text-primary-500">Portal</span></h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">{role.toUpperCase()} ACCESS</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 space-y-1 overflow-y-auto custom-scrollbar pr-2">
          {navItems.map((item) => (
            <NavItem key={item.path} item={item} isActive={location.pathname === item.path} />
          ))}
        </nav>

        {/* User / Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/30">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-red-400 transition-colors group"
          >
            <LogOut className="w-4 h-4 mr-3 group-hover:-translate-x-1 transition-transform" />
            Disconnect
          </button>
        </div>
      </aside>
      
      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden w-full bg-slate-50">
        {/* Top Header for Mobile */}
        <header className="md:hidden h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-white">RFID Portal</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth w-full">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 pb-safe z-40 px-2 h-16">
          <div className="flex justify-around items-center h-full">
            {navItems.map((item) => (
               <NavItem key={item.path} item={item} isActive={location.pathname === item.path} mobile />
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};