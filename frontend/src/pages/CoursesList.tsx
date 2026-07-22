import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { CardSkeleton } from '../components/SkeletonLoaders';
import { EmptyState } from '../components/EmptyState';
import { Plus, FolderPlus, Key, School, GraduationCap, ArrowRight, Loader2, BookOpen, Clock, LayoutDashboard, Trash2 } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  description: string;
  courseCode: string;
  teacherName: string;
  createdAt: string;
}

export const CoursesList: React.FC = () => {
  const { user, logout } = useAuth();
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
      const endpoint = user.role === 'Teacher' ? 'teacher' : 'student';
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
      toast.success(`Course '${data.name}' created successfully!`);
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
      toast.error('Please enter a valid 6-character course code');
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
        body: JSON.stringify({ courseCode: joinCode }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to join course');
      }

      setCourses((prev) => [...prev, data]);
      setShowJoinModal(false);
      setJoinCode('');
      toast.success(`Joined group '${data.name}' successfully!`);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || 'Failed to join group');
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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete course');
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
    <div className="min-h-screen bg-[#09090B] text-zinc-100 pb-12 relative overflow-hidden">
      {/* Top Navbar */}
      <nav className="border-b border-[#24242B] bg-[#16161A]/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-violet-500" />
          <span className="text-xl font-bold tracking-tight text-white bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            LMS Platform
          </span>
        </div>
        <div className="flex items-center gap-4">
          {user?.role === 'Student' && (
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-xs text-violet-400 bg-violet-500/10 border border-violet-500/25 hover:bg-violet-500/15 py-1.5 px-3 rounded-full font-semibold transition-all"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              My Dashboard
            </Link>
          )}
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800/40 border border-zinc-700/30 rounded-full text-xs text-zinc-400 font-medium">
            {user?.role === 'Teacher' ? (
              <School className="w-3.5 h-3.5 text-indigo-400" />
            ) : (
              <GraduationCap className="w-3.5 h-3.5 text-violet-400" />
            )}
            {user?.name}
          </div>
          <button
            onClick={logout}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 mt-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Your Groups</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Select a group to view lessons, submissions, and tasks.
            </p>
          </div>
          <div>
            {user?.role === 'Teacher' ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-5 rounded-lg shadow-lg hover:shadow-violet-900/20 transition-all"
              >
                <Plus className="w-5 h-5" />
                Create Group
              </button>
            ) : (
              courses.length === 0 && (
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-5 rounded-lg shadow-lg hover:shadow-violet-900/20 transition-all"
                >
                  <Key className="w-4 h-4" />
                  Join Group
                </button>
              )
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-800/50 text-red-200 rounded-lg text-sm">
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
            icon={<BookOpen className="w-8 h-8 text-violet-400" />}
            title="No Groups Found"
            description={
              user?.role === 'Teacher'
                ? "No programming groups created yet. Create a group to invite your students."
                : "You aren't enrolled in any programming group yet. Enter a group code from your teacher to join."
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
                className="bg-[#16161A] border border-[#24242B] hover:border-violet-500/50 rounded-2xl p-6 cursor-pointer shadow-lg hover:shadow-violet-950/10 transition-all group relative overflow-hidden flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-full blur-2xl pointer-events-none group-hover:bg-violet-600/10 transition-all" />

                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-violet-400 transition-colors">
                      {course.name}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs bg-zinc-800 border border-zinc-700/50 text-zinc-300 font-bold uppercase tracking-wider py-1 px-2.5 rounded-lg">
                        {course.courseCode}
                      </span>
                      {user?.role === 'Teacher' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCourseToDelete(course);
                          }}
                          className="p-1.5 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                          title="Delete Group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-zinc-400 text-xs leading-relaxed line-clamp-3 mb-6 min-h-[3.25rem]">
                    {course.description || 'No description provided.'}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-[#24242B] pt-4 mt-auto">
                  <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Created {new Date(course.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-violet-400 group-hover:text-violet-300 transition-colors">
                    Enter Group
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={!!courseToDelete}
          title={`Delete Group '${courseToDelete?.name}'`}
          message="Are you sure you want to delete this group? All associated sessions, tasks, and student submissions will be permanently removed. This action cannot be undone."
          confirmText="Delete Group"
          loading={deleteLoading}
          onConfirm={handleDeleteCourse}
          onClose={() => setCourseToDelete(null)}
        />
      </div>

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#16161A] border border-[#24242B] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h2 className="text-xl font-bold text-white mb-4">Create New Group</h2>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="w-full bg-[#1F1F24] border border-[#2F2F37] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all placeholder-zinc-600"
                  placeholder="e.g. Python Fundamentals - Group A"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={newCourseDesc}
                  onChange={(e) => setNewCourseDesc(e.target.value)}
                  className="w-full bg-[#1F1F24] border border-[#2F2F37] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all placeholder-zinc-600 min-h-[80px]"
                  placeholder="Brief summary of the course topics, schedule, and expectations..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="bg-[#1F1F24] border border-[#2F2F37] text-zinc-400 hover:text-white rounded-lg py-2 px-4 text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transition-all disabled:opacity-50"
                >
                  {createLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <FolderPlus className="w-4 h-4" />
                      Create
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Course Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#16161A] border border-[#24242B] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h2 className="text-xl font-bold text-white mb-4">Join Group</h2>
            <form onSubmit={handleJoinCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Group Code
                </label>
                <input
                  type="text"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full bg-[#1F1F24] border border-[#2F2F37] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all placeholder-zinc-600 uppercase tracking-widest text-center text-lg font-bold"
                  placeholder="AB12CD"
                  maxLength={6}
                />
              </div>
              <p className="text-xs text-zinc-400 text-center">
                Ask your instructor for the 6-character code to register in the group.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="bg-[#1F1F24] border border-[#2F2F37] text-zinc-400 hover:text-white rounded-lg py-2 px-4 text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joinLoading}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transition-all disabled:opacity-50"
                >
                  {joinLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      Join
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
