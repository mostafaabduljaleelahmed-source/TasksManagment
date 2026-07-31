import React from 'react';
import { FolderOpen, Inbox, Trophy, Users, Bell, Search, CheckCircle2 } from 'lucide-react';

export type EmptyStateVariant = 'general' | 'tasks' | 'students' | 'notifications' | 'leaderboard' | 'search' | 'completed';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const defaultPresets: Record<EmptyStateVariant, { icon: React.ReactNode; title: string; description: string }> = {
  general: {
    icon: <FolderOpen className="w-8 h-8 text-violet-400" />,
    title: 'No Data Found',
    description: 'There are currently no items available to display here.',
  },
  tasks: {
    icon: <Inbox className="w-8 h-8 text-violet-400" />,
    title: 'No Tasks Yet',
    description: 'You are all caught up! No pending assignments or tasks available right now.',
  },
  students: {
    icon: <Users className="w-8 h-8 text-blue-400" />,
    title: 'No Students Enrolled',
    description: 'No students have been enrolled in this course or classroom yet.',
  },
  notifications: {
    icon: <Bell className="w-8 h-8 text-amber-400" />,
    title: 'No Notifications',
    description: 'You have no unread notifications or announcements at this time.',
  },
  leaderboard: {
    icon: <Trophy className="w-8 h-8 text-yellow-400" />,
    title: 'No Leaderboard Data',
    description: 'Scores will appear here once students begin submitting tasks.',
  },
  search: {
    icon: <Search className="w-8 h-8 text-zinc-400" />,
    title: 'No Results Found',
    description: 'We could not find anything matching your search criteria. Try adjusting your filter.',
  },
  completed: {
    icon: <CheckCircle2 className="w-8 h-8 text-emerald-400" />,
    title: 'All Completed',
    description: 'Great job! All pending tasks and reviews have been completed.',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'general',
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  const preset = defaultPresets[variant] || defaultPresets.general;
  const displayIcon = icon || preset.icon;
  const displayTitle = title || preset.title;
  const displayDescription = description || preset.description;

  return (
    <div
      className={`bg-[#16161A]/80 border border-[#24242B] backdrop-blur-md rounded-2xl p-8 sm:p-10 text-center flex flex-col items-center justify-center max-w-md mx-auto space-y-4 my-6 shadow-xl transition-all duration-300 hover:border-violet-500/30 ${className}`}
    >
      <div className="p-4 bg-violet-600/10 border border-violet-500/20 rounded-2xl shadow-inner relative group">
        <div className="absolute inset-0 rounded-2xl bg-violet-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative z-10">{displayIcon}</div>
      </div>

      <div className="space-y-1">
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">{displayTitle}</h3>
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xs mx-auto">{displayDescription}</p>
      </div>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-95 text-white font-semibold text-xs py-2.5 px-5 rounded-xl shadow-lg transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
