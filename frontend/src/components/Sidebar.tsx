import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../utils/i18n';
import { APP_VERSION } from '../constants/version';
import {
  LayoutDashboard, BookOpen, Users, Settings, User, LogOut,
  Globe, ShieldCheck, X, Trophy, Archive, Activity, Calendar, MessageSquare,
  ChevronLeft, ChevronRight, Inbox
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

  const firstName = user.name ? user.name.trim().split(/\s+/)[0] : '';
  const displayName = firstName || user.name || 'User';

  const toggleLanguage = () => {
    setLanguage(lang === 'ar' ? 'en' : 'ar');
  };

  const isTeacherOrAdmin = user.role === 'Teacher' || user.role === 'Admin';

  const renderNavItem = (
    path: string,
    label: string,
    icon: React.ReactNode,
    badgeText?: string
  ) => {
    const active = isActive(path);
    return (
      <div key={path} className="relative group/item">
        <Link
          to={path}
          onClick={onClose}
          aria-label={label}
          className={`flex items-center gap-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
            isCollapsed ? 'justify-center px-0' : 'justify-between px-2.5'
          } ${
            active
              ? 'bg-[#1E2638] text-white font-semibold border-l-2 border-blue-500'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#151B28]'
          }`}
        >
          <span className="flex items-center gap-2.5 shrink-0 min-w-0">
            {icon}
            {!isCollapsed && <span className="truncate">{label}</span>}
          </span>
          {!isCollapsed && badgeText && (
            <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded shrink-0">
              {badgeText}
            </span>
          )}
        </Link>
        {isCollapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 px-2 py-1 bg-[#182030] text-slate-100 text-xs rounded border border-[#2A364F] whitespace-nowrap opacity-0 pointer-events-none group-hover/item:opacity-100 transition-opacity">
            {label}
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (collapsed: boolean) => (
    <aside
      className={`w-full bg-[#0E121A] border-r border-[#1B2333] flex flex-col justify-between h-full select-none transition-all duration-200 ${
        collapsed ? 'items-center px-2 py-3' : 'p-3'
      }`}
    >
      <div className="flex flex-col gap-3 overflow-y-auto w-full">
        {/* Institutional Header */}
        <div className="flex items-center justify-between border-b border-[#1B2333] pb-3 min-h-[42px]">
          <Link
            to="/"
            className={`flex items-center gap-2.5 group shrink-0 ${collapsed ? 'justify-center w-full' : ''}`}
            onClick={onClose}
          >
            <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
              TP
            </div>
            {!collapsed && (
              <div className="overflow-hidden min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white tracking-tight leading-none truncate">
                    Academic Grading
                  </span>
                  <span className="px-1 py-0.2 text-[9px] font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded">
                    {APP_VERSION}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase mt-0.5 block truncate">
                  {user.role === 'Teacher'
                    ? 'Faculty Portal'
                    : user.role === 'Admin'
                    ? 'Administrator'
                    : 'Student Workspace'}
                </span>
              </div>
            )}
          </Link>

          {onToggleCollapse && !onClose && (
            <button
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              title="Ctrl+B"
              className="hidden md:flex items-center justify-center p-1 text-slate-400 hover:text-white rounded bg-[#161C28] border border-[#232F45] transition-colors shrink-0"
            >
              {collapsed ? (
                <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5 text-blue-400" />
              )}
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 text-slate-400 hover:text-white rounded bg-[#161C28] border border-[#232F45] flex items-center justify-center"
              aria-label="Close Drawer"
            >
              <X className="w-4 h-4 text-slate-300" />
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-0.5 w-full">
          {!collapsed && (
            <div className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-500 px-2 mt-2 mb-1 truncate">
              Academic Operations
            </div>
          )}
          {renderNavItem('/dashboard', t('dashboard'), <LayoutDashboard className="w-3.5 h-3.5 text-blue-400" />)}
          {renderNavItem('/', t('courses'), <BookOpen className="w-3.5 h-3.5 text-slate-400" />)}
          {renderNavItem('/chat', lang === 'ar' ? 'المحادثات' : 'Messages', <MessageSquare className="w-3.5 h-3.5 text-slate-400" />)}
          {renderNavItem('/leaderboard', t('leaderboard'), <Trophy className="w-3.5 h-3.5 text-slate-400" />)}
          {renderNavItem('/calendar', t('calendar'), <Calendar className="w-3.5 h-3.5 text-slate-400" />)}

          {isTeacherOrAdmin && (
            <>
              {!collapsed && (
                <div className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-500 px-2 pt-3 mb-1 truncate">
                  Review & Evaluation
                </div>
              )}
              {renderNavItem('/teacher/pending-reviews', t('pendingReviews'), <Inbox className="w-3.5 h-3.5 text-amber-400" />, 'Queue')}
              {renderNavItem('/teacher/students', t('students'), <Users className="w-3.5 h-3.5 text-slate-400" />)}
              {renderNavItem('/archive', t('archive'), <Archive className="w-3.5 h-3.5 text-slate-400" />)}
              {renderNavItem('/activity-log', t('activityLog'), <Activity className="w-3.5 h-3.5 text-slate-400" />)}
            </>
          )}

          {user.role === 'Admin' && (
            <>
              {!collapsed && (
                <div className="text-[10px] font-bold font-mono uppercase tracking-wider text-blue-400 px-2 pt-3 mb-1 truncate">
                  System Administration
                </div>
              )}
              {renderNavItem('/admin/dashboard', t('adminDashboard'), <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />)}
              {renderNavItem('/admin/users', t('userManagement'), <Users className="w-3.5 h-3.5 text-blue-400" />)}
              {renderNavItem('/admin/settings', t('systemSettings'), <Settings className="w-3.5 h-3.5 text-blue-400" />)}
            </>
          )}

          {!collapsed && (
            <div className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-500 px-2 pt-3 mb-1 truncate">
              User Preferences
            </div>
          )}
          {renderNavItem('/settings', t('settings'), <Settings className="w-3.5 h-3.5 text-slate-400" />)}
          {renderNavItem('/profile', t('profile'), <User className="w-3.5 h-3.5 text-slate-400" />)}
        </nav>
      </div>

      {/* Institutional User & Language Footer */}
      <div className="border-t border-[#1B2333] pt-2.5 space-y-2 bg-[#0E121A] w-full">
        <button
          onClick={toggleLanguage}
          className={`w-full flex items-center bg-[#151B28] hover:bg-[#1E2638] border border-[#232F45] text-slate-300 rounded text-xs py-1.5 transition-colors ${
            collapsed ? 'justify-center px-0' : 'justify-between px-2.5'
          }`}
        >
          <span className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            {!collapsed && <span>Language</span>}
          </span>
          {!collapsed && (
            <span className="text-[9px] font-mono font-bold uppercase bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
              {lang === 'ar' ? 'عربي' : 'English'}
            </span>
          )}
        </button>

        <div className="bg-[#151B28] rounded border border-[#232F45] p-2 w-full space-y-2">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-2`}>
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <div className="w-7 h-7 rounded bg-blue-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden shrink-0 border border-blue-400/30">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  userInitials
                )}
              </div>
              {!collapsed && (
                <div className="min-w-0 overflow-hidden">
                  <p className="text-xs font-semibold text-white truncate">{displayName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.role}</p>
                </div>
              )}
            </div>
            {collapsed && (
              <button
                onClick={logout}
                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors shrink-0"
                title={t('logout')}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-1.5 py-1 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded text-[11px] font-semibold transition-colors"
            >
              <LogOut className="w-3 h-3 shrink-0" />
              <span>{t('logout')}</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div
        className={`hidden md:flex h-screen sticky top-0 shrink-0 z-30 transition-all duration-200 ${
          isCollapsed ? 'w-[64px]' : 'w-[240px]'
        }`}
      >
        {sidebarContent(isCollapsed)}
      </div>

      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
          <div className="relative z-10 h-full w-[80vw] max-w-[280px] shadow-2xl">
            {sidebarContent(false)}
          </div>
        </div>
      )}
    </>
  );
};
