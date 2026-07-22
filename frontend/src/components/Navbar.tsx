import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen, LayoutDashboard, BarChart3, Trophy, User, LogOut, School, GraduationCap
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  const navLinkClass = (path: string) =>
    `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
      isActive(path)
        ? 'bg-violet-600/15 border border-violet-500/30 text-white shadow-sm'
        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
    }`;

  const userInitials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
    : 'U';

  return (
    <nav className="border-b border-[#24242B] bg-[#16161A]/80 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
      {/* Brand / Logo */}
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl shadow-lg shadow-violet-950/30 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent block leading-none">
              DevAcademy
            </span>
            <span className="text-[10px] text-violet-400 font-semibold tracking-wider uppercase">
              SaaS V1.0 Platform
            </span>
          </div>
        </Link>

        {/* Primary Nav Links */}
        <div className="hidden md:flex items-center gap-1.5 bg-[#1F1F24]/80 p-1 border border-[#2F2F37] rounded-2xl">
          <Link to="/" className={navLinkClass('/')}>
            <BookOpen className="w-3.5 h-3.5 text-violet-400" />
            Groups
          </Link>
          <Link to="/dashboard" className={navLinkClass('/dashboard')}>
            <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
            Dashboard
          </Link>
          {user.role === 'Teacher' && (
            <Link to="/analytics" className={navLinkClass('/analytics')}>
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              Analytics
            </Link>
          )}
          <Link to="/leaderboard" className={navLinkClass('/leaderboard')}>
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Leaderboard
          </Link>
          <Link to="/profile" className={navLinkClass('/profile')}>
            <User className="w-3.5 h-3.5 text-sky-400" />
            Profile
          </Link>
        </div>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center gap-4">
        {/* Role Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#1F1F24] border border-[#2F2F37] rounded-xl text-xs font-semibold">
          {user.role === 'Teacher' ? (
            <School className="w-3.5 h-3.5 text-indigo-400" />
          ) : (
            <GraduationCap className="w-3.5 h-3.5 text-violet-400" />
          )}
          <span className="text-zinc-300">{user.name}</span>
          <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-md uppercase font-bold border border-violet-500/30">
            {user.role}
          </span>
        </div>

        {/* User Profile Avatar Link */}
        <button
          onClick={() => navigate('/profile')}
          className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center border border-violet-400/30 shadow-md hover:scale-105 transition-transform"
          title="View Profile"
        >
          {userInitials}
        </button>

        {/* Logout button */}
        <button
          onClick={logout}
          className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
};
