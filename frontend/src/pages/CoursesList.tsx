import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { CardSkeleton } from '../components/SkeletonLoaders';
import { EmptyState } from '../components/EmptyState';
import { Plus, Key, Clock, Trash2, BookOpen, Loader2, Archive, Users, Settings } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  description: string;
  courseCode: string;
  teacherName: string;
  createdAt: string;
}

export const CoursesList: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals / forms state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  // Course deletion state
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCourses = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const endpoint = (user.role === 'Teacher' || user.role === 'Admin') ? 'teacher' : 'student';
      const response = await fetch(`${API_URL}/courses/${endpoint}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to load courses');
      }
      const data = await response.json();
      setCourses(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [user]);

  const handleArchiveCourse = async (courseId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/archive/course/${courseId}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error('Failed to archive course');
      toast.success('Course group archived.');
      fetchCourses();
    } catch (err: any) {
      toast.error(err.message || 'Error archiving course');
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) {
      toast.error('Please enter a valid course name');
      return;
    }
    setCreateLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ name: newCourseName, description: newCourseDesc }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create course');
      }

      setCourses((prev) => [data, ...prev]);
      setShowCreateModal(false);
      setNewCourseName('');
      setNewCourseDesc('');
      toast.success(`Group '${data.name}' created successfully!`);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || 'Failed to create course');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error('Please enter a course code');
      return;
    }
    setJoinLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/courses/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ courseCode: joinCode.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to join course');
      }

      setCourses((prev) => [data, ...prev]);
      setShowJoinModal(false);
      setJoinCode('');
      toast.success(`Joined group '${data.name}' successfully!`);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || 'Failed to join course');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    setDeleteLoading(true);
    try {
      const response = await fetch(`${API_URL}/courses/${courseToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || data?.details || 'Failed to delete course');
      }

      setCourses((prev) => prev.filter((c) => c.id !== courseToDelete.id));
      toast.success(`Group '${courseToDelete.name}' deleted successfully.`);
      setCourseToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Error deleting group');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F2937] pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Teaching Groups</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage your classroom groups, syllabus lessons, and assignments.
          </p>
        </div>

        <div>
          {user?.role === 'Admin' ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="saas-button-primary"
              >
                <Plus className="w-4 h-4" />
                Create Course
              </button>
              <Link
                to="/admin/users"
                className="px-4 py-2.5 bg-[#1F2937] hover:bg-[#374151] text-zinc-200 border border-[#374151] rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
              >
                <Users className="w-4 h-4 text-violet-400" />
                User Management
              </Link>
              <Link
                to="/admin/settings"
                className="px-4 py-2.5 bg-[#1F2937] hover:bg-[#374151] text-zinc-200 border border-[#374151] rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
              >
                <Settings className="w-4 h-4 text-violet-400" />
                System Settings
              </Link>
            </div>
          ) : user?.role === 'Teacher' ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="saas-button-primary"
            >
              <Plus className="w-4 h-4" />
              Create Group
            </button>
          ) : (
            courses.length === 0 && (
              <button
                onClick={() => setShowJoinModal(true)}
                className="saas-button-primary"
              >
                <Key className="w-4 h-4" />
                Join Group
              </button>
            )
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-8 h-8 text-blue-400" />}
          title="No Groups Found"
          description={
            user?.role === 'Teacher'
              ? "No teaching groups created yet. Create a group to invite your students."
              : "You aren't enrolled in any group yet. Enter a group code from your teacher to join."
          }
          actionLabel={user?.role === 'Teacher' ? 'Create Group' : 'Join Group'}
          onAction={() => (user?.role === 'Teacher' ? setShowCreateModal(true) : setShowJoinModal(true))}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              onClick={() => navigate(`/course/${course.id}`)}
              className="bg-[#111827] border border-[#1F2937] hover:border-blue-500/40 rounded-2xl p-6 cursor-pointer shadow-xl hover:bg-[#1A2234] transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors">
                    {course.name}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigator.clipboard.writeText(course.courseCode);
                        toast.success(`Copied group code '${course.courseCode}' to clipboard!`);
                      }}
                      title="Click to copy group code"
                      className="text-[11px] bg-[#1F2937] hover:bg-[#374151] border border-[#374151] text-blue-400 font-mono font-bold py-1 px-2.5 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <span>{course.courseCode}</span>
                      <span className="text-[10px] opacity-70">📋</span>
                    </button>
                    {user?.role === 'Teacher' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveCourse(course.id);
                          }}
                          className="p-1 hover:bg-amber-500/20 text-zinc-500 hover:text-amber-400 rounded-lg transition-colors"
                          title="Archive Group"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCourseToDelete(course);
                          }}
                          className="p-1 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                          title="Delete Group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-zinc-400 text-xs leading-relaxed line-clamp-3 mb-6 min-h-[3rem]">
                  {course.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-[#1F2937] pt-4 mt-auto">
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(course.createdAt).toLocaleDateString()}</span>
                </div>
                <span className="text-xs font-bold text-blue-400 group-hover:translate-x-1 transition-transform">
                  Open Group &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111827] border-t sm:border border-[#1F2937] rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white">Create Teaching Group</h3>
              <p className="text-xs text-zinc-400 mt-1">Set up a new programming class for your students.</p>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">Group Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Python Tuesday 12-2"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="saas-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Short overview of syllabus topics..."
                  value={newCourseDesc}
                  onChange={(e) => setNewCourseDesc(e.target.value)}
                  className="saas-input resize-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="saas-button-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="saas-button-primary"
                >
                  {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Course Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111827] border-t sm:border border-[#1F2937] rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white">Join Group</h3>
              <p className="text-xs text-zinc-400 mt-1">Enter the group code provided by your instructor.</p>
            </div>

            <form onSubmit={handleJoinCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">Group Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS101-ABC"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="saas-input font-mono uppercase"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="saas-button-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joinLoading}
                  className="saas-button-primary"
                >
                  {joinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Delete Confirmation Modal */}
      {courseToDelete && (
        <ConfirmModal
          isOpen={!!courseToDelete}
          title="Delete Group"
          message={`Are you sure you want to delete group '${courseToDelete.name}'? All assignments and student submissions will be permanently removed.`}
          confirmText="Delete Group"
          danger
          loading={deleteLoading}
          onConfirm={handleDeleteCourse}
          onClose={() => setCourseToDelete(null)}
        />
      )}
    </div>
  );
};
