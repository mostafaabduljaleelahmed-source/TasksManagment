import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { ScoreBadge } from '../components/ScoreBadge';
import { MetricsSkeleton } from '../components/SkeletonLoaders';
import { DeadlineCountdown } from '../components/DeadlineCountdown';
import { EmptyState } from '../components/EmptyState';
import { QuickActions } from '../components/QuickActions';
import {
  School, CheckCircle2, Award, MessageSquare, Clock, Bell, ChevronRight, Activity, Calendar, CheckSquare
} from 'lucide-react';

interface TeacherSummary {
  pendingReviewsCount: number;
  missingSubmissionsCount: number;
  submittedTodayCount: number;
  totalGroupsCount: number;
  totalStudentsCount: number;
  overdueAssignmentsCount: number;
}

interface TeacherGroupItem {
  groupId: string;
  groupName: string;
  groupCode: string;
  studentsCount: number;
  assignmentsCount: number;
  pendingReviewsCount: number;
  missingSubmissionsCount: number;
}

interface PendingReviewItem {
  submissionId: string;
  studentId: string;
  studentName: string;
  studentRegisterId: string;
  studentAvatarUrl?: string | null;
  taskId: string;
  taskTitle: string;
  groupName: string;
  submittedAt: string;
}

interface TodayActivityItem {
  submissionId: string;
  studentId: string;
  studentName: string;
  studentRegisterId: string;
  studentAvatarUrl?: string | null;
  taskId: string;
  taskTitle: string;
  groupName: string;
  submittedAt: string;
  grade: number;
  status: string;
}

interface NotificationItem {
  id: string;
  message: string;
  isRead: boolean;
  taskId?: string | null;
  studentId?: string | null;
  submissionId?: string | null;
  createdAt: string;
}

interface PendingAssignmentItem {
  taskId: string;
  title: string;
  courseName: string;
  sessionName: string;
  deadline: string;
  remainingAttempts: number;
  status: string;
}

interface CompletedAssignmentItem {
  taskId: string;
  taskTitle: string;
  courseName: string;
  sessionName: string;
  grade: number;
  maxGrade: number;
  teacherFeedback: string;
  submittedAt: string;
}

interface StudentDashboardData {
  coursesCount: number;
  completedTasks: number;
  pendingTasks: number;
  lateTasks: number;
  pendingAssignments?: PendingAssignmentItem[];
  completedAssignments?: CompletedAssignmentItem[];
  bestGrades: { taskTitle: string; bestGrade: number; maxGrade: number }[];
  recentFeedback: { taskTitle: string; feedback: string; grade: number; feedbackDate: string }[];
  history: { submissionId: string; taskTitle: string; grade: number; submittedAt: string; attemptNumber: number }[];
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Teacher State
  const [summary, setSummary] = useState<TeacherSummary | null>(null);
  const [groups, setGroups] = useState<TeacherGroupItem[]>([]);
  const [recentPending, setRecentPending] = useState<PendingReviewItem[]>([]);
  const [todayActivity, setTodayActivity] = useState<TodayActivityItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Student State
  const [studentData, setStudentData] = useState<StudentDashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!user) return;

    // Reset previous states
    setSummary(null);
    setGroups([]);
    setRecentPending([]);
    setTodayActivity([]);
    setNotifications([]);
    setStudentData(null);

    setLoading(true);
    setError(null);

    try {
      const isTeacherOrAdmin = user.role === 'Teacher' || user.role === 'Admin';
      if (isTeacherOrAdmin) {
        const [sumRes, grpRes, revRes, actRes, notifRes] = await Promise.all([
          fetch(`${API_URL}/dashboard/teacher/summary`, { headers: { Authorization: `Bearer ${user.token}` } }),
          fetch(`${API_URL}/dashboard/teacher/groups`, { headers: { Authorization: `Bearer ${user.token}` } }),
          fetch(`${API_URL}/dashboard/teacher/pending-reviews?sortBy=newest`, { headers: { Authorization: `Bearer ${user.token}` } }),
          fetch(`${API_URL}/dashboard/teacher/today-activity`, { headers: { Authorization: `Bearer ${user.token}` } }),
          fetch(`${API_URL}/dashboard/notifications`, { headers: { Authorization: `Bearer ${user.token}` } }),
        ]);

        if (!sumRes.ok || !grpRes.ok) throw new Error('Failed to load teacher workspace');

        setSummary(await sumRes.json());
        setGroups(await grpRes.json());

        if (revRes.ok) setRecentPending(await revRes.json());
        if (actRes.ok) setTodayActivity(await actRes.json());
        if (notifRes.ok) setNotifications(await notifRes.json());
      } else if (user.role === 'Student') {
        const [res, notifRes] = await Promise.all([
          fetch(`${API_URL}/dashboard/student`, { headers: { Authorization: `Bearer ${user.token}` } }),
          fetch(`${API_URL}/dashboard/notifications`, { headers: { Authorization: `Bearer ${user.token}` } }),
        ]);
        if (!res.ok) throw new Error('Failed to load student dashboard');
        setStudentData(await res.json());
        if (notifRes.ok) setNotifications(await notifRes.json());
      }
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  const location = useLocation();

  useEffect(() => {
    fetchDashboardData();

    const handleFocus = () => fetchDashboardData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user?.id, user?.role, user?.token, location.key]);

  const handleNotificationClick = (n: NotificationItem) => {
    if (n.submissionId) {
      navigate(`/review-submission/${n.submissionId}`);
    } else if (n.taskId) {
      if (user?.role === 'Teacher') {
        navigate('/teacher/pending-reviews');
      } else {
        navigate(`/task/${n.taskId}`);
      }
    } else {
      navigate('/');
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F2937] pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {user?.role === 'Teacher' || user?.role === 'Admin' ? 'Executive Academy & Teaching Workspace' : 'Student Workspace'}
          </h1>
        </div>

        {user && <QuickActions role={user.role as any} />}
      </div>

      {loading ? (
        <MetricsSkeleton />
      ) : error ? (
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-center text-sm">
          {error}
        </div>
      ) : (user?.role === 'Teacher' || user?.role === 'Admin') ? (
        /* TEACHER & EXECUTIVE DASHBOARD VIEW */
        <div className="space-y-10">
          {/* Workload Overview Cards */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#121215] border border-[#24242B] p-4 sm:p-5 rounded-2xl space-y-1 shadow-xl">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Pending Reviews</span>
                <p className="text-3xl font-black text-amber-400">{summary.pendingReviewsCount}</p>
                <span className="text-xs text-zinc-500">Submissions waiting</span>
              </div>
              <div className="bg-[#121215] border border-[#24242B] p-4 sm:p-5 rounded-2xl space-y-1 shadow-xl">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Submitted Today</span>
                <p className="text-3xl font-black text-emerald-400">{summary.submittedTodayCount}</p>
                <span className="text-xs text-zinc-500">Student submissions</span>
              </div>
              <div className="bg-[#121215] border border-[#24242B] p-4 sm:p-5 rounded-2xl space-y-1 shadow-xl">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Teaching Groups</span>
                <p className="text-3xl font-black text-blue-400">{summary.totalGroupsCount}</p>
                <span className="text-xs text-zinc-500">Active courses</span>
              </div>
              <div className="bg-[#121215] border border-[#24242B] p-4 sm:p-5 rounded-2xl space-y-1 shadow-xl">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Enrolled Students</span>
                <p className="text-3xl font-black text-violet-400">{summary.totalStudentsCount}</p>
                <span className="text-xs text-zinc-500">Total roster</span>
              </div>
            </div>
          )}


          {/* Section 1: Pending Reviews */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block animate-pulse" />
                  1. Pending Reviews ({recentPending.length})
                </h2>
                <p className="text-xs text-zinc-400">Student submissions waiting for your grading.</p>
              </div>

              <Link
                to="/teacher/pending-reviews"
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                View All Pending &rarr;
              </Link>
            </div>

            {recentPending.length === 0 ? (
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-8 text-center text-zinc-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                All student submissions are graded! No pending reviews.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentPending.map((item) => (
                  <div
                    key={item.submissionId}
                    onClick={() => navigate(`/review-submission/${item.submissionId}`)}
                    className="bg-[#111827] border border-[#1F2937] hover:border-amber-500/50 rounded-2xl p-5 shadow-lg transition-all flex flex-col justify-between space-y-4 group cursor-pointer"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-lg">
                          {item.groupName}
                        </span>
                        <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-[11px] font-bold">
                          🟡 Pending
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center border border-blue-400/30 overflow-hidden shrink-0">
                          {item.studentAvatarUrl ? (
                            <img src={item.studentAvatarUrl} alt={item.studentName} className="w-full h-full object-cover" />
                          ) : (
                            item.studentName.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                            {item.studentName}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono">{item.studentRegisterId}</p>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-300 font-semibold pt-1">{item.taskTitle}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#1F2937] text-xs">
                      <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        {new Date(item.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        type="button"
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold rounded-xl text-xs transition-colors inline-flex items-center gap-1"
                      >
                        Grade &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Today's Activity */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                2. Today's Activity ({todayActivity.length})
              </h2>
              <p className="text-xs text-zinc-400">Students who submitted an assignment today.</p>
            </div>

            {todayActivity.length === 0 ? (
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-8 text-center text-zinc-500 text-xs">
                <Calendar className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                No student submissions recorded today yet.
              </div>
            ) : (
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-xs text-left text-zinc-300">
                  <thead className="bg-[#1F2937]/50 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-[#1F2937]">
                    <tr>
                      <th className="px-5 py-3.5 font-bold">Student</th>
                      <th className="px-5 py-3.5 font-bold">Assignment</th>
                      <th className="px-4 py-3.5 font-bold">Course / Group</th>
                      <th className="px-4 py-3.5 font-bold">Submission Time</th>
                      <th className="px-4 py-3.5 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]/50">
                    {todayActivity.map((act) => (
                      <tr
                        key={act.submissionId}
                        onClick={() => navigate(`/review-submission/${act.submissionId}`)}
                        className="hover:bg-[#1A2234] transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3.5 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center border border-blue-400/30 overflow-hidden shrink-0">
                            {act.studentAvatarUrl ? (
                              <img src={act.studentAvatarUrl} alt={act.studentName} className="w-full h-full object-cover" />
                            ) : (
                              act.studentName.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white">{act.studentName}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">{act.studentRegisterId}</div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-white">{act.taskTitle}</td>
                        <td className="px-4 py-3.5 font-medium text-blue-400">{act.groupName}</td>
                        <td className="px-4 py-3.5 text-zinc-400">{new Date(act.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-4 py-3.5">
                          {act.status === 'Graded' ? (
                            <ScoreBadge score={act.grade} maxScore={100} />
                          ) : (
                            <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold rounded-lg text-[11px]">
                              🟡 Pending Review
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: My Courses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <School className="w-5 h-5 text-blue-400" />
                  3. My Courses ({groups.length})
                </h2>
                <p className="text-xs text-zinc-400">Overview of your active teaching groups.</p>
              </div>

              <Link to="/" className="text-xs text-blue-400 hover:text-blue-300 font-semibold">
                Manage Courses &rarr;
              </Link>
            </div>

            {groups.length === 0 ? (
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-8 text-center text-zinc-500 text-xs">
                No teaching groups created yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((g) => (
                  <div
                    key={g.groupId}
                    className="bg-[#111827] border border-[#1F2937] hover:border-blue-500/40 rounded-2xl p-6 shadow-xl transition-all flex flex-col justify-between space-y-5 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                          {g.groupCode}
                        </span>
                        <span className="text-[11px] text-zinc-500 font-medium">Group</span>
                      </div>
                      <h3 className="text-lg font-extrabold text-white group-hover:text-blue-300 transition-colors">
                        {g.groupName}
                      </h3>
                    </div>

                    {/* Course Metrics */}
                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#1F2937] text-center">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">Students</span>
                        <p className="text-base font-extrabold text-white">{g.studentsCount}</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">Tasks</span>
                        <p className="text-base font-extrabold text-blue-400">{g.assignmentsCount}</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">Pending</span>
                        <p className={`text-base font-extrabold ${g.pendingReviewsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {g.pendingReviewsCount}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons: Open Course & View Students */}
                    <div className="flex items-center gap-3 pt-1">
                      <Link
                        to={`/course/${g.groupId}`}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors text-center"
                      >
                        Open Course
                      </Link>
                      <Link
                        to="/teacher/students"
                        className="px-3 py-2 bg-[#1F2937] hover:bg-[#374151] border border-[#374151] text-zinc-300 font-semibold rounded-xl text-xs transition-colors text-center"
                      >
                        View Students
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Notifications */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-400" />
                4. Notifications ({notifications.filter(n => !n.isRead).length} unread)
              </h2>
              <p className="text-xs text-zinc-400">Click any notification to navigate directly to the related assignment or submission.</p>
            </div>

            {notifications.length === 0 ? (
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-8 text-center text-zinc-500 text-xs">
                No notifications recorded.
              </div>
            ) : (
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl divide-y divide-[#1F2937] overflow-hidden shadow-xl">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                      n.isRead ? 'bg-[#111827] hover:bg-[#1A2234]' : 'bg-purple-500/5 hover:bg-purple-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${n.isRead ? 'bg-zinc-600' : 'bg-purple-400 animate-pulse'}`} />
                      <div>
                        <p className={`text-xs ${n.isRead ? 'text-zinc-300 font-medium' : 'text-white font-bold'}`}>
                          {n.message}
                        </p>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
                      <span>Navigate</span>
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* LEETCODE & COURSERA STYLE STUDENT DASHBOARD VIEW */
        <div className="space-y-10">

          {/* Gamification & Level Progress Banner */}
          <div className="bg-gradient-to-r from-violet-950/40 via-[#13131B] to-indigo-950/40 border border-violet-500/30 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 border-2 border-violet-400/40 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-violet-950/60">
                  ⚡ 3
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white">Level 3 • Code Practitioner</h2>
                    <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                      🔥 5 Day Streak
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">Total XP: 350 / 500 XP to next level</p>
                </div>
              </div>

              {/* Progress Tracker % */}
              <div className="sm:text-right space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider">Overall Course Completion</span>
                <p className="text-2xl font-black text-emerald-400">
                  {studentData ? Math.round((studentData.completedTasks / Math.max(1, studentData.completedTasks + studentData.pendingTasks)) * 100) : 0}%
                </p>
              </div>
            </div>

            {/* XP Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-[#1A1A22] rounded-full h-3 overflow-hidden border border-[#2B2B38] p-0.5">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: '70%' }} />
              </div>
            </div>

            {/* Badges Showcase */}
            <div className="pt-2 border-t border-[#1F1F2A] flex flex-wrap items-center gap-3">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Earned Badges:</span>
              <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                🏆 First Solved
              </span>
              <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                ⚡ Speed Demon
              </span>
              <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                ⭐ Perfect Score
              </span>
            </div>
          </div>

          {/* Section 1: Pending Assignments */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                1. Pending Assignments ({studentData?.pendingAssignments?.length ?? 0})
              </h2>
              <p className="text-xs text-zinc-400">Assignments waiting to be submitted.</p>
            </div>

            {!studentData?.pendingAssignments || studentData.pendingAssignments.length === 0 ? (
              <EmptyState
                variant="tasks"
                title="No Pending Tasks"
                description="Awesome job! You have submitted all your assignments and have zero pending work."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {studentData.pendingAssignments.map((item) => (
                  <div
                    key={item.taskId}
                    className="bg-[#13131B] border border-[#242432] hover:border-violet-500/50 rounded-2xl p-6 shadow-xl transition-all duration-200 flex flex-col justify-between space-y-4 group hover:-translate-y-0.5"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/25 px-3 py-1 rounded-full shadow-sm">
                            {item.courseName}
                          </span>
                          <span className="text-[11px] font-medium text-zinc-400 bg-zinc-800/80 px-2.5 py-0.5 rounded-md">
                            {item.sessionName}
                          </span>
                        </div>

                        <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold rounded-full text-xs flex items-center gap-1.5 shadow-sm animate-pulse-glow">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          Waiting for Submission
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-1">
                        <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-violet-300 transition-colors">
                          {item.title}
                        </h3>
                      </div>

                      {/* Countdown Timer Component */}
                      <div className="pt-1">
                        <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-bold mb-1">Time Remaining:</div>
                        <DeadlineCountdown deadline={item.deadline} size="md" />
                      </div>
                    </div>

                    {/* Bottom Metadata & CTA */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#1F1F2A] text-xs text-zinc-400">
                      <div className="space-y-1">
                        <p className="text-zinc-400 flex items-center gap-1 text-[11px] font-medium">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                          Due: {new Date(item.deadline).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          Attempts remaining: <span className="font-bold text-zinc-200">{item.remainingAttempts}</span>
                        </p>
                      </div>

                      <Link
                        to={`/task/${item.taskId}`}
                        className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all inline-flex items-center gap-2 shadow-lg shadow-violet-950/40 active:scale-95"
                      >
                        Start Task &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Completed Assignments */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-emerald-400" />
                2. Completed Assignments ({studentData?.completedAssignments?.length ?? 0})
              </h2>
              <p className="text-xs text-zinc-400">Your submitted programming tasks, scores, and teacher comments.</p>
            </div>

            {!studentData?.completedAssignments || studentData.completedAssignments.length === 0 ? (
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-8 text-center text-zinc-500 text-xs">
                No completed assignments recorded yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studentData.completedAssignments.map((comp) => (
                  <div key={comp.taskId} className="bg-[#111827] border border-[#1F2937] rounded-2xl p-5 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/20">
                        {comp.courseName}
                      </span>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg">
                        Grade: {comp.grade} / {comp.maxGrade} pts
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-white">{comp.taskTitle}</h3>

                    <div className="bg-[#0B0F19] p-3 rounded-xl border border-[#1F2937] text-xs space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Teacher Feedback:</span>
                      <p className="text-zinc-300 leading-relaxed italic">"{comp.teacherFeedback}"</p>
                    </div>

                    <div className="text-[11px] text-zinc-500 text-right">
                      Submitted: {new Date(comp.submittedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Latest Feedback */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-sky-400" />
                3. Latest Feedback ({studentData?.recentFeedback?.length ?? 0})
              </h2>
              <p className="text-xs text-zinc-400">Direct feedback received from your teachers.</p>
            </div>

            {!studentData?.recentFeedback || studentData.recentFeedback.length === 0 ? (
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-8 text-center text-zinc-500 text-xs">
                No teacher feedback received yet. Submit your assignments to receive feedback and grades!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studentData.recentFeedback.map((fb, idx) => (
                  <div key={idx} className="bg-[#111827] border border-[#1F2937] rounded-2xl p-5 space-y-2 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{fb.taskTitle}</span>
                      <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                        Score: {fb.grade} pts
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed bg-[#0B0F19] p-3 rounded-xl border border-[#1F2937]">
                      "{fb.feedback}"
                    </p>
                    <p className="text-[10px] text-zinc-500 text-right">
                      {new Date(fb.feedbackDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Recent Grades */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-400" />
                4. Recent Grades ({studentData?.history?.length ?? 0})
              </h2>
              <p className="text-xs text-zinc-400">Recent assignment scores and submission attempt history.</p>
            </div>

            {!studentData?.history || studentData.history.length === 0 ? (
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-8 text-center text-zinc-500 text-xs">
                No past grades recorded yet. Open your course syllabus to solve assignments.
              </div>
            ) : (
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-[#1F2937]/50 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-[#1F2937]">
                    <tr>
                      <th className="px-5 py-3.5 font-bold">Assignment</th>
                      <th className="px-4 py-3.5 font-bold">Attempt #</th>
                      <th className="px-4 py-3.5 font-bold">Date Turned In</th>
                      <th className="px-4 py-3.5 font-bold">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]/50">
                    {studentData.history.map((item) => (
                      <tr key={item.submissionId} className="hover:bg-[#1A2234] transition-colors">
                        <td className="px-5 py-3.5 font-bold text-white">{item.taskTitle}</td>
                        <td className="px-4 py-3.5 font-mono text-zinc-400">#{item.attemptNumber}</td>
                        <td className="px-4 py-3.5 text-zinc-400">{new Date(item.submittedAt).toLocaleString()}</td>
                        <td className="px-4 py-3.5">
                          <ScoreBadge score={item.grade} maxScore={100} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
