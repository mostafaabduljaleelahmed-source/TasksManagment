import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTranslation } from '../utils/i18n';
import {
  Inbox, Search, ArrowRight, ArrowLeft, RefreshCw, CheckCircle2, AlertTriangle
} from 'lucide-react';

interface PendingSubmission {
  submissionId: string;
  studentId: string;
  studentName: string;
  studentRegisterId?: string;
  studentAvatarUrl?: string | null;
  taskId: string;
  taskTitle: string;
  language?: string;
  description?: string;
  maxGrade: number;
  deadline?: string;
  groupName: string;
  submittedAt: string;
  attemptNumber: number;
  code: string;
}

export const TeacherPendingReviews: React.FC = () => {
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const { lang, isRtl } = useTranslation();
  const navigate = useNavigate();

  const [pendingQueue, setPendingQueue] = useState<PendingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('ALL');

  useEffect(() => {
    fetchPendingQueue();
  }, [user]);

  const fetchPendingQueue = async () => {
    if (!user || !user.token) return;
    setLoading(true);
    setFetchError(null);
    try {
      const response = await fetch(`${API_URL}/dashboard/teacher/pending-reviews?sortBy=newest`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (response.ok) {
        const data: PendingSubmission[] = await response.json();
        setPendingQueue(data);
      } else {
        const errText = lang === 'ar' ? 'فشل تحميل قائمة التقييمات المعلقة من الخادم' : 'Failed to load evaluation queue from server';
        setFetchError(errText);
        toastError(errText);
      }
    } catch (err) {
      console.error('Error fetching pending queue:', err);
      const connText = lang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Server connection error';
      setFetchError(connText);
      toastError(connText);
    } finally {
      setLoading(false);
    }
  };

  const coursesList = Array.from(new Set(pendingQueue.map(item => item.groupName || 'Unassigned')));

  const filteredQueue = pendingQueue.filter(item => {
    const matchesSearch =
      item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.studentRegisterId && item.studentRegisterId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.taskTitle.toLowerCase().includes(searchQuery.toLowerCase());
    
    const courseIdentifier = item.groupName || 'Unassigned';
    const matchesCourse = selectedCourse === 'ALL' || courseIdentifier === selectedCourse;

    return matchesSearch && matchesCourse;
  });

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto px-2 sm:px-4 py-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1B2333] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {lang === 'ar' ? 'مراجعة التسليمات المعلقة' : 'Evaluation Queue'}
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded">
              {pendingQueue.length} {lang === 'ar' ? 'في الانتظار' : 'Pending'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'ar'
              ? 'سجل التقييم اليدوي المستمر لتكاليف الطلاب المعلقة'
              : 'Continuous manual review and feedback work queue'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingQueue.length > 0 && (
            <button
              onClick={() => navigate(`/review-submission/${pendingQueue[0].submissionId}`)}
              className="academic-button-primary"
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'بدء التقييم المتتابع' : 'Start Review Queue'}</span>
            </button>
          )}
          <button
            onClick={fetchPendingQueue}
            className="academic-button-secondary"
            title={lang === 'ar' ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={lang === 'ar' ? 'البحث باسم الطالب أو المهمة...' : 'Search student or task...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="academic-input pl-8"
          />
        </div>

        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="academic-input sm:w-56"
        >
          <option value="ALL">{lang === 'ar' ? 'جميع المقررات / المجموعات' : 'All Courses / Groups'}</option>
          {coursesList.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Queue Work Table */}
      <div className="academic-surface rounded-lg overflow-hidden border border-[#1B2333]">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
            <span>{lang === 'ar' ? 'جاري تحميل قائمة التقييم...' : 'Loading evaluation queue...'}</span>
          </div>
        ) : fetchError ? (
          <div className="p-8 text-center space-y-2">
            <AlertTriangle className="w-8 h-8 mx-auto text-rose-400" />
            <p className="text-xs font-semibold text-rose-300">{fetchError}</p>
            <button onClick={fetchPendingQueue} className="academic-button-secondary py-1 px-3 text-xs mx-auto">
              {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400/80" />
            <p className="text-xs font-semibold text-slate-300">
              {lang === 'ar' ? 'لا توجد تسليمات معلقة للتقييم' : 'Evaluation Queue Clear'}
            </p>
            <p className="text-[11px] text-slate-500">
              {lang === 'ar' ? 'جميع تسليمات الطلاب تم تقييمها بنجاح' : 'All submitted student tasks have been evaluated'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="academic-table">
              <thead>
                <tr>
                  <th>{lang === 'ar' ? 'الطالب' : 'Student'}</th>
                  <th>{lang === 'ar' ? 'المهمة البرمجية' : 'Task'}</th>
                  <th>{lang === 'ar' ? 'المقرر / المجموعة' : 'Course / Group'}</th>
                  <th>{lang === 'ar' ? 'المحاولة' : 'Attempt'}</th>
                  <th>{lang === 'ar' ? 'تاريخ التسليم' : 'Submitted At'}</th>
                  <th className="text-right">{lang === 'ar' ? 'الإجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.map((item) => (
                  <tr key={item.submissionId}>
                    <td>
                      <div className="font-semibold text-slate-100">{item.studentName}</div>
                      <div className="text-[11px] font-mono text-slate-500">ID: {item.studentRegisterId || '-'}</div>
                    </td>
                    <td>
                      <div className="font-medium text-slate-200">{item.taskTitle}</div>
                    </td>
                    <td>
                      <span className="px-2 py-0.5 text-[11px] font-mono font-medium bg-[#161C29] text-slate-300 border border-[#232F45] rounded">
                        {item.groupName}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-mono font-semibold text-amber-400">
                        #{item.attemptNumber}
                      </span>
                    </td>
                    <td className="text-slate-400 text-xs font-mono">
                      {new Date(item.submittedAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => navigate(`/review-submission/${item.submissionId}`)}
                        className="academic-button-primary py-1 px-3"
                      >
                        <span>{lang === 'ar' ? 'تقييم' : 'Evaluate'}</span>
                        {isRtl ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
