// TEMPORARY diagnostic endpoint — verifies Foundry connectivity without Clerk
// auth. To be removed after Sprint 7 wiring is verified in production.
//
// GET /api/foundry-diag
//   → calls Foundry directly, returns { ok, model, response, latency_ms }
//
// Safe-ish because: (a) only runs if AZURE_FOUNDRY_* secrets are set,
// (b) caps maxTokens at 32 so abuse cost is bounded, (c) no user input
// reaches the model.
import type { APIRoute } from 'astro';
import { jsonResponse, corsHeaders } from '~/lib/supabase';
import { envFrom } from '~/lib/handler';
import { getChatModel } from '~/lib/llm';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const env = envFrom(locals);
  const cors = { ...corsHeaders(env.NEXT_PUBLIC_APP_URL ?? '*'), 'cache-control': 'no-store' };
  const t0 = Date.now();
  try {
    const model = await getChatModel(env, { provider: 'foundry', maxTokens: 32 });
    const { HumanMessage } = await import('@langchain/core/messages');
    const reply = await model.invoke([new HumanMessage('Reply with the single word: pong.')]);
    const text = typeof reply?.content === 'string' ? reply.content : JSON.stringify(reply?.content);
    return jsonResponse(
      {
        ok: true,
        // @ts-expect-error model field present on ChatOpenAI
        model: (model.model as string | undefined) ?? null,
        endpoint_kind: env.AZURE_FOUNDRY_ENDPOINT?.includes('/openai/v1') ? 'v1' : 'classic',
        response: text,
        latency_ms: Date.now() - t0,
      },
      { headers: cors }
    );
  } catch (err) {
    return jsonResponse(
      {
        ok: false,
        error: 'foundry_failed',
        message: err instanceof Error ? err.message : String(err),
        endpoint_set: !!env.AZURE_FOUNDRY_ENDPOINT,
        key_set: !!env.AZURE_FOUNDRY_API_KEY,
        endpoint_kind: env.AZURE_FOUNDRY_ENDPOINT?.includes('/openai/v1') ? 'v1' : 'classic',
        latency_ms: Date.now() - t0,
      },
      { status: 500, headers: cors }
    );
  }
};
