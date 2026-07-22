import React from 'react';
import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="bg-[#16161A] border border-[#24242B] rounded-2xl p-10 text-center flex flex-col items-center justify-center max-w-lg mx-auto space-y-4 my-6">
      <div className="p-4 bg-violet-600/10 border border-violet-500/20 rounded-2xl text-violet-400">
        {icon || <FolderOpen className="w-8 h-8" />}
      </div>
      <div>
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
          {description}
        </p>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-lg transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
