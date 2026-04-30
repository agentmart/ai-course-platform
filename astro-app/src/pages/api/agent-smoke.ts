/**
 * Smoke test for LangChain.js + LangGraph.js on Cloudflare Workers.
 *
 * GET /api/agent-smoke?q=<question>
 *   → builds a 1-node LangGraph state machine that calls the LLM once,
 *     returns { provider, model, response, latency_ms }.
 *
 * Auth: requires a Clerk bearer token (mirrors /api/progress.ts).
 * Purpose: prove the LangGraph runtime actually works on Workers before we
 * refactor the four pseudo-agents (gap-detector, interview, advisor, jobs).
 */
import type { APIRoute } from 'astro';
import { verifyClerkToken, bearerToken } from '~/lib/clerk';
import { jsonResponse, corsHeaders } from '~/lib/supabase';
import { envFrom } from '~/lib/handler';
import { getChatModel, type LlmProvider } from '~/lib/llm';

export const prerender = false;

export const OPTIONS: APIRoute = ({ locals }) => {
  const env = envFrom(locals);
  return new Response(null, {
    status: 204,
    headers: corsHeaders(env.NEXT_PUBLIC_APP_URL ?? '*'),
  });
};

export const GET: APIRoute = async ({ request, locals }) => {
  const env = envFrom(locals);
  const cors = {
    ...corsHeaders(env.NEXT_PUBLIC_APP_URL ?? '*'),
    'cache-control': 'no-store',
  };

  try {
    await verifyClerkToken(bearerToken(request), env);
  } catch {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim() || 'Reply with the single word: pong.';
  const providerParam = (url.searchParams.get('provider') ?? '').trim();
  const provider: LlmProvider | undefined =
    providerParam === 'openai' || providerParam === 'anthropic' ? providerParam : undefined;

  const effectiveProvider: LlmProvider =
    provider ?? (env.ANTHROPIC_API_KEY ? 'anthropic' : env.OPENAI_API_KEY ? 'openai' : 'anthropic');

  if (
    (effectiveProvider === 'anthropic' && !env.ANTHROPIC_API_KEY) ||
    (effectiveProvider === 'openai' && !env.OPENAI_API_KEY)
  ) {
    return jsonResponse(
      {
        error: 'LLM not configured',
        message: `No API key in env for provider "${effectiveProvider}". Set ANTHROPIC_API_KEY or OPENAI_API_KEY.`,
      },
      { status: 503, headers: cors }
    );
  }

  const t0 = Date.now();
  try {
    // Lazy-import LangGraph so cold-start cost is only paid on this route.
    const [{ StateGraph, MessagesAnnotation, END, START }] = await Promise.all([
      import('@langchain/langgraph'),
    ]);
    const { HumanMessage } = await import('@langchain/core/messages');

    const model = await getChatModel(env, { provider: effectiveProvider });

    // 1-node graph: START -> call_model -> END.
    const graph = new StateGraph(MessagesAnnotation)
      .addNode('call_model', async (state) => {
        const reply = await model.invoke(state.messages);
        return { messages: [reply] };
      })
      .addEdge(START, 'call_model')
      .addEdge('call_model', END)
      .compile();

    const result = await graph.invoke({ messages: [new HumanMessage(q)] });
    const last = result.messages[result.messages.length - 1];
    const text =
      typeof last?.content === 'string'
        ? last.content
        : Array.isArray(last?.content)
        ? last.content
            .map((c: unknown) =>
              typeof c === 'object' && c !== null && 'text' in (c as Record<string, unknown>)
                ? String((c as { text: unknown }).text)
                : ''
            )
            .join('')
        : '';

    return jsonResponse(
      {
        provider: effectiveProvider,
        // @ts-expect-error — model field exists on both ChatAnthropic and ChatOpenAI
        model: (model.model as string | undefined) ?? null,
        response: text,
        latency_ms: Date.now() - t0,
      },
      { headers: cors }
    );
  } catch (err) {
    return jsonResponse(
      {
        error: 'agent_failed',
        message: err instanceof Error ? err.message : String(err),
        latency_ms: Date.now() - t0,
      },
      { status: 500, headers: cors }
    );
  }
};
