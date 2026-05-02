// Day 55 \u2014 DX Audit Capstone
// Updated: March 2026 | Review: 2026 audit dimensions, Anthropic Cookbook audit, competitive DX benchmark, agentic use case coverage

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[55] = {
  subtitle: 'Conduct a comprehensive DX audit \u2014 the artifact that proves you think like a platform PM.',
  context: `<p>The DX Audit is one of the highest-signal portfolio pieces an AI PM can produce. It demonstrates that you can evaluate a developer product holistically, identify gaps, and prioritize improvements with business justification. Today you conduct a full DX audit using a 2026-updated framework that covers dimensions most auditors miss.</p>
  <p><strong>2026 DX audit dimensions.</strong> A comprehensive DX audit for an AI API evaluates eight dimensions: (1) <strong>Onboarding \u2014 TTFSC</strong>: time from zero to first successful API call. Target: under 5 minutes. (2) <strong>Interactive examples</strong>: does the platform offer a browser-based playground where developers can test API calls without writing code? In 2026, this is table stakes. Anthropic\u2019s Workbench, OpenAI\u2019s Playground, and Google\u2019s AI Studio all provide this. (3) <strong>AI-powered search</strong>: can developers ask natural language questions about the documentation and get accurate answers? This is an emerging differentiator. (4) <strong>Community</strong>: is there an active developer community (Discord, forum, GitHub Discussions) where developers help each other? Community reduces support burden and surfaces documentation gaps. (5) <strong>Streaming support</strong>: does the SDK make streaming responses easy? For real-time AI applications, streaming DX is critical. (6) <strong>Agentic use cases</strong>: does the documentation cover multi-step tool use, function calling, MCP integration, and agent workflow patterns? In 2026, agentic is the growth use case. (7) <strong>Error experience</strong>: are error messages helpful, structured, and actionable? (8) <strong>Migration guides</strong>: when models or APIs change, are there clear migration paths?</p>
  <p><strong>Auditing the Anthropic Cookbook.</strong> The Cookbook deserves its own audit subsection because it\u2019s the bridge between documentation and production code. Audit criteria: (1) <strong>Recipe coverage</strong> \u2014 do recipes exist for the top 10 use cases developers ask about? (2) <strong>Code quality</strong> \u2014 is the code production-ready or demo-quality? (3) <strong>Freshness</strong> \u2014 do recipes use current API versions and model names (claude-sonnet-4-6, not deprecated model strings)? (4) <strong>Runability</strong> \u2014 can you clone the repo and run a recipe in under 2 minutes? (5) <strong>Progressive complexity</strong> \u2014 do recipes range from simple single-turn to complex agentic workflows?</p>
  <p><strong>Competitive DX benchmarking.</strong> A DX audit gains 10x more value when benchmarked against competitors. Audit the same eight dimensions across Anthropic, OpenAI, and Google. Create a comparison matrix. Identify where each platform leads and trails. The most valuable finding is a gap where <em>all</em> platforms are weak \u2014 that\u2019s an opportunity for differentiation. Common 2026 gaps: agentic documentation (everyone is behind), error message quality (inconsistent across providers), and migration guides (often an afterthought).</p>
  <p><strong>From audit to roadmap.</strong> The audit is only valuable if it produces a prioritized roadmap. For each finding: severity (critical/high/medium/low), effort estimate, expected impact on developer adoption, and recommended quarter. The roadmap should produce a \u201cquick wins\u201d list (high impact, low effort) for the first sprint and a longer-term plan for structural improvements. Every recommendation should be tied to a metric: \u201cImprove TTFSC from 8 minutes to under 5\u201d is actionable. \u201cImprove documentation\u201d is not.</p>`,
  tasks: [
    { title: 'Conduct the 8-dimension DX audit', description: 'Audit the Anthropic Claude API developer experience across all eight dimensions: TTFSC, interactive examples (Workbench), AI-powered search, community, streaming support, agentic use cases, error experience, and migration guides. For each dimension: rate it (1\u20135), provide specific evidence, and list one specific improvement. Save as /day-55/dx_audit_full.md.', time: '30 min' },
    { title: 'Audit the Anthropic Cookbook', description: 'Audit the Anthropic Cookbook (github.com/anthropics/anthropic-cookbook) on five criteria: recipe coverage (top 10 use cases represented?), code quality (production-ready?), freshness (current model names?), runability (clone-and-run in 2 minutes?), and progressive complexity (simple to agentic?). Rate each criterion and provide specific examples. Identify three missing recipes that developers need. Save as /day-55/cookbook_audit.md.', time: '20 min' },
    { title: 'Competitive DX benchmark', description: 'Benchmark Anthropic Claude, OpenAI GPT, and Google Gemini across the eight DX dimensions. Create a comparison matrix with ratings and notes. Identify: where Anthropic leads, where Anthropic trails, and where all three are weak (the differentiation opportunities). Be specific \u2014 \u201cAnthropic\u2019s streaming SDK is cleaner\u201d with examples, not vague claims. Save as /day-55/competitive_dx_benchmark.md.', time: '25 min' },
    { title: 'Build the DX improvement roadmap', description: 'Based on your audit and benchmark, create a prioritized DX improvement roadmap. For each finding: severity, effort, impact, and recommended quarter. Identify 3 quick wins (high impact, low effort) for Sprint 1. Every recommendation must be tied to a measurable metric. Present the roadmap as a table: Finding | Severity | Effort | Impact | Metric | Quarter. Save as /day-55/dx_improvement_roadmap.md.', time: '15 min' }
  ],

  codeExample: {
    title: 'Comprehensive DX Audit Report Generator — Python',
    lang: 'python',
    code: `# Day 55 — Comprehensive DX Audit Report Generator
# Grades a developer API across 12 dimensions and produces a printable
# audit artifact. Pure stdlib. Hardcoded sample data for one product.

DIMENSIONS = [
    ("auth_setup",         "Time-to-key, env setup, scoping",         0.08),
    ("first_call",         "TTFC under 5 minutes",                    0.10),
    ("error_design",       "Codes, fix hints, request IDs",           0.10),
    ("docs_information",   "Quickstart + concept + reference",        0.10),
    ("docs_use_cases",     "Use-case guides (RAG, agents, evals)",    0.08),
    ("samples",            "Cookbook breadth + runnable recipes",     0.10),
    ("sdk_quality",        "SDK ergonomics, retries, streaming",      0.08),
    ("observability",      "Logs, request IDs, dashboards",           0.06),
    ("evaluation",         "Eval harness + golden datasets",          0.08),
    ("safety",             "Policy, abuse, red-team docs",            0.06),
    ("pricing_clarity",    "Per-token, per-tool, predictable",        0.08),
    ("changelog",          "Versioning + deprecation policy",         0.08),
]# Audit observations (0..1) for the product under review.
PRODUCT = {
    "name": "Atlas API v1",
    "competitor": "Anthropic API",
    "scores": {
        "auth_setup":       0.80,
        "first_call":       0.55,
        "error_design":     0.60,
        "docs_information": 0.75,
        "docs_use_cases":   0.50,
        "samples":          0.65,
        "sdk_quality":      0.70,
        "observability":    0.45,
        "evaluation":       0.40,
        "safety":           0.55,
        "pricing_clarity":  0.85,
        "changelog":        0.60,
    },
    "competitor_scores": {
        "auth_setup": 0.90, "first_call": 0.85, "error_design": 0.85,
        "docs_information": 0.85, "docs_use_cases": 0.80, "samples": 0.85,
        "sdk_quality": 0.80, "observability": 0.65, "evaluation": 0.75,
        "safety": 0.75, "pricing_clarity": 0.80, "changelog": 0.85,
    },
}

def grade(pct):
    if pct >= 0.85: return "A"
    if pct >= 0.70: return "B"
    if pct >= 0.55: return "C"
    if pct >= 0.40: return "D"
    return "F"

def weighted_total(scores):
    total = 0.0
    for key, _, w in DIMENSIONS:
        total += scores.get(key, 0) * w
    return total

def gap_vs_competitor(product):
    rows = []
    for key, _, w in DIMENSIONS:
        ours = product["scores"].get(key, 0)
        theirs = product["competitor_scores"].get(key, 0)
        rows.append((key, ours, theirs, theirs - ours))
    return rows

def prioritize(rows, weight_lookup):
    """Largest weighted gap first."""
    scored = []
    for key, ours, theirs, gap in rows:
        w = weight_lookup[key]
        scored.append((key, ours, theirs, gap, gap * w))
    scored.sort(key=lambda r: -r[4])
    return scored

def print_header(product):
    print("=" * 70)
    print("DX AUDIT — " + product["name"])
    print("=" * 70)

def print_dim_table(product):
    print(f"{'DIMENSION':22} {'WEIGHT':>7} {'SCORE':>7} GRADE  NOTES")
    print("-" * 70)
    for key, label, w in DIMENSIONS:
        s = product["scores"].get(key, 0)
        print(f"{key:22} {w:7.2f} {s:7.2f}  {grade(s)}     {label}")

def print_competitor_gap(product):
    print()
    print("COMPETITIVE GAP ANALYSIS (vs " + product["competitor"] + ")")
    print("-" * 70)
    rows = gap_vs_competitor(product)
    print(f"{'DIM':22} {'OURS':>6} {'THEM':>6} {'GAP':>6}")
    for key, ours, theirs, gap in rows:
        marker = "<<" if gap > 0.1 else "  "
        print(f"{key:22} {ours:6.2f} {theirs:6.2f} {gap:+6.2f} {marker}")

def print_priority_list(product):
    weight_lookup = {k: w for k, _, w in DIMENSIONS}
    rows = gap_vs_competitor(product)
    ranked = prioritize(rows, weight_lookup)
    print()
    print("PRIORITIZED ROADMAP (largest weighted gap first)")
    print("-" * 70)
    for i, (key, ours, theirs, gap, weighted_gap) in enumerate(ranked[:6], 1):
        print(f"  {i}. {key:22} weighted-gap={weighted_gap:+.3f} "
              f"(ours={ours:.2f} vs theirs={theirs:.2f})")

def print_summary(product):
    total = weighted_total(product["scores"])
    competitor_total = weighted_total(product["competitor_scores"])
    print()
    print(f"OVERALL  ours: {total:.2f}  ({grade(total)})")
    print(f"OVERALL  them: {competitor_total:.2f}  ({grade(competitor_total)})")
    print(f"DELTA: {competitor_total - total:+.2f}")
    return total

def main():
    print_header(PRODUCT)
    print_dim_table(PRODUCT)
    print_competitor_gap(PRODUCT)
    print_priority_list(PRODUCT)
    total = print_summary(PRODUCT)
    print()
    if total >= 0.75:
        print("Recommendation: Maintain. Quarterly re-audit. Invest top 2 gaps.")
    else:
        print("Recommendation: Stop new features for 1 sprint. Close top 3 weighted gaps.")

if __name__ == "__main__":
    main()
`,
  },

  interview: { question: 'Walk me through how you would audit the developer experience of an AI API.', answer: `I use an eight-dimension framework that captures the full developer journey, then benchmark against competitors to prioritize improvements.<br><br><strong>The eight dimensions:</strong> TTFSC (time to first successful call \u2014 target under 5 minutes), interactive examples (browser-based playground), AI-powered search (natural language documentation queries), community (active developer forums), streaming support (SDK quality for real-time apps), agentic use cases (tool use, MCP, agent patterns \u2014 the growth use case in 2026), error experience (structured, actionable error messages), and migration guides (clear paths when APIs change).<br><br><strong>Cookbook audit:</strong> I give special attention to the code cookbook because it bridges documentation and production. I evaluate recipe coverage, code quality, freshness (using current model names like claude-sonnet-4-6), runability, and progressive complexity from simple to agentic.<br><br><strong>Competitive benchmarking:</strong> The audit gains 10x value when compared to competitors. I rate the same eight dimensions across Claude, GPT, and Gemini. The most valuable finding is where all platforms are weak \u2014 in 2026, that\u2019s often agentic documentation and error message quality.<br><br><strong>From audit to roadmap:</strong> Every finding gets severity, effort, impact, and a metric. \u201cImprove TTFSC from 8 to under 5 minutes\u201d is actionable. \u201cImprove documentation\u201d is not. I identify quick wins for Sprint 1 and structural improvements for the quarter. The roadmap is the deliverable that actually changes things.` },
  pmAngle: 'The DX audit is one of the highest-signal interview artifacts because it demonstrates platform thinking: the ability to evaluate a developer product holistically, benchmark against competitors, and translate findings into a prioritized roadmap with measurable outcomes. Every AI PM should be able to produce one.',
  resources: [
    { type: 'TOOL', title: 'Anthropic Cookbook', url: 'https://github.com/anthropics/anthropic-cookbook', note: 'The primary audit target for the Cookbook evaluation.' },
    { type: 'DOCS', title: 'Anthropic API Documentation', url: 'https://docs.anthropic.com/', note: 'Primary DX audit subject.' },
    { type: 'TOOL', title: 'Anthropic Workbench', url: 'https://console.anthropic.com/workbench', note: 'Interactive playground for testing API calls in the browser.' },
    { type: 'DOCS', title: 'OpenAI API Documentation', url: 'https://platform.openai.com/docs', note: 'Competitive benchmark: OpenAI DX.' },
    { type: 'DOCS', title: 'Google Gemini API Documentation', url: 'https://ai.google.dev/gemini-api/docs', note: 'Competitive benchmark: Google Gemini DX.' }
  ]
};
