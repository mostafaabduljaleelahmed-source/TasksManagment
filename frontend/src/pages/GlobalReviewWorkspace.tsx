import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Editor from '@monaco-editor/react';
import {
  AlertCircle, ArrowLeft, ArrowRight, Save, Loader2, Code
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

        // If target submission ID is specified, locate it in the fresh queue
        if (targetSubId) {
          const matchIdx = items.findIndex((s) => s.submissionId === targetSubId);
          if (matchIdx !== -1) {
            selectedIdx = matchIdx;
          } else if (preferredIndex !== undefined) {
            // Target submission was graded and removed; open item at previous index or clamp to last
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

  const currentSubmission = queue[activeQueueIdx] || null;

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

  // Canvas LMS Workflow: Save & Automatically Advance to Next Submission in Queue
  const handleSaveAndNext = async () => {
    if (!currentSubmission) return;
    const currentSubId = currentSubmission.submissionId;
    const currentIdx = activeQueueIdx;

    const success = await executeSaveReview();
    if (success) {
      // Refresh pending queue from backend and auto-open next queue item
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
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center text-zinc-400 p-6">
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

  // Queue Empty State (Canvas LMS "All Caught Up!")
  if (queue.length === 0 || !currentSubmission) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-6 text-center">
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
    <div className="min-h-screen bg-[#0B0F19] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
      
      {/* HEADER: Canvas LMS Queue Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#111827]/95 backdrop-blur-md border-b border-[#1F2937] px-4 py-2.5 shadow-xl flex flex-wrap items-center justify-between gap-3">
        
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/teacher/pending-reviews')}
            className="p-2 bg-[#1F2937] hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors shrink-0"
            title="Back to Pending Reviews Queue"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-extrabold text-white truncate">{currentSubmission.taskTitle}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono">
                Queue [{activeQueueIdx + 1} / {queue.length}]
              </span>
            </div>
            <p className="text-xs text-zinc-400 truncate">
              Student: <strong className="text-white">{currentSubmission.studentName}</strong> ({currentSubmission.groupName})
            </p>
          </div>
        </div>

        {/* Global Queue Selector Pill */}
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

        {/* Nav Prev / Next Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleSelectQueueItem(activeQueueIdx - 1)}
            disabled={activeQueueIdx === 0}
            className="p-2 bg-[#1F2937] hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 rounded-xl transition-colors"
            title="Previous Queue Submission"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleSelectQueueItem(activeQueueIdx + 1)}
            disabled={activeQueueIdx === queue.length - 1}
            className="p-2 bg-[#1F2937] hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 rounded-xl transition-colors"
            title="Next Queue Submission"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* WORKSPACE BODY */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left: Code Viewer Panel */}
        <div className="flex-1 flex flex-col bg-[#111827] border-r border-[#1F2937] overflow-hidden">
          <div className="bg-[#1A2234] border-b border-[#1F2937] px-4 py-2 flex items-center justify-between shrink-0 text-xs font-bold text-white">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-blue-400" />
              Student Code Submission (Attempt #{currentSubmission.attemptNumber})
            </div>
            <div className="text-[11px] text-zinc-400 font-mono">
              Submitted: {new Date(currentSubmission.submittedAt).toLocaleString()}
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden">
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

        {/* Right: Grading Form Panel */}
        <div className="w-full md:w-96 bg-[#111827] flex flex-col p-6 space-y-6 shrink-0 border-l border-[#1F2937]">
          <div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-1">Evaluate Submission</h3>
            <p className="text-xs text-zinc-400">Assign grade score and provide feedback for student review.</p>
          </div>

          {/* Grade Score Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Grade Score (Max {currentSubmission.maxGrade} pts)
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={gradeInputRef}
                type="number"
                min={0}
                max={currentSubmission.maxGrade}
                value={gradeInput}
                onChange={(e) => setGradeInput(Number(e.target.value))}
                className="w-full bg-[#0B0F19] border border-[#1F2937] text-white font-mono text-lg font-black rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs font-bold text-zinc-500 font-mono shrink-0">/ {currentSubmission.maxGrade}</span>
            </div>
          </div>

          {/* Feedback Textarea */}
          <div className="space-y-2 flex-1 flex flex-col">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Teacher Feedback
            </label>
            <textarea
              rows={5}
              placeholder="Write feedback comments for the student..."
              value={teacherFeedback}
              onChange={(e) => setTeacherFeedback(e.target.value)}
              className="w-full flex-1 bg-[#0B0F19] border border-[#1F2937] text-white text-xs rounded-xl p-3 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Canvas LMS Save & Auto-Advance Button */}
          <button
            onClick={handleSaveAndNext}
            disabled={saving}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-violet-600 hover:from-amber-400 hover:to-violet-500 text-white font-extrabold text-xs rounded-xl shadow-xl shadow-amber-950/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save & Next Submission ➔
          </button>
        </div>

      </div>
    </div>
  );
};
