import React from 'react';

export const CardSkeleton: React.FC = () => (
  <div className="bg-[#16161A] border border-[#24242B] rounded-2xl p-6 space-y-4 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="h-6 w-36 bg-zinc-800 rounded-md" />
      <div className="h-5 w-16 bg-zinc-800 rounded-full" />
    </div>
    <div className="h-4 w-full bg-zinc-800/60 rounded-md" />
    <div className="h-4 w-3/4 bg-zinc-800/60 rounded-md" />
    <div className="pt-4 border-t border-[#24242B] flex justify-between items-center">
      <div className="h-4 w-24 bg-zinc-800 rounded-md" />
      <div className="h-4 w-16 bg-zinc-800 rounded-md" />
    </div>
  </div>
);

export const TableRowSkeleton: React.FC = () => (
  <div className="p-4 bg-[#1A1A22] border border-[#24242B] rounded-xl flex justify-between items-center animate-pulse gap-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-zinc-800 rounded-full shrink-0" />
      <div className="space-y-2">
        <div className="h-4 w-32 bg-zinc-800 rounded-md" />
        <div className="h-3 w-20 bg-zinc-800/60 rounded-md" />
      </div>
    </div>
    <div className="h-6 w-24 bg-zinc-800 rounded-lg hidden sm:block" />
    <div className="h-4 w-16 bg-zinc-800 rounded-md hidden md:block" />
    <div className="h-8 w-20 bg-zinc-800 rounded-lg" />
  </div>
);

export const MetricsSkeleton: React.FC = () => (
  <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl space-y-3 animate-pulse">
    <div className="h-5 w-5 bg-zinc-800 rounded-md" />
    <div className="h-3 w-20 bg-zinc-800/60 rounded-md" />
    <div className="h-7 w-12 bg-zinc-800 rounded-md" />
  </div>
);

export const LeaderboardSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="p-4 bg-[#16161A] border border-[#24242B] rounded-xl flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center shrink-0" />
          <div className="w-10 h-10 bg-zinc-800 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 w-28 bg-zinc-800 rounded-md" />
            <div className="h-3 w-16 bg-zinc-800/60 rounded-md" />
          </div>
        </div>
        <div className="h-6 w-16 bg-zinc-800 rounded-md" />
      </div>
    ))}
  </div>
);

export const TaskSkeleton: React.FC = () => (
  <div className="p-5 bg-[#16161A] border border-[#24242B] rounded-xl space-y-3 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="h-5 w-40 bg-zinc-800 rounded-md" />
      <div className="h-6 w-20 bg-zinc-800 rounded-full" />
    </div>
    <div className="h-4 w-5/6 bg-zinc-800/60 rounded-md" />
    <div className="flex justify-between items-center pt-2">
      <div className="h-4 w-24 bg-zinc-800/60 rounded-md" />
      <div className="h-8 w-24 bg-zinc-800 rounded-lg" />
    </div>
  </div>
);

export const SessionSkeleton: React.FC = () => (
  <div className="bg-[#16161A] border border-[#24242B] rounded-2xl p-6 space-y-4 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-6 w-24 bg-zinc-800 rounded-full" />
        <div className="h-6 w-48 bg-zinc-800 rounded-md" />
      </div>
      <div className="h-6 w-16 bg-zinc-800 rounded-full" />
    </div>
    <div className="space-y-2 pt-2">
      <div className="h-12 bg-zinc-800/40 rounded-xl" />
      <div className="h-12 bg-zinc-800/40 rounded-xl" />
    </div>
  </div>
);
