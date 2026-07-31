import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const { verifyEmail } = useAuth();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const doVerify = async () => {
      if (!token || !email) {
        setError('Invalid verification link. Missing token or email parameters.');
        setLoading(false);
        return;
      }

      const res = await verifyEmail(email, token);
      setLoading(false);
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error || 'Email verification failed.');
      }
    };

    doVerify();
  }, [token, email, verifyEmail]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B] px-4 relative overflow-hidden">
      <div className="w-full max-w-md bg-[#16161A] border border-[#24242B] rounded-2xl p-8 shadow-2xl text-center relative z-10">
        {loading ? (
          <div className="py-12 space-y-4">
            <Loader2 className="w-10 h-10 text-violet-500 animate-spin mx-auto" />
            <h2 className="text-lg font-bold text-white">Verifying Email...</h2>
            <p className="text-xs text-zinc-400">Please wait while we validate your account verification token.</p>
          </div>
        ) : success ? (
          <div className="py-8 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Email Verified!</h2>
            <p className="text-xs text-zinc-300">
              Your email address has been successfully verified. You can now log in to your account.
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Proceed to Login
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-8 space-y-4">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Verification Failed</h2>
            <p className="text-xs text-red-300 bg-red-950/40 border border-red-800/50 rounded-xl p-3">
              {error}
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1F1F24] hover:bg-[#2F2F37] border border-[#2F2F37] text-white font-bold text-xs rounded-xl transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
