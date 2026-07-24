import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  X, Code, Award, MessageSquare, Loader2, Key, Trash2, Bell, CheckCircle2, Clock, AlertTriangle, FileCode
} from 'lucide-react';

interface StudentMember {
  studentId: string;
  name: string;
  email: string;
  studentRegisterId: string;
  avatarUrl?: string | null;
  averageGrade: number;
  completedTasks: number;
  pendingTasks: number;
  missingTasks: number;
  totalTasks: number;
  progressPercentage: number;
  status: string;
  lastActivity?: string;
}

interface StudentDetailsViewProps {
  courseId: string;
  courseName: string;
  student: StudentMember;
  onClose: () => void;
  onStudentRemoved?: () => void;
}

interface SubmissionItem {
  id: string;
  taskId: string;
  taskTitle: string;
  attemptNumber: number;
  submittedAt: string;
  code: string;
  grade: number;
  maxGrade: number;
  teacherFeedback: string;
  consoleOutput?: string | null;
  expectedOutput?: string | null;
}

export const StudentDetailsView: React.FC<StudentDetailsViewProps> = ({
  courseId,
  courseName,
  student,
  onClose,
  onStudentRemoved,
}) => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<SubmissionItem | null>(null);

  // Teacher Action Dialogs
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState('');
  const [sendingNotify, setSendingNotify] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [removingStudent, setRemovingStudent] = useState(false);

  const fetchStudentSubmissions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/dashboard/teacher/submissions?pageSize=100`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const studentSubs = data.items
          .filter((item: any) => item.studentId === student.studentId)
          .map((item: any) => ({
            id: item.submissionId || item.id,
            taskId: item.taskId,
            taskTitle: item.taskTitle,
            attemptNumber: item.attemptNumber || 1,
            submittedAt: item.submittedAt || new Date().toISOString(),
            code: item.code || '# Submission code',
            grade: item.grade || 0,
            maxGrade: item.maxGrade || 100,
            teacherFeedback: item.teacherFeedback || '',
            consoleOutput: item.consoleOutput || null,
            expectedOutput: item.expectedOutput || null,
          }));

        setSubmissions(studentSubs);
        if (studentSubs.length > 0) {
          setSelectedSub(studentSubs[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch student submissions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentSubmissions();
  }, [student.studentId]);

  const handleResetPassword = async () => {
    if (!window.confirm(`Reset password for student ${student.name}?`)) return;
    setResettingPassword(true);
    try {
      const res = await fetch(`${API_URL}/courses/${courseId}/students/${student.studentId}/reset-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reset password');
      toast.success(data.message || `Password reset to '${data.tempPassword}'`);
    } catch (err: any) {
      toast.error(err.message || 'Password reset failed');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleRemoveStudent = async () => {
    if (!window.confirm(`Are you sure you want to remove ${student.name} from ${courseName}?`)) return;
    setRemovingStudent(true);
    try {
      const res = await fetch(`${API_URL}/courses/${courseId}/students/${student.studentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (!res.ok) throw new Error('Failed to remove student');
      toast.success(`Removed ${student.name} from course.`);
      onClose();
      if (onStudentRemoved) onStudentRemoved();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove student');
    } finally {
      setRemovingStudent(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyMsg.trim()) return;
    setSendingNotify(true);
    try {
      const res = await fetch(`${API_URL}/courses/${courseId}/students/${student.studentId}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ message: notifyMsg.trim() }),
      });
      if (!res.ok) throw new Error('Failed to send notification');
      toast.success(`Notification sent to ${student.name}!`);
      setShowNotifyModal(false);
      setNotifyMsg('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send notification');
    } finally {
      setSendingNotify(false);
    }
  };

  const userInitials = student.name
    ? student.name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
    : 'ST';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-6xl h-[92vh] bg-[#16161A] border border-[#24242B] rounded-2xl flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#24242B] bg-[#1E1E24]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-extrabold text-base flex items-center justify-center border border-violet-400/30 overflow-hidden shrink-0 shadow-md">
              {student.avatarUrl ? (
                <img src={student.avatarUrl} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                userInitials
              )}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                {student.name}
                <span className="bg-violet-500/20 text-violet-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-violet-500/30">
                  Student ID: {student.studentRegisterId}
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">{student.email} • Group: {courseName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Teacher Action Controls */}
            {user?.role === 'Teacher' && (
              <>
                <button
                  onClick={() => setShowNotifyModal(true)}
                  className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Send Notification"
                >
                  <Bell className="w-3.5 h-3.5" />
                  Notify
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={resettingPassword}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                  title="Reset Password"
                >
                  {resettingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                  Reset Pass
                </button>
                <button
                  onClick={handleRemoveStudent}
                  disabled={removingStudent}
                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                  title="Remove Student"
                >
                  {removingStudent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Remove
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2F2F37] text-zinc-400 hover:text-white rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#16161A]">
          {/* Left Metadata & Metrics Summary Sidebar */}
          <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-[#24242B] bg-[#121215] p-6 space-y-6 overflow-y-auto shrink-0">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 mb-4">Academic Overview</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1A1A20] border border-[#292933] rounded-xl p-3 text-center">
                  <span className="text-[10px] text-zinc-500 font-bold block uppercase">Avg Grade</span>
                  <span className="text-xl font-extrabold text-amber-400">{student.averageGrade}%</span>
                </div>
                <div className="bg-[#1A1A20] border border-[#292933] rounded-xl p-3 text-center">
                  <span className="text-[10px] text-zinc-500 font-bold block uppercase">Progress</span>
                  <span className="text-xl font-extrabold text-violet-400">{student.progressPercentage}%</span>
                </div>
              </div>
            </div>

            {/* Task Stats Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 mb-2">Assignment Breakdown</h4>
              <div className="flex items-center justify-between p-2.5 bg-[#1A1A20] border border-[#292933] rounded-xl text-xs">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                </span>
                <span className="font-mono font-bold text-white">{student.completedTasks}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#1A1A20] border border-[#292933] rounded-xl text-xs">
                <span className="text-amber-400 font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Pending
                </span>
                <span className="font-mono font-bold text-white">{student.pendingTasks}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#1A1A20] border border-[#292933] rounded-xl text-xs">
                <span className="text-red-400 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Missing
                </span>
                <span className="font-mono font-bold text-white">{student.missingTasks}</span>
              </div>
            </div>

            {/* Activity Timestamp */}
            <div className="pt-4 border-t border-[#1F1F26] text-xs text-zinc-400 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Last Activity:</span>
                <span className="font-mono text-zinc-300">
                  {student.lastActivity ? new Date(student.lastActivity).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            {/* Submissions List Selector */}
            <div className="space-y-2 pt-2 border-t border-[#1F1F26]">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 mb-2">Submission Attempts</h4>
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-zinc-500 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" /> Loading submissions...
                </div>
              ) : submissions.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No code submissions recorded yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {submissions.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSub(sub)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between ${
                        selectedSub?.id === sub.id
                          ? 'bg-violet-600/20 border-violet-500 text-white font-bold'
                          : 'bg-[#1A1A20] border-[#292933] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="truncate max-w-[140px]">{sub.taskTitle}</span>
                      <span className="text-[10px] font-mono font-bold text-amber-400">{sub.grade}/{sub.maxGrade}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Main Pane: Code Viewer, Feedback & Grading Link */}
          {selectedSub ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-[#16161A]">
              <div className="px-5 py-3 border-b border-[#24242B] bg-[#1E1E24] flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <FileCode className="w-4 h-4 text-violet-400" />
                  <span>{selectedSub.taskTitle}</span>
                  <span className="text-zinc-500 font-normal"> Attempt #{selectedSub.attemptNumber}</span>
                </div>
                {user?.role === 'Teacher' && (
                  <button
                    onClick={() => {
                      onClose();
                      navigate(`/assignment/${selectedSub.taskId}/review`);
                    }}
                    className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1 shadow-md"
                  >
                    <Award className="w-3.5 h-3.5" />
                    Open Grading Page &rarr;
                  </button>
                )}
              </div>

              {/* Monaco Code Viewer */}
              <div className="flex-1 relative overflow-hidden bg-[#0B0F19]" dir="ltr" style={{ direction: 'ltr' }}>
                <Editor
                  height="100%"
                  width="100%"
                  defaultLanguage="python"
                  language="python"
                  theme="vs-dark"
                  value={selectedSub.code || ''}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    fontFamily: 'Consolas, monospace',
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    padding: { top: 10, bottom: 10 }
                  }}
                />
              </div>

              {/* Teacher Feedback Panel */}
              {selectedSub.teacherFeedback && (
                <div className="p-4 bg-[#121215] border-t border-[#24242B] space-y-1 text-xs">
                  <span className="font-bold text-purple-400 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Teacher Feedback
                  </span>
                  <p className="text-zinc-300 italic bg-[#1A1A20] border border-[#292933] p-3 rounded-xl">
                    "{selectedSub.teacherFeedback}"
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-xs p-8 space-y-2">
              <Code className="w-8 h-8 text-zinc-600 mb-1" />
              <p className="font-bold text-zinc-400">No Submission Selected</p>
              <p>Select a submission attempt from the sidebar to inspect the student's code and feedback.</p>
            </div>
          )}
        </div>

        {/* Modal: Send Notification to Student */}
        {showNotifyModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#16161A] border border-[#24242B] rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#24242B] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-400" />
                  Send Notification to {student.name}
                </h3>
                <button onClick={() => setShowNotifyModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSendNotification} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">Message</label>
                  <textarea
                    rows={4}
                    value={notifyMsg}
                    onChange={(e) => setNotifyMsg(e.target.value)}
                    placeholder="Type notice message for student..."
                    className="w-full bg-[#121215] border border-[#2B2B36] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNotifyModal(false)}
                    className="px-4 py-2 bg-[#1F1F26] text-zinc-300 hover:text-white font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingNotify}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {sendingNotify ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                    Send Notification
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
