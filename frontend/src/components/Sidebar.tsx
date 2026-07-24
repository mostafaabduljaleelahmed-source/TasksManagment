import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../utils/i18n';
import {
  LayoutDashboard, BookOpen, FileCode, Users, Settings, User, LogOut,
  Globe
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, lang, setLanguage } = useTranslation();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navLinkClass = (path: string) =>
    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
      isActive(path)
        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 font-bold shadow-sm'
        : 'text-zinc-400 hover:text-white hover:bg-[#1F2937]/50'
    }`;

  const userInitials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
    : 'U';

  const toggleLanguage = () => {
    setLanguage(lang === 'ar' ? 'en' : 'ar');
  };

  return (
    <aside className="w-64 bg-[#111827] border-r border-[#1F2937] flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none z-30">
      <div className="flex flex-col gap-6 p-4 overflow-y-auto">
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-3 px-2 pt-2 group">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-950/50 group-hover:scale-105 transition-transform">
            ⚡
          </div>
          <div>
            <span className="text-sm font-extrabold text-white tracking-tight block leading-none">
              Classroom SaaS
            </span>
            <span className="text-[10px] text-blue-400 font-bold tracking-wider uppercase mt-0.5 block">
              {user.role === 'Teacher' ? 'Instructor Edition' : 'Student Portal'}
            </span>
          </div>
        </Link>

        {/* Navigation Sections */}
        <nav className="space-y-1">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 px-3.5 mb-2">
            Main Navigation
          </div>

          <Link to="/dashboard" className={navLinkClass('/dashboard')}>
            <span className="flex items-center gap-3">
              <LayoutDashboard className="w-4 h-4 text-blue-400" />
              <span>{t('dashboard')}</span>
            </span>
            {isActive('/dashboard') && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
          </Link>

          <Link to="/" className={navLinkClass('/')}>
            <span className="flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>{t('courses')}</span>
            </span>
            {isActive('/') && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
          </Link>

          {user.role === 'Teacher' && (
            <>
              <Link to="/teacher/pending-reviews" className={navLinkClass('/teacher/pending-reviews')}>
                <span className="flex items-center gap-3">
                  <FileCode className="w-4 h-4 text-amber-400" />
                  <span>{t('pendingReviews')}</span>
                </span>
                {isActive('/teacher/pending-reviews') && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </Link>

              <Link to="/teacher/students" className={navLinkClass('/teacher/students')}>
                <span className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>{t('students')}</span>
                </span>
                {isActive('/teacher/students') && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
              </Link>
            </>
          )}

          <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 px-3.5 pt-4 mb-2">
            Preferences
          </div>

          <Link to="/settings" className={navLinkClass('/settings')}>
            <span className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-zinc-400" />
              <span>{t('settings')}</span>
            </span>
            {isActive('/settings') && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
          </Link>

          <Link to="/profile" className={navLinkClass('/profile')}>
            <span className="flex items-center gap-3">
              <User className="w-4 h-4 text-zinc-400" />
              <span>{t('profile')}</span>
            </span>
            {isActive('/profile') && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
          </Link>
        </nav>
      </div>

      {/* Footer / User Profile & Controls */}
      <div className="p-4 border-t border-[#1F2937] space-y-3 bg-[#0B0F19]/50">
        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="w-full flex items-center justify-between px-3 py-2 bg-[#1F2937]/60 hover:bg-[#1F2937] border border-[#374151]/50 text-zinc-300 rounded-xl text-xs font-semibold transition-colors"
        >
          <span className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>Language</span>
          </span>
          <span className="text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
            {lang === 'ar' ? 'عربي' : 'English'}
          </span>
        </button>

        {/* User Card & Logout */}
        <div className="flex items-center justify-between p-2 bg-[#1F2937]/40 rounded-xl border border-[#374151]/30">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden shrink-0 border border-blue-400/30">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                userInitials
              )}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-zinc-400 capitalize truncate">{user.role}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
            title={t('logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
