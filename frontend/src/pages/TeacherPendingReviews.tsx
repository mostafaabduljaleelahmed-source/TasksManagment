import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useTranslation } from '../utils/i18n';
import { StudentDetailsModal } from './StudentDetailsModal';
import { Breadcrumbs } from '../components/Breadcrumbs';
import {
  Clock, CheckCircle2, FileCode, Search, SortAsc, Loader2
} from 'lucide-react';

interface PendingSubmission {
  submissionId: string;
  studentId: string;
  studentName: string;
  studentRegisterId: string;
  studentAvatarUrl?: string | null;
  taskId: string;
  taskTitle: string;
  maxGrade: number;
  deadline: string;
  groupName: string;
  submittedAt: string;
  attemptNumber: number;
  code: string;
}

export const TeacherPendingReviews: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<PendingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected for review modal
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);

  const fetchPendingSubmissions = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/dashboard/teacher/pending-reviews?sortBy=${sortBy}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error('Failed to load pending reviews');
      const data = await res.json();
      setSubmissions(data);
    } catch (err: any) {
      setError(err.message || 'Error loading pending reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingSubmissions();
  }, [user, sortBy]);

  const filteredSubmissions = submissions.filter((sub) => {
    const term = searchTerm.toLowerCase();
    return (
      sub.studentName.toLowerCase().includes(term) ||
      sub.studentRegisterId.toLowerCase().includes(term) ||
      sub.taskTitle.toLowerCase().includes(term) ||
      sub.groupName.toLowerCase().includes(term)
    );
  });

  const activeSub = reviewIndex !== null && filteredSubmissions[reviewIndex] ? filteredSubmissions[reviewIndex] : null;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      <Breadcrumbs items={[{ label: 'Pending Reviews' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F2937] pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
            <span className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              🟡
            </span>
            Pending Reviews ({submissions.length})
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Dedicated workspace for reviewing ungraded student submissions.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="saas-input pl-9 w-48 sm:w-64"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 bg-[#111827] border border-[#1F2937] px-3 py-2 rounded-xl text-xs">
            <SortAsc className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="newest" className="bg-[#111827]">Newest First</option>
              <option value="oldest" className="bg-[#111827]">Oldest First</option>
              <option value="deadline" className="bg-[#111827]">Closest Deadline</option>
              <option value="group" className="bg-[#111827]">Group Name</option>
              <option value="task" className="bg-[#111827]">Task Title</option>
              <option value="student" className="bg-[#111827]">Student Name</option>
            </select>
          </div>
        </div>
      </div>

        {/* Workspace Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-3" />
            <p className="text-sm text-zinc-400">{t('loading')}</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-center">
            {error}
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="bg-[#121215] border border-[#24242B] rounded-2xl p-12 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">All Caught Up!</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              There are no pending student submissions waiting for manual review right now.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubmissions.map((sub) => (
              <div
                key={sub.submissionId}
                className="bg-[#121215] border border-[#24242B] hover:border-amber-500/40 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 group transition-all"
              >
                <div className="space-y-3">
                  {/* Group & Deadline Badge */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="bg-zinc-800 text-zinc-300 font-bold px-2.5 py-1 rounded-md border border-zinc-700">
                      {sub.groupName}
                    </span>
                    <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Pending Grade
                    </span>
                  </div>

                  {/* Student Header */}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-violet-600 text-white font-extrabold text-sm flex items-center justify-center border border-amber-400/30 overflow-hidden shrink-0">
                      {sub.studentAvatarUrl ? (
                        <img src={sub.studentAvatarUrl} alt={sub.studentName} className="w-full h-full object-cover" />
                      ) : (
                        sub.studentName.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                        {sub.studentName}
                      </h4>
                      <p className="text-xs text-zinc-400 font-mono">ID: {sub.studentRegisterId}</p>
                    </div>
                  </div>

                  {/* Task Metadata */}
                  <div className="bg-[#1A1A20] border border-[#292933] rounded-xl p-3 space-y-1.5 text-xs">
                    <div className="font-bold text-white flex items-center justify-between">
                      <span className="truncate">{sub.taskTitle}</span>
                      <span className="text-violet-400 shrink-0 font-bold">{sub.maxGrade} pts</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-[#292933]">
                      <span>Submitted: {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>Attempt #{sub.attemptNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Review Action */}
                <button
                  onClick={() => navigate(`/grading-workspace/${sub.taskId}`)}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-violet-600 hover:from-amber-400 hover:to-violet-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-950/30 transition-all flex items-center justify-center gap-2"
                >
                  <FileCode className="w-4 h-4" />
                  Review Code & Grade
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Modal with Quick Review Navigation */}
        {activeSub && reviewIndex !== null && (
          <StudentDetailsModal
            studentId={activeSub.studentId}
            studentName={activeSub.studentName}
            studentRegisterId={activeSub.studentRegisterId}
            studentAvatarUrl={activeSub.studentAvatarUrl}
            taskId={activeSub.taskId}
            taskTitle={activeSub.taskTitle}
            maxGrade={activeSub.maxGrade}
            onClose={() => setReviewIndex(null)}
            onGraded={() => {
              fetchPendingSubmissions();
            }}
            // Quick Review Navigation props
            hasPrevious={reviewIndex > 0}
            hasNext={reviewIndex < filteredSubmissions.length - 1}
            onPrevious={() => setReviewIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
            onNext={() => setReviewIndex((prev) => (prev !== null && prev < filteredSubmissions.length - 1 ? prev + 1 : prev))}
          />
        )}
      </div>
  );
};
