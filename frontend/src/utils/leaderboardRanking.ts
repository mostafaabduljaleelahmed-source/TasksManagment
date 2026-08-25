export interface RankableEntry {
  studentId: string;
  studentName: string;
  totalScore: number;
  totalTasks: number;
}

export interface RankedEntry<T extends RankableEntry> {
  entry: T;
  rank: number;
  tiedWith: T[];
}

/**
 * Competition ranking (1224, not 1234): entries with an equal totalScore share the same rank,
 * and the next distinct score skips ahead by the size of the tied group. Students with zero
 * assigned tasks are ranked by array position without being folded into a shared "tied" group --
 * grouping every not-yet-started student under one big "tied" callout would be noise, not signal.
 */
export function computeRanks<T extends RankableEntry>(entries: T[]): RankedEntry<T>[] {
  const result: RankedEntry<T>[] = [];
  let i = 0;
  while (i < entries.length) {
    const current = entries[i];
    if (current.totalTasks === 0) {
      result.push({ entry: current, rank: i + 1, tiedWith: [] });
      i += 1;
      continue;
    }

    let j = i;
    while (j < entries.length && entries[j].totalScore === current.totalScore && entries[j].totalTasks > 0) {
      j += 1;
    }
    const rank = i + 1;
    const group = entries.slice(i, j);
    for (const e of group) {
      result.push({ entry: e, rank, tiedWith: group.filter((g) => g.studentId !== e.studentId) });
    }
    i = j;
  }
  return result;
}
