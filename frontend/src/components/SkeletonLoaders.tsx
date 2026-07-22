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
  <div className="p-4 bg-[#1A1A22] border border-[#24242B] rounded-xl flex justify-between items-center animate-pulse">
    <div className="space-y-2">
      <div className="h-4 w-32 bg-zinc-800 rounded-md" />
      <div className="h-3 w-20 bg-zinc-800/60 rounded-md" />
    </div>
    <div className="h-6 w-24 bg-zinc-800 rounded-lg" />
    <div className="h-4 w-12 bg-zinc-800 rounded-md" />
    <div className="h-4 w-16 bg-zinc-800 rounded-md" />
  </div>
);

export const MetricsSkeleton: React.FC = () => (
  <div className="bg-[#16161A] border border-[#24242B] p-5 rounded-2xl space-y-3 animate-pulse">
    <div className="h-5 w-5 bg-zinc-800 rounded-md" />
    <div className="h-3 w-20 bg-zinc-800/60 rounded-md" />
    <div className="h-7 w-12 bg-zinc-800 rounded-md" />
  </div>
);
