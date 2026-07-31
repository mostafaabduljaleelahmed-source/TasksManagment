import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../utils/i18n';
import { UserPlus, ShieldCheck, Mail, Lock, User, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export const AdminTeachers: React.FC = () => {
  const { createTeacher, user } = useAuth();
  const { isRtl } = useTranslation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (user?.role !== 'Admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090B] text-white p-4">
        <div className="text-center space-y-4 max-w-md bg-[#16161A] p-8 rounded-2xl border border-red-500/20">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold">403 - Forbidden</h2>
          <p className="text-xs text-zinc-400">Only the Academy Administrator can access this page.</p>
        </div>
      </div>
    );
  }

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const res = await createTeacher(name, email, password);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage(`Teacher account '${name}' (${email}) created successfully.`);
      setName('');
      setEmail('');
      setPassword('');
    } else {
      setError(res.error || 'Failed to create teacher account.');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#24242B] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-6 h-6 text-violet-400" />
            <h1 className="text-2xl font-black text-white">Academy Teacher Management</h1>
          </div>
          <p className="text-xs text-zinc-400">
            As the single Academy Administrator, you are the only authority who can provision new Teacher accounts.
          </p>
        </div>
        <span className="px-3 py-1 bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-bold rounded-full">
          Admin Only
        </span>
      </div>

      {/* Creation Form Card */}
      <div className="bg-[#16161A] border border-[#24242B] rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-indigo-400" />
          Provision New Teacher Account
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-800/50 text-red-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleCreateTeacher} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Teacher Full Name
            </label>
            <div className="relative">
              <User className={`w-4 h-4 text-zinc-500 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full bg-[#1F1F24] border border-[#2F2F37] text-white rounded-xl py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                placeholder="Dr. Sarah Johnson"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Teacher Email Address
            </label>
            <div className="relative">
              <Mail className={`w-4 h-4 text-zinc-500 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'}`} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full bg-[#1F1F24] border border-[#2F2F37] text-white rounded-xl py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                placeholder="sarah.johnson@academy.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Initial Password
            </label>
            <div className="relative">
              <Lock className={`w-4 h-4 text-zinc-500 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'}`} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-[#1F1F24] border border-[#2F2F37] text-white rounded-xl py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl py-3 px-4 shadow-lg shadow-violet-950/40 transition-all focus:outline-none disabled:opacity-50 text-xs"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Teacher Account</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
