import React, { useEffect, useState } from 'react';
import { Crown, Flame, ArrowUp, ArrowDown } from 'lucide-react';
import { useCountUp } from '../hooks/useCountUp';

export interface PodiumEntry {
  studentId: string;
  studentName: string;
  studentEmail: string;
  avatarUrl?: string | null;
  totalScore: number;
  totalPossibleScore: number;
  completedTasks: number;
  totalTasks: number;
  rank: number;
  tiedCount: number;
  previousRank: number | null;
}

interface TierConfig {
  ring: string;
  ringVar: string;
  glow: string;
  base: string;
  baseText: string;
  avatarSize: string;
  baseHeight: string;
  entrance: string;
  float: string;
  order: string;
}

const TIERS: Record<1 | 2 | 3, TierConfig> = {
  1: {
    ring: 'border-accent-400/70',
    ringVar: 'rgba(217, 130, 46, 0.45)',
    glow: 'shadow-[0_0_28px_-6px_rgba(217,130,46,0.55)]',
    base: 'bg-accent-500/15 border-accent-500/40',
    baseText: 'text-accent-300',
    avatarSize: 'w-16 h-16 sm:w-24 sm:h-24',
    baseHeight: 'h-16 sm:h-20',
    entrance: 'animate-podium-center',
    float: 'animate-float',
    order: 'sm:order-2',
  },
  2: {
    ring: 'border-sage-300/60',
    ringVar: 'rgba(199, 209, 190, 0.4)',
    glow: 'shadow-[0_0_18px_-6px_rgba(199,209,190,0.4)]',
    base: 'bg-sage-500/10 border-sage-400/30',
    baseText: 'text-sage-200',
    avatarSize: 'w-14 h-14 sm:w-20 sm:h-20',
    baseHeight: 'h-11 sm:h-14',
    entrance: 'animate-podium-left',
    float: 'animate-float-delayed',
    order: 'sm:order-1',
  },
  3: {
    ring: 'border-accent-800/60',
    ringVar: 'rgba(150, 85, 28, 0.4)',
    glow: 'shadow-[0_0_18px_-6px_rgba(150,85,28,0.4)]',
    base: 'bg-accent-900/30 border-accent-800/40',
    baseText: 'text-accent-500',
    avatarSize: 'w-11 h-11 sm:w-16 sm:h-16',
    baseHeight: 'h-8 sm:h-10',
    entrance: 'animate-podium-right',
    float: 'animate-float',
    order: 'sm:order-3',
  },
};

const CONFETTI_COLORS = ['#D9822E', '#1FA971', '#3E93A8', '#F4F6EF'];

const Confetti: React.FC = () => {
  const [pieces, setPieces] = useState<{ id: number; left: number; color: string; delay: number }[]>([]);

  useEffect(() => {
    setPieces(
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: 10 + Math.random() * 80,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 0.3,
      }))
    );
  }, []);

  return (
    <div className="absolute inset-x-0 -top-2 h-16 overflow-visible pointer-events-none">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{ left: `${p.left}%`, backgroundColor: p.color, animationDelay: `${p.delay}s` }}
        />
      ))}
    </div>
  );
};

const Avatar: React.FC<{ entry: PodiumEntry; sizeClass: string }> = ({ entry, sizeClass }) => {
  const initials = entry.studentName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return entry.avatarUrl ? (
    <img
      src={entry.avatarUrl}
      alt={entry.studentName}
      className={`${sizeClass} rounded-full object-cover`}
    />
  ) : (
    <div className={`${sizeClass} rounded-full bg-primary-500/15 border border-primary-500/25 text-primary-300 font-bold flex items-center justify-center text-base sm:text-xl`}>
      {initials}
    </div>
  );
};

interface PodiumCardProps {
  entry: PodiumEntry;
  slot: 1 | 2 | 3;
  isYou: boolean;
  tiedNames: string[];
  onSelect: () => void;
  labelYou: string;
  persistenceThreshold: number;
}

const PodiumCard: React.FC<PodiumCardProps> = ({ entry, slot, isYou, tiedNames, onSelect, labelYou, persistenceThreshold }) => {
  const tier = TIERS[slot];
  const score = useCountUp(entry.totalScore);
  const isPersistent = entry.completedTasks >= persistenceThreshold;
  const delta = entry.previousRank != null ? entry.previousRank - entry.rank : null;

  return (
    <div className={`flex flex-col items-center ${tier.entrance} ${tier.order}`}>
      <div className={`relative ${tier.float}`}>
        {slot === 1 && (
          <>
            <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-accent-400 absolute -top-6 left-1/2 -translate-x-1/2 animate-crown" />
            <Confetti />
          </>
        )}

        {isYou && (
          <span className="absolute -top-2 -right-1 z-10 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-primary-500 text-[#06150E] shadow-field-sm">
            {labelYou}
          </span>
        )}

        <button
          onClick={onSelect}
          className={`group relative rounded-full border-2 ${tier.ring} ${tier.glow} p-1 transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer`}
          style={{ ['--ring-color' as any]: tier.ringVar }}
        >
          <div className={slot === 1 ? 'animate-ring-pulse rounded-full' : ''}>
            <Avatar entry={entry} sizeClass={tier.avatarSize} />
          </div>
        </button>
      </div>

      <div className="mt-3 flex items-center gap-1 max-w-[7rem] sm:max-w-[9rem]">
        <p className={`font-bold text-white truncate text-center ${slot === 1 ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'}`}>
          {entry.studentName}
        </p>
        {isPersistent && <Flame className="w-3 h-3 text-accent-400 shrink-0" aria-label="Persistence badge" />}
        {delta != null && delta !== 0 && (
          <span className={`shrink-0 flex items-center font-mono text-[10px] font-bold ${delta > 0 ? 'text-primary-400' : 'text-red-400'}`}>
            {delta > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(delta)}
          </span>
        )}
      </div>
      {tiedNames.length > 0 && (
        <p className="text-[9px] text-sage-500 text-center max-w-[7rem] sm:max-w-[9rem] truncate">
          = {tiedNames[0]}{tiedNames.length > 1 ? ` +${tiedNames.length - 1}` : ''}
        </p>
      )}
      <p className="font-mono text-[11px] text-sage-500 mt-0.5">
        {entry.totalTasks > 0 ? `${entry.completedTasks}/${entry.totalTasks} tasks` : 'No tasks yet'}
      </p>

      <div className={`mt-2 flex flex-col items-center justify-end rounded-t-lg border border-b-0 ${tier.base} w-16 sm:w-24 ${tier.baseHeight} pt-2 pb-1`}>
        <span className={`font-mono font-black text-base sm:text-xl ${tier.baseText}`}>
          {entry.tiedCount > 0 ? `=${entry.rank}` : entry.rank}
        </span>
        <span className="font-mono text-[10px] sm:text-xs text-white font-bold">
          {entry.totalTasks > 0 ? Math.round(score) : '—'}
          {entry.totalTasks > 0 && <span className="text-sage-500">/{entry.totalPossibleScore}</span>}
        </span>
      </div>
    </div>
  );
};

interface LeaderboardPodiumProps {
  top3: PodiumEntry[];
  currentUserId?: string;
  tiedNamesByStudent: Map<string, string[]>;
  onSelect: (entry: PodiumEntry) => void;
  labelYou: string;
  persistenceThreshold: number;
}

export const LeaderboardPodium: React.FC<LeaderboardPodiumProps> = ({ top3, currentUserId, tiedNamesByStudent, onSelect, labelYou, persistenceThreshold }) => {
  if (top3.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-center sm:gap-6 py-6 px-2">
      {top3.map((entry, idx) => (
        <PodiumCard
          key={entry.studentId}
          entry={entry}
          slot={(idx + 1) as 1 | 2 | 3}
          isYou={entry.studentId === currentUserId}
          tiedNames={tiedNamesByStudent.get(entry.studentId) || []}
          onSelect={() => onSelect(entry)}
          labelYou={labelYou}
          persistenceThreshold={persistenceThreshold}
        />
      ))}
    </div>
  );
};
