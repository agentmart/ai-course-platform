/**
 * AI PM Sprint — 28-day on-ramp track.
 *
 * Curated spine of 28 days (out of the full 60-day course) for time-constrained
 * learners: ~10 minutes/day for 4 weeks. The four weekly themes mirror a
 * Discover → Define → Build → Deploy product arc.
 *
 * Each `days` array lists the *original* 60-day course day numbers (the slug
 * is `day-NN` zero-padded). The order in the array is the order learners see
 * them in sprint mode (sprint day 1 = WEEK_THEMES[0].days[0], and so on).
 */

export type SprintWeek = {
  /** 1-indexed week number within the 4-week sprint. */
  week: 1 | 2 | 3 | 4;
  /** Theme name shown in UI. */
  name: 'Discover' | 'Define' | 'Build' | 'Deploy';
  /** One-line tagline shown under the theme name. */
  tagline: string;
  /**
   * Original 60-day course day numbers, in sprint sequence (length 7).
   * Map to slug `day-NN` where NN is zero-padded.
   */
  days: readonly number[];
};

export const WEEK_THEMES: readonly SprintWeek[] = [
  {
    week: 1,
    name: 'Discover',
    tagline: 'Get the lay of the AI land — models, capabilities, tradeoffs.',
    days: [2, 1, 6, 7, 4, 5, 31],
  },
  {
    week: 2,
    name: 'Define',
    tagline: 'Scope AI features, write the PRD, frame eval and risk.',
    days: [32, 35, 18, 14, 19, 41, 37],
  },
  {
    week: 3,
    name: 'Build',
    tagline: 'Lightest hands-on — APIs, tools, RAG, Claude Code, evals.',
    days: [9, 10, 11, 13, 43, 44, 53],
  },
  {
    week: 4,
    name: 'Deploy',
    tagline: 'Launch, measure, observe, comply — and ship the capstone.',
    days: [38, 52, 24, 17, 49, 45, 60],
  },
] as const;

/**
 * Flat ordered list of original day numbers across the entire 28-day sprint.
 * Index 0 = sprint day 1, index 27 = sprint day 28.
 */
export const SPRINT_DAY_ORDER: readonly number[] = WEEK_THEMES.flatMap((w) => w.days);

/**
 * Map a sprint day number (1..28) to the original 60-day course day number.
 * Returns `undefined` if out of range.
 */
export function sprintDayToCourseDay(sprintDay: number): number | undefined {
  if (sprintDay < 1 || sprintDay > SPRINT_DAY_ORDER.length) return undefined;
  return SPRINT_DAY_ORDER[sprintDay - 1];
}

/**
 * Map an original course day number to its sprint day number (1..28).
 * Returns `undefined` if the day is not part of the sprint spine.
 */
export function courseDayToSprintDay(courseDay: number): number | undefined {
  const idx = SPRINT_DAY_ORDER.indexOf(courseDay);
  return idx === -1 ? undefined : idx + 1;
}
