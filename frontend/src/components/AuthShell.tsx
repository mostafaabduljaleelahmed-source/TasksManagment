import React from 'react';
import { Globe } from 'lucide-react';

interface AuthShellProps {
  appName: string;
  lang: string;
  onToggleLanguage: () => void;
  headline: React.ReactNode;
  subtext: string;
  formTitle: string;
  formSubtitle: string;
  children: React.ReactNode;
}

const STEPS = [
  { n: '01', label: 'Submit' },
  { n: '02', label: 'Review' },
  { n: '03', label: 'Track' },
];

export const AuthShell: React.FC<AuthShellProps> = ({
  appName,
  lang,
  onToggleLanguage,
  headline,
  subtext,
  formTitle,
  formSubtitle,
  children,
}) => {
  return (
    <div className="min-h-screen flex bg-[#0A0D0A] relative overflow-hidden">
      {/* Editorial brand pane */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] relative flex-col justify-between p-12 xl:p-16 overflow-hidden bg-[#0E1410] border-r border-[#1E2519]">
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 20%, rgba(31,169,113,0.22), transparent 45%), radial-gradient(circle at 85% 75%, rgba(217,130,46,0.14), transparent 40%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        />

        <div className="relative z-10 animate-rise-in">
          <span className="field-label text-primary-400">{appName}</span>
        </div>

        <div className="relative z-10 space-y-6 animate-rise-in stagger-1">
          <h1 className="text-[2.75rem] xl:text-6xl font-bold tracking-tight text-white leading-[1.05]">
            {headline}
          </h1>
          <p className="text-sm text-sage-400 max-w-sm leading-relaxed">{subtext}</p>
        </div>

        <div className="relative z-10 flex items-center gap-6 animate-rise-in stagger-2">
          {STEPS.map((step, i) => (
            <React.Fragment key={step.n}>
              <div className="flex items-center gap-2.5">
                <span className="field-label text-primary-500">{step.n}</span>
                <span className="text-xs font-semibold text-sage-300">{step.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="h-px w-6 bg-[#37452E]" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form pane */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12 relative">
        <div
          className="absolute inset-0 lg:hidden opacity-[0.25] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(31,169,113,0.18), transparent 55%)' }}
        />

        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A2016] hover:bg-[#212B1E] border border-[#37452E] text-sage-300 hover:text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Globe className="w-4 h-4 text-primary-400" />
            <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
          </button>
        </div>

        <div className="w-full max-w-sm relative z-10 animate-rise-in">
          <div className="text-center mb-8 lg:hidden">
            <span className="field-label text-primary-400">{appName}</span>
          </div>
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-1.5">{formTitle}</h2>
            <p className="text-xs text-sage-500">{formSubtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};
