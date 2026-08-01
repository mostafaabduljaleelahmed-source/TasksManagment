import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTranslation } from '../utils/i18n';
import { MetricsSkeleton } from '../components/SkeletonLoaders';
import { EmptyState } from '../components/EmptyState';
import {
  User, Mail, Shield, Award, CheckCircle2, Clock, FileCode,
  Eye, X, Camera, Trash2
} from 'lucide-react';

interface StudentProfileData {
  studentInfo: {
    id: string;
    name: string;
    email: string;
    studentRegisterId: string;
    role: string;
    avatarUrl?: string | null;
  };
  metrics: {
    enrolledCoursesCount: number;
    completedTasks: number;
    totalAssignedTasks: number;
    completionRate: number;
    averageGrade: number;
    totalSubmissionsCount: number;
  };
  enrolledCourses: Array<{
    courseId: string;
    courseName: string;
    courseCode: string;
  }>;
  history: Array<{
    submissionId: string;
    taskId: string;
    taskTitle: string;
    maxGrade: number;
    grade: number;
    teacherFeedback: string;
    submittedAt: string;
    attemptNumber: number;
    code: string;
  }>;
}

export const StudentProfile: React.FC = () => {
  const { user, updateUserAvatar } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();

  const [profileData, setProfileData] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected code viewing modal
  const [selectedSubmissionCode, setSelectedSubmissionCode] = useState<{
    taskTitle: string;
    code: string;
    grade: number;
    maxGrade: number;
    feedback: string;
    attemptNumber: number;
    submittedAt: string;
  } | null>(null);

  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/dashboard/student/profile`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!response.ok) throw new Error('Failed to load student profile');
      const data = await response.json();
      setProfileData(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Url = reader.result as string;
      try {
        const response = await fetch(`${API_URL}/profile/avatar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user?.token}`,
          },
          body: JSON.stringify({ avatarUrl: base64Url }),
        });

        if (!response.ok) throw new Error('Failed to upload avatar');

        updateUserAvatar(base64Url);
        setProfileData((prev) =>
          prev
            ? {
                ...prev,
                studentInfo: { ...prev.studentInfo, avatarUrl: base64Url },
              }
            : null
        );
        toast.success(t('profilePicture') + ' updated!');
      } catch (err: any) {
        toast.error(err.message);
      }
    };
  };

  const handleRemoveAvatar = async () => {
    try {
      const response = await fetch(`${API_URL}/profile/avatar`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` },
      });

      if (!response.ok) throw new Error('Failed to remove avatar');

      updateUserAvatar(null);
      setProfileData((prev) =>
        prev
          ? {
              ...prev,
              studentInfo: { ...prev.studentInfo, avatarUrl: null },
            }
          : null
      );
      toast.success(t('removePhoto') + ' success!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
    : 'ST';

  const pendingTasksCount = Math.max(
    0,
    (profileData?.metrics.totalAssignedTasks || 0) - (profileData?.metrics.completedTasks || 0)
  );

  return (
    <div className="pb-16 relative overflow-hidden space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <User className="w-8 h-8 text-violet-400" />
            {t('studentProfile')}
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
            Track your academic progress, assignment history, grades, and teacher feedback.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-950/40 border border-red-800/50 text-red-300 rounded-xl text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <MetricsSkeleton />
            <MetricsSkeleton />
            <MetricsSkeleton />
          </div>
        ) : profileData ? (
          <>
            {/* Top Row: User Info Card & Key Telemetry Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <div className="bg-[#16161A] border border-[#24242B] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center border border-violet-400/40 shadow-lg shrink-0 overflow-hidden">
                      {profileData.studentInfo.avatarUrl || user?.avatarUrl ? (
                        <img
                          src={profileData.studentInfo.avatarUrl || user?.avatarUrl || ''}
                          alt={profileData.studentInfo.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <label className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                      <Camera className="w-4 h-4" />
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">{profileData.studentInfo.name}</h2>
                    <span className="text-[10px] text-violet-300 font-semibold bg-violet-500/20 border border-violet-500/30 px-2.5 py-0.5 rounded-md inline-block mt-1">
                      {t('student')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 bg-[#1F1F26] hover:bg-[#2B2B36] border border-[#2B2B36] rounded-xl text-[11px] text-zinc-300 hover:text-white cursor-pointer transition-colors flex items-center gap-1.5">
                    <Camera className="w-3 h-3 text-violet-400" />
                    <span>{t('uploadPhoto')}</span>
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                  {(profileData.studentInfo.avatarUrl || user?.avatarUrl) && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-[11px] text-red-400 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{t('removePhoto')}</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2 border-t border-[#24242B] pt-3 text-xs">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-zinc-500" />
                      {t('email')}
                    </span>
                    <span className="text-white font-medium">{profileData.studentInfo.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-zinc-500" />
                      {t('studentId')}
                    </span>
                    <span className="text-white font-mono font-bold">{profileData.studentInfo.studentRegisterId}</span>
                  </div>
                </div>
              </div>

              {/* Metrics Breakdown Grid */}
              <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl flex flex-col justify-between shadow-xl">
                  <div className="p-2 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400 w-fit mb-2">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">{t('averageGrade')}</span>
                    <span className="text-2xl font-black text-white mt-1 block">
                      {profileData.metrics.averageGrade}%
                    </span>
                  </div>
                </div>

                <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl flex flex-col justify-between shadow-xl">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 w-fit mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">{t('completedTasks')}</span>
                    <span className="text-2xl font-black text-emerald-400 mt-1 block">
                      {profileData.metrics.completedTasks} / {profileData.metrics.totalAssignedTasks}
                    </span>
                  </div>
                </div>

                <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl flex flex-col justify-between shadow-xl">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 w-fit mb-2">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">{t('pendingTasks')}</span>
                    <span className="text-2xl font-black text-amber-400 mt-1 block">
                      {pendingTasksCount}
                    </span>
                  </div>
                </div>

                <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl flex flex-col justify-between shadow-xl">
                  <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400 w-fit mb-2">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">Total Submissions</span>
                    <span className="text-2xl font-black text-sky-400 mt-1 block">
                      {profileData.metrics.totalSubmissionsCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submission History Log Table */}
            <div className="bg-[#16161A] border border-[#24242B] rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileCode className="w-5 h-5 text-violet-400" />
                {t('submissionHistory')}
              </h2>

              {profileData.history.length === 0 ? (
                <EmptyState icon={<FileCode className="w-8 h-8 text-zinc-500" />} title="No Submissions Yet" description="Submit programming tasks to build your submission history." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#1F1F24] text-zinc-400 uppercase font-semibold border-b border-[#292933]">
                      <tr>
                        <th className="px-4 py-3">{t('taskTitle')}</th>
                        <th className="px-4 py-3">{t('attemptNumber')}</th>
                        <th className="px-4 py-3">{t('grade')}</th>
                        <th className="px-4 py-3">{t('submissionDate')}</th>
                        <th className="px-4 py-3">{t('teacherFeedback')}</th>
                        <th className="px-4 py-3">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#24242B]">
                      {profileData.history.map((h) => (
                        <tr key={h.submissionId} className="hover:bg-[#1C1C22] transition-colors">
                          <td className="px-4 py-3 font-bold text-white">{h.taskTitle}</td>
                          <td className="px-4 py-3 text-zinc-400">#{h.attemptNumber}</td>
                          <td className="px-4 py-3 font-bold text-amber-400">{h.grade} / {h.maxGrade}</td>
                          <td className="px-4 py-3 text-zinc-400">{new Date(h.submittedAt).toLocaleString()}</td>
                          <td className="px-4 py-3 text-zinc-300 max-w-xs truncate">{h.teacherFeedback || '-'}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() =>
                                setSelectedSubmissionCode({
                                  taskTitle: h.taskTitle,
                                  code: h.code,
                                  grade: h.grade,
                                  maxGrade: h.maxGrade,
                                  feedback: h.teacherFeedback,
                                  attemptNumber: h.attemptNumber,
                                  submittedAt: h.submittedAt,
                                })
                              }
                              className="px-2.5 py-1 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Code Inspection Modal */}
            {selectedSubmissionCode && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="w-full max-w-3xl bg-[#16161A] border border-[#24242B] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-[#24242B] bg-[#1E1E24]">
                    <div>
                      <h3 className="text-base font-bold text-white">{selectedSubmissionCode.taskTitle}</h3>
                      <p className="text-xs text-zinc-400">Attempt #{selectedSubmissionCode.attemptNumber} | {new Date(selectedSubmissionCode.submittedAt).toLocaleString()}</p>
                    </div>
                    <button onClick={() => setSelectedSubmissionCode(null)} className="p-2 text-zinc-400 hover:text-white rounded-lg">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-4 bg-[#0E0E11] font-mono text-xs text-emerald-300 overflow-y-auto flex-1 whitespace-pre-wrap">
                    {selectedSubmissionCode.code}
                  </div>
                  <div className="p-4 border-t border-[#24242B] bg-[#1A1A20] flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-400">Grade: {selectedSubmissionCode.grade} / {selectedSubmissionCode.maxGrade}</span>
                    <span className="text-zinc-300">Feedback: {selectedSubmissionCode.feedback || 'None'}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
    </div>
  );
};
