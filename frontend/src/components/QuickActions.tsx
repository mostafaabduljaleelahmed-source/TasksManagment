import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, BookOpen, FileCode, Trophy, Settings, UserPlus } from 'lucide-react';

interface QuickActionsProps {
  role: 'Student' | 'Teacher' | 'Admin';
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ role, className = '' }) => {
  if (role === 'Teacher') {
    return (
      <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
        <Link
          to="/teacher/pending-reviews"
          className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Pending Reviews</span>
        </Link>
        <Link
          to="/teacher/students"
          className="px-3.5 py-2 bg-[#1F1F24] hover:bg-[#2F2F37] text-sky-400 border border-[#2F2F37] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Students Roster</span>
        </Link>
        <Link
          to="/"
          className="px-3.5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-violet-950/40 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>My Teaching Courses</span>
        </Link>
      </div>
    );
  }

  if (role === 'Admin') {
    return (
      <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
        <Link
          to="/admin/users"
          className="px-3.5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-violet-950/50 active:scale-95"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Manage Users</span>
        </Link>
        <Link
          to="/admin/settings"
          className="px-3.5 py-2 bg-[#1F1F24] hover:bg-[#2F2F37] text-zinc-200 border border-[#2F2F37] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <Settings className="w-3.5 h-3.5 text-violet-400" />
          <span>System Settings</span>
        </Link>
      </div>
    );
  }

  // Student Quick Actions
  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      <Link
        to="/"
        className="px-3.5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-violet-950/40 active:scale-95"
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span>Continue Learning</span>
      </Link>
      <Link
        to="/leaderboard"
        className="px-3.5 py-2 bg-[#1F1F24] hover:bg-[#2F2F37] text-amber-400 border border-[#2F2F37] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
      >
        <Trophy className="w-3.5 h-3.5" />
        <span>View Rankings</span>
      </Link>
    </div>
  );
};
