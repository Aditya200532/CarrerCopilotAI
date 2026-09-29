import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, User, FileSearch, Briefcase, Target, Map, Code2,
  Video, Bell, Settings, LogOut, GraduationCap, Menu, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/resume-analyzer', label: 'Resume Analyzer', icon: FileSearch },
  { to: '/jobs', label: 'Job Explorer', icon: Briefcase },
  { to: '/skill-gap', label: 'Skill Gap', icon: Target },
  { to: '/roadmap', label: 'Roadmap', icon: Map },
  { to: '/dsa', label: 'DSA Progress', icon: Code2 },
  { to: '/mock-interview', label: 'Mock Interview', icon: Video },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
          <GraduationCap size={20} />
        </div>
        <div>
          <div className="text-sm font-bold text-white">CareerPilot AI</div>
          <div className="text-[11px] text-slate-400">Placement Copilot</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-brand-600/20 text-brand-300' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
            {user?.name?.[0]?.toUpperCase() || 'S'}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-white">{user?.name}</div>
            <div className="truncate text-xs text-slate-400">{user?.email}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white">
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-slate-900 lg:block">{sidebar}</aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-slate-900">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur lg:px-8">
          <button className="btn-ghost lg:hidden" onClick={() => setMobileOpen((v) => !v)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="hidden text-sm font-medium text-slate-500 lg:block">
            Prepare smarter, not harder.
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
