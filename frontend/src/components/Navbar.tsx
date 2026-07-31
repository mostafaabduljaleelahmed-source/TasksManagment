import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../utils/i18n';
import { GlobalSearchModal } from './GlobalSearchModal';
import {
  Menu, Bell, Globe
} from 'lucide-react';

interface NavbarProps {
  onOpenMobileDrawer?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileDrawer }) => {
  const { user } = useAuth();
  const { t, lang, setLanguage } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  if (!user) return null;

  const toggleLanguage = () => {
    setLanguage(lang === 'ar' ? 'en' : 'ar');
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return t('dashboard');
    if (path === '/') return t('courses');
    if (path === '/leaderboard') return t('leaderboard');
    if (path === '/calendar') return lang === 'ar' ? 'التقويم' : 'Calendar';
    if (path === '/teacher/pending-reviews') return t('pendingReviews');
    if (path === '/teacher/students') return t('students');
    if (path === '/admin/dashboard') return lang === 'ar' ? 'لوحة التحكم التنفيذية' : 'Admin Dashboard';
    if (path === '/admin/users') return lang === 'ar' ? 'إدارة المستخدمين' : 'User Management';
    if (path === '/admin/settings') return lang === 'ar' ? 'إعدادات النظام' : 'System Settings';
    if (path === '/archive') return lang === 'ar' ? 'الأرشيف الأكاديمي' : 'Archive';
    if (path === '/settings') return t('settings');
    if (path === '/profile') return t('profile');
    if (path.startsWith('/course/')) return lang === 'ar' ? 'المقرر' : 'Course Details';
    if (path.startsWith('/task/')) return lang === 'ar' ? 'مساحة العمل' : 'Workspace';
    return t('appName');
  };

  const userInitials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
    : 'U';

  return (
    <>
      <nav className="border-b border-[#1F2937] bg-[#111827]/95 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-6 py-2.5 flex items-center justify-between min-h-[56px]">
        {/* Left Side: Off-canvas Hamburger & Page Title */}
        <div className="flex items-center gap-2.5 shrink-0 min-w-0">
          <button
            onClick={onOpenMobileDrawer}
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-300 hover:text-white bg-[#1F2937]/70 border border-[#374151]/50 rounded-xl active:scale-95 transition-transform"
            aria-label="Open Navigation Drawer"
          >
            <Menu className="w-5 h-5 text-blue-400" />
          </button>

          {/* Mobile Title */}
          <h1 className="text-sm sm:text-base font-extrabold text-white truncate max-w-[150px] sm:max-w-none">
            {getPageTitle()}
          </h1>
        </div>

        {/* Right Side: Notifications, Language, Avatar */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Notifications */}
          {(user.role === 'Teacher' || user.role === 'Admin') && (
            <button
              onClick={() => navigate('/teacher/pending-reviews')}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-[#1F2937]/70 hover:bg-[#374151] border border-[#374151]/50 text-amber-400 rounded-xl transition-colors relative active:scale-95"
              aria-label="Pending Reviews & Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            </button>
          )}

          {/* Language Selector */}
          <button
            onClick={toggleLanguage}
            className="min-h-[44px] px-2.5 sm:px-3 bg-[#1F2937]/70 hover:bg-[#374151] border border-[#374151]/50 text-zinc-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 active:scale-95"
            aria-label="Toggle Language"
          >
            <Globe className="w-4 h-4 text-blue-400" />
            <span className="uppercase">{lang === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          {/* User Profile Avatar */}
          <Link
            to="/profile"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-0.5 rounded-xl border border-blue-500/40 bg-blue-600/20 active:scale-95 transition-transform"
            aria-label="User Profile"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center overflow-hidden">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                userInitials
              )}
            </div>
          </Link>
        </div>
      </nav>

      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};


