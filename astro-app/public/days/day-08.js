// Day 08 — The Frontier Lab Business Model
// Updated: March 2026
// Review changes:
// - Removed specific ARR estimates for Anthropic and OpenAI (stale within months)
// - Updated inference cost trajectory: costs fell faster than predicted
// - Added open-source business model disruption (Meta Llama, "why pay for Claude?")
// - Added DeepSeek R1 as training cost inflection point
// - Added NVIDIA Nemotron-4 one-sentence mention
// - Added AWS/GCP revenue sharing implications
// - Fixed "thin or negative margins" claim → margins improved by 2025
// - Added GitHub commit task structure

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

window.COURSE_DAY_DATA[8] = {
  subtitle: 'Follow the money — understanding frontier lab economics shapes every product decision you make.',

  context: `<p>Frontier AI labs run on a paradox: they require billions in compute, charge prices that initially didn\u2019t cover costs, and compete with well-capitalized incumbents (Microsoft, Google, Amazon) who can absorb losses indefinitely. The sustainable business model requires achieving (a) strong model quality that commands premium pricing, (b) scale that drives inference costs down, and (c) platform network effects that make switching costly. All three strategies are being pursued simultaneously by every major lab.</p>
  <p>Revenue streams: <strong>API access</strong> (pay-per-token, the developer and enterprise market), <strong>consumer subscriptions</strong> (ChatGPT Plus/Pro, Claude Pro — $20/month tiers), and <strong>enterprise contracts</strong> (negotiated volume deals with dedicated capacity and SLAs). Revenue figures change rapidly — never cite specific ARR numbers in interviews as they go stale within months. Instead, research current figures from credible financial press as of your interview date. The skill is knowing where to look, not memorizing a number that was wrong six months after the course was written.</p>
  <p><strong>Inference cost trajectory:</strong> The course\u2019s original claim that "inference costs are sticky" was wrong. Inference costs have fallen dramatically faster than predicted, driven by hardware improvements (custom silicon like Google TPUs and Amazon Trainium), software optimizations (FlashAttention, speculative decoding, KV-cache compression), and model efficiency techniques (distillation, quantization). GPT-4-level capability that cost $120/1M tokens in 2023 now costs significantly less on equivalent-class models in 2025. For current pricing, see the provider's pricing page. This trajectory matters for product strategy: features that were too expensive to ship 18 months ago may now be economically viable.</p>
  <p><strong>The open-source business model disruption.</strong> Meta\u2019s strategy of releasing Llama weights for free has permanently changed frontier lab economics. Every AI PM must have a prepared answer for: "Why would an enterprise pay for Claude API when Llama 4 is free to self-host?" The answer — quality guarantees, Constitutional AI safety training, SOC 2 Type II, HIPAA eligibility, 99.9% SLA, compliance documentation, and dedicated support — shapes Anthropic\u2019s entire product strategy. If you can\u2019t articulate this, you can\u2019t sell, position, or roadmap effectively.</p>
  <p><strong>DeepSeek R1 as a training cost inflection point.</strong> In January 2025, DeepSeek published a frontier-class reasoning model reportedly trained for under $6M, compared to the $50-100M+ attributed to frontier model training at Western labs. Whether or not that figure captures the full picture, the directional signal is unambiguous: training cost barriers are compressing faster than expected. The business model implication: sustained competitive advantage for Anthropic and OpenAI cannot rest on training cost moats. It must rest on safety credibility, enterprise relationships, compliance certifications, and ongoing research quality. NVIDIA\u2019s Nemotron-4 340B (2024) further signaled that chip manufacturers can produce frontier-class models, representing vertical integration from silicon to software that changes the competitive structure of AI infrastructure.</p>
  <p><strong>Cloud distribution economics.</strong> Anthropic\u2019s deployment on AWS Bedrock and Google Cloud Vertex AI isn\u2019t just distribution — there are revenue-sharing arrangements that change unit economics. Enterprise Claude via Bedrock has different economics than direct API for both Anthropic and the customer. A PM should understand: the cloud provider takes a cut (typically 20-30%), but provides enterprise procurement integration, identity management, and compliance that many enterprises require. This makes Bedrock/Vertex strategically important even at lower margins per token.</p>`,

  tasks: [
    {
      title: 'Build a frontier lab P&L model',
      description: 'Using public pricing and publicly estimated user numbers, build a simplified P&L for either Anthropic or OpenAI. Revenue = estimated users \u00d7 subscription + estimated API tokens \u00d7 price. Costs = training (amortized), inference, headcount. What margin can you infer? What needs to be true for profitability? Don\u2019t use stale ARR numbers from this course — research current estimates. Save as /day-08/frontier_lab_unit_economics.md.',
      time: '30 min'
    },
    {
      title: 'Compare consumer vs enterprise pricing',
      description: 'Document the pricing structure for ChatGPT (Free/Plus/Team/Enterprise) and Claude (Free/Pro/Team/Enterprise). What does each tier include? What constraints do free tiers impose? What is the upgrade trigger? How have free tiers changed as inference costs dropped? Save as /day-08/pricing_comparison.md.',
      time: '20 min'
    },
    {
      title: 'Open-source disruption analysis',
      description: 'Answer three questions: (1) Why does Meta release Llama for free? What\u2019s the business model? (2) How does DeepSeek R1\u2019s $6M training cost change the competitive landscape? (3) What is Anthropic\u2019s defensible moat against open-source alternatives? Be specific — not "safety" but "SOC 2 Type II, HIPAA eligibility, Constitutional AI training, 99.9% SLA." Save as /day-08/open_source_disruption_analysis.md.',
      time: '20 min'
    },
    {
      title: 'Mission-commercial tension memo',
      description: 'Write 200 words: How does the commercial imperative (grow revenue) create tension with Anthropic\u2019s safety mission (don\u2019t deploy risky capabilities)? Give a specific example of a product feature where this tension would be real. How would you navigate it as a PM? Save as /day-08/mission_commercial_tension_memo.md.',
      time: '10 min'
    }
  ],

  codeExample: {
    title: 'Frontier lab P&L unit-economics simulator — Python',
    lang: 'python',
    code: `# Day 08 — Frontier Lab P&L Unit-Economics Simulator
#
# A toy P&L for a frontier model lab. Captures the four economic forces
# every PM at such a lab must reason about:
#   1. Training capex amortized over a model's commercial life.
#   2. Inference COGS as a function of GPU $/hr and tokens/sec.
#   3. Cloud distribution partners (Bedrock, Vertex) taking a 25-30% cut.
#   4. Open-source pressure compressing API gross margin year over year.
#
# This isn't a forecast — it's a sandbox for exploring HOW the levers move
# together. Plug in your own assumptions before quoting any number.

from dataclasses import dataclass

@dataclass
class Model:
    name: str
    train_cost_usd: float        # one-time pretraining + RLHF
    life_months: int             # commercial life before deprecation
    api_price_in:  float         # $ per 1M input tokens
    api_price_out: float         # $ per 1M output tokens
    inference_cost_per_mtok: float  # blended GPU + serving COGS

@dataclass
class Channel:
    name: str
    revenue_share_to_partner: float   # 0..1; e.g. 0.27 for Bedrock
    monthly_input_mtok:  float
    monthly_output_mtok: float

def amortized_training(m: Model) -> float:
    """Monthly training cost spread across the model's life."""
    return m.train_cost_usd / max(m.life_months, 1)

def channel_revenue(m: Model, c: Channel) -> float:
    gross = c.monthly_input_mtok * m.api_price_in + c.monthly_output_mtok * m.api_price_out
    return gross * (1.0 - c.revenue_share_to_partner)

def channel_cogs(m: Model, c: Channel) -> float:
    total_mtok = c.monthly_input_mtok + c.monthly_output_mtok
    return total_mtok * m.inference_cost_per_mtok

def simulate(m: Model, channels: list, oss_compression_pct: float = 0.0) -> dict:
    """oss_compression_pct: % API price erosion from open-weight pressure."""
    factor = 1.0 - oss_compression_pct
    revenue = sum(channel_revenue(m, c) for c in channels) * factor
    cogs    = sum(channel_cogs(m, c)    for c in channels)
    train   = amortized_training(m)
    gp      = revenue - cogs
    op      = gp - train
    return {
        "revenue":            round(revenue, 2),
        "inference_cogs":     round(cogs, 2),
        "amortized_training": round(train, 2),
        "gross_profit":       round(gp, 2),
        "operating_profit":   round(op, 2),
        "gross_margin":       round(gp / revenue, 3) if revenue else 0.0,
    }

# --- Scenario ------------------------------------------------------------
sonnet = Model(
    name="claude-sonnet-4-6",
    train_cost_usd=120_000_000,
    life_months=18,
    api_price_in=3.00,
    api_price_out=15.00,
    inference_cost_per_mtok=0.55,
)

channels = [
    Channel("Direct API",  0.00,  monthly_input_mtok=400.0, monthly_output_mtok=160.0),
    Channel("Bedrock",     0.27,  monthly_input_mtok=350.0, monthly_output_mtok=140.0),
    Channel("Vertex",      0.25,  monthly_input_mtok=180.0, monthly_output_mtok=70.0),
]

print(f"Model: {sonnet.name}")
print(f"Training capex: \${sonnet.train_cost_usd:,.0f} amortized over "
      f"{sonnet.life_months} months -> \${amortized_training(sonnet):,.0f}/mo\\n")

# --- Sensitivity to OSS price compression --------------------------------
print(f"{'OSS compression':>15}  {'Revenue':>12}  {'GP':>12}  {'GM%':>6}  {'OpProfit':>12}")
print("-" * 64)
for comp in (0.00, 0.10, 0.20, 0.30, 0.40):
    s = simulate(sonnet, channels, oss_compression_pct=comp)
    print(f"{comp*100:>14.0f}%  \${s['revenue']:>11,.0f}  \${s['gross_profit']:>11,.0f}  "
          f"{s['gross_margin']*100:>5.1f}  \${s['operating_profit']:>11,.0f}")

# --- Per-channel decomposition ------------------------------------------
print("\\nPer-channel revenue (no OSS pressure):")
for c in channels:
    rev  = channel_revenue(sonnet, c)
    cogs = channel_cogs(sonnet, c)
    take = c.revenue_share_to_partner * 100
    print(f"  {c.name:11}  partner cut {take:>4.0f}%  net \${rev:>10,.0f}  cogs \${cogs:>9,.0f}")

# --- Consumer vs enterprise mix sanity check -----------------------------
print("\\nPM takeaway: 30% partner cuts on Bedrock/Vertex are the price of "
      "enterprise distribution. Open-source pressure compresses API GM "
      "but rarely touches consumer subscriptions — so consumer ARR is the "
      "hedge that keeps training capex investable. Always model both.")
`,
  },

  interview: {
    question: 'What are the unit economics of an AI API business, and how do they affect product decisions?',
    answer: `The core formula: revenue is tokens \u00d7 price per token; cost is tokens \u00d7 inference cost per token. The margin is the spread. By 2025, inference efficiency improvements have made gross margins positive for most frontier model API providers on most models — the "thin or negative margins" story from 2023 is no longer universally true. Smaller, efficient models like Haiku and GPT-4o-mini are often the highest-margin products.<br><br>Three product implications: First, free tiers are expensive customer acquisition investments. Every free API call is subsidized. When cash is tight, free tiers get constrained — but as inference costs fall, free tiers can be more generous. Second, enterprise deals are volume commits that lock in revenue but reduce per-token upside. PM teams face pressure to maximize contract utilization. Third, open-source models (Llama 4, Mistral, Phi-4) create a pricing floor — you can only command API pricing if your value extends beyond model quality to safety, compliance, support, and SLAs.<br><br>The biggest shift since 2024: inference costs fell 100x faster than expected. This changes what\u2019s economically viable. Products that were too expensive at $120/1M tokens are viable at $1/1M. Every quarterly pricing drop opens new product categories — a PM who understands this can time feature launches to coincide with cost thresholds.`
  },

  pmAngle: 'Understanding your employer\u2019s economics is basic PM competency. At a frontier lab, those economics include training costs that rival feature film budgets, inference costs that change quarterly, an open-source competitor giving away comparable capabilities for free, and cloud distribution partners who take 20-30% cuts. Navigate all four or your product decisions won\u2019t make commercial sense.',

  resources: [
    { type: 'PRICING', title: 'Anthropic Pricing (live)', url: 'https://www.anthropic.com/pricing', note: 'Current API and plan pricing. Memorize the key tiers before interviews.' },
    { type: 'PRICING', title: 'OpenAI Pricing (live)', url: 'https://openai.com/pricing', note: 'Compare GPT-4o, o-series, and mini pricing tiers.' },
    { type: 'BLOG', title: 'AI Business Models — a16z', url: 'https://a16z.com/the-economic-case-for-generative-ai/', note: 'Where AI margins live in the stack. Essential reading for AI PM economics.' },
    { type: 'PAPER', title: 'DeepSeek-R1 Technical Report', url: 'https://arxiv.org/abs/2501.12948', note: 'The training cost inflection point. Read for competitive economics, not architecture.' },
    { type: 'BLOG', title: 'Meta Llama Strategy', url: 'https://ai.meta.com/blog/', note: 'Why Meta releases weights for free. The open-source business model rationale.' },
    { type: 'DOCS', title: 'AWS Bedrock — Claude', url: 'https://aws.amazon.com/bedrock/claude/', note: 'How enterprise Claude deployment via Bedrock works. Different economics than direct API.' }
  ]
};
