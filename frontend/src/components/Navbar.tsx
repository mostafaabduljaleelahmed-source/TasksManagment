import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useTranslation } from '../utils/i18n';
import { GlobalSearchModal } from './GlobalSearchModal';
import { APP_VERSION } from '../constants/version';
import { Menu, Inbox, Search } from 'lucide-react';

interface NavbarProps {
  onOpenMobileDrawer?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileDrawer }) => {
  const { user } = useAuth();
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!user || (user.role !== 'Teacher' && user.role !== 'Admin')) {
      setPendingCount(0);
      return;
    }
    fetch(`${API_URL}/dashboard/teacher/pending-reviews?sortBy=newest`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPendingCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setPendingCount(0));
  }, [user, location.pathname]);

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
      <header className="border-b border-[#1E2519] bg-[#12160F] sticky top-0 z-40 px-3 sm:px-5 py-2 flex items-center justify-between min-h-[44px]">
        <div className="flex items-center gap-2.5 shrink-0 min-w-0">
          <button
            onClick={onOpenMobileDrawer}
            className="md:hidden p-1.5 text-sage-300 hover:text-white bg-[#1A2016] border border-[#37452E] rounded-md flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Open Navigation Drawer"
          >
            <Menu className="w-4 h-4 text-primary-400" />
          </button>
          <h1 className="text-xs sm:text-sm font-bold text-sage-100 truncate max-w-[180px] sm:max-w-none">
            {getPageTitle()}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-primary-400 bg-primary-500/10 border border-primary-500/20 rounded">
            {APP_VERSION}
          </span>

          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-1.5 bg-[#1A2016] hover:bg-[#212B1E] border border-[#37452E] text-sage-300 hover:text-white rounded-md transition-colors flex items-center justify-center cursor-pointer"
            title="Search (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {(user.role === 'Teacher' || user.role === 'Admin') && (
            <button
              onClick={() => navigate('/teacher/pending-reviews')}
              className="p-1.5 bg-[#1A2016] hover:bg-[#212B1E] border border-[#37452E] text-amber-400 rounded-md transition-colors relative flex items-center justify-center cursor-pointer"
              title="Pending Reviews Queue"
            >
              <Inbox className="w-3.5 h-3.5" />
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-500 rounded-full" />
              )}
            </button>
          )}

          <Link
            to="/profile"
            className="p-0.5 rounded-md border border-[#37452E] bg-[#1A2016] transition-transform hover:scale-105 active:scale-95"
            aria-label="User Profile"
          >
            <div className="w-6 h-6 rounded-[5px] bg-primary-600 text-[#06150E] font-bold text-[10px] flex items-center justify-center overflow-hidden">
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
