// api/models.js — GET: public read of llm_models | POST: cron-secured pricing upsert
// POST now fetches live pricing from LiteLLM's community-maintained database,
// with a curated allowlist + hand-written descriptions. Falls back to FALLBACK_PRICING on fetch failure.
import { createClient } from '@supabase/supabase-js';

const LITELLM_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

// ── Provider → LiteLLM key prefix mapping ──────────────────────────────────────
// Each entry maps our display company name to the LiteLLM key prefix used to look up models.
// "models" is the curated allowlist of model_ids we want in our calculator.
const PROVIDER_CONFIG = {
  Anthropic: { prefix: '',           models: ['claude-opus-4-6','claude-sonnet-4-6','claude-haiku-4-5'] },
  OpenAI:    { prefix: '',           models: ['gpt-5.4','gpt-5.4-mini','gpt-5.4-nano','gpt-5.4-pro','gpt-5','gpt-5-mini','o3','o3-pro','o4-mini','gpt-4.1','text-embedding-3-large'] },
  Google:    { prefix: 'gemini/',    models: ['gemini-3.1-pro-preview','gemini-3-flash-preview','gemini-3.1-flash-lite-preview','gemini-2.5-pro','gemini-2.5-flash','gemini-2.5-flash-lite','gemini-embedding-001'] },
  Meta:      { prefix: 'deepinfra/meta-llama/', models: ['Llama-4-Maverick-17B-128E-Instruct-FP8','Llama-4-Scout-17B-16E-Instruct'] },
  Mistral:   { prefix: 'mistral/',   models: ['mistral-large-2411','mistral-small-latest','codestral-2508'] },
  DeepSeek:  { prefix: 'deepseek/',  models: ['deepseek-r1','deepseek-v3','deepseek-v3.2'] },
  xAI:       { prefix: 'xai/',       models: ['grok-4','grok-3','grok-3-mini','grok-4-1-fast-non-reasoning','grok-code-fast-1'] },
  Cohere:    { prefix: '',           models: ['command-a-03-2025','command-r-plus','command-r'] },
  Amazon:    { prefix: 'amazon-nova/', models: ['nova-premier-v1','nova-pro-v1','nova-lite-v1','nova-micro-v1'] },
  Microsoft: { prefix: 'azure_ai/',  models: ['MAI-DS-R1','Phi-4','Phi-4-mini-instruct','Phi-4-reasoning'] },
  Nvidia:    { prefix: '',           models: ['nvidia.nemotron-super-3-120b','nvidia.nemotron-nano-3-30b'] },
};

// ── Human-readable overrides — LiteLLM doesn't provide these ────────────────
// Keys are model_ids as stored in our DB (canonical short names).
const MODEL_OVERRIDES = {
  // Anthropic
  'claude-opus-4-6':       { name:'Claude Opus 4.6',          model_type:'chat',       best_for:'Most capable Claude; flagship reasoning, complex coding, PhD-level analysis, 1M context',              pricing_url:'https://www.anthropic.com/pricing' },
  'claude-sonnet-4-6':     { name:'Claude Sonnet 4.6',        model_type:'chat',       best_for:'Best balance of speed and intelligence; default for production workloads, 1M context',                  pricing_url:'https://www.anthropic.com/pricing' },
  'claude-haiku-4-5':      { name:'Claude Haiku 4.5',         model_type:'chat',       best_for:'Fastest and most affordable Claude; high-volume pipelines, classification, extraction',                  pricing_url:'https://www.anthropic.com/pricing' },
  // OpenAI
  'gpt-5.4':               { name:'GPT-5.4',                  model_type:'multimodal', best_for:'OpenAI flagship; frontier coding, computer use, and knowledge work in one model',                        pricing_url:'https://openai.com/api/pricing/' },
  'gpt-5.4-mini':          { name:'GPT-5.4 Mini',             model_type:'multimodal', best_for:'Fast, affordable GPT-5.4 variant; 70% lower cost with near-flagship coding performance',                 pricing_url:'https://openai.com/api/pricing/' },
  'gpt-5.4-nano':          { name:'GPT-5.4 Nano',             model_type:'multimodal', best_for:'Cheapest GPT-5.4 class; classification, extraction, ranking, and lightweight subagents at scale',         pricing_url:'https://openai.com/api/pricing/' },
  'gpt-5.4-pro':           { name:'GPT-5.4 Pro',              model_type:'reasoning',  best_for:'Highest-capability OpenAI reasoning model; extended thinking for research-grade multi-step problems',     pricing_url:'https://openai.com/api/pricing/' },
  'gpt-5':                 { name:'GPT-5',                    model_type:'chat',       best_for:'Previous OpenAI flagship; strong general-purpose model with 272K context',                                pricing_url:'https://openai.com/api/pricing/' },
  'gpt-5-mini':            { name:'GPT-5 Mini',               model_type:'chat',       best_for:'Affordable GPT-5 variant; good for medium-complexity tasks at lower cost',                                pricing_url:'https://openai.com/api/pricing/' },
  'o3':                    { name:'o3',                        model_type:'reasoning',  best_for:'Dedicated reasoning model; state-of-the-art on math, science, and multi-step logic',                     pricing_url:'https://openai.com/api/pricing/' },
  'o3-pro':                { name:'o3-pro',                    model_type:'reasoning',  best_for:'Premium o3 with extended compute; highest accuracy on complex reasoning benchmarks',                      pricing_url:'https://openai.com/api/pricing/' },
  'o4-mini':               { name:'o4-mini',                   model_type:'reasoning',  best_for:'Fast, cost-efficient reasoning; strong on coding and structured problem-solving',                         pricing_url:'https://openai.com/api/pricing/' },
  'gpt-4.1':               { name:'GPT-4.1',                  model_type:'chat',       best_for:'Previous generation 1M context model; strong instruction following, superseded by GPT-5.4',               pricing_url:'https://openai.com/api/pricing/' },
  'text-embedding-3-large':{ name:'text-embedding-3-large',   model_type:'embedding',  best_for:'Best OpenAI embedding for semantic search, RAG, and similarity tasks',                                    pricing_url:'https://openai.com/api/pricing/' },
  // Google
  'gemini-3.1-pro-preview':       { name:'Gemini 3.1 Pro',           model_type:'multimodal', best_for:'Google flagship; latest multimodal intelligence, agentic capabilities, and code generation',         pricing_url:'https://ai.google.dev/pricing' },
  'gemini-3-flash-preview':       { name:'Gemini 3 Flash',           model_type:'multimodal', best_for:'Frontier intelligence built for speed; superior search grounding and 1M context',                     pricing_url:'https://ai.google.dev/pricing' },
  'gemini-3.1-flash-lite-preview':{ name:'Gemini 3.1 Flash-Lite',    model_type:'multimodal', best_for:'Most cost-efficient Gemini 3; optimised for high-volume agentic tasks and translation',              pricing_url:'https://ai.google.dev/pricing' },
  'gemini-2.5-pro':        { name:'Gemini 2.5 Pro',            model_type:'multimodal', best_for:'Best value premium model — excels at coding and complex reasoning with 1M context',                       pricing_url:'https://ai.google.dev/pricing' },
  'gemini-2.5-flash':      { name:'Gemini 2.5 Flash',          model_type:'multimodal', best_for:'Hybrid reasoning model with 1M context and thinking budgets; great for summarisation at scale',            pricing_url:'https://ai.google.dev/pricing' },
  'gemini-2.5-flash-lite': { name:'Gemini 2.5 Flash-Lite',     model_type:'multimodal', best_for:'Smallest Gemini; most cost-effective for high-volume batch workloads',                                     pricing_url:'https://ai.google.dev/pricing' },
  'gemini-embedding-001':  { name:'Gemini Embedding',           model_type:'embedding',  best_for:'Google text embedding for RAG pipelines, semantic retrieval, and similarity scoring',                      pricing_url:'https://ai.google.dev/pricing' },
  // Meta
  'Llama-4-Maverick-17B-128E-Instruct-FP8': { name:'Llama 4 Maverick',          model_type:'multimodal', best_for:'Meta open-weight multimodal; strong reasoning at very low cost via third-party APIs',                      pricing_url:'https://llama.meta.com/' },
  'Llama-4-Scout-17B-16E-Instruct':         { name:'Llama 4 Scout',             model_type:'chat',       best_for:'Record 10M context — exceptional for ultra-long document analysis and entire codebase ingestion',          pricing_url:'https://llama.meta.com/' },
  // Mistral
  'mistral-large-2411':    { name:'Mistral Large 2',           model_type:'chat',       best_for:'Frontier Mistral; strong multilingual, structured outputs, and function calling',                           pricing_url:'https://mistral.ai/technology/#pricing' },
  'mistral-small-latest':  { name:'Mistral Small 3.2',         model_type:'chat',       best_for:'Latest lightweight Mistral for high-volume classification, summarisation, and extraction',                  pricing_url:'https://mistral.ai/technology/#pricing' },
  'codestral-2508':        { name:'Codestral',                 model_type:'code',       best_for:'Mistral code-specialist; fill-in-the-middle, code completion, and instruction-following',                   pricing_url:'https://mistral.ai/technology/#pricing' },
  // DeepSeek
  'deepseek-r1':           { name:'DeepSeek R1',               model_type:'reasoning',  best_for:'Open-source chain-of-thought reasoning matching o1; best cost-performance in reasoning category',          pricing_url:'https://api-docs.deepseek.com/quick_start/pricing' },
  'deepseek-v3':           { name:'DeepSeek V3',               model_type:'chat',       best_for:'DeepSeek general chat flagship; excellent cost-performance for coding and structured tasks',                pricing_url:'https://api-docs.deepseek.com/quick_start/pricing' },
  'deepseek-v3.2':         { name:'DeepSeek V3.2',             model_type:'chat',       best_for:'Latest DeepSeek iteration; improved coding and reasoning at 164K context',                                  pricing_url:'https://api-docs.deepseek.com/quick_start/pricing' },
  // xAI
  'grok-4':                { name:'Grok 4',                    model_type:'chat',       best_for:'xAI latest flagship; 256K context with real-time X/Twitter data integration',                               pricing_url:'https://x.ai/api' },
  'grok-3':                { name:'Grok 3',                    model_type:'chat',       best_for:'xAI previous flagship; strong at current events, analysis, and long-context reasoning',                      pricing_url:'https://x.ai/api' },
  'grok-3-mini':           { name:'Grok 3 Mini',               model_type:'reasoning',  best_for:'Lightweight reasoning variant of Grok 3; fast and cost-efficient for structured analysis',                   pricing_url:'https://x.ai/api' },
  'grok-4-1-fast-non-reasoning': { name:'Grok 4.1 Fast',       model_type:'chat',       best_for:'Ultra-fast Grok with 2M context; high-throughput processing at very low cost',                              pricing_url:'https://x.ai/api' },
  'grok-code-fast-1':      { name:'Grok Code Fast',            model_type:'code',       best_for:'xAI code-specialised model; fast code generation and completion at low cost',                                pricing_url:'https://x.ai/api' },
  // Cohere
  'command-a-03-2025':     { name:'Command A',                 model_type:'chat',       best_for:'Latest Cohere flagship (March 2025); 256K context optimised for enterprise RAG and tool use',                pricing_url:'https://cohere.com/pricing' },
  'command-r-plus':        { name:'Command R+',                model_type:'chat',       best_for:'Cohere enterprise flagship for RAG pipelines, tool use, and structured data extraction',                     pricing_url:'https://cohere.com/pricing' },
  'command-r':             { name:'Command R',                 model_type:'chat',       best_for:'Efficient Cohere model for retrieval-augmented generation and large-scale summarisation',                     pricing_url:'https://cohere.com/pricing' },
  // Amazon
  'nova-premier-v1':       { name:'Amazon Nova Premier',       model_type:'chat',       best_for:'Amazon flagship Nova; 1M context, strongest Bedrock-native model for complex enterprise workloads',          pricing_url:'https://aws.amazon.com/bedrock/pricing/' },
  'nova-pro-v1':           { name:'Amazon Nova Pro',           model_type:'multimodal', best_for:'Amazon multimodal workhorse; strong capabilities for enterprise workloads on Bedrock',                        pricing_url:'https://aws.amazon.com/bedrock/pricing/' },
  'nova-lite-v1':          { name:'Amazon Nova Lite',          model_type:'multimodal', best_for:'Cost-optimised Nova for lightweight multimodal processing in high-volume Bedrock pipelines',                  pricing_url:'https://aws.amazon.com/bedrock/pricing/' },
  'nova-micro-v1':         { name:'Amazon Nova Micro',         model_type:'chat',       best_for:'Cheapest Amazon model; text-only, ideal for simple classification and extraction at scale',                   pricing_url:'https://aws.amazon.com/bedrock/pricing/' },
  // Microsoft
  'MAI-DS-R1':             { name:'MAI-DS-R1',                 model_type:'reasoning',  best_for:'Azure-hosted DeepSeek R1 distillation; enterprise reasoning on Azure AI Foundry',                             pricing_url:'https://azure.microsoft.com/en-us/products/ai-foundry/' },
  'Phi-4':                 { name:'Phi-4',                     model_type:'chat',       best_for:'Microsoft compact SLM; strong reasoning for its size, efficient for on-device and edge deployment',           pricing_url:'https://azure.microsoft.com/en-us/products/ai-foundry/' },
  'Phi-4-mini-instruct':   { name:'Phi-4 Mini',                model_type:'chat',       best_for:'Smallest Phi-4 variant; 131K context, cost-efficient for lightweight Azure workloads',                        pricing_url:'https://azure.microsoft.com/en-us/products/ai-foundry/' },
  'Phi-4-reasoning':       { name:'Phi-4 Reasoning',           model_type:'reasoning',  best_for:'Phi-4 with chain-of-thought reasoning; compact alternative to larger reasoning models',                       pricing_url:'https://azure.microsoft.com/en-us/products/ai-foundry/' },
  // Nvidia
  'nvidia.nemotron-super-3-120b': { name:'Nemotron Super 3 120B', model_type:'chat',    best_for:'Nvidia flagship open model; enterprise-grade for complex generation and analysis on Bedrock',                 pricing_url:'https://build.nvidia.com/explore/discover' },
  'nvidia.nemotron-nano-3-30b':   { name:'Nemotron Nano 3 30B',   model_type:'chat',    best_for:'Compact Nvidia model; cost-efficient for synthetic data generation and fine-tuning pipelines',                 pricing_url:'https://build.nvidia.com/explore/discover' },
};

// ── Map LiteLLM mode → our model_type ────────────────────────────────────────
function mapMode(mode) {
  if (mode === 'embedding') return 'embedding';
  if (mode === 'image_generation') return 'multimodal';
  return 'chat'; // 'chat', 'responses', 'completion' all map to 'chat'
}

// ── Fetch + transform pricing from LiteLLM ──────────────────────────────────
async function fetchLiteLLMPricing() {
  const resp = await fetch(LITELLM_URL, { signal: AbortSignal.timeout(15000) });
  if (!resp.ok) throw new Error(`LiteLLM fetch failed: ${resp.status}`);
  const data = await resp.json();

  const results = [];
  const discovered = []; // models in LiteLLM but not in our overrides

  for (const [company, config] of Object.entries(PROVIDER_CONFIG)) {
    for (const modelId of config.models) {
      const litellmKey = config.prefix + modelId;
      const entry = data[litellmKey];
      if (!entry || typeof entry.input_cost_per_token !== 'number') {
        // Not found in LiteLLM — skip (will be logged)
        discovered.push(`MISS ${litellmKey} (not in LiteLLM)`);
        continue;
      }

      const override = MODEL_OVERRIDES[modelId] || {};
      const input = Math.round(entry.input_cost_per_token * 1000000 * 1000) / 1000;
      const output = Math.round((entry.output_cost_per_token || 0) * 1000000 * 1000) / 1000;
      const ctx = entry.max_input_tokens || entry.max_tokens || 0;
      const depDate = entry.deprecation_date || '';
      const status = depDate ? 'deprecated' : (entry.status || 'active');

      if (!override.name) {
        discovered.push(`NEW ${litellmKey}: $${input}/$${output} per 1M, ctx=${ctx} — needs override`);
      }

      results.push({
        company,
        model_id:  modelId,
        name:      override.name || modelId,
        model_type: override.model_type || mapMode(entry.mode),
        input,
        output,
        ctx,
        status,
        best_for:    override.best_for || `${company} model — ${modelId}`,
        pricing_url: override.pricing_url || '',
      });
    }
  }

  return { results, discovered };
}

// ── Fallback: hardcoded snapshot in case LiteLLM fetch fails ────────────────
const FALLBACK_PRICING = [
  { company:'Anthropic', model_id:'claude-opus-4-6',        name:'Claude Opus 4.6',         model_type:'chat',       input:5.0,   output:25.0,  ctx:1000000,  status:'active',  best_for:'Most capable Claude; flagship reasoning, complex coding, PhD-level analysis, 1M context',              pricing_url:'https://www.anthropic.com/pricing' },
  { company:'Anthropic', model_id:'claude-sonnet-4-6',      name:'Claude Sonnet 4.6',       model_type:'chat',       input:3.0,   output:15.0,  ctx:1000000,  status:'active',  best_for:'Best balance of speed and intelligence; default for production workloads, 1M context',                  pricing_url:'https://www.anthropic.com/pricing' },
  { company:'Anthropic', model_id:'claude-haiku-4-5',       name:'Claude Haiku 4.5',        model_type:'chat',       input:1.0,   output:5.0,   ctx:200000,   status:'active',  best_for:'Fastest and most affordable Claude; high-volume pipelines, classification, extraction',                  pricing_url:'https://www.anthropic.com/pricing' },
  { company:'OpenAI',    model_id:'gpt-5.4',                name:'GPT-5.4',                 model_type:'multimodal', input:2.5,   output:15.0,  ctx:1000000,  status:'active',  best_for:'OpenAI flagship; frontier coding, computer use, and knowledge work in one model',                        pricing_url:'https://openai.com/api/pricing/' },
  { company:'OpenAI',    model_id:'gpt-5.4-mini',           name:'GPT-5.4 Mini',            model_type:'multimodal', input:0.75,  output:4.5,   ctx:400000,   status:'active',  best_for:'Fast, affordable GPT-5.4 variant; 70% lower cost with near-flagship coding performance',                 pricing_url:'https://openai.com/api/pricing/' },
  { company:'OpenAI',    model_id:'gpt-5.4-nano',           name:'GPT-5.4 Nano',            model_type:'multimodal', input:0.2,   output:1.25,  ctx:400000,   status:'active',  best_for:'Cheapest GPT-5.4 class; classification, extraction, ranking at scale',                                   pricing_url:'https://openai.com/api/pricing/' },
  { company:'OpenAI',    model_id:'o3',                     name:'o3',                      model_type:'reasoning',  input:10.0,  output:40.0,  ctx:200000,   status:'active',  best_for:'Dedicated reasoning model; state-of-the-art on math, science, and multi-step logic',                     pricing_url:'https://openai.com/api/pricing/' },
  { company:'OpenAI',    model_id:'o4-mini',                name:'o4-mini',                 model_type:'reasoning',  input:1.1,   output:4.4,   ctx:200000,   status:'active',  best_for:'Fast, cost-efficient reasoning; strong on coding and structured problem-solving',                         pricing_url:'https://openai.com/api/pricing/' },
  { company:'Google',    model_id:'gemini-2.5-pro',         name:'Gemini 2.5 Pro',          model_type:'multimodal', input:1.25,  output:10.0,  ctx:1000000,  status:'active',  best_for:'Best value premium model — excels at coding and complex reasoning with 1M context',                       pricing_url:'https://ai.google.dev/pricing' },
  { company:'Google',    model_id:'gemini-2.5-flash',       name:'Gemini 2.5 Flash',        model_type:'multimodal', input:0.3,   output:2.5,   ctx:1000000,  status:'active',  best_for:'Hybrid reasoning with 1M context and thinking budgets; great for summarisation at scale',                 pricing_url:'https://ai.google.dev/pricing' },
];

export default async function handler(req, res) {
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cron-secret');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // GET — public read of llm_models table (cached)
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    try {
      const { data, error } = await supabase
        .from('llm_models')
        .select('id,company,model_id,name,model_type,input_price_per_1m,output_price_per_1m,context_window,best_for,status,pricing_url,last_price_check')
        .order('company')
        .order('input_price_per_1m', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ models: data, updatedAt: new Date().toISOString() });
    } catch (e) {
      console.error('[models] read error:', e?.message);
      return res.status(500).json({ error: 'Failed to load models' });
    }
  }

  // POST — cron-secured pricing upsert (fetches live data from LiteLLM)
  if (req.method === 'POST') {
    const secret = req.headers['x-cron-secret'];
    if (secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let models, discovered = [], source = 'litellm';
    try {
      const result = await fetchLiteLLMPricing();
      models = result.results;
      discovered = result.discovered;
      console.log(`[models] fetched ${models.length} models from LiteLLM`);
      if (discovered.length) console.log(`[models] discovery log:`, discovered.join('; '));
    } catch (e) {
      console.warn(`[models] LiteLLM fetch failed (${e.message}), using fallback`);
      models = FALLBACK_PRICING;
      source = 'fallback';
    }

    let upserted = 0, errors = 0;
    const log = [];

    for (const m of models) {
      try {
        const { error } = await supabase.from('llm_models').upsert({
          company:             m.company,
          model_id:            m.model_id,
          name:                m.name,
          model_type:          m.model_type,
          input_price_per_1m:  m.input,
          output_price_per_1m: m.output,
          context_window:      m.ctx,
          best_for:            m.best_for,
          status:              m.status,
          pricing_url:         m.pricing_url,
          last_price_check:    new Date().toISOString(),
          updated_at:          new Date().toISOString(),
        }, { onConflict: 'model_id' });
        if (error) { errors++; log.push(`ERROR ${m.model_id}: ${error.message}`); }
        else { upserted++; log.push(`OK ${m.model_id}`); }
      } catch(e) {
        errors++;
        log.push(`EXCEPTION ${m.model_id}: ${e.message}`);
      }
    }

    console.log(`[models] source=${source} upserted=${upserted} errors=${errors}`);
    return res.status(200).json({ upserted, errors, source, discovered, log, checkedAt: new Date().toISOString() });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
