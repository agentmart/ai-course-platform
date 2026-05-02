/**
 * Course Advisor agent — LangGraph state machine that personalizes the
 * 5-day learning "spine" using an LLM, with a deterministic rule-engine
 * fallback (`profileToSpine` from `lib/advisor-rules.mjs`).
 *
 * Graph shape (2 nodes):
 *   START -> propose_spine -> validate_and_explain -> END
 *
 * `propose_spine`         — LLM picks 5 day numbers from a curated candidate
 *                           list (rule-engine spine + a handful of sprint
 *                           alternates). Structured output via zod.
 * `validate_and_explain`  — second LLM call writes the warm 60–80 word
 *                           rationale referencing the chosen days. If the
 *                           proposed days are invalid (not in candidate set
 *                           or wrong count), we fall back to the rule spine
 *                           before composing the rationale.
 *
 * Latency budget is ~3s end-to-end; we cap maxTokens at 400 and abort the
 * whole thing on timeout, returning the rule-engine result instead.
 *
 * Lazy imports keep cold-start cost off non-agent routes (mirrors the
 * pattern in `pages/api/agent-smoke.ts`).
 */

import { getChatModel, type LlmEnv } from '~/lib/llm';
// @ts-expect-error — JS module without types
import { profileToSpine, staticRationale } from '~/lib/advisor-rules.mjs';
import { WEEK_THEMES } from '~/content/sprint-themes';

export interface AdvisorProfile {
  background: string;
  yearsExp: string;
  aiLevel: string;
  targetCo: string;
  goal: string;
}

export interface AdvisorResult {
  spine: number[];
  rationale: string;
  reasonCodes: string[];
  engine: 'agent' | 'rules';
  sprintRecommended?: boolean;
}

export interface AdvisorOptions {
  /** Subtitles provided by the client for the rule-engine spine (parallel array). */
  daySubtitles?: string[];
  /** Per-call timeout in ms (default 8000). */
  timeoutMs?: number;
}

/**
 * Build a small candidate pool (≤15 days) we'll let the LLM choose from.
 * Starts from the rule-engine spine, adds a few sprint alternates so the
 * model has room to reorder/swap, deduped.
 */
function buildCandidates(
  ruleSpine: number[],
  daySubtitles: string[] | undefined
): { day: number; hint: string }[] {
  const subtitleByDay = new Map<number, string>();
  ruleSpine.forEach((d, i) => {
    const s = daySubtitles?.[i];
    if (s) subtitleByDay.set(d, s);
  });

  const themeByDay = new Map<number, string>();
  for (const w of WEEK_THEMES) {
    for (const d of w.days) {
      themeByDay.set(d, `${w.name} — ${w.tagline}`);
    }
  }

  const seen = new Set<number>();
  const out: { day: number; hint: string }[] = [];
  const push = (day: number) => {
    if (seen.has(day) || day < 1 || day > 60) return;
    seen.add(day);
    out.push({
      day,
      hint:
        subtitleByDay.get(day) ??
        themeByDay.get(day) ??
        `Day ${day} of the 60-day curriculum`,
    });
  };

  ruleSpine.forEach(push);
  // Add a few sprint alternates (one per week) so the LLM has options.
  for (const w of WEEK_THEMES) {
    for (const d of w.days.slice(0, 2)) push(d);
    if (out.length >= 15) break;
  }
  return out.slice(0, 15);
}

function safeText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c) =>
        typeof c === 'object' && c !== null && 'text' in (c as Record<string, unknown>)
          ? String((c as { text: unknown }).text)
          : ''
      )
      .join('');
  }
  return '';
}

function tryParseJson(text: string): any | null {
  // Strip code fences if the model wrapped output.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract the first {...} block.
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

/**
 * Run the advisor agent. Always resolves; on any LLM/graph failure we return
 * the deterministic rule-engine spine + a static rationale, tagged
 * `engine: 'rules'`.
 */
export async function runAdvisor(
  env: LlmEnv,
  profile: AdvisorProfile,
  opts: AdvisorOptions = {}
): Promise<AdvisorResult> {
  const { spine: ruleSpine, reasonCodes } = profileToSpine(profile) as {
    spine: number[];
    reasonCodes: string[];
  };
  const timeoutMs = opts.timeoutMs ?? 8000;

  const fallback = (): AdvisorResult => ({
    spine: ruleSpine,
    rationale: staticRationale(profile, ruleSpine),
    reasonCodes,
    engine: 'rules',
  });

  try {
    const candidates = buildCandidates(ruleSpine, opts.daySubtitles);
    const candidateDays = new Set(candidates.map((c) => c.day));

    const [{ StateGraph, Annotation, END, START }, { HumanMessage, SystemMessage }] =
      await Promise.all([
        import('@langchain/langgraph'),
        import('@langchain/core/messages'),
      ]);

    let model;
    try {
      model = await getChatModel(env, { temperature: 0.3, maxTokens: 400 });
    } catch {
      return fallback();
    }

    // Graph state: profile + candidates + proposed spine + rationale.
    const State = Annotation.Root({
      profile: Annotation<AdvisorProfile>(),
      candidates: Annotation<{ day: number; hint: string }[]>(),
      spine: Annotation<number[]>({
        reducer: (_x, y) => y,
        default: () => [],
      }),
      rationale: Annotation<string>({
        reducer: (_x, y) => y,
        default: () => '',
      }),
      sprintRecommended: Annotation<boolean>({
        reducer: (_x, y) => y,
        default: () => false,
      }),
    });

    const candidateList = candidates
      .map((c) => `  - Day ${c.day}: ${c.hint}`)
      .join('\n');

    const proposeNode = async (
      s: typeof State.State
    ): Promise<Partial<typeof State.State>> => {
      const sys = new SystemMessage(
        'You are an AI PM curriculum advisor. Given a learner profile and a list of ' +
          'candidate course days (with one-line hints), pick exactly 5 day numbers — ' +
          'ordered easiest-foundation → most-applied — that best fit them. You may also ' +
          'recommend they take the 28-day Sprint track if their goal favors a fast on-ramp. ' +
          'Respond ONLY with strict JSON matching this shape: ' +
          '{"spine": number[5], "sprint_recommended": boolean}. ' +
          'Every number in spine MUST be drawn from the provided candidate list.'
      );
      const usr = new HumanMessage(
        `Learner profile:\n${JSON.stringify(s.profile, null, 2)}\n\n` +
          `Candidate days:\n${candidateList}\n\n` +
          `Pick 5 day numbers. JSON only.`
      );
      const res = await model.invoke([sys, usr]);
      const parsed = tryParseJson(safeText(res.content));
      if (
        !parsed ||
        !Array.isArray(parsed.spine) ||
        parsed.spine.length !== 5 ||
        !parsed.spine.every(
          (d: unknown) => typeof d === 'number' && candidateDays.has(d)
        )
      ) {
        // Signal invalid → downstream node will fall back to rule spine.
        return { spine: [], sprintRecommended: false };
      }
      return {
        spine: parsed.spine as number[],
        sprintRecommended: Boolean(parsed.sprint_recommended),
      };
    };

    const explainNode = async (
      s: typeof State.State
    ): Promise<Partial<typeof State.State>> => {
      const finalSpine = s.spine.length === 5 ? s.spine : ruleSpine;
      const hintByDay = new Map(candidates.map((c) => [c.day, c.hint]));
      const lines = finalSpine
        .map((d) => `Day ${d}: ${hintByDay.get(d) ?? ''}`)
        .join('\n');
      const sys = new SystemMessage(
        "You write a single warm, specific paragraph (60–80 words) explaining a personalized " +
          "AI PM curriculum sequence. Address the learner as 'you'. Reference their background and " +
          'goal explicitly. No headings, no bullets, no markdown, no lists at the end.'
      );
      const usr = new HumanMessage(
        `Profile: ${JSON.stringify(s.profile)}\n` +
          `Recommended starting days: ${finalSpine.join(', ')}\n` +
          `Day hints:\n${lines}\n\n` +
          `Write 60–80 words of plain prose.`
      );
      const res = await model.invoke([sys, usr]);
      const text = safeText(res.content).trim();
      return { spine: finalSpine, rationale: text };
    };

    const graph = new StateGraph(State)
      .addNode('propose_spine', proposeNode)
      .addNode('validate_and_explain', explainNode)
      .addEdge(START, 'propose_spine')
      .addEdge('propose_spine', 'validate_and_explain')
      .addEdge('validate_and_explain', END)
      .compile();

    const result = await withTimeout(
      graph.invoke({ profile, candidates }),
      timeoutMs,
      'advisor_graph'
    );

    const spine =
      Array.isArray(result.spine) && result.spine.length === 5
        ? (result.spine as number[])
        : ruleSpine;
    const rationale =
      typeof result.rationale === 'string' && result.rationale.length > 20
        ? result.rationale
        : staticRationale(profile, spine);

    return {
      spine,
      rationale,
      reasonCodes,
      engine: 'agent',
      sprintRecommended: Boolean(result.sprintRecommended),
    };
  } catch {
    return fallback();
  }
}
