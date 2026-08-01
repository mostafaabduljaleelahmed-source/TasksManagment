import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useTranslation } from '../utils/i18n';
import {
  Users, Search, Filter, School, GraduationCap, Loader2, ArrowLeft, ArrowRight,
  CheckCircle2, Clock, AlertTriangle, Eye
} from 'lucide-react';
import { StudentDetailsView } from './StudentDetailsView';

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

interface CourseMembersData {
  courseId: string;
  courseName: string;
  courseCode: string;
  teacher: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  students: StudentMember[];
}

export const CourseMembers: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const { t, isRtl } = useTranslation();

  const [data, setData] = useState<CourseMembersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState<StudentMember | null>(null);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/courses/${courseId}/members`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (!response.ok) throw new Error('Failed to load course members');
      const resData = await response.json();
      setData(resData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [courseId]);

  const getFilteredAndSortedStudents = () => {
    if (!data?.students) return [];

    let result = data.students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentRegisterId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesStatus = true;
      if (statusFilter === 'Pending') {
        matchesStatus = student.pendingTasks > 0;
      } else if (statusFilter === 'Missing') {
        matchesStatus = student.missingTasks > 0;
      }

      return matchesSearch && matchesStatus;
    });

    if (statusFilter === 'HighestGrade') {
      result = [...result].sort((a, b) => b.averageGrade - a.averageGrade);
    } else if (statusFilter === 'LowestGrade') {
      result = [...result].sort((a, b) => a.averageGrade - b.averageGrade);
    }

    return result;
  };

  const filteredStudents = getFilteredAndSortedStudents();

  return (
    <div className="space-y-8">
      {/* Header Breadcrumb & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F1F26] pb-6">
          <div>
            <Link
              to={`/course/${courseId}`}
              className="inline-flex items-center gap-2 text-xs font-semibold text-violet-400 hover:text-violet-300 mb-2 transition-colors"
            >
              {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
              {t('courses')} / {data?.courseName || 'Course'}
            </Link>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
              <Users className="w-6 h-6 text-violet-500" />
              Student Management: <span className="text-violet-400">{data?.courseName}</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1">Course Code: <span className="font-mono text-zinc-200">{data?.courseCode}</span></p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-violet-500 mb-3" />
            <p className="text-sm text-zinc-400">Loading student roster...</p>
          </div>
        ) : error || !data ? (
          <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-center">
            {error || 'Course members unavailable.'}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Instructor Section Card */}
            <div className="bg-[#121215] border border-[#24242B] rounded-2xl p-6 shadow-xl">
              <h2 className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <School className="w-4 h-4 text-violet-400" />
                {t('instructor')}
              </h2>
              <div className="flex items-center gap-4 bg-[#1A1A20] p-4 border border-[#292933] rounded-xl">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-lg flex items-center justify-center border border-violet-400/30 overflow-hidden shadow-md">
                  {data.teacher.avatarUrl ? (
                    <img src={data.teacher.avatarUrl} alt={data.teacher.name} className="w-full h-full object-cover" />
                  ) : (
                    data.teacher.name.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {data.teacher.name}
                    <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border border-indigo-500/30">
                      {t('teacher')}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{data.teacher.email}</p>
                </div>
              </div>
            </div>

            {/* Student Roster Section */}
            <div className="bg-[#121215] border border-[#24242B] rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-violet-400" />
                    Enrolled Students ({filteredStudents.length})
                  </h2>
                  <p className="text-xs text-zinc-400">Click any student to view detailed submissions, grades, and teacher actions.</p>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className={`w-4 h-4 text-zinc-400 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'}`} />
                    <input
                      type="text"
                      placeholder="Search by name, ID, email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`bg-[#1A1A20] border border-[#292933] rounded-xl text-xs text-white py-2 ${isRtl ? 'pr-9 pl-4' : 'pl-9 pr-4'} focus:outline-none focus:border-violet-500 w-48 sm:w-64`}
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-[#1A1A20] border border-[#292933] px-3 py-1.5 rounded-xl text-xs">
                    <Filter className="w-3.5 h-3.5 text-violet-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-transparent text-zinc-300 focus:outline-none cursor-pointer font-bold"
                    >
                      <option value="All" className="bg-[#1A1A20]">All Students</option>
                      <option value="Pending" className="bg-[#1A1A20]">Pending Students</option>
                      <option value="Missing" className="bg-[#1A1A20]">Missing Submissions</option>
                      <option value="HighestGrade" className="bg-[#1A1A20]">Highest Grades</option>
                      <option value="LowestGrade" className="bg-[#1A1A20]">Lowest Grades</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Roster Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1A1A20] text-zinc-400 uppercase font-semibold border-b border-[#292933]">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Student ID</th>
                      <th className="px-4 py-3">Average Grade</th>
                      <th className="px-4 py-3">Completed</th>
                      <th className="px-4 py-3">Pending</th>
                      <th className="px-4 py-3">Missing</th>
                      <th className="px-4 py-3">Last Activity</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#24242B]">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                          No students match the criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student) => (
                        <tr
                          key={student.studentId}
                          onClick={() => setSelectedStudent(student)}
                          className="hover:bg-[#18181E] cursor-pointer transition-colors group"
                        >
                          {/* Student Profile & Email */}
                          <td className="px-4 py-3.5 font-medium text-white flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-violet-600 text-white font-bold text-xs flex items-center justify-center border border-violet-400/30 overflow-hidden shrink-0">
                              {student.avatarUrl ? (
                                <img src={student.avatarUrl} alt={student.name} className="w-full h-full object-cover" />
                              ) : (
                                student.name.substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-white group-hover:text-violet-300 transition-colors">{student.name}</div>
                              <div className="text-[11px] text-zinc-400">{student.email}</div>
                            </div>
                          </td>

                          {/* Student ID */}
                          <td className="px-4 py-3.5 font-mono text-zinc-300">{student.studentRegisterId}</td>

                          {/* Average Grade */}
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                              {student.averageGrade}%
                            </span>
                          </td>

                          {/* Completed Assignments */}
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {student.completedTasks}
                            </span>
                          </td>

                          {/* Pending Assignments */}
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-amber-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {student.pendingTasks}
                            </span>
                          </td>

                          {/* Missing Assignments */}
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-red-400 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> {student.missingTasks}
                            </span>
                          </td>

                          {/* Last Activity */}
                          <td className="px-4 py-3.5 text-zinc-400 font-mono text-[11px]">
                            {student.lastActivity ? new Date(student.lastActivity).toLocaleDateString() : 'N/A'}
                          </td>

                          {/* Action Button */}
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudent(student);
                              }}
                              className="px-3 py-1 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 ml-auto"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      {/* Student Details Page Modal */}
      {selectedStudent && (
        <StudentDetailsView
          courseId={courseId!}
          courseName={data?.courseName || 'Course Group'}
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onStudentRemoved={() => fetchMembers()}
        />
      )}
    </div>
  );
};
