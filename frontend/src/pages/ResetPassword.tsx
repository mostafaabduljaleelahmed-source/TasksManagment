import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !email) {
      setError('Invalid password reset link. Missing token or email.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await resetPassword(email, token, newPassword);
    setLoading(false);

    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error || 'Failed to reset password.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0D0A] px-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.25] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(31,169,113,0.18), transparent 55%)' }}
      />
      <div className="w-full max-w-md academic-surface rounded-xl p-8 shadow-field-lg relative z-10 animate-rise-in">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-white mb-2">Set New Password</h1>
          <p className="text-xs text-sage-400">
            Please enter your new password below.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2.5 bg-red-950/40 border border-red-800/50 text-red-200 rounded-xl p-4 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {success ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Password Reset Complete</h3>
            <p className="text-xs text-sage-300">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <div className="pt-4">
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Proceed to Login
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-sage-300 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-sage-500 absolute top-1/2 -translate-y-1/2 left-3" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="academic-input py-3 pl-10 pr-4"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-sage-300 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-sage-500 absolute top-1/2 -translate-y-1/2 left-3" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="academic-input py-3 pl-10 pr-4"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="academic-button-primary w-full py-3"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
            </button>

            <div className="text-center pt-4 border-t border-[#212B1E]">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-sage-400 hover:text-white transition-colors"
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
