import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Editor from '@monaco-editor/react';
import { ArrowLeft, Play, Send, History, Loader2, Code, Clock, Award, ShieldAlert, Sparkles, Upload, Terminal, Trash2 } from 'lucide-react';
import { RichTextViewer } from '../components/RichTextEditor';

interface Task {
  id: string;
  sessionId: string;
  title: string;
  description: string;
  exampleInput: string;
  exampleOutput: string;
  publicTestCasesJson: string;
  deadline: string;
  maxGrade: number;
  mode: string; // "InClass" or "Homework"
  maxAttempts: number;
  evaluationMode?: string;
  language?: string;
}

interface StudentStats {
  bestScore: number;
  attemptsCount: number;
  remainingAttempts: number; // -1 for InClass
  maxAttempts: number;
  deadline: string;
}

interface TestResult {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  error: string;
}

interface Submission {
  id: string;
  code: string;
  grade: number;
  feedback: string;
  teacherFeedback?: string;
  teacherNotes?: string;
  passedPublicCases: number;
  totalPublicCases: number;
  passedHiddenCases: number;
  totalHiddenCases: number;
  executionTimeMs: number;
  attemptNumber: number;
  submittedAt: string;
  consoleOutput?: string;
  expectedOutput?: string;
}

interface TaskAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
}

export const TaskWorkspace: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const { user } = useAuth();
  const toast = useToast();

  const [task, setTask] = useState<Task | null>(null);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  
  // Default to empty string (no boilerplate comments or template code)
  const [code, setCode] = useState<string>('');

  // Loading & logs state
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'history'>('description');
  const [consoleOutput, setConsoleOutput] = useState<{
    type: 'run' | 'submit' | 'error';
    summary: string;
    details?: TestResult[];
    generalError?: string;
    detailsMessage?: string;
    teacherFeedback?: string;
    stdout?: string;
    executionTimeMs?: number;
  } | null>(null);

  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  const fetchTaskDetails = async () => {
    if (!user || !taskId) return;
    setLoading(true);
    try {
      // 1. Fetch Task Info
      const taskRes = await fetch(`${API_URL}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!taskRes.ok) throw new Error('Failed to load task details');
      const taskData = await taskRes.json();
      setTask(taskData);
      if (taskData.attachmentsJson) {
        try {
          setAttachments(JSON.parse(taskData.attachmentsJson));
        } catch (e) {
          setAttachments([]);
        }
      }

      // 2. Fetch Student stats
      const statsRes = await fetch(`${API_URL}/submissions/task/${taskId}/student-stats`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 3. Fetch submissions list
      let historyData: Submission[] = [];
      const historyRes = await fetch(`${API_URL}/submissions/task/${taskId}/history`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (historyRes.ok) {
        historyData = await historyRes.json();
        setSubmissions(historyData);
      }

      // 4. Preserve User Code (localStorage Drafts or Previous Submission)
      const draftKey = `draft_${user.id}_${taskId}`;
      const savedDraft = localStorage.getItem(draftKey);

      if (savedDraft !== null) {
        setCode(savedDraft);
      } else if (historyData && historyData.length > 0) {
        setCode(historyData[0].code);
      } else {
        setCode('');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId, user]);

  const handleCodeChange = (newVal: string | undefined) => {
    const val = newVal || '';
    setCode(val);
    if (user && taskId) {
      localStorage.setItem(`draft_${user.id}_${taskId}`, val);
    }
  };

  const handleRunCode = async () => {
    if (!taskId || running) return;
    setRunning(true);
    setConsoleOutput(null);
    try {
      const res = await fetch(`${API_URL}/submissions/task/${taskId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Run failed');
      }

      setConsoleOutput({
        type: 'run',
        summary: `${data.executionTimeMs}ms`,
        executionTimeMs: data.executionTimeMs,
        generalError: data.stderr || data.error,
        detailsMessage: data.stdout
      });
      toast.info('Code executed.');
    } catch (err: any) {
      setConsoleOutput({
        type: 'error',
        summary: 'Execution Error',
        generalError: err.message,
      });
      toast.error(err.message || 'Execution error');
    } finally {
      setRunning(false);
    }
  };

  const handleCodeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.py')) {
      toast.error('Invalid file format. Please upload a Python (.py) file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content !== undefined) {
        handleCodeChange(content);
        setConsoleOutput({
          type: 'run',
          summary: `Loaded File: ${file.name}`,
          detailsMessage: `Successfully loaded '${file.name}' into the code editor. Review your code and click Submit to turn in your assignment.`
        });
        toast.success(`Loaded file '${file.name}' into code editor.`);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmitCode = async () => {
    if (!taskId || submitting) return;
    setSubmitting(true);
    setConsoleOutput(null);
    try {
      const res = await fetch(`${API_URL}/submissions/task/${taskId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.message || 'Submission failed';
        const errorDetails = data.details ? `${errorMsg}\nDetails: ${data.details}` : errorMsg;
        throw new Error(errorDetails);
      }

      if (user && taskId) {
        localStorage.setItem(`draft_${user.id}_${taskId}`, code);
      }

      setConsoleOutput({
        type: 'submit',
        summary: `Submission Attempt #${data.attemptNumber} Recorded!`,
        detailsMessage: `Your code was permanently saved at ${new Date(data.submittedAt).toLocaleTimeString()}. Your teacher will review and enter your grade & feedback.`,
        teacherFeedback: data.teacherFeedback || data.feedback,
        stdout: data.consoleOutput,
        executionTimeMs: data.executionTimeMs,
      });

      toast.success(`Submission Attempt #${data.attemptNumber} turned in successfully!`);

      // Refresh Stats and History list
      const statsRes = await fetch(`${API_URL}/submissions/task/${taskId}/student-stats`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      const historyRes = await fetch(`${API_URL}/submissions/task/${taskId}/history`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (historyRes.ok) {
        setSubmissions(await historyRes.json());
      }
    } catch (err: any) {
      setConsoleOutput({
        type: 'error',
        summary: 'Submission Error',
        generalError: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !taskId || !user) return;

    const maxSizeBytes = 25 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error('File size exceeds the 25 MB limit.');
      return;
    }

    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.docx', '.doc', '.zip', '.rar', '.7z', '.pptx', '.ppt'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error(`File extension '${ext}' is not allowed. Supported formats: PDF, Images, DOCX, ZIP, PPTX.`);
      return;
    }

    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_URL}/tasks/${taskId}/attachments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Upload failed');
      }

      const updated = await res.json();
      setAttachments(updated);
      toast.success('Attachment uploaded successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload attachment');
    } finally {
      setUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!user || !taskId) return;
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error('Failed to delete attachment');
      const updated = await res.json();
      setAttachments(updated);
      toast.success('Attachment deleted.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete attachment');
    }
  };

  // Date countdown calculation
  const getCountdown = () => {
    if (!stats?.deadline) return 'No deadline';
    const diff = new Date(stats.deadline).getTime() - Date.now();
    if (diff <= 0) return 'Deadline passed';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h remaining`;
    return `${hours}h ${Math.floor((diff / (1000 * 60)) % 60)}m remaining`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center text-zinc-500">
        <Loader2 className="w-10 h-10 animate-spin text-violet-500 mb-3" />
        <p>Loading task workspace...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center text-zinc-500">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-3 animate-bounce" />
        <p className="text-white font-bold">Workspace not accessible.</p>
        <Link to="/" className="text-violet-400 mt-4 hover:underline">Go Back Home</Link>
      </div>
    );
  }

  const isHomework = task.mode === 'Homework';
  const attemptsDisabled = !!(isHomework && stats && stats.remainingAttempts === 0);
  const deadlinePassed = !!(isHomework && stats && new Date(stats.deadline).getTime() < Date.now());

  return (
    <div className="min-h-screen bg-[#0F0F11] text-zinc-200 flex flex-col overflow-hidden h-screen">
      {/* Top bar */}
      <header className="bg-[#16161A] border-b border-[#24242B] px-6 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to={task ? `/course/${task.sessionId}` : '/'}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            title="Back to syllabus"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-xs font-semibold text-zinc-400">Workspace</span>
          <span className="text-zinc-600">/</span>
          <span className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-none">{task.title}</span>
        </div>

        {/* Stats Summary Bar */}
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="text-amber-300 bg-amber-600/20 border border-amber-500/30 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
            📝 Manual Review
          </span>

          <span className="text-indigo-300 bg-indigo-600/20 border border-indigo-500/30 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
            Python 3.11
          </span>

          <div className="flex items-center gap-1 bg-zinc-800/50 border border-zinc-700/40 px-2.5 py-0.5 rounded text-zinc-300 text-[11px]">
            <Award className="w-3.5 h-3.5 text-indigo-400" />
            Max Grade: {task.maxGrade} pts
          </div>
          {isHomework && (
            <>
              <div className="hidden sm:flex items-center gap-1 bg-zinc-800/50 border border-zinc-700/40 px-2.5 py-0.5 rounded text-zinc-300 text-[11px]">
                <Sparkles className="w-3 h-3 text-violet-400" />
                Best Score: {stats?.bestScore ?? 0} pts
              </div>
              <div className="hidden sm:flex items-center gap-1 bg-zinc-800/50 border border-zinc-700/40 px-2.5 py-0.5 rounded text-zinc-300 text-[11px]">
                <Clock className="w-3 h-3 text-rose-400" />
                {getCountdown()}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Workspace Split Layout: Compact Description (30%) + Large Coding Area (70%) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Left Side: Compact Description / History */}
        <div className="w-full md:w-[30%] lg:w-[28%] flex flex-col border-r border-[#24242B] bg-[#16161A] overflow-hidden min-h-0 shrink-0">
          <div className="flex border-b border-[#24242B] shrink-0 bg-[#1A1A22]/50">
            <button
              onClick={() => setActiveTab('description')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'description'
                  ? 'border-violet-500 text-white bg-[#1F1F28]/50'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Description
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'history'
                  ? 'border-violet-500 text-white bg-[#1F1F28]/50'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Submissions ({submissions.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 min-h-0 space-y-4">
            {activeTab === 'description' ? (
              <div className="space-y-4 text-xs">
                <div>
                  <h2 className="text-lg font-extrabold text-white tracking-tight">{task.title}</h2>
                </div>

                <div className="prose prose-invert max-w-none text-zinc-300 text-xs leading-relaxed">
                  <RichTextViewer content={task.description} />
                </div>

                {/* Example Blocks */}
                {!task.exampleInput && task.exampleOutput ? (
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Expected Output</h4>
                    <div className="bg-[#1F1F24] border border-[#2F2F37] rounded-xl p-3 font-mono text-[11px]">
                      <pre className="text-emerald-400 whitespace-pre-wrap">{task.exampleOutput}</pre>
                    </div>
                  </div>
                ) : task.exampleInput ? (
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Example Input/Output</h4>
                    <div className="bg-[#1F1F24] border border-[#2F2F37] rounded-xl p-3 space-y-2 font-mono text-[11px]">
                      <div>
                        <p className="text-zinc-500 text-[9px] uppercase font-bold tracking-wider mb-1">Input</p>
                        <pre className="text-white whitespace-pre-wrap">{task.exampleInput}</pre>
                      </div>
                      <div className="border-t border-[#2F2F37] pt-2">
                        <p className="text-zinc-500 text-[9px] uppercase font-bold tracking-wider mb-1">Output</p>
                        <pre className="text-emerald-400 whitespace-pre-wrap">{task.exampleOutput}</pre>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Attachments Section */}
                <div className="space-y-3 pt-3 border-t border-[#24242B]">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Upload className="w-4 h-4 text-blue-400" />
                      Task Attachments ({attachments.length})
                    </h4>
                    {user?.role === 'Teacher' && (
                      <label className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[11px] cursor-pointer transition-colors flex items-center gap-1">
                        {uploadingAttachment ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        Upload File
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.docx,.doc,.zip,.rar,.7z,.pptx,.ppt"
                          onChange={handleFileUpload}
                          disabled={uploadingAttachment}
                        />
                      </label>
                    )}
                  </div>

                  {attachments.length === 0 ? (
                    <p className="text-zinc-500 text-[11px] italic">No attachments attached to this task.</p>
                  ) : (
                    <div className="space-y-2">
                      {attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2.5 bg-[#1C1C24] border border-[#2B2B36] rounded-xl hover:border-blue-500/40 transition-colors text-xs"
                        >
                          <div className="flex items-center gap-2.5 truncate flex-1">
                            <span className="p-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg shrink-0 font-bold uppercase text-[9px]">
                              {att.fileName.split('.').pop()}
                            </span>
                            <div className="truncate">
                              <p className="text-white font-semibold truncate text-[11px]">{att.fileName}</p>
                              <p className="text-[10px] text-zinc-500">{(att.fileSize / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href={`${API_URL.replace('/api', '')}${att.fileUrl}`}
                              download={att.fileName}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-zinc-800 hover:bg-blue-600 text-zinc-300 hover:text-white font-bold rounded-lg text-[11px] transition-colors"
                            >
                              Download
                            </a>
                            {user?.role === 'Teacher' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAttachment(att.id)}
                                className="p-1 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                                title="Delete Attachment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white">Past Submission History</h3>
                {submissions.length === 0 ? (
                  <p className="text-zinc-500 text-xs py-4">No submissions made yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {submissions.map((sub) => {
                      const isGraded = !!(sub.teacherFeedback || sub.grade > 0);
                      return (
                        <div
                          key={sub.id}
                          onClick={() => setSelectedSubmission(sub)}
                          className="bg-[#1F1F24] border border-[#2F2F37] hover:border-violet-500/40 rounded-xl p-3 cursor-pointer hover:bg-zinc-800/30 transition-all flex flex-col gap-1.5 group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">Attempt #{sub.attemptNumber}</span>
                            {isGraded ? (
                              <span className="text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                                {sub.grade}/{task.maxGrade} pts
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                                Pending Grade
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] text-zinc-400">
                            {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          <div className="flex justify-end items-center text-[11px] text-violet-400 font-semibold pt-1">
                            <span>Inspect &rarr;</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Monaco Code Editor (Large) & Execution Console (Medium) */}
        <div className="w-full md:w-[70%] lg:w-[72%] flex flex-col bg-[#0F0F11] overflow-hidden min-h-0 h-full" dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
          {/* Action Toolbar Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#16161A] border-b border-[#24242B] shrink-0" dir="ltr" style={{ direction: 'ltr' }}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-zinc-300 font-mono flex items-center gap-2">
                <Code className="w-4 h-4 text-violet-400" />
                <span>solution.py</span>
              </span>
              {code.trim() !== '' && (
                <button
                  onClick={() => handleCodeChange('')}
                  className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
                  title="Clear Code"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 bg-[#1F1F24] hover:bg-zinc-800 border border-[#2F2F37] text-zinc-200 font-semibold py-1.5 px-3 rounded-lg text-xs cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5 text-violet-400" />
                <span>Upload .py File</span>
                <input
                  type="file"
                  accept=".py"
                  onChange={handleCodeFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleRunCode}
                disabled={running || submitting}
                className="flex items-center gap-1.5 bg-[#1F1F24] hover:bg-zinc-800 border border-[#2F2F37] text-zinc-200 font-semibold py-1.5 px-3.5 rounded-lg text-xs transition-all disabled:opacity-50"
              >
                {running ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-zinc-400" />
                    Run Code
                  </>
                )}
              </button>

              <button
                onClick={handleSubmitCode}
                disabled={running || submitting || attemptsDisabled || deadlinePassed}
                className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-1.5 px-4 rounded-lg text-xs shadow-lg hover:shadow-violet-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title={attemptsDisabled ? 'No attempts remaining' : deadlinePassed ? 'Deadline has passed' : 'Submit task'}
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Submit
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Monaco Editor Container (Large main focus area) */}
          <div className="flex-1 w-full min-h-[300px] relative overflow-hidden" dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
            <Editor
              height="100%"
              width="100%"
              defaultLanguage="python"
              language="python"
              theme="vs-dark"
              value={code}
              onChange={handleCodeChange}
              onMount={(editor) => {
                setTimeout(() => {
                  editor.layout();
                  editor.setPosition({ lineNumber: 1, column: 1 });
                  editor.focus();
                }, 100);
              }}
              loading={
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs bg-[#0F0F11]">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-500 mb-2" />
                  <span>Loading Editor...</span>
                </div>
              }
              options={{
                fontSize: 15,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                fontFamily: 'Consolas, "Fira Code", monospace',
                automaticLayout: true,
                smoothScrolling: true,
                wordWrap: 'off',
                padding: { top: 12, bottom: 12 }
              }}
            />
          </div>

          {/* Execution Console (Medium height with monospace Output & StdErr) */}
          <div className="h-64 border-t border-[#24242B] bg-[#16161A] flex flex-col shrink-0 overflow-hidden">
            <div className="bg-[#1E1E24]/40 border-b border-[#24242B] px-4 py-2 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-zinc-300">
                <Terminal className="w-4 h-4 text-violet-400" />
                <span>Execution Console</span>
                {consoleOutput?.executionTimeMs !== undefined && (
                  <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono">
                    ⚡ {consoleOutput.executionTimeMs}ms
                  </span>
                )}
              </div>
              {consoleOutput && (
                <button
                  onClick={() => setConsoleOutput(null)}
                  className="text-xs text-zinc-500 hover:text-white transition-colors"
                >
                  Clear Console
                </button>
              )}
            </div>

            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs min-h-0 space-y-3">
              {!consoleOutput ? (
                <div className="text-zinc-500 flex flex-col items-center justify-center h-full">
                  <Terminal className="w-8 h-8 text-zinc-700 mb-2" />
                  <p className="text-xs">Click Run Code to execute locally, or Submit to turn in your assignment.</p>
                </div>
              ) : consoleOutput.type === 'error' ? (
                <div className="text-red-400 space-y-2">
                  <p className="font-bold text-sm">{consoleOutput.summary}</p>
                  <pre className="bg-red-950/20 border border-red-900/30 rounded-xl p-3 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap text-red-300 font-mono">
                    {consoleOutput.generalError}
                  </pre>
                </div>
              ) : consoleOutput.type === 'submit' ? (
                <div className="text-zinc-200 space-y-3">
                  <p className="font-bold text-violet-400 text-sm mb-2">{consoleOutput.summary}</p>
                  
                  <div className="bg-[#1F1F24] border border-[#2F2F37] rounded-xl p-3.5 space-y-1.5">
                    <p className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Submission Status</p>
                    <pre className="text-zinc-300 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                      {consoleOutput.detailsMessage}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-zinc-200 space-y-3">
                  {consoleOutput.generalError && (
                    <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-3.5 space-y-1">
                      <p className="text-red-400 text-[10px] uppercase font-bold tracking-wider">Standard Error (stderr)</p>
                      <pre className="text-red-300 font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto">
                        {consoleOutput.generalError}
                      </pre>
                    </div>
                  )}

                  <div className="bg-[#1F1F24] border border-[#2F2F37] rounded-xl p-3.5 space-y-1">
                    <p className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Standard Output (stdout)</p>
                    <pre className="text-emerald-400 font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto min-h-[50px]">
                      {consoleOutput.detailsMessage || 'Program executed successfully with no output.'}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Historical Code Viewer Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#16161A] border border-[#24242B] rounded-2xl w-full max-w-4xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-[#24242B]">
              <div>
                <h3 className="text-lg font-bold text-white">Submission Review (Attempt #{selectedSubmission.attemptNumber})</h3>
                <p className="text-zinc-500 text-xs mt-0.5">Submitted at: {new Date(selectedSubmission.submittedAt).toLocaleString()}</p>
              </div>
              {task && (
                <div className="bg-violet-500/10 border border-violet-500/20 text-violet-400 px-3 py-1 rounded-lg text-xs font-bold">
                  Score: {selectedSubmission.grade} / {task.maxGrade} pts
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
              {/* Code Editor */}
              <div className="flex-1 flex flex-col bg-[#0F0F11] border border-[#2F2F37] rounded-xl overflow-hidden min-h-[300px] md:min-h-0">
                <div className="bg-[#1E1E24]/30 border-b border-[#24242B] px-4 py-1.5 flex justify-between items-center text-[10px] uppercase font-bold text-zinc-500">
                  <span>Submitted Python Code</span>
                </div>
                <div className="flex-1 min-h-[250px] relative" dir="ltr" style={{ direction: 'ltr' }}>
                  <Editor
                    height="100%"
                    width="100%"
                    defaultLanguage="python"
                    language="python"
                    theme="vs-dark"
                    value={selectedSubmission.code || ''}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      fontFamily: 'Consolas, monospace',
                      automaticLayout: true,
                    }}
                  />
                </div>
              </div>

              {/* Execution Details Panel */}
              <div className="w-full md:w-80 flex flex-col gap-4 overflow-y-auto min-h-0 pr-1">
                {selectedSubmission.feedback && (
                  <div className="bg-[#1F1F24] border border-[#2F2F37] rounded-xl p-4 space-y-1">
                    <p className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Evaluation Feedback</p>
                    <pre className="text-zinc-300 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                      {selectedSubmission.feedback}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-[#24242B]">
              <button
                type="button"
                onClick={() => {
                  handleCodeChange(selectedSubmission.code);
                  setSelectedSubmission(null);
                }}
                className="bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2 px-4 rounded-lg text-xs transition-all"
              >
                Restore to Workspace
              </button>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="bg-[#1F1F24] border border-[#2F2F37] text-zinc-400 hover:text-white rounded-lg py-2 px-4 text-xs font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
