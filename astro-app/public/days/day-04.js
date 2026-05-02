// Day 04 — Claude's Model Family & Anthropic's Mission
// Updated: March 2026
// Review changes:
// - CRITICAL: Updated model family to Claude 4.x generation throughout
// - Removed hardcoded context/output token limits → link to docs
// - Added Claude 2024-2025 capabilities: extended thinking, web search, Projects, Claude Code
// - Removed specific ARR numbers → teach research skill
// - Updated Claude limitations: web search now available via tool use
// - Added Claude.ai vs API distinction for PMs
// - Added Anthropic's full product surface (Claude.ai tiers, API, Bedrock, Vertex, Claude Code)
// - Added GitHub commit task structure
// - Preserved: hiring page analysis exercise, honest limitations acknowledgment

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

window.COURSE_DAY_DATA[4] = {
  subtitle: 'Know the product you\u2019re building on — Claude\u2019s current capabilities, strategic positioning, and the full product surface.',

  context: `<p>Anthropic's Claude family as of early 2026 has three tiers: <strong>Claude Haiku 4.5</strong> (<code>claude-haiku-4-5-20251001</code> — fastest, cheapest, ideal for high-volume classification and extraction), <strong>Claude Sonnet 4.6</strong> (<code>claude-sonnet-4-6</code> — the production workhorse, best performance-to-cost ratio, the model most products are built on), and <strong>Claude Opus 4.6</strong> (<code>claude-opus-4-6</code> — most capable reasoning, used for complex analysis where quality justifies cost). Model specifications — context windows, output token limits, and pricing — change with updates. Always verify at <a href="https://docs.anthropic.com/en/docs/about-claude/models" target="_blank">docs.anthropic.com/en/docs/about-claude/models</a> before making any product decision. Hardcoding specs from a course is how you end up with stale architecture documents.</p>
  <p>Claude's capabilities have expanded significantly in 2024-2025 beyond basic chat: <strong>Extended thinking</strong> (the model generates internal chain-of-thought for harder problems, configurable via a budget_tokens parameter), <strong>web search</strong> (available via tool use in the API and natively in Claude.ai), <strong>Projects</strong> (persistent context containers in Claude.ai for teams), <strong>computer use</strong> (controlling GUIs — covered on Day 25), and <strong>Claude Code</strong> (an agentic coding CLI — covered on Day 43). Understanding which capabilities are available in which product surface is critical PM knowledge.</p>
  <p>A PM at Anthropic needs to understand that <strong>Claude.ai</strong> (the consumer/team/enterprise product) and <strong>the Claude API</strong> (the developer product) have different feature sets and release cadences. Features sometimes ship in Claude.ai first (e.g., Projects, web search) and in the API later, or vice versa. The full Anthropic product surface in 2025-2026: Claude.ai (Free, Pro, Team, Enterprise tiers), Claude API (direct access), Claude on AWS Bedrock, Claude on Google Cloud Vertex AI, Claude Code (agentic CLI), and Claude embedded in partner products (Salesforce, etc.). Each channel has different security guarantees, pricing, and feature availability. Knowing the differences is how you recommend the right deployment path for each customer.</p>
  <p>Anthropic's mission — "the responsible development and maintenance of advanced AI for the long-term benefit of humanity" — is operational, not decorative. The RSP (Responsible Scaling Policy, covered Day 19) ties commercial deployment to safety evaluations. For PMs, this means Anthropic will sometimes say "not yet" to capabilities that are technically possible but not safe to deploy. That constraint shapes what you can build and when — understand it as a feature of the platform, not a limitation.</p>
  <p>Claude's <strong>strongest areas</strong> relative to competitors: long-context understanding, instruction-following fidelity (especially structured output compliance), coding (explanation, review, generation), nuanced refusal handling (reasoning-based via CAI, not keyword-matching), and safety-by-design (enterprise customers in regulated industries value this). Claude's historical limitations — no web access, no image generation — have partially evolved: web search is now available via tool use in the API, though image generation remains outside Claude's capabilities. Knowing both strengths and limitations honestly is essential for enterprise sales credibility.</p>`,

  tasks: [
    {
      title: 'Build a model selection decision tree',
      description: 'Create a flowchart: given a use case, which Claude model do you choose? Decision factors: expected daily request volume, required latency (p99 ms), context length needed, whether extended thinking is required, budget per 1M tokens. Look up current specs at docs.anthropic.com/en/docs/about-claude/models (don\u2019t use hardcoded numbers). Test on 5 product scenarios. Save as /day-04/model_selection_decision_tree.md.',
      time: '25 min'
    },
    {
      title: 'Research Anthropic\u2019s hiring to infer strategy',
      description: 'Go to Anthropic\u2019s careers page (anthropic.com/careers). What are the top 5 open roles by volume? What does the hiring pattern tell you about where Anthropic is investing? AI safety research, product engineering, enterprise sales, Claude Code? Write a 150-word interpretation. Save as /day-04/anthropic_hiring_analysis.md.',
      time: '20 min'
    },
    {
      title: 'Map Anthropic\u2019s full product surface',
      description: 'Create a table mapping Anthropic\u2019s product surface: Claude.ai (Free/Pro/Team/Enterprise), Claude API, AWS Bedrock, Google Vertex AI, Claude Code, partner integrations. For each: target user, key differentiator, and security/compliance characteristics. When would an enterprise customer choose Bedrock over direct API? Save as /day-04/product_surface_map.md.',
      time: '20 min'
    },
    {
      title: 'Draft honest enterprise positioning talking points',
      description: 'Write 3 reasons an enterprise customer should choose Claude over GPT-4o, AND 2 scenarios where GPT-4o or Gemini might be a better fit. Be specific, honest, and focused on use-case-level tradeoffs. Include the open-source objection from Day 1. Save as /day-04/enterprise_positioning_talking_points.md.',
      time: '15 min'
    }
  ],

  codeExample: {
    title: 'Claude model selection decision tree — Python',
    lang: 'python',
    code: `# Day 04 — Claude Model Selection Decision Tree
#
# Anthropic ships a product surface (Claude.ai, API, Bedrock, Vertex,
# Claude Code) with multiple model tiers. The PM job is to pick the right
# combination per use case and explain WHY — including limits.
#
# This script encodes the live 2025/2026 Claude lineup as a small decision
# tree and recommends a (model, surface) pair plus a rationale a PM could
# paste straight into a design doc. Pricing is pulled from a hardcoded
# table — always verify at https://www.anthropic.com/pricing before quoting
# real numbers in a customer artifact.

from dataclasses import dataclass
from typing import List, Optional

@dataclass
class UseCase:
    name: str
    needs_extended_thinking: bool   # multi-step reasoning, planning
    needs_vision: bool
    latency_critical_ms: Optional[int]   # None = batch-OK
    monthly_calls: int
    avg_input_tokens: int
    avg_output_tokens: int
    deployment: str                  # "saas" | "regulated" | "on_prem"

# Hardcoded snapshot — verify before quoting.
PRICES = {
    # name             -> (in $/MTok, out $/MTok)
    "claude-opus-4-6":              (15.00, 75.00),
    "claude-sonnet-4-6":            ( 3.00, 15.00),
    "claude-haiku-4-5-20251001":    ( 0.80,  4.00),
}

SURFACES = {
    "saas":      "Anthropic API (direct).",
    "regulated": "Amazon Bedrock — BAA, data residency, IAM auth.",
    "on_prem":   "Google Vertex — VPC-SC, customer-managed encryption.",
}

def pick_model(uc: UseCase) -> str:
    # Reasoning-heavy and quality > cost  -> Opus.
    if uc.needs_extended_thinking and uc.monthly_calls < 200_000:
        return "claude-opus-4-6"
    # Latency-critical, high volume, narrow tasks  -> Haiku.
    if uc.latency_critical_ms is not None and uc.latency_critical_ms < 800:
        return "claude-haiku-4-5-20251001"
    # Vision OR mixed reasoning at scale  -> Sonnet (the default workhorse).
    return "claude-sonnet-4-6"

def estimated_monthly_cost(model: str, uc: UseCase) -> float:
    p_in, p_out = PRICES[model]
    in_mtok  = uc.monthly_calls * uc.avg_input_tokens  / 1_000_000
    out_mtok = uc.monthly_calls * uc.avg_output_tokens / 1_000_000
    return round(in_mtok * p_in + out_mtok * p_out, 2)

def rationale(model: str, uc: UseCase) -> str:
    bits = []
    if uc.needs_extended_thinking and model == "claude-opus-4-6":
        bits.append("extended-thinking depth justifies Opus premium")
    if uc.latency_critical_ms and model == "claude-haiku-4-5-20251001":
        bits.append(f"sub-{uc.latency_critical_ms}ms target favors Haiku")
    if model == "claude-sonnet-4-6":
        bits.append("Sonnet is the cost/quality default for mixed workloads")
    if uc.needs_vision:
        bits.append("native PDF + image input supported on all 4.x models")
    return "; ".join(bits) or "default workhorse"

def recommend(uc: UseCase) -> dict:
    model   = pick_model(uc)
    surface = SURFACES[uc.deployment]
    cost    = estimated_monthly_cost(model, uc)
    return {
        "use_case":   uc.name,
        "model":      model,
        "surface":    surface,
        "est_$_mo":   cost,
        "why":        rationale(model, uc),
    }

# --- Demo ----------------------------------------------------------------
USE_CASES = [
    UseCase("M&A diligence assistant",       True,  True,  None,    20_000, 8_000, 2_500, "regulated"),
    UseCase("In-app autocomplete",           False, False, 300,  5_000_000,    600,   120, "saas"),
    UseCase("Customer support triage",       False, False, 1500,   400_000,  2_400,   400, "saas"),
    UseCase("Field-service photo Q&A",       False, True,  None,   120_000,  1_200,   300, "saas"),
    UseCase("Healthcare claim adjudication", True,  False, None,    80_000,  3_500,   900, "regulated"),
    UseCase("Defense doc analysis",          True,  True,  None,    30_000,  6_000,   800, "on_prem"),
]

print(f"{'Use case':38} {'Model':30} {'$/mo':>10}  Why")
print("-" * 110)
for uc in USE_CASES:
    r = recommend(uc)
    print(f"{r['use_case']:38} {r['model']:30} {r['est_$_mo']:>10.2f}  {r['why']}")

print("\\nSurface mapping:")
for k, v in SURFACES.items():
    print(f"  {k:10}  {v}")

print("\\nPM takeaway: Sonnet is the default; reach for Opus on hard reasoning, "
      "Haiku on latency-critical loops. Surface choice is a procurement "
      "decision, not a capability decision — Bedrock/Vertex unlock buyers, "
      "not features.")
`,
  },

  interview: {
    question: 'Why would you choose to build on Claude rather than GPT-4o?',
    answer: `The answer depends entirely on the use case, but here are the scenarios where Claude wins and where it doesn\u2019t.<br><br><strong>Claude wins on:</strong> First, long-context applications. Claude Sonnet 4.6\u2019s 200K context handles full contracts, codebases, and research papers without chunking  — a genuine architectural simplification over models with smaller windows. Second, instruction-following fidelity. For products requiring strict structured output (JSON, specific formats, compliance-sensitive document generation), Claude consistently follows complex instructions with fewer deviations. Third, safety-by-design for regulated industries. Constitutional AI training means Claude reasons about edge cases rather than pattern-matching, which matters for products touching legal, medical, or financial content. Fourth, enterprise deployment flexibility: Claude is available on AWS Bedrock and Google Vertex AI, matching where the customer already has cloud agreements.<br><br><strong>GPT-4o wins on:</strong> Largest developer ecosystem (more third-party tools built for OpenAI first), Microsoft integration depth for Azure-native enterprises, and the o-series reasoning models for tasks requiring multi-step mathematical or scientific reasoning. Gemini 2.5 Pro wins on context window (1M+ tokens) for extremely long document use cases.<br><br>My principle: always benchmark both on your specific use case before committing. Public benchmarks don\u2019t predict domain-specific performance reliably. And know the open-source alternative: "Why not self-host Llama 4?" has a specific answer (SOC 2, HIPAA, SLA, support, Constitutional AI) that you should be able to recite.`
  },

  pmAngle: 'At Anthropic, you will be the person who explains your product most honestly — including its limitations. PMs who articulate both where Claude wins and where it doesn\u2019t are more trusted by customers and engineers than those who just sell. And knowing the full product surface (Claude.ai vs API vs Bedrock vs Vertex vs Claude Code) lets you recommend the right deployment for each customer rather than a one-size-fits-all answer.',

  resources: [
    { type: 'DOCS', title: 'Claude Models Overview', url: 'https://docs.anthropic.com/en/docs/about-claude/models', note: 'Current model strings, context limits, capabilities. Bookmark and check before every project.' },
    { type: 'BLOG', title: 'Anthropic\u2019s Mission', url: 'https://www.anthropic.com/company', note: 'The mission statement is operational, not decorative. Read it before your interview.' },
    { type: 'BLOG', title: 'The Claude Character', url: 'https://www.anthropic.com/research/claude-character', note: 'How Anthropic thinks about Claude\u2019s values and personality.' },
    { type: 'BLOG', title: 'Anthropic Model Spec', url: 'https://www.anthropic.com/news/claudes-constitution', note: 'Primary document on Claude\u2019s designed behavior. Essential reading for PMs building on Claude.' },
    { type: 'DOCS', title: 'Claude Extended Thinking', url: 'https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking', note: 'How extended thinking works: budget_tokens parameter, when to use, streaming behavior.' },
    { type: 'DOCS', title: 'Anthropic Security', url: 'https://trust.anthropic.com', note: 'SOC 2, HIPAA, security certifications. Essential knowledge for enterprise sales conversations.' }
  ]
};
