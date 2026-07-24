import React, { useState, useRef } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTranslation } from '../utils/i18n';
import { Navbar } from '../components/Navbar';
import { User, Lock, Camera, Trash2, Globe, Palette, Save, Loader2, CheckCircle2, Mail, Bell, BellOff } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { t, lang, setLanguage } = useTranslation();
  const toast = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [studentId, setStudentId] = useState(user?.studentId || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl || null);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState<boolean>(true);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [theme, setTheme] = useState<'dark' | 'midnight'>('dark');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Load user notification preference on mount
  React.useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const res = await fetch(`${API_URL}/profile`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.emailNotificationsEnabled !== undefined) {
            setEmailNotificationsEnabled(data.emailNotificationsEnabled);
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile settings', err);
      }
    };
    fetchProfile();
  }, [user]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAvatarUrl(result);
        toast.info('Image selected. Click Save Profile to apply your profile picture.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    setAvatarUrl(null);
    try {
      const res = await fetch(`${API_URL}/profile/avatar`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        updateUser({ avatarUrl: null });
        toast.success('Profile picture removed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove avatar');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          studentId: studentId.trim(),
          avatarUrl: avatarUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      updateUser({
        name: data.name,
        studentId: data.studentId,
        avatarUrl: data.avatarUrl,
      });

      toast.success(t('profileUpdatedSuccess'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      toast.error('Please fill in both current and new passwords.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch(`${API_URL}/profile/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          oldPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to change password');
      }

      toast.success(t('passwordChangedSuccess'));
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
    : 'U';

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 space-y-10">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">{t('settings')}</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage your profile details, security preferences, language, and theme.</p>
        </div>

        {/* Profile Picture & Info Form */}
        <section className="bg-[#121215] border border-[#24242B] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-[#1F1F26] pb-4">
            <User className="w-5 h-5 text-violet-400" />
            <h2 className="text-base font-bold text-white">{t('personalInfo')}</h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Profile Avatar Upload / Remove */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-4 border-b border-[#1F1F26]">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center border-2 border-violet-400/40 overflow-hidden shadow-xl">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={user?.name} className="w-full h-full object-cover" />
                  ) : (
                    userInitials
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center text-white gap-1 text-xs font-semibold"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col sm:items-start items-center gap-2">
                <h3 className="text-sm font-bold text-white">{t('profilePicture')}</h3>
                <p className="text-xs text-zinc-400 text-center sm:text-left">Supports PNG, JPG, or GIF (Max 2MB).</p>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 bg-[#1F1F26] hover:bg-[#2A2A34] border border-[#2B2B36] rounded-xl text-xs font-semibold text-zinc-200 transition-all"
                  >
                    {avatarUrl ? t('replacePicture') : t('uploadPicture')}
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-xs font-semibold text-red-400 transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t('removePicture')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">{t('fullName')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1A1A20] border border-[#292933] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">{t('email')}</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full bg-[#141418] border border-[#22222B] rounded-xl px-4 py-2.5 text-xs text-zinc-500 cursor-not-allowed"
                />
              </div>

              {user?.role === 'Student' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">{t('studentId')}</label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. 202410928"
                    className="w-full bg-[#1A1A20] border border-[#292933] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-violet-950/40 transition-all disabled:opacity-50"
              >
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('saveChanges')}
              </button>
            </div>
          </form>
        </section>

        {/* Change Password Form */}
        <section className="bg-[#121215] border border-[#24242B] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-[#1F1F26] pb-4">
            <Lock className="w-5 h-5 text-violet-400" />
            <h2 className="text-base font-bold text-white">{t('changePassword')}</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">{t('currentPassword')}</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full bg-[#1A1A20] border border-[#292933] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">{t('newPassword')}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#1A1A20] border border-[#292933] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">{t('confirmPassword')}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#1A1A20] border border-[#292933] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-violet-950/40 transition-all disabled:opacity-50"
              >
                {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {t('updatePassword')}
              </button>
            </div>
          </form>
        </section>

        {/* Preferences Section: Language & Theme */}
        <section className="bg-[#121215] border border-[#24242B] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-[#1F1F26] pb-4">
            <Globe className="w-5 h-5 text-violet-400" />
            <h2 className="text-base font-bold text-white">{t('preferences')}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Language Preference */}
            <div className="p-4 bg-[#1A1A20] border border-[#292933] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-violet-400" />
                  {t('language')}
                </span>
                <span className="text-[10px] uppercase font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">
                  {lang.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-zinc-400">Choose your preferred interface language. Arabic enables RTL layout.</p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    lang === 'en'
                      ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                      : 'bg-[#121215] border-[#292933] text-zinc-400 hover:text-white'
                  }`}
                >
                  English (LTR)
                  {lang === 'en' && <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ar')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    lang === 'ar'
                      ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                      : 'bg-[#121215] border-[#292933] text-zinc-400 hover:text-white'
                  }`}
                >
                  العربية (RTL)
                  {lang === 'ar' && <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />}
                </button>
              </div>
            </div>

            {/* Theme Preference */}
            <div className="p-4 bg-[#1A1A20] border border-[#292933] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-violet-400" />
                  {t('theme')}
                </span>
                <span className="text-[10px] uppercase font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">
                  {theme.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-zinc-400">Select visual theme palette for comfortable code review.</p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    theme === 'dark'
                      ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                      : 'bg-[#121215] border-[#292933] text-zinc-400 hover:text-white'
                  }`}
                >
                  Dark Zinc
                  {theme === 'dark' && <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('midnight')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    theme === 'midnight'
                      ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                      : 'bg-[#121215] border-[#292933] text-zinc-400 hover:text-white'
                  }`}
                >
                  Midnight Obsidian
                  {theme === 'midnight' && <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Email Notifications Settings Section */}
        <section className="bg-[#121215] border border-[#24242B] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-[#1F1F26] pb-4">
            <Mail className="w-5 h-5 text-violet-400" />
            <h2 className="text-base font-bold text-white">Email Notifications</h2>
          </div>

          <div className="p-4 bg-[#1A1A20] border border-[#292933] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-violet-400" />
                Notification Emails
              </span>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                Receive automated emails when new assignments are published, grades are released, teacher feedback is added, or security password reset requests occur.
              </p>
            </div>

            <button
              type="button"
              disabled={savingNotifications}
              onClick={async () => {
                const targetVal = !emailNotificationsEnabled;
                setEmailNotificationsEnabled(targetVal);
                setSavingNotifications(true);
                try {
                  const res = await fetch(`${API_URL}/profile`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${user?.token}`,
                    },
                    body: JSON.stringify({ emailNotificationsEnabled: targetVal }),
                  });
                  if (!res.ok) throw new Error('Failed to update notification preferences');
                  toast.success(targetVal ? 'Email notifications enabled!' : 'Email notifications disabled.');
                } catch (err: any) {
                  toast.error(err.message || 'Error updating settings');
                  setEmailNotificationsEnabled(!targetVal);
                } finally {
                  setSavingNotifications(false);
                }
              }}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                emailNotificationsEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
              }`}
            >
              {savingNotifications ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : emailNotificationsEnabled ? (
                <>
                  <Mail className="w-4 h-4 text-emerald-400" />
                  Enabled
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4 text-zinc-400" />
                  Disabled
                </>
              )}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
