import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTranslation } from '../utils/i18n';
import { Navbar } from '../components/Navbar';
import { School, BookOpen, Users, Award, FileText, Camera, Trash2, Loader2 } from 'lucide-react';

interface TeacherProfileData {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
  joinedAt: string;
  coursesCount: number;
  sessionsCount: number;
  totalStudents: number;
  totalAssignments: number;
  averageStudentGrade: number;
  courses: Array<{
    id: string;
    name: string;
    courseCode: string;
    createdAt: string;
  }>;
}

export const TeacherProfile: React.FC = () => {
  const { user, updateUserAvatar } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();

  const [data, setData] = useState<TeacherProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTeacherData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/profile/teacher/${user.id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!response.ok) throw new Error('Failed to load teacher profile');
      const resData = await response.json();
      setData(resData);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherData();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert file to base64 for portable storage
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
        setData((prev) => (prev ? { ...prev, avatarUrl: base64Url } : null));
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
      setData((prev) => (prev ? { ...prev, avatarUrl: null } : null));
      toast.success(t('removePhoto') + ' success!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
    : 'TC';

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-violet-500 mb-3" />
            <p className="text-sm text-zinc-400">{t('loading')}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Header Banner Card */}
            <div className="bg-[#121215] border border-[#24242B] rounded-2xl p-8 shadow-xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center border-2 border-violet-400/40 overflow-hidden shadow-xl">
                  {data?.avatarUrl ? (
                    <img src={data.avatarUrl} alt={data.name} className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <label className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                  <Camera className="w-6 h-6" />
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>

              <div className="flex-1 text-center md:text-right space-y-1">
                <h1 className="text-2xl font-extrabold text-white flex items-center justify-center md:justify-start gap-2">
                  {data?.name}
                  <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2.5 py-0.5 rounded-lg font-bold border border-indigo-500/30">
                    {t('teacher')}
                  </span>
                </h1>
                <p className="text-xs text-zinc-400">{data?.email}</p>
                <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
                  <label className="px-3 py-1.5 bg-[#1F1F26] hover:bg-[#2B2B36] border border-[#2B2B36] rounded-xl text-xs text-zinc-300 hover:text-white cursor-pointer transition-colors flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-violet-400" />
                    <span>{t('uploadPhoto')}</span>
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                  {data?.avatarUrl && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-xs text-red-400 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('removePhoto')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Teacher Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#121215] border border-[#24242B] rounded-2xl p-5 shadow-lg space-y-1">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-semibold">{t('myCourses')}</span>
                  <BookOpen className="w-4 h-4 text-violet-400" />
                </div>
                <div className="text-2xl font-black text-white">{data?.coursesCount}</div>
              </div>

              <div className="bg-[#121215] border border-[#24242B] rounded-2xl p-5 shadow-lg space-y-1">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-semibold">{t('totalStudentsTaught')}</span>
                  <Users className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl font-black text-white">{data?.totalStudents}</div>
              </div>

              <div className="bg-[#121215] border border-[#24242B] rounded-2xl p-5 shadow-lg space-y-1">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-semibold">{t('assignedTasks')}</span>
                  <FileText className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white">{data?.totalAssignments}</div>
              </div>

              <div className="bg-[#121215] border border-[#24242B] rounded-2xl p-5 shadow-lg space-y-1">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-semibold">{t('averageGrade')}</span>
                  <Award className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400">{data?.averageStudentGrade}%</div>
              </div>
            </div>

            {/* Courses List Section */}
            <div className="bg-[#121215] border border-[#24242B] rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <School className="w-5 h-5 text-violet-400" />
                {t('myCourses')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data?.courses.map((course) => (
                  <div key={course.id} className="p-4 bg-[#1A1A20] border border-[#292933] rounded-xl flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm">{course.name}</h3>
                      <p className="text-xs text-zinc-400 mt-1">{t('courseCode')}: {course.courseCode}</p>
                    </div>
                    <Link
                      to={`/course/${course.id}/members`}
                      className="px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 rounded-xl text-xs font-semibold transition-colors"
                    >
                      {t('members')}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
