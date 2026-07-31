import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTranslation } from '../utils/i18n';
import { X, Code, Award, Save, Loader2, Download, MessageSquare } from 'lucide-react';



interface StudentDetailsModalProps {
  studentId: string;
  studentName: string;
  studentRegisterId: string;
  studentAvatarUrl?: string | null;
  taskId: string;
  taskTitle: string;
  maxGrade: number;
  onClose: () => void;
  onGraded: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
}

interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  studentRegisterId: string;
  studentAvatarUrl?: string | null;
  courseName: string;
  taskTitle: string;
  attemptNumber: number;
  submittedAt: string;
  code: string;
  grade: number;
  teacherFeedback: string;
  teacherNotes: string;
  consoleOutput?: string | null;
  expectedOutput?: string | null;
  executionTimeMs?: number | null;
}

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  studentId,
  studentName,
  studentRegisterId,
  studentAvatarUrl,
  taskId,
  taskTitle,
  maxGrade,
  onClose,
  onGraded,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

  // Grading form state
  const [manualGrade, setManualGrade] = useState<number>(0);
  const [teacherFeedback, setTeacherFeedback] = useState<string>('');
  const [teacherNotes, setTeacherNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/dashboard/teacher/task/${taskId}/submissions?pageSize=100`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (!response.ok) throw new Error('Failed to load submissions');
      const data = await response.json();
      
      const studentSubs = data.submissions
        .filter((s: any) => s.studentId === studentId && s.submissionId)
        .map((s: any) => ({
          id: s.submissionId,
          studentId: s.studentId,
          studentName: s.studentName || studentName,
          studentRegisterId: s.studentRegisterId || studentRegisterId,
          studentAvatarUrl: s.studentAvatarUrl || studentAvatarUrl,
          courseName: s.courseName || 'Course Group',
          taskTitle: taskTitle,
          attemptNumber: s.attempts || 1,
          submittedAt: s.submissionTime || new Date().toISOString(),
          code: s.submittedCode || '# Code submission retrieved successfully',
          grade: s.grade !== null && s.grade !== undefined ? s.grade : 0,
          teacherFeedback: s.teacherFeedback || '',
          teacherNotes: s.teacherNotes || '',
          consoleOutput: s.consoleOutput || s.stdout || '',
          expectedOutput: s.expectedOutput || s.stderr || '',
          executionTimeMs: s.executionTime || s.executionTimeMs || null,
        }));

      setSubmissions(studentSubs);
      if (studentSubs.length > 0) {
        setSelectedSub(studentSubs[0]);
        setManualGrade(studentSubs[0].grade);
        setTeacherFeedback(studentSubs[0].teacherFeedback);
        setTeacherNotes(studentSubs[0].teacherNotes);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [studentId, taskId]);

  const handleSelectSubmission = (sub: Submission) => {
    setSelectedSub(sub);
    setManualGrade(sub.grade);
    setTeacherFeedback(sub.teacherFeedback || '');
    setTeacherNotes(sub.teacherNotes || '');
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    if (manualGrade < 0 || manualGrade > maxGrade) {
      toast.error(`Grade must be between 0 and ${maxGrade}.`);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/submissions/${selectedSub.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          grade: manualGrade,
          teacherFeedback: teacherFeedback,
          teacherNotes: teacherNotes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to save review');
      }

      setSubmissions(prev =>
        prev.map(s =>
          s.id === selectedSub.id
            ? { ...s, grade: manualGrade, teacherFeedback, teacherNotes }
            : s
        )
      );

      setSelectedSub(prev => prev ? { ...prev, grade: manualGrade, teacherFeedback, teacherNotes } : null);
      
      toast.success(`${t('saveGradeFeedback')} (${manualGrade}/${maxGrade})!`);
      onGraded();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save grade');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndNext = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSaveReview(e);
    if (hasNext && onNext) {
      onNext();
    }
  };

  const userInitials = studentName
    ? studentName.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
    : 'ST';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-6xl h-[94vh] sm:h-[90vh] bg-[#16161A] border-t sm:border border-[#24242B] rounded-t-3xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#24242B] bg-[#1E1E24] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center border border-violet-400/30 overflow-hidden shrink-0">
              {studentAvatarUrl ? (
                <img src={studentAvatarUrl} alt={studentName} className="w-full h-full object-cover" />
              ) : (
                userInitials
              )}
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
                <span>{studentName}</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400">
                {studentRegisterId} | {taskTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2F2F37] text-zinc-400 hover:text-white rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-violet-500 mb-2" />
            <p className="text-sm text-zinc-400">{t('loading')}</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-6 text-red-400">
            <p>{error}</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Main Content Pane */}
            {selectedSub ? (
              <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden bg-[#16161A]">
                {/* Submitted Code & Execution Console Pane */}
                <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-[#1F2937] min-h-[300px] lg:min-h-0">
                  <div className="px-4 py-2 border-b border-[#1F2937] bg-[#111827] flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                      <Code className="w-4 h-4 text-blue-400" />
                      {t('submittedCode')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([selectedSub.code], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${selectedSub.studentName.replace(/\s+/g, '_')}_Attempt_${selectedSub.attemptNumber}.py`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/40 text-blue-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 min-h-[38px]"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>

                  <div className="flex-1 min-h-[250px] relative" dir="ltr" style={{ direction: 'ltr' }}>
                    <Editor
                      height="100%"
                      width="100%"
                      defaultLanguage="python"
                      language="python"
                      theme="vs-dark"
                      value={selectedSub.code}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: 'on',
                        fontFamily: 'Consolas, monospace',
                        automaticLayout: true,
                        wordWrap: 'on'
                      }}
                    />
                  </div>
                  <div className="h-2/5 border-t border-[#1F2937] bg-[#0D1117] p-4 overflow-y-auto flex flex-col space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                        <span>🖥️</span> Console Output (stdout)
                      </span>
                    </div>

                    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-3 text-zinc-200 whitespace-pre-wrap font-mono min-h-[60px]">
                      {selectedSub.consoleOutput || 'Standard output is empty.'}
                    </div>

                    {/* Collapsible Runtime Error Section if present */}
                    {selectedSub.expectedOutput && (
                      <details className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 group">
                        <summary className="font-bold cursor-pointer text-xs flex items-center gap-2 text-red-400 select-none">
                          <span>⚠️</span> Runtime Error / Exec Exceptions
                        </summary>
                        <pre className="mt-2 text-[11px] whitespace-pre-wrap font-mono text-red-300 pt-2 border-t border-red-500/20">
                          {selectedSub.expectedOutput}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>

                {/* Manual Review & Feedback Controls Panel */}
                <div className="w-full lg:w-96 bg-[#16161A] p-6 flex flex-col overflow-y-auto space-y-6">
                  {/* Detailed Student Metadata Card */}
                  <div className="p-4 bg-[#1F1F26] border border-[#2B2B36] rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-2">{t('studentInfo')}</h4>
                    <div className="flex items-center gap-3 pb-2 border-b border-[#2B2B36]">
                      <div className="w-10 h-10 rounded-xl bg-violet-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
                        {selectedSub.studentAvatarUrl ? (
                          <img src={selectedSub.studentAvatarUrl} alt={selectedSub.studentName} className="w-full h-full object-cover" />
                        ) : (
                          userInitials
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{selectedSub.studentName}</div>
                        <div className="text-xs text-zinc-400">{t('studentId')}: {selectedSub.studentRegisterId}</div>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-300 pt-1 space-y-1">
                      <div><strong className="text-zinc-400">{t('groupName')}:</strong> {selectedSub.courseName}</div>
                      <div><strong className="text-zinc-400">{t('taskTitle')}:</strong> {selectedSub.taskTitle}</div>
                      <div><strong className="text-zinc-400">{t('attemptNumber')}:</strong> #{selectedSub.attemptNumber}</div>
                    </div>
                  </div>

                  {/* Right Side: Grading Controls Form (Sticky Footer on mobile) */}
                  <form onSubmit={handleSaveReview} className="space-y-4">
                    {submissions.length > 1 && (
                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-400 mb-2">
                          Select Attempt
                        </label>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {submissions.map((sub) => (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => handleSelectSubmission(sub)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border transition-all ${
                                selectedSub?.id === sub.id
                                  ? 'bg-blue-600 text-white border-blue-400'
                                  : 'bg-[#1A1A20] text-zinc-400 border-[#292933]'
                              }`}
                            >
                              Attempt #{sub.attemptNumber} ({sub.grade ?? 0}/{maxGrade})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-400" />
                        {t('grade')} (0 - {maxGrade})
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={maxGrade}
                        value={manualGrade}
                        onChange={(e) => setManualGrade(Number(e.target.value))}
                        className="w-full bg-[#121215] border border-[#2B2B36] rounded-xl px-4 py-2.5 text-white font-bold text-base focus:outline-none focus:border-violet-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-sky-400" />
                        {t('teacherFeedback')}
                      </label>
                      <textarea
                        rows={4}
                        value={teacherFeedback}
                        onChange={(e) => setTeacherFeedback(e.target.value)}
                        placeholder="Write constructive feedback for the student..."
                        className="w-full bg-[#121215] border border-[#2B2B36] rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-400 mb-1.5">
                        Private Instructor Notes (Internal Only)
                      </label>
                      <textarea
                        rows={2}
                        value={teacherNotes}
                        onChange={(e) => setTeacherNotes(e.target.value)}
                        placeholder="Private notes (visible only to teachers)..."
                        className="w-full bg-[#121215] border border-[#2B2B36] rounded-xl p-3 text-xs text-zinc-400 focus:outline-none focus:border-violet-500 resize-none"
                      />
                    </div>

                    {/* Quick Review Navigation Action Toolbar */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {hasPrevious && onPrevious ? (
                        <button
                          type="button"
                          onClick={onPrevious}
                          className="py-2.5 px-3 bg-[#1F1F26] hover:bg-[#2B2B36] border border-[#2B2B36] text-zinc-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-1 transition-all"
                        >
                          &larr; Previous
                        </button>
                      ) : (
                        <div />
                      )}

                      {hasNext && onNext ? (
                        <button
                          type="button"
                          onClick={onNext}
                          className="py-2.5 px-3 bg-[#1F1F26] hover:bg-[#2B2B36] border border-[#2B2B36] text-zinc-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-1 transition-all"
                        >
                          Next &rarr;
                        </button>
                      ) : (
                        <div />
                      )}

                      <button
                        type="submit"
                        disabled={saving}
                        className="py-2.5 px-3 bg-[#1F1F26] hover:bg-[#2B2B36] border border-[#2B2B36] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveAndNext}
                        disabled={saving}
                        className="py-2.5 px-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-violet-950/40 transition-all disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save & Next &rarr;
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                Select a submission attempt from the sidebar to inspect code.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
