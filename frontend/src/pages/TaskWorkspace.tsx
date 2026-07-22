import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Editor from '@monaco-editor/react';
import { ArrowLeft, Play, Send, History, Loader2, Code, Clock, Award, ShieldAlert, Sparkles, Upload } from 'lucide-react';

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

export const TaskWorkspace: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const { user } = useAuth();
  const toast = useToast();

  const [task, setTask] = useState<Task | null>(null);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [code, setCode] = useState<string>(`# Write your Python code here\n# E.g. read input using input() and print result\n\ndef main():\n    n = input()\n    print(n)\n\nif __name__ == '__main__':\n    main()`);

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

      // 2. Fetch Student stats
      const statsRes = await fetch(`${API_URL}/submissions/task/${taskId}/student-stats`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 3. Fetch submissions list
      const historyRes = await fetch(`${API_URL}/submissions/task/${taskId}/history`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setSubmissions(historyData);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setCode(content);
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
        throw new Error(data.message || 'Submission failed');
      }

      setConsoleOutput({
        type: 'submit',
        summary: `Submission Attempt #${data.attemptNumber} Recorded!`,
        detailsMessage: `Your code was permanently saved at ${new Date(data.submittedAt).toLocaleTimeString()}. Your teacher will review and enter your grade & feedback.`,
        teacherFeedback: data.teacherFeedback || data.feedback,
        stdout: data.consoleOutput,
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
      <header className="bg-[#16161A] border-b border-[#24242B] px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to={task ? `/course/${task.sessionId}` : '/'}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            title="Back to syllabus"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-sm font-semibold text-zinc-400">Task Workspace</span>
          <span className="text-zinc-600">/</span>
          <span className="text-sm font-bold text-white">{task.title}</span>
        </div>

        {/* Stats Summary Bar */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="text-amber-300 bg-amber-600/20 border border-amber-500/30 px-2.5 py-1 rounded-md text-2xs font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-sm">
            📝 Manual Review
          </span>

          <span className="text-indigo-300 bg-indigo-600/20 border border-indigo-500/30 px-2.5 py-1 rounded-md text-2xs font-bold uppercase tracking-wider">
            Python 3.11
          </span>

          <div className="flex items-center gap-1 bg-zinc-800/50 border border-zinc-700/40 px-2.5 py-1 rounded-md text-zinc-300">
            <Award className="w-3.5 h-3.5 text-indigo-400" />
            Max Grade: {task.maxGrade} pts
          </div>
          {isHomework && (
            <>
              <div className="flex items-center gap-1 bg-zinc-800/50 border border-zinc-700/40 px-2.5 py-1 rounded-md text-zinc-300">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                Best Score: {stats?.bestScore ?? 0} pts
              </div>
              <div className="flex items-center gap-1 bg-zinc-800/50 border border-zinc-700/40 px-2.5 py-1 rounded-md text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-rose-400" />
                {getCountdown()}
              </div>
              <div className="flex items-center gap-1 bg-zinc-800/50 border border-zinc-700/40 px-2.5 py-1 rounded-md text-zinc-300">
                Remaining attempts: {stats?.remainingAttempts} / {stats?.maxAttempts}
              </div>
            </>
          )}
          {!isHomework && (
            <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] tracking-wider uppercase font-bold">
              Practice (In-Class)
            </span>
          )}
        </div>
      </header>

      {/* Pane Splitter */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Left Side: Description / History */}
        <div className="w-full md:w-1/2 flex flex-col border-r border-[#24242B] bg-[#16161A] overflow-hidden min-h-0">
          <div className="flex border-b border-[#24242B] shrink-0 bg-[#1A1A22]/50">
            <button
              onClick={() => setActiveTab('description')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
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
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'history'
                  ? 'border-violet-500 text-white bg-[#1F1F28]/50'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              Submissions ({submissions.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {activeTab === 'description' ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">{task.title}</h2>
                </div>

                <div className="prose prose-invert max-w-none text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {task.description}
                </div>

                {/* Example Blocks or Expected Output for Basic Exercises */}
                {!task.exampleInput && task.exampleOutput ? (
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase tracking-wider font-bold text-zinc-400">Expected Output</h4>
                    <div className="bg-[#1F1F24] border border-[#2F2F37] rounded-xl p-4 font-mono text-xs">
                      <pre className="text-emerald-400 whitespace-pre-wrap">{task.exampleOutput}</pre>
                    </div>
                  </div>
                ) : task.exampleInput ? (
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase tracking-wider font-bold text-zinc-400">Example Input/Output</h4>
                    <div className="bg-[#1F1F24] border border-[#2F2F37] rounded-xl p-4 space-y-3 font-mono text-xs">
                      <div>
                        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Input</p>
                        <pre className="text-white whitespace-pre-wrap">{task.exampleInput}</pre>
                      </div>
                      <div className="border-t border-[#2F2F37] pt-3">
                        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Output</p>
                        <pre className="text-emerald-400 whitespace-pre-wrap">{task.exampleOutput}</pre>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white mb-2">Past Submission History</h3>
                {submissions.length === 0 ? (
                  <p className="text-zinc-500 text-sm py-4">No submissions made yet.</p>
                ) : (
                  <div className="space-y-3">
                    {submissions.map((sub) => {
                      const isGraded = !!(sub.teacherFeedback || sub.grade > 0);
                      return (
                        <div
                          key={sub.id}
                          onClick={() => setSelectedSubmission(sub)}
                          className="bg-[#1F1F24] border border-[#2F2F37] hover:border-violet-500/40 rounded-xl p-4 cursor-pointer hover:bg-zinc-800/30 transition-all flex flex-col gap-2 group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">Attempt #{sub.attemptNumber}</span>
                              <span className="text-[10px] bg-zinc-800 text-zinc-400 py-0.5 px-2 rounded-md font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3 text-zinc-500" />
                                {new Date(sub.submittedAt).toLocaleDateString()} {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="shrink-0">
                              {isGraded ? (
                                <span className="text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg">
                                  Graded: {sub.grade}/{task.maxGrade} pts
                                </span>
                              ) : (
                                <span className="text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-lg">
                                  Pending Grade
                                </span>
                              )}
                            </div>
                          </div>

                          {sub.teacherFeedback ? (
                            <div className="bg-[#17171E] border border-violet-500/20 rounded-lg p-2.5 mt-1">
                              <p className="text-[10px] uppercase tracking-wider font-bold text-violet-400">Teacher Feedback:</p>
                              <p className="text-xs text-zinc-200 mt-0.5 whitespace-pre-wrap">{sub.teacherFeedback}</p>
                            </div>
                          ) : (
                            <p className="text-xs text-zinc-500 italic">No teacher feedback entered yet.</p>
                          )}

                          <div className="flex justify-end items-center text-xs text-violet-400 font-semibold pt-1">
                            <span>View Submitted Code &rarr;</span>
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

        {/* Right Side: Monaco Code Editor & Console */}
        <div className="w-full md:w-1/2 flex flex-col bg-[#0F0F11] overflow-hidden min-h-0">
          <div className="flex-1 flex flex-col min-h-0 relative">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                fontFamily: 'Consolas, monospace',
                automaticLayout: true,
              }}
            />

            {/* Run / Upload / Submit Action Panel overlayed top-right */}
            <div className="absolute top-3 right-5 z-20 flex items-center gap-2">
              <label className="flex items-center gap-1.5 bg-[#1F1F24] hover:bg-zinc-800 border border-[#2F2F37] text-zinc-200 font-semibold py-1.5 px-3 rounded-lg text-xs cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5 text-violet-400" />
                <span>Upload .py File</span>
                <input
                  type="file"
                  accept=".py"
                  onChange={handleFileUpload}
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

          {/* Bottom Console Panel */}
          <div className="h-60 border-t border-[#24242B] bg-[#16161A] flex flex-col shrink-0 overflow-hidden">
            <div className="bg-[#1E1E24]/30 border-b border-[#24242B] px-5 py-2 flex items-center justify-between shrink-0">
              <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">Execution Console</span>
              {consoleOutput && (
                <button
                  onClick={() => setConsoleOutput(null)}
                  className="text-xs text-zinc-500 hover:text-white transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex-1 p-5 overflow-y-auto font-mono text-xs min-h-0 space-y-3">
              {!consoleOutput ? (
                <div className="text-zinc-500 flex flex-col items-center justify-center h-full">
                  <Code className="w-8 h-8 text-zinc-700 mb-2" />
                  <p>Run public tests locally or Submit to grade your code.</p>
                </div>
              ) : consoleOutput.type === 'error' ? (
                <div className="text-red-400">
                  <p className="font-semibold text-sm mb-1">{consoleOutput.summary}</p>
                  <pre className="bg-red-950/20 border border-red-900/20 rounded p-3 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap">
                    {consoleOutput.generalError}
                  </pre>
                </div>
              ) : consoleOutput.type === 'submit' ? (
                <div className="text-zinc-200 space-y-3">
                  <p className="font-semibold text-violet-400 text-sm mb-2">{consoleOutput.summary}</p>
                  
                  <div className="bg-[#1F1F24] border border-[#2F2F37] rounded-xl p-4 space-y-2">
                    <p className="text-zinc-400 text-[11px] uppercase font-bold tracking-wider">Student Feedback</p>
                    <pre className="text-zinc-300 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                      {consoleOutput.detailsMessage}
                    </pre>
                  </div>

                  {user?.role === 'Teacher' && consoleOutput.teacherFeedback && (
                    <div className="bg-[#1D1D2C] border border-[#2B2B47] rounded-xl p-4 space-y-2">
                      <p className="text-indigo-400 text-[11px] uppercase font-bold tracking-wider">Teacher Comparison Log</p>
                      <pre className="text-indigo-300 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                        {consoleOutput.teacherFeedback}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-zinc-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-white">Execution Sandbox</span>
                    <span className="text-3xs bg-zinc-800 border border-zinc-700 text-zinc-400 font-medium px-2 py-0.5 rounded">
                      Time: {consoleOutput.summary}
                    </span>
                  </div>

                  {consoleOutput.generalError && (
                    <div className="bg-red-950/10 border border-red-900/30 rounded-xl p-4 space-y-1.5">
                      <p className="text-red-400 text-[10px] uppercase font-bold tracking-wider">Standard Error / Runtime Error</p>
                      <pre className="text-red-300 font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto">
                        {consoleOutput.generalError}
                      </pre>
                    </div>
                  )}

                  <div className="bg-[#1F1F24] border border-[#2F2F37] rounded-xl p-4 space-y-1.5">
                    <p className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Standard Output</p>
                    <pre className="text-emerald-400 font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto min-h-[60px]">
                      {consoleOutput.detailsMessage || 'Program executed with no console output.'}
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
                <p className="text-zinc-500 text-2xs mt-0.5">Submitted at: {new Date(selectedSubmission.submittedAt).toLocaleString()}</p>
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
                <div className="bg-[#1E1E24]/30 border-b border-[#24242B] px-4 py-1.5 flex justify-between items-center text-3xs uppercase font-bold text-zinc-500">
                  <span>Submitted Python Code</span>
                </div>
                <div className="flex-1">
                  <Editor
                    height="100%"
                    defaultLanguage="python"
                    theme="vs-dark"
                    value={selectedSubmission.code}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 12,
                      lineNumbers: 'on',
                      fontFamily: 'Consolas, monospace',
                    }}
                  />
                </div>
              </div>

              {/* Execution Details Panel */}
              <div className="w-full md:w-80 flex flex-col gap-4 overflow-y-auto min-h-0 pr-1">
                {selectedSubmission.feedback && (
                  <div className="bg-[#1F1F24] border border-[#2F2F37] rounded-xl p-4 space-y-1.5">
                    <p className="text-zinc-400 text-3xs uppercase font-bold tracking-wider">Evaluation Feedback</p>
                    <pre className="text-zinc-300 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                      {selectedSubmission.feedback}
                    </pre>
                  </div>
                )}

                {selectedSubmission.expectedOutput && (
                  <div className="bg-[#1F1F24] border border-[#2F2F37] rounded-xl p-4 space-y-1.5">
                    <p className="text-zinc-400 text-3xs uppercase font-bold tracking-wider">Expected Output (First Failed/Last Public)</p>
                    <pre className="text-zinc-500 font-mono text-[11px] whitespace-pre-wrap leading-relaxed overflow-x-auto bg-[#16161A] p-2.5 rounded border border-[#24242B] min-h-[40px]">
                      {selectedSubmission.expectedOutput}
                    </pre>
                  </div>
                )}

                {selectedSubmission.consoleOutput && (
                  <div className="bg-[#1F1F24] border border-[#2F2F37] rounded-xl p-4 space-y-1.5">
                    <p className="text-zinc-400 text-3xs uppercase font-bold tracking-wider">Console Output / Actual Output</p>
                    <pre className="text-emerald-400 font-mono text-[11px] whitespace-pre-wrap leading-relaxed overflow-x-auto bg-[#16161A] p-2.5 rounded border border-[#24242B] min-h-[40px]">
                      {selectedSubmission.consoleOutput}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-[#24242B]">
              <button
                type="button"
                onClick={() => {
                  setCode(selectedSubmission.code);
                  setSelectedSubmission(null);
                }}
                className="bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all"
              >
                Restore to Workspace
              </button>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="bg-[#1F1F24] border border-[#2F2F37] text-zinc-400 hover:text-white rounded-lg py-2 px-4 text-sm font-medium transition-all"
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
