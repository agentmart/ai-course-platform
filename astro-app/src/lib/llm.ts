/**
 * LLM provider helper for LangChain.js / LangGraph.js agents.
 *
 * Single switch point for chat-model construction. When we move to Azure AI
 * Foundry (todo s7-foundry-llm), change provider routing here without touching
 * call sites — every agent calls `getChatModel(env, opts)` and gets back a
 * LangChain `BaseChatModel`.
 *
 * IMPORTANT (Cloudflare Workers): LangChain submodules pull in `node:fs` and
 * other Node-only built-ins at module init. We rely on `nodejs_compat`, but we
 * STILL lazy-import inside `getChatModel` so cold-start cost is paid only on
 * routes that actually invoke an LLM.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

export type LlmProvider = 'anthropic' | 'openai';

export interface LlmOptions {
  provider?: LlmProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmEnv {
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
}

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  // Mirrors repo memory about current model strings (see CLAUDE.md / day files).
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-5-mini',
};

/**
 * Build a LangChain chat model for the requested provider.
 *
 * - Defaults to Anthropic. Falls back to OpenAI if `provider: 'openai'`.
 * - Throws a clear Error if the chosen provider has no key in env. Callers
 *   should map that to a 503 response.
 * - Lazy-imports `@langchain/anthropic` / `@langchain/openai` so module init
 *   on cold-start Workers stays cheap.
 */
export async function getChatModel(
  env: LlmEnv,
  opts: LlmOptions = {}
): Promise<BaseChatModel> {
  const provider: LlmProvider = opts.provider ?? 'anthropic';
  const model = opts.model ?? DEFAULT_MODELS[provider];
  const temperature = opts.temperature ?? 0;
  const maxTokens = opts.maxTokens ?? 1024;

  if (provider === 'anthropic') {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    const { ChatAnthropic } = await import('@langchain/anthropic');
    return new ChatAnthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      model,
      temperature,
      maxTokens,
    }) as unknown as BaseChatModel;
  }

  if (provider === 'openai') {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    const { ChatOpenAI } = await import('@langchain/openai');
    return new ChatOpenAI({
      apiKey: env.OPENAI_API_KEY,
      model,
      temperature,
      maxTokens,
    }) as unknown as BaseChatModel;
  }

  throw new Error(`Unknown LLM provider: ${provider as string}`);
}

export { DEFAULT_MODELS };
