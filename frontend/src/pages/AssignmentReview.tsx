import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useTranslation } from '../utils/i18n';
import { StudentDetailsModal } from './StudentDetailsModal';
import { Breadcrumbs } from '../components/Breadcrumbs';
import {
  Code, Search, FileCode, Loader2, Users, CheckCircle2, XCircle, Clock, Award
} from 'lucide-react';

interface AssignmentStudentItem {
  submissionId?: string | null;
  studentId: string;
  studentName: string;
  studentRegisterId: string;
  studentAvatarUrl?: string | null;
  status: 'Graded' | 'Pending Review' | 'Not Submitted' | 'Late Submission';
  submissionTime?: string | null;
  grade: number;
  maxGrade: number;
  attemptNumber?: number;
}

interface AssignmentOverviewData {
  taskId: string;
  taskTitle: string;
  groupName: string;
  courseId: string;
  maxGrade: number;
  deadline: string;
  mode: string;
  students: AssignmentStudentItem[];
}

export const AssignmentReview: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [data, setData] = useState<AssignmentOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Quick review modal
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);

  const fetchAssignmentData = async () => {
    if (!user || !taskId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/dashboard/teacher/task/${taskId}/submissions?pageSize=100`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error('Failed to load assignment overview');
      const resData = await res.json();
      
      const studentsList: AssignmentStudentItem[] = resData.submissions.map((s: any) => {
        let status: AssignmentStudentItem['status'] = 'Not Submitted';
        if (s.submissionId) {
          if (s.grade > 0 || s.teacherFeedback) {
            status = s.isLate ? 'Late Submission' : 'Graded';
          } else {
            status = 'Pending Review';
          }
        }

        return {
          submissionId: s.submissionId,
          studentId: s.studentId,
          studentName: s.studentName,
          studentRegisterId: s.studentRegisterId || 'ST-001',
          studentAvatarUrl: s.studentAvatarUrl,
          status,
          submissionTime: s.submissionTime,
          grade: s.grade || 0,
          maxGrade: resData.maxGrade || 100,
          attemptNumber: s.attempts || 1,
        };
      });

      setData({
        taskId: resData.taskId || taskId,
        taskTitle: resData.taskTitle || 'Assignment',
        groupName: resData.courseName || 'Teaching Group',
        courseId: resData.courseId || '',
        maxGrade: resData.maxGrade || 100,
        deadline: resData.deadline || new Date().toISOString(),
        mode: resData.mode || 'Homework',
        students: studentsList,
      });
    } catch (err: any) {
      setError(err.message || 'Error loading assignment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignmentData();
  }, [taskId, user]);

  const allStudents = data?.students || [];

  // Metrics
  const totalStudents = allStudents.length;
  const submittedStudents = allStudents.filter(s => s.submissionId);
  const missingStudents = allStudents.filter(s => !s.submissionId);

  const submittedCount = submittedStudents.length;
  const missingCount = missingStudents.length;
  const pendingReviewCount = submittedStudents.filter(s => s.status === 'Pending Review').length;
  const gradedStudents = submittedStudents.filter(s => s.status !== 'Pending Review');
  const gradedCount = gradedStudents.length;
  const avgGrade = gradedCount > 0
    ? (gradedStudents.reduce((acc, curr) => acc + curr.grade, 0) / gradedCount).toFixed(1)
    : '0';

  // Search filtering
  const searchFilteredSubmitted = submittedStudents.filter(s =>
    s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentRegisterId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const searchFilteredMissing = missingStudents.filter(s =>
    s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentRegisterId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeSub = reviewIndex !== null && searchFilteredSubmitted[reviewIndex] ? searchFilteredSubmitted[reviewIndex] : null;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Courses', href: '/' },
          { label: data?.groupName || 'Course', href: data?.courseId ? `/course/${data.courseId}` : '/' },
          { label: data?.taskTitle ? `Review: ${data.taskTitle}` : 'Assignment Review' },
        ]}
      />

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F2937] pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-3 tracking-tight">
            <Code className="w-6 h-6 text-blue-400" />
            {data?.taskTitle}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Max Grade: <strong className="text-blue-400">{data?.maxGrade} pts</strong> | Deadline: <strong>{data?.deadline ? new Date(data.deadline).toLocaleString() : 'None'}</strong>
          </p>
        </div>

        {/* Search & Workspace Launch */}
        <div className="flex items-center gap-3">
          <Link
            to={`/grading-workspace/${taskId}`}
            className="saas-button-primary bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs"
          >
            <Code className="w-4 h-4" />
            Open 2-Panel Grading Workspace
          </Link>
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
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
          <p className="text-xs">{t('loading')}</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-center text-sm">
          {error}
        </div>
      ) : (
        <div className="space-y-10">
          {/* Top Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-[#111827] border border-[#1F2937] p-4 rounded-2xl shadow-xl flex flex-col justify-between">
              <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" /> Total Students
              </span>
              <div className="text-2xl font-extrabold text-white mt-2">{totalStudents}</div>
            </div>

            <div className="bg-[#111827] border border-[#1F2937] p-4 rounded-2xl shadow-xl flex flex-col justify-between">
              <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Submitted
              </span>
              <div className="text-2xl font-extrabold text-emerald-400 mt-2">{submittedCount}</div>
            </div>

            <div className="bg-[#111827] border border-[#1F2937] p-4 rounded-2xl shadow-xl flex flex-col justify-between">
              <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-rose-400" /> Missing
              </span>
              <div className="text-2xl font-extrabold text-rose-400 mt-2">{missingCount}</div>
            </div>

            <div className="bg-[#111827] border border-[#1F2937] p-4 rounded-2xl shadow-xl flex flex-col justify-between">
              <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Pending Review
              </span>
              <div className="text-2xl font-extrabold text-amber-400 mt-2">{pendingReviewCount}</div>
            </div>

            <div className="bg-[#111827] border border-[#1F2937] p-4 rounded-2xl shadow-xl flex flex-col justify-between">
              <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-sky-400" /> Graded
              </span>
              <div className="text-2xl font-extrabold text-sky-400 mt-2">{gradedCount}</div>
            </div>

            <div className="bg-[#111827] border border-[#1F2937] p-4 rounded-2xl shadow-xl flex flex-col justify-between">
              <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-violet-400" /> Avg Grade
              </span>
              <div className="text-2xl font-extrabold text-violet-400 mt-2">{avgGrade} <span className="text-xs text-zinc-500">/ {data?.maxGrade}</span></div>
            </div>
          </div>

          {/* Section 1: Submitted Students */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Submitted Students ({searchFilteredSubmitted.length})
              </h2>
              <p className="text-xs text-zinc-400">Students who submitted their assignment. Click Review to inspect code and grade.</p>
            </div>

            {/* Mobile Cards Layout (sm:hidden) */}
            <div className="sm:hidden space-y-3">
              {searchFilteredSubmitted.length === 0 ? (
                <div className="p-6 bg-[#111827] border border-[#1F2937] rounded-2xl text-center text-zinc-500 text-xs">
                  No submitted students found.
                </div>
              ) : (
                searchFilteredSubmitted.map((s, idx) => (
                  <div key={s.studentId} className="bg-[#111827] border border-[#1F2937] rounded-2xl p-4 space-y-3 shadow-xl">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center border border-blue-400/30 overflow-hidden shrink-0">
                          {s.studentAvatarUrl ? (
                            <img src={s.studentAvatarUrl} alt={s.studentName} className="w-full h-full object-cover" />
                          ) : (
                            s.studentName.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-sm">{s.studentName}</h3>
                          <span className="text-xs text-zinc-400 font-mono">{s.studentRegisterId}</span>
                        </div>
                      </div>
                      <span className="font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl text-xs">
                        {s.grade} / {data?.maxGrade} pts
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[#1F2937]/60 text-zinc-400">
                      <span>Submitted: {s.submissionTime ? new Date(s.submissionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                      <span className="font-mono">Attempt #{s.attemptNumber}</span>
                    </div>

                    <button
                      onClick={() => setReviewIndex(idx)}
                      className="saas-button-primary min-h-[48px] w-full mt-2"
                    >
                      <FileCode className="w-4 h-4" />
                      Review & Grade Code
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table (hidden on mobile) */}
            <div className="hidden sm:block bg-[#111827] border border-[#1F2937] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-zinc-300">
                  <thead className="bg-[#1F2937]/50 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-[#1F2937]">
                    <tr>
                      <th className="px-5 py-3.5 font-bold">Avatar</th>
                      <th className="px-5 py-3.5 font-bold">Name</th>
                      <th className="px-4 py-3.5 font-bold">Submission Time</th>
                      <th className="px-4 py-3.5 font-bold">Attempt</th>
                      <th className="px-4 py-3.5 font-bold">Grade</th>
                      <th className="px-4 py-3.5 font-bold">Status</th>
                      <th className="px-4 py-3.5 font-bold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]/50">
                    {searchFilteredSubmitted.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                          No submitted students found.
                        </td>
                      </tr>
                    ) : (
                      searchFilteredSubmitted.map((s, idx) => (
                        <tr key={s.studentId} className="hover:bg-[#1A2234] transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center border border-blue-400/30 overflow-hidden shrink-0">
                              {s.studentAvatarUrl ? (
                                <img src={s.studentAvatarUrl} alt={s.studentName} className="w-full h-full object-cover" />
                              ) : (
                                s.studentName.substring(0, 2).toUpperCase()
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-white text-sm">{s.studentName}</div>
                            <div className="text-[11px] text-zinc-400 font-mono">{s.studentRegisterId}</div>
                          </td>
                          <td className="px-4 py-3.5 text-zinc-300">
                            {s.submissionTime ? new Date(s.submissionTime).toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-zinc-400">
                            #{s.attemptNumber}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                              {s.grade} / {data?.maxGrade} pts
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {s.status === 'Graded' && (
                              <span className="px-2.5 py-1 rounded-lg font-bold text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 inline-block">
                                🟢 Graded
                              </span>
                            )}
                            {s.status === 'Pending Review' && (
                              <span className="px-2.5 py-1 rounded-lg font-bold text-[10px] bg-amber-500/15 border border-amber-500/30 text-amber-400 inline-block">
                                🟡 Pending Review
                              </span>
                            )}
                            {s.status === 'Late Submission' && (
                              <span className="px-2.5 py-1 rounded-lg font-bold text-[10px] bg-orange-500/15 border border-orange-500/30 text-orange-400 inline-block">
                                🟠 Late Submission
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <button
                              onClick={() => setReviewIndex(idx)}
                              className="saas-button-primary"
                            >
                              <FileCode className="w-3.5 h-3.5" />
                              Review Code
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 2: Missing Students */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                Missing Students ({searchFilteredMissing.length})
              </h2>
              <p className="text-xs text-zinc-400">Enrolled students who have not turned in a submission yet.</p>
            </div>

            {/* Mobile Cards for Missing Students */}
            <div className="sm:hidden space-y-3">
              {searchFilteredMissing.length === 0 ? (
                <div className="p-6 bg-[#111827] border border-[#1F2937] rounded-2xl text-center text-zinc-500 text-xs">
                  All enrolled students have submitted! No missing students.
                </div>
              ) : (
                searchFilteredMissing.map((s) => {
                  const isOverdue = data?.deadline ? new Date() > new Date(data.deadline) : false;
                  return (
                    <div key={s.studentId} className="bg-[#111827] border border-[#1F2937] rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-xs flex items-center justify-center border border-zinc-700/40 overflow-hidden shrink-0">
                          {s.studentAvatarUrl ? (
                            <img src={s.studentAvatarUrl} alt={s.studentName} className="w-full h-full object-cover" />
                          ) : (
                            s.studentName.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-sm">{s.studentName}</h3>
                          <span className="text-xs text-zinc-400 font-mono">{s.studentRegisterId}</span>
                        </div>
                      </div>

                      {isOverdue ? (
                        <span className="px-2.5 py-1 rounded-xl font-bold text-[10px] bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
                          🔴 Overdue
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl font-medium text-[10px] bg-zinc-500/15 border border-zinc-500/30 text-zinc-400 shrink-0">
                          ⚪ Pending
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table for Missing Students */}
            <div className="hidden sm:block bg-[#111827] border border-[#1F2937] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-zinc-300">
                  <thead className="bg-[#1F2937]/50 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-[#1F2937]">
                    <tr>
                      <th className="px-5 py-3.5 font-bold">Avatar</th>
                      <th className="px-5 py-3.5 font-bold">Name</th>
                      <th className="px-4 py-3.5 font-bold">Deadline Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]/50">
                    {searchFilteredMissing.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                          All enrolled students have submitted! No missing students.
                        </td>
                      </tr>
                    ) : (
                      searchFilteredMissing.map((s) => {
                        const isOverdue = data?.deadline ? new Date() > new Date(data.deadline) : false;
                        return (
                          <tr key={s.studentId} className="hover:bg-[#1A2234] transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="w-9 h-9 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-xs flex items-center justify-center border border-zinc-700/40 overflow-hidden shrink-0">
                                {s.studentAvatarUrl ? (
                                  <img src={s.studentAvatarUrl} alt={s.studentName} className="w-full h-full object-cover" />
                                ) : (
                                  s.studentName.substring(0, 2).toUpperCase()
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="font-bold text-white text-sm">{s.studentName}</div>
                              <div className="text-[11px] text-zinc-400 font-mono">{s.studentRegisterId}</div>
                            </td>
                            <td className="px-4 py-3.5">
                              {isOverdue ? (
                                <span className="px-2.5 py-1 rounded-lg font-bold text-[10px] bg-rose-500/15 border border-rose-500/30 text-rose-400 inline-flex items-center gap-1">
                                  🔴 Overdue / Deadline Passed
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-lg font-medium text-[10px] bg-zinc-500/15 border border-zinc-500/30 text-zinc-400 inline-flex items-center gap-1">
                                  ⚪ Pending Submission (Due: {data?.deadline ? new Date(data.deadline).toLocaleDateString() : 'N/A'})
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Review Modal */}
      {activeSub && reviewIndex !== null && data && (
        <StudentDetailsModal
          studentId={activeSub.studentId}
          studentName={activeSub.studentName}
          studentRegisterId={activeSub.studentRegisterId}
          studentAvatarUrl={activeSub.studentAvatarUrl}
          taskId={data.taskId}
          taskTitle={data.taskTitle}
          maxGrade={data.maxGrade}
          onClose={() => setReviewIndex(null)}
          onGraded={() => {
            fetchAssignmentData();
          }}
          hasPrevious={reviewIndex > 0}
          hasNext={reviewIndex < searchFilteredSubmitted.length - 1}
          onPrevious={() => setReviewIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
          onNext={() => setReviewIndex((prev) => (prev !== null && prev < searchFilteredSubmitted.length - 1 ? prev + 1 : prev))}
        />
      )}
    </div>
  );
};

