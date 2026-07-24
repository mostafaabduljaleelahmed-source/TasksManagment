import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../utils/i18n';
import { GlobalSearch } from './GlobalSearch';
import {
  BookOpen, LayoutDashboard, Trophy, LogOut, School, GraduationCap, Globe, Settings, Bell, FileCode, Archive, Activity
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, lang, setLanguage } = useTranslation();
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

  const toggleLanguage = () => {
    setLanguage(lang === 'ar' ? 'en' : 'ar');
  };

  return (
    <nav className="border-b border-[#24242B] bg-[#16161A]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between gap-4">
      {/* Brand / Logo */}
      <div className="flex items-center gap-6 shrink-0">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl shadow-lg shadow-violet-950/30 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent block leading-none">
              {t('appName')}
            </span>
            <span className="text-[10px] text-violet-400 font-semibold tracking-wider uppercase">
              SaaS Educational Platform
            </span>
          </div>
        </Link>
      </div>

      {/* Center: Global Search Bar */}
      <div className="hidden lg:flex flex-1 max-w-md mx-4">
        <GlobalSearch />
      </div>

        {/* Primary Nav Links */}
        <div className="hidden md:flex items-center gap-1.5 bg-[#1F1F24]/80 p-1 border border-[#2F2F37] rounded-2xl">
          <Link to="/dashboard" className={navLinkClass('/dashboard')}>
            <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
            {t('dashboard')}
          </Link>
          <Link to="/" className={navLinkClass('/')}>
            <BookOpen className="w-3.5 h-3.5 text-violet-400" />
            {t('courses')}
          </Link>
          {user.role === 'Teacher' && (
            <>
              <Link to="/teacher/pending-reviews" className={navLinkClass('/teacher/pending-reviews')}>
                <FileCode className="w-3.5 h-3.5 text-amber-400" />
                {t('pendingReviews')}
              </Link>
              <Link to="/assignments" className={navLinkClass('/assignments')}>
                <FileCode className="w-3.5 h-3.5 text-violet-400" />
                Assignments
              </Link>
              <Link to="/teacher/students" className={navLinkClass('/teacher/students')}>
                <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
                {t('students')}
              </Link>
              <Link to="/archive" className={navLinkClass('/archive')}>
                <Archive className="w-3.5 h-3.5 text-amber-400" />
                Archive
              </Link>
            </>
          )}
          <Link to="/leaderboard" className={navLinkClass('/leaderboard')}>
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            {t('leaderboard')}
          </Link>
          <Link to="/activity-log" className={navLinkClass('/activity-log')}>
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            Activity Log
          </Link>
          <Link to="/settings" className={navLinkClass('/settings')}>
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
            {t('settings')}
          </Link>
        </div>

      {/* User Info & Actions */}
      <div className="flex items-center gap-3">
        {/* Actionable Notifications Bell */}
        {user.role === 'Teacher' && (
          <div className="relative">
            <button
              onClick={() => navigate('/teacher/pending-reviews')}
              className="p-2 bg-[#1F1F24] hover:bg-[#2F2F37] border border-[#2F2F37] text-amber-400 rounded-xl transition-colors relative"
              title="Pending Reviews & Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
            </button>
          </div>
        )}

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1F1F24] hover:bg-[#2F2F37] border border-[#2F2F37] text-zinc-300 hover:text-white text-xs font-semibold rounded-xl transition-colors"
          title="Toggle Language"
        >
          <Globe className="w-3.5 h-3.5 text-violet-400" />
          <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
        </button>

        {/* Role & Name Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#1F1F24] border border-[#2F2F37] rounded-xl text-xs font-semibold">
          {user.role === 'Teacher' ? (
            <School className="w-3.5 h-3.5 text-indigo-400" />
          ) : (
            <GraduationCap className="w-3.5 h-3.5 text-violet-400" />
          )}
          <span className="text-zinc-300">{user.name}</span>
          <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-md font-bold border border-violet-500/30">
            {user.role === 'Teacher' ? t('teacher') : t('student')}
          </span>
        </div>

        {/* User Profile Avatar */}
        <button
          onClick={() => navigate('/profile')}
          className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center border border-violet-400/30 shadow-md hover:scale-105 transition-transform overflow-hidden"
          title="View Profile"
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            userInitials
          )}
        </button>

        {/* Logout button */}
        <button
          onClick={logout}
          className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
          title={t('logout')}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
};
