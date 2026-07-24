import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../utils/i18n';
import { KeyRound, Mail, AlertCircle, ArrowRight, ArrowLeft, Loader2, Globe } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, user } = useAuth();
  const { t, lang, setLanguage, isRtl } = useTranslation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await login(email, password, rememberMe);
    setIsSubmitting(false);

    if (res.success) {
      navigate('/');
    } else {
      setError(res.error || 'Invalid credentials');
    }
  };

  const toggleLanguage = () => {
    setLanguage(lang === 'ar' ? 'en' : 'ar');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B] px-4 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Top Bar Language Switcher */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1F1F24] hover:bg-[#2F2F37] border border-[#2F2F37] text-zinc-300 hover:text-white text-xs font-semibold rounded-xl transition-colors"
        >
          <Globe className="w-4 h-4 text-violet-400" />
          <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
        </button>
      </div>

      <div className="w-full max-w-md bg-[#16161A] border border-[#24242B] rounded-2xl p-8 shadow-2xl relative z-10 backdrop-blur-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent">
            {t('welcome')}
          </h1>
          <p className="text-xs text-zinc-400">
            {t('appName')} - {t('login')}
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 bg-red-950/40 border border-red-800/50 text-red-200 rounded-lg p-3 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {t('email')}
            </label>
            <div className="relative">
              <Mail className={`w-4 h-4 text-zinc-500 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'}`} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full bg-[#1F1F24] border border-[#2F2F37] text-white rounded-xl py-3 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                placeholder="you@school.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {t('password')}
            </label>
            <div className="relative">
              <KeyRound className={`w-4 h-4 text-zinc-500 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'}`} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-[#1F1F24] border border-[#2F2F37] text-white rounded-xl py-3 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-[#2F2F37] bg-[#1F1F24] text-violet-600 focus:ring-violet-500"
              />
              <span>Remember Me</span>
            </label>
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
                {t('login')}
                {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-[#24242B] pt-6">
          <p className="text-xs text-zinc-400">
            {t('register')}?{' '}
            <Link
              to="/register"
              className="text-violet-400 hover:text-violet-300 font-bold transition-colors"
            >
              {t('register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
