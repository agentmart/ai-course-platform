// Day 01 — AI Landscape & Model Families
// Updated: April 2026
// Changes: Microsoft MAI models added, Nvidia Nemotron added, Claude Opus 1M ctx,
// knowledge-guide tone rewrite, mathematical cost formula, R1 framing refreshed,
// multi-provider pricing links, bulleted task descriptions.

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

window.COURSE_DAY_DATA[1] = {
  subtitle: 'A reference map of every major model family — proprietary APIs, open-weight, and specialized — and how to think about cost, capability, and tradeoffs.',

  context: `
  <p>The AI model landscape, as of the most recent updates, has four distinct segments. Understanding what lives in each segment — and why — is foundational knowledge for every AI PM.</p>

  <p><strong>Segment 1: Anthropic</strong><br>
  Anthropic’s Claude family is built around Constitutional AI alignment and a tiered capability structure. As of the most recent update, the Claude family includes models such as <code>claude-opus-4-6</code> (highest capability; supports a <strong>1M token context window</strong>, suitable for whole-codebase analysis, long document ingestion, and complex multi-step reasoning), <code>claude-sonnet-4-6</code> (the production workhorse; 200K context, offering a strong performance-to-cost ratio for most enterprise workloads), and <code>claude-haiku-4-5</code> (fastest and most cost-effective; 200K context, ideal for high-volume classification and real-time UX). Always pull the current model strings from <a href="https://docs.anthropic.com/en/docs/about-claude/models" target="_blank">docs.anthropic.com/en/docs/about-claude/models</a> — these change with each release.</p>

  <p><strong>Segment 2: OpenAI</strong><br>
  OpenAI’s lineup, as of the most recent update, includes the standard family (<code>gpt-4o</code>, 128K context, multimodal, strong function-calling) and the reasoning series (<code>o3</code>, <code>o4-mini</code>; chain-of-thought reasoning with extended compute at inference time). The reasoning series excels at multi-step logic, math, and code — refer to <a href='https://openai.com/pricing' target='_blank'>OpenAI’s pricing page</a> for the latest cost details. <code>gpt-4o-mini</code> serves the high-volume economy tier.</p>

  <p><strong>Segment 3: Google</strong><br>
  Gemini 2.5 Pro leads Google’s family with a 1M+ token context window natively — one of the largest context windows as of the most recent updates. Gemini Flash variants offer lower-cost, lower-latency options. Google’s native integration with Search, Workspace, and Vertex AI makes it the default choice for organizations already in the Google ecosystem.</p>

  <p><strong>Segment 4: Microsoft</strong><br>
  Microsoft operates two AI tracks. The first is the OpenAI partnership — all GPT-4o and o-series models are available via Azure OpenAI Service with enterprise identity, compliance, and VNet integration. The second is Microsoft’s own research portfolio: <strong>Phi-4</strong> (14B parameter model achieving near-frontier reasoning at a fraction of the size, available on Azure AI Foundry and Hugging Face) and the new <strong>MAI model family</strong> — Microsoft’s proprietary series. <strong>MAI-DS-R1</strong> is a safety-tuned distillation of DeepSeek R1, enhanced with Microsoft’s responsible AI training and available on Azure. <strong>MAI-1</strong> is Microsoft’s in-house large language model reportedly trained at ~500B parameters, designed for Azure enterprise deployments. The MAI family is significant because it gives Microsoft API-level control over safety and compliance without depending on a third-party model provider.</p>

  <p><strong>Segment 5: Nvidia</strong><br>
  Nvidia entered the model-as-a-product space with the <strong>Nemotron family</strong>. <strong>Llama-3.1-Nemotron-70B-Instruct</strong> is a fine-tune of Meta’s Llama 3.1 70B using Nvidia’s synthetic data pipeline, achieving near-GPT-4o performance at open-weight cost. <strong>Nemotron-4-340B-Instruct</strong> is Nvidia’s larger proprietary model, also available via the Nvidia API and NGC catalog. <strong>Minitron</strong> is Nvidia’s compressed series (8B, 4B) produced via pruning and distillation — designed for on-device and edge deployment. Nvidia’s strategic play, as of the most recent updates, is to own the inference stack (GPU + TensorRT-LLM + model) end-to-end, so model quality drives hardware adoption.</p>

  <p><strong>Segment 6: Open-weight tier</strong><br>
  The self-hostable tier has reached near-frontier capability. Key models: <strong>Llama 4 Maverick</strong> (Meta, Community license, MoE architecture, strong general tasks), <strong>DeepSeek V3 / R1</strong> (DeepSeek, MIT license — see note below), <strong>Mistral Large 2</strong> (Mistral AI, commercial license, EU-residency friendly), <strong>Qwen 2.5-72B</strong> (Alibaba, Apache 2.0, best multilingual performance in APAC), and <strong>Phi-4</strong> (Microsoft, MIT license, frontier reasoning at 14B). The business implication: enterprise customers can now self-host near-frontier models at near-zero per-token cost. Understanding this tier is essential for pricing your own products and defending API cost to skeptical buyers.</p>

  <p><strong>The cost-compression trajectory</strong><br>
  DeepSeek R1 (released as of late 2024) demonstrated that near-frontier reasoning performance could be achieved at a reported training cost dramatically lower than established frontier labs. Whether or not that figure captures full infrastructure costs, the directional signal is clear: training cost barriers are compressing faster than expected, and this has continued into 2025–26 with Llama 4 and MAI-DS-R1. For API providers, sustained competitive advantage increasingly rests on safety credibility, enterprise compliance infrastructure (SOC 2, HIPAA, FedRAMP), long-context architecture, and ongoing research quality — not training cost moats alone.</p>

  <p><strong>Model pricing</strong><br>
  Pricing changes quarterly and should never be hardcoded into documentation or estimates. The correct habit: always pull live pricing from the official pricing pages listed in the Resources section of this lesson before any real estimate. The formula that stays stable regardless of price changes:</p>
  <pre style="background:var(--ink);color:#d4c5b0;padding:14px 18px;border-radius:6px;font-family:'IBM Plex Mono',monospace;font-size:12px;line-height:1.8;overflow-x:auto;">daily cost =
  (daily_requests × avg_input_tokens  × input_price_per_1M_tokens  / 1,000,000)
+ (daily_requests × avg_output_tokens × output_price_per_1M_tokens / 1,000,000)

monthly cost = daily cost × 30</pre>
  <p>Apply this formula to the code lab below, then cross-check with live pricing pages. Pricing details for specific models can be found on their respective <a href='https://www.anthropic.com/pricing' target='_blank'>Anthropic</a>, <a href='https://openai.com/pricing' target='_blank'>OpenAI</a>, and <a href='https://cloud.google.com/pricing' target='_blank'>Google</a> pricing pages.</p>`,

  tasks: [
    {
      title: 'Set up your ai-pm-60days GitHub repo',
      description: `Create the portfolio repository you will build throughout this course:
        <ul>
          <li>Create a public GitHub repo named <strong>ai-pm-60days</strong></li>
          <li>Add a README explaining the project and your learning goals</li>
          <li>Create a <code>/day-01/</code> folder as the first entry point</li>
          <li>Commit and push — this is your Day 1 artifact</li>
        </ul>
        This repo is your primary portfolio artifact. 60 days of quality commits demonstrates applied learning more credibly than any resume claim. A hiring manager should be able to browse your commit history and see a PM who built things, not just read about them.`,
      time: '15 min'
    },
    {
      title: 'Build the 2026 model comparison matrix',
      description: `Create <code>/day-01/model_comparison.md</code> with two clearly labeled sections:
        <ul>
          <li><strong>Section 1 — Proprietary APIs:</strong> Include Claude Opus 4.6, Claude Sonnet 4.6, Claude Haiku 4.5, GPT-4o, o3/o4-mini, Gemini 2.5 Pro, MAI-DS-R1, Llama-3.1-Nemotron-70B. Columns: model name, context window, pricing page link (no hardcoded numbers), key capability strengths, best-fit use case.</li>
          <li><strong>Section 2 — Open-weight tier:</strong> Include Llama 4 Maverick, DeepSeek V3/R1, Mistral Large 2, Qwen 2.5-72B, Phi-4. Columns: provider, license type, key strength, the enterprise deployment scenario it enables.</li>
          <li>For every model, link to the official pricing page — never write down a number that will be wrong next quarter.</li>
        </ul>`,
      time: '25 min'
    },
    {
      title: 'Cost-model a real enterprise use case',
      description: `Apply the cost formula to a contract review product scenario:
        <ul>
          <li><strong>Scenario:</strong> 500 contracts/month, 50K input tokens per contract, 2K output tokens per contract</li>
          <li>Use the formula: <em>monthly cost = daily_requests × 30 × [(input_tokens × input_price/1M) + (output_tokens × output_price/1M)]</em></li>
          <li>Pull current pricing from the official pages (Anthropic, OpenAI, Google) and calculate for at least 3 models</li>
          <li>Identify the volume threshold at which cost becomes a business-critical constraint and architectural changes (caching, model routing, batching) become necessary</li>
          <li>Save your analysis as <code>/day-01/cost_model.md</code></li>
        </ul>`,
      time: '20 min'
    },
    {
      title: 'Write the open-source objection response',
      description: `Prepare a structured 200-word answer to the enterprise buyer question: <em>“We have strong AI engineers. Why should we pay for Claude API when we can self-host Llama 4 Maverick for free?”</em>
        <ul>
          <li>Lead with acknowledgment — Llama 4 Maverick is a genuinely strong model</li>
          <li>Name specific differentiators: Constitutional AI training, Responsible Scaling Policy, SOC 2 Type II, HIPAA eligibility, 99.9% SLA, audit trails, support contracts</li>
          <li>Address the real cost of self-hosting: GPU infrastructure, model serving, fine-tuning maintenance, security patching, compliance overhead</li>
          <li>End with the honest framing: benchmark both on your specific use case, but know what proprietary APIs include beyond the token price</li>
          <li>Save as <code>/day-01/open_source_objection.md</code></li>
        </ul>`,
      time: '20 min'
    }
  ],

  codeExample: {
    title: 'Model landscape: cost estimation framework — Python',
    lang: 'python',
    code: `# Day 01 — AI Model Landscape & Cost Estimation Framework
#
# PRICING NOTE: Always verify prices at official pages before any real estimate.
# Links to all provider pricing pages:
#   Anthropic : https://www.anthropic.com/pricing
#   OpenAI    : https://openai.com/pricing
#   Google    : https://cloud.google.com/pricing
#   Microsoft : https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure
#   Nvidia    : https://build.nvidia.com/  (NIM API pricing)
#
# The formula (memorise this — plug in live prices before any real estimate):
#
#   daily cost = (daily_requests x avg_input_tokens  x input_price_per_1M  / 1_000_000)
#              + (daily_requests x avg_output_tokens x output_price_per_1M / 1_000_000)
#
#   monthly cost = daily_cost x 30

# ---- MODEL REGISTRY -------------------------------------------------------
# 'ctx' = context window  |  'tier' = rough cost bucket

PROPRIETARY_MODELS = {
    # -- Anthropic -----------------------------------------------------------
    "claude-opus-4-6":           {"ctx": "1M",   "tier": "premium",   "provider": "Anthropic",  "notes": "1M context, highest capability, complex reasoning"},
    "claude-sonnet-4-6":         {"ctx": "200K", "tier": "standard",  "provider": "Anthropic",  "notes": "Production workhorse, best perf/cost ratio"},
    "claude-haiku-4-5-20251001": {"ctx": "200K", "tier": "economy",   "provider": "Anthropic",  "notes": "High-volume, fast, lowest cost"},
    # -- OpenAI --------------------------------------------------------------
    "gpt-4o":                    {"ctx": "128K", "tier": "standard",  "provider": "OpenAI",     "notes": "Strong ecosystem, multimodal, function-calling"},
    "o3":                        {"ctx": "128K", "tier": "reasoning",  "provider": "OpenAI",     "notes": "Best reasoning, 3-10x latency premium"},
    "o4-mini":                   {"ctx": "128K", "tier": "reasoning",  "provider": "OpenAI",     "notes": "Reasoning at economy cost"},
    "gpt-4o-mini":               {"ctx": "128K", "tier": "economy",   "provider": "OpenAI",     "notes": "High-volume, low-cost standard model"},
    # -- Google --------------------------------------------------------------
    "gemini-2.5-pro":            {"ctx": "1M+",  "tier": "premium",   "provider": "Google",     "notes": "Largest native context, Google ecosystem native"},
    # -- Microsoft -----------------------------------------------------------
    "phi-4":                     {"ctx": "16K",  "tier": "economy",   "provider": "Microsoft",  "notes": "Frontier reasoning at 14B params, MIT license"},
    "mai-ds-r1":                 {"ctx": "128K", "tier": "reasoning",  "provider": "Microsoft",  "notes": "DeepSeek R1 + Microsoft responsible AI tuning"},
    # -- Nvidia --------------------------------------------------------------
    "llama-3.1-nemotron-70b":    {"ctx": "128K", "tier": "standard",  "provider": "Nvidia",     "notes": "Llama 3.1 fine-tuned by Nvidia, near-GPT-4o"},
    "nemotron-4-340b":           {"ctx": "4K",   "tier": "premium",   "provider": "Nvidia",     "notes": "Nvidia's largest proprietary model, NIM API"},
}

OPEN_WEIGHT_MODELS = [
    {"model": "Llama 4 Maverick",  "provider": "Meta",      "license": "Community",  "strength": "Frontier-class MoE, free self-host"},
    {"model": "DeepSeek V3 / R1",  "provider": "DeepSeek",  "license": "MIT",        "strength": "Near-frontier reasoning, low training cost signal"},
    {"model": "Mistral Large 2",   "provider": "Mistral",   "license": "Commercial", "strength": "EU data residency, strong reasoning"},
    {"model": "Qwen 2.5-72B",      "provider": "Alibaba",   "license": "Apache 2.0", "strength": "Best multilingual, APAC enterprise"},
    {"model": "Phi-4",             "provider": "Microsoft", "license": "MIT",        "strength": "Frontier reasoning at 14B, edge deployable"},
]

# ---- COST FORMULA ---------------------------------------------------------

def monthly_cost(daily_requests, avg_input_tokens, avg_output_tokens,
                 input_price_per_1m, output_price_per_1m):
    """
    monthly_cost = daily_requests x 30 x [
        (avg_input_tokens  x input_price_per_1M  / 1_000_000) +
        (avg_output_tokens x output_price_per_1M / 1_000_000)
    ]
    Prices are per 1M tokens. Plug in LIVE prices from provider pricing pages.
    """
    cost_per_request = (
        (avg_input_tokens  / 1_000_000) * input_price_per_1m +
        (avg_output_tokens / 1_000_000) * output_price_per_1m
    )
    return cost_per_request * daily_requests * 30

# ---- OUTPUT ---------------------------------------------------------------

print("=" * 68)
print("PROPRIETARY MODEL LANDSCAPE  (verify model strings at provider docs)")
print("=" * 68)
for name, m in PROPRIETARY_MODELS.items():
    print(f"  [{m['provider']:<11}]  {name:<32}  ctx: {m['ctx']:>5}  [{m['tier']}]")
    print(f"              {m['notes']}")

print()
print("=" * 68)
print("OPEN-WEIGHT TIER  (self-hostable, near-zero per-token cost)")
print("=" * 68)
for m in OPEN_WEIGHT_MODELS:
    print(f"  {m['model']:<22}  {m['provider']:<11}  {m['license']:<12}")
    print(f"    {m['strength']}")

print()
print("=" * 68)
print("COST FORMULA DEMO  (VERIFY ALL PRICES before any real estimate)")
print("=" * 68)
print("Scenario: 500 contracts/month, 50K input tokens, 2K output tokens")
print("Formula : monthly = daily_req x 30 x [(in_tok x in_price + out_tok x out_price) / 1M]")
print()
# Placeholder prices — REPLACE WITH CURRENT PRICES FROM PROVIDER PAGES
scenarios = [
    ("Claude Sonnet 4.6  ", 17, 50_000, 2_000,  3.00, 15.00),   # verify at anthropic.com/pricing
    ("Claude Haiku 4.5   ", 17, 50_000, 2_000,  0.25,  1.25),   # verify at anthropic.com/pricing
    ("GPT-4o             ", 17, 50_000, 2_000,  2.50, 10.00),   # verify at openai.com/pricing
    ("Gemini 2.5 Pro     ", 17, 50_000, 2_000,  1.25,  5.00),   # verify at ai.google.dev/pricing
]
for name, req, inp, out, in_p, out_p in scenarios:
    cost = monthly_cost(req, inp, out, in_p, out_p)
    print(f"  {name}  ~\${cost:>8,.2f}/month   <-- VERIFY PRICE")
print()
print("Tip: Output tokens cost 3-5x more than input tokens across all providers.")
print("     Optimise prompts (input) AND response length (output) for cost control.")
`
  },

  interview: {
    question: 'Walk me through the 2026 AI model landscape. Which model would you choose for a new enterprise contract review product, and why?',
    answer: `A strong answer covers four things: the landscape structure, the recommendation with specific reasoning, the competitive alternatives, and the open-source objection.<br><br>
<strong>The landscape:</strong> Four main proprietary players — Anthropic (Claude family, Constitutional AI), OpenAI (GPT + reasoning o-series), Google (Gemini, longest native context), and Microsoft (Azure OpenAI + MAI family + Phi-4). Plus Nvidia’s Nemotron models entering the space. The open-weight tier — Llama 4, DeepSeek, Mistral, Qwen, Phi-4 — is now near-frontier quality and changes the pricing conversation entirely.<br><br>
<strong>Recommendation for contract review:</strong> Claude Sonnet 4.6 (<code>claude-sonnet-4-6</code>) for most contracts; Claude Opus 4.6 for unusually complex multi-jurisdiction documents where the 1M context window and maximum reasoning depth are justified. Sonnet’s 200K context handles full contracts without chunking (avoiding retrieval errors), and Constitutional AI training produces calibrated outputs on sensitive legal content. For the latest pricing details, refer to <a href='https://www.anthropic.com/pricing' target='_blank'>Anthropic’s pricing page</a>.<br><br>
<strong>Why not GPT-4o?</strong> Strong ecosystem, but 128K context forces chunking on large contracts, which increases architectural complexity. For Azure-first customers, Claude via Azure AI Marketplace removes the procurement friction — same model, enterprise identity integration included.<br><br>
<strong>The open-source objection:</strong> Llama 4 Maverick is an excellent model. What self-hosting doesn’t include is Anthropic’s Constitutional AI training, Responsible Scaling Policy, SOC 2 Type II certification, HIPAA eligibility, a 99.9% SLA, or enterprise audit trails. For a law firm handling privileged documents, those aren’t nice-to-haves — they’re procurement requirements. Always benchmark both on your specific use case before committing.`
  },

  pmAngle: 'The model landscape is not a static list to memorise — it’s a map that changes every quarter. The PM skill is knowing <em>how to read the map</em>: which segment each model belongs to, what tradeoffs define that segment, and how pricing, context window, safety posture, and compliance certifications affect build/buy/partner decisions. Microsoft’s MAI family and Nvidia’s Nemotron entry signal that model production is broadening beyond the original frontier labs — the competitive landscape in 2027 will look meaningfully different from today.',

  resources: [
    { type: 'DOCS',    title: 'Anthropic — Models Overview',         url: 'https://docs.anthropic.com/en/docs/about-claude/models',                                              note: 'Current Claude model strings, context limits, and capability notes. Bookmark this.' },
    { type: 'PRICING', title: 'Anthropic — API Pricing (live)',       url: 'https://www.anthropic.com/pricing',                                                                   note: 'Pull live pricing before every cost estimate. Never hardcode.' },
    { type: 'PRICING', title: 'OpenAI — API Pricing (live)',          url: 'https://openai.com/pricing',                                                                          note: 'GPT-4o vs o-series pricing tradeoffs. Verify before any estimate.' },
    { type: 'PRICING', title: 'Google — Gemini API Pricing (live)',   url: 'https://cloud.google.com/pricing',                                                                       note: 'Gemini 2.5 Pro and Flash pricing. Includes free tier details.' },
    { type: 'PRICING', title: 'Microsoft — Azure OpenAI Pricing',    url: 'https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure',              note: 'GPT + MAI models on Azure. Relevant for enterprise Azure-first customers.' },
    { type: 'PRICING', title: 'Nvidia — NIM API Pricing',             url: 'https://build.nvidia.com/',                                                                           note: 'Nemotron and partner models via Nvidia’s hosted inference API.' },
    { type: 'DOCS',    title: 'Meta — Llama 4 Model Card',            url: 'https://ai.meta.com/blog/llama-4-multimodal-intelligence/',                                          note: 'Llama 4 architecture and license. Understand open-weight strategy.' },
    { type: 'PAPER',   title: 'DeepSeek-R1 Technical Report',          url: 'https://arxiv.org/abs/2501.12948',                                                                    note: 'The model that signalled training cost compression. Read the abstract and executive summary.' },
    { type: 'BLOG',    title: 'Nvidia Nemotron Model Family',           url: 'https://developer.nvidia.com/blog/tag/nemotron/',                        note: 'Nvidia’s entry into the model-as-a-product space alongside their GPU business.' },
    { type: 'BLOG',    title: 'Microsoft MAI-DS-R1 Announcement',      url: 'https://azure.microsoft.com/en-us/blog/',                                                             note: 'Microsoft’s responsible-AI-tuned distillation of DeepSeek R1 on Azure.' },
  ]
};
