import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Editor from '@monaco-editor/react';
import {
  AlertCircle, ArrowLeft, ArrowRight, Save, Loader2, Code, Zap, Sparkles,
  FileText, MessageSquare, History, BarChart3, RotateCcw
} from 'lucide-react';

interface PendingSubmissionQueueItem {
  submissionId: string;
  studentId: string;
  studentName: string;
  studentRegisterId: string;
  studentAvatarUrl?: string | null;
  taskId: string;
  taskTitle: string;
  language: string;
  description: string;
  maxGrade: number;
  deadline?: string | null;
  groupName: string;
  submittedAt: string;
  attemptNumber: number;
  code: string;
  grade?: number | null;
  teacherFeedback?: string | null;
  status: string;
  isReviewed: boolean;
  publicTestCasesJson?: string | null;
  attachmentsJson?: string | null;
}

interface FeedbackTemplate {
  emoji: string;
  title: string;
  text: string;
  ratio: number;
}

const ARABIC_FEEDBACK_TEMPLATES: FeedbackTemplate[] = [
  { emoji: '🌟', title: 'ممتاز', text: 'عمل ممتاز، استمر بنفس المستوى.', ratio: 1.0 },
  { emoji: '👍', title: 'جيد', text: 'إجابة جيدة، تحتاج بعض التحسينات البسيطة.', ratio: 0.75 },
  { emoji: '🧠', title: 'يحتاج تحسين', text: 'يوجد خطأ في منطق الحل، حاول إعادة التفكير في الخوارزمية.', ratio: 0.50 },
  { emoji: '❌', title: 'الناتج غير صحيح', text: 'الناتج لا يطابق المطلوب.', ratio: 0.25 },
  { emoji: '⚠️', title: 'خطأ أثناء التنفيذ', text: 'الكود يتوقف أثناء التنفيذ.', ratio: 0 },
  { emoji: '🚫', title: 'خطأ نحوي', text: 'يوجد خطأ في كتابة الكود.', ratio: 0.25 },
];

export const GlobalReviewWorkspace: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [queue, setQueue] = useState<PendingSubmissionQueueItem[]>([]);
  const [activeQueueIdx, setActiveQueueIdx] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab State for Right Panel: 'feedback' | 'task' | 'attempts' | 'stats'
  const [activeTab, setActiveTab] = useState<'feedback' | 'task' | 'attempts' | 'stats'>('feedback');

  // Form inputs
  const [gradeInput, setGradeInput] = useState<number>(0);
  const [teacherFeedback, setTeacherFeedback] = useState<string>('');
  const gradeInputRef = useRef<HTMLInputElement>(null);

  const currentSubmission = queue[activeQueueIdx] || null;
  const maxGrade = currentSubmission?.maxGrade || 10;

  // Grade percentage presets (0%, 25%, 50%, 75%, 100%)
  const gradePresets = React.useMemo(() => {
    return [
      { label: '0%', value: 0, keyboard: '1' },
      { label: '25%', value: Math.round(maxGrade * 0.25 * 10) / 10, keyboard: '2' },
      { label: '50%', value: Math.round(maxGrade * 0.5 * 10) / 10, keyboard: '3' },
      { label: '75%', value: Math.round(maxGrade * 0.75 * 10) / 10, keyboard: '4' },
      { label: '100%', value: maxGrade, keyboard: '5' },
    ];
  }, [maxGrade]);

  const handleApplyGradePreset = (val: number) => {
    setGradeInput(val);
    toast.success(`Set Grade: ${val}/${maxGrade}`);
  };

  const handleSelectFeedbackTemplate = (template: FeedbackTemplate) => {
    setTeacherFeedback((prev) => (prev ? `${prev}\n- ${template.text}` : template.text));
    const suggestedGrade = Math.round(maxGrade * template.ratio * 10) / 10;
    setGradeInput(suggestedGrade);
    toast.success(`Preset Applied: ${template.title} (${suggestedGrade}/${maxGrade})`);
  };

  const handleResetReviewForm = () => {
    setGradeInput(currentSubmission?.grade ?? maxGrade);
    setTeacherFeedback(currentSubmission?.teacherFeedback ?? '');
    toast.success('Reset evaluation form to initial state');
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isEditingText = targetTag === 'input' || targetTag === 'textarea';

      if (!isEditingText && currentSubmission) {
        if (e.key === '1') {
          e.preventDefault();
          handleApplyGradePreset(0);
          return;
        } else if (e.key === '2') {
          e.preventDefault();
          handleApplyGradePreset(Math.round(maxGrade * 0.25 * 10) / 10);
          return;
        } else if (e.key === '3') {
          e.preventDefault();
          handleApplyGradePreset(Math.round(maxGrade * 0.5 * 10) / 10);
          return;
        } else if (e.key === '4') {
          e.preventDefault();
          handleApplyGradePreset(Math.round(maxGrade * 0.75 * 10) / 10);
          return;
        } else if (e.key === '5') {
          e.preventDefault();
          handleApplyGradePreset(maxGrade);
          return;
        }
      }

      if (e.ctrlKey && (e.key === 's' || e.key === 'S' || e.key === 'س')) {
        e.preventDefault();
        handleSaveAndNext();
      } else if (e.ctrlKey && e.key === 'ArrowRight') {
        e.preventDefault();
        if (activeQueueIdx < queue.length - 1) {
          handleSelectQueueItem(activeQueueIdx + 1);
        }
      } else if (e.ctrlKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        if (activeQueueIdx > 0) {
          handleSelectQueueItem(activeQueueIdx - 1);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [activeQueueIdx, queue, currentSubmission, maxGrade, gradeInput, teacherFeedback]);

  // Fetch Global Pending Queue from Backend
  const fetchGlobalPendingQueue = async (targetSubId?: string, preferredIndex?: number) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/dashboard/teacher/pending-reviews?sortBy=oldest`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch pending reviews queue');
      const items: PendingSubmissionQueueItem[] = await res.json();
      setQueue(items);

      if (items.length > 0) {
        let selectedIdx = 0;

        if (targetSubId) {
          const matchIdx = items.findIndex((s) => s.submissionId === targetSubId);
          if (matchIdx !== -1) {
            selectedIdx = matchIdx;
          } else if (preferredIndex !== undefined) {
            selectedIdx = Math.min(preferredIndex, items.length - 1);
          }
        }

        setActiveQueueIdx(selectedIdx);
        populateGradingForm(items[selectedIdx]);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading review queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalPendingQueue(submissionId);
  }, [user, submissionId]);

  const populateGradingForm = (item: PendingSubmissionQueueItem) => {
    if (item) {
      const initialGrade = item.grade !== null && item.grade !== undefined ? item.grade : item.maxGrade;
      setGradeInput(initialGrade);
      setTeacherFeedback(item.teacherFeedback || '');

      setTimeout(() => {
        if (gradeInputRef.current) {
          gradeInputRef.current.focus();
          gradeInputRef.current.select();
        }
      }, 100);
    }
  };

  const executeSaveReview = async (): Promise<boolean> => {
    if (!currentSubmission) return false;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/submissions/${currentSubmission.submissionId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          grade: gradeInput,
          teacherFeedback: teacherFeedback,
          teacherNotes: '',
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to save grade');
      }

      toast.success(`Grade saved successfully (${gradeInput}/${currentSubmission.maxGrade})`);
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Error saving grade');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndNext = async () => {
    if (!currentSubmission) return;
    const currentSubId = currentSubmission.submissionId;
    const currentIdx = activeQueueIdx;

    const success = await executeSaveReview();
    if (success) {
      await fetchGlobalPendingQueue(currentSubId, currentIdx);
    }
  };

  const handleSelectQueueItem = (idx: number) => {
    if (idx < 0 || idx >= queue.length) return;
    setActiveQueueIdx(idx);
    populateGradingForm(queue[idx]);
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#0B0F19] flex flex-col items-center justify-center text-zinc-400 p-6">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-4" />
        <p className="text-sm font-medium">Loading Canvas LMS Pending Queue...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
          <h2 className="text-lg font-bold">Failed to load Pending Queue</h2>
          <p className="text-xs mt-1">{error}</p>
          <button
            onClick={() => navigate('/teacher/pending-reviews')}
            className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Back to Pending Queue
          </button>
        </div>
      </div>
    );
  }

  if (queue.length === 0 || !currentSubmission) {
    return (
      <div className="h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-[#111827] border border-[#1F2937] p-10 rounded-3xl max-w-md shadow-2xl space-y-4">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto text-2xl">
            🎉
          </div>
          <h2 className="text-xl font-black text-white">All Submissions Reviewed!</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            There are no more pending student submissions waiting for evaluation in the global queue.
          </p>
          <button
            onClick={() => navigate('/teacher/pending-reviews')}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl text-xs shadow-lg transition-all"
          >
            Return to Pending Reviews Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0B0F19] text-zinc-100 flex flex-col font-sans">
      
      {/* TOPBAR (FIXED 100vh DESKTOP SHELL) */}
      <header className="shrink-0 bg-[#111827] border-b border-[#1F2937] px-4 py-2 flex flex-wrap items-center justify-between gap-2 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/teacher/pending-reviews')}
            className="p-2 bg-[#1F2937] hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors shrink-0"
            title="Back to Pending Queue"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-extrabold text-white truncate">{currentSubmission.taskTitle}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono">
                Queue [{activeQueueIdx + 1} / {queue.length}]
              </span>
            </div>
            <p className="text-xs text-zinc-400 truncate">
              Student: <strong className="text-white">{currentSubmission.studentName}</strong> ({currentSubmission.groupName})
            </p>
          </div>
        </div>

        {/* Global Queue Selector Pill Stack */}
        <div className="flex items-center gap-1.5 bg-[#161E2E] px-2.5 py-1 rounded-2xl border border-[#1F2937] overflow-x-auto max-w-sm sm:max-w-md">
          {queue.map((item, idx) => (
            <button
              key={item.submissionId}
              onClick={() => handleSelectQueueItem(idx)}
              className={`px-2 py-0.5 rounded-lg text-2xs font-mono font-bold whitespace-nowrap transition-all ${
                idx === activeQueueIdx
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-[#111827] text-zinc-400 hover:text-white border border-[#1F2937]'
              }`}
            >
              #{idx + 1} {item.studentName.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleSelectQueueItem(activeQueueIdx - 1)}
            disabled={activeQueueIdx === 0}
            className="p-1.5 bg-[#1F2937] hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 rounded-xl transition-colors"
            title="Previous (Ctrl + ←)"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleSelectQueueItem(activeQueueIdx + 1)}
            disabled={activeQueueIdx === queue.length - 1}
            className="p-1.5 bg-[#1F2937] hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 rounded-xl transition-colors"
            title="Next (Ctrl + →)"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* TOOLBAR BAR (FIXED) */}
      <div className="shrink-0 bg-[#161E2E] border-b border-[#1F2937] px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveAndNext}
            disabled={saving}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-violet-600 hover:from-amber-400 hover:to-violet-500 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save & Next (Ctrl+S)
          </button>

          <button
            onClick={executeSaveReview}
            disabled={saving}
            className="px-3 py-1.5 bg-[#1F2937] hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl border border-[#374151] transition-colors"
          >
            Save Grade
          </button>

          <button
            onClick={handleResetReviewForm}
            className="p-1.5 bg-[#1F2937] hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl border border-[#374151] transition-colors"
            title="Reset Form Input"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Presets Inline */}
        <div className="hidden sm:flex items-center gap-1">
          <span className="text-[10px] text-zinc-500 font-bold mr-1">Presets [1-5]:</span>
          {gradePresets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handleApplyGradePreset(preset.value)}
              className={`px-2 py-0.5 rounded-lg text-2xs font-mono font-bold transition-all ${
                gradeInput === preset.value
                  ? 'bg-amber-500 text-black'
                  : 'bg-[#111827] text-zinc-400 hover:text-white border border-[#1F2937]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT (EXACT 65% / 35% SPLIT FILLING REMAINING HEIGHT) */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        
        {/* LEFT: MONACO EDITOR (65% WIDTH, NO PAGE SCROLL, SCROLLS INTERNALLY ONLY) */}
        <div className="w-full md:w-[65%] flex flex-col bg-[#111827] border-r border-[#1F2937] min-h-0 overflow-hidden">
          <div className="bg-[#1A2234] border-b border-[#1F2937] px-4 py-1.5 flex items-center justify-between shrink-0 text-xs font-bold text-white">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-blue-400" />
              <span>Student Submission (Attempt #{currentSubmission.attemptNumber})</span>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono">
              Submitted: {new Date(currentSubmission.submittedAt).toLocaleString()}
            </div>
          </div>

          <div className="flex-1 min-h-0 relative">
            <Editor
              height="100%"
              language={(currentSubmission.language || 'cpp').toLowerCase() === 'c++' ? 'cpp' : (currentSubmission.language || 'cpp').toLowerCase()}
              value={currentSubmission.code || ''}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        {/* RIGHT: TABBED EVALUATION PANEL (35% WIDTH, INTERNAL SCROLL ONLY) */}
        <div className="w-full md:w-[35%] bg-[#111827] flex flex-col shrink-0 border-l border-[#1F2937] min-h-0 overflow-hidden">
          
          {/* TAB HEADER BAR */}
          <div className="bg-[#161E2E] border-b border-[#1F2937] px-2 py-1.5 flex items-center justify-around shrink-0 text-xs">
            <button
              onClick={() => setActiveTab('feedback')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'feedback' ? 'bg-amber-500 text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Feedback</span>
            </button>
            <button
              onClick={() => setActiveTab('task')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'task' ? 'bg-amber-500 text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Task</span>
            </button>
            <button
              onClick={() => setActiveTab('attempts')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'attempts' ? 'bg-amber-500 text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Attempts</span>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'stats' ? 'bg-amber-500 text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Stats</span>
            </button>
          </div>

          {/* TAB CONTENT (INTERNALLY SCROLLABLE ONLY) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === 'feedback' && (
              <>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Evaluation & Grade
                  </h3>
                  <p className="text-[11px] text-zinc-400">Assign grade score and feedback comments.</p>
                </div>

                {/* Score Input */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                    Grade Score (Max {maxGrade} pts)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      ref={gradeInputRef}
                      type="number"
                      min={0}
                      max={maxGrade}
                      value={gradeInput}
                      onChange={(e) => setGradeInput(Number(e.target.value))}
                      className="w-full bg-[#0B0F19] border border-[#1F2937] text-white font-mono text-base font-black rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-xs font-bold text-zinc-500 font-mono shrink-0">/ {maxGrade}</span>
                  </div>
                </div>

                {/* Quick Comment Preset Buttons */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Quick Comments</span>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {ARABIC_FEEDBACK_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.title}
                        type="button"
                        onClick={() => handleSelectFeedbackTemplate(tmpl)}
                        className="px-2.5 py-1 rounded-xl bg-[#161E2E] hover:bg-zinc-800 border border-[#1F2937] text-zinc-200 text-xs font-medium transition-all flex items-center gap-1.5"
                      >
                        <span>{tmpl.emoji}</span>
                        <span>{tmpl.title}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feedback Textarea */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                    Teacher Feedback Comments
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Write feedback comments..."
                    value={teacherFeedback}
                    onChange={(e) => setTeacherFeedback(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-[#1F2937] text-white text-xs rounded-xl p-3 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </>
            )}

            {activeTab === 'task' && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Task Description</h3>
                <div className="bg-[#161E2E] border border-[#1F2937] p-3.5 rounded-2xl text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {currentSubmission.description || 'No description provided for this task.'}
                </div>
              </div>
            )}

            {activeTab === 'attempts' && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Attempt History</h3>
                <div className="bg-[#161E2E] border border-[#1F2937] p-4 rounded-2xl text-xs text-zinc-300 space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Active Attempt:</span>
                    <span className="font-mono font-bold text-amber-400">Attempt #{currentSubmission.attemptNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Submitted At:</span>
                    <span className="font-mono text-zinc-400">{new Date(currentSubmission.submittedAt).toLocaleString()}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 pt-2 border-t border-[#1F2937]">
                    Older historical attempts remain preserved in database as read-only.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Submission Statistics</h3>
                <div className="bg-[#161E2E] border border-[#1F2937] p-4 rounded-2xl text-xs text-zinc-300 space-y-3">
                  <div className="flex justify-between">
                    <span>Queue Length:</span>
                    <span className="font-mono font-bold text-white">{queue.length} Submissions</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Position:</span>
                    <span className="font-mono font-bold text-amber-400">#{activeQueueIdx + 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Task Score:</span>
                    <span className="font-mono font-bold text-purple-400">{maxGrade} pts</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
