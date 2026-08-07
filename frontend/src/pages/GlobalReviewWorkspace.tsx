import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Editor from '@monaco-editor/react';
import {
  AlertCircle, ArrowLeft, ArrowRight, Save, Loader2, Code, Sparkles,
  RotateCcw, FileText
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

  // Form inputs & feedback state (presetFeedback vs manualFeedback)
  const [gradeInput, setGradeInput] = useState<number>(0);
  const [selectedPresetTitle, setSelectedPresetTitle] = useState<string | null>(null);
  const [presetFeedback, setPresetFeedback] = useState<string>('');
  const [manualFeedback, setManualFeedback] = useState<string>('');
  const gradeInputRef = useRef<HTMLInputElement>(null);

  const currentSubmission = queue[activeQueueIdx] || null;
  const maxGrade = currentSubmission?.maxGrade || 10;

  // Derived full feedback text displayed in textarea and sent to API
  const teacherFeedback = React.useMemo(() => {
    if (presetFeedback && manualFeedback) {
      return `${presetFeedback}\n${manualFeedback}`;
    }
    return presetFeedback || manualFeedback;
  }, [presetFeedback, manualFeedback]);

  // Grade percentage presets (100%, 75%, 50%, 25%, 0%)
  const gradePresets = React.useMemo(() => {
    return [
      { label: '100%', value: maxGrade, keyboard: '5' },
      { label: '75%', value: Math.round(maxGrade * 0.75 * 10) / 10, keyboard: '4' },
      { label: '50%', value: Math.round(maxGrade * 0.5 * 10) / 10, keyboard: '3' },
      { label: '25%', value: Math.round(maxGrade * 0.25 * 10) / 10, keyboard: '2' },
      { label: '0%', value: 0, keyboard: '1' },
    ];
  }, [maxGrade]);

  const handleApplyGradePreset = (val: number) => {
    setGradeInput(val);
    toast.success(`Set Grade: ${val}/${maxGrade}`);
  };

  const handleSelectFeedbackTemplate = (template: FeedbackTemplate) => {
    // If clicking the currently selected active preset, ignore
    if (selectedPresetTitle === template.title) {
      return;
    }

    // Mutually exclusive replace of preset feedback while preserving manual notes
    setSelectedPresetTitle(template.title);
    setPresetFeedback(template.text);

    // Apply suggested grade score based on template ratio
    const suggestedGrade = Math.round(maxGrade * template.ratio * 10) / 10;
    setGradeInput(suggestedGrade);
    toast.success(`Preset Applied: ${template.title} (${suggestedGrade}/${maxGrade})`);
  };

  const handleTextareaChange = (value: string) => {
    // When editing textarea manually, preserve preset prefix if present
    if (presetFeedback && value.startsWith(presetFeedback)) {
      let suffix = value.slice(presetFeedback.length);
      if (suffix.startsWith('\n')) {
        suffix = suffix.slice(1);
      }
      setManualFeedback(suffix);
    } else {
      // If teacher edited or deleted the preset prefix, clear active preset selection
      setSelectedPresetTitle(null);
      setPresetFeedback('');
      setManualFeedback(value);
    }
  };

  const handleResetReviewForm = () => {
    setGradeInput(currentSubmission?.grade ?? maxGrade);
    setSelectedPresetTitle(null);
    setPresetFeedback('');
    setManualFeedback(currentSubmission?.teacherFeedback ?? '');
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
      setSelectedPresetTitle(null);
      setPresetFeedback('');
      setManualFeedback(item.teacherFeedback || '');

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

  const remainingCount = queue.length;

  return (
    <div className="h-full w-full overflow-hidden bg-[#0B0F19] text-zinc-100 flex flex-col font-sans">
      
      {/* 1. TOP HEADER (Student Name, Task Name, Attempt, Queue Position, Remaining Reviews) */}
      <header className="shrink-0 bg-[#111827] border-b border-[#1F2937] px-4 py-2.5 flex items-center justify-between gap-3 z-30">
        
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/teacher/pending-reviews')}
            className="p-2 bg-[#1F2937] hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors shrink-0"
            title="Back to Pending Queue"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-base font-extrabold text-white truncate">{currentSubmission.studentName}</h1>
              <span className="text-xs text-zinc-400 font-mono shrink-0">({currentSubmission.studentRegisterId})</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 border border-blue-500/30 text-blue-400 font-mono shrink-0">
                {currentSubmission.groupName}
              </span>
            </div>
            <p className="text-xs text-zinc-400 flex items-center gap-2 truncate">
              Task: <strong className="text-zinc-200 truncate">{currentSubmission.taskTitle}</strong>
            </p>
          </div>
        </div>

        {/* Queue Metadata Pill Badges (Attempt X, Position, Remaining) */}
        <div className="hidden sm:flex items-center gap-2.5 bg-[#161E2E] px-3 py-1.5 rounded-2xl border border-[#1F2937] text-xs font-mono font-bold shrink-0">
          <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
            Attempt #{currentSubmission.attemptNumber}
          </span>
          <span className="text-zinc-500">•</span>
          <span className="text-purple-400">
            Queue: #{activeQueueIdx + 1} / {queue.length}
          </span>
          <span className="text-zinc-500">•</span>
          <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
            {remainingCount} Remaining
          </span>
        </div>

        {/* Prev / Next Nav Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleSelectQueueItem(activeQueueIdx - 1)}
            disabled={activeQueueIdx === 0}
            className="px-3 py-1.5 bg-[#1F2937] hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
            title="Previous (Ctrl + ←)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <button
            onClick={() => handleSelectQueueItem(activeQueueIdx + 1)}
            disabled={activeQueueIdx === queue.length - 1}
            className="px-3 py-1.5 bg-[#1F2937] hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
            title="Next (Ctrl + →)"
          >
            <span>Next</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. FIXED ACTION TOOLBAR (Save, Save & Next, Reset Review, Quick Presets) */}
      <div className="shrink-0 bg-[#161E2E] border-b border-[#1F2937] px-4 py-2 flex items-center justify-between gap-3 text-xs z-20">
        
        {/* Left Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSaveAndNext}
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-violet-600 hover:from-amber-400 hover:to-violet-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-amber-950/30 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save & Next (Ctrl+S) ➔
          </button>

          <button
            onClick={executeSaveReview}
            disabled={saving}
            className="px-3.5 py-2 bg-[#1F2937] hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl border border-[#374151] transition-colors"
          >
            Save Grade
          </button>

          <button
            onClick={handleResetReviewForm}
            className="px-3 py-2 bg-[#1F2937] hover:bg-zinc-700 text-zinc-400 hover:text-white font-semibold text-xs rounded-xl border border-[#374151] transition-colors flex items-center gap-1.5"
            title="Reset Form Input"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Review</span>
          </button>
        </div>

        {/* Right Quick Presets Bar (100%, 75%, 50%, 25%, 0%) */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1">Quick Presets:</span>
          {gradePresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleApplyGradePreset(preset.value)}
              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                gradeInput === preset.value
                  ? 'bg-amber-500 text-black shadow-md border border-amber-400'
                  : 'bg-[#111827] text-zinc-300 hover:text-white border border-[#1F2937] hover:border-zinc-500'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. MAIN WORKSPACE (FLEX-1 MONACO / FIXED 390PX RIGHT PANEL) */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 min-w-0 overflow-hidden">
        
        {/* LEFT: MONACO EDITOR (FLEX-1 AUTO CONSUME REMAINING WIDTH, NO PAGE OVERFLOW) */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#111827] border-r border-[#1F2937] min-h-0 overflow-hidden">
          <div className="bg-[#1A2234] border-b border-[#1F2937] px-4 py-2 flex items-center justify-between shrink-0 text-xs font-bold text-white">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-blue-400" />
              <span>Student Submitted Code ({currentSubmission.language.toUpperCase()})</span>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono">
              Submitted: {new Date(currentSubmission.submittedAt).toLocaleString()}
            </div>
          </div>

          <div className="flex-1 min-h-0 min-w-0 relative">
            <Editor
              height="100%"
              width="100%"
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

        {/* RIGHT: EVALUATION PANEL (FIXED WIDTH 390PX, INTERNAL SCROLL ONLY) */}
        <div className="w-full md:w-[390px] lg:w-[410px] shrink-0 bg-[#111827] flex flex-col p-4 space-y-4 border-l border-[#1F2937] overflow-y-auto">
          
          {/* Grade Score Section */}
          <div className="space-y-1.5 bg-[#161E2E] p-3.5 rounded-2xl border border-[#1F2937]">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
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
                className="w-full bg-[#0B0F19] border border-[#1F2937] text-white font-mono text-lg font-black rounded-xl px-3.5 py-2 focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs font-bold text-zinc-500 font-mono shrink-0">/ {maxGrade}</span>
            </div>
          </div>

          {/* Quick Feedback Presets */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
              <span>Quick Comments Template</span>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ARABIC_FEEDBACK_TEMPLATES.map((tmpl) => {
                const isActive = selectedPresetTitle === tmpl.title;
                return (
                  <button
                    key={tmpl.title}
                    type="button"
                    onClick={() => handleSelectFeedbackTemplate(tmpl)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border ${
                      isActive
                        ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-md'
                        : 'bg-[#161E2E] hover:bg-zinc-800 border-[#1F2937] text-zinc-200'
                    }`}
                  >
                    <span>{tmpl.emoji}</span>
                    <span>{tmpl.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback Comments Textarea */}
          <div className="space-y-1.5 flex-1 flex flex-col min-h-[110px]">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Teacher Feedback Comments
            </label>
            <textarea
              rows={4}
              placeholder="Write feedback comments for the student..."
              value={teacherFeedback}
              onChange={(e) => handleTextareaChange(e.target.value)}
              className="w-full flex-1 bg-[#0B0F19] border border-[#1F2937] text-white text-xs rounded-xl p-3 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Task Description Panel */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              Task Description
            </label>
            <div className="bg-[#161E2E] border border-[#1F2937] p-3 rounded-xl text-xs text-zinc-300 max-h-36 overflow-y-auto leading-relaxed whitespace-pre-wrap">
              {currentSubmission.description || 'No task description available.'}
            </div>
          </div>

          {/* Attempt History & Metadata */}
          <div className="space-y-1.5 bg-[#161E2E] p-3 rounded-xl border border-[#1F2937] text-xs text-zinc-300">
            <div className="flex justify-between items-center font-bold">
              <span>Attempt Information:</span>
              <span className="text-amber-400 font-mono">Attempt #{currentSubmission.attemptNumber}</span>
            </div>
            <div className="text-[11px] text-zinc-400 flex justify-between">
              <span>Group: {currentSubmission.groupName}</span>
              <span>Deadline: {currentSubmission.deadline ? new Date(currentSubmission.deadline).toLocaleDateString() : 'None'}</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
