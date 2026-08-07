import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  Loader2, Plus, FileCode, Clock, AlertCircle,
  Award, BarChart3, Users, BookOpen, CheckCircle, AlertTriangle, FileSpreadsheet,
  Download, Eye, Search, ChevronRight, ChevronDown, Bell, RefreshCw, X, Trash2, Archive,
  Lock, Unlock
} from 'lucide-react';
import { StudentDetailsModal } from './StudentDetailsModal';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { RichTextEditor } from '../components/RichTextEditor';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface ProgrammingTask {
  id: string;
  sessionId: string;
  title: string;
  description: string;
  exampleInput: string;
  exampleOutput: string;
  deadline: string;
  maxGrade: number;
  evaluationMode?: string;
  language?: string;
  maxAttempts?: number;
  status?: string;
  grade?: number | null;
  submittedAt?: string | null;
  attemptsUsed?: number;
  remainingAttempts?: number;
  submittedCount?: number;
  missingCount?: number;
  pendingReviewsCount?: number;
}

interface Session {
  id: string;
  title: string;
  order: number;
  isUnlocked: boolean;
  tasks: ProgrammingTask[];
}

interface CourseOverviewMetrics {
  totalStudents: number;
  totalTasks: number;
  submittedToday: number;
  pendingSubmissions: number;
  lateSubmissions: number;
  averageCourseGrade: number;
  completionRate: number;
}

interface SessionOverview {
  sessionId: string;
  sessionName: string;
  numberofTasks: number;
  studentsFinished: number;
  studentsPending: number;
  averageGrade: number;
  completionPercentage: number;
}

interface TaskOverviewStats {
  totalStudents: number;
  submitted: number;
  notSubmitted: number;
  late: number;
  averageGrade: number;
  highestGrade: number;
  lowestGrade: number;
  averageAttempts: number;
  submissionRate: number;
}

interface SubmissionRow {
  submissionId: string | null;
  studentId: string;
  studentRegisterId: string;
  studentName: string;
  status: string;
  grade: number | null;
  attempts: number;
  submissionTime: string | null;
  executionTime: number | null;
  similarityScore: number | null;
}

interface NotificationItem {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const CourseDetails: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
  const [courseInfo, setCourseInfo] = useState<{ id: string; name: string; courseCode: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingSessionId, setProcessingSessionId] = useState<string | null>(null);

  const toggleSessionExpand = (sessionId: string) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [sessionId]: prev[sessionId] === undefined ? false : !prev[sessionId],
    }));
  };

  // Instructor Tabs
  const [activeTab, setActiveTab] = useState<'curriculum' | 'dashboard' | 'notifications' | 'export'>('curriculum');

  // Dashboard metrics & details
  const [dashboardMetrics, setDashboardMetrics] = useState<CourseOverviewMetrics | null>(null);
  const [sessionOverviewData, setSessionOverviewData] = useState<SessionOverview[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Task Details Modal / Tabs state
  const [selectedTask, setSelectedTask] = useState<ProgrammingTask | null>(null);
  const [taskActiveTab, setTaskActiveTab] = useState<'overview' | 'submissions'>('overview');
  const [taskStats, setTaskStats] = useState<TaskOverviewStats | null>(null);
  const [taskSubmissions, setTaskSubmissions] = useState<SubmissionRow[]>([]);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('All');
  const [taskSubmissionsPage] = useState(1);

  // Student details modal state
  const [selectedStudentForReview, setSelectedStudentForReview] = useState<{
    studentId: string;
    studentName: string;
    studentRegisterId: string;
  } | null>(null);

  // Deletion modals state
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<ProgrammingTask | null>(null);
  const [studentToRemove, setStudentToRemove] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Session / Task Creation State
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionOrder, setNewSessionOrder] = useState(0);
  const [sessionLoading, setSessionLoading] = useState(false);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskExampleInput, setTaskExampleInput] = useState('');
  const [taskExampleOutput, setTaskExampleOutput] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskMaxGrade, setTaskMaxGrade] = useState(100);
  const [taskMode, setTaskMode] = useState<'InClass' | 'Homework'>('Homework');
  const [taskMaxAttempts, setTaskMaxAttempts] = useState(3);
  const [taskRunHiddenTestCases, setTaskRunHiddenTestCases] = useState(true);
  const [taskType, setTaskType] = useState<'BasicExercise' | 'InputExercise' | 'ProgrammingChallenge'>('BasicExercise');
  const [timeLimitMs, setTimeLimitMs] = useState(3000);
  const [memoryLimitMb, setMemoryLimitMb] = useState(256);
  const [taskGradingStrategy, setTaskGradingStrategy] = useState<'Exact' | 'Educational'>('Educational');
  const [taskEvaluationMode, setTaskEvaluationMode] = useState<'ManualReview' | 'AutomaticGrading'>('ManualReview');
  const [taskLanguage, setTaskLanguage] = useState<string>('python');
  const [taskIgnoreMultipleSpaces, setTaskIgnoreMultipleSpaces] = useState(true);
  const [publicTestCases, setPublicTestCases] = useState<{ input: string; expectedOutput: string }[]>([{ input: '', expectedOutput: '' }]);
  const [hiddenTestCases, setHiddenTestCases] = useState<{ input: string; expectedOutput: string }[]>([{ input: '', expectedOutput: '' }]);
  const [taskLoading, setTaskLoading] = useState(false);

  const fetchSessions = async () => {
    if (!user || !courseId) return;
    setLoading(true);
    setError(null);
    try {
      const [res1, res2] = await Promise.all([
        fetch(`${API_URL}/sessions/course/${courseId}`, { headers: { Authorization: `Bearer ${user.token}` } }),
        fetch(`${API_URL}/courses/${courseId}`, { headers: { Authorization: `Bearer ${user.token}` } })
      ]);

      if (!res1.ok) throw new Error('Failed to load course sessions');
      const data = await res1.json();
      setSessions(data);
      const initialExp: Record<string, boolean> = {};
      data.forEach((s: Session) => { initialExp[s.id] = true; });
      setExpandedSessions(initialExp);
      if (res2.ok) {
        setCourseInfo(await res2.json());
      }

      if (data.length > 0) {
        const maxOrder = Math.max(...data.map((s: Session) => s.order));
        setNewSessionOrder(maxOrder + 1);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardMetrics = async () => {
    if (!user || !courseId) return;
    try {
      const res1 = await fetch(`${API_URL}/dashboard/teacher/course/${courseId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data1 = await res1.json();
      if (res1.ok) setDashboardMetrics(data1);

      const res2 = await fetch(`${API_URL}/dashboard/teacher/course/${courseId}/session-overview`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data2 = await res2.json();
      if (res2.ok) setSessionOverviewData(data2);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/dashboard/notifications`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      if (res.ok) setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    if (!user) return;
    try {
      await fetch(`${API_URL}/dashboard/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTaskStatsAndSubmissions = async (taskId: string) => {
    if (!user) return;
    try {
      const resStats = await fetch(`${API_URL}/dashboard/teacher/task/${taskId}/overview`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const dataStats = await resStats.json();
      if (resStats.ok) setTaskStats(dataStats);

      const resSubs = await fetch(
        `${API_URL}/dashboard/teacher/task/${taskId}/submissions?search=${taskSearch}&status=${taskStatusFilter}&page=${taskSubmissionsPage}&pageSize=10`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      const dataSubs = await resSubs.json();
      if (resSubs.ok) {
        setTaskSubmissions(dataSubs.submissions);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isTeacherOrAdmin = user?.role === 'Teacher' || user?.role === 'Admin';

  useEffect(() => {
    fetchSessions();
    if (isTeacherOrAdmin) {
      fetchDashboardMetrics();
      fetchNotifications();
    }
  }, [courseId, user]);

  useEffect(() => {
    if (selectedTask) {
      fetchTaskStatsAndSubmissions(selectedTask.id);
    }
  }, [selectedTask, taskSearch, taskStatusFilter, taskSubmissionsPage]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionTitle.trim() || !courseId) {
      toast.error('Session title is required');
      return;
    }
    setSessionLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/sessions/course/${courseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ title: newSessionTitle, order: newSessionOrder }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create session');
      setSessions((prev) => [...prev, data].sort((a, b) => a.order - b.order));
      setShowSessionModal(false);
      setNewSessionTitle('');
      setNewSessionOrder((prev) => prev + 1);
      toast.success(`Group '${data.title}' created successfully.`);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || 'Failed to create session');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleToggleSessionLock = async (sessionId: string, currentUnlocked: boolean) => {
    setProcessingSessionId(sessionId);
    try {
      const endpoint = currentUnlocked ? 'lock' : 'unlock';
      const response = await fetch(`${API_URL}/sessions/${sessionId}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `Failed to ${endpoint} session`);

      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, isUnlocked: !currentUnlocked } : s))
      );
      toast.success(currentUnlocked ? 'Session locked.' : 'Session unlocked for students.');
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || 'Failed to toggle session lock');
    } finally {
      setProcessingSessionId(null);
    }
  };

  const handleArchiveSession = async (sessionId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/archive/session/${sessionId}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error('Failed to archive session');
      toast.success('Session archived.');
      fetchSessions();
    } catch (err: any) {
      toast.error(err.message || 'Error archiving session');
    }
  };

  const handleArchiveTask = async (taskId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/archive/task/${taskId}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error('Failed to archive task');
      toast.success('Task archived.');
      fetchSessions();
    } catch (err: any) {
      toast.error(err.message || 'Error archiving task');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error('Task title is required');
      return;
    }
    if (!taskDesc.trim()) {
      toast.error('Task description is required');
      return;
    }
    if (!selectedSessionId || !user) return;
    setTaskLoading(true);

    const publicJson = JSON.stringify(publicTestCases.filter(c => c.input || c.expectedOutput));
    const hiddenJson = JSON.stringify(hiddenTestCases.filter(c => c.input || c.expectedOutput));

    try {
      const response = await fetch(`${API_URL}/tasks/session/${selectedSessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: taskDesc.trim(),
          exampleInput: taskExampleInput.trim(),
          exampleOutput: taskExampleOutput.trim(),
          publicTestCasesJson: publicJson,
          hiddenTestCasesJson: hiddenJson,
          deadline: taskDeadline ? new Date(taskDeadline).toISOString() : new Date(Date.now() + 86400000 * 7).toISOString(),
          maxGrade: taskMaxGrade,
          mode: taskMode,
          maxAttempts: taskMaxAttempts,
          runHiddenTestCases: taskRunHiddenTestCases,
          type: taskType,
          timeLimitMs,
          memoryLimitMb,
          gradingStrategy: taskGradingStrategy,
          evaluationMode: taskEvaluationMode,
          language: taskLanguage,
          ignoreMultipleSpaces: taskIgnoreMultipleSpaces
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to add task');

      toast.success(`Task '${data.title}' created successfully.`);
      fetchSessions();
      setShowTaskModal(false);
      resetTaskForm();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || 'Failed to create task');
    } finally {
      setTaskLoading(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    setDeleteLoading(true);
    try {
      const response = await fetch(`${API_URL}/sessions/${sessionToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || data?.details || 'Failed to delete session');
      }
      setSessions((prev) => prev.filter((s) => s.id !== sessionToDelete.id));
      toast.success(`Session '${sessionToDelete.title}' deleted.`);
      setSessionToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete session');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    setDeleteLoading(true);
    try {
      const response = await fetch(`${API_URL}/tasks/${taskToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || data?.details || 'Failed to delete task');
      }
      toast.success(`Task '${taskToDelete.title}' deleted.`);
      if (selectedTask?.id === taskToDelete.id) {
        setSelectedTask(null);
      }
      fetchSessions();
      setTaskToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete task');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRemoveStudent = async () => {
    if (!studentToRemove || !courseId) return;
    setDeleteLoading(true);
    try {
      const response = await fetch(`${API_URL}/courses/${courseId}/students/${studentToRemove.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || data?.details || 'Failed to remove student');
      }
      toast.success(`Student '${studentToRemove.name}' removed from course.`);
      setStudentToRemove(null);
      if (selectedTask) {
        fetchTaskStatsAndSubmissions(selectedTask.id);
      }
      fetchDashboardMetrics();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove student');
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetTaskForm = () => {
    setTaskTitle('');
    setTaskDesc('');
    setTaskExampleInput('');
    setTaskExampleOutput('');
    setTaskDeadline('');
    setTaskMaxGrade(100);
    setTaskMode('Homework');
    setTaskMaxAttempts(3);
    setTaskRunHiddenTestCases(true);
    setTaskType('BasicExercise');
    setTimeLimitMs(3000);
    setMemoryLimitMb(256);
    setTaskGradingStrategy('Educational');
    setTaskEvaluationMode('ManualReview');
    setTaskLanguage('python');
    setTaskIgnoreMultipleSpaces(true);
    setPublicTestCases([{ input: '', expectedOutput: '' }]);
    setHiddenTestCases([{ input: '', expectedOutput: '' }]);
  };

  const handleExportCSV = () => {
    window.open(`${API_URL}/dashboard/teacher/course/${courseId}/export`, '_blank');
  };

  const handleExportTaskCSV = () => {
    if (!selectedTask) return;
    const headers = ["Student Name", "Submission Status", "Grade", "Attempts", "Submission Time"];
    const rows = taskSubmissions.map(sub => [
      `"${sub.studentName.replace(/"/g, '""')}"`,
      sub.status,
      sub.grade !== null ? sub.grade : '-',
      sub.attempts,
      sub.submissionTime ? new Date(sub.submissionTime).toLocaleString() : '-'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${selectedTask.title.replace(/\s+/g, '_')}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Charts Mock / Mapped Data
  const gradeDistributionData = [
    { name: '0-49', value: 0 },
    { name: '50-69', value: 0 },
    { name: '70-89', value: 0 },
    { name: '90-100', value: 0 },
  ];

  if (sessionOverviewData.length > 0) {
    sessionOverviewData.forEach(s => {
      if (s.averageGrade < 50) gradeDistributionData[0].value += 1;
      else if (s.averageGrade < 70) gradeDistributionData[1].value += 1;
      else if (s.averageGrade < 90) gradeDistributionData[2].value += 1;
      else gradeDistributionData[3].value += 1;
    });
  }

  const completionRateData = dashboardMetrics ? [
    { name: 'Completed', value: dashboardMetrics.completionRate },
    { name: 'Pending', value: Math.max(0, 100 - dashboardMetrics.completionRate) },
  ] : [];

  const COLORS = ['#8B5CF6', '#1F1F24'];

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 relative overflow-hidden pb-12">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/5 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-[128px] pointer-events-none" />

      {/* Tab Control */}
      {isTeacherOrAdmin && (
        <div className="bg-[#121215] border-b border-[#1E1E24] px-4 sm:px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-[#16161A] border border-[#24242B] rounded-xl p-1">
            <button
              onClick={() => setActiveTab('curriculum')}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap text-center ${
                activeTab === 'curriculum' ? 'bg-violet-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Curriculum
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap text-center ${
                activeTab === 'dashboard' ? 'bg-violet-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap text-center flex items-center justify-center gap-1.5 relative ${
                activeTab === 'notifications' ? 'bg-violet-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Notifications
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap text-center ${
                activeTab === 'export' ? 'bg-violet-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Export
            </button>

            <button
              onClick={async () => {
                if (!window.confirm(`Are you sure you want to reset ALL task reviews for course '${courseInfo?.name}'? Latest submissions will become Pending again.`)) return;
                try {
                  const res = await fetch(`${API_URL}/submissions/reset-course/${courseId}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${user?.token}` },
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.message || 'Failed to reset course reviews');
                  toast.success(data.message || 'Course reviews reset successfully.');
                  fetchSessions();
                } catch (err: any) {
                  toast.error(err.message || 'Failed to reset course reviews');
                }
              }}
              className="px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold rounded-lg text-xs transition-all whitespace-nowrap flex items-center gap-1.5 ml-auto"
              title="Reset Reviews For This Course"
            >
              <span>🔄</span>
              <span>Reset Course Reviews</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-6 mt-6 relative z-10 space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Courses', href: '/' },
            { label: courseInfo ? `${courseInfo.name} (${courseInfo.courseCode})` : 'Course Details' },
          ]}
        />
        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-800/50 text-red-200 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab content: Curriculum (Tasks & Sessions) */}
        {activeTab === 'curriculum' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">Programming Syllabus</h1>
                  {courseInfo?.courseCode && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(courseInfo.courseCode);
                        toast.success(`Copied group code '${courseInfo.courseCode}' to clipboard!`);
                      }}
                      title="Click to copy group code"
                      className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1 rounded-xl border border-blue-500/20 cursor-pointer transition-colors inline-flex items-center gap-1.5"
                    >
                      <span>{courseInfo.courseCode}</span>
                      <span>📋</span>
                    </button>
                  )}
                </div>
                <p className="text-zinc-400 text-sm mt-1">
                  {isTeacherOrAdmin
                    ? 'Create programming assignments, specify public/hidden cases, and unlock milestones.'
                    : 'Solve python programming tasks and view automatic execution grading.'}
                </p>
              </div>
              {isTeacherOrAdmin && (
                <button
                  onClick={() => setShowSessionModal(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-5 rounded-lg shadow-lg hover:shadow-violet-900/20 transition-all text-sm shrink-0"
                >
                  <Plus className="w-4.5 h-4.5" />
                  Add Session
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                <Loader2 className="w-10 h-10 animate-spin text-violet-500 mb-3" />
                <p>Loading curriculum...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="bg-[#16161A] border border-[#24242B] rounded-2xl p-12 text-center">
                <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No sessions yet</h3>
                <p className="text-zinc-400 text-sm">Add your first session to organize assignments.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                  {sessions.map((session) => {
                    const isExpanded = expandedSessions[session.id] !== false;
                    return (
                      <div key={session.id} className="bg-[#16161A] border border-[#24242B] rounded-2xl overflow-hidden shadow-xl transition-all">
                        {/* Session Header (Clickable Accordion) */}
                        <div
                          onClick={() => toggleSessionExpand(session.id)}
                          className="bg-[#1A1A22] border-b border-[#24242B] px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-[#1E1E28] transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button type="button" className="text-zinc-400 p-1 rounded-lg shrink-0">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-blue-400" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-zinc-400" />
                              )}
                            </button>
                            <span className="text-[10px] sm:text-xs bg-violet-500/10 border border-violet-500/25 text-violet-400 font-bold uppercase tracking-wider py-0.5 sm:py-1 px-2 sm:px-2.5 rounded-full shrink-0">
                              Session {session.order}
                            </span>
                            <h3 className="text-sm sm:text-lg font-bold text-white tracking-tight truncate">{session.title}</h3>
                            <span className="text-xs text-zinc-400 font-mono shrink-0">({session.tasks.length})</span>
                          </div>

                          {isTeacherOrAdmin && (
                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                disabled={processingSessionId === session.id}
                                onClick={() => handleToggleSessionLock(session.id, session.isUnlocked)}
                                className={`text-xs flex items-center gap-1.5 py-1 px-3 rounded-full font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50 ${
                                  session.isUnlocked
                                    ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 hover:bg-emerald-400/20'
                                    : 'text-amber-400 bg-amber-400/10 border border-amber-400/25 hover:bg-amber-400/20'
                                }`}
                                title={session.isUnlocked ? "Click to lock session" : "Click to unlock session"}
                              >
                                {processingSessionId === session.id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Processing...</span>
                                  </>
                                ) : session.isUnlocked ? (
                                  <>
                                    <Unlock className="w-3.5 h-3.5" />
                                    <span>Unlocked</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Lock Session</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedSessionId(session.id);
                                  setShowTaskModal(true);
                                }}
                                className="text-xs text-violet-400 hover:text-white flex items-center gap-1 font-semibold ml-2"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add Task
                              </button>
                              <button
                                onClick={() => handleArchiveSession(session.id)}
                                className="p-1 hover:bg-amber-500/20 text-zinc-500 hover:text-amber-400 rounded-lg transition-colors ml-1"
                                title="Archive Session"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setSessionToDelete(session)}
                                className="p-1 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-lg transition-colors ml-1"
                                title="Delete Session"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Expandable Session Content */}
                        {isExpanded && (
                          <div className="p-6 space-y-4 bg-[#141418]">
                            {session.tasks.length === 0 ? (
                              <p className="text-zinc-500 text-xs italic">No programming tasks added to this session yet.</p>
                            ) : (
                              session.tasks.map((task) => (
                                <div
                                  key={task.id}
                                  onClick={() => {
                                    if (isTeacherOrAdmin) {
                                      navigate(`/assignment/${task.id}/review`);
                                    } else {
                                      navigate(`/task/${task.id}`);
                                    }
                                  }}
                                  className="bg-[#1C1C24] border border-[#2B2B36] hover:border-blue-500/50 rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.005] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                                >
                                  <div className="space-y-2.5 flex-1">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <FileCode className="w-5 h-5 text-blue-400 shrink-0" />
                                      <h4 className="font-extrabold text-white text-base group-hover:text-blue-300 transition-colors">
                                        {task.title}
                                      </h4>

                                      {/* Mode Badge */}
                                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#272732] border border-[#373746] text-zinc-300 rounded-md">
                                        {task.evaluationMode === 'AutomaticGrading' ? '⚡ Auto Graded' : '📝 Manual Review'}
                                      </span>

                                      {/* Student Status Badges */}
                                      {user?.role === 'Student' && (
                                        task.status === 'Graded' ? (
                                          <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold rounded-lg text-[11px] inline-flex items-center gap-1">
                                            🟢 Graded: {task.grade ?? 0}/{task.maxGrade}
                                          </span>
                                        ) : task.status === 'Submitted - Pending Review' ? (
                                          <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold rounded-lg text-[11px] inline-flex items-center gap-1">
                                            🟡 Pending Review
                                          </span>
                                        ) : task.status === 'Late Submission' ? (
                                          <span className="px-2.5 py-0.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold rounded-lg text-[11px] inline-flex items-center gap-1">
                                            🟠 Late Submission
                                          </span>
                                        ) : task.status === 'Deadline Passed' ? (
                                          <span className="px-2.5 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold rounded-lg text-[11px] inline-flex items-center gap-1">
                                            🔴 Deadline Passed
                                          </span>
                                        ) : (
                                          <span className="px-2.5 py-0.5 bg-zinc-500/10 border border-zinc-500/30 text-zinc-400 font-medium rounded-lg text-[11px] inline-flex items-center gap-1">
                                            ⚪ Not Submitted
                                          </span>
                                        )
                                      )}
                                    </div>

                                    {/* Task Metadata & Teacher Statistics Bar */}
                                    <div className="flex items-center gap-4 text-xs text-zinc-400 flex-wrap pt-1">
                                      <span className="flex items-center gap-1 font-medium text-zinc-300">
                                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                                        Deadline: {new Date(task.deadline).toLocaleDateString()}
                                      </span>

                                      <span className="font-semibold text-blue-400">
                                        Max Grade: {task.maxGrade} pts
                                      </span>

                                      {/* Teacher Classroom Management Statistics */}
                                      {isTeacherOrAdmin && (
                                        <>
                                          <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold rounded-lg text-[11px]">
                                            👥 Submitted: {task.submittedCount ?? 0}
                                          </span>
                                          <span className="px-2.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold rounded-lg text-[11px]">
                                            🔴 Missing: {task.missingCount ?? 0}
                                          </span>
                                          {(task.pendingReviewsCount ?? 0) > 0 ? (
                                            <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold rounded-lg text-[11px]">
                                              🟡 Pending Reviews: {task.pendingReviewsCount}
                                            </span>
                                          ) : (
                                            <span className="px-2.5 py-0.5 bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 font-medium rounded-lg text-[11px]">
                                              Pending: 0
                                            </span>
                                          )}
                                        </>
                                      )}

                                      {user?.role === 'Student' && task.submittedAt && (
                                        <span className="text-zinc-400">
                                          Turned in: {new Date(task.submittedAt).toLocaleDateString()}
                                        </span>
                                      )}

                                      {user?.role === 'Student' && task.remainingAttempts !== undefined && (
                                        <span className="text-zinc-400">
                                          {task.remainingAttempts} attempts left
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                                    <span className="text-xs font-bold text-blue-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                                      {isTeacherOrAdmin ? 'Manage & Grade' : 'Open Task'} &rarr;
                                    </span>
                                    {isTeacherOrAdmin && (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleArchiveTask(task.id);
                                          }}
                                          className="p-1.5 hover:bg-amber-500/20 text-zinc-500 hover:text-amber-400 rounded-lg transition-colors"
                                          title="Archive Task"
                                        >
                                          <Archive className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setTaskToDelete(task);
                                          }}
                                          className="p-1.5 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                                          title="Delete Task"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Teacher Task Detail Panel (when a task is clicked) */}
                {isTeacherOrAdmin && (
                  <div className="md:col-span-1">
                    {selectedTask ? (
                      <div className="bg-[#16161A] border border-[#24242B] rounded-xl p-6 sticky top-24 space-y-6 shadow-xl">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-white text-lg">{selectedTask.title}</h3>
                            <span className="text-2xs text-zinc-500">Task Management</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                if (!window.confirm(`Are you sure you want to reset ALL student reviews for task '${selectedTask.title}'?`)) return;
                                try {
                                  const res = await fetch(`${API_URL}/submissions/reset-task/${selectedTask.id}`, {
                                    method: 'POST',
                                    headers: { Authorization: `Bearer ${user?.token}` },
                                  });
                                  const data = await res.json();
                                  if (!res.ok) throw new Error(data.message || 'Failed to reset task reviews');
                                  toast.success(data.message || 'Task reviews reset successfully.');
                                  fetchTaskStatsAndSubmissions(selectedTask.id);
                                } catch (err: any) {
                                  toast.error(err.message || 'Failed to reset task reviews');
                                }
                              }}
                              className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 rounded-lg text-2xs font-bold transition-all flex items-center gap-1"
                              title="Reset All Student Reviews For This Task"
                            >
                              <span>🔄 Reset Task</span>
                            </button>
                            <button
                              onClick={() => setSelectedTask(null)}
                              className="p-1 hover:bg-[#2F2F37] rounded-lg text-zinc-400 hover:text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Task Tabs */}
                        <div className="flex border-b border-[#24242B]">
                          <button
                            onClick={() => setTaskActiveTab('overview')}
                            className={`flex-1 pb-2 text-xs font-semibold text-center border-b-2 transition-all ${
                              taskActiveTab === 'overview'
                                ? 'border-violet-500 text-white'
                                : 'border-transparent text-zinc-400 hover:text-white'
                            }`}
                          >
                            Overview
                          </button>
                          <button
                            onClick={() => setTaskActiveTab('submissions')}
                            className={`flex-1 pb-2 text-xs font-semibold text-center border-b-2 transition-all ${
                              taskActiveTab === 'submissions'
                                ? 'border-violet-500 text-white'
                                : 'border-transparent text-zinc-400 hover:text-white'
                            }`}
                          >
                            Submissions
                          </button>
                        </div>

                        {/* Task Tab content: Overview */}
                        {taskActiveTab === 'overview' && taskStats && (
                          <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-[#1A1A22] p-3 rounded-lg border border-[#24242B]">
                                <span className="text-3xs text-zinc-400 uppercase block mb-1">Total Students</span>
                                <span className="text-base font-bold text-white">{taskStats.totalStudents}</span>
                              </div>
                              <div className="bg-[#1A1A22] p-3 rounded-lg border border-[#24242B]">
                                <span className="text-3xs text-zinc-400 uppercase block mb-1">Submitted</span>
                                <span className="text-base font-bold text-green-400">{taskStats.submitted}</span>
                              </div>
                              <div className="bg-[#1A1A22] p-3 rounded-lg border border-[#24242B]">
                                <span className="text-3xs text-zinc-400 uppercase block mb-1">Not Submitted</span>
                                <span className="text-base font-bold text-red-400">{taskStats.notSubmitted}</span>
                              </div>
                              <div className="bg-[#1A1A22] p-3 rounded-lg border border-[#24242B]">
                                <span className="text-3xs text-zinc-400 uppercase block mb-1">Late Submissions</span>
                                <span className="text-base font-bold text-amber-400">{taskStats.late}</span>
                              </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-[#24242B]">
                              <div className="flex justify-between text-xs py-1">
                                <span className="text-zinc-400">Average Grade</span>
                                <span className="font-bold text-white">{taskStats.averageGrade}</span>
                              </div>
                              <div className="flex justify-between text-xs py-1">
                                <span className="text-zinc-400">Highest Grade</span>
                                <span className="font-bold text-green-400">{taskStats.highestGrade}</span>
                              </div>
                              <div className="flex justify-between text-xs py-1">
                                <span className="text-zinc-400">Lowest Grade</span>
                                <span className="font-bold text-red-400">{taskStats.lowestGrade}</span>
                              </div>
                              <div className="flex justify-between text-xs py-1">
                                <span className="text-zinc-400">Average Attempts</span>
                                <span className="font-bold text-white">{taskStats.averageAttempts}</span>
                              </div>
                              <div className="flex justify-between text-xs py-1">
                                <span className="text-zinc-400">Submission Rate</span>
                                <span className="font-bold text-violet-400">{taskStats.submissionRate}%</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Task Tab content: Submissions Table */}
                        {taskActiveTab === 'submissions' && (
                          <div className="space-y-4 pt-2">
                            {/* Search / Filters */}
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input
                                  type="text"
                                  placeholder="Search student..."
                                  value={taskSearch}
                                  onChange={(e) => setTaskSearch(e.target.value)}
                                  className="w-full bg-[#1A1A22] border border-[#2D2D39] text-white rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none"
                                />
                              </div>
                              <select
                                value={taskStatusFilter}
                                onChange={(e) => setTaskStatusFilter(e.target.value)}
                                className="bg-[#1A1A22] border border-[#2D2D39] text-zinc-400 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                              >
                                <option value="All">All Students</option>
                                <option value="Submitted">Submitted</option>
                                <option value="Submitted Late">Late</option>
                                <option value="Not Submitted">Not Submitted</option>
                                <option value="Not Opened">Not Opened</option>
                                <option value="Passed">Passed (70+)</option>
                                <option value="Failed">Failed (Under 70)</option>
                              </select>
                              <button
                                onClick={handleExportTaskCSV}
                                className="flex items-center gap-1 bg-[#1A1A22] hover:bg-[#24242B] border border-[#2D2D39] text-zinc-400 hover:text-white rounded-lg px-2.5 py-1.5 text-xs transition-colors shrink-0"
                                title="Export Task Results to CSV"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Export
                              </button>
                            </div>

                            <div className="space-y-3 overflow-y-auto max-h-80 pr-1">
                              {taskSubmissions.length === 0 ? (
                                <p className="text-zinc-500 text-xs py-4 text-center">No submissions match filters.</p>
                              ) : (
                                taskSubmissions.map((sub) => (
                                  <div
                                    key={sub.studentId}
                                    className="p-3 bg-[#1A1A22] border border-[#24242B] rounded-lg flex flex-col justify-between gap-2"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <span className="font-semibold text-xs text-white block">{sub.studentName}</span>
                                        <span className="text-3xs text-zinc-500">ID: {sub.studentRegisterId}</span>
                                      </div>
                                      <span className={`text-3xs px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 ${
                                        sub.status.startsWith('Graded') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                        sub.status.startsWith('Pending Grade') || sub.status === 'Submitted' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                        sub.status === 'Not Opened' ? 'bg-zinc-800 text-zinc-400 border border-zinc-700/40' :
                                        'bg-red-500/10 text-red-400 border border-red-500/20'
                                      }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                          sub.status.startsWith('Graded') ? 'bg-emerald-400' :
                                          sub.status.startsWith('Pending Grade') || sub.status === 'Submitted' ? 'bg-amber-400' :
                                          sub.status === 'Not Opened' ? 'bg-zinc-400' :
                                          'bg-red-400'
                                        }`} />
                                        {sub.status}
                                      </span>
                                    </div>

                                    <div className="flex justify-between items-center text-3xs text-zinc-400 pt-1 border-t border-[#24242B]">
                                      <span>Grade: {sub.grade !== null ? `${sub.grade} pts` : '-'}</span>
                                      <span>Attempts: {sub.attempts}</span>
                                      {sub.attempts > 0 && (
                                        <button
                                          onClick={() => setSelectedStudentForReview({
                                            studentId: sub.studentId,
                                            studentName: sub.studentName,
                                            studentRegisterId: sub.studentRegisterId
                                          })}
                                          className="text-violet-400 hover:text-violet-300 flex items-center gap-0.5 font-semibold"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                          Review
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-[#16161A] border border-[#24242B] rounded-xl p-6 text-center text-zinc-500 text-sm">
                        Select a task from syllabus to view dashboard controls and submissions table.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Tab content: Course Analytics Dashboard */}
        {activeTab === 'dashboard' && dashboardMetrics && (
          <div className="space-y-8">
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-6">Course Performance Analytics</h1>

            {/* Metrics cards row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="bg-[#16161A] border border-[#24242B] p-4 rounded-xl shadow">
                <Users className="w-5 h-5 text-violet-400 mb-2" />
                <span className="text-3xs text-zinc-400 uppercase tracking-wider block">Total Students</span>
                <span className="text-lg font-bold text-white mt-1 block">{dashboardMetrics.totalStudents}</span>
              </div>
              <div className="bg-[#16161A] border border-[#24242B] p-4 rounded-xl shadow">
                <BookOpen className="w-5 h-5 text-violet-400 mb-2" />
                <span className="text-3xs text-zinc-400 uppercase tracking-wider block">Total Tasks</span>
                <span className="text-lg font-bold text-white mt-1 block">{dashboardMetrics.totalTasks}</span>
              </div>
              <div className="bg-[#16161A] border border-[#24242B] p-4 rounded-xl shadow">
                <CheckCircle className="w-5 h-5 text-green-400 mb-2" />
                <span className="text-3xs text-zinc-400 uppercase tracking-wider block">Submitted Today</span>
                <span className="text-lg font-bold text-white mt-1 block">{dashboardMetrics.submittedToday}</span>
              </div>
              <div className="bg-[#16161A] border border-[#24242B] p-4 rounded-xl shadow">
                <AlertTriangle className="w-5 h-5 text-red-400 mb-2" />
                <span className="text-3xs text-zinc-400 uppercase tracking-wider block">Pending Submissions</span>
                <span className="text-lg font-bold text-white mt-1 block">{dashboardMetrics.pendingSubmissions}</span>
              </div>
              <div className="bg-[#16161A] border border-[#24242B] p-4 rounded-xl shadow">
                <Clock className="w-5 h-5 text-amber-400 mb-2" />
                <span className="text-3xs text-zinc-400 uppercase tracking-wider block">Late Submissions</span>
                <span className="text-lg font-bold text-white mt-1 block">{dashboardMetrics.lateSubmissions}</span>
              </div>
              <div className="bg-[#16161A] border border-[#24242B] p-4 rounded-xl shadow">
                <Award className="w-5 h-5 text-violet-400 mb-2" />
                <span className="text-3xs text-zinc-400 uppercase tracking-wider block">Average Grade</span>
                <span className="text-lg font-bold text-white mt-1 block">{dashboardMetrics.averageCourseGrade}%</span>
              </div>
              <div className="bg-[#16161A] border border-[#24242B] p-4 rounded-xl shadow">
                <BarChart3 className="w-5 h-5 text-violet-400 mb-2" />
                <span className="text-3xs text-zinc-400 uppercase tracking-wider block">Completion Rate</span>
                <span className="text-lg font-bold text-white mt-1 block">{dashboardMetrics.completionRate}%</span>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Average Grade per Task Bar Chart */}
              <div className="bg-[#16161A] border border-[#24242B] p-6 rounded-xl shadow">
                <h3 className="text-sm font-semibold text-white mb-4">Average Grade per Session</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sessionOverviewData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#24242B" />
                      <XAxis dataKey="sessionName" stroke="#71717A" fontSize={10} />
                      <YAxis stroke="#71717A" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#16161A', borderColor: '#24242B' }} />
                      <Bar dataKey="averageGrade" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Completion rate Pie Chart */}
              <div className="bg-[#16161A] border border-[#24242B] p-6 rounded-xl shadow">
                <h3 className="text-sm font-semibold text-white mb-4">Curriculum Completion Rate</h3>
                <div className="h-64 flex justify-center items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={completionRateData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {completionRateData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Session Overview detailed table */}
            <div className="bg-[#16161A] border border-[#24242B] rounded-xl overflow-hidden shadow">
              <div className="px-6 py-4 border-b border-[#24242B] bg-[#1E1E24]/50">
                <h3 className="font-semibold text-white text-sm">Session-by-Session Performance Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#24242B] text-zinc-400 font-semibold uppercase bg-[#121215]">
                      <th className="px-6 py-3">Session Name</th>
                      <th className="px-6 py-3 text-center">Tasks</th>
                      <th className="px-6 py-3 text-center">Finished Students</th>
                      <th className="px-6 py-3 text-center">Pending Students</th>
                      <th className="px-6 py-3 text-center">Average Grade</th>
                      <th className="px-6 py-3 text-center">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#24242B]">
                    {sessionOverviewData.map((session) => (
                      <tr key={session.sessionId} className="hover:bg-[#1E1E24]/30">
                        <td className="px-6 py-4 font-semibold text-white">{session.sessionName}</td>
                        <td className="px-6 py-4 text-center">{session.numberofTasks}</td>
                        <td className="px-6 py-4 text-center text-green-400">{session.studentsFinished}</td>
                        <td className="px-6 py-4 text-center text-red-400">{session.studentsPending}</td>
                        <td className="px-6 py-4 text-center font-bold">{session.averageGrade} pts</td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-violet-400 font-semibold">{session.completionPercentage}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab content: Notifications Panel */}
        {activeTab === 'notifications' && (
          <div className="bg-[#16161A] border border-[#24242B] rounded-xl p-6 shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-[#24242B] pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-violet-400" />
                Instructor Alert Inbox
              </h2>
              <button
                onClick={fetchNotifications}
                className="text-xs text-violet-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>

            <div className="divide-y divide-[#24242B]">
              {notifications.length === 0 ? (
                <p className="text-zinc-500 py-6 text-sm text-center">No notifications found.</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`py-4 flex justify-between items-center gap-4 ${
                      !n.isRead ? 'bg-violet-600/5 px-3 rounded-lg border border-violet-500/10' : ''
                    }`}
                  >
                    <div>
                      <p className={`text-sm ${!n.isRead ? 'text-white font-semibold' : 'text-zinc-300'}`}>
                        {n.message}
                      </p>
                      <span className="text-3xs text-zinc-500 mt-1 block">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {!n.isRead && (
                      <button
                        onClick={() => markNotificationAsRead(n.id)}
                        className="text-xs text-violet-400 hover:text-white font-semibold shrink-0"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab content: Export Grades */}
        {activeTab === 'export' && (
          <div className="max-w-md mx-auto bg-[#16161A] border border-[#24242B] rounded-2xl p-8 text-center shadow-xl space-y-6">
            <div className="w-16 h-16 bg-violet-600/10 border border-violet-500/20 rounded-full flex items-center justify-center mx-auto">
              <FileSpreadsheet className="w-8 h-8 text-violet-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Export Grades Spreadsheet</h2>
              <p className="text-zinc-400 text-sm">
                Download a clean, structured CSV report containing students' best attempts, submission history status, and final calculated grades.
              </p>
            </div>
            <button
              onClick={handleExportCSV}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-lg py-3 px-4 shadow-lg hover:shadow-violet-900/30 transition-all focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <Download className="w-5 h-5" />
              Download CSV Report
            </button>
          </div>
        )}
      </div>

      {/* Review Student Submission Details Modal */}
      {selectedStudentForReview && selectedTask && (
        <StudentDetailsModal
          studentId={selectedStudentForReview.studentId}
          studentName={selectedStudentForReview.studentName}
          studentRegisterId={selectedStudentForReview.studentRegisterId}
          taskId={selectedTask.id}
          taskTitle={selectedTask.title}
          maxGrade={selectedTask.maxGrade}
          onClose={() => setSelectedStudentForReview(null)}
          onGraded={() => {
            fetchTaskStatsAndSubmissions(selectedTask.id);
            fetchDashboardMetrics();
          }}
        />
      )}

      {/* Modals: Session & Task Creation */}
      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#16161A] border border-[#24242B] rounded-2xl p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Create Session</h3>
              <button onClick={() => setShowSessionModal(false)} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Session Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Session 1: Introduction to Variables"
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  className="w-full bg-[#1F1F24] border border-[#2F2F37] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <button
                type="submit"
                disabled={sessionLoading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-lg py-2.5 px-4 transition-all"
              >
                {sessionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#16161A] border border-[#24242B] rounded-2xl p-6 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Create Programming Task</h3>
              <button onClick={() => setShowTaskModal(false)} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddTask} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Print Hello World"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-[#1F1F24] border border-[#2F2F37] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 bg-[#1F1F24] p-4 rounded-xl border border-[#2F2F37]">
                <div>
                  <label className="block text-xs font-bold text-violet-400 uppercase tracking-wider mb-2">Grading Evaluation Mode</label>
                  <select
                    value="ManualReview"
                    disabled
                    className="w-full bg-[#16161A] border border-[#2F2F37] text-white font-semibold rounded-lg px-3 py-2 text-xs opacity-90 cursor-not-allowed"
                  >
                    <option value="ManualReview">Manual Teacher Evaluation (v1.0)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Target Language</label>
                  <select
                    value={taskLanguage}
                    onChange={(e) => setTaskLanguage(e.target.value)}
                    className="w-full bg-[#16161A] border border-[#2F2F37] text-white font-semibold rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="python">Python (3.11)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Description (Rich Text)</label>
                <RichTextEditor
                  value={taskDesc}
                  onChange={setTaskDesc}
                  placeholder="Write detailed assignment instructions with formatting, headings, bold text, code blocks, tables, images, and links..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Task Type</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as any)}
                    className="w-full bg-[#1F1F24] border border-[#2F2F37] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="BasicExercise">Basic Console Output</option>
                    <option value="InputExercise">Input & Output Exercise</option>
                    <option value="ProgrammingChallenge">Complex Programming Challenge</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Max Grade</label>
                  <input
                    type="number"
                    required
                    value={taskMaxGrade}
                    onChange={(e) => setTaskMaxGrade(parseInt(e.target.value) || 100)}
                    className="w-full bg-[#1F1F24] border border-[#2F2F37] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {taskMode === 'Homework' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Deadline</label>
                  <input
                    type="datetime-local"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full bg-[#1F1F24] border border-[#2F2F37] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-[#24242B]">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="bg-[#1F1F24] border border-[#2F2F37] text-zinc-400 hover:text-white rounded-lg py-2 px-4 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={taskLoading}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:shadow-violet-900/20"
                >
                  {taskLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Session Modal */}
      <ConfirmModal
        isOpen={!!sessionToDelete}
        title={`Delete Session '${sessionToDelete?.title}'`}
        message="Are you sure you want to delete this session? All associated programming tasks and student submissions will be deleted permanently."
        confirmText="Delete Session"
        loading={deleteLoading}
        onConfirm={handleDeleteSession}
        onClose={() => setSessionToDelete(null)}
      />

      {/* Delete Task Modal */}
      <ConfirmModal
        isOpen={!!taskToDelete}
        title={`Delete Task '${taskToDelete?.title}'`}
        message="Are you sure you want to delete this task? All student submission records and grades for this task will be lost permanently."
        confirmText="Delete Task"
        loading={deleteLoading}
        onConfirm={handleDeleteTask}
        onClose={() => setTaskToDelete(null)}
      />

      {/* Remove Student Modal */}
      <ConfirmModal
        isOpen={!!studentToRemove}
        title={`Remove Student '${studentToRemove?.name}'`}
        message="Are you sure you want to remove this student from the course? Their submission records for this course will be unlinked."
        confirmText="Remove Student"
        loading={deleteLoading}
        onConfirm={handleRemoveStudent}
        onClose={() => setStudentToRemove(null)}
      />
    </div>
  );
};
