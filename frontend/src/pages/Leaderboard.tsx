import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { MetricsSkeleton } from '../components/SkeletonLoaders';
import { EmptyState } from '../components/EmptyState';
import {
  Trophy, Medal, Filter, Crown
} from 'lucide-react';

interface LeaderboardEntry {
  studentId: string;
  studentName: string;
  studentRegisterId: string;
  averageGrade: number;
  completedTasks: number;
  totalSubmissions: number;
}

interface CourseItem {
  id: string;
  name: string;
  courseCode: string;
}

export const Leaderboard: React.FC = () => {
  const { user } = useAuth();
  const [byGrade, setByGrade] = useState<LeaderboardEntry[]>([]);
  const [byCompleted, setByCompleted] = useState<LeaderboardEntry[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [rankingMode, setRankingMode] = useState<'grade' | 'completed'>('grade');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = async () => {
    if (!user) return;
    try {
      const endpoint = user.role === 'Teacher' ? 'teacher' : 'student';
      const res = await fetch(`${API_URL}/courses/${endpoint}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        setCourses(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeaderboard = async (courseId?: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const url = courseId
        ? `${API_URL}/dashboard/leaderboard?courseId=${courseId}`
        : `${API_URL}/dashboard/leaderboard`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error('Failed to load leaderboard');
      const data = await res.json();
      setByGrade(data.byGrade);
      setByCompleted(data.byCompleted);
    } catch (err: any) {
      setError(err.message || 'Error loading leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchLeaderboard();
  }, [user]);

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedCourseId(val);
    fetchLeaderboard(val);
  };

  const list = rankingMode === 'grade' ? byGrade : byCompleted;
  const top3 = list.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 pb-16 relative overflow-hidden">
      <Navbar />

      {/* Decorative glows */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />

      <main className="max-w-7xl mx-auto px-6 mt-8 relative z-10 space-y-8">
        {/* Title Header & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-400" />
              Classroom Leaderboard & Rankings
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Celebrate top student performers ranked by average scores and completed assignments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Ranking Mode Toggle */}
            <div className="bg-[#16161A] border border-[#24242B] p-1 rounded-xl flex items-center">
              <button
                onClick={() => setRankingMode('grade')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  rankingMode === 'grade' ? 'bg-amber-500 text-black shadow font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                By Avg Grade
              </button>
              <button
                onClick={() => setRankingMode('completed')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  rankingMode === 'completed' ? 'bg-amber-500 text-black shadow font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                By Completed Tasks
              </button>
            </div>

            {/* Course Filter */}
            <div className="flex items-center gap-2 bg-[#16161A] border border-[#24242B] p-2 rounded-xl">
              <Filter className="w-4 h-4 text-zinc-400" />
              <select
                value={selectedCourseId}
                onChange={handleCourseChange}
                className="bg-[#1F1F24] border border-[#2F2F37] text-white text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none"
              >
                <option value="">All Groups (Platform-wide)</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.courseCode})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-950/40 border border-red-800/50 text-red-300 rounded-xl text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricsSkeleton />
            <MetricsSkeleton />
            <MetricsSkeleton />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Trophy className="w-8 h-8 text-amber-400" />}
            title="Leaderboard Empty"
            description="No student grades or submissions recorded yet. Once assignments are graded, top performers will appear here!"
          />
        ) : (
          <>
            {/* Podium Top 3 Cards */}
            {top3.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
                {/* 2nd Place (Silver) */}
                {top3[1] && (
                  <div className="bg-[#16161A] border border-slate-700/60 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col items-center text-center group hover:scale-[1.02] transition-transform">
                    <div className="w-12 h-12 rounded-full bg-slate-400/20 border border-slate-400/40 text-slate-300 font-black text-lg flex items-center justify-center mb-3">
                      #2
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-500 to-slate-300 text-slate-950 font-black text-xl flex items-center justify-center mb-3 shadow-lg">
                      {top3[1].studentName.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">{top3[1].studentName}</h3>
                    <span className="text-xs font-mono text-zinc-400 mb-4">{top3[1].studentRegisterId}</span>
                    <div className="w-full bg-[#1F1F24] p-3 rounded-xl border border-[#2F2F37] flex justify-between items-center text-xs">
                      <span className="text-zinc-400">Avg Grade</span>
                      <span className="font-extrabold text-slate-300 text-sm">{top3[1].averageGrade}%</span>
                    </div>
                  </div>
                )}

                {/* 1st Place (Gold Champion) */}
                {top3[0] && (
                  <div className="bg-gradient-to-b from-[#241F14] to-[#16161A] border border-amber-500/50 rounded-2xl p-7 shadow-2xl relative overflow-hidden flex flex-col items-center text-center group hover:scale-[1.03] transition-transform order-first md:order-none">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded-full mb-3 shadow-lg">
                      <Crown className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-200 text-amber-950 font-black text-2xl flex items-center justify-center mb-3 shadow-xl border border-amber-300/40">
                      {top3[0].studentName.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)}
                    </div>
                    <span className="text-xs text-amber-400 font-extrabold uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30 mb-2">
                      🏆 1st Place Champion
                    </span>
                    <h3 className="text-xl font-black text-white mb-1">{top3[0].studentName}</h3>
                    <span className="text-xs font-mono text-amber-400/80 mb-4">{top3[0].studentRegisterId}</span>
                    <div className="w-full bg-[#1F1F24] p-3 rounded-xl border border-amber-500/20 flex justify-between items-center text-xs">
                      <span className="text-zinc-400">Avg Grade</span>
                      <span className="font-black text-amber-400 text-base">{top3[0].averageGrade}%</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place (Bronze) */}
                {top3[2] && (
                  <div className="bg-[#16161A] border border-amber-900/40 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col items-center text-center group hover:scale-[1.02] transition-transform">
                    <div className="w-12 h-12 rounded-full bg-amber-900/20 border border-amber-800/40 text-amber-600 font-black text-lg flex items-center justify-center mb-3">
                      #3
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-800 to-amber-600 text-amber-100 font-black text-xl flex items-center justify-center mb-3 shadow-lg">
                      {top3[2].studentName.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">{top3[2].studentName}</h3>
                    <span className="text-xs font-mono text-zinc-400 mb-4">{top3[2].studentRegisterId}</span>
                    <div className="w-full bg-[#1F1F24] p-3 rounded-xl border border-[#2F2F37] flex justify-between items-center text-xs">
                      <span className="text-zinc-400">Avg Grade</span>
                      <span className="font-extrabold text-amber-500 text-sm">{top3[2].averageGrade}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Full Rankings Table */}
            <div className="bg-[#16161A] border border-[#24242B] rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Medal className="w-5 h-5 text-amber-400" />
                  Full Student Roster Rankings
                </h3>
                <span className="text-xs text-zinc-400">{list.length} Students Ranked</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-[#1F1F24] border-b border-[#2F2F37] text-zinc-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="p-3.5 rounded-l-xl w-16">Rank</th>
                      <th className="p-3.5">Student Name</th>
                      <th className="p-3.5">Registration ID</th>
                      <th className="p-3.5">Average Grade</th>
                      <th className="p-3.5">Completed Assignments</th>
                      <th className="p-3.5 text-right rounded-r-xl">Total Submissions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#24242B]">
                    {list.map((item, idx) => (
                      <tr
                        key={item.studentId}
                        className={`hover:bg-[#1C1C22] transition-colors ${
                          user?.name === item.studentName ? 'bg-violet-600/10 border-l-2 border-l-violet-500' : ''
                        }`}
                      >
                        <td className="p-3.5 font-bold">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-extrabold ${
                            idx === 0 ? 'bg-amber-500 text-black' :
                            idx === 1 ? 'bg-slate-300 text-black' :
                            idx === 2 ? 'bg-amber-800 text-white' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-white flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold text-xs">
                            {item.studentName.substring(0, 2).toUpperCase()}
                          </div>
                          <span>{item.studentName}</span>
                          {user?.name === item.studentName && (
                            <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-md font-bold">YOU</span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-zinc-400">{item.studentRegisterId}</td>
                        <td className="p-3.5 font-extrabold text-white">
                          <span className={`px-2.5 py-1 rounded-md ${
                            item.averageGrade >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            item.averageGrade >= 60 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {item.averageGrade}%
                          </span>
                        </td>
                        <td className="p-3.5 font-semibold text-zinc-300">
                          {item.completedTasks} Tasks
                        </td>
                        <td className="p-3.5 text-right font-medium text-zinc-400">
                          {item.totalSubmissions} Attempts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
