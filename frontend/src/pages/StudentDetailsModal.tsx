import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { X, Calendar, Code, Cpu, FileCheck, Award, MessageSquare, Save, Loader2, Play } from 'lucide-react';

interface StudentDetailsModalProps {
  studentId: string;
  studentName: string;
  studentRegisterId: string;
  taskId: string;
  taskTitle: string;
  maxGrade: number;
  onClose: () => void;
  onGraded: () => void;
}

interface Submission {
  id: string;
  studentId: string;
  attemptNumber: number;
  submittedAt: string;
  executionTimeMs: number;
  similarityScore: number | null;
  comparisonReport: string | null;
  code: string;
  grade: number;
  feedback: string;
  teacherFeedback: string;
  teacherNotes: string;
  consoleOutput: string | null;
  expectedOutput: string | null;
}

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  studentId,
  studentName,
  studentRegisterId,
  taskId,
  taskTitle,
  maxGrade,
  onClose,
  onGraded,
}) => {
  const { user } = useAuth();
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
          attemptNumber: s.attempts || 1,
          submittedAt: s.submissionTime || new Date().toISOString(),
          executionTimeMs: s.executionTime || 0,
          similarityScore: s.similarityScore,
          comparisonReport: null,
          code: s.submittedCode || '# No code content stored.',
          grade: s.grade !== null ? s.grade : 0,
          feedback: s.teacherFeedback || '',
          teacherFeedback: s.teacherFeedback || '',
          teacherNotes: s.teacherNotes || '',
          consoleOutput: s.consoleOutput || null,
          expectedOutput: s.expectedOutput || null,
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

  const handleSelectSubmission = (sub: Submission) => {
    setSelectedSub(sub);
    setManualGrade(sub.grade);
    setTeacherFeedback(sub.teacherFeedback || '');
    setTeacherNotes(sub.teacherNotes || '');
  };

  useEffect(() => {
    fetchHistory();
  }, [studentId, taskId]);

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

      // Update local submissions list
      setSubmissions(prev =>
        prev.map(s =>
          s.id === selectedSub.id
            ? { ...s, grade: manualGrade, teacherFeedback, teacherNotes }
            : s
        )
      );

      // Update selected submission
      setSelectedSub(prev => prev ? { ...prev, grade: manualGrade, teacherFeedback, teacherNotes } : null);
      
      toast.success(`Grade (${manualGrade}/${maxGrade}) and feedback saved!`);
      onGraded();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save grade');
    } finally {
      setSaving(false);
    }
  };

  const bestGrade = submissions.length > 0 ? Math.max(...submissions.map(s => s.grade)) : 0;
  const currentGrade = submissions.length > 0 ? submissions[0].grade : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-6xl h-[90vh] bg-[#16161A] border border-[#24242B] rounded-2xl flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#24242B] bg-[#1E1E24]">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-violet-400" />
              Submission Details: {studentName} ({studentRegisterId})
            </h2>
            <p className="text-xs text-zinc-400 mt-1">Task: {taskTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2F2F37] text-zinc-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-violet-500 mb-2" />
            <p className="text-sm text-zinc-400">Loading student history...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-6 text-red-400">
            <p>{error}</p>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar: Attempt History */}
            <div className="w-64 border-r border-[#24242B] bg-[#121215] flex flex-col overflow-y-auto p-4 space-y-3">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Attempts History</h3>
              {submissions.length === 0 ? (
                <div className="text-zinc-500 text-sm py-4">No submissions yet</div>
              ) : (
                submissions.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => handleSelectSubmission(sub)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedSub?.id === sub.id
                        ? 'border-violet-500 bg-violet-600/10 text-white'
                        : 'border-[#24242B] bg-[#1A1A22] text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-sm">Attempt #{sub.attemptNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        sub.grade >= 70 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {sub.grade} pts
                      </span>
                    </div>
                    <div className="text-2xs text-zinc-500 flex items-center gap-1 mt-2">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(sub.submittedAt).toLocaleDateString()} {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Main Area: Submission details & grading */}
            {selectedSub ? (
              <div className="flex-1 flex overflow-hidden">
                {/* Left section: Code & Output Comparison */}
                <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
                  {/* Summary row */}
                  <div className="grid grid-cols-4 gap-4 bg-[#1E1E24] border border-[#2D2D39] rounded-xl p-4">
                    <div className="text-center border-r border-[#2D2D39]">
                      <span className="text-2xs text-zinc-400 uppercase block mb-1">Current Grade</span>
                      <span className="text-lg font-bold text-white">{currentGrade}</span>
                    </div>
                    <div className="text-center border-r border-[#2D2D39]">
                      <span className="text-2xs text-zinc-400 uppercase block mb-1">Best Grade</span>
                      <span className="text-lg font-bold text-green-400">{bestGrade}</span>
                    </div>
                    <div className="text-center border-r border-[#2D2D39]">
                      <span className="text-2xs text-zinc-400 uppercase block mb-1">Execution Time</span>
                      <span className="text-lg font-bold text-white flex items-center justify-center gap-1">
                        <Cpu className="w-4 h-4 text-violet-400" />
                        {selectedSub.executionTimeMs} ms
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-2xs text-zinc-400 uppercase block mb-1">Similarity Score</span>
                      <span className={`text-lg font-bold ${
                        (selectedSub.similarityScore ?? 0) > 60 ? 'text-red-400' : 'text-zinc-400'
                      }`}>
                        {selectedSub.similarityScore !== null ? `${selectedSub.similarityScore.toFixed(0)}%` : '0%'}
                      </span>
                    </div>
                  </div>

                  {/* Code Viewer */}
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Code className="w-4 h-4 text-violet-400" />
                      Submitted Code (Python)
                    </h3>
                    <div className="relative rounded-xl border border-[#24242B] overflow-hidden bg-[#0A0A0C]">
                      <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed max-h-64">
                        <code>{selectedSub.code}</code>
                      </pre>
                    </div>
                  </div>

                  {/* Comparison Report */}
                  {selectedSub.comparisonReport && (
                    <div className="bg-yellow-950/20 border border-yellow-800/30 text-yellow-300/90 rounded-xl p-4 text-xs leading-relaxed">
                      <span className="font-semibold block mb-1">Code Similarity Report</span>
                      {selectedSub.comparisonReport}
                    </div>
                  )}

                  {/* Expected vs Actual comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5 text-blue-400" />
                        Console Output
                      </h4>
                      <pre className="p-3 bg-[#0E0E12] border border-[#24242B] rounded-lg text-2xs font-mono text-red-300 overflow-x-auto min-h-24 max-h-36">
                        {selectedSub.consoleOutput || 'None'}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-green-400" />
                        Expected Output
                      </h4>
                      <pre className="p-3 bg-[#0E0E12] border border-[#24242B] rounded-lg text-2xs font-mono text-green-300 overflow-x-auto min-h-24 max-h-36">
                        {selectedSub.expectedOutput || 'None'}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Right section: Grading & Feedback */}
                <form
                  onSubmit={handleSaveReview}
                  className="w-80 border-l border-[#24242B] bg-[#121215] p-6 flex flex-col justify-between overflow-y-auto"
                >
                  <div className="space-y-5">
                    <h3 className="text-sm font-semibold text-white mb-4">Grading & Feedback</h3>
                    
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                        Grade (Max {maxGrade} pts)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={maxGrade}
                        value={manualGrade}
                        onChange={(e) => setManualGrade(Number(e.target.value))}
                        className="w-full bg-[#1A1A22] border border-[#2D2D39] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all font-bold text-lg text-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
                        Teacher Feedback
                      </label>
                      <textarea
                        rows={5}
                        placeholder="Leave feedback for the student..."
                        value={teacherFeedback}
                        onChange={(e) => setTeacherFeedback(e.target.value)}
                        className="w-full bg-[#1A1A22] border border-[#2D2D39] text-white rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all placeholder-zinc-600 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                        Teacher Notes (Private)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Private notes (only visible to instructors)..."
                        value={teacherNotes}
                        onChange={(e) => setTeacherNotes(e.target.value)}
                        className="w-full bg-[#1A1A22] border border-[#2D2D39] text-white rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all placeholder-zinc-600 resize-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-lg py-3 px-4 shadow-lg hover:shadow-violet-900/30 transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-zinc-500 text-sm">Select an attempt to start review</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
