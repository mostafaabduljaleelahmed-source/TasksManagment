import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { MetricsSkeleton } from '../components/SkeletonLoaders';
import { StudentDetailsModal } from './StudentDetailsModal';
import {
  BookOpen, Clock, Award, CheckCircle2, AlertCircle,
  FileCode, ArrowRight, MessageSquare, Plus, Trophy, BarChart3, TrendingUp
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

interface StudentDashboardData {
  coursesCount: number;
  completedTasks: number;
  pendingTasks: number;
  lateTasks: number;
  bestGrades: Array<{ taskTitle: string; bestGrade: number; maxGrade: number }>;
  recentFeedback: Array<{ taskTitle: string; feedback: string; grade: number; feedbackDate: string }>;
  history: Array<{ submissionId: string; taskTitle: string; grade: number; submittedAt: string; attemptNumber: number }>;
}

interface TeacherDashboardTelemetry {
  totalCourses: number;
  totalStudents: number;
  totalTasks: number;
  totalSubmissions: number;
  overallAverageGrade: number;
  submissionTrends: Array<{ date: string; submissions: number }>;
  pendingReviews: Array<{
    submissionId: string;
    studentId: string;
    studentName: string;
    studentRegisterId: string;
    taskId: string;
    taskTitle: string;
    maxGrade: number;
    submittedAt: string;
    attemptNumber: number;
  }>;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const [studentData, setStudentData] = useState<StudentDashboardData | null>(null);
  const [teacherTelemetry, setTeacherTelemetry] = useState<TeacherDashboardTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review modal state for teacher
  const [selectedReview, setSelectedReview] = useState<{
    studentId: string;
    studentName: string;
    studentRegisterId: string;
    taskId: string;
    taskTitle: string;
    maxGrade: number;
  } | null>(null);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      if (user.role === 'Teacher') {
        const res = await fetch(`${API_URL}/dashboard/teacher/analytics`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (!res.ok) throw new Error('Failed to load teacher dashboard telemetry');
        const data = await res.json();
        setTeacherTelemetry(data);
      } else {
        const res = await fetch(`${API_URL}/dashboard/student`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (!res.ok) throw new Error('Failed to load student dashboard telemetry');
        const data = await res.json();
        setStudentData(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 pb-16 relative overflow-hidden">
      <Navbar />

      {/* Ambient background glows */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      <main className="max-w-7xl mx-auto px-6 mt-8 relative z-10 space-y-8">
        {/* Welcome Header & Quick Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#16161A] border border-[#24242B] p-6 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-600/10 to-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
          <div>
            <span className="text-xs text-violet-400 font-extrabold uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full">
              SaaS Classroom Hub
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-2">
              Welcome back, {user?.name}! 👋
            </h1>
            <p className="text-zinc-400 text-xs md:text-sm mt-1">
              {user?.role === 'Teacher'
                ? 'Overview of your active teaching groups, pending reviews, and class performance analytics.'
                : 'Track your current programming tasks, submission history, grades, and teacher feedback.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {user?.role === 'Teacher' ? (
              <>
                <Link
                  to="/"
                  className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Manage Groups
                </Link>
                <Link
                  to="/analytics"
                  className="flex items-center gap-2 bg-[#1F1F24] hover:bg-[#2F2F37] border border-[#2F2F37] text-zinc-300 hover:text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all"
                >
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Analytics
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/"
                  className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all"
                >
                  <BookOpen className="w-4 h-4" />
                  My Groups
                </Link>
                <Link
                  to="/leaderboard"
                  className="flex items-center gap-2 bg-[#1F1F24] hover:bg-[#2F2F37] border border-[#2F2F37] text-zinc-300 hover:text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Leaderboard
                </Link>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-950/40 border border-red-800/50 text-red-300 rounded-xl text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricsSkeleton />
            <MetricsSkeleton />
            <MetricsSkeleton />
            <MetricsSkeleton />
          </div>
        ) : user?.role === 'Teacher' && teacherTelemetry ? (
          /* ================= TEACHER DASHBOARD VIEW ================= */
          <div className="space-y-8">
            {/* Top Telemetry Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl shadow-xl flex flex-col justify-between">
                <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400 w-fit mb-3">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-3xs text-zinc-400 uppercase tracking-wider block font-semibold">Active Groups</span>
                  <span className="text-2xl font-black text-white mt-1 block">{teacherTelemetry.totalCourses}</span>
                </div>
              </div>

              <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl shadow-xl flex flex-col justify-between">
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 w-fit mb-3">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-3xs text-zinc-400 uppercase tracking-wider block font-semibold">Class Avg Grade</span>
                  <span className="text-2xl font-black text-indigo-400 mt-1 block">{teacherTelemetry.overallAverageGrade}%</span>
                </div>
              </div>

              <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl shadow-xl flex flex-col justify-between">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 w-fit mb-3">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-3xs text-zinc-400 uppercase tracking-wider block font-semibold">Pending Reviews</span>
                  <span className="text-2xl font-black text-amber-400 mt-1 block">{teacherTelemetry.pendingReviews.length}</span>
                </div>
              </div>

              <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl shadow-xl flex flex-col justify-between">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 w-fit mb-3">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-3xs text-zinc-400 uppercase tracking-wider block font-semibold">Total Submissions</span>
                  <span className="text-2xl font-black text-emerald-400 mt-1 block">{teacherTelemetry.totalSubmissions}</span>
                </div>
              </div>
            </div>

            {/* Middle Row: Submission Velocity Chart & Pending Reviews Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Submission Trend Graph */}
              <div className="lg:col-span-2 bg-[#16161A] border border-[#24242B] rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-violet-400" />
                    <h3 className="text-lg font-bold text-white">Classroom Submission Activity</h3>
                  </div>
                  <Link to="/analytics" className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1">
                    Full Analytics <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={teacherTelemetry.submissionTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dashGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#24242B" />
                      <XAxis dataKey="date" stroke="#71717A" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#71717A" tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1A1A22', borderColor: '#2F2F37', borderRadius: '12px', color: '#FFF' }}
                        formatter={(val: any) => [`${val} submissions`, 'Volume']}
                      />
                      <Area type="monotone" dataKey="submissions" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#dashGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pending Reviews Box */}
              <div className="bg-[#16161A] border border-[#24242B] rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-[#24242B] pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <h3 className="text-base font-bold text-white">Pending Reviews</h3>
                  </div>
                  <span className="text-3xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                    {teacherTelemetry.pendingReviews.length} Tasks
                  </span>
                </div>

                {teacherTelemetry.pendingReviews.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-xs text-zinc-400">All student submissions graded!</p>
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto max-h-64 pr-1">
                    {teacherTelemetry.pendingReviews.slice(0, 5).map((rev) => (
                      <div key={rev.submissionId} className="bg-[#1F1F24] border border-[#2F2F37] p-3 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-white block">{rev.studentName}</span>
                          <span className="text-2xs text-violet-400">{rev.taskTitle}</span>
                        </div>
                        <button
                          onClick={() => setSelectedReview({
                            studentId: rev.studentId,
                            studentName: rev.studentName,
                            studentRegisterId: rev.studentRegisterId,
                            taskId: rev.taskId,
                            taskTitle: rev.taskTitle,
                            maxGrade: rev.maxGrade
                          })}
                          className="px-2.5 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-semibold shadow text-3xs transition-all"
                        >
                          Grade
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : studentData ? (
          /* ================= STUDENT DASHBOARD VIEW ================= */
          <div className="space-y-8">
            {/* Student Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl shadow-xl flex flex-col justify-between">
                <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400 w-fit mb-3">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-3xs text-zinc-400 uppercase tracking-wider block font-semibold">Enrolled Groups</span>
                  <span className="text-2xl font-black text-white mt-1 block">{studentData.coursesCount}</span>
                </div>
              </div>

              <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl shadow-xl flex flex-col justify-between">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 w-fit mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-3xs text-zinc-400 uppercase tracking-wider block font-semibold">Completed Tasks</span>
                  <span className="text-2xl font-black text-emerald-400 mt-1 block">{studentData.completedTasks}</span>
                </div>
              </div>

              <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl shadow-xl flex flex-col justify-between">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 w-fit mb-3">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-3xs text-zinc-400 uppercase tracking-wider block font-semibold">Pending Tasks</span>
                  <span className="text-2xl font-black text-amber-400 mt-1 block">{studentData.pendingTasks}</span>
                </div>
              </div>

              <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl shadow-xl flex flex-col justify-between">
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 w-fit mb-3">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-3xs text-zinc-400 uppercase tracking-wider block font-semibold">Late Submissions</span>
                  <span className="text-2xl font-black text-red-400 mt-1 block">{studentData.lateTasks}</span>
                </div>
              </div>
            </div>

            {/* Grades Breakdown & Teacher Feedback */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Teacher Feedback */}
              <div className="bg-[#16161A] border border-[#24242B] rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#24242B] pb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-violet-400" />
                    <h3 className="text-lg font-bold text-white">Teacher Evaluations & Feedback</h3>
                  </div>
                </div>

                {studentData.recentFeedback.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">No teacher feedback received yet.</p>
                ) : (
                  <div className="space-y-3">
                    {studentData.recentFeedback.map((fb, idx) => (
                      <div key={idx} className="bg-[#1F1F24] border border-[#2F2F37] p-4 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-white">{fb.taskTitle}</span>
                          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-md">
                            Score: {fb.grade} pts
                          </span>
                        </div>
                        <p className="text-xs text-violet-300 italic font-medium leading-relaxed">
                          "{fb.feedback}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Grades Summary */}
              <div className="bg-[#16161A] border border-[#24242B] rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#24242B] pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-bold text-white">Highest Task Grades</h3>
                  </div>
                  <Link to="/profile" className="text-xs text-violet-400 font-semibold flex items-center gap-1">
                    Profile <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {studentData.bestGrades.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">No grades assigned yet.</p>
                ) : (
                  <div className="space-y-3">
                    {studentData.bestGrades.map((bg, idx) => (
                      <div key={idx} className="bg-[#1F1F24] border border-[#2F2F37] p-3 rounded-xl flex items-center justify-between text-xs">
                        <span className="font-bold text-white">{bg.taskTitle}</span>
                        <span className="font-black text-amber-400 text-sm">{bg.bestGrade} / {bg.maxGrade} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Review Modal for Teacher */}
      {selectedReview && (
        <StudentDetailsModal
          studentId={selectedReview.studentId}
          studentName={selectedReview.studentName}
          studentRegisterId={selectedReview.studentRegisterId}
          taskId={selectedReview.taskId}
          taskTitle={selectedReview.taskTitle}
          maxGrade={selectedReview.maxGrade}
          onClose={() => setSelectedReview(null)}
          onGraded={() => {
            fetchDashboardData();
            setSelectedReview(null);
          }}
        />
      )}
    </div>
  );
};
