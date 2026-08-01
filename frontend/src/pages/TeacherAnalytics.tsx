import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { MetricsSkeleton } from '../components/SkeletonLoaders';
import { EmptyState } from '../components/EmptyState';
import { StudentDetailsModal } from './StudentDetailsModal';
import {
  BarChart3, Users, BookOpen, Clock, AlertTriangle, CheckCircle2,
  Award, TrendingUp, Filter, FileCode
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from 'recharts';

interface TeacherAnalyticsData {
  totalCourses: number;
  totalStudents: number;
  totalTasks: number;
  totalSubmissions: number;
  overallAverageGrade: number;
  submissionTrends: Array<{ date: string; submissions: number }>;
  difficultTasks: Array<{
    taskId: string;
    taskTitle: string;
    maxGrade: number;
    averageGrade: number;
    submissionsCount: number;
  }>;
  topActiveStudents: Array<{
    studentId: string;
    studentName: string;
    registerId: string;
    submissionsCount: number;
    averageGrade: number;
  }>;
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

interface CourseItem {
  id: string;
  name: string;
  courseCode: string;
}

export const TeacherAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<TeacherAnalyticsData | null>(null);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Student review modal state
  const [selectedReview, setSelectedReview] = useState<{
    studentId: string;
    studentName: string;
    studentRegisterId: string;
    taskId: string;
    taskTitle: string;
    maxGrade: number;
  } | null>(null);

  const fetchCourses = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_URL}/courses/teacher`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCourses(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnalytics = async (courseId?: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const url = courseId
        ? `${API_URL}/dashboard/teacher/analytics?courseId=${courseId}`
        : `${API_URL}/dashboard/teacher/analytics`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalyticsData(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchAnalytics();
  }, [user]);

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedCourseId(val);
    fetchAnalytics(val);
  };

  return (
    <div className="pb-16 relative overflow-hidden space-y-8">
      {/* Background ambient lighting */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
        {/* Header with Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-emerald-400" />
              Teacher Classroom Analytics
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Cross-course analytics, submission velocity, difficulty trends, and pending evaluations.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#16161A] border border-[#24242B] p-2 rounded-xl">
            <Filter className="w-4 h-4 text-zinc-400" />
            <select
              value={selectedCourseId}
              onChange={handleCourseChange}
              className="bg-[#1F1F24] border border-[#2F2F37] text-white text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none"
            >
              <option value="">All Teaching Groups</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.courseCode})
                </option>
              ))}
            </select>
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
        ) : analyticsData ? (
          <>
            {/* Top Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl shadow-xl flex flex-col justify-between">
                <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400 w-fit mb-3">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-3xs text-zinc-400 uppercase tracking-wider block font-semibold">Total Groups</span>
                  <span className="text-2xl font-black text-white mt-1 block">{analyticsData.totalCourses}</span>
                </div>
              </div>

              <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl shadow-xl flex flex-col justify-between">
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 w-fit mb-3">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-3xs text-zinc-400 uppercase tracking-wider block font-semibold">Total Students</span>
                  <span className="text-2xl font-black text-indigo-400 mt-1 block">{analyticsData.totalStudents}</span>
                </div>
              </div>

              <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl shadow-xl flex flex-col justify-between">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 w-fit mb-3">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-3xs text-zinc-400 uppercase tracking-wider block font-semibold">Class Avg Grade</span>
                  <span className="text-2xl font-black text-emerald-400 mt-1 block">{analyticsData.overallAverageGrade}%</span>
                </div>
              </div>

              <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl shadow-xl flex flex-col justify-between">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 w-fit mb-3">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-3xs text-zinc-400 uppercase tracking-wider block font-semibold">Total Submissions</span>
                  <span className="text-2xl font-black text-amber-400 mt-1 block">{analyticsData.totalSubmissions}</span>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Submission Trend */}
              <div className="bg-[#16161A] border border-[#24242B] rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-lg font-bold text-white">7-Day Submission Velocity</h3>
                  </div>
                  <span className="text-xs text-zinc-400">Submissions per day</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.submissionTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="subGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#24242B" />
                      <XAxis dataKey="date" stroke="#71717A" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#71717A" tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1A1A22', borderColor: '#2F2F37', borderRadius: '12px', color: '#FFF' }}
                        formatter={(val: any) => [`${val} submissions`, 'Volume']}
                      />
                      <Area type="monotone" dataKey="submissions" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#subGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Hardest Assignments */}
              <div className="bg-[#16161A] border border-[#24242B] rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-bold text-white">Most Challenging Tasks</h3>
                  </div>
                  <span className="text-xs text-zinc-400">Lowest average grade</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.difficultTasks} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#24242B" />
                      <XAxis dataKey="taskTitle" stroke="#71717A" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#71717A" tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1A1A22', borderColor: '#2F2F37', borderRadius: '12px', color: '#FFF' }}
                        formatter={(val: any) => [`${val} avg pts`, 'Average Grade']}
                      />
                      <Bar dataKey="averageGrade" radius={[6, 6, 0, 0]}>
                        {analyticsData.difficultTasks.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.averageGrade < 50 ? '#EF4444' : '#F59E0B'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Pending Reviews Table */}
            <div className="bg-[#16161A] border border-[#24242B] rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-bold text-white">Pending Submission Evaluations</h3>
                </div>
                <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                  {analyticsData.pendingReviews.length} Awaiting Review
                </span>
              </div>

              {analyticsData.pendingReviews.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="w-8 h-8 text-emerald-400" />}
                  title="All Submissions Evaluated!"
                  description="Great job! There are currently no pending student submissions requiring evaluation."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-[#1F1F24] border-b border-[#2F2F37] text-zinc-400 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="p-3.5 rounded-l-xl">Student Name</th>
                        <th className="p-3.5">Registration ID</th>
                        <th className="p-3.5">Assignment</th>
                        <th className="p-3.5">Submitted Date</th>
                        <th className="p-3.5">Attempt #</th>
                        <th className="p-3.5 text-right rounded-r-xl">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#24242B]">
                      {analyticsData.pendingReviews.map((sub) => (
                        <tr key={sub.submissionId} className="hover:bg-[#1C1C22] transition-colors">
                          <td className="p-3.5 font-bold text-white">{sub.studentName}</td>
                          <td className="p-3.5 font-mono text-zinc-400">{sub.studentRegisterId}</td>
                          <td className="p-3.5 font-semibold text-violet-300">{sub.taskTitle}</td>
                          <td className="p-3.5 text-zinc-400">
                            {new Date(sub.submittedAt).toLocaleDateString()} {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-3.5 text-zinc-400">Attempt #{sub.attemptNumber}</td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => setSelectedReview({
                                studentId: sub.studentId,
                                studentName: sub.studentName,
                                studentRegisterId: sub.studentRegisterId,
                                taskId: sub.taskId,
                                taskTitle: sub.taskTitle,
                                maxGrade: sub.maxGrade
                              })}
                              className="px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg font-semibold shadow-md transition-all ml-auto flex items-center gap-1.5"
                            >
                              <FileCode className="w-3.5 h-3.5" />
                              Evaluate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}

      {/* Review Modal */}
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
            fetchAnalytics(selectedCourseId);
            setSelectedReview(null);
          }}
        />
      )}
    </div>
  );
};
