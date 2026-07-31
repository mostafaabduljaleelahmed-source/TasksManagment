import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Editor from '@monaco-editor/react';
import { ArrowLeft, Send, History, Loader2, Code, Clock, Award, ShieldAlert, Sparkles, Upload, Terminal, Trash2 } from 'lucide-react';
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
  const [fontSize] = useState<number>(14);
  const [editorTheme] = useState<string>('vs-dark');


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

  // Reserved for future re-activation of Run Code feature once execution engine URL is configured
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRunCode = async () => {
    void handleRunCode;
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

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Server returned non-JSON response (${res.status}).`);
      }

      const data = await res.json();
      if (!res.ok || data.passed === false) {
        const errorDetail = data.error || data.stderr || data.message || 'Execution failed.';
        setConsoleOutput({
          type: 'error',
          summary: 'Execution Error',
          generalError: errorDetail,
        });
        toast.error('Code execution failed.');
        return;
      }

      setConsoleOutput({
        type: 'run',
        summary: `Execution Completed (${data.executionTimeMs}ms)`,
        executionTimeMs: data.executionTimeMs,
        generalError: data.stderr || data.error,
        detailsMessage: data.stdout || 'Program executed cleanly.'
      });
      toast.success('Program executed successfully.');
    } catch (err: any) {
      setConsoleOutput({
        type: 'error',
        summary: 'Execution Failure',
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

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Server returned non-JSON response (${res.status}).`);
      }

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

  // Mobile workspace tab state: 'instructions' | 'editor' | 'history' | 'console'
  const [mobileTab, setMobileTab] = useState<'instructions' | 'editor' | 'history' | 'console'>('editor');

  return (
    <div className="min-h-screen bg-[#0F0F11] text-zinc-200 flex flex-col overflow-hidden h-screen">
      {/* Top Header Bar */}
      <header className="bg-[#16161A] border-b border-[#24242B] px-3 sm:px-6 py-2.5 flex items-center justify-between shrink-0 min-h-[52px]">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to={task ? `/course/${task.sessionId}` : '/'}
            className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Back to syllabus"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-none">{task.title}</span>
        </div>

        {/* Stats Summary Bar */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <div className="flex items-center gap-1 bg-zinc-800/80 border border-zinc-700/50 px-2.5 py-1 rounded-xl text-zinc-200 text-xs font-bold">
            <Award className="w-4 h-4 text-indigo-400" />
            <span>{task.maxGrade} pts</span>
          </div>
          {isHomework && (
            <div className="hidden sm:flex items-center gap-1 bg-zinc-800/80 border border-zinc-700/50 px-2.5 py-1 rounded-xl text-zinc-200 text-xs font-bold">
              <Clock className="w-4 h-4 text-rose-400" />
              <span>{getCountdown()}</span>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Workspace Navigation Tab Bar (Visible on < 768px) */}
      <div className="md:hidden flex border-b border-[#24242B] bg-[#16161A] shrink-0">
        <button
          onClick={() => setMobileTab('editor')}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 min-h-[48px] ${
            mobileTab === 'editor'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Editor</span>
        </button>
        <button
          onClick={() => setMobileTab('instructions')}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 min-h-[48px] ${
            mobileTab === 'instructions'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Instructions</span>
        </button>
        <button
          onClick={() => setMobileTab('history')}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 min-h-[48px] ${
            mobileTab === 'history'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>History ({submissions.length})</span>
        </button>
        <button
          onClick={() => setMobileTab('console')}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 min-h-[48px] ${
            mobileTab === 'console'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Output</span>
        </button>
      </div>

      {/* Main Container Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Left Pane: Instructions & History (Desktop side pane, Mobile toggled) */}
        <div className={`w-full md:w-[32%] lg:w-[28%] flex flex-col border-r border-[#24242B] bg-[#16161A] overflow-hidden min-h-0 shrink-0 ${
          mobileTab === 'instructions' || mobileTab === 'history' ? 'flex flex-1' : 'hidden md:flex'
        }`}>
          <div className="hidden md:flex border-b border-[#24242B] shrink-0 bg-[#1A1A22]/50">
            <button
              onClick={() => setActiveTab('description')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'description'
                  ? 'border-violet-500 text-white bg-[#1F1F28]/50'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <Code className="w-4 h-4" />
              Description
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'history'
                  ? 'border-violet-500 text-white bg-[#1F1F28]/50'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              Submissions ({submissions.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 min-h-0 space-y-4">
            {(mobileTab === 'instructions' || (activeTab === 'description' && mobileTab !== 'history')) ? (
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
                      <label className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[11px] cursor-pointer transition-colors flex items-center gap-1">
                        {uploadingAttachment ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        Upload
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
                              className="px-2.5 py-1 bg-zinc-800 hover:bg-blue-600 text-zinc-300 hover:text-white font-bold rounded-xl text-xs transition-colors min-h-[36px] flex items-center justify-center"
                            >
                              Download
                            </a>
                            {user?.role === 'Teacher' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAttachment(att.id)}
                                className="p-1.5 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
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

        {/* Right Pane: Monaco Editor & Console */}
        <div className={`w-full md:w-[68%] lg:w-[72%] flex flex-col bg-[#0F0F11] overflow-hidden min-h-0 h-full ${
          mobileTab === 'editor' || mobileTab === 'console' ? 'flex flex-1' : 'hidden md:flex'
        }`} dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
          {/* Action Toolbar Header */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#16161A] border-b border-[#24242B] shrink-0" dir="ltr" style={{ direction: 'ltr' }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-300 font-mono flex items-center gap-1.5">
                <Code className="w-4 h-4 text-blue-400" />
                <span>solution.py</span>
              </span>

              {code.trim() !== '' && (
                <button
                  onClick={() => handleCodeChange('')}
                  className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1 ml-2 p-1"
                  title="Clear Code"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 bg-[#1F1F24] hover:bg-zinc-800 border border-[#2F2F37] text-zinc-200 font-semibold py-1.5 px-3 rounded-xl text-xs cursor-pointer transition-all min-h-[38px]">
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span>Upload .py</span>
                <input
                  type="file"
                  accept=".py"
                  onChange={handleCodeFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleSubmitCode}
                disabled={running || submitting || attemptsDisabled || deadlinePassed}
                className="hidden sm:flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-4 rounded-xl text-xs shadow-lg transition-all min-h-[38px] disabled:opacity-50"
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

          {/* Monaco Editor Container */}
          <div className={`flex-1 w-full min-h-[250px] relative overflow-hidden ${
            mobileTab === 'console' ? 'hidden md:block' : 'block'
          }`} dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
            <Editor
              height="100%"
              width="100%"
              defaultLanguage="python"
              language="python"
              theme={editorTheme}
              value={code}
              onChange={handleCodeChange}
              onMount={(editor) => {
                setTimeout(() => {
                  editor.layout();
                  editor.setPosition({ lineNumber: 1, column: 1 });
                }, 100);
              }}
              loading={
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs bg-[#0F0F11]">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                  <span>Loading Code Editor...</span>
                </div>
              }
              options={{
                fontSize: fontSize,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                fontFamily: 'Consolas, "Fira Code", monospace',
                automaticLayout: true,
                smoothScrolling: true,
                wordWrap: 'on',
                padding: { top: 12, bottom: 12 }
              }}
            />
          </div>

          {/* Console / Terminal Output Container */}
          <div className={`h-[220px] md:h-[200px] bg-[#121216] border-t border-[#24242B] flex flex-col shrink-0 ${
            mobileTab === 'console' ? 'flex flex-1 md:flex-none' : 'hidden md:flex'
          }`}>
            <div className="flex items-center justify-between px-4 py-2 bg-[#18181E] border-b border-[#24242B] text-xs font-semibold text-zinc-400">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                <span>Console Output</span>
              </div>
              {consoleOutput && (
                <button
                  onClick={() => setConsoleOutput(null)}
                  className="text-xs text-zinc-500 hover:text-white transition-colors p-1"
                >
                  Clear Console
                </button>
              )}
            </div>

            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs min-h-0 space-y-3">
              {!consoleOutput ? (
                <div className="text-zinc-500 flex flex-col items-center justify-center h-full">
                  <Terminal className="w-8 h-8 text-zinc-700 mb-2" />
                  <p className="text-xs">Click Submit Code to turn in your solution.</p>
                </div>
              ) : consoleOutput.type === 'error' ? (
                <div className="text-red-400 space-y-2">
                  <p className="font-bold text-sm">{consoleOutput.summary}</p>
                  <pre className="bg-red-950/20 border border-red-900/30 rounded-xl p-3 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap text-red-300 font-mono">
                    {consoleOutput.generalError}
                  </pre>
                </div>
              ) : (
                <div className="text-zinc-200 space-y-3">
                  <p className="font-bold text-blue-400 text-sm mb-2">{consoleOutput.summary}</p>
                  <div className="bg-[#1F1F24] border border-[#2F2F37] rounded-xl p-3.5 space-y-1.5">
                    <p className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Submission Details</p>
                    <pre className="text-zinc-300 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                      {consoleOutput.detailsMessage}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Mobile Bottom Submit Bar */}
      <div className="md:hidden sticky bottom-0 z-30 bg-[#16161A] border-t border-[#24242B] p-3 flex items-center justify-between gap-3 shadow-2xl">
        <button
          onClick={handleSubmitCode}
          disabled={running || submitting || attemptsDisabled || deadlinePassed}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl text-sm min-h-[52px] shadow-lg active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Submit Code Assignment</span>
            </>
          )}
        </button>
      </div>

      {/* Historical Code Viewer Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#16161A] border-t sm:border border-[#24242B] rounded-t-3xl sm:rounded-2xl w-full max-w-4xl p-4 sm:p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 mb-3 border-b border-[#24242B]">
              <div>
                <h3 className="text-base font-bold text-white">Submission Review (Attempt #{selectedSubmission.attemptNumber})</h3>
                <p className="text-zinc-400 text-xs">{new Date(selectedSubmission.submittedAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-h-0">
              <div className="h-[250px] sm:h-[350px] border border-[#2F2F37] rounded-xl overflow-hidden" dir="ltr" style={{ direction: 'ltr' }}>
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
                  }}
                />
              </div>

              {selectedSubmission.feedback && (
                <div className="bg-[#1F1F24] border border-[#2F2F37] rounded-xl p-3 space-y-1">
                  <p className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Evaluation Feedback</p>
                  <pre className="text-zinc-300 font-mono text-xs whitespace-pre-wrap">{selectedSubmission.feedback}</pre>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-3 mt-3 border-t border-[#24242B]">
              <button
                type="button"
                onClick={() => {
                  handleCodeChange(selectedSubmission.code);
                  setSelectedSubmission(null);
                  setMobileTab('editor');
                }}
                className="saas-button-primary min-h-[48px]"
              >
                Restore to Code Editor
              </button>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="saas-button-secondary min-h-[48px]"
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

