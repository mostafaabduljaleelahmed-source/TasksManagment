import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { MetricsSkeleton } from '../components/SkeletonLoaders';
import { EmptyState } from '../components/EmptyState';
import {
  User, Mail, Shield, Award, CheckCircle2, Clock, FileCode, BookOpen,
  Eye, X, TrendingUp, MessageSquare
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

interface StudentProfileData {
  studentInfo: {
    id: string;
    name: string;
    email: string;
    studentRegisterId: string;
    role: string;
  };
  metrics: {
    enrolledCoursesCount: number;
    completedTasks: number;
    totalAssignedTasks: number;
    completionRate: number;
    averageGrade: number;
    totalSubmissionsCount: number;
  };
  enrolledCourses: Array<{
    courseId: string;
    courseName: string;
    courseCode: string;
  }>;
  history: Array<{
    submissionId: string;
    taskId: string;
    taskTitle: string;
    maxGrade: number;
    grade: number;
    teacherFeedback: string;
    submittedAt: string;
    attemptNumber: number;
    code: string;
  }>;
}

export const StudentProfile: React.FC = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected code viewing modal
  const [selectedSubmissionCode, setSelectedSubmissionCode] = useState<{
    taskTitle: string;
    code: string;
    grade: number;
    maxGrade: number;
    feedback: string;
    attemptNumber: number;
    submittedAt: string;
  } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/dashboard/student/profile`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (!response.ok) throw new Error('Failed to load student profile');
        const data = await response.json();
        setProfileData(data);
      } catch (err: any) {
        setError(err.message || 'Error fetching profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const chartData = profileData?.history
    ? [...profileData.history]
        .reverse()
        .map((h) => ({
          name: `Attempt #${h.attemptNumber}`,
          grade: h.grade,
          task: h.taskTitle,
        }))
    : [];

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 pb-16 relative overflow-hidden">
      {/* Navbar */}
      <Navbar />

      {/* Decorative gradient blobs */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      <main className="max-w-7xl mx-auto px-6 mt-8 relative z-10 space-y-8">
        {/* Header Title */}
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <User className="w-8 h-8 text-violet-400" />
            Student Profile & Performance
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Track your academic progress, assignment history, grades, and teacher feedback.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-950/40 border border-red-800/50 text-red-300 rounded-xl text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <MetricsSkeleton />
            <MetricsSkeleton />
            <MetricsSkeleton />
          </div>
        ) : profileData ? (
          <>
            {/* Top Row: User Info Card & Key Telemetry Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <div className="bg-[#16161A] border border-[#24242B] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center border border-violet-400/40 shadow-lg shrink-0">
                    {profileData.studentInfo.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">{profileData.studentInfo.name}</h2>
                    <span className="text-xs text-violet-400 font-semibold bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-full inline-block mt-1">
                      {profileData.studentInfo.role}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 border-t border-[#24242B] pt-4 text-xs">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-zinc-500" />
                      Email Address
                    </span>
                    <span className="text-white font-medium">{profileData.studentInfo.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-zinc-500" />
                      Registration ID
                    </span>
                    <span className="text-white font-mono font-bold">{profileData.studentInfo.studentRegisterId}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-zinc-500" />
                      Enrolled Groups
                    </span>
                    <span className="text-violet-400 font-bold">{profileData.metrics.enrolledCoursesCount} Groups</span>
                  </div>
                </div>
              </div>

              {/* Metrics Breakdown Grid */}
              <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl flex flex-col justify-between shadow-xl">
                  <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400 w-fit mb-3">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-3xs text-zinc-400 uppercase tracking-wider block font-semibold">Average Grade</span>
                    <span className="text-2xl font-black text-white mt-1 block">
                      {profileData.metrics.averageGrade}%
                    </span>
                  </div>
                </div>

                <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl flex flex-col justify-between shadow-xl">
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 w-fit mb-3">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-3xs text-zinc-400 uppercase tracking-wider block font-semibold">Tasks Completed</span>
                    <span className="text-2xl font-black text-emerald-400 mt-1 block">
                      {profileData.metrics.completedTasks} / {profileData.metrics.totalAssignedTasks}
                    </span>
                  </div>
                </div>

                <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl flex flex-col justify-between shadow-xl">
                  <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400 w-fit mb-3">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-3xs text-zinc-400 uppercase tracking-wider block font-semibold">Completion Rate</span>
                    <span className="text-2xl font-black text-sky-400 mt-1 block">
                      {profileData.metrics.completionRate}%
                    </span>
                  </div>
                </div>

                <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl flex flex-col justify-between shadow-xl">
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 w-fit mb-3">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-3xs text-zinc-400 uppercase tracking-wider block font-semibold">Total Submissions</span>
                    <span className="text-2xl font-black text-amber-400 mt-1 block">
                      {profileData.metrics.totalSubmissionsCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Trajectory Graph */}
            {chartData.length > 0 && (
              <div className="bg-[#16161A] border border-[#24242B] rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-violet-400" />
                    <h3 className="text-lg font-bold text-white">Grade Evolution Timeline</h3>
                  </div>
                  <span className="text-xs text-zinc-400">Score per attempt</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#24242B" />
                      <XAxis dataKey="name" stroke="#71717A" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#71717A" tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1A1A22', borderColor: '#2F2F37', borderRadius: '12px', color: '#FFF' }}
                        formatter={(val: any) => [`${val} pts`, 'Score']}
                      />
                      <Area type="monotone" dataKey="grade" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#gradeGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Submissions History Table */}
            <div className="bg-[#16161A] border border-[#24242B] rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-lg font-bold text-white">Assignment Submissions History</h3>
                </div>
                <span className="text-xs text-zinc-400">{profileData.history.length} records</span>
              </div>

              {profileData.history.length === 0 ? (
                <EmptyState
                  icon={<FileCode className="w-8 h-8 text-zinc-500" />}
                  title="No Submissions Yet"
                  description="You haven't submitted any programming assignments yet. Go to your courses to get started!"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-[#1F1F24] border-b border-[#2F2F37] text-zinc-400 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="p-3.5 rounded-l-xl">Assignment Title</th>
                        <th className="p-3.5">Attempt #</th>
                        <th className="p-3.5">Submitted Date</th>
                        <th className="p-3.5">Assigned Grade</th>
                        <th className="p-3.5">Teacher Feedback</th>
                        <th className="p-3.5 text-right rounded-r-xl">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#24242B]">
                      {profileData.history.map((sub) => (
                        <tr key={sub.submissionId} className="hover:bg-[#1C1C22] transition-colors">
                          <td className="p-3.5 font-bold text-white">{sub.taskTitle}</td>
                          <td className="p-3.5 font-medium text-zinc-400">Attempt #{sub.attemptNumber}</td>
                          <td className="p-3.5 text-zinc-400">
                            {new Date(sub.submittedAt).toLocaleDateString()} {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                              sub.grade >= 70
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : sub.grade > 0
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700/40'
                            }`}>
                              {sub.grade} / {sub.maxGrade} pts
                            </span>
                          </td>
                          <td className="p-3.5 text-zinc-300 max-w-xs truncate">
                            {sub.teacherFeedback ? (
                              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                                {sub.teacherFeedback}
                              </span>
                            ) : (
                              <span className="text-zinc-500 italic">Pending evaluation</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => setSelectedSubmissionCode({
                                taskTitle: sub.taskTitle,
                                code: sub.code,
                                grade: sub.grade,
                                maxGrade: sub.maxGrade,
                                feedback: sub.teacherFeedback,
                                attemptNumber: sub.attemptNumber,
                                submittedAt: sub.submittedAt
                              })}
                              className="px-3 py-1.5 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/30 text-violet-300 rounded-lg font-semibold flex items-center gap-1.5 ml-auto transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Code
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
      </main>

      {/* Code Inspection Modal */}
      {selectedSubmissionCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-3xl bg-[#16161A] border border-[#24242B] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#24242B] bg-[#1E1E24]">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedSubmissionCode.taskTitle}</h3>
                <span className="text-xs text-zinc-400">Attempt #{selectedSubmissionCode.attemptNumber} • {new Date(selectedSubmissionCode.submittedAt).toLocaleString()}</span>
              </div>
              <button
                onClick={() => setSelectedSubmissionCode(null)}
                className="p-1 hover:bg-[#2F2F37] rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between bg-[#1F1F24] p-3 rounded-xl border border-[#2F2F37] text-xs">
                <div>
                  <span className="text-zinc-400 block">Grade Assigned</span>
                  <span className="text-base font-bold text-emerald-400">{selectedSubmissionCode.grade} / {selectedSubmissionCode.maxGrade} pts</span>
                </div>
                {selectedSubmissionCode.feedback && (
                  <div className="text-right max-w-sm">
                    <span className="text-zinc-400 block">Teacher Feedback</span>
                    <span className="text-violet-300 font-semibold">{selectedSubmissionCode.feedback}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-2">Submitted Python Code</span>
                <pre className="bg-[#0D0D11] border border-[#24242B] p-4 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed">
                  {selectedSubmissionCode.code}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
