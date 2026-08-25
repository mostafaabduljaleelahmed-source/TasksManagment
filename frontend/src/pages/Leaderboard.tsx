import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useTranslation } from '../utils/i18n';
import { StudentGradeBreakdownModal } from '../components/StudentGradeBreakdownModal';
import { LeaderboardPodium } from '../components/LeaderboardPodium';
import { useRankHistory } from '../hooks/useRankHistory';
import { computeRanks } from '../utils/leaderboardRanking';
import { Trophy, Search, RefreshCw, AlertCircle, ArrowUp, ArrowDown, Flame } from 'lucide-react';

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

type Period = 'all' | 'week' | 'month';

const PERSISTENCE_BADGE_THRESHOLD = 10;
const CLIMBER_BADGE_THRESHOLD = 5;

const PodiumSkeleton: React.FC = () => (
  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-center sm:gap-6 py-6 px-2 animate-pulse">
    {[2, 1, 3].map((rank) => (
      <div key={rank} className="flex flex-col items-center gap-3">
        <div
          className={`rounded-full bg-[#1A2016] border border-[#212B1E] ${
            rank === 1 ? 'w-20 h-20 sm:w-24 sm:h-24' : rank === 2 ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-14 h-14 sm:w-16 sm:h-16'
          }`}
        />
        <div className="h-2.5 w-16 rounded bg-[#1A2016]" />
        <div className={`w-20 sm:w-24 rounded-t-lg bg-[#12160F] border border-[#212B1E] ${rank === 1 ? 'h-16 sm:h-20' : rank === 2 ? 'h-11 sm:h-14' : 'h-8 sm:h-10'}`} />
      </div>
    ))}
  </div>
);

const RowSkeleton: React.FC = () => (
  <div className="divide-y divide-[#1E2519] animate-pulse">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-6 h-6 rounded bg-[#1A2016] shrink-0" />
        <div className="w-9 h-9 rounded-full bg-[#1A2016] shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-2.5 w-32 rounded bg-[#1A2016]" />
          <div className="h-1.5 w-full max-w-[240px] rounded-full bg-[#1A2016]" />
        </div>
        <div className="h-3 w-10 rounded bg-[#1A2016] shrink-0" />
      </div>
    ))}
  </div>
);

export const Leaderboard: React.FC = () => {
  const { user } = useAuth();
  const { lang } = useTranslation();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<Period>('all');
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchLeaderboard(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, period]);

  const fetchLeaderboard = async (activePeriod: Period) => {
    if (!user || !user.token) return;
    setLoading(true);
    setError(null);
    try {
      const qs = activePeriod !== 'all' ? `?period=${activePeriod}` : '';
      const response = await fetch(`${API_URL}/dashboard/leaderboard${qs}`, {
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

  const isSearching = searchQuery.trim().length > 0;
  const filtered = leaderboard.filter(e =>
    e.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.studentEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ranked = useMemo(() => computeRanks(filtered), [filtered]);

  const currentRanksMap = useMemo(() => {
    if (leaderboard.length === 0) return null;
    const map: Record<string, number> = {};
    computeRanks(leaderboard).forEach((r) => { map[r.entry.studentId] = r.rank; });
    return map;
  }, [leaderboard]);

  const { getDelta } = useRankHistory(`${user?.role === 'Teacher' || user?.role === 'Admin' ? 'staff' : 'own'}_${period}`, currentRanksMap);

  // The podium always reflects the true, unfiltered top 3; searching switches to a flat
  // ranked list instead of trying to show a partial podium.
  const top3Ranked = !isSearching ? ranked.slice(0, 3) : [];
  const rest = isSearching ? ranked : ranked.slice(3);
  const labelYou = lang === 'ar' ? 'أنت' : 'You';

  const periodTabs: { key: Period; label: string }[] = [
    { key: 'week', label: lang === 'ar' ? 'هذا الأسبوع' : 'This Week' },
    { key: 'month', label: lang === 'ar' ? 'هذا الشهر' : 'This Month' },
    { key: 'all', label: lang === 'ar' ? 'الكل' : 'All-Time' },
  ];

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto px-2 sm:px-4 py-3">
      {/* Header */}
      <div className="border-b border-[#1E2519] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>{lang === 'ar' ? 'لوحة الصدارة الأكاديمية' : 'Academic Leaderboard'}</span>
          </h1>
          <p className="text-xs text-sage-400 mt-0.5">
            {lang === 'ar' ? 'تصنيف الطلاب حسب إجمالي الدرجات والتكليفات المكتملة' : 'Student rankings by total marks earned and tasks completed'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#12160F] border border-[#1E2519] rounded-lg p-0.5">
            {periodTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setPeriod(tab.key)}
                className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-md transition-all duration-150 cursor-pointer ${
                  period === tab.key ? 'bg-primary-500 text-[#06150E]' : 'text-sage-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button onClick={() => fetchLeaderboard(period)} className="academic-button-secondary py-1 px-3">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
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

      {/* Podium */}
      {loading ? (
        <PodiumSkeleton />
      ) : (
        !isSearching && top3Ranked.length > 0 && (
          <LeaderboardPodium
            top3={top3Ranked}
            currentUserId={user?.id}
            onSelect={(entry) => setSelectedStudent({ id: entry.studentId, name: entry.studentName })}
            labelYou={labelYou}
            persistenceThreshold={PERSISTENCE_BADGE_THRESHOLD}
          />
        )
      )}

      {/* Ranked list */}
      <div className="academic-surface rounded-lg overflow-hidden border border-[#1E2519]">
        {loading ? (
          <RowSkeleton />
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-sage-400">
            {error
              ? (lang === 'ar' ? 'تعذر تحميل البيانات، حاول تحديث الصفحة' : "Couldn't load data — try refreshing")
              : leaderboard.length === 0
                ? (lang === 'ar' ? 'لا يوجد طلاب مسجلون بعد' : 'No students enrolled yet')
                : (lang === 'ar' ? 'لا توجد نتائج مطابقة للبحث' : 'No students match your search')}
          </div>
        ) : rest.length === 0 ? (
          <div className="p-6 text-center text-[11px] text-sage-500">
            {lang === 'ar' ? 'بقية الترتيب ستظهر هنا' : 'The rest of the ranking will show up here'}
          </div>
        ) : (
          <div className="divide-y divide-[#1E2519]">
            {rest.map(({ entry, rank, tiedWith }, index) => {
              const isYou = entry.studentId === user?.id;
              const pct = entry.totalPossibleScore > 0 ? Math.min(100, (entry.totalScore / entry.totalPossibleScore) * 100) : 0;
              const initials = entry.studentName.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
              const delta = getDelta(entry.studentId, rank);
              const isPersistent = entry.completedTasks >= PERSISTENCE_BADGE_THRESHOLD;
              const isClimber = delta != null && delta >= CLIMBER_BADGE_THRESHOLD;

              return (
                <div
                  key={entry.studentId}
                  onClick={() => setSelectedStudent({ id: entry.studentId, name: entry.studentName })}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 hover:bg-[#1A2016] hover:-translate-y-px ${
                    index % 2 === 1 ? 'bg-white/[0.015]' : ''
                  }`}
                >
                  <span className="w-6 text-center font-mono text-xs font-bold text-sage-500 shrink-0">
                    {tiedWith.length > 0 ? `=${rank}` : rank}
                  </span>

                  {entry.avatarUrl ? (
                    <img src={entry.avatarUrl} alt={entry.studentName} className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary-500/12 border border-primary-500/20 text-primary-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {initials}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span className="font-semibold text-white text-sm truncate">{entry.studentName}</span>
                      {isYou && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-primary-500 text-[#06150E]">
                          {labelYou}
                        </span>
                      )}
                      {isPersistent && (
                        <Flame className="w-3.5 h-3.5 text-accent-400 shrink-0" aria-label={lang === 'ar' ? 'شارة المثابرة' : 'Persistence badge'} />
                      )}
                      {isClimber && (
                        <span className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary-500/15 text-primary-300 border border-primary-500/25">
                          <ArrowUp className="w-2.5 h-2.5" />
                          {lang === 'ar' ? 'متسلق' : 'Climber'}
                        </span>
                      )}
                      {delta != null && delta !== 0 && !isClimber && (
                        <span className={`shrink-0 flex items-center gap-0.5 text-[10px] font-mono font-bold ${delta > 0 ? 'text-primary-400' : 'text-red-400'}`}>
                          {delta > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          {Math.abs(delta)}
                        </span>
                      )}
                    </div>
                    {tiedWith.length > 0 && (
                      <p className="text-[10px] text-sage-500 mt-0.5">
                        {lang === 'ar'
                          ? `نفس الدرجة مع ${tiedWith.map((t) => t.studentName).join('، ')}`
                          : `Tied with ${tiedWith.map((t) => t.studentName).join(', ')}`}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 max-w-[240px] rounded-full bg-[#1A2016] overflow-hidden">
                        {entry.totalTasks > 0 && (
                          <div
                            className="h-full rounded-full bg-primary-500 animate-bar-fill"
                            style={{ width: `${pct}%` }}
                          />
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-sage-500 shrink-0">
                        {entry.totalTasks > 0 ? `${entry.completedTasks}/${entry.totalTasks}` : (lang === 'ar' ? 'لا تكليفات' : 'no tasks')}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {entry.totalTasks > 0 ? (
                      <>
                        <div className="font-mono font-bold text-sm text-primary-400">
                          {entry.totalScore}<span className="text-sage-500 text-xs">/{entry.totalPossibleScore}</span>
                        </div>
                        <div className="font-mono text-[10px] text-sage-500">{entry.averageGrade.toFixed(1)}%</div>
                      </>
                    ) : (
                      <span className="text-xs text-sage-500">N/A</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-[10px] text-sage-600 text-center px-2">
        {lang === 'ar'
          ? 'مؤشرات الصعود/الهبوط تقارن بآخر مرة فتحت فيها هذه الصفحة على هذا الجهاز، وليس بالضرورة الأسبوع الماضي.'
          : 'Rank-change arrows compare against the last time you opened this page on this device, not necessarily last week.'}
      </p>

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
