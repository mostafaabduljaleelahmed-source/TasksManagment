import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Archive as ArchiveIcon, RotateCcw, BookOpen, FolderGit2, FileCode, Loader2, CheckCircle2, ArrowLeft, ChevronRight, Home
} from 'lucide-react';

interface ArchivedCourse {
  id: string;
  name: string;
  courseCode: string;
  description: string;
  createdAt: string;
}

interface ArchivedSession {
  id: string;
  title: string;
  order: number;
  courseId: string;
  courseName: string;
  createdAt: string;
}

interface ArchivedAssignment {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  sessionName: string;
  deadline: string;
  maxGrade: number;
  createdAt: string;
}

interface ArchiveData {
  courses: ArchivedCourse[];
  sessions: ArchivedSession[];
  assignments: ArchivedAssignment[];
}

export const Archive: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState<ArchiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'courses' | 'sessions' | 'assignments'>('courses');
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const fetchArchivedItems = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/archive`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error('Failed to load archived items');
      const resData = await res.json();
      setData(resData);
    } catch (err: any) {
      setError(err.message || 'Error loading archive');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedItems();
  }, [user]);

  const handleRestore = async (type: 'course' | 'session' | 'task', id: string, name: string) => {
    if (!user) return;
    setRestoringId(id);
    try {
      const res = await fetch(`${API_URL}/archive/${type}/${id}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error('Failed to restore item');
      toast.success(`Successfully restored "${name}"!`);
      fetchArchivedItems();
    } catch (err: any) {
      toast.error(err.message || 'Restore failed');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Navigation Breadcrumb & Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-zinc-400">
          <Link to="/dashboard" className="hover:text-white flex items-center gap-1 transition-colors">
            <Home className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          <Link to="/" className="hover:text-white transition-colors">
            Courses
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-amber-400 font-semibold">Archive</span>
        </nav>

        <button
          onClick={() => navigate(-1)}
          className="px-3.5 py-1.5 bg-[#1F2937] hover:bg-[#374151] text-zinc-200 font-semibold text-xs rounded-xl border border-[#374151] transition-all flex items-center gap-2 shadow-sm active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
          Back
        </button>
      </div>

      {/* Header */}
      <div className="border-b border-[#1F2937] pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-3 tracking-tight">
            <ArchiveIcon className="w-6 h-6 text-amber-400" />
            Archived Items Vault
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Archived courses, sessions, and assignments are hidden from normal lists. Restore them anytime.
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-[#1F2937]">
        <button
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'courses'
              ? 'border-amber-400 text-amber-400 bg-amber-500/10'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Archived Courses ({data?.courses.length ?? 0})
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'sessions'
              ? 'border-amber-400 text-amber-400 bg-amber-500/10'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <FolderGit2 className="w-4 h-4" />
          Archived Sessions ({data?.sessions.length ?? 0})
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'assignments'
              ? 'border-amber-400 text-amber-400 bg-amber-500/10'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <FileCode className="w-4 h-4" />
          Archived Assignments ({data?.assignments.length ?? 0})
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
          <p className="text-xs">Loading archived vault...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-center text-sm">
          {error}
        </div>
      ) : (
        <div>
          {/* Tab 1: Archived Courses */}
          {activeTab === 'courses' && (
            <div>
              {!data?.courses || data.courses.length === 0 ? (
                <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-12 text-center text-zinc-500 text-xs space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
                  <p className="font-bold text-white text-sm">No archived courses</p>
                  <p>All active courses are currently visible in your main course list.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.courses.map((course: ArchivedCourse) => (
                    <div
                      key={course.id}
                      className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                            {course.courseCode}
                          </span>
                          <span className="text-[11px] text-zinc-500">Course</span>
                        </div>
                        <h3 className="text-lg font-extrabold text-white">{course.name}</h3>
                        <p className="text-xs text-zinc-400 line-clamp-2">{course.description}</p>
                      </div>

                      <div className="pt-3 border-t border-[#1F2937] flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">
                          Created {new Date(course.createdAt).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => handleRestore('course', course.id, course.name)}
                          disabled={restoringId === course.id}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg"
                        >
                          {restoringId === course.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                          Restore Course
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Archived Sessions */}
          {activeTab === 'sessions' && (
            <div>
              {!data?.sessions || data.sessions.length === 0 ? (
                <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-12 text-center text-zinc-500 text-xs space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
                  <p className="font-bold text-white text-sm">No archived sessions</p>
                  <p>All sessions in your courses are currently active.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.sessions.map((session: ArchivedSession) => (
                    <div
                      key={session.id}
                      className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                            {session.courseName}
                          </span>
                          <span className="text-[11px] text-zinc-500">Session {session.order}</span>
                        </div>
                        <h3 className="text-lg font-extrabold text-white">{session.title}</h3>
                      </div>

                      <div className="pt-3 border-t border-[#1F2937] flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">
                          Created {new Date(session.createdAt).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => handleRestore('session', session.id, session.title)}
                          disabled={restoringId === session.id}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg"
                        >
                          {restoringId === session.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                          Restore Session
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Archived Assignments */}
          {activeTab === 'assignments' && (
            <div>
              {!data?.assignments || data.assignments.length === 0 ? (
                <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-12 text-center text-zinc-500 text-xs space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
                  <p className="font-bold text-white text-sm">No archived assignments</p>
                  <p>All programming tasks in your sessions are active.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.assignments.map((task: ArchivedAssignment) => (
                    <div
                      key={task.id}
                      className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                            {task.courseName}
                          </span>
                          <span className="text-[11px] font-semibold text-amber-400">{task.maxGrade} pts</span>
                        </div>
                        <h3 className="text-lg font-extrabold text-white">{task.title}</h3>
                        <p className="text-xs text-zinc-400">Session: {task.sessionName}</p>
                      </div>

                      <div className="pt-3 border-t border-[#1F2937] flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">
                          Due: {new Date(task.deadline).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => handleRestore('task', task.id, task.title)}
                          disabled={restoringId === task.id}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg"
                        >
                          {restoringId === task.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                          Restore Task
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
