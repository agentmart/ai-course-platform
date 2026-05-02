/**
 * LLM provider helper for LangChain.js / LangGraph.js agents.
 *
 * Single switch point for chat-model construction. Set `LLM_PROVIDER` in the
 * Worker environment to pin a provider; otherwise we auto-detect based on
 * which API keys are present (foundry > anthropic > openai). Every agent
 * calls `getChatModel(env, opts)` and gets back a LangChain `BaseChatModel`.
 *
 * IMPORTANT (Cloudflare Workers): LangChain submodules pull in `node:fs` and
 * other Node-only built-ins at module init. We rely on `nodejs_compat`, but we
 * STILL lazy-import inside `getChatModel` so cold-start cost is paid only on
 * routes that actually invoke an LLM.
 *
 * Foundry note: Azure AI Foundry exposes an OpenAI-compatible Chat
 * Completions endpoint. We reuse `@langchain/openai`'s `ChatOpenAI` with a
 * custom `configuration.baseURL` and the `api-key` header — works for
 * `gpt-4o-mini`, `gpt-5-mini`, Llama / Mistral / Phi deployments alike.
 * Endpoint shape: https://<resource>.openai.azure.com/openai/deployments/<deployment>
 * or for Foundry models: https://<resource>.services.ai.azure.com/models
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

export type LlmProvider = 'anthropic' | 'openai' | 'foundry';

export interface LlmOptions {
  provider?: LlmProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmEnv {
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  AZURE_FOUNDRY_API_KEY?: string;
  AZURE_FOUNDRY_ENDPOINT?: string;
  AZURE_FOUNDRY_API_VERSION?: string;
  AZURE_FOUNDRY_DEFAULT_MODEL?: string;
  LLM_PROVIDER?: string;
}

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  // Mirrors repo memory about current model strings (see CLAUDE.md / day files).
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-5-mini',
  foundry: 'gpt-4o-mini',
};

/**
 * Pick a default provider: explicit LLM_PROVIDER env > foundry (if configured)
 * > anthropic (if configured) > openai. Throws if none configured.
 */
function resolveProvider(env: LlmEnv): LlmProvider {
  const explicit = (env.LLM_PROVIDER || '').toLowerCase().trim();
  if (explicit === 'foundry' || explicit === 'anthropic' || explicit === 'openai') {
    return explicit as LlmProvider;
  }
  if (env.AZURE_FOUNDRY_API_KEY && env.AZURE_FOUNDRY_ENDPOINT) return 'foundry';
  if (env.ANTHROPIC_API_KEY) return 'anthropic';
  if (env.OPENAI_API_KEY) return 'openai';
  throw new Error('No LLM provider configured (set AZURE_FOUNDRY_*, ANTHROPIC_API_KEY, or OPENAI_API_KEY)');
}

/**
 * Build a LangChain chat model for the requested provider.
 *
 * - Defaults via `resolveProvider(env)` — Foundry preferred when configured.
 * - Throws a clear Error if the chosen provider has no key in env. Callers
 *   should map that to a 503 response.
 * - Lazy-imports provider packages so module init on cold-start Workers stays
 *   cheap.
 */
export async function getChatModel(
  env: LlmEnv,
  opts: LlmOptions = {}
): Promise<BaseChatModel> {
  const provider: LlmProvider = opts.provider ?? resolveProvider(env);
  const model = opts.model ?? (provider === 'foundry'
    ? (env.AZURE_FOUNDRY_DEFAULT_MODEL || DEFAULT_MODELS.foundry)
    : DEFAULT_MODELS[provider]);
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

  if (provider === 'foundry') {
    if (!env.AZURE_FOUNDRY_API_KEY || !env.AZURE_FOUNDRY_ENDPOINT) {
      throw new Error('AZURE_FOUNDRY_API_KEY and AZURE_FOUNDRY_ENDPOINT required for foundry');
    }
    const baseURL = env.AZURE_FOUNDRY_ENDPOINT.replace(/\/+$/, '');
    // Foundry's "v1" inference endpoint (e.g. .../openai/v1) is stable and
    // does NOT take an `api-version` query param. The classic Azure OpenAI
    // path (.../openai/deployments/<name>) does. Detect by suffix.
    const isV1 = /\/openai\/v1(\/.*)?$/.test(baseURL);
    const apiVersion = env.AZURE_FOUNDRY_API_VERSION || '2024-08-01-preview';
    const { ChatOpenAI } = await import('@langchain/openai');
    return new ChatOpenAI({
      apiKey: env.AZURE_FOUNDRY_API_KEY,
      model,
      temperature,
      maxTokens,
      configuration: {
        baseURL,
        defaultHeaders: { 'api-key': env.AZURE_FOUNDRY_API_KEY },
        ...(isV1 ? {} : { defaultQuery: { 'api-version': apiVersion } }),
      },
    }) as unknown as BaseChatModel;
  }

  throw new Error(`Unknown LLM provider: ${provider as string}`);
}

export { DEFAULT_MODELS };
