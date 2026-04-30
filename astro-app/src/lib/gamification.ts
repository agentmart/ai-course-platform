// Sprint 5 — gamification helpers shared by /api/progress and /api/leaderboard.
//
// Source of truth for:
//   - badge milestones (BADGE_THRESHOLDS)
//   - calendar-day streak computation (computeStreak)
//   - badge-awarding logic (awardBadges)
//
// Persisted under user_access.progress_data:
//   - completed[]:           number[]   (day numbers)
//   - completion_dates[]:    string[]   (UTC ISO yyyy-mm-dd, append on each new-day-completed POST)
//   - badges[]:              { kind: 'streak'|'days', n: number, earned_at: string }[]

export interface Badge {
  kind: 'days';
  n: number;
  earned_at: string; // UTC ISO date
}

export const BADGE_THRESHOLDS = [7, 14, 28, 30, 60] as const;

export function computeStreak(completionDates: string[]): number {
  if (!completionDates?.length) return 0;
  const sorted = [...new Set(completionDates)].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00Z').getTime();
    const cur = new Date(sorted[i] + 'T00:00:00Z').getTime();
    if (prev - cur === 86_400_000) streak++;
    else break;
  }
  return streak;
}

/**
 * Award `days` badges for any threshold reached by completedCount that the user
 * doesn't already have. Returns the new full badges array and the just-earned
 * subset (for milestone toasts). Backfills retroactively, so existing learners
 * who already crossed thresholds before Sprint 5 shipped get their badges on
 * their next /api/progress write.
 */
export function awardBadges(
  completedCount: number,
  existing: Badge[] | undefined
): { badges: Badge[]; newlyEarned: Badge[] } {
  const have = new Set(
    (existing ?? [])
      .filter((b) => b && b.kind === 'days' && typeof b.n === 'number')
      .map((b) => b.n)
  );
  const today = new Date().toISOString().slice(0, 10);
  const newlyEarned: Badge[] = [];
  for (const t of BADGE_THRESHOLDS) {
    if (completedCount >= t && !have.has(t)) {
      newlyEarned.push({ kind: 'days', n: t, earned_at: today });
      have.add(t);
    }
  }
  const badges = [...(existing ?? []), ...newlyEarned].filter(
    (b) => b && b.kind === 'days' && typeof b.n === 'number'
  );
  // de-dupe by n while preserving earliest earned_at
  const byN = new Map<number, Badge>();
  for (const b of badges) {
    const prev = byN.get(b.n);
    if (!prev || prev.earned_at > b.earned_at) byN.set(b.n, b);
  }
  return {
    badges: Array.from(byN.values()).sort((a, b) => a.n - b.n),
    newlyEarned,
  };
}
