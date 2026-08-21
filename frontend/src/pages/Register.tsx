import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../utils/i18n';
import { KeyRound, Mail, User, AlertCircle, ArrowRight, ArrowLeft, Loader2, Globe, CheckCircle2 } from 'lucide-react';

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
  const role = 'Student';
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize Google Identity Services Script
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
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
    <div className="min-h-screen flex items-center justify-center bg-[#09090B] px-4 relative overflow-hidden">
      {/* Background Ambient Layers */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-slate-800/20 rounded-full blur-[128px] pointer-events-none" />

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1F1F24] hover:bg-[#2F2F37] border border-[#2F2F37] text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          <Globe className="w-4 h-4 text-indigo-400" />
          <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
        </button>
      </div>

      <div className="w-full max-w-md bg-[#16161A] border border-[#24242B] rounded-2xl p-8 shadow-2xl relative z-10 backdrop-blur-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 mb-2">
            {t('register')}
          </h1>
          <p className="text-xs text-slate-400">
            {t('appName')}
          </p>
        </div>

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
            <h3 className="text-lg font-bold text-slate-100">Check Your Inbox</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {successMessage}
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Go to Login
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Google Sign Up Button Container */}
            <div className="mb-6">
              <div id="googleSignUpBtn" className="w-full min-h-[44px] flex justify-center"></div>
            </div>

            <div className="relative flex items-center justify-center my-6">
              <div className="border-t border-[#24242B] w-full" />
              <span className="bg-[#16161A] px-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider absolute">
                or register with email
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('name')}
                </label>
                <div className="relative">
                  <User className={`w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'}`} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full bg-[#1F1F24] border border-[#2F2F37] text-slate-100 rounded-xl py-3 text-xs focus:outline-none focus:border-indigo-500 transition-all ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                    placeholder="Full Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('email')}
                </label>
                <div className="relative">
                  <Mail className={`w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'}`} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full bg-[#1F1F24] border border-[#2F2F37] text-slate-100 rounded-xl py-3 text-xs focus:outline-none focus:border-indigo-500 transition-all ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                    placeholder="you@school.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('password')}
                </label>
                <div className="relative">
                  <KeyRound className={`w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'}`} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full bg-[#1F1F24] border border-[#2F2F37] text-slate-100 rounded-xl py-3 text-xs focus:outline-none focus:border-indigo-500 transition-all ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl py-3 px-4 shadow-lg shadow-indigo-950/40 transition-all focus:outline-none disabled:opacity-50 text-xs cursor-pointer"
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

        <div className="mt-8 text-center border-t border-[#24242B] pt-6">
          <p className="text-xs text-slate-400">
            {t('login')}?{' '}
            <Link
              to="/login"
              className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
            >
              {t('login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
