import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { RichTextViewer } from '../components/RichTextEditor';
import {
  Code, ArrowLeft, Save, CheckCircle, ChevronLeft, ChevronRight,
  Maximize2, Minimize2, Copy, Check, FileText, Download, Lock,
  AlertCircle, Eye, Loader2, BookOpen, FileCode, X, Pin, Search,
  Printer, Link as LinkIcon, ChevronDown, ChevronUp
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

export const TwoPanelGradingWorkspace: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState<TaskBundleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active student index among submitted/enrolled students
  const [activeStudentIdx, setActiveStudentIdx] = useState<number>(0);

  // Form states for active grading
  const [gradeInput, setGradeInput] = useState<number>(0);
  const [teacherFeedback, setTeacherFeedback] = useState<string>('');
  const [teacherNotes, setTeacherNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // UI Toggles & UX controls
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreenCode, setIsFullscreenCode] = useState(false);
  const [isTaskCollapsed, setIsTaskCollapsed] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(45); // percentage for desktop split view
  const isResizing = useRef(false);

  // --- Original Task Drawer & Bonus Features State ---
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerPinned, setIsDrawerPinned] = useState(false);
  const [drawerSearchQuery, setDrawerSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<{
    metadata: boolean;
    description: boolean;
    examples: boolean;
    attachments: boolean;
    publicCases: boolean;
  }>({
    metadata: true,
    description: true,
    examples: true,
    attachments: true,
    publicCases: true,
  });

  const drawerScrollRef = useRef<HTMLDivElement>(null);
  const savedDrawerScrollPos = useRef<number>(0);

  const fetchData = async () => {
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
        // Default to first student with a submission if available
        const firstSubmittedIndex = resData.submissions.findIndex(s => s.submissionId !== null);
        const initialIdx = firstSubmittedIndex !== -1 ? firstSubmittedIndex : 0;
        setActiveStudentIdx(initialIdx);
        populateGradingForm(resData.submissions[initialIdx], resData.maxGrade);
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
      setGradeInput(subItem.grade !== null && subItem.grade !== undefined ? subItem.grade : defaultMaxGrade);
      setTeacherFeedback(subItem.teacherFeedback || '');
      setTeacherNotes(subItem.teacherNotes || '');
    }
  };

  const handleSelectStudent = (idx: number) => {
    if (!data || idx < 0 || idx >= data.submissions.length) return;
    setActiveStudentIdx(idx);
    populateGradingForm(data.submissions[idx], data.maxGrade);
  };

  const currentStudent = data?.submissions[activeStudentIdx] || null;

  // Drawer open/close handlers with scroll position retention
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

  // Bonus Actions inside Drawer
  const handleCopyTaskDescription = () => {
    if (data?.description) {
      navigator.clipboard.writeText(data.description);
      toast.success('Task description copied to clipboard!');
    }
  };

  const handleCopyTaskLink = () => {
    const taskUrl = `${window.location.origin}/task/${taskId}`;
    navigator.clipboard.writeText(taskUrl);
    toast.success('Task link copied to clipboard!');
  };

  const handlePrintTask = () => {
    window.print();
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Save Grade Handler
  const handleSaveGrade = async (approvedMaxGrade?: boolean) => {
    if (!currentStudent || !currentStudent.submissionId || !data) {
      toast.error('No valid submission to grade.');
      return;
    }

    const finalGrade = approvedMaxGrade ? data.maxGrade : gradeInput;

    if (finalGrade < 0 || finalGrade > data.maxGrade) {
      toast.error(`Grade must be between 0 and ${data.maxGrade}.`);
      return;
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
          grade: finalGrade,
          teacherFeedback: teacherFeedback,
          teacherNotes: teacherNotes,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to save grade');
      }

      toast.success(`Grade saved successfully (${finalGrade}/${data.maxGrade})!`);

      // Update local state instantly
      const updatedSubs = [...data.submissions];
      updatedSubs[activeStudentIdx] = {
        ...currentStudent,
        grade: finalGrade,
        teacherFeedback: teacherFeedback,
        teacherNotes: teacherNotes,
        status: 'Graded',
      };
      setData({ ...data, submissions: updatedSubs });
      if (approvedMaxGrade) {
        setGradeInput(finalGrade);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving grade');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (data) {
      setGradeInput(data.maxGrade);
      await handleSaveGrade(true);
    }
  };

  const handleCopyCode = () => {
    if (currentStudent?.submittedCode) {
      navigator.clipboard.writeText(currentStudent.submittedCode);
      setIsCopied(true);
      toast.success('Code copied to clipboard!');
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Helper stats calculation
  const codeStats = React.useMemo(() => {
    const codeText = currentStudent?.submittedCode || '';
    const chars = codeText.length;
    const lines = codeText ? codeText.split('\n').length : 0;

    let timeAgoStr = 'N/A';
    if (currentStudent?.submissionTime) {
      const subDate = new Date(currentStudent.submissionTime);
      const diffMs = Date.now() - subDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) timeAgoStr = `${diffDays}d ago`;
      else if (diffHours > 0) timeAgoStr = `${diffHours}h ago`;
      else if (diffMins > 0) timeAgoStr = `${diffMins}m ago`;
      else timeAgoStr = 'Just now';
    }

    return { chars, lines, timeAgoStr };
  }, [currentStudent?.submittedCode, currentStudent?.submissionTime]);

  // Parse public test cases
  const publicTestCases: PublicTestCase[] = React.useMemo(() => {
    if (!data?.publicTestCasesJson) return [];
    try {
      return JSON.parse(data.publicTestCasesJson);
    } catch (e) {
      return [];
    }
  }, [data?.publicTestCasesJson]);

  // Parse attachments
  const attachments: TaskAttachment[] = React.useMemo(() => {
    if (!data?.attachmentsJson) return [];
    try {
      return JSON.parse(data.attachmentsJson);
    } catch (e) {
      return [];
    }
  }, [data?.attachmentsJson]);

  // Resizable panel divider mouse events
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
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center text-zinc-400 p-6">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-sm font-medium">Loading Two-Panel Grading Workspace...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
          <h2 className="text-lg font-bold">Error Loading Workspace</h2>
          <p className="text-xs mt-1">{error || 'Task data not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const hasPreviousStudent = activeStudentIdx > 0;
  const hasNextStudent = activeStudentIdx < data.submissions.length - 1;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-zinc-100 flex flex-col font-sans overflow-hidden">
      
      {/* 1. STICKY HEADER */}
      <header className="sticky top-0 z-40 bg-[#111827]/95 backdrop-blur-md border-b border-[#1F2937] px-4 py-3 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Left: Task & Student Info */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-[#1F2937] hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors shrink-0"
            title="Back to Review List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-extrabold text-white truncate">{data.taskTitle}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 border border-blue-500/30 text-blue-400">
                {data.language.toUpperCase()}
              </span>
            </div>
            {currentStudent && (
              <p className="text-xs text-zinc-400 flex items-center gap-2 truncate">
                Student: <strong className="text-zinc-200">{currentStudent.studentName}</strong>
                <span className="text-zinc-500 font-mono">({currentStudent.studentRegisterId})</span>
              </p>
            )}
          </div>
        </div>

        {/* Right: Open Original Task Drawer Button, Quick Grade & Action Controls */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          
          {/* 📄 Open Original Task Button */}
          <button
            onClick={handleOpenDrawer}
            className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md"
            title="View complete task specifications in a slide-out drawer without leaving"
          >
            <FileCode className="w-4 h-4 text-indigo-400" />
            📄 Open Original Task
          </button>

          {currentStudent && (
            <>
              {/* Grade Input & Save */}
              <div className="flex items-center gap-2 bg-[#1F2937]/70 p-1.5 rounded-xl border border-[#374151]">
                <span className="text-xs text-zinc-400 pl-2 font-medium">Grade:</span>
                <input
                  type="number"
                  min={0}
                  max={data.maxGrade}
                  value={gradeInput}
                  onChange={(e) => setGradeInput(Number(e.target.value))}
                  className="w-16 bg-[#111827] border border-[#374151] rounded-lg px-2 py-1 text-center font-bold text-amber-400 text-sm focus:outline-none focus:border-amber-400"
                />
                <span className="text-xs text-zinc-500 pr-1">/ {data.maxGrade}</span>

                <button
                  onClick={() => handleSaveGrade(false)}
                  disabled={saving}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-lg flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Grade
                </button>

                <button
                  onClick={handleApprove}
                  disabled={saving}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-lg flex items-center gap-1.5 transition-all disabled:opacity-50"
                  title={`Approve full points (${data.maxGrade} pts)`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Approve ({data.maxGrade} pts)
                </button>
              </div>

              {/* Student Navigation Buttons */}
              <div className="flex items-center gap-1 bg-[#1F2937]/70 p-1.5 rounded-xl border border-[#374151]">
                <button
                  onClick={() => handleSelectStudent(activeStudentIdx - 1)}
                  disabled={!hasPreviousStudent}
                  className="p-1.5 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 rounded-lg transition-colors"
                  title="Previous Student"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] text-zinc-400 font-mono px-1">
                  {activeStudentIdx + 1}/{data.submissions.length}
                </span>
                <button
                  onClick={() => handleSelectStudent(activeStudentIdx + 1)}
                  disabled={!hasNextStudent}
                  className="p-1.5 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 rounded-lg transition-colors"
                  title="Next Student"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* 2. QUICK REFERENCE CARD */}
      <div className="bg-[#161E2E] border-b border-[#1F2937] px-6 py-3 shrink-0 shadow-inner">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Course</span>
            <span className="font-semibold text-zinc-200 truncate block">{data.courseName}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Session</span>
            <span className="font-semibold text-zinc-200 truncate block">{data.sessionName}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Language</span>
            <span className="font-mono text-blue-400 font-bold block">{data.language}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Max Grade</span>
            <span className="font-extrabold text-amber-400 block">{data.maxGrade} pts</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Evaluation Mode</span>
            <span className="font-semibold text-purple-400 block">{data.evaluationMode}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Deadline</span>
            <span className="font-medium text-zinc-300 block truncate">
              {data.deadline ? new Date(data.deadline).toLocaleDateString() : 'No limit'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Student</span>
            <span className="font-bold text-white block truncate">{currentStudent?.studentName || '-'}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Status</span>
            <span className="block font-semibold">
              {currentStudent?.status === 'Graded' ? (
                <span className="text-emerald-400">🟢 Graded</span>
              ) : currentStudent?.submissionId ? (
                <span className="text-amber-400">🟡 Pending Review</span>
              ) : (
                <span className="text-zinc-400">⚪ Not Submitted</span>
              )}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Attempt</span>
            <span className="font-mono text-zinc-300 block">#{currentStudent?.attempts || 1}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Submitted</span>
            <span className="font-medium text-zinc-300 block">{codeStats.timeAgoStr}</span>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE PANELS CONTAINER */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

        {/* ========================== LEFT PANEL (Task Information) ========================== */}
        <div
          style={{ width: window.innerWidth >= 768 ? `${leftPanelWidth}%` : '100%' }}
          className="flex-1 md:flex-initial flex flex-col border-b md:border-b-0 md:border-r border-[#1F2937] bg-[#111827]/70 overflow-hidden"
        >
          {/* Left Panel Header */}
          <div className="px-5 py-3 border-b border-[#1F2937] bg-[#1A2234] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-400">
              <BookOpen className="w-4 h-4" />
              Task Specifications & Description
            </div>
            <button
              onClick={() => setIsTaskCollapsed(!isTaskCollapsed)}
              className="text-xs text-zinc-400 hover:text-white px-2 py-1 bg-[#111827] rounded-lg border border-[#374151]"
            >
              {isTaskCollapsed ? 'Expand Task' : 'Collapse Task'}
            </button>
          </div>

          {/* Left Panel Content */}
          {!isTaskCollapsed && (
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* Task Details Header Metadata */}
              <div className="bg-[#161E2E] border border-[#1F2937] p-4 rounded-2xl space-y-3">
                <h2 className="text-lg font-bold text-white tracking-tight">{data.taskTitle}</h2>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2.5 py-1 rounded-lg font-semibold">
                    Strategy: {data.gradingStrategy}
                  </span>
                  <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg font-semibold">
                    Max: {data.maxGrade} Points
                  </span>
                  <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-lg font-semibold">
                    Mode: {data.mode}
                  </span>
                </div>
              </div>

              {/* Formatted Markdown Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Description & Instructions</h3>
                <div className="bg-[#161E2E] border border-[#1F2937] p-4 rounded-2xl text-zinc-300">
                  <RichTextViewer content={data.description || 'No description provided for this task.'} />
                </div>
              </div>

              {/* Example Input / Output */}
              {(data.exampleInput || data.exampleOutput) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.exampleInput && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-zinc-400">Example Input</h4>
                      <pre className="bg-[#0B0F19] border border-[#1F2937] p-3 rounded-xl font-mono text-xs text-blue-300 overflow-x-auto">
                        {data.exampleInput}
                      </pre>
                    </div>
                  )}
                  {data.exampleOutput && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-zinc-400">Example Output</h4>
                      <pre className="bg-[#0B0F19] border border-[#1F2937] p-3 rounded-xl font-mono text-xs text-emerald-300 overflow-x-auto">
                        {data.exampleOutput}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Downloadable Attachments */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    Task Attachments ({attachments.length})
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

              {/* Public Test Cases */}
              {publicTestCases.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    Public Test Cases ({publicTestCases.length})
                  </h3>
                  <div className="space-y-3">
                    {publicTestCases.map((tc, i) => (
                      <div key={i} className="bg-[#161E2E] border border-[#1F2937] p-3 rounded-xl space-y-2 text-xs">
                        <div className="text-amber-400 font-bold text-[11px]">Public Test Case #{i + 1}</div>
                        <div className="grid grid-cols-2 gap-2 font-mono">
                          <div>
                            <span className="text-[10px] text-zinc-500 block">Input:</span>
                            <div className="bg-[#0B0F19] p-2 rounded-lg text-zinc-300">{tc.input || '(empty)'}</div>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block">Expected Output:</span>
                            <div className="bg-[#0B0F19] p-2 rounded-lg text-emerald-400">{tc.expectedOutput || '(empty)'}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hidden Test Case Protection Card */}
              <div className="bg-violet-950/20 border border-violet-500/30 p-4 rounded-2xl flex items-center gap-3">
                <div className="p-2.5 bg-violet-500/20 rounded-xl text-violet-400 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-violet-300 flex items-center gap-2">
                    Hidden Test Cases Protected
                    <span className="bg-violet-500/30 text-violet-200 px-2 py-0.5 rounded-full text-[10px]">
                      {data.hiddenTestCaseCount} Hidden Cases
                    </span>
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Hidden test case inputs and outputs remain confidential for evaluation security.
                  </p>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Resizable Divider (Desktop) */}
        <div
          onMouseDown={startResizing}
          className="hidden md:block w-1.5 hover:w-2 bg-[#1F2937] hover:bg-blue-500 cursor-col-resize transition-all z-20 shrink-0"
          title="Drag to resize split view panels"
        />

        {/* ========================== RIGHT PANEL (Student Submission) ========================== */}
        <div className="flex-1 flex flex-col bg-[#0B0F19] overflow-hidden">
          
          {/* Right Panel Header / Student List Tabs */}
          <div className="bg-[#161E2E] border-b border-[#1F2937] px-4 py-2 flex items-center justify-between overflow-x-auto shrink-0 gap-2">
            
            {/* Student Switcher Pills */}
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

          {/* Active Student Info Header */}
          {currentStudent && (
            <div className="bg-[#111827] border-b border-[#1F2937] px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
              
              {/* Student Bio */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-sm flex items-center justify-center border border-blue-400/30 overflow-hidden shrink-0 shadow-lg">
                  {currentStudent.studentAvatarUrl ? (
                    <img src={currentStudent.studentAvatarUrl} alt={currentStudent.studentName} className="w-full h-full object-cover" />
                  ) : (
                    currentStudent.studentName.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">{currentStudent.studentName}</h3>
                  <p className="text-xs text-zinc-400 font-mono">ID: {currentStudent.studentRegisterId}</p>
                </div>
              </div>

              {/* Submission Statistics UX Bar */}
              <div className="flex items-center gap-4 text-xs bg-[#161E2E] border border-[#1F2937] px-4 py-2 rounded-2xl">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Lines of Code</span>
                  <span className="font-bold text-white font-mono">{codeStats.lines} LOC</span>
                </div>
                <div className="w-px h-6 bg-[#1F2937]" />
                <div>
                  <span className="text-[10px] text-zinc-500 block">Characters</span>
                  <span className="font-bold text-white font-mono">{codeStats.chars} chars</span>
                </div>
                <div className="w-px h-6 bg-[#1F2937]" />
                <div>
                  <span className="text-[10px] text-zinc-500 block">Submitted</span>
                  <span className="font-bold text-blue-400">{codeStats.timeAgoStr}</span>
                </div>
              </div>
            </div>
          )}

          {/* Student Submitted Code Editor Container */}
          <div className={`flex-1 flex flex-col bg-[#111827] overflow-hidden ${isFullscreenCode ? 'fixed inset-0 z-50 p-6 bg-[#0B0F19]' : ''}`}>
            
            {/* Editor Toolbar */}
            <div className="bg-[#1A2234] border-b border-[#1F2937] px-5 py-2.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Code className="w-4 h-4 text-blue-400" />
                Submitted Code (Read Only)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1 bg-[#111827] hover:bg-zinc-800 border border-[#374151] rounded-lg text-xs font-medium text-zinc-300 flex items-center gap-1.5 transition-colors"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? 'Copied' : 'Copy Code'}
                </button>
                <button
                  onClick={() => setIsFullscreenCode(!isFullscreenCode)}
                  className="p-1.5 bg-[#111827] hover:bg-zinc-800 border border-[#374151] rounded-lg text-zinc-300 transition-colors"
                  title="Toggle Fullscreen Editor"
                >
                  {isFullscreenCode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Editor Body */}
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
                  <p>No submission code submitted by this student yet.</p>
                </div>
              )}
            </div>

          </div>

          {/* Teacher Grade & Feedback Input Panel */}
          {currentStudent && currentStudent.submissionId && (
            <div className="bg-[#161E2E] border-t border-[#1F2937] p-5 shrink-0 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                
                {/* Feedback Input */}
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">Teacher Feedback for Student</label>
                  <textarea
                    rows={2}
                    value={teacherFeedback}
                    onChange={(e) => setTeacherFeedback(e.target.value)}
                    placeholder="Provide constructive feedback, comments on code quality, or recommendations..."
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Grade Entry & Actions */}
                <div className="flex flex-col justify-end space-y-2 shrink-0 sm:w-64">
                  <label className="text-xs font-bold text-zinc-300 block">Grade Assignment</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={data.maxGrade}
                      value={gradeInput}
                      onChange={(e) => setGradeInput(Number(e.target.value))}
                      className="w-24 bg-[#0B0F19] border border-[#1F2937] rounded-xl p-2.5 text-center font-bold text-amber-400 text-base focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-zinc-400 font-bold">/ {data.maxGrade}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleSaveGrade(false)}
                      disabled={saving}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Grade
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={saving}
                      className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                      title="Approve Full Points"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>

      {/* ========================== ORIGINAL TASK SLIDE-OUT DRAWER / MODAL ========================== */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          
          {/* Backdrop (Click outside to close if unpinned) */}
          <div
            onClick={handleCloseDrawer}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Container (Desktop: 42% right drawer, Mobile: Full screen bottom sheet) */}
          <div
            className={`relative z-10 w-full sm:w-[90vw] md:w-[45vw] lg:w-[42vw] h-full bg-[#111827] border-l border-[#1F2937] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
              isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Drawer Header & Tools */}
            <div className="px-6 py-4 bg-[#1A2234] border-b border-[#1F2937] flex flex-col gap-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileCode className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-base font-extrabold text-white">Original Task Specifications</h2>
                </div>

                {/* Header Action Tools */}
                <div className="flex items-center gap-2">
                  
                  {/* Pin Drawer */}
                  <button
                    onClick={() => setIsDrawerPinned(!isDrawerPinned)}
                    className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-all ${
                      isDrawerPinned
                        ? 'bg-indigo-600 text-white border-indigo-400'
                        : 'bg-[#111827] text-zinc-400 hover:text-white border-[#374151]'
                    }`}
                    title={isDrawerPinned ? 'Drawer Pinned Open' : 'Pin Drawer'}
                  >
                    <Pin className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{isDrawerPinned ? 'Pinned' : 'Pin'}</span>
                  </button>

                  {/* Copy Description */}
                  <button
                    onClick={handleCopyTaskDescription}
                    className="p-2 bg-[#111827] hover:bg-zinc-800 text-zinc-300 border border-[#374151] rounded-xl text-xs transition-colors"
                    title="Copy Task Description"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Copy Task Link */}
                  <button
                    onClick={handleCopyTaskLink}
                    className="p-2 bg-[#111827] hover:bg-zinc-800 text-zinc-300 border border-[#374151] rounded-xl text-xs transition-colors"
                    title="Copy Task Link"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                  </button>

                  {/* Print Task */}
                  <button
                    onClick={handlePrintTask}
                    className="p-2 bg-[#111827] hover:bg-zinc-800 text-zinc-300 border border-[#374151] rounded-xl text-xs transition-colors"
                    title="Print Task"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>

                  {/* Close Button */}
                  <button
                    onClick={handleCloseDrawer}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl transition-colors"
                    title="Close Drawer (ESC)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* In-Drawer Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search in task description & specs..."
                  value={drawerSearchQuery}
                  onChange={(e) => setDrawerSearchQuery(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#374151] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Drawer Body (Scrollable with state preservation) */}
            <div ref={drawerScrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Section 1: Task Header & Metadata */}
              <div className="bg-[#161E2E] border border-[#1F2937] rounded-2xl overflow-hidden shadow-lg">
                <button
                  onClick={() => toggleSection('metadata')}
                  className="w-full px-4 py-3 bg-[#1A2234] flex items-center justify-between text-xs font-bold text-white border-b border-[#1F2937]"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    Overview & Settings
                  </span>
                  {expandedSections.metadata ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {expandedSections.metadata && (
                  <div className="p-4 space-y-3">
                    <h3 className="text-base font-extrabold text-white">{data.taskTitle}</h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Course</span>
                        <span className="font-semibold text-zinc-200">{data.courseName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Session</span>
                        <span className="font-semibold text-zinc-200">{data.sessionName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Language</span>
                        <span className="font-mono text-blue-400 font-bold">{data.language}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Evaluation Mode</span>
                        <span className="font-semibold text-purple-400">{data.evaluationMode}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Max Grade</span>
                        <span className="font-extrabold text-amber-400">{data.maxGrade} pts</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Deadline</span>
                        <span className="font-medium text-zinc-300">
                          {data.deadline ? new Date(data.deadline).toLocaleString() : 'No Deadline'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Full Description & Markdown */}
              <div className="bg-[#161E2E] border border-[#1F2937] rounded-2xl overflow-hidden shadow-lg">
                <button
                  onClick={() => toggleSection('description')}
                  className="w-full px-4 py-3 bg-[#1A2234] flex items-center justify-between text-xs font-bold text-white border-b border-[#1F2937]"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Task Description & Instructions
                  </span>
                  {expandedSections.description ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {expandedSections.description && (
                  <div className="p-4 text-xs text-zinc-300 leading-relaxed">
                    <RichTextViewer content={data.description || 'No detailed instructions provided.'} />
                  </div>
                )}
              </div>

              {/* Section 3: Example Input & Output */}
              {(data.exampleInput || data.exampleOutput) && (
                <div className="bg-[#161E2E] border border-[#1F2937] rounded-2xl overflow-hidden shadow-lg">
                  <button
                    onClick={() => toggleSection('examples')}
                    className="w-full px-4 py-3 bg-[#1A2234] flex items-center justify-between text-xs font-bold text-white border-b border-[#1F2937]"
                  >
                    <span className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-emerald-400" />
                      Example Input / Output
                    </span>
                    {expandedSections.examples ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {expandedSections.examples && (
                    <div className="p-4 grid grid-cols-1 gap-3">
                      {data.exampleInput && (
                        <div>
                          <span className="text-[10px] text-zinc-400 font-bold block mb-1">Example Input:</span>
                          <pre className="bg-[#0B0F19] border border-[#1F2937] p-3 rounded-xl font-mono text-xs text-blue-300 overflow-x-auto">
                            {data.exampleInput}
                          </pre>
                        </div>
                      )}
                      {data.exampleOutput && (
                        <div>
                          <span className="text-[10px] text-zinc-400 font-bold block mb-1">Example Output:</span>
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
                      Public Test Cases ({publicTestCases.length})
                    </span>
                    {expandedSections.publicCases ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {expandedSections.publicCases && (
                    <div className="p-4 space-y-3">
                      {publicTestCases.map((tc, i) => (
                        <div key={i} className="bg-[#0B0F19] border border-[#1F2937] p-3 rounded-xl space-y-2 text-xs">
                          <div className="text-amber-400 font-bold text-[11px]">Public Test Case #{i + 1}</div>
                          <div className="grid grid-cols-2 gap-2 font-mono">
                            <div>
                              <span className="text-[10px] text-zinc-500 block">Input:</span>
                              <div className="bg-[#111827] p-2 rounded-lg text-zinc-300">{tc.input || '(empty)'}</div>
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 block">Expected Output:</span>
                              <div className="bg-[#111827] p-2 rounded-lg text-emerald-400">{tc.expectedOutput || '(empty)'}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Section 5: Downloadable Attachments */}
              {attachments.length > 0 && (
                <div className="bg-[#161E2E] border border-[#1F2937] rounded-2xl overflow-hidden shadow-lg">
                  <button
                    onClick={() => toggleSection('attachments')}
                    className="w-full px-4 py-3 bg-[#1A2234] flex items-center justify-between text-xs font-bold text-white border-b border-[#1F2937]"
                  >
                    <span className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-blue-400" />
                      Attachments ({attachments.length})
                    </span>
                    {expandedSections.attachments ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {expandedSections.attachments && (
                    <div className="p-4 space-y-2">
                      {attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-[#0B0F19] border border-[#1F2937] hover:border-blue-500/50 rounded-xl text-xs text-zinc-200 transition-all"
                        >
                          <div className="flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-blue-400" />
                            <span className="font-semibold">{att.fileName}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">({Math.round(att.fileSize / 1024)} KB)</span>
                          </div>
                          <Download className="w-3.5 h-3.5 text-zinc-400" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Section 6: Protected Hidden Test Cases Info */}
              <div className="bg-violet-950/20 border border-violet-500/30 p-4 rounded-2xl flex items-center gap-3">
                <div className="p-2.5 bg-violet-500/20 rounded-xl text-violet-400 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-violet-300 flex items-center gap-2">
                    Hidden Test Cases Protected
                    <span className="bg-violet-500/30 text-violet-200 px-2 py-0.5 rounded-full text-[10px]">
                      {data.hiddenTestCaseCount} Hidden Cases
                    </span>
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Test cases are securely held on the server for automated grading validation.
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};
