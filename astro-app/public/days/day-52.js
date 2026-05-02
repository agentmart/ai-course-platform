// Day 52 \u2014 OKRs for AI Products
// Updated: March 2026 | Review: agentic OKR examples, eval thresholds as hygiene metrics, baseline discovery, weekly AI health review

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[52] = {
  subtitle: 'Set goals that actually drive AI product quality \u2014 from eval hygiene to agentic success metrics.',
  context: `<p>OKRs for AI products are fundamentally different from traditional software OKRs because AI product quality is probabilistic, not deterministic. A traditional feature either works or it doesn\u2019t; an AI feature works 87% of the time. This changes how you set objectives, define key results, and measure progress. Today you learn the OKR framework that works for AI products in 2026, including the new agentic patterns that require entirely new metrics.</p>
  <p><strong>Eval thresholds are hygiene, not OKRs.</strong> This is the most important insight for AI product OKRs: <strong>treat eval thresholds as hygiene metrics (non-negotiable floors), and business outcomes as OKRs</strong>. Hygiene metrics are monitored but not optimized \u2014 they\u2019re the minimum bar. Example: \u201cClaude\u2019s response accuracy on our medical Q&A eval suite stays above 92%\u201d is hygiene. If it drops below 92%, everything stops until it\u2019s fixed. But the OKR is: \u201cIncrease physician adoption of the AI assistant from 30% to 60%.\u201d The hygiene metric enables the OKR but isn\u2019t the OKR. Teams that make eval scores their OKR optimize for benchmarks rather than user value.</p>
  <p><strong>Discover baseline before setting performance OKRs.</strong> This is the key insight most AI PMs miss: you cannot set meaningful performance OKRs without first establishing a reliable baseline. If you don\u2019t know your current task completion rate, you can\u2019t set a credible target. The first quarter for any new AI feature should include an explicit \u201cbaseline discovery\u201d objective: instrument the feature, collect data, establish current performance, and then set targets for the next quarter. Setting targets without baselines leads to either sandbagging (too easy) or demoralization (impossible). Template: Q1 OKR = \u201cEstablish reliable baseline metrics for [feature].\u201d Q2 OKR = \u201cImprove [metric] from [baseline] to [target].\u201d</p>
  <p><strong>Agentic OKR examples.</strong> Agentic AI products \u2014 where Claude performs multi-step tasks autonomously \u2014 need metrics that traditional AI OKRs don\u2019t cover. Key agentic metrics: (1) <strong>Task completion rate</strong> \u2014 what percentage of multi-step tasks does the agent complete successfully without human intervention? This is the north star. (2) <strong>Human override rate</strong> \u2014 how often does a human need to step in to correct or complete an agent\u2019s work? A decreasing override rate means the agent is becoming more trustworthy. (3) <strong>Multi-step success rate</strong> \u2014 for tasks requiring 5+ steps, what percentage succeed end-to-end? This is harder than single-step accuracy because errors compound. (4) <strong>Recovery rate</strong> \u2014 when the agent encounters an error, how often does it successfully recover without human help? (5) <strong>Cost per completed task</strong> \u2014 total API cost (tokens in + out) divided by successfully completed tasks. Optimization target: reduce cost per completed task while maintaining quality.</p>
  <p><strong>Weekly AI health review.</strong> Beyond quarterly OKRs, AI products need a weekly health review \u2014 a structured meeting where the team reviews key metrics. Agenda: (1) Eval suite results \u2014 any regressions? (2) User feedback themes \u2014 what are users complaining about? (3) Cost and latency trends \u2014 any anomalies? (4) Safety incidents \u2014 any prompt injection attempts or inappropriate outputs? (5) Model performance \u2014 if using claude-sonnet-4-6, any behavior changes after model updates? This meeting should be 30 minutes, data-driven, and result in a prioritized action list. The PM owns this meeting.</p>
  <p><strong>The OKR anti-pattern: optimizing for eval scores.</strong> When eval scores become the OKR, teams game them \u2014 cherry-picking eval examples, overfitting system prompts to the eval suite, ignoring user feedback that contradicts eval results. The fix: evals are hygiene metrics with a floor, and OKRs measure what users actually experience. \u201cUser satisfaction with AI responses\u201d is an OKR. \u201cEval accuracy above 90%\u201d is hygiene.</p>`,
  tasks: [
    { title: 'Write agentic OKRs for a quarter', description: 'You\u2019re the PM for an AI coding assistant built on claude-sonnet-4-6 that helps developers write and debug code. Write OKRs for Q3 2026. Include: one objective for task completion, one for user adoption, one for cost efficiency. Each objective has 3 key results. Separately, list the hygiene metrics (eval thresholds) that are non-negotiable floors but NOT OKRs. Save as /day-52/agentic_okrs.md.', time: '25 min' },
    { title: 'Baseline discovery plan', description: 'You\u2019re launching a new AI feature next quarter and need to establish baselines. Write a baseline discovery plan: what metrics to instrument, how to collect data, what sample sizes you need for statistical significance, how long the baseline period should be, and how you\u2019ll convert baselines into Q2 targets. Include specific metrics: task completion rate, human override rate, multi-step success rate, cost per completed task. Save as /day-52/baseline_plan.md.', time: '20 min' },
    { title: 'Design a weekly AI health review', description: 'Design the agenda, attendees, data sources, and action-item template for a weekly AI health review meeting. Include: eval suite dashboard design, user feedback aggregation method, cost/latency monitoring source, safety incident log, and a decision framework for when to escalate vs. when to add to backlog. Keep the meeting to 30 minutes. Save as /day-52/weekly_health_review.md.', time: '20 min' },
    { title: 'Critique bad AI OKRs', description: 'Here are three bad AI OKRs. Rewrite each to be effective. Bad OKR 1: \u201cImprove Claude accuracy to 95%.\u201d Bad OKR 2: \u201cReduce AI costs.\u201d Bad OKR 3: \u201cMake the AI agent work better.\u201d For each, explain why it\u2019s bad, rewrite it with specific key results, and identify what hygiene metric should accompany it. Save as /day-52/okr_critique.md.', time: '15 min' }
  ],

  codeExample: {
    title: 'AI Quality OKR → Eval Metric Mapper — Python',
    lang: 'python',
    code: `# Day 52 — AI Quality OKRs: Map OKRs to Eval Metrics
# Maps draft OKRs onto eval metrics with leading/lagging weights. Stdlib only.

# Catalog of eval metrics with type (leading vs lagging) and unit.
METRICS = {
    "eval_pass_rate":      {"type": "leading", "unit": "%",  "owner": "AI Eng"},
    "rubric_score_p50":    {"type": "leading", "unit": "pts","owner": "AI PM"},
    "red_team_block_rate": {"type": "leading", "unit": "%",  "owner": "Safety"},
    "tool_call_success":   {"type": "leading", "unit": "%",  "owner": "AI Eng"},
    "p95_latency":         {"type": "leading", "unit": "ms", "owner": "Platform"},
    "csat":                {"type": "lagging", "unit": "pts","owner": "AI PM"},
    "weekly_active_users": {"type": "lagging", "unit": "n",  "owner": "Growth"},
    "task_completion":     {"type": "lagging", "unit": "%",  "owner": "AI PM"},
    "cogs_per_session":    {"type": "lagging", "unit": "$",  "owner": "Finance"},
    "thumbs_up_rate":      {"type": "lagging", "unit": "%",  "owner": "AI PM"},
}

# Draft OKRs the team is considering for the quarter.
OKRS = [
    {
        "id": "O1",
        "objective": "Make the agent reliably finish multi-step workflows.",
        "key_results": [
            {"kr": "task_completion >= 75%",      "metric": "task_completion",    "leading_metrics": ["eval_pass_rate", "tool_call_success"]},
            {"kr": "tool_call_success >= 92%",    "metric": "tool_call_success",  "leading_metrics": []},
            {"kr": "rubric_score_p50 >= 4.2",     "metric": "rubric_score_p50",   "leading_metrics": []},
        ],
    },
    {
        "id": "O2",
        "objective": "Earn trust with regulated customers.",
        "key_results": [
            {"kr": "red_team_block_rate >= 95%",  "metric": "red_team_block_rate","leading_metrics": []},
            {"kr": "csat >= 4.4 in regulated segment", "metric": "csat",          "leading_metrics": ["rubric_score_p50", "red_team_block_rate"]},
        ],
    },
    {
        "id": "O3",
        "objective": "Run profitable inference at scale.",
        "key_results": [
            {"kr": "cogs_per_session <= $0.18",   "metric": "cogs_per_session",   "leading_metrics": ["p95_latency"]},
            {"kr": "p95_latency <= 4500ms",       "metric": "p95_latency",        "leading_metrics": []},
        ],
    },
]

# Weights: leading indicators are watched weekly; lagging quarterly.
WEIGHT_LEADING = 0.6
WEIGHT_LAGGING = 0.4

def classify_kr(kr):
    """Return ('leading'|'lagging', metric)."""
    m = kr["metric"]
    return METRICS[m]["type"], m

def kr_health(kr, observed):
    """Crude health score: 1.0 if any leading indicator improved."""
    leading = kr.get("leading_metrics", [])
    if not leading:
        return None
    improved = sum(1 for m in leading if observed.get(m, 0) > 0)
    return improved / len(leading)

# Hypothetical week-over-week deltas (positive = improving direction).
OBSERVED_DELTAS = {
    "eval_pass_rate":      +0.03,
    "tool_call_success":   +0.01,
    "rubric_score_p50":    +0.10,
    "red_team_block_rate": -0.02,
    "p95_latency":         +0.05,
}

def render_okr(o):
    print(f"[{o['id']}] {o['objective']}")
    for kr in o["key_results"]:
        kind, metric = classify_kr(kr)
        unit = METRICS[metric]["unit"]
        owner = METRICS[metric]["owner"]
        marker = "LEAD" if kind == "leading" else "LAG "
        print(f"  {marker} {kr['kr']:38} ({unit}, owner: {owner})")
        h = kr_health(kr, OBSERVED_DELTAS)
        if h is not None:
            print(f"       leading-indicator health: {h:.0%}")

def coverage_audit():
    """Every OKR must have at least one leading indicator behind it."""
    bad = []
    for o in OKRS:
        for kr in o["key_results"]:
            kind, _ = classify_kr(kr)
            if kind == "lagging" and not kr.get("leading_metrics"):
                bad.append((o["id"], kr["kr"]))
    return bad

def weighted_focus():
    """How much of the OKR set is leading vs lagging."""
    leading = lagging = 0
    for o in OKRS:
        for kr in o["key_results"]:
            kind, _ = classify_kr(kr)
            if kind == "leading":
                leading += 1
            else:
                lagging += 1
    total = leading + lagging
    return leading / total, lagging / total

def main():
    print("AI QUALITY OKR MAPPER")
    print("=" * 56)
    for o in OKRS:
        render_okr(o)
        print()
    bad = coverage_audit()
    print("Lagging KRs missing leading indicators:")
    if not bad:
        print("  (none — every lagging KR has a leading proxy)")
    for o_id, kr in bad:
        print(f"  - {o_id}: {kr}")
    print()
    lead, lag = weighted_focus()
    print(f"OKR focus mix: {lead:.0%} leading, {lag:.0%} lagging")
    print(f"Weights for weekly review: leading={WEIGHT_LEADING}, lagging={WEIGHT_LAGGING}")
    print()
    print("Rule: if the leading-indicator health stays >= 60% for 4 weeks,")
    print("the lagging KR will move. If not, the OKR is mis-specified.")

if __name__ == "__main__":
    main()
`,
  },

  interview: { question: 'How do you set OKRs for AI products when performance is probabilistic?', answer: `The key insight is separating hygiene metrics from OKRs \u2014 and always establishing baselines before setting targets.<br><br><strong>Hygiene metrics are floors, not goals:</strong> Eval thresholds are non-negotiable minimums. If our medical Q&A eval drops below 92% accuracy, everything stops. But that\u2019s not the OKR. The OKR is the business outcome: physician adoption, task completion, user satisfaction. Teams that make eval scores their OKR end up gaming benchmarks instead of delivering user value.<br><br><strong>Baseline first, targets second:</strong> You cannot set credible performance targets without baselines. My first quarter with any new AI feature includes an explicit baseline discovery objective: instrument, collect data, establish current performance. Then Q2 targets are grounded in reality, not aspiration.<br><br><strong>Agentic metrics are different:</strong> For products where Claude performs multi-step tasks autonomously, I track: task completion rate (north star), human override rate (trust indicator), multi-step success rate (error compounding), recovery rate (resilience), and cost per completed task (efficiency). These don\u2019t exist in traditional software OKRs.<br><br><strong>Weekly health review:</strong> Quarterly OKRs aren\u2019t enough for AI products because quality can shift with model updates. I run a weekly 30-minute health review: eval results, user feedback themes, cost/latency trends, safety incidents, and model behavior changes. This catches regressions before they become quarter-defining problems.` },
  pmAngle: 'The PM who separates hygiene metrics from OKRs, insists on baseline discovery before target-setting, and runs a disciplined weekly health review is the PM whose AI product actually improves quarter over quarter. Everyone else is either chasing benchmarks or flying blind.',
  resources: [
    { type: 'DOCS', title: 'Anthropic: Evaluating AI Models', url: 'https://docs.anthropic.com/en/docs/test-and-evaluate/eval-design', note: 'How to design evals that inform your hygiene metrics.' },
    { type: 'BLOG', title: 'Anthropic: Building Effective Agents', url: 'https://www.anthropic.com/research/building-effective-agents', note: 'Agent architecture patterns that determine which metrics to track.' },
    { type: 'DOCS', title: 'Claude API Usage Dashboard', url: 'https://console.anthropic.com/', note: 'Where you monitor cost and usage metrics for your health review.' },
    { type: 'DOCS', title: 'Anthropic API Pricing', url: 'https://www.anthropic.com/pricing', note: 'Model pricing for cost-per-task calculations.' }
  ]
};
