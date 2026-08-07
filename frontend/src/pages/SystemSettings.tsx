import React, { useEffect, useState } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Settings, Save, Loader2, Palette, Mail, ShieldCheck, HelpCircle, Image } from 'lucide-react';

export const SystemSettings: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [academyName, setAcademyName] = useState('Grading Platform Private Academy');
  const [academyLogo, setAcademyLogo] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#7C3AED');
  const [secondaryColor, setSecondaryColor] = useState('#4F46E5');
  const [contactEmail, setContactEmail] = useState('contact@academy.com');
  const [supportEmail, setSupportEmail] = useState('support@academy.com');
  const [footerText, setFooterText] = useState('© 2026 Private Academy. All rights reserved.');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/settings`);
        if (res.ok) {
          const data = await res.json();
          if (data.academyName) setAcademyName(data.academyName);
          if (data.academyLogo) setAcademyLogo(data.academyLogo);
          if (data.primaryColor) setPrimaryColor(data.primaryColor);
          if (data.secondaryColor) setSecondaryColor(data.secondaryColor);
          if (data.contactEmail) setContactEmail(data.contactEmail);
          if (data.supportEmail) setSupportEmail(data.supportEmail);
          if (data.footerText) setFooterText(data.footerText);
        }
      } catch (err) {
        console.error('Failed to load system settings', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          academyName,
          academyLogo,
          primaryColor,
          secondaryColor,
          contactEmail,
          supportEmail,
          footerText,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update system settings');
      toast.success(data.message || 'System settings saved successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update system settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-violet-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-semibold">Loading System Settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'System Settings' }]} />

        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Settings className="w-7 h-7 text-violet-400" />
            Academy System Settings
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Configure global branding, academy emails, visual theme accents, and footer metadata.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Branding */}
          <section className="bg-[#121215] border border-[#24242B] rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center gap-3 border-b border-[#1F1F26] pb-4">
              <ShieldCheck className="w-5 h-5 text-violet-400" />
              <h2 className="text-base font-bold text-white">Academy Identity & Branding</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">Academy Name</label>
                <input
                  type="text"
                  value={academyName}
                  onChange={(e) => setAcademyName(e.target.value)}
                  className="w-full bg-[#1A1A20] border border-[#292933] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-2">
                  <Image className="w-3.5 h-3.5 text-violet-400" />
                  Academy Logo URL
                </label>
                <input
                  type="url"
                  value={academyLogo}
                  onChange={(e) => setAcademyLogo(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full bg-[#1A1A20] border border-[#292933] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          </section>

          {/* Theme Palette */}
          <section className="bg-[#121215] border border-[#24242B] rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center gap-3 border-b border-[#1F1F26] pb-4">
              <Palette className="w-5 h-5 text-violet-400" />
              <h2 className="text-base font-bold text-white">System Color Palette</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">Primary Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-full bg-[#1A1A20] border border-[#292933] rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">Secondary Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-full bg-[#1A1A20] border border-[#292933] rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Contact & Support Emails */}
          <section className="bg-[#121215] border border-[#24242B] rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center gap-3 border-b border-[#1F1F26] pb-4">
              <Mail className="w-5 h-5 text-violet-400" />
              <h2 className="text-base font-bold text-white">Contact & Support Email Configuration</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full bg-[#1A1A20] border border-[#292933] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-violet-400" />
                  Support Email
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full bg-[#1A1A20] border border-[#292933] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">Footer Copyright Text</label>
              <input
                type="text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="w-full bg-[#1A1A20] border border-[#292933] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                required
              />
            </div>
          </section>

          {/* Danger Zone: Reset Entire Platform Submissions */}
          <section className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-rose-500/20 pb-4">
              <span className="text-xl">⚠️</span>
              <div>
                <h2 className="text-base font-extrabold text-rose-400">Danger Zone — Reset Entire Platform</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Reset ALL submissions across all courses and students back to Pending state. Old attempts remain stored as read-only history.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-zinc-400">
                Requires typing <span className="font-mono text-rose-400 font-bold">RESET</span> to confirm platform-wide action.
              </div>

              <button
                type="button"
                onClick={async () => {
                  const input = window.prompt("DANGER: Type 'RESET' to confirm resetting ALL platform submission reviews back to Pending state:");
                  if (input !== 'RESET') {
                    toast.error("Action cancelled. You must type 'RESET' exactly.");
                    return;
                  }
                  try {
                    const res = await fetch(`${API_URL}/submissions/reset-platform`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${user?.token}` },
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Failed to reset platform submissions');
                    toast.success(data.message || 'Platform submissions reset successfully!');
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to reset platform submissions');
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl text-xs shadow-lg transition-all flex items-center gap-2 shrink-0"
              >
                <span>🔥</span>
                <span>Reset Entire Platform</span>
              </button>
            </div>
          </section>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-violet-950/40 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save System Settings
            </button>
          </div>
        </form>
    </div>
  );
};
