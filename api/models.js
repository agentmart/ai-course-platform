// api/models.js — GET: public read of llm_models | POST: cron-secured pricing upsert
import { createClient } from '@supabase/supabase-js';

// Known model pricing — update these when providers change prices.
// Prices are per 1M tokens in USD.
const CURRENT_PRICING = [
  // Anthropic
  { company:'Anthropic', model_id:'claude-opus-4-5',       name:'Claude Opus 4.5',         model_type:'chat',       input:15.0,  output:75.0,  ctx:200000,   status:'active',  best_for:'Most capable Claude model for complex reasoning, research, and nuanced writing',                pricing_url:'https://www.anthropic.com/pricing' },
  { company:'Anthropic', model_id:'claude-sonnet-4-6',     name:'Claude Sonnet 4.6',       model_type:'chat',       input:3.0,   output:15.0,  ctx:200000,   status:'active',  best_for:'Best balance of speed and intelligence for everyday tasks and production workloads',           pricing_url:'https://www.anthropic.com/pricing' },
  { company:'Anthropic', model_id:'claude-haiku-4-5',      name:'Claude Haiku 4.5',        model_type:'chat',       input:0.8,   output:4.0,   ctx:200000,   status:'active',  best_for:'Fastest and most compact Claude for lightweight tasks and high-volume pipelines',              pricing_url:'https://www.anthropic.com/pricing' },
  // OpenAI
  { company:'OpenAI',    model_id:'gpt-4o',                name:'GPT-4o',                  model_type:'multimodal', input:2.5,   output:10.0,  ctx:128000,   status:'active',  best_for:'Flagship multimodal model — text, vision, and audio in one; strong general reasoning',         pricing_url:'https://openai.com/api/pricing/' },
  { company:'OpenAI',    model_id:'gpt-4o-mini',           name:'GPT-4o Mini',             model_type:'chat',       input:0.15,  output:0.6,   ctx:128000,   status:'active',  best_for:'Cost-optimised GPT-4o for high-throughput, lower-stakes workloads',                           pricing_url:'https://openai.com/api/pricing/' },
  { company:'OpenAI',    model_id:'o3',                    name:'o3',                      model_type:'reasoning',  input:10.0,  output:40.0,  ctx:200000,   status:'active',  best_for:'State-of-the-art reasoning model; excels at math, code, and multi-step logic problems',       pricing_url:'https://openai.com/api/pricing/' },
  { company:'OpenAI',    model_id:'o4-mini',               name:'o4-mini',                 model_type:'reasoning',  input:1.1,   output:4.4,   ctx:200000,   status:'active',  best_for:'Fast, affordable reasoning model — great for coding and structured problem-solving',           pricing_url:'https://openai.com/api/pricing/' },
  { company:'OpenAI',    model_id:'gpt-4.1',               name:'GPT-4.1',                 model_type:'chat',       input:2.0,   output:8.0,   ctx:1000000,  status:'active',  best_for:'Latest GPT-4 series flagship with 1M context; strong at instruction following and coding',     pricing_url:'https://openai.com/api/pricing/' },
  { company:'OpenAI',    model_id:'gpt-4.1-mini',          name:'GPT-4.1 Mini',            model_type:'chat',       input:0.4,   output:1.6,   ctx:1000000,  status:'active',  best_for:'Affordable GPT-4.1 variant with 1M context for medium-complexity tasks',                      pricing_url:'https://openai.com/api/pricing/' },
  { company:'OpenAI',    model_id:'text-embedding-3-large', name:'text-embedding-3-large', model_type:'embedding',  input:0.13,  output:0.0,   ctx:8191,     status:'active',  best_for:'Best OpenAI embedding model for semantic search, RAG, and similarity tasks',                  pricing_url:'https://openai.com/api/pricing/' },
  // Google
  { company:'Google',    model_id:'gemini-2.5-pro',        name:'Gemini 2.5 Pro',          model_type:'multimodal', input:1.25,  output:10.0,  ctx:1000000,  status:'active',  best_for:'Most capable Gemini model; best for long-context tasks, documents, and multimodal reasoning',  pricing_url:'https://ai.google.dev/pricing' },
  { company:'Google',    model_id:'gemini-2.5-flash',      name:'Gemini 2.5 Flash',        model_type:'multimodal', input:0.15,  output:0.6,   ctx:1000000,  status:'active',  best_for:'Fast Gemini with 1M context; ideal for summarisation, extraction, and classification',         pricing_url:'https://ai.google.dev/pricing' },
  { company:'Google',    model_id:'gemini-2.0-flash',      name:'Gemini 2.0 Flash',        model_type:'multimodal', input:0.1,   output:0.4,   ctx:1000000,  status:'active',  best_for:'Previous Gemini Flash generation; reliable and extremely affordable for batch workloads',      pricing_url:'https://ai.google.dev/pricing' },
  { company:'Google',    model_id:'text-embedding-004',    name:'Text Embedding 004',      model_type:'embedding',  input:0.025, output:0.0,   ctx:2048,     status:'active',  best_for:'Google embedding model for RAG pipelines and semantic retrieval',                             pricing_url:'https://ai.google.dev/pricing' },
  // Meta
  { company:'Meta',      model_id:'llama-4-maverick',      name:'Llama 4 Maverick',        model_type:'multimodal', input:0.19,  output:0.85,  ctx:1000000,  status:'active',  best_for:'Meta open-weight multimodal model; strong reasoning with low cost via third-party APIs',       pricing_url:'https://llama.meta.com/' },
  { company:'Meta',      model_id:'llama-4-scout',         name:'Llama 4 Scout',           model_type:'chat',       input:0.08,  output:0.3,   ctx:10000000, status:'active',  best_for:'Llama 4 Scout with 10M context — exceptional for ultra-long document analysis',               pricing_url:'https://llama.meta.com/' },
  // Mistral
  { company:'Mistral',   model_id:'mistral-large-2',       name:'Mistral Large 2',         model_type:'chat',       input:2.0,   output:6.0,   ctx:128000,   status:'active',  best_for:'Frontier Mistral model; strong at multilingual tasks, code, and structured outputs',           pricing_url:'https://mistral.ai/technology/#pricing' },
  { company:'Mistral',   model_id:'mistral-small-3',       name:'Mistral Small 3',         model_type:'chat',       input:0.1,   output:0.3,   ctx:32000,    status:'active',  best_for:'Lightweight Mistral for high-volume classification, summarisation, and extraction',            pricing_url:'https://mistral.ai/technology/#pricing' },
  { company:'Mistral',   model_id:'codestral',             name:'Codestral',               model_type:'code',       input:0.3,   output:0.9,   ctx:32000,    status:'active',  best_for:'Mistral code-specialised model — fill-in-the-middle, completion, and instruction following',   pricing_url:'https://mistral.ai/technology/#pricing' },
  // DeepSeek
  { company:'DeepSeek',  model_id:'deepseek-r1',           name:'DeepSeek R1',             model_type:'reasoning',  input:0.55,  output:2.19,  ctx:128000,   status:'active',  best_for:'Open-source chain-of-thought reasoning model matching o1 at far lower cost',                    pricing_url:'https://api-docs.deepseek.com/quick_start/pricing' },
  { company:'DeepSeek',  model_id:'deepseek-v3',           name:'DeepSeek V3',             model_type:'chat',       input:0.27,  output:1.1,   ctx:128000,   status:'active',  best_for:'DeepSeek general chat model; excellent cost-performance for coding and structured tasks',       pricing_url:'https://api-docs.deepseek.com/quick_start/pricing' },
  // xAI
  { company:'xAI',       model_id:'grok-3',                name:'Grok 3',                  model_type:'chat',       input:3.0,   output:15.0,  ctx:131072,   status:'active',  best_for:'xAI flagship with real-time X data access; strong at analysis and current events',             pricing_url:'https://x.ai/api' },
  { company:'xAI',       model_id:'grok-3-mini',           name:'Grok 3 Mini',             model_type:'reasoning',  input:0.3,   output:0.5,   ctx:131072,   status:'active',  best_for:'Lightweight reasoning variant of Grok 3; fast and affordable for structured tasks',            pricing_url:'https://x.ai/api' },
  // Cohere
  { company:'Cohere',    model_id:'command-r-plus',        name:'Command R+',              model_type:'chat',       input:2.5,   output:10.0,  ctx:128000,   status:'active',  best_for:'Cohere enterprise flagship; optimised for RAG pipelines and tool use in production',           pricing_url:'https://cohere.com/pricing' },
  { company:'Cohere',    model_id:'command-r',             name:'Command R',               model_type:'chat',       input:0.15,  output:0.6,   ctx:128000,   status:'active',  best_for:'Efficient Cohere model for retrieval-augmented generation and summarisation',                  pricing_url:'https://cohere.com/pricing' },
  // Amazon
  { company:'Amazon',    model_id:'nova-pro',              name:'Amazon Nova Pro',         model_type:'multimodal', input:0.8,   output:3.2,   ctx:300000,   status:'active',  best_for:'Amazon flagship Nova model; strong multimodal capabilities for enterprise AWS workloads',       pricing_url:'https://aws.amazon.com/bedrock/pricing/' },
  { company:'Amazon',    model_id:'nova-lite',             name:'Amazon Nova Lite',        model_type:'multimodal', input:0.06,  output:0.24,  ctx:300000,   status:'active',  best_for:'Cost-optimised Nova for lightweight multimodal processing in high-volume Bedrock pipelines',    pricing_url:'https://aws.amazon.com/bedrock/pricing/' },
  // Microsoft
  { company:'Microsoft', model_id:'mai-ds-r1',             name:'MAI-DS-R1',               model_type:'reasoning',  input:0.0,   output:0.0,   ctx:65536,    status:'preview', best_for:'Microsoft Azure-hosted DeepSeek R1 distillation; free during preview on Azure AI Foundry',    pricing_url:'https://azure.microsoft.com/en-us/products/ai-foundry/' },
  // Nvidia
  { company:'Nvidia',    model_id:'nemotron-70b',          name:'Nemotron-70B',            model_type:'chat',       input:0.42,  output:0.42,  ctx:32768,    status:'active',  best_for:'Nvidia open-source model for synthetic data generation and RLHF reward modelling',             pricing_url:'https://build.nvidia.com/explore/discover' },
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
