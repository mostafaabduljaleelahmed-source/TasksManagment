import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Editor from '@monaco-editor/react';
import {
  AlertCircle, ArrowLeft, ArrowRight, Save, Loader2, Code, Zap, Sparkles
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
  { emoji: '⚠️', title: 'خطأ أثناء التشغيل', text: 'الكود يتوقف أثناء التنفيذ.', ratio: 0 },
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

  // Global Keyboard Shortcuts
  // 1-5 = Grade Presets
  // Ctrl + S = Save Review
  // Ctrl + RightArrow = Next Queue Item
  // Ctrl + LeftArrow = Previous Queue Item
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

  // Execute Save Review
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
    <div className="h-screen bg-[#0B0F19] text-zinc-100 flex flex-col font-sans overflow-hidden">
      
      {/* HEADER BAR */}
      <header className="shrink-0 bg-[#111827] border-b border-[#1F2937] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-30">
        
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
              <h1 className="text-base font-extrabold text-white truncate">{currentSubmission.taskTitle}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono">
                Queue [{activeQueueIdx + 1} / {queue.length}]
              </span>
            </div>
            <p className="text-xs text-zinc-400 truncate">
              Student: <strong className="text-white">{currentSubmission.studentName}</strong> ({currentSubmission.groupName})
            </p>
          </div>
        </div>

        {/* Global Queue Pills */}
        <div className="flex items-center gap-2 bg-[#161E2E] px-3 py-1.5 rounded-2xl border border-[#1F2937] overflow-x-auto max-w-md">
          {queue.map((item, idx) => (
            <button
              key={item.submissionId}
              onClick={() => handleSelectQueueItem(idx)}
              className={`px-2.5 py-1 rounded-xl text-2xs font-mono font-bold whitespace-nowrap transition-all ${
                idx === activeQueueIdx
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-[#111827] text-zinc-400 hover:text-white border border-[#1F2937]'
              }`}
            >
              #{idx + 1} {item.studentName.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleSelectQueueItem(activeQueueIdx - 1)}
            disabled={activeQueueIdx === 0}
            className="p-2 bg-[#1F2937] hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 rounded-xl transition-colors"
            title="Previous (Ctrl + ←)"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleSelectQueueItem(activeQueueIdx + 1)}
            disabled={activeQueueIdx === queue.length - 1}
            className="p-2 bg-[#1F2937] hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 rounded-xl transition-colors"
            title="Next (Ctrl + →)"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* WORKSPACE BODY - EXACT FLEX FILL */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        
        {/* Left: Code Viewer Panel (VS Code Fill) */}
        <div className="flex-1 flex flex-col bg-[#111827] border-r border-[#1F2937] min-h-0 overflow-hidden">
          <div className="bg-[#1A2234] border-b border-[#1F2937] px-4 py-2 flex items-center justify-between shrink-0 text-xs font-bold text-white">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-blue-400" />
              Student Code Submission (Attempt #{currentSubmission.attemptNumber})
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

        {/* Right: Grading Form & Shortcuts Panel */}
        <div className="w-full md:w-96 bg-[#111827] flex flex-col p-5 space-y-4 shrink-0 border-l border-[#1F2937] overflow-y-auto">
          
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Evaluation & Shortcuts
            </h3>
            <p className="text-[11px] text-zinc-400">Keyboard: [1-5] presets, [Ctrl+S] Save & Next</p>
          </div>

          {/* Preset Grade Buttons */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Quick Grade Presets (Key 1 - 5)
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {gradePresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleApplyGradePreset(preset.value)}
                  className={`py-1.5 rounded-xl border text-xs font-mono font-bold transition-all flex flex-col items-center ${
                    gradeInput === preset.value
                      ? 'bg-amber-500 text-black border-amber-400 shadow-md'
                      : 'bg-[#161E2E] text-zinc-300 border-[#1F2937] hover:border-zinc-500'
                  }`}
                >
                  <span>{preset.label}</span>
                  <span className="text-[9px] opacity-70">[{preset.keyboard}]</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Feedback Preset Templates */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
              <span>Quick Comments Template</span>
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

          {/* Grade Score Input */}
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
                className="w-full bg-[#0B0F19] border border-[#1F2937] text-white font-mono text-base font-black rounded-xl px-3.5 py-2 focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs font-bold text-zinc-500 font-mono shrink-0">/ {maxGrade}</span>
            </div>
          </div>

          {/* Feedback Textarea */}
          <div className="space-y-1.5 flex-1 flex flex-col min-h-[100px]">
            <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
              Teacher Feedback Comments
            </label>
            <textarea
              rows={4}
              placeholder="Write feedback comments for the student..."
              value={teacherFeedback}
              onChange={(e) => setTeacherFeedback(e.target.value)}
              className="w-full flex-1 bg-[#0B0F19] border border-[#1F2937] text-white text-xs rounded-xl p-3 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Save & Auto-Advance Button */}
          <button
            onClick={handleSaveAndNext}
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-violet-600 hover:from-amber-400 hover:to-violet-500 text-white font-extrabold text-xs rounded-xl shadow-xl shadow-amber-950/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save & Next Submission (Ctrl + S) ➔
          </button>
        </div>

      </div>
    </div>
  );
};
