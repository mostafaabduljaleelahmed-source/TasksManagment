import React, { useEffect, useState } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TableRowSkeleton } from '../components/SkeletonLoaders';
import { EmptyState } from '../components/EmptyState';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { 
  Users, UserPlus, Search, GraduationCap, KeyRound, 
  Trash2, Ban, CheckCircle2, X, Eye, Loader2, RefreshCw 
} from 'lucide-react';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  studentId?: string;
  avatarUrl?: string;
  isDisabled: boolean;
  isEmailVerified: boolean;
  joinedAt: string;
}

export const UserManagement: React.FC = () => {
  const { user, createTeacher } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'Teachers' | 'Students'>('Teachers');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create Teacher Modal
  const [showCreateTeacher, setShowCreateTeacher] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [creatingTeacher, setCreatingTeacher] = useState(false);

  // Reset Password Modal
  const [resetTargetUser, setResetTargetUser] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // View Details Modal
  const [viewUser, setViewUser] = useState<any | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/users?role=${activeTab.slice(0, -1)}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      toast.error('Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeTab, user]);

  const handleCreateTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName || !teacherEmail || !teacherPassword) {
      toast.error('All fields are required.');
      return;
    }

    setCreatingTeacher(true);
    const res = await createTeacher(teacherName, teacherEmail, teacherPassword);
    setCreatingTeacher(false);

    if (res.success) {
      toast.success(res.message || 'Teacher account created successfully!');
      setShowCreateTeacher(false);
      setTeacherName('');
      setTeacherEmail('');
      setTeacherPassword('');
      fetchUsers();
    } else {
      toast.error(res.error || 'Failed to create teacher account.');
    }
  };

  const handleToggleStatus = async (targetUser: ManagedUser) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${targetUser.id}/toggle-status`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to toggle status');
      toast.success(data.message);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle status');
    }
  };

  const handleDeleteUser = async (targetUser: ManagedUser) => {
    if (!window.confirm(`Are you sure you want to delete ${targetUser.name}'s account? This action is permanent.`)) return;

    try {
      const res = await fetch(`${API_URL}/admin/users/${targetUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || data?.details || 'Failed to delete user');
      toast.success(data?.message || `User '${targetUser.name}' deleted successfully.`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }

    setResettingPassword(true);
    try {
      const res = await fetch(`${API_URL}/admin/users/${resetTargetUser.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reset password');
      toast.success(data.message);
      setResetTargetUser(null);
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleViewProfile = async (targetUser: ManagedUser) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${targetUser.id}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setViewUser(data);
      }
    } catch (err) {
      toast.error('Failed to load user profile details.');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.studentId && u.studentId.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'User Management' }]} />

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-violet-400" />
              User & Instructor Management
            </h1>
            <p className="text-xs text-zinc-400 mt-1">Govern academy teachers and student accounts, enable/disable access, or provision new instructors.</p>
          </div>

          {activeTab === 'Teachers' && (
            <button
              onClick={() => setShowCreateTeacher(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-violet-950/40"
            >
              <UserPlus className="w-4 h-4" />
              Create Teacher Account
            </button>
          )}
        </div>

        {/* Tab & Search Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121215] p-3 rounded-2xl border border-[#24242B]">
          <div className="flex items-center gap-2 bg-[#1A1A20] p-1 rounded-xl border border-[#292933]">
            <button
              onClick={() => setActiveTab('Teachers')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'Teachers'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Teachers Management
            </button>
            <button
              onClick={() => setActiveTab('Students')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'Students'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Students Roster
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={`Search ${activeTab.toLowerCase()} by name or email...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1A1A20] border border-[#292933] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-[#121215] border border-[#24242B] rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-6 space-y-3">
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
            </div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              variant="search"
              title={`No ${activeTab} Found`}
              description={`We could not find any ${activeTab.toLowerCase()} matching your filter criteria.`}
            />
          ) : (
            <div className="p-4 sm:p-0">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#17171C] border-b border-[#24242B] text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-4">Role / Identifier</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Joined</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F1F26] text-xs text-zinc-300 font-medium">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[#16161B] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden">
                              {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" /> : u.name[0]}
                            </div>
                            <div>
                              <p className="font-bold text-white">{u.name}</p>
                              <p className="text-[10px] text-zinc-400 font-mono">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 bg-violet-500/10 text-violet-300 border border-violet-500/20 rounded-lg text-[10px] font-bold font-mono">
                            {u.role === 'Student' && u.studentId ? `ID: ${u.studentId}` : u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {u.isDisabled ? (
                            <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                              <Ban className="w-3 h-3" /> Disabled
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400 text-[11px]">
                          {new Date(u.joinedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewProfile(u)}
                              className="p-1.5 bg-[#1F1F26] hover:bg-[#2A2A34] text-zinc-300 rounded-lg transition-all"
                              title="View Profile Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setResetTargetUser(u)}
                              className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-all border border-amber-500/20"
                              title="Reset User Password"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`p-1.5 rounded-lg transition-all border ${
                                u.isDisabled
                                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                                  : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/20'
                              }`}
                              title={u.isDisabled ? 'Enable Account' : 'Disable Account'}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all border border-red-500/20"
                              title="Delete User Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="block md:hidden space-y-3">
                {filteredUsers.map((u) => (
                  <div key={u.id} className="p-4 bg-[#16161B] border border-[#24242B] rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden">
                          {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" /> : u.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">{u.name}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">{u.email}</p>
                        </div>
                      </div>
                      {u.isDisabled ? (
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[10px] font-bold">Disabled</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold">Active</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[#24242B]">
                      <span className="text-zinc-400 font-mono text-[10px]">{u.role === 'Student' && u.studentId ? `ID: ${u.studentId}` : u.role}</span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleViewProfile(u)} className="p-1.5 bg-[#1F1F26] text-zinc-300 rounded-lg">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setResetTargetUser(u)} className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleToggleStatus(u)} className="p-1.5 bg-orange-500/10 text-orange-400 rounded-lg">
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteUser(u)} className="p-1.5 bg-red-500/10 text-red-400 rounded-lg">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      {/* Create Teacher Modal */}
      {showCreateTeacher && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#2B2B36] rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#1F1F26] pb-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-violet-400" />
                Provision Teacher Account
              </h3>
              <button onClick={() => setShowCreateTeacher(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeacherSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="e.g. Dr. Alexander Wright"
                  className="w-full bg-[#1A1A20] border border-[#292933] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  placeholder="e.g. wright@academy.com"
                  className="w-full bg-[#1A1A20] border border-[#292933] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">Initial Password</label>
                <input
                  type="password"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  placeholder="Set account password"
                  className="w-full bg-[#1A1A20] border border-[#292933] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTeacher(false)}
                  className="px-4 py-2 bg-[#1A1A20] hover:bg-[#252530] text-zinc-300 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTeacher}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2"
                >
                  {creatingTeacher ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Create Teacher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTargetUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#2B2B36] rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1F1F26] pb-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                Reset Password for {resetTargetUser.name}
              </h3>
              <button onClick={() => setResetTargetUser(null)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full bg-[#1A1A20] border border-[#292933] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-4 py-2 bg-[#1A1A20] hover:bg-[#252530] text-zinc-300 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center gap-2"
                >
                  {resettingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#2B2B36] rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1F1F26] pb-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-violet-400" />
                {viewUser.name}'s Profile
              </h3>
              <button onClick={() => setViewUser(null)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-4 p-3 bg-[#17171C] rounded-xl">
                <div className="w-12 h-12 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center text-base overflow-hidden">
                  {viewUser.avatarUrl ? <img src={viewUser.avatarUrl} alt={viewUser.name} className="w-full h-full object-cover" /> : viewUser.name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{viewUser.name}</h4>
                  <p className="text-zinc-400 font-mono">{viewUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#1A1A20] rounded-xl border border-[#292933]">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold">Role</span>
                  <p className="font-bold text-violet-400">{viewUser.role}</p>
                </div>

                <div className="p-3 bg-[#1A1A20] rounded-xl border border-[#292933]">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold">Joined Date</span>
                  <p className="font-bold text-white">{new Date(viewUser.joinedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewUser(null)}
                className="px-4 py-2 bg-[#1A1A20] hover:bg-[#252530] text-zinc-300 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
