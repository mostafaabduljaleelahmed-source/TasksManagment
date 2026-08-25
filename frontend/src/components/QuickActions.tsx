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
          className="px-3.5 py-2 bg-[#1A2016] hover:bg-[#37452E] text-secondary-400 border border-[#37452E] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Students Roster</span>
        </Link>
        <Link
          to="/"
          className="px-3.5 py-2 bg-gradient-to-r from-primary-600 to-primary-600 hover:from-primary-500 hover:to-primary-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-primary-950/40 active:scale-95"
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
          className="px-3.5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-primary-950/50 active:scale-95"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Manage Users</span>
        </Link>
        <Link
          to="/admin/settings"
          className="px-3.5 py-2 bg-[#1A2016] hover:bg-[#37452E] text-sage-200 border border-[#37452E] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <Settings className="w-3.5 h-3.5 text-primary-400" />
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
        className="px-3.5 py-2 bg-gradient-to-r from-primary-600 to-primary-600 hover:from-primary-500 hover:to-primary-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-primary-950/40 active:scale-95"
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span>Continue Learning</span>
      </Link>
      <Link
        to="/leaderboard"
        className="px-3.5 py-2 bg-[#1A2016] hover:bg-[#37452E] text-amber-400 border border-[#37452E] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
      >
        <Trophy className="w-3.5 h-3.5" />
        <span>View Rankings</span>
      </Link>
    </div>
  );
};
