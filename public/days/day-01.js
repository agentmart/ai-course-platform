// Day 01 — AI Landscape & Model Families
// Updated: March 2026
// Review changes: model names updated to Claude 4.x, open-source tier added,
// GitHub portfolio setup added, DeepSeek R1 context added, pricing de-hardcoded.

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

window.COURSE_DAY_DATA[1] = {
  subtitle: 'Map the 2026 AI model landscape — proprietary APIs and the open-source tier every PM must know.',

  context: `<p>The AI model landscape in 2026 has two tiers that every AI PM must understand. The <strong>proprietary API tier</strong>: Anthropic's Claude family, OpenAI's GPT and o-series, and Google's Gemini series. The <strong>open-weight tier</strong>: Meta's Llama 4, Mistral Large 2, Alibaba's Qwen 2.5, DeepSeek R1, and Microsoft's Phi-4 — models that enterprises can self-host at near-zero per-token cost. Both tiers matter. A PM who only knows the proprietary tier will be blindsided by the most common enterprise procurement objection: "Why pay for Claude when we can self-host Llama 4?"</p>
  <p>Anthropic's current model family — the one you will name in interviews and code in every project — uses the following strings: <strong><code>claude-opus-4-6</code></strong> (highest capability, complex reasoning and analysis), <strong><code>claude-sonnet-4-6</code></strong> (the production workhorse, best performance-to-cost), and <strong><code>claude-haiku-4-5-20251001</code></strong> (fastest and most cost-efficient, ideal for high-volume classification). Using outdated strings like <code>claude-3-5-sonnet-20241022</code> in an Anthropic interview signals poor product knowledge. OpenAI's current tier: <code>gpt-4o</code> (128K context, multimodal), <code>o3</code> / <code>o4-mini</code> (reasoning series), and <code>gpt-4o-mini</code> (high-volume cheap tier). Google's Gemini 2.5 Pro supports 1M+ tokens natively.</p>
  <p><strong>Model pricing changes quarterly</strong> — never hardcode it. The framework that doesn't go stale: <em>daily cost = (daily requests × avg input tokens × input price per 1M) + (daily requests × avg output tokens × output price per 1M)</em>. Always pull current pricing from <a href="https://www.anthropic.com/pricing" target="_blank">anthropic.com/pricing</a> before any real estimate. The skill is the formula and the habit of checking live prices — not memorized numbers that are wrong six months later.</p>
  <p><strong>The January 2025 inflection point:</strong> DeepSeek R1's release demonstrated near-frontier reasoning performance at a reported training cost under $6M, compared to the $50-100M+ training costs associated with frontier models. Whether or not that figure captures the full picture, the directional signal is clear — training cost barriers are compressing faster than expected. The strategic implication for Anthropic and OpenAI: sustained competitive advantage cannot rest on training cost moats. It must rest on safety credibility, enterprise relationships, compliance certifications, and ongoing research quality.</p>`,

  tasks: [
    {
      title: 'Set up your ai-pm-60days GitHub repo',
      description: 'Create a public GitHub repo named ai-pm-60days. Add a README explaining the project. Create a /day-01/ folder. This repo is your primary portfolio artifact — 60 days of quality commits demonstrates applied learning more credibly than any resume claim. At the end of this course, a hiring manager should be able to browse your commit history and see a PM who actually built things.',
      time: '15 min'
    },
    {
      title: 'Build the 2026 model comparison matrix',
      description: 'Create a Markdown table in /day-01/model_comparison.md with two sections. Section 1 — Proprietary APIs: Claude Sonnet 4.6, Claude Haiku 4.5, GPT-4o, o3/o4-mini, Gemini 2.5 Pro. Columns: model string, context window, pricing tier (link to live page — do not hardcode numbers), key strengths, best use case. Section 2 — Open-weight tier: Llama 4 Maverick, DeepSeek R1, Mistral Large 2, Qwen 2.5-72B, Phi-4. Columns: provider, license type, key strength, the enterprise objection it enables. This two-section matrix is the artifact you will reference in every subsequent interview answer.',
      time: '25 min'
    },
    {
      title: 'Cost-model a real enterprise use case',
      description: 'Calculate the monthly API cost for a contract review product: 500 contracts/month, average 50K input tokens/contract, 2K output tokens/contract. Use current pricing from anthropic.com/pricing for Claude Sonnet 4.6 and Claude Haiku 4.5. Save as /day-01/cost_model.md. Then answer: at what monthly volume does cost become a business-critical constraint requiring architectural changes like caching or model routing?',
      time: '20 min'
    },
    {
      title: 'Prepare the open-source objection answer',
      description: 'Write a 200-word response to this enterprise buyer question: "We have strong AI engineers. Why should we pay for Claude API when we can self-host Llama 4 Maverick for free?" Your answer must be specific — not vague claims about "safety" but specific named differentiators: Constitutional AI training, Responsible Scaling Policy, SOC 2 Type II certification, HIPAA eligibility, 99.9% SLA, context window specifics, support contracts. Save as /day-01/open_source_objection.md. You will face this question in every enterprise deal.',
      time: '20 min'
    }
  ],

  codeExample: {
    title: 'Model landscape: cost estimation framework — Python',
    lang: 'python',
    code: `# Day 01 — AI Model Cost Estimation Framework
# IMPORTANT: Pricing changes quarterly. Always verify at:
# https://www.anthropic.com/pricing
# https://openai.com/pricing
# The pattern below is what matters; plug in current prices before any real estimate.

# Current model strings as of early 2026 (update if Anthropic releases new models)
PROPRIETARY_MODELS = {
    # Anthropic
    "claude-opus-4-6":        {"ctx": "200K", "tier": "premium",   "notes": "Highest capability, complex reasoning"},
    "claude-sonnet-4-6":      {"ctx": "200K", "tier": "standard",  "notes": "Production workhorse, best perf/cost"},
    "claude-haiku-4-5-20251001": {"ctx": "200K", "tier": "economy",   "notes": "High-volume, fast, cheapest"},
    # OpenAI
    "gpt-4o":                 {"ctx": "128K", "tier": "standard",  "notes": "Strong ecosystem, multimodal"},
    "o3":                     {"ctx": "128K", "tier": "reasoning",  "notes": "Best reasoning, 3-10x latency premium"},
    "gpt-4o-mini":            {"ctx": "128K", "tier": "economy",   "notes": "High-volume cheap tier"},
    # Google
    "gemini-2.5-pro":         {"ctx": "1M+",  "tier": "premium",   "notes": "Longest context, Google Search native"},
}

OPEN_WEIGHT_MODELS = [
    {"model": "Llama 4 Maverick",  "provider": "Meta",      "license": "Community", "key_strength": "Frontier-class, free self-host",       "objection": "Why pay for Claude?"},
    {"model": "DeepSeek R1",       "provider": "DeepSeek",  "license": "MIT",       "key_strength": "Near-frontier reasoning, low cost",    "objection": "Training cost compression signal"},
    {"model": "Mistral Large 2",   "provider": "Mistral",   "license": "Commercial","key_strength": "EU data residency, strong reasoning",  "objection": "EU-regulated enterprises"},
    {"model": "Qwen 2.5-72B",      "provider": "Alibaba",   "license": "Apache 2.0","key_strength": "Best multilingual, APAC enterprise",    "objection": "APAC deployments"},
    {"model": "Phi-4",             "provider": "Microsoft", "license": "MIT",       "key_strength": "Frontier reasoning in 14B params",      "objection": "On-device / cost-sensitive"},
]

def estimate_monthly_cost(daily_requests, avg_input_tokens, avg_output_tokens,
                          input_price_per_1m, output_price_per_1m):
    """Cost estimation framework. Plug in live pricing from anthropic.com/pricing."""
    cost_per_request = (
        (avg_input_tokens / 1_000_000) * input_price_per_1m +
        (avg_output_tokens / 1_000_000) * output_price_per_1m
    )
    return cost_per_request * daily_requests * 30

print("=" * 65)
print("PROPRIETARY MODEL LANDSCAPE (verify current strings at docs.anthropic.com)")
print("=" * 65)
for name, m in PROPRIETARY_MODELS.items():
    print(f"  {name:<38} ctx:{m['ctx']:>5}  [{m['tier']}]")
    print(f"    → {m['notes']}")

print()
print("=" * 65)
print("OPEN-WEIGHT TIER (self-hostable, near-zero per-token cost)")
print("=" * 65)
for m in OPEN_WEIGHT_MODELS:
    print(f"  {m['model']:<22} ({m['provider']}, {m['license']})")
    print(f"    Strength : {m['key_strength']}")
    print(f"    Objection: {m['objection']}")

print()
print("=" * 65)
print("CONTRACT REVIEW USE CASE — cost estimation framework")
print("=" * 65)
print("500 contracts/month × 50K input tokens + 2K output tokens")
print("Plug in LIVE pricing from anthropic.com/pricing before using these numbers!")
print()
# Example with placeholder prices — UPDATE BEFORE USING IN A REAL ESTIMATE
example_scenarios = [
    ("Claude Sonnet 4.6",  3.00, 15.00),  # <-- verify current price!
    ("Claude Haiku 4.5",   0.25,  1.25),  # <-- verify current price!
    ("GPT-4o (example)",   2.50, 10.00),  # <-- verify current price!
]
for name, in_price, out_price in example_scenarios:
    # 500 contracts/month = ~16.7 contracts/day
    monthly = estimate_monthly_cost(17, 50_000, 2_000, in_price, out_price)
    print(f"  {name:<25}  ~\${monthly:>8,.2f}/month  (VERIFY PRICE BEFORE USING)")
print()
print("KEY INSIGHT: At what monthly volume does cost force architectural changes?")
print("Model routing + prompt caching (Day 17) typically achieve 50-80% savings.")
`
  },

  interview: {
    question: 'Walk me through the 2026 AI model landscape. Which model would you choose for a new enterprise contract review product, and why?',
    answer: `I structure this answer in three parts: the proprietary tier I'd recommend, why I'd choose it over alternatives, and how I'd address the open-source objection.<br><br><strong>Recommendation:</strong> Claude Sonnet 4.6 (<code>claude-sonnet-4-6</code>). For contract review, the key requirements are long context, high accuracy on legal language, and strong structured output. Claude Sonnet 4.6's 200K context window handles full contracts without chunking — a genuine architectural advantage over GPT-4o's 128K. Constitutional AI training produces more calibrated, nuanced outputs on sensitive legal content. And the performance-to-cost ratio is better than Opus for most contracts unless you're analyzing unusually complex multi-jurisdiction agreements.<br><br><strong>Why not GPT-4o?</strong> Strong ecosystem, but 128K context forces chunking on large contracts, which increases complexity and introduces retrieval errors. If the customer is Azure-first, I'd recommend Claude via Azure AI Marketplace to reduce procurement friction — same model, enterprise identity integration included.<br><br><strong>The open-source objection:</strong> "Why not self-host Llama 4 Maverick?" My prepared answer: Llama 4 is an excellent model. What it doesn't come with is Anthropic's Constitutional AI safety training, a Responsible Scaling Policy, SOC 2 Type II certification, HIPAA eligibility, a 99.9% SLA, a dedicated support team, or audit trails for enterprise compliance. For a law firm handling client-privileged documents, those aren't nice-to-haves — they're procurement requirements. Always benchmark both on your specific use case before committing, but know your defensible answer.`
  },

  pmAngle: 'The open-source tier is not Claude\'s enemy — it\'s the context that makes Claude\'s value proposition specific and defensible. A PM who can answer "why pay for Claude when Llama 4 is free" without hesitation is a more credible seller, engineer, and strategist than one who\'s never thought about the question.',

  resources: [
    { type: 'DOCS', title: 'Anthropic Models Overview', url: 'https://docs.anthropic.com/en/docs/about-claude/models', note: 'Current model strings, context limits, capability notes. Bookmark this — check before every project.' },
    { type: 'PRICING', title: 'Anthropic API Pricing (live)', url: 'https://www.anthropic.com/pricing', note: 'Always use live pricing. Never hardcode numbers that change quarterly.' },
    { type: 'PRICING', title: 'OpenAI API Pricing (live)', url: 'https://openai.com/pricing', note: 'Compare GPT-4o vs o-series pricing tradeoffs. Verify before any estimate.' },
    { type: 'PAPER', title: 'DeepSeek-R1 Technical Report (Jan 2025)', url: 'https://arxiv.org/abs/2501.12948', note: 'The January 2025 inflection point. Read the abstract and executive summary — this changed competitive dynamics.' },
    { type: 'BLOG', title: 'Meta Llama 4 Announcement', url: 'https://ai.meta.com/blog/', note: 'Meta\'s open-weight strategy. Understand why they release weights for free.' },
    { type: 'DOCS', title: 'Claude Model Strings Reference', url: 'https://docs.anthropic.com/en/docs/about-claude/models/overview', note: 'Exact API strings for current Claude models. Get these right in every code example.' }
  ]
};
