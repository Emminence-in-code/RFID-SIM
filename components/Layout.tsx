import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Settings, 
  LogOut,
  Hexagon,
  Radio,
  Cpu
} from 'lucide-react';
import { getSupabase } from '../supabaseClient';

interface LayoutProps {
  children: React.ReactNode;
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
          isActive ? 'text-primary-600 -translate-y-1' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <item.icon className={`w-6 h-6 ${isActive ? 'fill-current opacity-20' : ''} stroke-[2px]`} />
        <span className="text-[10px] font-medium">{item.label}</span>
        {isActive && <div className="absolute bottom-1 w-1 h-1 bg-primary-600 rounded-full" />}
      </NavLink>
    );
  }

  return (
    <NavLink
      to={item.path}
      className={`group flex items-center px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-300 ${
        isActive 
          ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/50 scale-[1.02]' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <item.icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-secondary-400'}`} />
      {item.label}
      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-secondary-400 animate-pulse" />}
    </NavLink>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const supabase = getSupabase();

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Live Session', path: '/live', icon: Radio },
    { label: 'Hardware Sim', path: '/hardware', icon: Cpu },
    { label: 'Students', path: '/students', icon: Users },
    { label: 'Lecturers', path: '/lecturers', icon: GraduationCap },
    { label: 'Courses', path: '/courses', icon: BookOpen },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50/50 overflow-hidden w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 text-white shadow-2xl z-50 flex-shrink-0 h-full">
        {/* Brand */}
        <div className="h-20 flex items-center px-8 bg-gradient-to-r from-primary-700 to-primary-900 shadow-lg relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/20">
              <Hexagon className="w-6 h-6 text-secondary-300" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white">RFID<span className="text-secondary-400">Portal</span></h1>
              <p className="text-xs text-primary-200 font-medium tracking-wider uppercase">Admin Access</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavItem key={item.path} item={item} isActive={location.pathname === item.path} />
          ))}
        </nav>

        {/* User / Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm flex-shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-slate-400 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all group"
          >
            <LogOut className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
            Sign Out
          </button>
        </div>
      </aside>
      
      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden w-full">
        {/* Top Header for Mobile */}
        <header className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-primary-600 p-1.5 rounded-lg">
              <Hexagon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-800">RFID Portal</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8 scroll-smooth w-full">
          <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-2 z-40 px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] h-16">
          <div className="flex justify-around items-center h-full">
            {navItems.slice(0, 5).map((item) => (
               <NavItem key={item.path} item={item} isActive={location.pathname === item.path} mobile />
            ))}
             <button onClick={() => navigate('/settings')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname === '/settings' ? 'text-primary-600' : 'text-slate-400'}`}>
                <Settings className="w-6 h-6" />
                <span className="text-[10px] font-medium">Set</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};