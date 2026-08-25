import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useTranslation } from '../utils/i18n';
import { StudentGradeBreakdownModal } from '../components/StudentGradeBreakdownModal';
import { Trophy, Search, RefreshCw, AlertCircle } from 'lucide-react';

interface LeaderboardEntry {
  studentId: string;
  studentName: string;
  studentEmail: string;
  avatarUrl?: string | null;
  averageGrade: number;
  totalScore: number;
  totalPossibleScore: number;
  completedTasks: number;
  totalTasks: number;
  totalSubmissions: number;
}

export const Leaderboard: React.FC = () => {
  const { user } = useAuth();
  const { lang } = useTranslation();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [user]);

  const fetchLeaderboard = async () => {
    if (!user || !user.token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/dashboard/leaderboard`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || `Failed to load leaderboard (${response.status})`);
      }
      const data = await response.json();
      setLeaderboard(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message || 'Failed to load leaderboard');
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = leaderboard.filter(e =>
    e.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.studentEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto px-2 sm:px-4 py-3">
      {/* Header */}
      <div className="border-b border-[#1E2519] pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>{lang === 'ar' ? 'لوحة الصدارة الأكاديمية' : 'Academic Leaderboard'}</span>
          </h1>
          <p className="text-xs text-sage-400 mt-0.5">
            {lang === 'ar' ? 'تصنيف الطلاب حسب إجمالي الدرجات والتكليفات المكتملة' : 'Student rankings by total marks earned and tasks completed'}
          </p>
        </div>

        <button onClick={fetchLeaderboard} className="academic-button-secondary py-1 px-3">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-sage-500 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder={lang === 'ar' ? 'البحث عن طالب...' : 'Search student...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="academic-input pl-8"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="academic-surface rounded-lg overflow-hidden border border-[#1E2519]">
        {loading ? (
          <div className="p-8 text-center text-xs text-sage-500">{lang === 'ar' ? 'جاري التحميل...' : 'Loading rankings...'}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-sage-400">
            {error
              ? (lang === 'ar' ? 'تعذر تحميل البيانات، حاول تحديث الصفحة' : "Couldn't load data — try refreshing")
              : leaderboard.length === 0
                ? (lang === 'ar' ? 'لا يوجد طلاب مسجلون بعد' : 'No students enrolled yet')
                : (lang === 'ar' ? 'لا توجد نتائج مطابقة للبحث' : 'No students match your search')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="academic-table">
              <thead>
                <tr>
                  <th className="w-16 text-center">{lang === 'ar' ? 'الترتيب' : 'Rank'}</th>
                  <th>{lang === 'ar' ? 'الطالب' : 'Student'}</th>
                  <th>{lang === 'ar' ? 'التكليفات المكتملة' : 'Tasks Completed'}</th>
                  <th className="text-right">{lang === 'ar' ? 'إجمالي الدرجات' : 'Total Marks'}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, index) => {
                  const rank = index + 1;
                  return (
                    <tr
                      key={entry.studentId}
                      onClick={() => setSelectedStudent({ id: entry.studentId, name: entry.studentName })}
                      className="cursor-pointer"
                    >
                      <td className="text-center font-mono font-bold text-xs">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded ${
                          rank === 1 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          rank === 2 ? 'bg-sage-300/20 text-sage-200 border border-sage-400/40' :
                          rank === 3 ? 'bg-amber-700/20 text-amber-400 border border-amber-700/40' : 'text-sage-400'
                        }`}>
                          {rank}
                        </span>
                      </td>
                      <td>
                        <div className="font-semibold text-white">{entry.studentName}</div>
                        <div className="text-[11px] font-mono text-sage-500">{entry.studentEmail}</div>
                      </td>
                      <td className="font-mono text-sage-300">
                        {entry.totalTasks > 0 ? (
                          <>
                            <span className="text-white font-semibold">{entry.completedTasks}</span>
                            <span className="text-sage-500"> / {entry.totalTasks}</span>
                          </>
                        ) : (
                          <span className="text-sage-500">{lang === 'ar' ? 'لا تكليفات بعد' : 'No tasks yet'}</span>
                        )}
                      </td>
                      <td className="text-right font-mono">
                        {entry.totalTasks > 0 ? (
                          <>
                            <span className="font-bold text-sm text-primary-400">{entry.totalScore}</span>
                            <span className="text-sage-500 text-xs"> / {entry.totalPossibleScore}</span>
                            <span className="block text-[10px] text-sage-500">{entry.averageGrade.toFixed(1)}%</span>
                          </>
                        ) : (
                          <span className="text-xs text-sage-500">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grade Breakdown Modal */}
      {selectedStudent && (
        <StudentGradeBreakdownModal
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
};
