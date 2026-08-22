import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../utils/i18n';
import { GlobalSearchModal } from './GlobalSearchModal';
import { APP_VERSION } from '../constants/version';
import { Menu, Inbox } from 'lucide-react';

interface NavbarProps {
  onOpenMobileDrawer?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileDrawer }) => {
  const { user } = useAuth();
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  if (!user) return null;

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
      <header className="border-b border-[#1B2333] bg-[#0E121A] sticky top-0 z-40 px-3 sm:px-5 py-2 flex items-center justify-between min-h-[44px]">
        <div className="flex items-center gap-2.5 shrink-0 min-w-0">
          <button
            onClick={onOpenMobileDrawer}
            className="md:hidden p-1.5 text-slate-300 hover:text-white bg-[#151B28] border border-[#232F45] rounded flex items-center justify-center cursor-pointer"
            aria-label="Open Navigation Drawer"
          >
            <Menu className="w-4 h-4 text-blue-400" />
          </button>
          <h1 className="text-xs sm:text-sm font-bold text-slate-100 truncate max-w-[180px] sm:max-w-none">
            {getPageTitle()}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded">
            {APP_VERSION}
          </span>

          {(user.role === 'Teacher' || user.role === 'Admin') && (
            <button
              onClick={() => navigate('/teacher/pending-reviews')}
              className="p-1.5 bg-[#151B28] hover:bg-[#1E2638] border border-[#232F45] text-amber-400 rounded transition-colors relative flex items-center justify-center cursor-pointer"
              title="Pending Reviews Queue"
            >
              <Inbox className="w-3.5 h-3.5" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-500 rounded-full" />
            </button>
          )}

          <Link
            to="/profile"
            className="p-0.5 rounded border border-[#232F45] bg-[#151B28] transition-transform"
            aria-label="User Profile"
          >
            <div className="w-6 h-6 rounded bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center overflow-hidden">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                userInitials
              )}
            </div>
          </Link>
        </div>
      </header>

      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
