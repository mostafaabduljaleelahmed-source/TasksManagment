import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../utils/i18n';
import { KeyRound, Mail, AlertCircle, ArrowRight, ArrowLeft, Loader2, Globe, CheckCircle2 } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, googleLogin, resendVerification, user } = useAuth();
  const { t, lang, setLanguage, isRtl } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showResend, setShowResend] = useState(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Initialize Google Identity Services Script
  useEffect(() => {
    if (!googleClientId) {
      return;
    }

    const handleCredentialResponse = async (response: any) => {
      if (response && response.credential) {
        setIsSubmitting(true);
        setError(null);
        const res = await googleLogin(response.credential);
        setIsSubmitting(false);
        if (res.success) {
          navigate('/');
        } else {
          setError(res.error || 'Google login failed');
        }
      }
    };

    if ((window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse,
      });

      const btnContainer = document.getElementById('googleSignInBtn');
      if (btnContainer) {
        (window as any).google.accounts.id.renderButton(btnContainer, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'continue_with',
          shape: 'pill',
        });
      }
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => {
        if ((window as any).google?.accounts?.id) {
          (window as any).google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleCredentialResponse,
          });

          const btnContainer = document.getElementById('googleSignInBtn');
          if (btnContainer) {
            (window as any).google.accounts.id.renderButton(btnContainer, {
              theme: 'outline',
              size: 'large',
              width: '100%',
              text: 'continue_with',
              shape: 'pill',
            });
          }
        }
      };
      document.body.appendChild(script);
    }
  }, [googleLogin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setShowResend(false);
    setIsSubmitting(true);

    const res = await login(email, password, rememberMe);
    setIsSubmitting(false);

    if (res.success) {
      navigate('/');
    } else {
      setError(res.error || 'Invalid credentials');
      if (res.error?.includes('verify your email')) {
        setShowResend(true);
      }
    }
  };

  const handleResendVerification = async () => {
    if (!email) return;
    setIsResending(true);
    const res = await resendVerification(email);
    setIsResending(false);
    if (res.success) {
      setInfoMessage(res.message || 'Verification link sent to your email.');
    } else {
      setError(res.error || 'Failed to resend verification email.');
    }
  };

  const toggleLanguage = () => {
    setLanguage(lang === 'ar' ? 'en' : 'ar');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0E14] px-4 relative overflow-hidden">
      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#151B28] hover:bg-[#1E2638] border border-[#232F45] text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-colors"
        >
          <Globe className="w-4 h-4 text-blue-400" />
          <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
        </button>
      </div>

      <div className="w-full max-w-md academic-surface rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            {t('welcome')}
          </h1>
          <p className="text-xs text-slate-400">
            {t('appName')} - {t('login')}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-950/40 border border-red-800/50 text-red-200 rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <p>{error}</p>
            </div>
            {showResend && (
              <button
                onClick={handleResendVerification}
                disabled={isResending}
                className="text-blue-400 hover:text-blue-300 font-semibold underline text-xs transition-colors"
              >
                {isResending ? 'Sending link...' : 'Resend Verification Email'}
              </button>
            )}
          </div>
        )}

        {infoMessage && (
          <div className="mb-6 flex items-start gap-2.5 bg-emerald-950/40 border border-emerald-800/50 text-emerald-200 rounded-xl p-4 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <p>{infoMessage}</p>
          </div>
        )}

        {googleClientId && (
          <>
            {/* Google Sign In Button Container */}
            <div className="mb-6">
              <div id="googleSignInBtn" className="w-full min-h-[44px] flex justify-center"></div>
            </div>

            <div className="relative flex items-center justify-center my-6">
              <div className="border-t border-[#1B2333] w-full" />
              <span className="bg-[#121620] px-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider absolute">
                or continue with email
              </span>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t('email')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="academic-input pl-9 pr-3 py-2.5"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">{t('password')}</label>
              <Link to="/forgot-password" className="text-xs font-semibold text-blue-400 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="academic-input pl-9 pr-3 py-2.5"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-[#232F45] bg-[#151B28] text-blue-600 focus:ring-blue-500"
              />
              <span>Remember Me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="academic-button-primary w-full py-3 text-xs"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {t('login')}
                {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-[#1B2333] pt-6">
          <p className="text-xs text-slate-400">
            {t('register')}?{' '}
            <Link
              to="/register"
              className="text-blue-400 hover:text-blue-300 font-bold transition-colors"
            >
              {t('register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
