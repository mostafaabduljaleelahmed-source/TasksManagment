import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { CardSkeleton } from '../components/SkeletonLoaders';
import { EmptyState } from '../components/EmptyState';
import { Plus, Key, Clock, Trash2, BookOpen, Loader2, Archive, Users, Settings, Edit, Copy, CheckCircle } from 'lucide-react';

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

  // Course deletion & editing state
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editLoading, setEditLoading] = useState(false);

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
      toast.success('Course archived.');
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
      toast.success(`Joined course '${data.name}' successfully!`);
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
      toast.success(`Course '${courseToDelete.name}' deleted successfully.`);
      setCourseToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Error deleting course');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleOpenEditModal = (c: Course) => {
    setCourseToEdit(c);
    setEditName(c.name);
    setEditDesc(c.description || '');
    setEditCode(c.courseCode);
  };

  const handleEditCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseToEdit || !editName.trim()) return;
    setEditLoading(true);
    try {
      const res = await fetch(`${API_URL}/courses/${courseToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim(),
          courseCode: editCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update course');

      toast.success('Course settings updated!');
      setCourseToEdit(null);
      fetchCourses();
    } catch (err: any) {
      toast.error(err.message || 'Error updating course');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDuplicateCourse = async (courseId: string) => {
    try {
      const res = await fetch(`${API_URL}/courses/${courseId}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to duplicate course');

      toast.success('Course duplicated successfully!');
      fetchCourses();
    } catch (err: any) {
      toast.error(err.message || 'Error duplicating course');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E2519] pb-6">
        <div>
          <span className="field-label text-primary-400">
            {courses.length > 0 ? `${courses.length} active` : 'Workspace'}
          </span>
          <h1 className="text-3xl font-bold text-white tracking-tight mt-1">My Courses</h1>
        </div>

        <div>
          {user?.role === 'Admin' ? (
            <div className="flex flex-wrap items-center gap-3">
              {courses.length > 0 && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="academic-button-primary"
                >
                  <Plus className="w-4 h-4" />
                  Create Course
                </button>
              )}
              <Link to="/admin/users" className="academic-button-secondary py-2.5 px-4">
                <Users className="w-4 h-4 text-primary-400" />
                User Management
              </Link>
              <Link to="/admin/settings" className="academic-button-secondary py-2.5 px-4">
                <Settings className="w-4 h-4 text-primary-400" />
                System Settings
              </Link>
            </div>
          ) : courses.length === 0 ? null : user?.role === 'Teacher' ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="academic-button-primary"
            >
              <Plus className="w-4 h-4" />
              Create Course
            </button>
          ) : (
            <button
              onClick={() => setShowJoinModal(true)}
              className="academic-button-primary"
            >
              <Key className="w-4 h-4" />
              Join Course
            </button>
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
          icon={<BookOpen className="w-8 h-8 text-primary-400" />}
          title="No Courses Found"
          description={
            user?.role === 'Student'
              ? "You aren't enrolled in any course yet. Enter a course code from your teacher to join."
              : "No courses created yet. Create a course to invite your students."
          }
          actionLabel={user?.role === 'Student' ? 'Join Course' : 'Create Course'}
          onAction={() => (user?.role === 'Student' ? setShowJoinModal(true) : setShowCreateModal(true))}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, idx) => (
            <div
              key={course.id}
              onClick={() => navigate(`/course/${course.id}`)}
              style={{ animationDelay: `${Math.min(idx, 8) * 0.05}s` }}
              className="animate-rise-in bg-[#12160F] border border-[#1E2519] hover:border-primary-500/40 rounded-xl p-6 cursor-pointer shadow-field-md hover:shadow-field-glow hover:-translate-y-0.5 hover:bg-[#1A2016] transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-md bg-primary-500/12 border border-primary-500/25 text-primary-400 font-bold text-sm flex items-center justify-center shrink-0">
                      {course.name.trim().charAt(0).toUpperCase() || '?'}
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight group-hover:text-primary-400 transition-colors truncate">
                      {course.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigator.clipboard.writeText(course.courseCode);
                        toast.success(`Copied course code '${course.courseCode}' to clipboard!`);
                      }}
                      title="Click to copy course code"
                      className="text-[11px] bg-[#1A2016] hover:bg-[#212B1E] border border-[#37452E] text-primary-400 font-mono font-bold py-1 px-2.5 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <span>{course.courseCode}</span>
                      <Copy className="w-3 h-3 opacity-70" />
                    </button>
                    {user?.role === 'Student' && (
                      <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Joined
                      </span>
                    )}

                    {(user?.role === 'Teacher' || user?.role === 'Admin') && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(course);
                          }}
                          className="p-1 hover:bg-primary-500/20 text-sage-400 hover:text-primary-400 rounded-lg transition-colors"
                          title="Edit Course Settings"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateCourse(course.id);
                          }}
                          className="p-1 hover:bg-primary-500/20 text-sage-400 hover:text-primary-400 rounded-lg transition-colors"
                          title="Duplicate Course"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveCourse(course.id);
                          }}
                          className="p-1 hover:bg-amber-500/20 text-sage-400 hover:text-amber-400 rounded-lg transition-colors"
                          title="Archive Course"
                        >
                          <Archive className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCourseToDelete(course);
                          }}
                          className="p-1 hover:bg-red-500/20 text-sage-400 hover:text-red-400 rounded-lg transition-colors"
                          title="Delete Course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-sage-400 text-xs leading-relaxed line-clamp-3 mb-6 min-h-[3rem]">
                  {course.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-[#1E2519] pt-4 mt-auto">
                <div className="flex items-center gap-2 text-[11px] text-sage-500 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(course.createdAt).toLocaleDateString()}</span>
                </div>
                <span className="text-xs font-bold text-primary-400 group-hover:translate-x-1 transition-transform">
                  Open Course &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12160F] border-t sm:border border-[#1E2519] rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white">Create Course</h3>
              <p className="text-xs text-sage-400 mt-1">Set up a new programming class for your students.</p>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-sage-300 mb-1.5">Course Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Python Tuesday 12-2"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="academic-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sage-300 mb-1.5">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Short overview of syllabus topics..."
                  value={newCourseDesc}
                  onChange={(e) => setNewCourseDesc(e.target.value)}
                  className="academic-input resize-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="academic-button-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="academic-button-primary"
                >
                  {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Course Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12160F] border-t sm:border border-[#1E2519] rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white">Join Course</h3>
              <p className="text-xs text-sage-400 mt-1">Enter the course code provided by your instructor.</p>
            </div>

            <form onSubmit={handleJoinCourse} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-sage-300 mb-1.5">Course Code</label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  placeholder="e.g. 7F2K9X"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="academic-input font-mono uppercase text-left"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="academic-button-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joinLoading}
                  className="academic-button-primary"
                >
                  {joinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Edit Group Modal */}
      {courseToEdit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12160F] border-t sm:border border-[#1E2519] rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white">Edit Course Settings</h3>
              <p className="text-xs text-sage-400 mt-1">Update course name, description, or join code.</p>
            </div>

            <form onSubmit={handleEditCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-sage-300 mb-1.5">Course Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="academic-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sage-300 mb-1.5">Join Code</label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="academic-input font-mono uppercase text-left"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sage-300 mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="academic-input resize-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCourseToEdit(null)}
                  className="academic-button-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="academic-button-primary"
                >
                  {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
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
          title="Delete Course"
          message={`Are you sure you want to delete course '${courseToDelete.name}'? All assignments and student submissions will be permanently removed.`}
          confirmText="Delete Course"
          danger
          loading={deleteLoading}
          onConfirm={handleDeleteCourse}
          onClose={() => setCourseToDelete(null)}
        />
      )}
    </div>
  );
};
