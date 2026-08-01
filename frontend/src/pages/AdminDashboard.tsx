import React, { useEffect, useState } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { 
  Users, GraduationCap, BookOpen, Layers, CheckSquare, Send, 
  Clock, AlertCircle, ChevronRight, ShieldCheck, UserCheck 
} from 'lucide-react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { QuickActions } from '../components/QuickActions';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalSessions: number;
  totalTasks: number;
  totalSubmissions: number;
  pendingReviews: number;
  recentActivity: Array<{
    id: string;
    action: string;
    details: string;
    userName: string;
    userRole: string;
    timestamp: string;
  }>;
  newestStudents: Array<{
    id: string;
    name: string;
    email: string;
    studentId?: string;
    joinedAt: string;
    isDisabled: boolean;
  }>;
  newestCourses: Array<{
    id: string;
    name: string;
    courseCode: string;
    teacherName: string;
    createdAt: string;
  }>;
}

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/dashboard-stats`, {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to load admin stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-violet-400">
          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Loading Admin Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Executive Dashboard' }]} />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-violet-950/40 via-[#121217] to-indigo-950/40 p-6 rounded-2xl border border-violet-500/20">
          <div>
            <div className="flex items-center gap-2 text-violet-400 font-semibold text-xs uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Academy Executive Control</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">System Overview & Analytics</h1>
            <p className="text-xs text-zinc-400 mt-1">Real-time statistics for students, instructors, courses, and submission workloads.</p>
          </div>
          <QuickActions role="Admin" />
        </div>

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-[#121215] border border-[#24242B] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">Students</span>
              <GraduationCap className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-2xl font-black text-white">{stats?.totalStudents || 0}</p>
            <span className="text-[10px] text-zinc-500 font-medium">Active Learners</span>
          </div>

          <div className="bg-[#121215] border border-[#24242B] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">Teachers</span>
              <Users className="w-4 h-4 text-violet-400" />
            </div>
            <p className="text-2xl font-black text-white">{stats?.totalTeachers || 0}</p>
            <span className="text-[10px] text-zinc-500 font-medium">Instructors</span>
          </div>

          <div className="bg-[#121215] border border-[#24242B] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">Courses</span>
              <BookOpen className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-white">{stats?.totalCourses || 0}</p>
            <span className="text-[10px] text-zinc-500 font-medium">Published Classes</span>
          </div>

          <div className="bg-[#121215] border border-[#24242B] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">Sessions</span>
              <Layers className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-white">{stats?.totalSessions || 0}</p>
            <span className="text-[10px] text-zinc-500 font-medium">Learning Modules</span>
          </div>

          <div className="bg-[#121215] border border-[#24242B] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">Tasks</span>
              <CheckSquare className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-black text-white">{stats?.totalTasks || 0}</p>
            <span className="text-[10px] text-zinc-500 font-medium">Assignments</span>
          </div>

          <div className="bg-[#121215] border border-[#24242B] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">Submissions</span>
              <Send className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-black text-white">{stats?.totalSubmissions || 0}</p>
            <span className="text-[10px] text-zinc-500 font-medium">Code Runs</span>
          </div>

          <div className="bg-[#121215] border border-amber-500/20 rounded-xl p-4 space-y-2 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-300 uppercase">Pending</span>
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-400">{stats?.pendingReviews || 0}</p>
            <span className="text-[10px] text-amber-400/80 font-medium">Reviews Needed</span>
          </div>
        </div>

        {/* Secondary Detailed Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Newest Students */}
          <div className="bg-[#121215] border border-[#24242B] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F1F26] pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-extrabold text-white">Newest Students</h3>
              </div>
              <Link to="/admin/users" className="text-xs text-violet-400 hover:underline font-semibold flex items-center gap-0.5">
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {stats?.newestStudents && stats.newestStudents.length > 0 ? (
                stats.newestStudents.map((st) => (
                  <div key={st.id} className="flex items-center justify-between p-3 bg-[#17171C] border border-[#22222A] rounded-xl">
                    <div>
                      <h4 className="text-xs font-bold text-white">{st.name}</h4>
                      <p className="text-[10px] text-zinc-400 font-mono">{st.email}</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded">
                      {st.studentId || 'N/A'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 py-4 text-center">No students registered yet.</p>
              )}
            </div>
          </div>

          {/* Newest Courses */}
          <div className="bg-[#121215] border border-[#24242B] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F1F26] pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-extrabold text-white">Newest Courses</h3>
              </div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Academy Catalog
              </span>
            </div>

            <div className="space-y-3">
              {stats?.newestCourses && stats.newestCourses.length > 0 ? (
                stats.newestCourses.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-[#17171C] border border-[#22222A] rounded-xl">
                    <div>
                      <h4 className="text-xs font-bold text-white">{c.name}</h4>
                      <p className="text-[10px] text-zinc-400">Teacher: {c.teacherName}</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                      {c.courseCode}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 py-4 text-center">No courses published yet.</p>
              )}
            </div>
          </div>

          {/* Recent System Activity */}
          <div className="bg-[#121215] border border-[#24242B] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F1F26] pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-extrabold text-white">Recent System Activity</h3>
              </div>
            </div>

            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((act) => (
                  <div key={act.id} className="p-2.5 bg-[#17171C] border border-[#22222A] rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-violet-300">{act.action}</span>
                      <span className="text-[9px] text-zinc-500">{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-tight">{act.details}</p>
                    <span className="text-[9px] text-zinc-500 block">By: {act.userName} ({act.userRole})</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 py-4 text-center">No recent activity recorded.</p>
              )}
            </div>
          </div>
        </div>
    </div>
  );
};
