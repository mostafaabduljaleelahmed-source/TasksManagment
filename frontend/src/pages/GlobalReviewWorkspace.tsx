import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTranslation } from '../utils/i18n';
import Editor from '@monaco-editor/react';
import {
  Save, ArrowRight, ArrowLeft, CheckCircle2, Code, AlertTriangle
} from 'lucide-react';

interface PendingSubmissionQueueItem {
  submissionId: string;
  studentId: string;
  studentName: string;
  studentRegisterId?: string;
  studentAvatarUrl?: string | null;
  taskId: string;
  taskTitle: string;
  language?: string;
  description?: string;
  maxGrade: number;
  deadline?: string;
  groupName: string;
  submittedAt: string;
  attemptNumber: number;
  code: string;
}

export const GlobalReviewWorkspace: React.FC = () => {
  const { submissionId } = useParams<{ submissionId?: string }>();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const { lang, isRtl } = useTranslation();
  const navigate = useNavigate();

  const [queue, setQueue] = useState<PendingSubmissionQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [gradeInput, setGradeInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const FEEDBACK_PRESETS = [
    { id: 'p1', label: lang === 'ar' ? 'ممتاز - كود نظيف وهيكل سليم' : 'Excellent - Clean code structure', gradePct: 1.0 },
    { id: 'p2', label: lang === 'ar' ? 'جيد جداً - يحتاج تحسين بسيط في التنسيق' : 'Very Good - Needs minor formatting', gradePct: 0.85 },
    { id: 'p3', label: lang === 'ar' ? 'مقبول - منطق الحل صحيح ولكن كفاءة الكود منخفضة' : 'Acceptable - Low efficiency', gradePct: 0.70 },
    { id: 'p4', label: lang === 'ar' ? 'ضعيف - لا يحقق المخرجات المطلوبة' : 'Unsatisfactory - Output incorrect', gradePct: 0.40 }
  ];

  useEffect(() => {
    fetchReviewQueue();
  }, [user]);

  const fetchReviewQueue = async () => {
    if (!user || !user.token) return;
    setLoading(true);
    setFetchError(null);
    try {
      const response = await fetch(`${API_URL}/dashboard/teacher/pending-reviews?sortBy=newest`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (response.ok) {
        const data: PendingSubmissionQueueItem[] = await response.json();
        setQueue(data);
        if (submissionId) {
          const idx = data.findIndex(s => s.submissionId === submissionId);
          if (idx !== -1) {
            setCurrentIndex(idx);
          }
        }
      } else {
        const errText = lang === 'ar' ? 'فشل تحميل بيانات التقييم من الخادم' : 'Failed to load evaluation data from server';
        setFetchError(errText);
        toastError(errText);
      }
    } catch (err) {
      console.error('Error fetching review queue:', err);
      const connText = lang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Server connection error';
      setFetchError(connText);
      toastError(connText);
    } finally {
      setLoading(false);
    }
  };

  const currentItem = queue[currentIndex];

  useEffect(() => {
    if (currentItem) {
      setGradeInput(String(currentItem.maxGrade));
      setFeedbackInput('');
      setActivePreset(null);
    }
  }, [currentIndex, currentItem]);

  const handleApplyPreset = (preset: typeof FEEDBACK_PRESETS[0]) => {
    if (!currentItem) return;
    setActivePreset(preset.id);
    const calculatedGrade = Math.round(currentItem.maxGrade * preset.gradePct);
    setGradeInput(String(calculatedGrade));
    setFeedbackInput(preset.label);
  };

  const handleSaveGrade = async (advanceNext = false) => {
    if (!currentItem || !user || !user.token) return;
    const scoreNum = parseInt(gradeInput, 10);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > currentItem.maxGrade) {
      toastError(lang === 'ar' ? `الرجاء إدخال درجة بين 0 و ${currentItem.maxGrade}` : `Please enter grade 0-${currentItem.maxGrade}`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/submissions/${currentItem.submissionId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          grade: scoreNum,
          teacherFeedback: feedbackInput,
          teacherNotes: ''
        })
      });

      if (response.ok) {
        success(lang === 'ar' ? 'تم حفظ التقييم بنجاح' : 'Grade saved successfully');
        const nextQueue = queue.filter((_, idx) => idx !== currentIndex);
        setQueue(nextQueue);
        if (advanceNext && nextQueue.length > 0) {
          const nextIdx = currentIndex >= nextQueue.length ? 0 : currentIndex;
          setCurrentIndex(nextIdx);
        } else if (nextQueue.length === 0) {
          navigate('/teacher/pending-reviews');
        }
      } else {
        toastError(lang === 'ar' ? 'فشل حفظ التقييم' : 'Failed to save grade');
      }
    } catch (err) {
      toastError(lang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Server connection error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center text-slate-400 text-xs">
        {lang === 'ar' ? 'جاري فتح بيئة التقييم...' : 'Loading evaluation console...'}
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-12 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 mx-auto text-rose-400" />
        <h2 className="text-sm font-bold text-rose-300">{fetchError}</h2>
        <button onClick={fetchReviewQueue} className="academic-button-secondary mx-auto">
          {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
        </button>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="p-12 text-center space-y-3">
        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
        <h2 className="text-sm font-bold text-white">
          {lang === 'ar' ? 'تم الانتهاء من جميع التقييمات المعلقة' : 'Review Queue Completed'}
        </h2>
        <button onClick={() => navigate('/teacher/pending-reviews')} className="academic-button-secondary mx-auto">
          {lang === 'ar' ? 'العودة للقائمة' : 'Return to Queue'}
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col -m-3 sm:-m-6 select-none bg-[#07090E]">
      {/* Top Header Console Bar */}
      <div className="h-11 bg-[#0E121A] border-b border-[#1B2333] px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/teacher/pending-reviews')}
            className="text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1 shrink-0"
          >
            {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
            <span>{lang === 'ar' ? 'القائمة' : 'Exit Queue'}</span>
          </button>
          <div className="h-4 w-px bg-[#1B2333]" />
          <div className="min-w-0 truncate">
            <span className="text-xs font-bold text-white">{currentItem.studentName}</span>
            <span className="text-[11px] font-mono text-slate-400 ml-2">({currentItem.groupName})</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono text-slate-400">
            {currentIndex + 1} / {queue.length}
          </span>
          <button
            disabled={submitting}
            onClick={() => handleSaveGrade(false)}
            className="academic-button-secondary py-1 px-3"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'حفظ فقط' : 'Save'}</span>
          </button>
          <button
            disabled={submitting}
            onClick={() => handleSaveGrade(true)}
            className="academic-button-primary py-1 px-3"
          >
            <span>{lang === 'ar' ? 'حفظ والتالي' : 'Save & Next'}</span>
            {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main IDE Split Console View */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        {/* Left: Code Viewer Panel */}
        <div className="flex-1 min-h-0 flex flex-col border-r border-[#1B2333]">
          <div className="h-8 bg-[#0F131C] border-b border-[#1B2333] px-3 flex items-center justify-between shrink-0">
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-blue-400" />
              <span>solution.{(currentItem.language || 'cpp').toLowerCase() === 'c++' ? 'cpp' : (currentItem.language || 'cpp').toLowerCase()}</span>
            </span>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
              Attempt #{currentItem.attemptNumber}
            </span>
          </div>
          <div className="flex-1 min-h-0 relative">
            <Editor
              height="100%"
              defaultLanguage={(currentItem.language || 'cpp').toLowerCase() === 'c++' ? 'cpp' : (currentItem.language || 'cpp').toLowerCase()}
              theme="vs-dark"
              value={currentItem.code}
              options={{
                readOnly: true,
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbersMinChars: 3
              }}
            />
          </div>
        </div>

        {/* Right: Evaluation Controls Panel */}
        <div className="w-full md:w-96 bg-[#0E121A] flex flex-col shrink-0 border-t md:border-t-0 border-[#1B2333]">
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {/* Task Info Header */}
            <div className="bg-[#151B28] p-3 rounded border border-[#232F45] space-y-1">
              <h3 className="text-xs font-bold text-white truncate">{currentItem.taskTitle}</h3>
              <p className="text-[11px] text-slate-400 line-clamp-2">{currentItem.description || 'No task description.'}</p>
            </div>

            {/* Score Box */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                {lang === 'ar' ? 'الدرجة المستحقة' : 'Assigned Score'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={currentItem.maxGrade}
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value)}
                  className="academic-input font-mono text-base font-bold text-white text-center w-24"
                />
                <span className="text-sm font-mono text-slate-400">/ {currentItem.maxGrade}</span>
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-2 pt-2 border-t border-[#1B2333]">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                {lang === 'ar' ? 'قوالب الملاحظات التوجيهية' : 'Feedback Presets'}
              </label>
              <div className="space-y-1.5">
                {FEEDBACK_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset)}
                    className={`w-full text-left p-2 rounded text-xs border transition-colors ${
                      activePreset === preset.id
                        ? 'bg-blue-600/20 border-blue-500 text-blue-200 font-semibold'
                        : 'bg-[#151B28] border-[#232F45] text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Feedback */}
            <div className="space-y-1.5 pt-2 border-t border-[#1B2333]">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                {lang === 'ar' ? 'ملاحظات المدرس' : 'Teacher Notes & Feedback'}
              </label>
              <textarea
                rows={4}
                value={feedbackInput}
                onChange={(e) => {
                  setFeedbackInput(e.target.value);
                  setActivePreset(null);
                }}
                placeholder={lang === 'ar' ? 'اكتب ملاحظاتك للطالب هنا...' : 'Enter feedback notes for student...'}
                className="academic-input resize-none py-2"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
