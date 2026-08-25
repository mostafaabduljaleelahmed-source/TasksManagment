import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import {
  Activity, Clock, BookOpen, FileCode, Search,
  GraduationCap, CheckCircle2, MessageSquare, ShieldAlert, Plus, Award
} from 'lucide-react';

interface ActivityLogItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  userAvatarUrl?: string | null;
  action: string;
  details: string;
  courseId?: string | null;
  courseName?: string | null;
  taskId?: string | null;
  taskTitle?: string | null;
}

export const ActivityLogPage: React.FC = () => {
  const { user } = useAuth();

  if (user && user.role === 'Student') {
    return <Navigate to="/dashboard" replace />;
  }

  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/activity-logs`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (!res.ok) throw new Error('Failed to load activity logs');
        const data = await res.json();
        setLogs(data);
      } catch (err: any) {
        setError(err.message || 'Error loading activity log');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [user]);

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.userName.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term) ||
      (log.courseName && log.courseName.toLowerCase().includes(term)) ||
      (log.taskTitle && log.taskTitle.toLowerCase().includes(term))
    );
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'Course Creation':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary-500/15 text-primary-400 border border-primary-500/30">
            <BookOpen className="w-3 h-3" /> Course Creation
          </span>
        );
      case 'Student Joined':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-secondary-500/15 text-secondary-300 border border-secondary-500/30">
            <GraduationCap className="w-3 h-3" /> Student Joined
          </span>
        );
      case 'Assignment Created':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary-500/15 text-primary-300 border border-primary-500/30">
            <Plus className="w-3 h-3" /> Assignment Created
          </span>
        );
      case 'Assignment Submission':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Assignment Submission
          </span>
        );
      case 'Grade Updated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Award className="w-3 h-3" /> Grade Updated
          </span>
        );
      case 'Teacher Feedback':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-secondary-500/15 text-secondary-300 border border-secondary-500/30">
            <MessageSquare className="w-3 h-3" /> Teacher Feedback
          </span>
        );
      case 'Student Removal':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
            <ShieldAlert className="w-3 h-3" /> Student Removed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sage-800 text-sage-300 border border-sage-700">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-[#212B1E] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-3 tracking-tight">
            <Activity className="w-6 h-6 text-primary-400" />
            Platform Activity Audit Log
          </h1>
        </div>

        {/* Filter Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-sage-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by user, action, course..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1A2016] border border-[#37452E] focus:border-primary-500 text-white rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:outline-none transition-all placeholder:text-sage-500"
          />
        </div>
      </div>

      {/* Log Feed Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-sage-500">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs">Loading audit log...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-center text-sm">
          {error}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-[#12160F] border border-[#212B1E] rounded-2xl p-12 text-center text-sage-500 text-xs">
          No activity logs match your filter criteria.
        </div>
      ) : (
        <div className="bg-[#12160F] border border-[#212B1E] rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-sage-300">
              <thead className="bg-[#212B1E]/50 uppercase text-[10px] font-bold text-sage-400 border-b border-[#212B1E]">
                <tr>
                  <th className="py-3.5 px-4">Time</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Related Course</th>
                  <th className="py-3.5 px-4">Related Assignment</th>
                  <th className="py-3.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#212B1E]">
                {filteredLogs.map((item) => (
                  <tr key={item.id} className="hover:bg-[#1E2519] transition-colors">
                    {/* Time */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-sage-400 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-sage-500 shrink-0" />
                        <span>{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                    </td>

                    {/* User */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-primary-600 text-white font-bold text-[10px] flex items-center justify-center overflow-hidden shrink-0">
                          {item.userAvatarUrl ? (
                            <img src={item.userAvatarUrl} alt={item.userName} className="w-full h-full object-cover" />
                          ) : (
                            item.userName.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-white block leading-tight">{item.userName}</span>
                          <span className="text-[10px] text-sage-500 font-semibold">{item.userRole}</span>
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getActionBadge(item.action)}
                    </td>

                    {/* Related Course */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.courseId && item.courseName ? (
                        <Link
                          to={`/course/${item.courseId}`}
                          className="font-bold text-primary-400 hover:text-primary-300 hover:underline transition-colors flex items-center gap-1"
                        >
                          <BookOpen className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.courseName}</span>
                        </Link>
                      ) : (
                        <span className="text-sage-600 font-mono">-</span>
                      )}
                    </td>

                    {/* Related Assignment */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.taskId && item.taskTitle ? (
                        <Link
                          to={user?.role === 'Teacher' ? '/teacher/pending-reviews' : `/task/${item.taskId}`}
                          className="font-bold text-amber-400 hover:text-amber-300 hover:underline transition-colors flex items-center gap-1"
                        >
                          <FileCode className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.taskTitle}</span>
                        </Link>
                      ) : (
                        <span className="text-sage-600 font-mono">-</span>
                      )}
                    </td>

                    {/* Details */}
                    <td className="py-3.5 px-4 text-sage-300 leading-relaxed max-w-xs">
                      {item.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
