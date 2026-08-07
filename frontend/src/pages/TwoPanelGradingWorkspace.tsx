import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { RichTextViewer } from '../components/RichTextEditor';
import {
  Code, ArrowLeft, Save, ChevronLeft, ChevronRight, Copy,
  FileText, Download, AlertCircle, Eye, Loader2,
  BookOpen, FileCode, X, Pin, Search, Printer, Link as LinkIcon,
  ChevronDown, ChevronUp, Terminal, Star
} from 'lucide-react';

interface PublicTestCase {
  input: string;
  expectedOutput: string;
}

interface TaskAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
}

interface StudentSubmissionItem {
  submissionId: string | null;
  studentId: string;
  studentRegisterId: string;
  studentName: string;
  studentAvatarUrl?: string | null;
  courseName: string;
  status: string;
  grade: number | null;
  attempts: number;
  submissionTime?: string | null;
  executionTime?: number | null;
  similarityScore?: number | null;
  submittedCode?: string | null;
  teacherFeedback?: string | null;
  teacherNotes?: string | null;
  consoleOutput?: string | null;
  expectedOutput?: string | null;
  reviewLater?: boolean;
}

interface TaskBundleData {
  taskId: string;
  taskTitle: string;
  description: string;
  exampleInput: string;
  exampleOutput: string;
  publicTestCasesJson: string;
  hiddenTestCaseCount: number;
  deadline: string;
  maxGrade: number;
  mode: string;
  gradingStrategy: string;
  evaluationMode: string;
  language: string;
  attachmentsJson: string;
  sessionName: string;
  courseName: string;
  courseId: string;
  submissions: StudentSubmissionItem[];
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
  { emoji: '📋', title: 'لم يحقق جميع المتطلبات', text: 'لم يتم تنفيذ جميع متطلبات السؤال.', ratio: 0.50 },
];

export const TwoPanelGradingWorkspace: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState<TaskBundleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Screen Width Detection
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Active student index
  const [activeStudentIdx, setActiveStudentIdx] = useState<number>(0);

  // Form states for active grading
  const [gradeInput, setGradeInput] = useState<number>(0);
  const [teacherFeedback, setTeacherFeedback] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [reviewLaterSet, setReviewLaterSet] = useState<{ [subId: string]: boolean }>({});

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<any>(null);

  // Ref for auto-focus on grade input
  const gradeInputRef = useRef<HTMLInputElement>(null);
  const mobileGradeInputRef = useRef<HTMLInputElement>(null);

  // Left Panel Task Collapse State (Desktop)
  const [isTaskCollapsed, setIsTaskCollapsed] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(42);
  const isResizing = useRef(false);

  // Original Task Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerPinned, setIsDrawerPinned] = useState(false);
  const [drawerSearchQuery, setDrawerSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    metadata: true,
    description: true,
    examples: true,
    attachments: true,
    publicCases: true,
  });

  const drawerScrollRef = useRef<HTMLDivElement>(null);
  const savedDrawerScrollPos = useRef<number>(0);

  const fetchData = async (targetSubmissionId?: string, previousIndex?: number) => {
    if (!user || !taskId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/dashboard/teacher/task/${taskId}/submissions?pageSize=200`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error('Failed to load grading workspace bundle');
      const resData: TaskBundleData = await res.json();
      setData(resData);

      if (resData.submissions && resData.submissions.length > 0) {
        let selectedIdx = 0;

        if (targetSubmissionId) {
          const matchIdx = resData.submissions.findIndex(s => s.submissionId === targetSubmissionId);
          if (matchIdx !== -1) {
            selectedIdx = matchIdx;
          } else if (previousIndex !== undefined) {
            // Target item was removed (graded). Open item that now occupies previousIndex, or last item
            selectedIdx = Math.min(previousIndex, resData.submissions.length - 1);
          }
        } else {
          const firstSubmittedIndex = resData.submissions.findIndex(s => s.submissionId !== null);
          selectedIdx = firstSubmittedIndex !== -1 ? firstSubmittedIndex : 0;
        }

        setActiveStudentIdx(selectedIdx);
        populateGradingForm(resData.submissions[selectedIdx], resData.maxGrade);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load task bundle');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [taskId, user]);

  // ESC key listener for Drawer close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen && !isDrawerPinned) {
        handleCloseDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, isDrawerPinned]);

  const populateGradingForm = (subItem: StudentSubmissionItem, defaultMaxGrade: number) => {
    if (subItem) {
      const initialGrade = subItem.grade !== null && subItem.grade !== undefined ? subItem.grade : defaultMaxGrade;
      setGradeInput(initialGrade);
      setTeacherFeedback(subItem.teacherFeedback || '');

      // Auto-focus grade input
      setTimeout(() => {
        if (window.innerWidth >= 768 && gradeInputRef.current) {
          gradeInputRef.current.focus();
          gradeInputRef.current.select();
        } else if (window.innerWidth < 768 && mobileGradeInputRef.current) {
          mobileGradeInputRef.current.focus();
          mobileGradeInputRef.current.select();
        }
      }, 100);
    }
  };

  const handleSelectStudent = (idx: number) => {
    if (!data || idx < 0 || idx >= data.submissions.length) return;
    setActiveStudentIdx(idx);
    populateGradingForm(data.submissions[idx], data.maxGrade);
  };

  const currentStudent = data?.submissions[activeStudentIdx] || null;
  const hasPreviousStudent = activeStudentIdx > 0;
  const hasNextStudent = data ? activeStudentIdx < data.submissions.length - 1 : false;

  // Auto Save Feedback Drafts every 2 seconds while typing
  useEffect(() => {
    if (!currentStudent || !currentStudent.submissionId) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      // Save feedback draft silently locally
      if (teacherFeedback !== (currentStudent.teacherFeedback || '')) {
        const updatedSubs = [...(data?.submissions || [])];
        if (updatedSubs[activeStudentIdx]) {
          updatedSubs[activeStudentIdx].teacherFeedback = teacherFeedback;
          setData(prev => (prev ? { ...prev, submissions: updatedSubs } : prev));
        }
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [teacherFeedback, activeStudentIdx]);

  // Keyboard Shortcuts Handler:
  // 1 = 0%, 2 = 25%, 3 = 50%, 4 = 75%, 5 = 100%
  // Ctrl + S -> Save Grade
  // Ctrl + RightArrow -> Next Student
  // Ctrl + LeftArrow -> Previous Student
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Avoid triggering preset 1-5 shortcuts when user is typing inside text input/textarea
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isEditingText = targetTag === 'input' || targetTag === 'textarea';

      if (!isEditingText && data?.maxGrade !== undefined) {
        const max = data.maxGrade;
        if (e.key === '1') {
          e.preventDefault();
          handleApplyGradePreset(0);
          return;
        } else if (e.key === '2') {
          e.preventDefault();
          handleApplyGradePreset(Math.round(max * 0.25 * 10) / 10);
          return;
        } else if (e.key === '3') {
          e.preventDefault();
          handleApplyGradePreset(Math.round(max * 0.5 * 10) / 10);
          return;
        } else if (e.key === '4') {
          e.preventDefault();
          handleApplyGradePreset(Math.round(max * 0.75 * 10) / 10);
          return;
        } else if (e.key === '5') {
          e.preventDefault();
          handleApplyGradePreset(max);
          return;
        }
      }

      if (e.ctrlKey && (e.key === 's' || e.key === 'S' || e.key === 'س')) {
        e.preventDefault();
        handleSaveGradeOnly();
      } else if (e.ctrlKey && e.key === 'ArrowRight') {
        e.preventDefault();
        if (hasNextStudent) {
          handleSelectStudent(activeStudentIdx + 1);
        }
      } else if (e.ctrlKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        if (hasPreviousStudent) {
          handleSelectStudent(activeStudentIdx - 1);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [activeStudentIdx, data, gradeInput, teacherFeedback, saving, hasNextStudent, hasPreviousStudent]);

  // Drawer open/close handlers
  const handleOpenDrawer = () => {
    setIsDrawerOpen(true);
    setTimeout(() => {
      if (drawerScrollRef.current) {
        drawerScrollRef.current.scrollTop = savedDrawerScrollPos.current;
      }
    }, 50);
  };

  const handleCloseDrawer = () => {
    if (drawerScrollRef.current) {
      savedDrawerScrollPos.current = drawerScrollRef.current.scrollTop;
    }
    if (!isDrawerPinned) {
      setIsDrawerOpen(false);
    }
  };

  // Preset Buttons Calculation (0%, 25%, 50%, 75%, 100%)
  const gradePresets = React.useMemo(() => {
    if (!data?.maxGrade) return [];
    const max = data.maxGrade;
    return [
      { label: '0%', value: 0, keyboard: '1' },
      { label: '25%', value: Math.round(max * 0.25 * 10) / 10, keyboard: '2' },
      { label: '50%', value: Math.round(max * 0.5 * 10) / 10, keyboard: '3' },
      { label: '75%', value: Math.round(max * 0.75 * 10) / 10, keyboard: '4' },
      { label: '100%', value: max, keyboard: '5' },
    ];
  }, [data?.maxGrade]);

  // Handle preset click
  const handleApplyGradePreset = (val: number) => {
    setGradeInput(val);
    toast.success(`تم تحديد الدرجة: ${val}`);
  };

  // Quick Feedback Preset click with Smart Grade Suggestion
  const handleSelectFeedbackTemplate = (template: FeedbackTemplate) => {
    setTeacherFeedback((prev) => (prev ? `${prev}\n- ${template.text}` : template.text));
    if (data?.maxGrade !== undefined) {
      const suggestedGrade = Math.round(data.maxGrade * template.ratio * 10) / 10;
      setGradeInput(suggestedGrade);
      toast.success(`تم إضافة التقييم وتحديد الدرجة المقترحة: ${suggestedGrade}/${data.maxGrade}`);
    } else {
      toast.success(`تم إضافة التقييم: ${template.title}`);
    }
  };

  // Toggle Review Later (⭐)
  const handleToggleReviewLater = () => {
    if (!currentStudent?.studentId) return;
    const key = currentStudent.submissionId || currentStudent.studentId;
    const isMarked = !!reviewLaterSet[key];
    setReviewLaterSet(prev => ({ ...prev, [key]: !isMarked }));
    if (!isMarked) {
      toast.success('تم تحديد هذا التسليم للمراجعة لاحقاً ⭐');
    } else {
      toast.info('تم إزالة علامة المراجعة لاحقاً');
    }
  };

  // Core Save Action Function
  const executeSaveSubmission = async (): Promise<boolean> => {
    if (!currentStudent || !currentStudent.submissionId || !data) {
      toast.error('لا يوجد تسليم صالح للتصحيح.');
      return false;
    }

    if (gradeInput < 0 || gradeInput > data.maxGrade) {
      toast.error(`الدرجة يجب أن تكون بين 0 و ${data.maxGrade}.`);
      return false;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/submissions/${currentStudent.submissionId}/review`, {
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

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'فشل حفظ الدرجة');
      }

      toast.success(`تم حفظ الدرجة بنجاح (${gradeInput}/${data.maxGrade})`);

      // Update local state instantly
      const updatedSubs = [...data.submissions];
      updatedSubs[activeStudentIdx] = {
        ...currentStudent,
        grade: gradeInput,
        teacherFeedback: teacherFeedback,
        status: 'Graded',
      };
      setData({ ...data, submissions: updatedSubs });
      return true;
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء حفظ الدرجة');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Save Only
  const handleSaveGradeOnly = async () => {
    await executeSaveSubmission();
  };

  // Reset Review (إعادة تعيين التقييم)
  const handleResetReview = async () => {
    if (!currentStudent || !currentStudent.submissionId || !data) return;
    if (!window.confirm('هل أنت تأكد من إعادة تعيين هذا التقييم وإعادته لقائمة المراجعات المعلقة؟')) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/submissions/${currentStudent.submissionId}/reset-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'فشل إعادة تعيين التقييم');
      }

      toast.success('تم إعادة تعيين التقييم وإعادته للمراجعات المعلقة.');
      setGradeInput(0);
      setTeacherFeedback('');

      const updatedSubs = [...data.submissions];
      updatedSubs[activeStudentIdx] = {
        ...currentStudent,
        grade: 0,
        teacherFeedback: '',
        status: 'Pending',
      };
      setData({ ...data, submissions: updatedSubs });
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء إعادة تعيين التقييم');
    } finally {
      setSaving(false);
    }
  };

  // Save & Next (💾 Canvas LMS / Moodle Auto-Advance Workflow)
  const handleSaveAndNext = async () => {
    const currentSubId = currentStudent?.submissionId || undefined;
    const currentIdx = activeStudentIdx;

    const success = await executeSaveSubmission();
    if (success) {
      // Re-fetch backend data and pass previous ID and index to auto-advance to next submission
      await fetchData(currentSubId, currentIdx);
      toast.success('تم الانتقال للتسليم التالي في القائمة تلقائياً!');
    }
  };

  // Bonus Actions inside Drawer
  const handleCopyTaskDescription = () => {
    if (data?.description) {
      navigator.clipboard.writeText(data.description);
      toast.success('تم نسخ وصف المهمة!');
    }
  };

  const handleCopyTaskLink = () => {
    const taskUrl = `${window.location.origin}/task/${taskId}`;
    navigator.clipboard.writeText(taskUrl);
    toast.success('تم نسخ رابط المهمة!');
  };

  const handlePrintTask = () => {
    window.print();
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Status Badge Component Generator (Arabic)
  const renderStatusBadge = (statusStr: string) => {
    const s = statusStr.toLowerCase();
    if (s.includes('graded')) {
      return <span className="px-2.5 py-0.5 rounded-xl text-[11px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">🟢 مكتمل</span>;
    }
    if (s.includes('runtime')) {
      return <span className="px-2.5 py-0.5 rounded-xl text-[11px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400">🔴 خطأ أثناء التشغيل</span>;
    }
    if (s.includes('compile') || s.includes('syntax')) {
      return <span className="px-2.5 py-0.5 rounded-xl text-[11px] font-bold bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B]">🟡 خطأ في الترجمة</span>;
    }
    if (s.includes('wrong')) {
      return <span className="px-2.5 py-0.5 rounded-xl text-[11px] font-bold bg-red-500/15 border border-red-500/30 text-red-400">❌ إجابة غير صحيحة</span>;
    }
    if (s.includes('pending') || s.includes('manual')) {
      return <span className="px-2.5 py-0.5 rounded-xl text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">🟡 قيد المراجعة</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-xl text-[11px] font-bold bg-zinc-500/15 border border-zinc-500/30 text-zinc-300">⚪ {statusStr}</span>;
  };

  // Parse public test cases & attachments
  const publicTestCases: PublicTestCase[] = React.useMemo(() => {
    if (!data?.publicTestCasesJson) return [];
    try {
      return JSON.parse(data.publicTestCasesJson);
    } catch (e) {
      return [];
    }
  }, [data?.publicTestCasesJson]);

  const attachments: TaskAttachment[] = React.useMemo(() => {
    if (!data?.attachmentsJson) return [];
    try {
      return JSON.parse(data.attachmentsJson);
    } catch (e) {
      return [];
    }
  }, [data?.attachmentsJson]);

  // Streamlined Progress Summary (Reviewed, Remaining, Average Grade)
  const progressStats = React.useMemo(() => {
    if (!data || !data.submissions) return { total: 0, graded: 0, pending: 0, avgGrade: 0 };
    const total = data.submissions.length;
    const graded = data.submissions.filter(s => s.status === 'Graded').length;
    const pending = total - graded;

    const gradedList = data.submissions.filter(s => s.grade !== null && s.grade !== undefined);
    const sumGrade = gradedList.reduce((acc, curr) => acc + (curr.grade || 0), 0);
    const avgGrade = gradedList.length > 0 ? Math.round((sumGrade / gradedList.length) * 10) / 10 : 0;

    return { total, graded, pending, avgGrade };
  }, [data?.submissions]);

  // Resizable panel divider (Desktop)
  const startResizing = () => {
    isResizing.current = true;
    const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = (mouseMoveEvent.clientX / window.innerWidth) * 100;
      if (newWidth > 20 && newWidth < 80) {
        setLeftPanelWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      isResizing.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center text-zinc-400 p-6 dir-rtl" dir="rtl">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-sm font-medium">جاري تحميل مساحة التصحيح...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4 dir-rtl" dir="rtl">
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
          <h2 className="text-lg font-bold">حدث خطأ أثناء تحميل البيانات</h2>
          <p className="text-xs mt-1">{error || 'لم يتم العثور على المهمة'}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            العودة للقائمة
          </button>
        </div>
      </div>
    );
  }

  const currentSubKey = currentStudent ? (currentStudent.submissionId || currentStudent.studentId) : '';
  const isMarkedLater = !!reviewLaterSet[currentSubKey];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-zinc-100 flex flex-col font-sans overflow-x-hidden dir-rtl" dir="rtl">
      
      {/* HEADER WITH PROGRESS SUMMARY & NAVIGATION */}
      <header className="sticky top-0 z-40 bg-[#111827]/95 backdrop-blur-md border-b border-[#1F2937] px-4 py-2.5 shadow-xl flex flex-wrap items-center justify-between gap-3">
        
        {/* Task Title & Nav Back */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-[#1F2937] hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors shrink-0"
            title="العودة"
          >
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-extrabold text-white truncate">{data.taskTitle}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 border border-blue-500/30 text-blue-400 font-mono">
                {data.language.toUpperCase()}
              </span>
            </div>
            {currentStudent && (
              <p className="text-xs text-zinc-400 flex items-center gap-2 truncate">
                الطالب: <strong className="text-zinc-200">{currentStudent.studentName}</strong>
                <span className="text-zinc-500 font-mono">({currentStudent.studentRegisterId})</span>
              </p>
            )}
          </div>
        </div>

        {/* Progress Summary Only: Reviewed, Remaining, Average Grade */}
        <div className="flex items-center gap-4 bg-[#161E2E] px-3.5 py-1.5 rounded-2xl border border-[#1F2937] shrink-0 text-xs">
          <div className="flex items-center gap-3 text-[11px]">
            <div>
              <span className="text-[10px] text-zinc-500 block">تم التصحيح</span>
              <span className="font-bold text-emerald-400 font-mono">{progressStats.graded}</span>
            </div>
            <div className="w-px h-6 bg-[#1F2937]" />
            <div>
              <span className="text-[10px] text-zinc-500 block">المتبقي</span>
              <span className="font-bold text-amber-400 font-mono">{progressStats.pending}</span>
            </div>
            <div className="w-px h-6 bg-[#1F2937]" />
            <div>
              <span className="text-[10px] text-zinc-500 block">متوسط الدرجات</span>
              <span className="font-bold text-purple-300 font-mono">{progressStats.avgGrade} / {data.maxGrade}</span>
            </div>
          </div>
        </div>

        {/* Action Controls: View Original Task Drawer, Star, Next/Prev */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Review Later ⭐ Button */}
          <button
            onClick={handleToggleReviewLater}
            className={`p-2 rounded-xl border text-xs flex items-center gap-1 transition-all ${
              isMarkedLater
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-md'
                : 'bg-[#1F2937] border-[#374151] text-zinc-400 hover:text-white'
            }`}
            title={isMarkedLater ? 'تم التحديد للمراجعة لاحقاً' : 'مراجعة لاحقاً ⭐'}
          >
            <Star className={`w-4 h-4 ${isMarkedLater ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span className="hidden md:inline text-xs">{isMarkedLater ? 'مراقب' : 'مراجعة لاحقاً'}</span>
          </button>

          {/* 📄 Open Original Task Button */}
          <button
            onClick={handleOpenDrawer}
            className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md"
            title="عرض نص السؤال المكتمل"
          >
            <FileCode className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">عرض نص السؤال</span>
          </button>

          {/* Submission Navigation Buttons */}
          <div className="flex items-center gap-1 bg-[#1F2937]/70 p-1 rounded-xl border border-[#374151]">
            <button
              onClick={() => handleSelectStudent(activeStudentIdx - 1)}
              disabled={!hasPreviousStudent}
              className="p-1.5 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 rounded-lg transition-colors flex items-center gap-1 text-xs"
              title="الطالب السابق (Ctrl + Left)"
            >
              <ChevronRight className="w-4 h-4" />
              <span className="hidden md:inline">السابق</span>
            </button>

            <span className="text-[11px] text-zinc-400 font-mono px-1.5">
              {activeStudentIdx + 1} / {data.submissions.length}
            </span>

            <button
              onClick={() => handleSelectStudent(activeStudentIdx + 1)}
              disabled={!hasNextStudent}
              className="p-1.5 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 rounded-lg transition-colors flex items-center gap-1 text-xs"
              title="الطالب التالي (Ctrl + Right)"
            >
              <span className="hidden md:inline">التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

        </div>

      </header>

      {/* ================================================================================= */}
      {/* BRANCH 1: MOBILE DEDICATED LAYOUT (< 768px Screens)                              */}
      {/* ================================================================================= */}
      {isMobile ? (
        <div className="flex-1 flex flex-col p-3 space-y-4 overflow-y-auto pb-24">
          
          {/* 1. MOBILE CARD: Student Info, Task Info, Status, Current Grade */}
          <div className="bg-[#161E2E] border border-[#1F2937] rounded-2xl p-4 space-y-3 shadow-lg">
            
            {/* Student Info & Status */}
            <div className="flex items-center justify-between gap-2 border-b border-[#1F2937] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center border border-blue-400/30 overflow-hidden shrink-0 shadow-md">
                  {currentStudent?.studentAvatarUrl ? (
                    <img src={currentStudent.studentAvatarUrl} alt={currentStudent.studentName} className="w-full h-full object-cover" />
                  ) : (
                    (currentStudent?.studentName || 'ST').substring(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">
                    {currentStudent?.studentName || '-'}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">الرقم: {currentStudent?.studentRegisterId || '-'}</p>
                </div>
              </div>

              <div>
                {currentStudent ? renderStatusBadge(currentStudent.status) : null}
              </div>
            </div>

            {/* Task Info & Grade Meta */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">المهمة</span>
                <span className="font-bold text-zinc-200 truncate block">{data.taskTitle}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">الدرجة الحالية</span>
                <span className="font-extrabold text-amber-400 text-sm block">
                  {currentStudent?.grade !== null && currentStudent?.grade !== undefined ? currentStudent.grade : gradeInput} / {data.maxGrade}
                </span>
              </div>
            </div>

            {/* Student Switcher Horizontal Scroll Pills */}
            <div className="pt-2 border-t border-[#1F2937]/80">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                {data.submissions.map((sub, idx) => {
                  const isActive = idx === activeStudentIdx;
                  const isGraded = sub.status === 'Graded';
                  const hasSub = sub.submissionId !== null;

                  return (
                    <button
                      key={sub.studentId}
                      onClick={() => handleSelectStudent(idx)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md border border-blue-400/40'
                          : 'bg-[#111827] text-zinc-400 hover:text-white border border-[#1F2937]'
                      }`}
                    >
                      <span>{sub.studentName}</span>
                      {isGraded ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      ) : hasSub ? (
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-zinc-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* 2. MOBILE CODE VIEWER (Dedicated 65vh Height, Full Width, Responsive Monaco Editor) */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl overflow-hidden shadow-xl flex flex-col" style={{ height: '65vh' }}>
            <div className="bg-[#1A2234] border-b border-[#1F2937] px-4 py-2.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Code className="w-4 h-4 text-blue-400" />
                <span>الكود البرمجي المقدم ({data.language})</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono bg-[#0B0F19] px-2 py-0.5 rounded-md border border-[#374151]">
                Read-Only
              </span>
            </div>

            <div className="flex-1 relative overflow-hidden w-full">
              {currentStudent?.submittedCode ? (
                <Editor
                  height="100%"
                  width="100%"
                  language={data.language.toLowerCase() === 'c++' ? 'cpp' : data.language.toLowerCase()}
                  value={currentStudent.submittedCode}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    wordWrap: 'on',
                    folding: false,
                    lineDecorationsWidth: 0,
                    lineNumbersMinChars: 3,
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs p-6">
                  <AlertCircle className="w-8 h-8 mb-2 text-zinc-600" />
                  <p>لم يقم الطالب برفع كود برمجي.</p>
                </div>
              )}
            </div>
          </div>

          {/* Standard Console Output Box (if present) */}
          {currentStudent?.consoleOutput && (
            <div className="bg-[#0D111A] border border-[#1F2937] rounded-2xl p-3 space-y-1 font-mono text-xs">
              <div className="text-blue-400 font-bold flex items-center gap-1.5 text-xs mb-1">
                <Terminal className="w-3.5 h-3.5" />
                <span>مخرجات التنفيذ Standard Output</span>
              </div>
              <pre className="text-blue-300 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                {currentStudent.consoleOutput}
              </pre>
            </div>
          )}

          {/* 3. MOBILE GRADING & FEEDBACK FORM */}
          {currentStudent && currentStudent.submissionId && (
            <div className="bg-[#161E2E] border border-[#1F2937] rounded-2xl p-4 space-y-4 shadow-xl">
              
              {/* Manual Grade Entry Box */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300 block">الدرجة المستحقة:</label>
                <div className="flex items-center gap-2 bg-[#0B0F19] border border-[#374151] rounded-xl px-3 py-2 focus-within:border-amber-400">
                  <input
                    ref={mobileGradeInputRef}
                    type="number"
                    min={0}
                    max={data.maxGrade}
                    step={0.5}
                    value={gradeInput}
                    onChange={(e) => setGradeInput(Number(e.target.value))}
                    className="w-full bg-transparent font-extrabold text-amber-400 text-lg text-center focus:outline-none"
                  />
                  <span className="text-xs text-zinc-400 font-bold shrink-0">/ {data.maxGrade}</span>
                </div>
              </div>

              {/* Quick Grade Buttons (0%, 25%, 50%, 75%, 100%) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 block">أزرار الدرجة السريعة:</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {gradePresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyGradePreset(preset.value)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center ${
                        gradeInput === preset.value
                          ? 'bg-amber-500 text-black border-amber-400 font-extrabold shadow-md scale-105'
                          : 'bg-[#111827] text-zinc-200 border-[#374151]'
                      }`}
                    >
                      <span>{preset.label}</span>
                      <span className="text-[10px] opacity-75 font-mono">({preset.value})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Textbox */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300 block">ملاحظات وتقييم الاستاذ:</label>
                <textarea
                  rows={3}
                  value={teacherFeedback}
                  onChange={(e) => setTeacherFeedback(e.target.value)}
                  placeholder="اكتب أي ملاحظات إضافية للطالب هنا..."
                  className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-xl p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Quick Feedback Templates */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 block">قوالب التقييم السريع:</label>
                <div className="flex flex-wrap gap-1.5">
                  {ARABIC_FEEDBACK_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectFeedbackTemplate(tmpl)}
                      className="px-2.5 py-1.5 bg-[#111827] hover:bg-blue-600/30 border border-[#374151] rounded-xl text-xs text-zinc-200 font-semibold transition-all flex items-center gap-1"
                    >
                      <span>{tmpl.emoji}</span>
                      <span>{tmpl.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Save Action Buttons: Large Primary "Save & Next", Small Secondary "Save Only" */}
              <div className="space-y-2 pt-2 border-t border-[#1F2937]">
                <button
                  onClick={handleSaveAndNext}
                  disabled={saving}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-xl shadow-lg border border-emerald-400/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  <span>💾 حفظ والانتقال للطالب التالي</span>
                </button>

                <button
                  onClick={handleSaveGradeOnly}
                  disabled={saving}
                  className="w-full py-2 bg-[#111827] hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl border border-[#374151] transition-all disabled:opacity-50"
                >
                  حفظ فقط
                </button>
              </div>

            </div>
          )}

        </div>
      ) : (

        /* ================================================================================= */
        /* BRANCH 2: DESKTOP TWO-COLUMN WORKSPACE (>= 768px Screens)                         */
        /* ================================================================================= */
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

          {/* LEFT PANEL (Task Information) */}
          <div
            style={{ width: `${leftPanelWidth}%` }}
            className="flex-1 md:flex-initial flex flex-col border-b md:border-b-0 md:border-l border-[#1F2937] bg-[#111827]/70 overflow-hidden"
          >
            <div className="px-4 py-2.5 border-b border-[#1F2937] bg-[#1A2234] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                <BookOpen className="w-4 h-4" />
                تفاصيل المهمة والسؤال
              </div>
              <button
                onClick={() => setIsTaskCollapsed(!isTaskCollapsed)}
                className="text-[11px] text-zinc-400 hover:text-white px-2 py-1 bg-[#111827] rounded-lg border border-[#374151]"
              >
                {isTaskCollapsed ? 'توسيع' : 'طي'}
              </button>
            </div>

            {!isTaskCollapsed && (
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                
                <div className="bg-[#161E2E] border border-[#1F2937] p-4 rounded-2xl space-y-2">
                  <h2 className="text-base font-bold text-white tracking-tight">{data.taskTitle}</h2>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-lg font-semibold">
                      الدرجة القصوى: {data.maxGrade} نقطة
                    </span>
                    <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-lg font-semibold">
                      المادة: {data.courseName}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">الوصف والتعليمات</h3>
                  <div className="bg-[#161E2E] border border-[#1F2937] p-4 rounded-2xl text-zinc-300 text-xs">
                    <RichTextViewer content={data.description || 'لا يوجد وصف مدخل لهذه المهمة.'} />
                  </div>
                </div>

                {(data.exampleInput || data.exampleOutput) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.exampleInput && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-zinc-400">مثال الإدخال</h4>
                        <pre className="bg-[#0B0F19] border border-[#1F2937] p-3 rounded-xl font-mono text-xs text-blue-300 overflow-x-auto">
                          {data.exampleInput}
                        </pre>
                      </div>
                    )}
                    {data.exampleOutput && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-zinc-400">مثال المخرجات</h4>
                        <pre className="bg-[#0B0F19] border border-[#1F2937] p-3 rounded-xl font-mono text-xs text-emerald-300 overflow-x-auto">
                          {data.exampleOutput}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {attachments.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      المرفقات ({attachments.length})
                    </h3>
                    <div className="space-y-2">
                      {attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-[#161E2E] border border-[#1F2937] hover:border-blue-500/50 rounded-xl text-xs text-zinc-200 transition-all group"
                        >
                          <div className="flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                            <span className="font-semibold">{att.fileName}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">({Math.round(att.fileSize / 1024)} KB)</span>
                          </div>
                          <Download className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {publicTestCases.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      حالات الاختبار العامة ({publicTestCases.length})
                    </h3>
                    <div className="space-y-2">
                      {publicTestCases.map((tc, i) => (
                        <div key={i} className="bg-[#161E2E] border border-[#1F2937] p-3 rounded-xl space-y-2 text-xs">
                          <div className="text-amber-400 font-bold text-[11px]">حالة اختبار العامة #{i + 1}</div>
                          <div className="grid grid-cols-2 gap-2 font-mono">
                            <div>
                              <span className="text-[10px] text-zinc-500 block">الإدخال:</span>
                              <div className="bg-[#0B0F19] p-2 rounded-lg text-zinc-300">{tc.input || '(فارغ)'}</div>
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 block">المخرجات المتوقعة:</span>
                              <div className="bg-[#0B0F19] p-2 rounded-lg text-emerald-400">{tc.expectedOutput || '(فارغ)'}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Resizable Divider */}
          <div
            onMouseDown={startResizing}
            className="hidden md:block w-1.5 hover:w-2 bg-[#1F2937] hover:bg-blue-500 cursor-col-resize transition-all z-20 shrink-0"
            title="سحب لضبط سعة الشاشة"
          />

          {/* RIGHT PANEL (Code & Desktop Grading Form) */}
          <div className="flex-1 flex flex-col bg-[#0B0F19] overflow-hidden">
            
            {/* Student Switcher Pills Header */}
            <div className="bg-[#161E2E] border-b border-[#1F2937] px-4 py-2 flex items-center justify-between overflow-x-auto shrink-0 gap-2">
              <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full">
                {data.submissions.map((sub, idx) => {
                  const isActive = idx === activeStudentIdx;
                  const isGraded = sub.status === 'Graded';
                  const hasSub = sub.submissionId !== null;

                  return (
                    <button
                      key={sub.studentId}
                      onClick={() => handleSelectStudent(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-2 transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40'
                          : 'bg-[#111827] text-zinc-400 hover:text-white border border-[#1F2937]'
                      }`}
                    >
                      <span>{sub.studentName}</span>
                      {isGraded ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      ) : hasSub ? (
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-zinc-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Student Info Bar */}
            {currentStudent && (
              <div className="bg-[#111827] border-b border-[#1F2937] px-5 py-3 flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center border border-blue-400/30 overflow-hidden shrink-0 shadow-lg">
                    {currentStudent.studentAvatarUrl ? (
                      <img src={currentStudent.studentAvatarUrl} alt={currentStudent.studentName} className="w-full h-full object-cover" />
                    ) : (
                      currentStudent.studentName.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-xs flex items-center gap-2">
                      {currentStudent.studentName}
                      {renderStatusBadge(currentStudent.status)}
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono">الرقم الجامعي / الهوية: {currentStudent.studentRegisterId}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    Attempt #{currentStudent.attempts || 1} (CURRENT SUBMISSION)
                  </span>
                  {currentStudent.submissionTime && (
                    <span className="text-[11px] text-zinc-400">
                      Submitted: {new Date(currentStudent.submissionTime).toLocaleDateString()} {new Date(currentStudent.submissionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* CODE EDITOR (Desktop Read-Only) */}
            <div className="flex-1 flex flex-col bg-[#111827] overflow-hidden relative">
              <div className="bg-[#1A2234] border-b border-[#1F2937] px-4 py-2 flex items-center justify-between shrink-0 text-xs font-bold text-white">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-blue-400" />
                  الكود البرمجي المقدم من الطالب (للقراءة فقط)
                </div>
                <div className="text-[11px] text-zinc-400 font-mono">
                  {data.language}
                </div>
              </div>

              <div className="flex-1 relative overflow-hidden">
                {currentStudent?.submittedCode ? (
                  <Editor
                    height="100%"
                    language={data.language.toLowerCase() === 'c++' ? 'cpp' : data.language.toLowerCase()}
                    value={currentStudent.submittedCode}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: 'on',
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs p-6">
                    <AlertCircle className="w-8 h-8 mb-2 text-zinc-600" />
                    <p>لم يقم الطالب برفع أي كود برمجى لهذا التسليم.</p>
                  </div>
                )}
              </div>
            </div>

            {/* CONSOLE OUTPUT BOX */}
            {currentStudent && currentStudent.consoleOutput && (
              <div className="h-28 bg-[#0D111A] border-t border-[#1F2937] flex flex-col shrink-0">
                <div className="bg-[#161E2E] px-4 py-1.5 border-b border-[#1F2937] text-xs font-bold text-blue-400 flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>مخرجات التنفيذ (Standard Output)</span>
                </div>
                <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-blue-300 leading-relaxed whitespace-pre-wrap">
                  {currentStudent.consoleOutput}
                </div>
              </div>
            )}

            {/* DESKTOP GRADING WORKSPACE & PRESETS PANEL */}
            {currentStudent && currentStudent.submissionId && (
              <div className="bg-[#161E2E] border-t border-[#1F2937] p-4 shrink-0 space-y-4 shadow-2xl">
                
                {/* 1. SMART GRADE PRESETS */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">اختيار سريع للدرجة (Presets):</label>
                  <div className="grid grid-cols-5 gap-2">
                    {gradePresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyGradePreset(preset.value)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center gap-0.5 ${
                          gradeInput === preset.value
                            ? 'bg-amber-500 text-black border-amber-400 font-extrabold shadow-lg shadow-amber-500/20 scale-105'
                            : 'bg-[#111827] hover:bg-amber-500/10 text-zinc-200 border-[#374151] hover:border-amber-500/50'
                        }`}
                      >
                        <span className="text-xs">{preset.label}</span>
                        <span className="text-[10px] opacity-75 font-mono">({preset.value}) [{preset.keyboard}]</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. QUICK FEEDBACK TEMPLATES */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">قوالب التقييم السريع (Feedback Presets):</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ARABIC_FEEDBACK_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectFeedbackTemplate(tmpl)}
                        className="px-2.5 py-1.5 bg-[#111827] hover:bg-blue-600/30 hover:border-blue-500/50 border border-[#374151] rounded-xl text-xs text-zinc-200 font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                        title={`درجة مقترحة: ${Math.round((data.maxGrade || 0) * tmpl.ratio * 10) / 10}`}
                      >
                        <span>{tmpl.emoji}</span>
                        <span>{tmpl.title}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. MANUAL GRADE ENTRY & FEEDBACK TEXTBOX */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  
                  {/* Grade Input */}
                  <div className="md:col-span-1 space-y-1">
                    <label className="text-xs font-bold text-zinc-300 block">الدرجة المستحقة:</label>
                    <div className="flex items-center gap-2 bg-[#0B0F19] border border-[#374151] rounded-xl px-3 py-1.5 focus-within:border-amber-400">
                      <input
                        ref={gradeInputRef}
                        type="number"
                        min={0}
                        max={data.maxGrade}
                        step={0.5}
                        value={gradeInput}
                        onChange={(e) => setGradeInput(Number(e.target.value))}
                        className="w-full bg-transparent font-extrabold text-amber-400 text-base text-center focus:outline-none"
                      />
                      <span className="text-xs text-zinc-400 font-bold shrink-0">/ {data.maxGrade}</span>
                    </div>
                  </div>

                  {/* Feedback Textbox */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-xs font-bold text-zinc-300 block">ملاحظات وتقييم الاستاذ (التقييم):</label>
                    <textarea
                      rows={2}
                      value={teacherFeedback}
                      onChange={(e) => setTeacherFeedback(e.target.value)}
                      placeholder="اكتب أي ملاحظات إضافية للطالب هنا..."
                      className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-xl p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                </div>

                {/* Save Buttons Row */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1F2937]">
                  <button
                    onClick={handleResetReview}
                    disabled={saving}
                    className="px-4 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 font-bold text-xs rounded-xl border border-rose-500/30 transition-all disabled:opacity-50"
                  >
                    🔄 إعادة تعيين التقييم
                  </button>

                  <button
                    onClick={handleSaveGradeOnly}
                    disabled={saving}
                    className="px-4 py-2.5 bg-[#111827] hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl border border-[#374151] transition-all disabled:opacity-50"
                  >
                    حفظ فقط
                  </button>

                  <button
                    onClick={handleSaveAndNext}
                    disabled={saving}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg border border-emerald-400/40 flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>💾 حفظ والانتقال للطالب التالي</span>
                  </button>
                </div>

              </div>
            )}

          </div>

        </div>
      )}

      {/* ========================== ORIGINAL TASK SLIDE-OUT DRAWER ========================== */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-start dir-rtl" dir="rtl">
          
          {/* Backdrop */}
          <div
            onClick={handleCloseDrawer}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Container */}
          <div
            className={`relative z-10 w-full sm:w-[90vw] md:w-[45vw] lg:w-[42vw] h-full bg-[#111827] border-r border-[#1F2937] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
              isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {/* Drawer Header */}
            <div className="px-6 py-4 bg-[#1A2234] border-b border-[#1F2937] flex flex-col gap-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileCode className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-base font-extrabold text-white">تفاصيل السؤال الكاملة</h2>
                </div>

                {/* Header Action Tools */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsDrawerPinned(!isDrawerPinned)}
                    className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-all ${
                      isDrawerPinned
                        ? 'bg-indigo-600 text-white border-indigo-400'
                        : 'bg-[#111827] text-zinc-400 hover:text-white border-[#374151]'
                    }`}
                    title={isDrawerPinned ? 'النافذة مثبتة' : 'تثبيت النافذة'}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleCopyTaskDescription}
                    className="p-2 bg-[#111827] hover:bg-zinc-800 text-zinc-300 border border-[#374151] rounded-xl text-xs transition-colors"
                    title="نسخ الوصف"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleCopyTaskLink}
                    className="p-2 bg-[#111827] hover:bg-zinc-800 text-zinc-300 border border-[#374151] rounded-xl text-xs transition-colors"
                    title="نسخ الرابط"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handlePrintTask}
                    className="p-2 bg-[#111827] hover:bg-zinc-800 text-zinc-300 border border-[#374151] rounded-xl text-xs transition-colors"
                    title="طباعة"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleCloseDrawer}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl transition-colors"
                    title="إغلاق (ESC)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* In-Drawer Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="بحث داخل تفاصيل المهمة..."
                  value={drawerSearchQuery}
                  onChange={(e) => setDrawerSearchQuery(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#374151] rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Drawer Body */}
            <div ref={drawerScrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Section 1: Metadata */}
              <div className="bg-[#161E2E] border border-[#1F2937] rounded-2xl overflow-hidden shadow-lg">
                <button
                  onClick={() => toggleSection('metadata')}
                  className="w-full px-4 py-3 bg-[#1A2234] flex items-center justify-between text-xs font-bold text-white border-b border-[#1F2937]"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    نظرة عامة وإعدادات
                  </span>
                  {expandedSections.metadata ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {expandedSections.metadata && (
                  <div className="p-4 space-y-3 text-xs">
                    <h3 className="text-base font-extrabold text-white">{data.taskTitle}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">المادة</span>
                        <span className="font-semibold text-zinc-200">{data.courseName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">الجلسة</span>
                        <span className="font-semibold text-zinc-200">{data.sessionName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">اللغة</span>
                        <span className="font-mono text-blue-400 font-bold">{data.language}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">الدرجة القصوى</span>
                        <span className="font-extrabold text-amber-400">{data.maxGrade} نقطة</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Full Description */}
              <div className="bg-[#161E2E] border border-[#1F2937] rounded-2xl overflow-hidden shadow-lg">
                <button
                  onClick={() => toggleSection('description')}
                  className="w-full px-4 py-3 bg-[#1A2234] flex items-center justify-between text-xs font-bold text-white border-b border-[#1F2937]"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    وصف السؤال والتعليمات
                  </span>
                  {expandedSections.description ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {expandedSections.description && (
                  <div className="p-4 text-xs text-zinc-300 leading-relaxed">
                    <RichTextViewer content={data.description || 'لا توجد تعليمات تفصيلية.'} />
                  </div>
                )}
              </div>

              {/* Section 3: Example Input / Output */}
              {(data.exampleInput || data.exampleOutput) && (
                <div className="bg-[#161E2E] border border-[#1F2937] rounded-2xl overflow-hidden shadow-lg">
                  <button
                    onClick={() => toggleSection('examples')}
                    className="w-full px-4 py-3 bg-[#1A2234] flex items-center justify-between text-xs font-bold text-white border-b border-[#1F2937]"
                  >
                    <span className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-emerald-400" />
                      مثال الإدخال والمخرجات
                    </span>
                    {expandedSections.examples ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {expandedSections.examples && (
                    <div className="p-4 grid grid-cols-1 gap-3">
                      {data.exampleInput && (
                        <div>
                          <span className="text-[10px] text-zinc-400 font-bold block mb-1">مثال الإدخال:</span>
                          <pre className="bg-[#0B0F19] border border-[#1F2937] p-3 rounded-xl font-mono text-xs text-blue-300 overflow-x-auto">
                            {data.exampleInput}
                          </pre>
                        </div>
                      )}
                      {data.exampleOutput && (
                        <div>
                          <span className="text-[10px] text-zinc-400 font-bold block mb-1">مثال المخرجات:</span>
                          <pre className="bg-[#0B0F19] border border-[#1F2937] p-3 rounded-xl font-mono text-xs text-emerald-300 overflow-x-auto">
                            {data.exampleOutput}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Section 4: Public Test Cases */}
              {publicTestCases.length > 0 && (
                <div className="bg-[#161E2E] border border-[#1F2937] rounded-2xl overflow-hidden shadow-lg">
                  <button
                    onClick={() => toggleSection('publicCases')}
                    className="w-full px-4 py-3 bg-[#1A2234] flex items-center justify-between text-xs font-bold text-white border-b border-[#1F2937]"
                  >
                    <span className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-amber-400" />
                      حالات الاختبار العامة ({publicTestCases.length})
                    </span>
                    {expandedSections.publicCases ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {expandedSections.publicCases && (
                    <div className="p-4 space-y-3">
                      {publicTestCases.map((tc, i) => (
                        <div key={i} className="bg-[#0B0F19] border border-[#1F2937] p-3 rounded-xl space-y-2 text-xs">
                          <div className="text-amber-400 font-bold text-[11px]">حالة اختبار العامة #{i + 1}</div>
                          <div className="grid grid-cols-2 gap-2 font-mono">
                            <div>
                              <span className="text-[10px] text-zinc-500 block">الإدخال:</span>
                              <div className="bg-[#111827] p-2 rounded-lg text-zinc-300">{tc.input || '(فارغ)'}</div>
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 block">المخرجات المتوقعة:</span>
                              <div className="bg-[#111827] p-2 rounded-lg text-emerald-400">{tc.expectedOutput || '(فارغ)'}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
};
