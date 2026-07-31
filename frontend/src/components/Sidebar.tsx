import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../utils/i18n';
import {
  LayoutDashboard, BookOpen, FileCode, Users, Settings, User, LogOut,
  Globe, ShieldCheck, X, Trophy, Archive, Activity, Calendar
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
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

  const isTeacherOrAdmin = user.role === 'Teacher' || user.role === 'Admin';

  const sidebarContent = (
    <aside className="w-full sm:w-64 bg-[#111827] border-r border-[#1F2937] flex flex-col justify-between h-full select-none">
      <div className="flex flex-col gap-5 p-4 overflow-y-auto">
        {/* Brand / Logo & Mobile Close Header */}
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
          <Link to="/" className="flex items-center gap-3 group" onClick={onClose}>
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-blue-950/50">
              ⚡
            </div>
            <div>
              <span className="text-base font-extrabold text-white tracking-tight block leading-none">
                Classroom SaaS
              </span>
              <span className="text-[10px] text-blue-400 font-bold tracking-wider uppercase mt-1 block">
                {user.role === 'Teacher' ? 'Instructor Edition' : user.role === 'Admin' ? 'Executive Admin' : 'Student Portal'}
              </span>
            </div>
          </Link>

          {/* Close button for mobile drawer */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-2 text-zinc-400 hover:text-white rounded-xl bg-[#1F2937]/80 border border-[#374151]/50 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Close Navigation Drawer"
            >
              <X className="w-5 h-5 text-zinc-300" />
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-1">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 px-3.5 mb-2">
            Academic Hub
          </div>

          <Link to="/dashboard" className={navLinkClass('/dashboard')} onClick={onClose}>
            <span className="flex items-center gap-3">
              <LayoutDashboard className="w-4 h-4 text-blue-400" />
              <span>{t('dashboard')}</span>
            </span>
            {isActive('/dashboard') && <span className="w-2 h-2 rounded-full bg-blue-400" />}
          </Link>

          <Link to="/" className={navLinkClass('/')} onClick={onClose}>
            <span className="flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>{t('courses')}</span>
            </span>
            {isActive('/') && <span className="w-2 h-2 rounded-full bg-blue-400" />}
          </Link>

          <Link to="/leaderboard" className={navLinkClass('/leaderboard')} onClick={onClose}>
            <span className="flex items-center gap-3">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>{t('leaderboard')}</span>
            </span>
            {isActive('/leaderboard') && <span className="w-2 h-2 rounded-full bg-amber-400" />}
          </Link>

          <Link to="/calendar" className={navLinkClass('/calendar')} onClick={onClose}>
            <span className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>Calendar</span>
            </span>
            {isActive('/calendar') && <span className="w-2 h-2 rounded-full bg-sky-400" />}
          </Link>

          {isTeacherOrAdmin && (
            <>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 px-3.5 pt-4 mb-2">
                Teacher Tools
              </div>

              <Link to="/teacher/pending-reviews" className={navLinkClass('/teacher/pending-reviews')} onClick={onClose}>
                <span className="flex items-center gap-3">
                  <FileCode className="w-4 h-4 text-amber-400" />
                  <span>{t('pendingReviews')}</span>
                </span>
                {isActive('/teacher/pending-reviews') && <span className="w-2 h-2 rounded-full bg-amber-400" />}
              </Link>

              <Link to="/teacher/students" className={navLinkClass('/teacher/students')} onClick={onClose}>
                <span className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>{t('students')}</span>
                </span>
                {isActive('/teacher/students') && <span className="w-2 h-2 rounded-full bg-sky-400" />}
              </Link>

              <Link to="/archive" className={navLinkClass('/archive')} onClick={onClose}>
                <span className="flex items-center gap-3">
                  <Archive className="w-4 h-4 text-amber-400" />
                  <span>Archive</span>
                </span>
                {isActive('/archive') && <span className="w-2 h-2 rounded-full bg-amber-400" />}
              </Link>

              <Link to="/activity-log" className={navLinkClass('/activity-log')} onClick={onClose}>
                <span className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <span>Activity Audit Log</span>
                </span>
                {isActive('/activity-log') && <span className="w-2 h-2 rounded-full bg-indigo-400" />}
              </Link>
            </>
          )}

          {user.role === 'Admin' && (
            <>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-violet-400 px-3.5 pt-4 mb-2">
                Academy Admin
              </div>
              <Link to="/admin/dashboard" className={navLinkClass('/admin/dashboard')} onClick={onClose}>
                <span className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-violet-400" />
                  <span>Admin Dashboard</span>
                </span>
                {isActive('/admin/dashboard') && <span className="w-2 h-2 rounded-full bg-violet-400" />}
              </Link>
              <Link to="/admin/users" className={navLinkClass('/admin/users')} onClick={onClose}>
                <span className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-violet-400" />
                  <span>User Management</span>
                </span>
                {isActive('/admin/users') && <span className="w-2 h-2 rounded-full bg-violet-400" />}
              </Link>
              <Link to="/admin/settings" className={navLinkClass('/admin/settings')} onClick={onClose}>
                <span className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-violet-400" />
                  <span>System Settings</span>
                </span>
                {isActive('/admin/settings') && <span className="w-2 h-2 rounded-full bg-violet-400" />}
              </Link>
            </>
          )}

          <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 px-3.5 pt-4 mb-2">
            Preferences
          </div>

          <Link to="/settings" className={navLinkClass('/settings')} onClick={onClose}>
            <span className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-zinc-400" />
              <span>{t('settings')}</span>
            </span>
            {isActive('/settings') && <span className="w-2 h-2 rounded-full bg-blue-400" />}
          </Link>

          <Link to="/profile" className={navLinkClass('/profile')} onClick={onClose}>
            <span className="flex items-center gap-3">
              <User className="w-4 h-4 text-zinc-400" />
              <span>{t('profile')}</span>
            </span>
            {isActive('/profile') && <span className="w-2 h-2 rounded-full bg-blue-400" />}
          </Link>
        </nav>
      </div>

      {/* Footer / User Profile & Controls */}
      <div className="p-4 border-t border-[#1F2937] space-y-3 bg-[#0B0F19]/80">
        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#1F2937]/70 hover:bg-[#1F2937] border border-[#374151]/50 text-zinc-200 rounded-xl text-xs font-bold transition-colors min-h-[44px]"
        >
          <span className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            <span>Language</span>
          </span>
          <span className="text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
            {lang === 'ar' ? 'عربي' : 'English'}
          </span>
        </button>

        {/* User Card & Logout */}
        <div className="flex items-center justify-between p-2.5 bg-[#1F2937]/50 rounded-xl border border-[#374151]/40">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden shrink-0 border border-blue-400/30">
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
            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            title={t('logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <div className="hidden md:flex h-screen sticky top-0 shrink-0 z-30">
        {sidebarContent}
      </div>

      {/* Mobile Off-Canvas Drawer with 80-85% viewport width and full dark backdrop overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Dimmed Background Overlay */}
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in"
            onClick={onClose}
          />
          {/* Drawer Container (Width 82% max 320px) */}
          <div className="relative z-10 h-full w-[82vw] max-w-[320px] shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

