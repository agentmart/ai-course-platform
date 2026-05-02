import type { APIRoute } from 'astro';
import { envFrom, getSupabaseAdmin, jsonResponse, appCors } from '~/lib/handler';
import { verifyClerkToken, bearerToken } from '~/lib/clerk';
// @ts-expect-error — JS module without types
import { profileToSpine, staticRationale } from '~/lib/advisor-rules.mjs';
import { runAdvisor, type AdvisorProfile } from '~/lib/agents/advisor';

export const prerender = false;

const VALID: Record<string, string[]> = {
  background: ['engineer', 'pm_non_ai', 'pm_ai', 'designer', 'other'],
  yearsExp: ['0_2', '3_5', '6_10', '10_plus'],
  aiLevel: ['chatgpt', 'prompts', 'rag', 'shipped'],
  targetCo: ['frontier', 'startup', 'enterprise', 'non_ai'],
  goal: ['land_role', 'add_ai', 'build_product', 'literacy'],
};

const MODELS_ENDPOINT = 'https://models.github.ai/inference/chat/completions';

function sanitize(answers: any): Record<string, string> | null {
  if (!answers || typeof answers !== 'object') return null;
  const out: Record<string, string> = {};
  for (const [k, allowed] of Object.entries(VALID)) {
    if (!allowed.includes(answers[k])) return null;
    out[k] = answers[k];
  }
  return out;
}

async function llmRationale(
  answers: Record<string, string>,
  spine: number[],
  daySubtitles: string[],
  token: string | undefined,
  modelId: string
): Promise<string | null> {
  if (!token) return null;
  const sys =
    "You write a single warm, specific paragraph (60–80 words) explaining a personalized AI PM curriculum sequence to the learner. Address them as 'you'. No headings, no bullets, no markdown.";
  const user = `Profile: ${JSON.stringify(answers)}
Recommended starting days: ${spine.join(', ')}
Day subtitles for the recommended days:
${spine.map((d, i) => `Day ${d}: ${daySubtitles[i] ?? ''}`).join('\n')}

Write 60–80 words explaining why this sequence is right for them, in plain prose. Reference their background and goal explicitly. Do not list the days again at the end.`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch(MODELS_ENDPOINT, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user },
        ],
        max_tokens: 220,
        temperature: 0.5,
      }),
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = (data.choices?.[0]?.message?.content ?? '').trim();
    return text || null;
  } catch {
    return null;
  }
}

export const OPTIONS: APIRoute = ({ locals }) =>
  new Response(null, { status: 204, headers: appCors(envFrom(locals)) });

export const GET: APIRoute = async ({ locals, request }) => {
  const env = envFrom(locals);
  const cors = { ...appCors(env), 'cache-control': 'no-store' };
  let user;
  try {
    user = await verifyClerkToken(bearerToken(request), env);
  } catch {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }
  const supabase = getSupabaseAdmin(env);
  const { data: row } = await supabase
    .from('user_access')
    .select('id, progress_data')
    .eq('clerk_user_id', user.sub)
    .maybeSingle();
  const advisor = (row?.progress_data && row.progress_data.course_advisor) ?? null;
  return jsonResponse({ advisor }, { headers: cors });
};

export const POST: APIRoute = async ({ locals, request }) => {
  const env = envFrom(locals);
  const cors = { ...appCors(env), 'cache-control': 'no-store' };
  let user;
  try {
    user = await verifyClerkToken(bearerToken(request), env);
  } catch {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }
  const supabase = getSupabaseAdmin(env);

  let { data: row } = await supabase
    .from('user_access')
    .select('id, progress_data')
    .eq('clerk_user_id', user.sub)
    .maybeSingle();

  if (!row) {
    if (!user.email) {
      return jsonResponse({ error: 'Email required' }, { status: 400, headers: cors });
    }
    const { data: created, error } = await supabase
      .from('user_access')
      .insert({
        clerk_user_id: user.sub,
        email: user.email,
        tier: 'free',
        access_level: 1,
        progress_data: {},
      })
      .select('id, progress_data')
      .single();
    if (error) return jsonResponse({ error: 'Failed to create user record' }, { status: 500, headers: cors });
    row = created;
  }

  const body = (await request.json().catch(() => ({}))) as any;
  if (body.skip === true) {
    const merged = {
      ...(row.progress_data ?? {}),
      course_advisor: { skipped: true, generated_at: new Date().toISOString() },
    };
    await supabase
      .from('user_access')
      .update({ progress_data: merged, updated_at: new Date().toISOString() })
      .eq('id', row.id);
    return jsonResponse({ advisor: merged.course_advisor }, { headers: cors });
  }

  const answers = sanitize(body.answers);
  if (!answers) {
    return jsonResponse(
      { error: 'Invalid answers — every quiz key is required.' },
      { status: 400, headers: cors }
    );
  }

  const subtitles = Array.isArray(body.daySubtitles) ? body.daySubtitles.slice(0, 5) : [];

  // Engine selector (hidden A/B knob): ?engine=agent|rules. Defaults to 'agent'
  // (LangGraph) and falls back to the legacy rule path on any error.
  const url = new URL(request.url);
  const engineParam = (url.searchParams.get('engine') || '').toLowerCase();
  const useAgent = engineParam !== 'rules';

  let spine: number[];
  let rationale: string;
  let reasonCodes: string[];
  let engine: 'agent' | 'rules' = 'rules';
  let sprintRecommended = false;

  if (useAgent) {
    try {
      const result = await runAdvisor(env as any, answers as AdvisorProfile, {
        daySubtitles: subtitles,
      });
      spine = result.spine;
      rationale = result.rationale;
      reasonCodes = result.reasonCodes;
      engine = result.engine;
      sprintRecommended = result.sprintRecommended ?? false;
    } catch {
      const r = profileToSpine(answers) as { spine: number[]; reasonCodes: string[] };
      spine = r.spine;
      reasonCodes = r.reasonCodes;
      // @ts-expect-error — env may not have ADVISOR_MODEL/GH_MODELS_TOKEN typed
      const ghToken = env.GH_MODELS_TOKEN ?? env.GITHUB_TOKEN;
      // @ts-expect-error
      const modelId = env.ADVISOR_MODEL ?? 'openai/gpt-4.1';
      rationale =
        (await llmRationale(answers, spine, subtitles, ghToken, modelId)) ??
        staticRationale(answers, spine);
    }
  } else {
    const r = profileToSpine(answers) as { spine: number[]; reasonCodes: string[] };
    spine = r.spine;
    reasonCodes = r.reasonCodes;
    // @ts-expect-error — env may not have ADVISOR_MODEL/GH_MODELS_TOKEN typed
    const ghToken = env.GH_MODELS_TOKEN ?? env.GITHUB_TOKEN;
    // @ts-expect-error
    const modelId = env.ADVISOR_MODEL ?? 'openai/gpt-4.1';
    rationale =
      (await llmRationale(answers, spine, subtitles, ghToken, modelId)) ??
      staticRationale(answers, spine);
  }

  const advisor = {
    profile: answers,
    spine,
    rationale,
    reason_codes: reasonCodes,
    engine,
    sprint_recommended: sprintRecommended,
    completed_spine: false,
    skipped: false,
    generated_at: new Date().toISOString(),
  };
  const merged = { ...(row.progress_data ?? {}), course_advisor: advisor };
  const { error: updErr } = await supabase
    .from('user_access')
    .update({ progress_data: merged, updated_at: new Date().toISOString() })
    .eq('id', row.id);
  if (updErr) {
    return jsonResponse({ error: 'Failed to persist advisor result' }, { status: 500, headers: cors });
  }
  return jsonResponse({ advisor }, { headers: cors });
};
