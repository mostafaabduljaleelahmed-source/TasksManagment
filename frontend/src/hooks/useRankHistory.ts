import { useEffect, useRef, useState } from 'react';

interface StoredSnapshot {
  recordedAt: string;
  ranks: Record<string, number>;
}

/**
 * Tracks each student's rank across visits to this leaderboard view, persisted in
 * localStorage per (scopeKey). This is deliberately NOT a "vs. last week" comparison --
 * the backend has no rank-history table to query, and fabricating a weekly delta would be a
 * lie dressed as a feature. What this gives instead is real: how your rank changed since the
 * last time this browser loaded this exact view. `snapshotAgeMs` lets the UI say so honestly.
 */
export function useRankHistory(scopeKey: string, currentRanks: Record<string, number> | null) {
  const [previous, setPrevious] = useState<StoredSnapshot | null>(null);
  const storageKey = `leaderboard_rank_history_${scopeKey}`;
  const writtenForRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setPrevious(raw ? JSON.parse(raw) : null);
    } catch {
      setPrevious(null);
    }
    writtenForRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!currentRanks) return;
    const signature = JSON.stringify(currentRanks);
    if (writtenForRef.current === signature) return;
    writtenForRef.current = signature;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ recordedAt: new Date().toISOString(), ranks: currentRanks }));
    } catch {
      // localStorage unavailable (private mode, quota) -- rank history is a nice-to-have, skip silently
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRanks, storageKey]);

  const getDelta = (studentId: string, currentRank: number): number | null => {
    if (!previous) return null;
    const prevRank = previous.ranks[studentId];
    if (prevRank == null) return null;
    return prevRank - currentRank; // positive = moved up
  };

  return { getDelta, snapshotRecordedAt: previous?.recordedAt ?? null };
}
