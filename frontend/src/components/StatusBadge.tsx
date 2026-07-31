import React from 'react';
import {
  Clock, CheckCircle2, Lock, Unlock, AlertCircle, Archive, Circle, FileEdit, CheckSquare
} from 'lucide-react';

export type StatusType =
  | 'Pending'
  | 'Completed'
  | 'Locked'
  | 'Unlocked'
  | 'Expired'
  | 'Archived'
  | 'Active'
  | 'Draft'
  | 'Late'
  | string;

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
  showIcon = true,
}) => {
  const normalized = (status || '').toLowerCase().trim();

  let colorStyle = 'bg-zinc-800 text-zinc-400 border-zinc-700';
  let IconComponent: React.ComponentType<{ className?: string }> = Circle;
  let label = status;

  switch (normalized) {
    case 'pending':
    case 'waiting':
      colorStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      IconComponent = Clock;
      label = 'Pending';
      break;

    case 'completed':
    case 'submitted':
    case 'passed':
    case 'graded':
      colorStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      IconComponent = CheckCircle2;
      label = 'Completed';
      break;

    case 'locked':
      colorStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      IconComponent = Lock;
      label = 'Locked';
      break;

    case 'unlocked':
      colorStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      IconComponent = Unlock;
      label = 'Unlocked';
      break;

    case 'expired':
    case 'overdue':
      colorStyle = 'bg-rose-950/40 text-rose-400 border-rose-800/40';
      IconComponent = AlertCircle;
      label = 'Expired';
      break;

    case 'late':
      colorStyle = 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      IconComponent = Clock;
      label = 'Late Submission';
      break;

    case 'archived':
      colorStyle = 'bg-amber-900/20 text-amber-400 border-amber-800/30';
      IconComponent = Archive;
      label = 'Archived';
      break;

    case 'active':
    case 'enabled':
      colorStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      IconComponent = CheckSquare;
      label = 'Active';
      break;

    case 'draft':
      colorStyle = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      IconComponent = FileEdit;
      label = 'Draft';
      break;

    default:
      colorStyle = 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60';
      IconComponent = Circle;
      break;
  }

  const sizeClass =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px] gap-1 rounded'
      : size === 'lg'
      ? 'px-3 py-1.5 text-xs gap-2 rounded-xl font-bold'
      : 'px-2.5 py-1 text-[11px] gap-1.5 rounded-lg font-semibold';

  return (
    <span
      className={`inline-flex items-center border font-mono tracking-tight shadow-sm select-none ${colorStyle} ${sizeClass} ${className}`}
    >
      {showIcon && <IconComponent className={`${size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3'} shrink-0`} />}
      <span>{label}</span>
    </span>
  );
};
