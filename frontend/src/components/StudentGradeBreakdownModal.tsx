import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { X, Award, CheckCircle2, Clock, TrendingUp, Loader2, Sparkles, BarChart2 } from 'lucide-react';

interface TaskItemBreakdown {
  taskId: string;
  taskName: string;
  score: number;
  maxScore: number;
  percentage: number;
  submissionDate?: string | null;
  attempts: number;
  highestAttempt: number;
  isCompleted: boolean;
  status: string;
}

interface StudentBreakdownData {
  studentId: string;
  studentName: string;
  studentRegisterId: string;
  averageGradePercentage: number;
  highestScore: number;
  lowestScore: number;
  completedTasksCount: number;
  pendingTasksCount: number;
  taskCompletionPercentage: number;
  tasks: TaskItemBreakdown[];
}

interface Props {
  studentId: string | null;
  studentName: string;
  courseId?: string;
  onClose: () => void;
}

export const StudentGradeBreakdownModal: React.FC<Props> = ({ studentId, studentName, courseId, onClose }) => {
  const { user } = useAuth();
  const [data, setData] = useState<StudentBreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId || !user) return;
    const fetchBreakdown = async () => {
      setLoading(true);
      try {
        const query = courseId ? `?courseId=${courseId}` : '';
        const res = await fetch(`${API_URL}/dashboard/student/${studentId}/breakdown${query}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch student breakdown');
        const resData: StudentBreakdownData = await res.json();
        setData(resData);
      } catch (err: any) {
        setError(err.message || 'Error loading breakdown');
      } finally {
        setLoading(false);
      }
    };
    fetchBreakdown();
  }, [studentId, courseId, user]);

  if (!studentId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-[#111827] border border-[#1F2937] w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        
        {/* MODAL HEADER */}
        <div className="bg-[#161E2E] border-b border-[#1F2937] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                {studentName}
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-xs text-zinc-400">Detailed Grade & Task Performance Breakdown</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-[#1F2937] hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-xs font-semibold">Calculating breakdown from Centralized Grading Service...</p>
            </div>
          ) : error || !data ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl text-xs text-center">
              {error || 'Failed to load details'}
            </div>
          ) : (
            <>
              {/* STATS OVERVIEW CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                
                {/* Average Grade Card */}
                <div className="bg-[#161E2E] border border-[#1F2937] rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Average Grade</span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-amber-400 font-mono">{data.averageGradePercentage}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: `${Math.min(data.averageGradePercentage, 100)}%` }} />
                  </div>
                </div>

                {/* Completion Rate Card */}
                <div className="bg-[#161E2E] border border-[#1F2937] rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Task Completion</span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-emerald-400 font-mono">{data.taskCompletionPercentage}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-emerald-400 h-full rounded-full transition-all" style={{ width: `${Math.min(data.taskCompletionPercentage, 100)}%` }} />
                  </div>
                </div>

                {/* Completed / Pending Tasks Card */}
                <div className="bg-[#161E2E] border border-[#1F2937] rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Completed / Pending</span>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xl font-black text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> {data.completedTasksCount}
                    </span>
                    <span className="text-zinc-600">/</span>
                    <span className="text-xl font-black text-amber-400 font-mono flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {data.pendingTasksCount}
                    </span>
                  </div>
                </div>

                {/* Highest / Lowest Score Card */}
                <div className="bg-[#161E2E] border border-[#1F2937] rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Highest / Lowest</span>
                  <div className="mt-2 flex items-center gap-2 text-xs font-mono font-bold">
                    <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                      High: {data.highestScore}
                    </span>
                    <span className="text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-lg">
                      Low: {data.lowestScore}
                    </span>
                  </div>
                </div>

              </div>

              {/* MINI TREND SPARKLINE / BAR VISUALIZER */}
              <div className="bg-[#161E2E] border border-[#1F2937] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    Task Performance Trend
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">Scores across unlocked assignments</span>
                </div>
                
                <div className="h-20 flex items-end justify-between gap-1.5 pt-2 px-2 border-b border-[#1F2937]">
                  {data.tasks.map((t, idx) => (
                    <div key={t.taskId} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="w-full bg-zinc-800 rounded-t-lg relative flex items-end overflow-hidden" style={{ height: '50px' }}>
                        <div
                          className={`w-full rounded-t-lg transition-all ${
                            t.percentage >= 80 ? 'bg-emerald-400' : t.percentage >= 50 ? 'bg-amber-400' : 'bg-red-400'
                          }`}
                          style={{ height: `${Math.max(t.percentage, 5)}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-zinc-500 truncate w-full text-center">T{idx + 1}</span>

                      {/* Hover Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-[#0B0F19] border border-[#1F2937] p-2 rounded-xl text-[10px] whitespace-nowrap z-20 shadow-xl">
                        <span className="font-bold text-white">{t.taskName}</span>
                        <span className="text-amber-400 font-mono">{t.score} / {t.maxScore} ({t.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* DETAILED TASKS TABLE */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-amber-400" />
                  Assignment Breakdown List
                </h3>

                <div className="bg-[#161E2E] border border-[#1F2937] rounded-2xl overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-zinc-300">
                      <thead className="bg-[#0B0F19] text-[10px] uppercase tracking-wider text-zinc-500 border-b border-[#1F2937]">
                        <tr>
                          <th className="py-3 px-4">Task Name</th>
                          <th className="py-3 px-4 font-mono">Score</th>
                          <th className="py-3 px-4 font-mono">%</th>
                          <th className="py-3 px-4">Attempts</th>
                          <th className="py-3 px-4">Submission Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1F2937]">
                        {data.tasks.map((t) => (
                          <tr key={t.taskId} className="hover:bg-[#1C2638] transition-colors">
                            <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${t.isCompleted ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                              {t.taskName}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-amber-400">
                              {t.score} <span className="text-zinc-500 font-normal">/ {t.maxScore}</span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] ${
                                t.percentage >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                t.percentage >= 50 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {t.percentage}%
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-zinc-400">
                              {t.attempts} {t.attempts > 0 && <span className="text-zinc-500">(Highest #{t.highestAttempt})</span>}
                            </td>
                            <td className="py-3 px-4 text-zinc-400 text-[11px]">
                              {t.submissionDate ? new Date(t.submissionDate).toLocaleDateString() : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
