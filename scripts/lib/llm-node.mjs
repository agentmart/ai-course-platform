/**
 * Node-side LLM helper for cron scripts (mirrors astro-app/src/lib/llm.ts).
 *
 * Reads from process.env (no Worker env binding). Auto-detects provider:
 * foundry > anthropic > openai. Foundry is treated as OpenAI-compatible —
 * same `/openai/v1` suffix detection so we don't append `api-version` when
 * the endpoint is the v1 inference path.
 *
 * Usage:
 *   const model = await getChatModelNode({ maxTokens: 600, temperature: 0 });
 *   const res   = await model.invoke([{ role: 'system', content: '...' }, ...]);
 *
 * Throws clearly when no provider is configured so callers can wrap & exit.
 */

const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-5-mini',
  foundry: 'gpt-4o-mini',
};

function resolveProvider() {
  const explicit = (process.env.LLM_PROVIDER || '').toLowerCase().trim();
  if (explicit === 'foundry' || explicit === 'anthropic' || explicit === 'openai') {
    return explicit;
  }
  if (process.env.AZURE_FOUNDRY_API_KEY && process.env.AZURE_FOUNDRY_ENDPOINT) return 'foundry';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  throw new Error('No LLM provider configured (set AZURE_FOUNDRY_*, ANTHROPIC_API_KEY, or OPENAI_API_KEY)');
}

export async function getChatModelNode(opts = {}) {
  const provider = opts.provider || resolveProvider();
  const model = opts.model || (provider === 'foundry'
    ? (process.env.AZURE_FOUNDRY_DEFAULT_MODEL || DEFAULT_MODELS.foundry)
    : DEFAULT_MODELS[provider]);
  const temperature = opts.temperature ?? 0;
  const maxTokens = opts.maxTokens ?? 600;

  if (provider === 'anthropic') {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured');
    const { ChatAnthropic } = await import('@langchain/anthropic');
    return new ChatAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model, temperature, maxTokens });
  }

  if (provider === 'openai') {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
    const { ChatOpenAI } = await import('@langchain/openai');
    return new ChatOpenAI({ apiKey: process.env.OPENAI_API_KEY, model, temperature, maxTokens });
  }

  if (provider === 'foundry') {
    const key = process.env.AZURE_FOUNDRY_API_KEY;
    const endpoint = process.env.AZURE_FOUNDRY_ENDPOINT;
    if (!key || !endpoint) throw new Error('AZURE_FOUNDRY_API_KEY and AZURE_FOUNDRY_ENDPOINT required for foundry');
    const baseURL = endpoint.replace(/\/+$/, '');
    const isV1 = /\/openai\/v1(\/.*)?$/.test(baseURL);
    const apiVersion = process.env.AZURE_FOUNDRY_API_VERSION || '2024-08-01-preview';
    const { ChatOpenAI } = await import('@langchain/openai');
    return new ChatOpenAI({
      apiKey: key,
      model,
      temperature,
      maxTokens,
      configuration: {
        baseURL,
        defaultHeaders: { 'api-key': key },
        ...(isV1 ? {} : { defaultQuery: { 'api-version': apiVersion } }),
      },
    });
  }

  throw new Error(`Unknown LLM provider: ${provider}`);
}

export { DEFAULT_MODELS };
