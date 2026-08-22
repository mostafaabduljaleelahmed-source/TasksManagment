import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useTranslation } from '../utils/i18n';
import {
  Inbox, BookOpen, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle
} from 'lucide-react';

interface UrgentQueueItem {
  submissionId: string;
  studentName: string;
  taskTitle: string;
  groupName: string;
  submittedAt: string;
}

interface CourseItem {
  id: string;
  name: string;
  courseCode: string;
  studentsCount: number;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { lang, isRtl } = useTranslation();
  const navigate = useNavigate();

  const [urgentQueue, setUrgentQueue] = useState<UrgentQueueItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user || !user.token) return;
    setLoading(true);
    setFetchError(null);
    try {
      const isTeacherOrAdmin = user.role === 'Teacher' || user.role === 'Admin';
      const courseEndpoint = isTeacherOrAdmin ? `${API_URL}/courses/teacher` : `${API_URL}/courses/student`;

      const promises: [Promise<Response>, Promise<Response>?] = [fetch(courseEndpoint, { headers: { Authorization: `Bearer ${user.token}` } })];
      if (isTeacherOrAdmin) {
        promises.push(fetch(`${API_URL}/dashboard/teacher/pending-reviews?sortBy=newest`, { headers: { Authorization: `Bearer ${user.token}` } }));
      }

      const [coursesRes, queueRes] = await Promise.all(promises);

      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(coursesData);
      }

      if (queueRes && queueRes.ok) {
        const queueData = await queueRes.json();
        setUrgentQueue(queueData.slice(0, 5));
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setFetchError(lang === 'ar' ? 'خطأ في تحميل بيانات لوحة التحكّم' : 'Error loading dashboard telemetry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto px-2 sm:px-4 py-3">
      {/* Header */}
      <div className="border-b border-[#1B2333] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {lang === 'ar' ? 'لوحة المتابعة الأكاديمية' : 'Faculty Overview'}
          </h1>
          <p className="text-xs text-slate-400">
            {lang === 'ar' ? 'نظرة عامة على مهام التقييم والمقررات الدراسية النشطة' : 'Active courses, urgent evaluations, and submission stream'}
          </p>
        </div>

        {user?.role === 'Teacher' && (
          <button
            onClick={() => navigate('/teacher/pending-reviews')}
            className="academic-button-primary"
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'فتح جدول التقييمات المعلقة' : 'Open Review Queue'}</span>
          </button>
        )}
      </div>

      {fetchError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button onClick={fetchDashboardData} className="academic-button-secondary py-1 px-2.5 text-[11px]">
            {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      )}

      {/* Priority 1: Pending Evaluation Queue Panel (Teachers/Admins) */}
      {(user?.role === 'Teacher' || user?.role === 'Admin') && (
        <div className="academic-surface rounded-lg border border-[#1B2333]">
          <div className="p-3 border-b border-[#1B2333] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                {lang === 'ar' ? 'التسليمات التي تتطلب تقييماً عاجلاً' : 'Urgent Evaluation Items'}
              </h2>
            </div>
            <button
              onClick={() => navigate('/teacher/pending-reviews')}
              className="text-[11px] text-blue-400 hover:underline font-semibold"
            >
              {lang === 'ar' ? 'عرض الكل' : 'View All'} ({urgentQueue.length})
            </button>
          </div>

          {loading ? (
            <div className="p-6 text-center text-xs text-slate-500">
              {lang === 'ar' ? 'جاري التحميل...' : 'Loading priority items...'}
            </div>
          ) : urgentQueue.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 space-y-1">
              <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-400" />
              <p className="font-semibold text-slate-300">
                {lang === 'ar' ? 'لا توجد تسليمات تنتظر التقييم' : 'Queue Empty'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#141A28]">
              {urgentQueue.map((item) => (
                <div key={item.submissionId} className="p-3 flex items-center justify-between hover:bg-[#161C2A] transition-colors">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">{item.studentName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#161C29] border border-[#232F45] text-slate-300 rounded">
                        {item.groupName}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">{item.taskTitle}</div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                      {new Date(item.submittedAt).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <button
                      onClick={() => navigate(`/review-submission/${item.submissionId}`)}
                      className="academic-button-secondary py-1 px-2.5 text-[11px]"
                    >
                      <span>{lang === 'ar' ? 'تقييم' : 'Grade'}</span>
                      {isRtl ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Priority 2: Active Courses Matrix */}
      <div className="academic-surface rounded-lg border border-[#1B2333]">
        <div className="p-3 border-b border-[#1B2333] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              {lang === 'ar' ? 'المقررات الدراسية النشطة' : 'Active Courses Roster'}
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="academic-table">
            <thead>
              <tr>
                <th>{lang === 'ar' ? 'رمز المقرر' : 'Code'}</th>
                <th>{lang === 'ar' ? 'اسم المقرر' : 'Course Name'}</th>
                <th>{lang === 'ar' ? 'الطلاب المسجلون' : 'Enrolled Students'}</th>
                <th className="text-right">{lang === 'ar' ? 'الإجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id}>
                  <td className="font-mono font-semibold text-blue-400">{course.courseCode}</td>
                  <td className="font-semibold text-white">{course.name}</td>
                  <td className="font-mono text-slate-300">{course.studentsCount}</td>
                  <td className="text-right">
                    <button
                      onClick={() => navigate(`/course/${course.id}`)}
                      className="academic-button-secondary py-1 px-3"
                    >
                      <span>{lang === 'ar' ? 'تفاصيل المقرر' : 'View Course'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
