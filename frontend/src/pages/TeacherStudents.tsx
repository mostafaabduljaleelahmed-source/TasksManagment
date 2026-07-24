import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTranslation } from '../utils/i18n';
import { Search, Filter, Loader2, KeyRound } from 'lucide-react';

interface StudentRosterItem {
  studentId: string;
  name: string;
  email: string;
  studentRegisterId: string;
  avatarUrl?: string | null;
  groupName: string;
  courseId: string;
  averageGrade: number;
  completedAssignments: number;
  pendingAssignments: number;
  lateAssignments: number;
}

export const TeacherStudents: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();

  const [students, setStudents] = useState<StudentRosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('All');

  // Reset password state
  const [resetStudent, setResetStudent] = useState<StudentRosterItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetStudent || !newPassword || newPassword.length < 4) {
      toast.error('Password must be at least 4 characters long');
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch(`${API_URL}/dashboard/teacher/students/${resetStudent.studentId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reset password');

      toast.success(`Password for '${resetStudent.name}' reset successfully.`);
      setResetStudent(null);
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Reset password error');
    } finally {
      setResetLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/dashboard/teacher/students`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error('Failed to load students roster');
      const data = await res.json();
      setStudents(data);
    } catch (err: any) {
      setError(err.message || 'Error loading students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [user]);

  const uniqueGroups = Array.from(new Set(students.map((s) => s.groupName)));

  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(term) ||
      s.studentRegisterId.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      s.groupName.toLowerCase().includes(term);

    const matchesGroup = groupFilter === 'All' || s.groupName === groupFilter;

    return matchesSearch && matchesGroup;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F2937] pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
            <span className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
              👨‍🎓
            </span>
            Students Roster ({students.length})
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Complete overview of all enrolled students across your teaching groups.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="saas-input pl-9 w-48 sm:w-64"
            />
          </div>

          {/* Group Filter */}
          <div className="flex items-center gap-2 bg-[#111827] border border-[#1F2937] px-3 py-2 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="bg-transparent text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-[#111827]">All Teaching Groups</option>
              {uniqueGroups.map((grp) => (
                <option key={grp} value={grp} className="bg-[#111827]">
                  {grp}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
          <p className="text-xs">Loading students roster...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-center text-sm">
          {error}
        </div>
      ) : (
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-[#1F2937]/50 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-[#1F2937]">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Student</th>
                  <th className="px-4 py-3.5 font-bold">Academic ID</th>
                  <th className="px-4 py-3.5 font-bold">Group</th>
                  <th className="px-4 py-3.5 font-bold">Avg Grade</th>
                  <th className="px-4 py-3.5 font-bold">Completed</th>
                  <th className="px-4 py-3.5 font-bold">Pending</th>
                  <th className="px-4 py-3.5 font-bold">Late</th>
                  <th className="px-4 py-3.5 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2937]/50">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
                      No students found matching search filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.studentId + s.courseId} className="hover:bg-[#1A2234] transition-colors">
                      <td className="px-5 py-3.5 font-medium text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center border border-blue-400/30 overflow-hidden shrink-0">
                          {s.avatarUrl ? (
                            <img src={s.avatarUrl} alt={s.name} className="w-full h-full object-cover" />
                          ) : (
                            s.name.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white">{s.name}</div>
                          <div className="text-[10px] text-zinc-400">{s.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-zinc-300">{s.studentRegisterId}</td>
                      <td className="px-4 py-3.5">
                        <Link to={`/course/${s.courseId}`} className="text-blue-400 font-semibold hover:underline">
                          {s.groupName}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                          {s.averageGrade}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                          {s.completedAssignments} Tasks
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-zinc-400 font-semibold">
                          {s.pendingAssignments} Tasks
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {s.lateAssignments > 0 ? (
                          <span className="text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                            {s.lateAssignments} Late
                          </span>
                        ) : (
                          <span className="text-zinc-500">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to="/profile"
                            className="px-3 py-1.5 bg-[#1F2937] hover:bg-[#374151] border border-[#374151] rounded-xl text-xs font-semibold text-blue-300 transition-colors inline-flex items-center gap-1"
                          >
                            Profile
                          </Link>
                          <button
                            onClick={() => setResetStudent(s)}
                            className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                            title="Reset Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                Reset Student Password
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Enter a new temporary password for <strong>{resetStudent.name}</strong> ({resetStudent.studentRegisterId}).
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">New Temporary Password</label>
                <input
                  type="text"
                  required
                  minLength={4}
                  placeholder="e.g. TempPass123"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="saas-input font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetStudent(null)}
                  className="saas-button-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="saas-button-primary"
                >
                  {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
