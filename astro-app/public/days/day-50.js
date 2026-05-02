// Day 50 — Phase 3 Capstone: Enterprise AI Strategy
// Updated: March 2026 | Review: regulatory risk dimension, reference architecture, Bedrock vs Azure guidance, 5-section structure

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[50] = {
  subtitle: 'Phase 3 Capstone \u2014 produce the enterprise AI strategy document that proves you can lead.',
  context: `<p>The Phase 3 capstone is a comprehensive enterprise AI strategy document \u2014 the deliverable that demonstrates your ability to think across technology, business, safety, and regulation simultaneously. This is the artifact most directly relevant to senior PM roles: the ability to synthesize a coherent AI strategy that a CTO or VP of Product would present to their board. Today you produce that document.</p>
  <p><strong>The 5-section structure.</strong> A strong enterprise AI strategy document has five sections, each demonstrating a different capability: (1) <strong>Executive summary</strong> \u2014 one page that communicates the AI opportunity, strategic recommendation, and expected business impact. Written for a board audience. (2) <strong>Use case identification and prioritization</strong> \u2014 identify 10 potential AI use cases, evaluate each on three dimensions (effort, value, and regulatory risk), and recommend the top 3 to pursue. (3) <strong>Architecture and technical approach</strong> \u2014 the reference architecture for Claude deployment, model selection rationale, and integration pattern. (4) <strong>Compliance and safety framework</strong> \u2014 how the strategy addresses EU AI Act requirements, sector-specific regulation, and AI safety best practices. (5) <strong>Implementation roadmap</strong> \u2014 a three-horizon roadmap with clear milestones, resource requirements, and success metrics.</p>
  <p><strong>Use case prioritization with regulatory risk.</strong> Traditional use case prioritization uses a 2x2 matrix (effort vs value). For AI products, you need a third dimension: <strong>regulatory risk</strong>. A high-value, low-effort use case that falls in the EU AI Act high-risk category may require 6 months of compliance work before launch. PMs who ignore regulatory risk in prioritization discover it at launch time \u2014 the worst possible moment. The three-axis framework: plot each use case on effort (build complexity), value (business impact), and regulatory risk (compliance requirements). Prioritize use cases that are high-value, low-effort, AND low-regulatory-risk for initial deployment. High-regulatory-risk use cases go to Horizon 2 after compliance infrastructure is built.</p>
  <p><strong>Standard enterprise Claude deployment reference architecture.</strong> The reference architecture for enterprise Claude deployment in 2026: (1) <strong>Model access layer</strong> \u2014 Claude via Azure AI Foundry or AWS Bedrock (based on customer\u2019s cloud agreements), with pinned model versions in production. (2) <strong>Orchestration layer</strong> \u2014 Semantic Kernel (.NET teams) or direct Anthropic SDK / LangChain (Python teams) for agent logic and workflow management. (3) <strong>Skills layer</strong> \u2014 MCP servers connecting Claude to enterprise data sources, APIs, and tools. (4) <strong>Evaluation layer</strong> \u2014 automated eval pipeline (RAGAS, DeepEval, LLM-as-judge) running in CI/CD. (5) <strong>Monitoring layer</strong> \u2014 latency, cost, quality, and safety metrics with alerting. (6) <strong>Safety layer</strong> \u2014 system prompt guardrails, input validation, output filtering, and content moderation. This architecture is model-agnostic at the orchestration layer, allowing model upgrades without rearchitecting.</p>
  <p><strong>Azure vs Bedrock recommendation.</strong> For the architecture section, the cloud platform recommendation depends on the customer\u2019s existing agreements: if they have Azure committed spend (MACC), recommend Azure AI Foundry. If they have AWS committed spend, recommend Bedrock. If multi-cloud, recommend the platform with the larger uncommitted balance. Never recommend based on technical preference \u2014 recommend based on what unblocks procurement fastest. Both platforms provide equivalent Claude model access.</p>
  <p><strong>What makes a capstone document excellent.</strong> Three qualities separate an excellent enterprise AI strategy from a mediocre one: (1) <strong>Specificity</strong> \u2014 name specific models (claude-sonnet-4-6 for production, claude-haiku-4-5-20251001 for high-volume/low-latency), specific benchmarks, specific compliance requirements. Vague strategies don\u2019t get funded. (2) <strong>Balance</strong> \u2014 acknowledge tradeoffs honestly. Don\u2019t oversell AI capabilities or understate risks. The board respects candor. (3) <strong>Actionability</strong> \u2014 every recommendation has a clear next step, timeline, and owner. A strategy that can\u2019t be executed is an essay, not a strategy.</p>`,
  tasks: [
    { title: 'Write the executive summary', description: 'Write a one-page executive summary for a board of directors. The scenario: a mid-size financial services company (5,000 employees) evaluating enterprise AI adoption using Claude. Cover: the AI opportunity in financial services, your strategic recommendation (which use cases to pursue first), expected business impact (specific metrics), investment required, and key risks. Write for a non-technical board audience. Save as /day-50/executive_summary.md.', time: '25 min' },
    { title: 'Prioritize use cases with regulatory risk', description: 'Identify 10 potential AI use cases for the financial services company. For each: one-sentence description, effort estimate (H/M/L), value estimate (H/M/L), and regulatory risk assessment (H/M/L with specific regulation cited). Create a three-axis prioritization ranking and recommend the top 3 use cases with justification. High-regulatory-risk use cases must cite the specific regulation (EU AI Act article, FTC guidance, CFPB rule). Save as /day-50/use_case_prioritization.md.', time: '25 min' },
    { title: 'Design the reference architecture', description: 'Create the reference architecture for Claude deployment at this financial services company. Specify: model access (Azure AI Foundry vs Bedrock based on a stated cloud preference), orchestration framework, MCP skills for financial data sources, evaluation pipeline, monitoring stack, and safety layer. Include model selection: claude-sonnet-4-6 for complex reasoning, claude-haiku-4-5-20251001 for high-volume tasks. Save as /day-50/reference_architecture.md.', time: '25 min' },
    { title: 'Complete the full strategy document', description: 'Assemble the complete 5-section enterprise AI strategy: executive summary, use case prioritization, architecture, compliance and safety framework (EU AI Act, sector-specific regulation), and implementation roadmap (three horizons). This is your Phase 3 capstone deliverable. It should be 3,000\u20135,000 words, specific enough to present to a CTO. Save as /day-50/enterprise_ai_strategy_final.md. Stage and commit all Phase 3 work to celebrate completing the course.', time: '30 min' }
  ],

  codeExample: {
    title: 'Enterprise AI Strategy Rubric Scorer — Python',
    lang: 'python',
    code: `# Day 50 — Enterprise AI Strategy Doc Rubric Scorer
# Scores a strategy doc across 8 dimensions (vision, market, tech, ops,
# safety, GTM, finance, talent). Pure stdlib. Hardcoded sample doc.

DIMENSIONS = [
    ("vision",  "North-star, 3-year horizon, measurable",          0.15),
    ("market",  "TAM, segments, named competitors, wedge",          0.10),
    ("tech",    "Reference architecture, model selection rationale", 0.15),
    ("ops",     "SLOs, on-call, eval pipeline, monitoring",          0.10),
    ("safety",  "EU AI Act mapping, red-team plan, abuse policy",    0.15),
    ("gtm",     "ICP, pricing, channel, design partners",            0.10),
    ("finance", "Unit economics, COGS by token, payback",            0.15),
    ("talent",  "Roles, hiring plan, org topology",                  0.10),
]

# Sample strategy doc — would be loaded from disk in real use.
SAMPLE_DOC = {
    "title": "Project Atlas — Enterprise AI for Mid-Market Banking",
    "sections": {
        "vision":  "Become the default AI copilot for relationship managers by 2027; success = 70% weekly active RMs.",
        "market":  "TAM 18B; segments: regional banks, credit unions; competitors: Hebbia, Glean; wedge: regulated deployment.",
        "tech":    "claude-sonnet-4-6 via Bedrock for reasoning; claude-haiku-4-5-20251001 for routing. MCP for core banking.",
        "ops":     "P95 latency 4s, eval suite in CI, on-call rotation, weekly health review.",
        "safety":  "EU AI Act high-risk; quarterly red-team; abuse policy v2; PII scrubber.",
        "gtm":     "ICP: 50–500 RM banks. Pricing: per-seat $80/mo. Channel: core banking partners. 4 design partners.",
        "finance": "COGS: $0.18 per RM-day; gross margin 78%; payback 11 months at $80 ACV/seat.",
        "talent":  "Hiring 1 AI Eng, 1 Safety PM, 1 DevRel. Pod topology: product+platform+safety.",
    },
}

# Heuristic signal lists per dimension. Each match = 1 evidence point.
SIGNALS = {
    "vision":  ["north-star", "default", "by 20", "%", "weekly"],
    "market":  ["tam", "segment", "competitor", "wedge", "icp"],
    "tech":    ["claude-sonnet-4-6", "claude-haiku", "bedrock", "azure", "mcp", "rag"],
    "ops":     ["p95", "latency", "eval", "on-call", "review", "monitoring"],
    "safety":  ["eu ai act", "red-team", "abuse", "pii", "guardrail"],
    "gtm":     ["icp", "pricing", "channel", "design partner", "$"],
    "finance": ["cogs", "margin", "payback", "$", "month"],
    "talent":  ["hiring", "role", "pod", "topology", "safety pm"],
}

def score_section(text, signals):
    """Return (hits, evidence) for a section."""
    t = text.lower()
    found = [s for s in signals if s in t]
    # Cap at 5 to keep dimensional scores comparable.
    return min(len(found), 5), found

def grade(pct):
    if pct >= 0.85: return "A"
    if pct >= 0.70: return "B"
    if pct >= 0.55: return "C"
    if pct >= 0.40: return "D"
    return "F"

def score_doc(doc):
    rows = []
    weighted_total = 0.0
    for key, desc, weight in DIMENSIONS:
        text = doc["sections"].get(key, "")
        hits, found = score_section(text, SIGNALS[key])
        # Normalize to 0..1 (5 hits = full credit).
        raw = hits / 5.0
        weighted_total += raw * weight
        rows.append({
            "dim": key, "desc": desc, "weight": weight,
            "hits": hits, "raw": raw, "found": found,
        })
    return rows, weighted_total

def render_report(doc, rows, total):
    print("=" * 64)
    print("ENTERPRISE AI STRATEGY RUBRIC")
    print("=" * 64)
    print("Doc: " + doc["title"])
    print("-" * 64)
    print("DIM       WEIGHT   RAW    WEIGHTED  GRADE  EVIDENCE")
    print("-" * 64)
    for r in rows:
        weighted = r["raw"] * r["weight"]
        print(
            f"{r['dim']:9} {r['weight']:.2f}    "
            f"{r['raw']:.2f}   {weighted:.3f}     {grade(r['raw'])}     "
            + ", ".join(r["found"][:3])
        )
    print("-" * 64)
    print(f"OVERALL SCORE: {total:.2f}  GRADE: {grade(total)}")

def gaps(rows, threshold=0.6):
    """Sections that need rework before exec review."""
    return [r["dim"] for r in rows if r["raw"] < threshold]

def main():
    rows, total = score_doc(SAMPLE_DOC)
    render_report(SAMPLE_DOC, rows, total)
    weak = gaps(rows)
    print()
    print("Sections needing rework (raw < 0.60):")
    if not weak:
        print("  (none — doc is exec-ready)")
    else:
        for w in weak:
            print(f"  - {w}")
    print()
    # PM checklist printed for the author to action.
    print("Next actions for the PM author:")
    print("  1. Add specific numbers wherever the rubric flagged thin evidence.")
    print("  2. Map every claim to a source: eval result, customer quote, or doc.")
    print("  3. Run the doc past Safety + Finance partners before exec review.")
    print("  4. Re-score; ship at overall >= 0.75.")

if __name__ == "__main__":
    main()
`,
  },

  interview: { question: 'Walk me through how you would develop an enterprise AI strategy.', answer: `I use a 5-section framework that balances ambition with pragmatism.<br><br><strong>Executive summary for the board:</strong> One page. The AI opportunity in our industry, the strategic recommendation, expected ROI, and key risks \u2014 honest about both upside and uncertainty. Written for non-technical executives who need to make a funding decision.<br><br><strong>Use case prioritization with regulatory risk:</strong> I identify 10+ potential use cases and evaluate each on three axes: effort, value, and regulatory risk. The third axis is what most strategies miss. A high-value, low-effort use case that falls under EU AI Act high-risk requirements needs 6+ months of compliance work. I prioritize low-regulatory-risk use cases for initial deployment to build organizational confidence, then tackle high-risk use cases after compliance infrastructure is established.<br><br><strong>Reference architecture:</strong> Model access through Azure AI Foundry or Bedrock (based on existing cloud agreements \u2014 this is a procurement decision, not a technical one). Orchestration layer using Semantic Kernel or native SDK. MCP servers for enterprise skill integration. Automated eval pipeline in CI/CD. Safety layer with system prompt guardrails, input validation, and monitoring. Model selection: claude-sonnet-4-6 for complex reasoning tasks, claude-haiku-4-5-20251001 for high-volume, latency-sensitive operations.<br><br><strong>Compliance framework:</strong> Map every use case to its regulatory requirements. EU AI Act risk classification, sector-specific regulation (for financial services: CFPB, SEC, anti-money laundering), and AI liability considerations. Build compliance into the architecture from day one \u2014 retrofitting is 5x more expensive.<br><br><strong>Three-horizon roadmap:</strong> H1 (0\u20143 months): deploy the top-priority low-risk use case, build eval pipeline, establish monitoring. H2 (3\u20149 months): expand to 2\u20133 additional use cases, build compliance infrastructure for high-risk use cases. H3 (9\u201418 months): tackle high-regulatory-risk use cases with full compliance architecture, scale to enterprise-wide deployment.<br><br>The strategy that gets funded is specific (named models, specific compliance requirements, concrete metrics), balanced (acknowledges risks alongside opportunities), and actionable (every recommendation has a next step, timeline, and owner).` },
  pmAngle: 'The enterprise AI strategy document is the highest-leverage artifact a senior AI PM produces. It synthesizes everything: technical architecture, use case prioritization, regulatory compliance, and business impact into a coherent plan that executives can fund and engineering can execute. The PM who produces a specific, balanced, actionable strategy \u2014 with regulatory risk as a first-class dimension \u2014 is the PM who gets promoted to lead the AI initiative.',
  resources: [
    { type: 'DOCS', title: 'Claude on Azure AI Foundry', url: 'https://docs.anthropic.com/en/docs/partner-platforms/azure', note: 'Azure deployment path for the reference architecture.' },
    { type: 'DOCS', title: 'Claude on AWS Bedrock', url: 'https://docs.anthropic.com/en/docs/partner-platforms/bedrock', note: 'Bedrock deployment path for the reference architecture.' },
    { type: 'DOCS', title: 'Anthropic Enterprise', url: 'https://www.anthropic.com/enterprise', note: 'Enterprise features, compliance, and deployment options.' },
    { type: 'DOCS', title: 'EU AI Act', url: 'https://artificialintelligenceact.eu/', note: 'Full regulatory requirements for the compliance section.' },
    { type: 'TOOL', title: 'Anthropic API Pricing', url: 'https://www.anthropic.com/pricing', note: 'Model pricing for ROI analysis in the strategy document.' },
    { type: 'BLOG', title: 'Anthropic: Building Effective Agents', url: 'https://www.anthropic.com/research/building-effective-agents', note: 'Agent architecture patterns for the reference architecture section.' }
  ]
};
