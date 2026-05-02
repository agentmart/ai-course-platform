// Day 37 — Pricing AI Products
// Updated: March 2026 | Review: open-source pricing floor, per-seat SaaS dominance, freemium AI guidance

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[37] = {
  subtitle: 'How to price AI products when open-source creates a zero-cost floor.',
  context: `<p>AI product pricing is fundamentally different from traditional SaaS pricing because your marginal cost is non-zero and variable. Every API call costs money \u2014 and that cost varies by model, prompt length, and output length. The pricing challenge: charge enough to cover model costs with margin, but not so much that customers switch to open-source alternatives that approach zero marginal cost.</p>
  <p><strong>Open-source models create a pricing floor.</strong> Self-hosted Llama, Phi, and Mistral models run at near-zero per-token cost on dedicated GPUs once infrastructure is provisioned. For high-volume use cases (thousands of requests per day), self-hosting open-source is dramatically cheaper than commercial APIs. This means any pricing strategy that depends solely on model access is vulnerable. Your premium must come from product value \u2014 UX, workflow integration, reliability, support, and domain-specific fine-tuning \u2014 not from model access itself.</p>
  <p><strong>Per-seat SaaS has become the dominant AI pricing model</strong> for B2B products. GitHub Copilot ($19/month per developer), Salesforce Einstein (per-user add-on), Notion AI ($10/month per member), and Cursor Pro ($20/month per developer). The per-seat model works because: it\u2019s predictable for buyers (enterprise procurement loves predictable costs), it decouples pricing from variable model costs (the vendor absorbs usage variance), and it aligns with existing SaaS purchasing patterns. The risk: heavy users cost you significantly more to serve than light users. Track cost-per-seat carefully and consider tiered usage limits.</p>
  <p><strong>Per-token or usage-based pricing</strong> makes sense for API-first products and high-volume applications. Anthropic, OpenAI, and Google all price this way. Advantage: revenue scales directly with customer value. Disadvantage: customer costs are unpredictable, which creates friction in enterprise procurement. Hybrid approaches work: per-seat base price with included usage, then overage charges above the threshold.</p>
  <p><strong>Freemium AI pricing</strong> is powerful but expensive. Free tiers drive adoption, but every free user costs real money in model API calls. Design your free tier carefully: limit usage volume (GitHub Copilot Free: 2,000 completions/month), use a cheaper model for free tier (claude-haiku-4-5-20251001) while reserving the premium model (claude-sonnet-4-6) for paid tiers, or limit to specific features. The conversion funnel must justify the cost of free users \u2014 if conversion to paid is below 3\u20145%, revisit the free tier economics.</p>
  <p><strong>The pricing stack:</strong> (1) Calculate cost-to-serve per unit (conversation, document, query). (2) Add target margin (60\u201380% gross margin for AI SaaS). (3) Benchmark against competitors and alternatives (including self-hosting). (4) Test willingness-to-pay with early customers. (5) Plan for model cost decreases \u2014 prices drop 50\u201370% annually, which improves your margin if you hold prices steady.</p>`,
  tasks: [
    { title: 'Calculate cost-to-serve for an AI product', description: 'For an AI document summarization product: calculate cost per summarization for three model tiers (claude-haiku-4-5-20251001 for basic, claude-sonnet-4-6 for standard, claude-opus-4-6 for premium). Estimate input/output tokens per document. Calculate monthly cost to serve 1,000 free users and 200 paid users. What gross margin does a $29/month price achieve? Save as /day-37/cost_to_serve_analysis.md.', time: '25 min' },
    { title: 'Design a pricing strategy', description: 'Design a complete pricing strategy for an AI customer support product: free tier (what\u2019s included, what model powers it, monthly cost to you), pro tier (pricing, features, model tier), enterprise tier (pricing model, SLA, dedicated resources). Include the open-source risk: what happens to your pricing if a customer can self-host Llama to achieve 80% of your quality? Save as /day-37/pricing_strategy.md.', time: '25 min' },
    { title: 'Competitive pricing analysis', description: 'Compare pricing models of 5 AI products across different categories: code assistant (Cursor/Copilot), writing (Jasper/Copy.ai), search (Perplexity), enterprise (Salesforce Einstein), API (Anthropic/OpenAI). For each: pricing model, price point, what\u2019s included, and how they handle the open-source pricing floor. Identify patterns. Save as /day-37/competitive_pricing_analysis.md.', time: '20 min' },
    { title: 'Freemium conversion model', description: 'Design the free-to-paid conversion funnel for an AI product. Define: free tier limits, the \u201caha moment\u201d that triggers upgrade intent, upgrade prompts (when and how), and the target conversion rate. Calculate the maximum cost you can afford per free user given your target conversion rate and paid ARPU. Save as /day-37/freemium_conversion_model.md. Stage and commit your Day 33\u201437 work.', time: '10 min' }
  ],

  codeExample: {
    title: 'AI pricing simulator (token/seat/hybrid) — Python',
    lang: 'python',
    code: `# Day 37 — AI pricing model simulator (per-token vs per-seat vs hybrid)
# Pedagogical goal: price for VALUE delivered, not COST to serve.
# Show that an OSS zero-cost floor doesn't dictate your price.

from dataclasses import dataclass
from typing import Dict, List


@dataclass
class Customer:
    segment: str        # SMB | MID | ENT
    seats: int
    monthly_tasks: int
    avg_in_tokens: int
    avg_out_tokens: int
    value_per_task: float   # $ value to the customer per accepted task


# Cost-to-serve assumptions (current model prices, illustrative)
PRICE_PER_1K_IN  = 0.003   # claude-sonnet-4-6 input
PRICE_PER_1K_OUT = 0.015   # claude-sonnet-4-6 output
INFRA_OVERHEAD_PER_TASK = 0.002


def cost_per_task(c: Customer) -> float:
    return ((c.avg_in_tokens / 1000.0) * PRICE_PER_1K_IN
            + (c.avg_out_tokens / 1000.0) * PRICE_PER_1K_OUT
            + INFRA_OVERHEAD_PER_TASK)


def cost_to_serve(c: Customer) -> float:
    return cost_per_task(c) * c.monthly_tasks


# Three pricing models a PM would A/B in market.
def per_token_price(c: Customer, markup: float = 4.0) -> float:
    return cost_per_task(c) * markup * c.monthly_tasks


def per_seat_price(c: Customer, price_per_seat: float = 49.0) -> float:
    return c.seats * price_per_seat


def hybrid_price(c: Customer, base_seat: float = 25.0,
                 included_tasks: int = 200, overage_per_task: float = 0.20) -> float:
    overage = max(0, c.monthly_tasks - included_tasks * c.seats)
    return c.seats * base_seat + overage * overage_per_task


def margin(price: float, cost: float) -> float:
    if price <= 0:
        return 0.0
    return round((price - cost) / price, 3)


def value_capture(price: float, c: Customer) -> float:
    monthly_value = c.value_per_task * c.monthly_tasks
    if monthly_value <= 0:
        return 0.0
    return round(price / monthly_value, 3)


CUSTOMERS: List[Customer] = [
    Customer("SMB", seats=4,   monthly_tasks=320,   avg_in_tokens=900,  avg_out_tokens=200, value_per_task=2.40),
    Customer("MID", seats=22,  monthly_tasks=2400,  avg_in_tokens=1100, avg_out_tokens=260, value_per_task=2.10),
    Customer("ENT", seats=180, monthly_tasks=22000, avg_in_tokens=1300, avg_out_tokens=300, value_per_task=1.80),
]


print("=== Cost-to-serve per segment (monthly) ===")
for c in CUSTOMERS:
    cps = cost_per_task(c)
    print(f"  {c.segment}  seats={c.seats:>4}  tasks/mo={c.monthly_tasks:>6}  "
          f"cost/task=\${cps:.4f}  cost/mo=\${cost_to_serve(c):>8.2f}")


print("\\n=== Pricing comparison (monthly $ per customer) ===")
header = f"  {'seg':<3}  {'cost':>8}  {'per-token':>10}  {'per-seat':>10}  {'hybrid':>10}"
print(header)
for c in CUSTOMERS:
    cs = cost_to_serve(c)
    pt = per_token_price(c)
    ps = per_seat_price(c)
    hy = hybrid_price(c)
    print(f"  {c.segment:<3}  \${cs:>7.2f}  \${pt:>9.2f}  \${ps:>9.2f}  \${hy:>9.2f}")


print("\\n=== Margin and value capture ===")
print(f"  {'seg':<3}  {'plan':<10}  {'price':>9}  {'margin':>7}  {'value-capture':>14}")
for c in CUSTOMERS:
    cs = cost_to_serve(c)
    monthly_value = c.value_per_task * c.monthly_tasks
    for plan_name, price in [("per-token", per_token_price(c)),
                             ("per-seat",  per_seat_price(c)),
                             ("hybrid",    hybrid_price(c))]:
        m = margin(price, cs)
        vc = value_capture(price, c)
        flag = "  <-- under-pricing" if vc < 0.10 else ""
        print(f"  {c.segment:<3}  {plan_name:<10}  \${price:>8.2f}  {m*100:>6.1f}%  "
              f"{vc*100:>12.1f}%{flag}")
    print(f"       (monthly value to customer: \${monthly_value:.2f})")


def break_even_seats(cost_per_seat: float, price_per_seat: float = 49.0) -> int:
    if price_per_seat <= cost_per_seat:
        return 10**9
    return 1   # already profitable per seat under these unit economics


print("\\n=== Break-even sanity (per-seat plan) ===")
for c in CUSTOMERS:
    cps = cost_to_serve(c) / max(1, c.seats)
    print(f"  {c.segment}  cost/seat/mo=\${cps:.2f}  -> break-even at "
          f"{break_even_seats(cps):d} seat at $49/seat")


print("\\n=== Open-source floor scenario ===")
print("  If an open-weights Llama matches quality at $0 model cost,")
print("  per-token pricing collapses (margin -> infra only).")
print("  Per-seat + hybrid plans defend best because price is anchored")
print("  to VALUE and integration, not to model cost.")


print("\\nPM takeaway: pick the plan where value-capture lands 5-15% of")
print("customer value. Below that you leak; above that you stall sales.")
`,
  },

  interview: { question: 'How would you price an AI product when the underlying model costs are dropping rapidly?', answer: `I\u2019d approach this as a unit economics problem with a strategic overlay.<br><br><strong>Start with cost-to-serve:</strong> Calculate the model API cost per unit of customer value (conversation, document processed, query answered). Include not just the primary model call but embeddings, classification, and any retry costs. For a customer support AI: average conversation might be 3,000 input tokens and 1,000 output tokens across 4 turns, costing roughly $0.03\u2013$0.08 per conversation depending on the model.<br><br><strong>Price for value, not cost:</strong> If AI support resolves a $15 ticket for $0.05 in model costs, the value capture opportunity is enormous. Price at 10\u201320% of the value delivered: $1\u20133 per resolved ticket, or a per-seat model that averages to similar unit economics. The model cost is a floor, not a ceiling.<br><br><strong>Handle the open-source floor:</strong> Any sophisticated buyer knows they could self-host Llama at near-zero per-token cost. Your pricing premium must be justified by product value: reliability (99.9% uptime SLA), quality (your eval suite proves superiority), speed to value (works in hours, not weeks of self-hosting setup), and ongoing improvement (you continuously improve prompts and evaluations).<br><br><strong>Plan for cost deflation:</strong> Model costs drop 50\u201370% annually. Two strategies: hold prices and improve margins (the Amazon approach), or pass savings to customers and grow volume (the penetration approach). I\u2019d hold prices for the first 12\u201318 months to build margin, then selectively lower prices in segments where open-source competition pressures you.<br><br><strong>Per-seat with usage guardrails</strong> is my default recommendation for B2B. Predictable for procurement, decouples from per-token volatility, and aligned with how enterprises buy software.` },
  pmAngle: 'The AI pricing mistake that kills startups: pricing based on model cost rather than customer value. If your AI saves a customer $100 per task and costs you $0.05 to run, pricing at $1 is leaving 95% of the value on the table. Price for value delivered, absorb model cost reduction as margin improvement, and defend your premium with product differentiation that open-source can\u2019t replicate.',
  resources: [
    { type: 'DOCS', title: 'Anthropic API Pricing', url: 'https://www.anthropic.com/pricing', note: 'Current Claude model pricing. Essential for cost-to-serve calculations.' },
    { type: 'TOOL', title: 'Artificial Analysis \u2014 Pricing Comparison', url: 'https://artificialanalysis.ai/', note: 'Compare pricing across providers for the best price/performance.' },
    { type: 'BLOG', title: 'a16z: AI Pricing Strategies', url: 'https://a16z.com/the-economic-case-for-generative-ai-and-foundation-models/', note: 'Economic analysis of AI product pricing and margins.' },
    { type: 'BLOG', title: 'Kyle Poyar: AI Pricing Models', url: 'https://www.growthunhinged.com/', note: 'OpenView partner on usage-based vs seat-based AI pricing.' },
    { type: 'DOCS', title: 'OpenAI Pricing', url: 'https://openai.com/pricing', note: 'Competitive pricing reference for cost comparison.' }
  ]
};
