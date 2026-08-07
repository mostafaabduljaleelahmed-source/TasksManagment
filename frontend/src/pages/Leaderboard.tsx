import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { getScoreColorStyle } from '../utils/scoreColor';
import { LeaderboardSkeleton } from '../components/SkeletonLoaders';
import { EmptyState } from '../components/EmptyState';
import { StudentGradeBreakdownModal } from '../components/StudentGradeBreakdownModal';
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
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoursesAndLeaderboard = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      let fetchedCourses: CourseItem[] = [];
      const endpoint = user.role === 'Admin' ? 'teacher' : (user.role === 'Teacher' ? 'teacher' : 'student');
      const res = await fetch(`${API_URL}/courses/${endpoint}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        fetchedCourses = await res.json();
        setCourses(fetchedCourses);
      }

      let initialCourseId = '';
      if (user.role !== 'Admin' && fetchedCourses.length > 0) {
        initialCourseId = fetchedCourses[0].id;
        setSelectedCourseId(initialCourseId);
      }

      await fetchLeaderboard(initialCourseId);
    } catch (err: any) {
      setError(err.message || 'Error initializing leaderboard');
      setLoading(false);
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
    fetchCoursesAndLeaderboard();
  }, [user]);

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedCourseId(val);
    fetchLeaderboard(val);
  };

  const list = rankingMode === 'grade' ? byGrade : byCompleted;
  const top3 = list.slice(0, 3);

  return (
    <div className="pb-16 relative overflow-hidden space-y-8">
      {/* Decorative glows */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
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
                {user?.role === 'Admin' && <option value="">All Groups (Platform-wide)</option>}
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
          <LeaderboardSkeleton />
        ) : list.length === 0 ? (
          <EmptyState
            variant="leaderboard"
            title="Classroom Leaderboard Empty"
            description="No student grades or submissions recorded yet. Once assignments are graded, top performers will appear here!"
          />
        ) : (
          <>
            {/* Podium Top 3 Cards */}
            {top3.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
                {/* 2nd Place (Silver) */}
                {top3[1] && (
                  <div className="bg-[#16161A]/90 border-2 border-slate-300/40 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col items-center text-center group hover:scale-[1.02] transition-all duration-200">
                    <div className="absolute top-3 left-3 bg-slate-300/20 text-slate-200 border border-slate-300/40 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      🥈 2nd Place
                    </div>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-slate-500 to-slate-200 text-slate-950 font-black text-xl flex items-center justify-center mb-3 mt-4 shadow-lg border-2 border-slate-300">
                      {top3[1].studentName.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">{top3[1].studentName}</h3>
                    <span className="text-xs font-mono text-zinc-400 mb-4">{top3[1].studentRegisterId}</span>
                    <div className="w-full bg-[#1F1F24] p-3 rounded-xl border border-[#2F2F37] flex justify-between items-center text-xs">
                      <span className="text-zinc-400">Score & Tasks</span>
                      <span className="font-extrabold text-slate-200 text-sm">{top3[1].averageGrade}% • {top3[1].completedTasks} Tasks</span>
                    </div>
                  </div>
                )}

                {/* 1st Place (Gold Champion) */}
                {top3[0] && (
                  <div className="bg-gradient-to-b from-[#29200B] to-[#16161A] border-2 border-amber-400/70 rounded-2xl p-7 shadow-2xl relative overflow-hidden flex flex-col items-center text-center group hover:scale-[1.03] transition-all duration-200 order-first md:order-none glow-violet">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="p-2.5 bg-amber-500/20 border border-amber-400/50 text-amber-300 rounded-full mb-3 shadow-lg animate-pulse-glow">
                      <Crown className="w-7 h-7" />
                    </div>
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 text-amber-950 font-black text-2xl flex items-center justify-center mb-3 shadow-xl border-4 border-yellow-300">
                      {top3[0].studentName.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)}
                    </div>
                    <span className="text-xs text-amber-300 font-black uppercase tracking-widest bg-amber-400/20 px-3 py-1 rounded-full border border-amber-400/50 mb-2 shadow-sm">
                      🥇 1st Place Champion
                    </span>
                    <h3 className="text-xl font-black text-white mb-1">{top3[0].studentName}</h3>
                    <span className="text-xs font-mono text-amber-400/80 mb-4">{top3[0].studentRegisterId}</span>
                    <div className="w-full bg-[#1F1F24] p-3 rounded-xl border border-amber-400/30 flex justify-between items-center text-xs">
                      <span className="text-zinc-400">Score & Tasks</span>
                      <span className="font-black text-amber-300 text-base">{top3[0].averageGrade}% • {top3[0].completedTasks} Tasks</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place (Bronze) */}
                {top3[2] && (
                  <div className="bg-[#16161A]/90 border-2 border-amber-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col items-center text-center group hover:scale-[1.02] transition-all duration-200">
                    <div className="absolute top-3 left-3 bg-amber-800/30 text-amber-400 border border-amber-600/40 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      🥉 3rd Place
                    </div>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-800 to-amber-600 text-amber-100 font-black text-xl flex items-center justify-center mb-3 mt-4 shadow-lg border-2 border-amber-600">
                      {top3[2].studentName.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">{top3[2].studentName}</h3>
                    <span className="text-xs font-mono text-zinc-400 mb-4">{top3[2].studentRegisterId}</span>
                    <div className="w-full bg-[#1F1F24] p-3 rounded-xl border border-[#2F2F37] flex justify-between items-center text-xs">
                      <span className="text-zinc-400">Score & Tasks</span>
                      <span className="font-extrabold text-amber-400 text-sm">{top3[2].averageGrade}% • {top3[2].completedTasks} Tasks</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Full Rankings Table & Mobile Responsive Cards */}
            <div className="bg-[#16161A] border border-[#24242B] rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Medal className="w-5 h-5 text-amber-400" />
                  Full Student Roster Rankings
                </h3>
                <span className="text-xs text-zinc-400 font-semibold">{list.length} Students Ranked</span>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-[#1F1F24] border-b border-[#2F2F37] text-zinc-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="p-3.5 rounded-l-xl w-16">Rank</th>
                      <th className="p-3.5">Student Avatar & Name</th>
                      <th className="p-3.5">Registration ID</th>
                      <th className="p-3.5">Average Grade</th>
                      <th className="p-3.5">Completed Tasks</th>
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
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs ${
                            idx === 0 ? 'bg-amber-400 text-amber-950 border border-amber-300' :
                            idx === 1 ? 'bg-slate-300 text-slate-950 border border-slate-200' :
                            idx === 2 ? 'bg-amber-700 text-amber-100 border border-amber-600' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-white flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full text-white flex items-center justify-center font-extrabold text-xs shadow-inner ${
                            idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-500' : idx === 2 ? 'bg-amber-800' : 'bg-violet-600'
                          }`}>
                            {item.studentName.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-white text-xs sm:text-sm">{item.studentName}</span>
                            {user?.name === item.studentName && (
                              <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-md font-bold self-start mt-0.5">YOU</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-zinc-400">{item.studentRegisterId}</td>
                        <td className="p-3.5 font-extrabold text-white">
                          <button
                            onClick={() => setSelectedStudentForModal({ id: item.studentId, name: item.studentName })}
                            className="hover:scale-105 transition-transform focus:outline-none"
                            title="Click to view detailed task grade breakdown"
                          >
                            <span className={`px-2.5 py-1 rounded-md font-mono text-xs font-bold ${getScoreColorStyle(item.averageGrade).badgeStyle}`}>
                              {item.averageGrade}% 📊
                            </span>
                          </button>
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

              {/* Mobile Card Stack View */}
              <div className="block md:hidden space-y-3">
                {list.map((item, idx) => (
                  <div
                    key={item.studentId}
                    className={`p-4 bg-[#1F1F24] border border-[#2F2F37] rounded-xl flex flex-col space-y-3 ${
                      user?.name === item.studentName ? 'border-violet-500 bg-violet-600/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                          idx === 0 ? 'bg-amber-400 text-amber-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : idx === 2 ? 'bg-amber-700 text-amber-100' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          #{idx + 1}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-xs">
                          {item.studentName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">{item.studentName}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">{item.studentRegisterId}</p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-md font-mono text-xs font-bold ${getScoreColorStyle(item.averageGrade).badgeStyle}`}>
                        {item.averageGrade}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-[#2A2A33]">
                      <span>Completed: <strong className="text-zinc-200">{item.completedTasks} Tasks</strong></span>
                      <span>Submissions: <strong className="text-zinc-200">{item.totalSubmissions} Attempts</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      {/* STUDENT GRADE BREAKDOWN MODAL */}
      {selectedStudentForModal && (
        <StudentGradeBreakdownModal
          studentId={selectedStudentForModal.id}
          studentName={selectedStudentForModal.name}
          courseId={selectedCourseId || undefined}
          onClose={() => setSelectedStudentForModal(null)}
        />
      )}
    </div>
  );
};
