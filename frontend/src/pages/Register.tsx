import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../utils/i18n';
import { KeyRound, Mail, User, AlertCircle, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';

export const Register: React.FC = () => {
  const { register, googleLogin, user } = useAuth();
  const { t, lang, setLanguage, isRtl } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const role = 'Student';
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        const res = await googleLogin(response.credential, role);
        setIsSubmitting(false);
        if (res.success) {
          navigate('/');
        } else {
          setError(res.error || 'Google registration failed');
        }
      }
    };

    if ((window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse,
      });

      const btnContainer = document.getElementById('googleSignUpBtn');
      if (btnContainer) {
        (window as any).google.accounts.id.renderButton(btnContainer, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'signup_with',
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

          const btnContainer = document.getElementById('googleSignUpBtn');
          if (btnContainer) {
            (window as any).google.accounts.id.renderButton(btnContainer, {
              theme: 'outline',
              size: 'large',
              width: '100%',
              text: 'signup_with',
              shape: 'pill',
            });
          }
        }
      };
      document.body.appendChild(script);
    }
  }, [googleLogin, navigate, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    const res = await register(name, email, password, role);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage(res.message || 'Registration successful! Please check your email inbox to verify your account.');
    } else {
      setError(res.error || 'Registration failed');
    }
  };

  const toggleLanguage = () => {
    setLanguage(lang === 'ar' ? 'en' : 'ar');
  };

  return (
    <AuthShell
      appName={t('appName')}
      lang={lang}
      onToggleLanguage={toggleLanguage}
      headline={
        <>
          Your gradebook,
          <br />
          built for <span className="text-primary-400">momentum</span>.
        </>
      }
      subtext="Join your class, submit work, and track review status in one place — no spreadsheets, no lost feedback."
      formTitle={t('register')}
      formSubtitle={t('appName')}
    >
        {error && (
          <div className="mb-6 flex items-start gap-3 bg-red-950/40 border border-red-800/50 text-red-200 rounded-xl p-4 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <p>{error}</p>
          </div>
        )}

        {successMessage ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-sage-100">Check Your Inbox</h3>
            <p className="text-xs text-sage-300 leading-relaxed">
              {successMessage}
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="academic-button-primary inline-flex py-2.5 px-6"
              >
                Go to Login
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Google Sign Up Button Container */}
            {googleClientId && (
              <>
                <div className="mb-6">
                  <div id="googleSignUpBtn" className="w-full min-h-[44px] flex justify-center"></div>
                </div>

                <div className="relative flex items-center justify-center my-6">
                  <div className="border-t border-[#1E2519] w-full" />
                  <span className="bg-[#12160F] px-3 text-[10px] uppercase font-bold text-sage-500 tracking-wider absolute">
                    or register with email
                  </span>
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-sage-300 mb-1.5">
                  {t('name')}
                </label>
                <div className="relative">
                  <User className={`w-4 h-4 text-sage-500 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'}`} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`academic-input py-3 ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                    placeholder="Full Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-sage-300 mb-1.5">
                  {t('email')}
                </label>
                <div className="relative">
                  <Mail className={`w-4 h-4 text-sage-500 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'}`} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`academic-input py-3 ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                    placeholder="you@school.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-sage-300 mb-1.5">
                  {t('password')}
                </label>
                <div className="relative">
                  <KeyRound className={`w-4 h-4 text-sage-500 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'}`} />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`academic-input py-3 ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                    placeholder="••••••••"
                  />
                </div>
                <p className="text-[11px] text-sage-500 mt-1.5">At least 8 characters.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-sage-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className={`w-4 h-4 text-sage-500 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'}`} />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`academic-input py-3 ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                    placeholder="••••••••"
                  />
                </div>
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
                    {t('register')}
                    {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </>
                )}
              </button>
            </form>
          </>
        )}

        <div className="mt-8 text-center border-t border-[#1E2519] pt-6">
          <p className="text-xs text-sage-400">
            {t('login')}?{' '}
            <Link
              to="/login"
              className="text-primary-400 hover:text-primary-300 font-bold transition-colors"
            >
              {t('login')}
            </Link>
          </p>
        </div>
    </AuthShell>
  );
};
