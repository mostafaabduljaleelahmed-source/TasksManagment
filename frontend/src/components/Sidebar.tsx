import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../utils/i18n';
import { APP_VERSION } from '../constants/version';
import {
  LayoutDashboard, BookOpen, FileCode, Users, Settings, User, LogOut,
  Globe, ShieldCheck, X, Trophy, Archive, Activity, Calendar, MessageSquare,
  ChevronLeft, ChevronRight
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = false,
  onClose,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const { user, logout } = useAuth();
  const { t, lang, setLanguage } = useTranslation();
  const location = useLocation();

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (onToggleCollapse) {
          onToggleCollapse();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleCollapse]);

  if (!user) return null;

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const userInitials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
    : 'U';

  const toggleLanguage = () => {
    setLanguage(lang === 'ar' ? 'en' : 'ar');
  };

  const isTeacherOrAdmin = user.role === 'Teacher' || user.role === 'Admin';

  const renderNavLink = (path: string, label: string, icon: React.ReactNode, activeBgColor: string = 'bg-blue-400') => {
    const active = isActive(path);
    return (
      <div className="relative group/item" key={path}>
        <Link
          to={path}
          onClick={onClose}
          aria-label={label}
          className={`flex items-center gap-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-250 ${
            isCollapsed ? 'justify-center px-0' : 'justify-between px-3.5'
          } ${
            active
              ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 font-bold shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-[#1F2937]/50 border border-transparent'
          }`}
        >
          <span className="flex items-center gap-3 shrink-0">
            {icon}
            {!isCollapsed && <span className="truncate">{label}</span>}
          </span>
          {!isCollapsed && active && <span className={`w-2 h-2 rounded-full ${activeBgColor} shrink-0`} />}
        </Link>

        {/* Hover Tooltip in Collapsed Mode */}
        {isCollapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 px-2.5 py-1.5 bg-[#1F2937] text-white text-xs font-semibold rounded-lg shadow-xl border border-[#374151] whitespace-nowrap opacity-0 pointer-events-none group-hover/item:opacity-100 transition-opacity duration-150">
            {label}
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (collapsed: boolean) => (
    <aside
      className={`w-full bg-[#111827] border-r border-[#1F2937] flex flex-col justify-between h-full select-none transition-all duration-250 ${
        collapsed ? 'items-center px-2 py-4' : 'p-4'
      }`}
    >
      <div className="flex flex-col gap-4 overflow-y-auto w-full">
        {/* Header with Brand Logo, Collapse Toggle, and Mobile Close */}
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-3 min-h-[48px]">
          <Link
            to="/"
            className={`flex items-center gap-3 group shrink-0 ${collapsed ? 'justify-center w-full' : ''}`}
            onClick={onClose}
            aria-label="Home"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-blue-950/50 shrink-0">
              ⚡
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold text-white tracking-tight block leading-none truncate">
                    Classroom SaaS
                  </span>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded">
                    {APP_VERSION}
                  </span>
                </div>
                <span className="text-[10px] text-blue-400 font-bold tracking-wider uppercase mt-1 block truncate">
                  {user.role === 'Teacher' ? 'Instructor' : user.role === 'Admin' ? 'Executive Admin' : 'Student Portal'}
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle Button */}
          {onToggleCollapse && !onClose && (
            <button
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
              title={collapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
              className="hidden md:flex items-center justify-center p-1.5 text-zinc-400 hover:text-white rounded-lg bg-[#1F2937]/80 hover:bg-[#1F2937] border border-[#374151]/50 transition-colors shrink-0"
            >
              {collapsed ? <ChevronRight className="w-4 h-4 text-blue-400" /> : <ChevronLeft className="w-4 h-4 text-blue-400" />}
            </button>
          )}

          {/* Mobile Drawer Close Button */}
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

        {/* Desktop Collapse Button Banner when Collapsed */}
        {onToggleCollapse && !onClose && collapsed && (
          <button
            onClick={onToggleCollapse}
            aria-label="Expand Sidebar"
            title="Expand Sidebar (Ctrl+B)"
            className="hidden md:flex items-center justify-center w-full py-1.5 text-xs text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl transition-colors font-bold"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Navigation Sections */}
        <nav className="space-y-1 w-full">
          {!collapsed && (
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 px-3.5 mb-2 truncate">
              {t('academicHub')}
            </div>
          )}

          {renderNavLink('/dashboard', t('dashboard'), <LayoutDashboard className="w-4 h-4 text-blue-400" />)}
          {renderNavLink('/', t('courses'), <BookOpen className="w-4 h-4 text-indigo-400" />)}
          {renderNavLink('/chat', lang === 'ar' ? 'المحادثات' : 'Chat', <MessageSquare className="w-4 h-4 text-emerald-400" />, 'bg-emerald-400')}
          {renderNavLink('/leaderboard', t('leaderboard'), <Trophy className="w-4 h-4 text-amber-400" />, 'bg-amber-400')}
          {renderNavLink('/calendar', t('calendar'), <Calendar className="w-4 h-4 text-sky-400" />, 'bg-sky-400')}

          {isTeacherOrAdmin && (
            <>
              {!collapsed && (
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 px-3.5 pt-4 mb-2 truncate">
                  {t('teacherTools')}
                </div>
              )}
              {renderNavLink('/teacher/pending-reviews', t('pendingReviews'), <FileCode className="w-4 h-4 text-amber-400" />, 'bg-amber-400')}
              {renderNavLink('/teacher/students', t('students'), <Users className="w-4 h-4 text-sky-400" />, 'bg-sky-400')}
              {renderNavLink('/archive', t('archive'), <Archive className="w-4 h-4 text-amber-400" />, 'bg-amber-400')}
              {renderNavLink('/activity-log', t('activityLog'), <Activity className="w-4 h-4 text-indigo-400" />, 'bg-indigo-400')}
            </>
          )}

          {user.role === 'Admin' && (
            <>
              {!collapsed && (
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-violet-400 px-3.5 pt-4 mb-2 truncate">
                  {t('academyAdmin')}
                </div>
              )}
              {renderNavLink('/admin/dashboard', t('adminDashboard'), <ShieldCheck className="w-4 h-4 text-violet-400" />, 'bg-violet-400')}
              {renderNavLink('/admin/users', t('userManagement'), <Users className="w-4 h-4 text-violet-400" />, 'bg-violet-400')}
              {renderNavLink('/admin/settings', t('systemSettings'), <Settings className="w-4 h-4 text-violet-400" />, 'bg-violet-400')}
            </>
          )}

          {!collapsed && (
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 px-3.5 pt-4 mb-2 truncate">
              {t('preferences')}
            </div>
          )}

          {renderNavLink('/settings', t('settings'), <Settings className="w-4 h-4 text-zinc-400" />)}
          {renderNavLink('/profile', t('profile'), <User className="w-4 h-4 text-zinc-400" />)}
        </nav>
      </div>

      {/* Footer / User Profile & Controls */}
      <div className={`border-t border-[#1F2937] space-y-3 bg-[#0B0F19]/80 w-full ${collapsed ? 'p-2' : 'p-4'}`}>
        {/* Language Switcher */}
        <div className="relative group/lang">
          <button
            onClick={toggleLanguage}
            aria-label="Toggle Language"
            className={`w-full flex items-center bg-[#1F2937]/70 hover:bg-[#1F2937] border border-[#374151]/50 text-zinc-200 rounded-xl text-xs font-bold transition-colors min-h-[44px] ${
              collapsed ? 'justify-center px-0' : 'justify-between px-3.5'
            }`}
          >
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400 shrink-0" />
              {!collapsed && <span>Language</span>}
            </span>
            {!collapsed && (
              <span className="text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                {lang === 'ar' ? 'عربي' : 'English'}
              </span>
            )}
          </button>
          {collapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 px-2.5 py-1.5 bg-[#1F2937] text-white text-xs font-semibold rounded-lg shadow-xl border border-[#374151] whitespace-nowrap opacity-0 pointer-events-none group-hover/lang:opacity-100 transition-opacity duration-150">
              Language ({lang === 'ar' ? 'English' : 'عربي'})
            </div>
          )}
        </div>

        {/* User Card & Logout */}
        <div
          className={`flex items-center bg-[#1F2937]/50 rounded-xl border border-[#374151]/40 ${
            collapsed ? 'justify-center p-2' : 'justify-between p-2.5'
          }`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden shrink-0 border border-blue-400/30">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                userInitials
              )}
            </div>
            {!collapsed && (
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-zinc-400 capitalize truncate">{user.role}</p>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={logout}
              className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={t('logout')}
              title={t('logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <div
        className={`hidden md:flex h-screen sticky top-0 shrink-0 z-30 transition-all duration-250 ease-in-out ${
          isCollapsed ? 'w-[72px]' : 'w-[280px]'
        }`}
      >
        {sidebarContent(isCollapsed)}
      </div>

      {/* Mobile Off-Canvas Drawer (Always Expanded) */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Dimmed Background Overlay */}
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in"
            onClick={onClose}
          />
          {/* Drawer Container */}
          <div className="relative z-10 h-full w-[82vw] max-w-[320px] shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent(false)}
          </div>
        </div>
      )}
    </>
  );
};


