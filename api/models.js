// api/models.js — GET: public read of llm_models | POST: cron-secured pricing upsert
import { createClient } from '@supabase/supabase-js';

// Verified April 2026 — update this array when providers change prices.
// Prices are per 1M tokens in USD.
const CURRENT_PRICING = [
  // ── Anthropic ────────────────────────────────────────────────────────────────
  { company:'Anthropic', model_id:'claude-opus-4-6',        name:'Claude Opus 4.6',         model_type:'chat',       input:5.0,   output:25.0,  ctx:1000000,  status:'active',  best_for:'Most capable Claude; flagship reasoning, complex coding, PhD-level analysis, 1M context at standard pricing',              pricing_url:'https://www.anthropic.com/pricing' },
  { company:'Anthropic', model_id:'claude-sonnet-4-6',      name:'Claude Sonnet 4.6',       model_type:'chat',       input:3.0,   output:15.0,  ctx:1000000,  status:'active',  best_for:'Best balance of speed and intelligence; default for production workloads, 1M context at standard pricing',             pricing_url:'https://www.anthropic.com/pricing' },
  { company:'Anthropic', model_id:'claude-haiku-4-5',       name:'Claude Haiku 4.5',        model_type:'chat',       input:1.0,   output:5.0,   ctx:200000,   status:'active',  best_for:'Fastest and most affordable Claude; high-volume pipelines, classification, extraction, and lightweight tasks',               pricing_url:'https://www.anthropic.com/pricing' },
  // ── OpenAI ────────────────────────────────────────────────────────────────────
  { company:'OpenAI',    model_id:'gpt-5.4',                name:'GPT-5.4',                 model_type:'multimodal', input:2.5,   output:15.0,  ctx:1000000,  status:'active',  best_for:'OpenAI flagship; frontier coding (SWE-bench 57.7%), computer use (OSWorld 75%), and knowledge work in one model',          pricing_url:'https://openai.com/api/pricing/' },
  { company:'OpenAI',    model_id:'gpt-5.4-mini',           name:'GPT-5.4 Mini',            model_type:'multimodal', input:0.75,  output:4.5,   ctx:400000,   status:'active',  best_for:'Fast, affordable GPT-5.4 variant; approaches flagship on coding benchmarks at 70% lower cost, 400K context',               pricing_url:'https://openai.com/api/pricing/' },
  { company:'OpenAI',    model_id:'gpt-5.4-nano',           name:'GPT-5.4 Nano',            model_type:'multimodal', input:0.2,   output:1.25,  ctx:400000,   status:'active',  best_for:'Cheapest GPT-5.4 class model; classification, extraction, ranking, and lightweight coding subagents at scale',              pricing_url:'https://openai.com/api/pricing/' },
  { company:'OpenAI',    model_id:'o3',                     name:'o3',                      model_type:'reasoning',  input:10.0,  output:40.0,  ctx:200000,   status:'active',  best_for:'Dedicated reasoning model; state-of-the-art on math, science, and multi-step logic problems',                              pricing_url:'https://openai.com/api/pricing/' },
  { company:'OpenAI',    model_id:'o4-mini',                name:'o4-mini',                 model_type:'reasoning',  input:1.1,   output:4.4,   ctx:200000,   status:'active',  best_for:'Fast, cost-efficient reasoning model; strong on coding and structured problem-solving at fraction of o3 cost',              pricing_url:'https://openai.com/api/pricing/' },
  { company:'OpenAI',    model_id:'gpt-4.1',                name:'GPT-4.1',                 model_type:'chat',       input:2.0,   output:8.0,   ctx:1000000,  status:'active',  best_for:'Previous OpenAI flagship with 1M context; strong instruction following and coding; largely superseded by GPT-5.4',         pricing_url:'https://openai.com/api/pricing/' },
  { company:'OpenAI',    model_id:'text-embedding-3-large', name:'text-embedding-3-large',  model_type:'embedding',  input:0.13,  output:0.0,   ctx:8191,     status:'active',  best_for:'Best OpenAI embedding model for semantic search, RAG pipelines, and similarity tasks',                                       pricing_url:'https://openai.com/api/pricing/' },
  // ── Google ────────────────────────────────────────────────────────────────────
  { company:'Google',    model_id:'gemini-3.1-pro',         name:'Gemini 3.1 Pro',          model_type:'multimodal', input:2.0,   output:12.0,  ctx:1000000,  status:'active',  best_for:'Google flagship reasoning model (GA March 2026); 1M context, strong at code, math, and multimodal understanding',           pricing_url:'https://ai.google.dev/pricing' },
  { company:'Google',    model_id:'gemini-2.5-pro',         name:'Gemini 2.5 Pro',          model_type:'multimodal', input:1.25,  output:10.0,  ctx:1000000,  status:'active',  best_for:'Previous Google flagship; best value premium model — cheaper than GPT-5.4 and Claude Opus at similar capability levels',    pricing_url:'https://ai.google.dev/pricing' },
  { company:'Google',    model_id:'gemini-2.5-flash',       name:'Gemini 2.5 Flash',        model_type:'multimodal', input:0.3,   output:2.5,   ctx:1000000,  status:'active',  best_for:'Fast Gemini with 1M context; excellent for summarisation, extraction, and classification at scale',                         pricing_url:'https://ai.google.dev/pricing' },
  { company:'Google',    model_id:'gemini-2.5-flash-lite',  name:'Gemini 2.5 Flash-Lite',   model_type:'multimodal', input:0.1,   output:0.4,   ctx:1000000,  status:'active',  best_for:'Most affordable Gemini; tied for cheapest mainstream model — ideal for high-volume batch workloads',                        pricing_url:'https://ai.google.dev/pricing' },
  { company:'Google',    model_id:'gemini-2.0-flash',       name:'Gemini 2.0 Flash',        model_type:'multimodal', input:0.1,   output:0.4,   ctx:1000000,  status:'active',  best_for:'Reliable workhorse for batch processing; extremely affordable for document classification and simple extraction',            pricing_url:'https://ai.google.dev/pricing' },
  { company:'Google',    model_id:'text-embedding-004',     name:'Text Embedding 004',      model_type:'embedding',  input:0.025, output:0.0,   ctx:2048,     status:'active',  best_for:'Google embedding model for RAG pipelines, semantic retrieval, and similarity scoring',                                       pricing_url:'https://ai.google.dev/pricing' },
  // ── Meta ───────────────────────────────────────────────────────────────────────
  { company:'Meta',      model_id:'llama-4-maverick',       name:'Llama 4 Maverick',        model_type:'multimodal', input:0.19,  output:0.85,  ctx:1000000,  status:'active',  best_for:'Meta open-weight multimodal; strong reasoning at very low cost via third-party APIs (Together, Fireworks, Groq)',            pricing_url:'https://llama.meta.com/' },
  { company:'Meta',      model_id:'llama-4-scout',          name:'Llama 4 Scout',           model_type:'chat',       input:0.08,  output:0.3,   ctx:10000000, status:'active',  best_for:'Llama 4 Scout with record 10M context — exceptional for ultra-long document analysis and entire codebase ingestion',        pricing_url:'https://llama.meta.com/' },
  // ── Mistral ───────────────────────────────────────────────────────────────────
  { company:'Mistral',   model_id:'mistral-large-2',        name:'Mistral Large 2',         model_type:'chat',       input:2.0,   output:6.0,   ctx:128000,   status:'active',  best_for:'Frontier Mistral model; strong multilingual tasks, structured outputs, and function calling in production',                  pricing_url:'https://mistral.ai/technology/#pricing' },
  { company:'Mistral',   model_id:'mistral-small-3',        name:'Mistral Small 3',         model_type:'chat',       input:0.1,   output:0.3,   ctx:32000,    status:'active',  best_for:'Lightweight Mistral for high-volume classification, summarisation, and extraction at low cost',                             pricing_url:'https://mistral.ai/technology/#pricing' },
  { company:'Mistral',   model_id:'codestral',              name:'Codestral',               model_type:'code',       input:0.3,   output:0.9,   ctx:32000,    status:'active',  best_for:'Mistral code-specialist; fill-in-the-middle, code completion, and instruction-following for developer tools',                pricing_url:'https://mistral.ai/technology/#pricing' },
  // ── DeepSeek ──────────────────────────────────────────────────────────────────
  { company:'DeepSeek',  model_id:'deepseek-r1',            name:'DeepSeek R1',             model_type:'reasoning',  input:0.55,  output:2.19,  ctx:128000,   status:'active',  best_for:'Open-source chain-of-thought reasoning matching o1 on many benchmarks; best cost-performance in the reasoning category',     pricing_url:'https://api-docs.deepseek.com/quick_start/pricing' },
  { company:'DeepSeek',  model_id:'deepseek-v3',            name:'DeepSeek V3',             model_type:'chat',       input:0.27,  output:1.1,   ctx:128000,   status:'active',  best_for:'DeepSeek general chat flagship; excellent cost-performance for coding, structured tasks, and multilingual use cases',        pricing_url:'https://api-docs.deepseek.com/quick_start/pricing' },
  // ── xAI ───────────────────────────────────────────────────────────────────────
  { company:'xAI',       model_id:'grok-3',                 name:'Grok 3',                  model_type:'chat',       input:3.0,   output:15.0,  ctx:131072,   status:'active',  best_for:'xAI flagship with real-time X/Twitter data; strong at current events, analysis, and long-context reasoning',               pricing_url:'https://x.ai/api' },
  { company:'xAI',       model_id:'grok-3-mini',            name:'Grok 3 Mini',             model_type:'reasoning',  input:0.3,   output:0.5,   ctx:131072,   status:'active',  best_for:'Lightweight reasoning variant of Grok 3; fast and cost-efficient for structured analysis and coding tasks',                 pricing_url:'https://x.ai/api' },
  // ── Cohere ────────────────────────────────────────────────────────────────────
  { company:'Cohere',    model_id:'command-r-plus',         name:'Command R+',              model_type:'chat',       input:2.5,   output:10.0,  ctx:128000,   status:'active',  best_for:'Cohere enterprise flagship optimised for RAG pipelines, tool use, and structured data extraction in production',            pricing_url:'https://cohere.com/pricing' },
  { company:'Cohere',    model_id:'command-r',              name:'Command R',               model_type:'chat',       input:0.15,  output:0.6,   ctx:128000,   status:'active',  best_for:'Efficient Cohere model for retrieval-augmented generation and large-scale summarisation workflows',                         pricing_url:'https://cohere.com/pricing' },
  // ── Amazon ────────────────────────────────────────────────────────────────────
  { company:'Amazon',    model_id:'nova-pro',               name:'Amazon Nova Pro',         model_type:'multimodal', input:0.8,   output:3.2,   ctx:300000,   status:'active',  best_for:'Amazon flagship Nova; strong multimodal capabilities for enterprise workloads on AWS Bedrock',                             pricing_url:'https://aws.amazon.com/bedrock/pricing/' },
  { company:'Amazon',    model_id:'nova-lite',              name:'Amazon Nova Lite',        model_type:'multimodal', input:0.06,  output:0.24,  ctx:300000,   status:'active',  best_for:'Cost-optimised Nova for lightweight multimodal processing in high-volume Bedrock pipelines',                               pricing_url:'https://aws.amazon.com/bedrock/pricing/' },
  // ── Microsoft ─────────────────────────────────────────────────────────────────
  { company:'Microsoft', model_id:'mai-ds-r1',              name:'MAI-DS-R1',               model_type:'reasoning',  input:0.0,   output:0.0,   ctx:65536,    status:'preview', best_for:'Azure-hosted DeepSeek R1 distillation; free during preview on Azure AI Foundry for US enterprise workloads',               pricing_url:'https://azure.microsoft.com/en-us/products/ai-foundry/' },
  // ── Nvidia ────────────────────────────────────────────────────────────────────
  { company:'Nvidia',    model_id:'nemotron-70b',           name:'Nemotron-70B',            model_type:'chat',       input:0.42,  output:0.42,  ctx:32768,    status:'active',  best_for:'Nvidia open-source model for synthetic data generation, RLHF reward modelling, and fine-tuning pipelines',               pricing_url:'https://build.nvidia.com/explore/discover' },
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
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

  // POST — cron-secured pricing upsert
  if (req.method === 'POST') {
    const secret = req.headers['x-cron-secret'] || req.query.secret;
    if (secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let upserted = 0, errors = 0;
    const log = [];

    for (const m of CURRENT_PRICING) {
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

    console.log(`[models] upserted=${upserted} errors=${errors}`);
    return res.status(200).json({ upserted, errors, log, checkedAt: new Date().toISOString() });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
