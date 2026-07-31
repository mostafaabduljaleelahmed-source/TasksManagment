import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const res = await forgotPassword(email);
    setLoading(false);

    if (res.success) {
      setMessage(res.message || 'If registered, a password reset link has been dispatched to your email.');
    } else {
      setError(res.error || 'Failed to request password reset.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B] px-4 relative overflow-hidden">
      <div className="w-full max-w-md bg-[#16161A] border border-[#24242B] rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-white mb-2">Reset Your Password</h1>
          <p className="text-xs text-zinc-400">
            Enter your registered email address and we'll send you a link to reset your password.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2.5 bg-red-950/40 border border-red-800/50 text-red-200 rounded-xl p-4 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {message ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed bg-[#1F1F24] border border-[#2F2F37] rounded-xl p-4">
              {message}
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 font-bold text-xs transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute top-1/2 -translate-y-1/2 left-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1F1F24] border border-[#2F2F37] text-white rounded-xl py-3 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  placeholder="you@school.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl py-3 px-4 shadow-lg shadow-violet-950/40 transition-all text-xs disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
            </button>

            <div className="text-center pt-4 border-t border-[#24242B]">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
