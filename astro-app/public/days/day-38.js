// Day 38 — Go-to-Market for AI
// Updated: March 2026 | Review: developer launch channels, red-teaming as launch gate, launch metrics

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[38] = {
  subtitle: 'Launch strategies for AI products \u2014 from developer beta to enterprise GA.',
  context: `<p>AI product launches follow a distinct pattern compared to traditional software. The phased approach \u2014 <strong>alpha (internal), beta (trusted users), limited availability (waitlist), general availability</strong> \u2014 exists because AI products have failure modes that only surface at scale with diverse users. Skipping phases doesn\u2019t save time; it creates public incidents. Every major AI product failure in 2024\u20132025 can be traced to insufficient phased testing before wide release.</p>
  <p><strong>Developer launch channels have evolved.</strong> The most effective channels for reaching AI-savvy developers and early adopters in 2026: the <a href="https://github.com/anthropics/anthropic-cookbook" target="_blank">Anthropic Cookbook</a> on GitHub (publish integration examples), <a href="https://www.latent.space/" target="_blank">Latent Space</a> newsletter and podcast (sponsor or contribute guest posts), X/Twitter AI community (direct engagement with AI builders and researchers), Hacker News (launch posts with substantive technical content), and Discord/Slack communities for specific AI frameworks (LangChain, LlamaIndex, Vercel AI SDK). The key: lead with technical substance, not marketing. Developer audiences filter aggressively.</p>
  <p><strong>Red-teaming is now a required launch gate, not an optional nice-to-have.</strong> Before any AI product reaches general availability, it should survive structured adversarial testing. Red-teaming scope: (1) Prompt injection attempts (can users override system instructions?), (2) Edge cases specific to your domain (for a legal AI: contradictory clauses, ambiguous jurisdiction), (3) Harmful output generation (can the product be coerced into producing unsafe content?), (4) Privacy leakage (does the model reveal information from other users\u2019 sessions?), (5) Bias testing across demographic groups. Document red-teaming results and mitigation steps as part of your launch review documentation.</p>
  <p><strong>Define success before launch.</strong> The most common GTM mistake for AI products: launching without predefined success metrics and timelines. Before launch, document: (1) Primary launch metric and 30/60/90-day targets (e.g., daily active users, activation rate, retention). (2) Quality metrics and acceptable thresholds (hallucination rate below X%, user satisfaction above Y). (3) Cost guardrails (maximum acceptable model cost per user per month). (4) Kill criteria \u2014 what results would cause you to roll back or pivot? Having these defined before launch prevents post-launch rationalization and goalpost-moving.</p>
  <p><strong>Enterprise GTM for AI</strong> adds complexity: security review (2\u20146 months), procurement cycles, pilot-to-production expansion, and champion enablement. The fastest path to enterprise revenue: identify one champion, win one use case in a pilot, measure business impact obsessively, then use that data to expand. Enterprise AI sales cycles are typically 6\u201412 months; plan accordingly.</p>`,
  tasks: [
    { title: 'Create a phased launch plan', description: 'For an AI product of your choice, design a complete phased launch plan. Phase 1: Internal alpha (who tests, what they test, success criteria to advance). Phase 2: Closed beta (selection criteria for beta users, feedback mechanisms). Phase 3: Limited availability (waitlist strategy, scaling plan). Phase 4: GA (launch channels, marketing, success metrics). Include timelines and the team the PM needs. Save as /day-38/phased_launch_plan.md.', time: '25 min' },
    { title: 'Design a red-teaming protocol', description: 'Create a red-teaming checklist for an AI customer support product. Cover all five categories: prompt injection, domain-specific edge cases, harmful output, privacy leakage, and bias. For each category: 5 specific test cases, expected behavior, pass/fail criteria, and remediation if failed. This is your launch gate document. Save as /day-38/red_team_protocol.md.', time: '25 min' },
    { title: 'Define launch success metrics', description: 'For your AI product launch: define the complete metrics framework. Primary metric with 30/60/90-day targets. Three secondary metrics. Two quality guardrail metrics with thresholds. Cost ceiling per user. Kill criteria (what results mean you pivot or roll back). Present as a one-page launch scorecard. Save as /day-38/launch_success_metrics.md.', time: '15 min' },
    { title: 'Developer launch channel strategy', description: 'Plan the developer awareness campaign for your AI product launch. For each channel (Anthropic Cookbook, Latent Space, X/Twitter, Hacker News, framework Discords): what content to create, when to post relative to launch, expected reach, and how to measure effectiveness. Budget: $5,000 for the entire developer launch. Save as /day-38/developer_launch_channels.md.', time: '15 min' }
  ],

  codeExample: {
    title: 'AI launch readiness scorecard — Python',
    lang: 'python',
    code: `# Day 38 — AI launch readiness scorecard (beta -> GA gates)
# Pedagogical goal: define success metrics AND kill criteria BEFORE launch.
# Red-teaming is a non-negotiable gate, not a checkbox.

from dataclasses import dataclass, field
from typing import Dict, List, Tuple


@dataclass
class Gate:
    key: str
    label: str
    min_value: float          # threshold to pass
    actual: float             # current measured value
    higher_is_better: bool = True
    severity: str = "BLOCK"   # BLOCK | WARN
    evidence: str = ""


@dataclass
class Phase:
    name: str
    gates: List[Gate] = field(default_factory=list)


# Phased launch: dev preview -> closed beta -> open beta -> GA.
PHASES: List[Phase] = [
    Phase("Dev Preview", [
        Gate("eval_pass_rate",       "Eval harness pass rate",     0.85, 0.91, True,  "BLOCK"),
        Gate("p95_latency_ms",       "p95 latency (ms)",          1500,  980, False, "BLOCK"),
        Gate("error_rate",           "Error rate",                0.02, 0.008, False, "BLOCK"),
        Gate("docs_complete",        "Docs + quickstart written", 1.0,  1.0,  True,  "BLOCK"),
    ]),
    Phase("Closed Beta", [
        Gate("acceptance_rate",      "User acceptance rate",      0.30, 0.42, True,  "BLOCK"),
        Gate("hallucination_rate",   "Hallucination rate",        0.02, 0.011, False, "BLOCK"),
        Gate("cost_per_accepted",    "Cost per accepted ($)",     0.50, 0.07, False, "BLOCK"),
        Gate("nps",                  "Beta NPS",                  20,   34,    True,  "WARN"),
    ]),
    Phase("Open Beta", [
        Gate("dau_wau_ratio",        "DAU/WAU stickiness",        0.30, 0.36, True,  "WARN"),
        Gate("retention_w4",         "Week-4 retention",          0.40, 0.47, True,  "BLOCK"),
        Gate("p95_latency_ms",       "p95 latency under load",    1500, 1280, False, "BLOCK"),
        Gate("incident_count_30d",   "SEV1+SEV2 incidents/30d",   2,    1,     False, "WARN"),
    ]),
    Phase("GA", [
        Gate("red_team_pass",        "Red-team protocol passed",  1.0,  1.0,  True,  "BLOCK"),
        Gate("compliance_attest",    "SOC 2 + DPA attestations",  1.0,  1.0,  True,  "BLOCK"),
        Gate("kill_switch",          "Kill switch + rollback drilled", 1.0, 1.0, True, "BLOCK"),
        Gate("on_call_rota",         "24x7 on-call rotation",     1.0,  1.0,  True,  "BLOCK"),
        Gate("kill_criteria_signed", "Kill criteria signed by exec", 1.0, 1.0, True, "BLOCK"),
    ]),
]


def passes(g: Gate) -> bool:
    return g.actual >= g.min_value if g.higher_is_better else g.actual <= g.min_value


def score_phase(p: Phase) -> Tuple[int, int, List[Gate]]:
    failing = [g for g in p.gates if not passes(g)]
    blocking = [g for g in failing if g.severity == "BLOCK"]
    return len(p.gates) - len(failing), len(p.gates), blocking


# Pre-defined success metrics + kill criteria for the launch.
LAUNCH_TARGETS = {
    "wow_metric":           "Acceptance rate >= 30% by week 4 of open beta",
    "north_star":           "Cost per accepted < $0.50",
    "guardrail_quality":    "Hallucination rate < 2.0%",
    "guardrail_safety":     "Zero SEV1 caused by model output in first 30d",
}

KILL_CRITERIA = {
    "hallucination_spike":  "Hallucination rate > 4% on any 24h window",
    "safety_incident":      "Any SEV1 caused by model output that bypasses HITL",
    "economic_runaway":     "Cost per accepted > $1.50 sustained over 7 days",
    "user_rejection":       "Acceptance rate < 15% in any cohort for 14 days",
}


# Red-team protocol: minimum probe categories before GA.
RED_TEAM_PROBES = [
    "prompt injection (direct + indirect)",
    "jailbreak via roleplay",
    "PII extraction attempts",
    "policy bypass on restricted topics",
    "tool misuse / unauthorized actions",
    "data exfiltration via long context",
]


print("=== Phased launch scorecard ===")
overall_block = False
for p in PHASES:
    pass_count, total, blocking = score_phase(p)
    status = "READY" if not blocking else "BLOCKED"
    print(f"\\n  [{status}] {p.name}: {pass_count}/{total} gates pass")
    for g in p.gates:
        ok = passes(g)
        mark = "PASS" if ok else ("BLOCK" if g.severity == "BLOCK" else "WARN")
        cmp = ">=" if g.higher_is_better else "<="
        print(f"    {mark:<5}  {g.label:<32}  actual={g.actual}  {cmp} {g.min_value}")
    if blocking:
        overall_block = True


print("\\n=== Pre-launch success metrics (sign these BEFORE launch) ===")
for k, v in LAUNCH_TARGETS.items():
    print(f"  - {k:<22}  {v}")


print("\\n=== Kill criteria (auto-rollback triggers) ===")
for k, v in KILL_CRITERIA.items():
    print(f"  ! {k:<22}  {v}")


print("\\n=== Red-team probe checklist (must run before GA) ===")
for i, probe in enumerate(RED_TEAM_PROBES, start=1):
    print(f"  {i}. {probe}")


print("\\n=== Final recommendation ===")
print("  GO for GA" if not overall_block else "  HOLD: at least one BLOCK gate failing")
print("  (Re-run scorecard weekly; gate state changes flip launch decision.)")


print("\\nPM takeaway: write success metrics AND kill criteria into the")
print("launch doc. The launch you can roll back is the launch you can ship.")
`,
  },

  interview: { question: 'Walk me through how you would launch an AI product from beta to GA.', answer: `I\u2019d run a four-phase launch with explicit gates between each phase.<br><br><strong>Phase 1 \u2014 Internal alpha (2\u20144 weeks):</strong> Internal team uses the product daily on real tasks. Purpose: catch obvious quality issues, stress-test the system prompt, and establish baseline metrics. Gate to advance: hallucination rate below threshold, no critical safety issues, team consensus that quality is beta-ready.<br><br><strong>Phase 2 \u2014 Closed beta (4\u20148 weeks):</strong> 50\u2013200 hand-selected users representing our target segments. High-touch: weekly feedback calls, detailed usage analytics, rapid iteration. I\u2019d specifically recruit power users AND skeptics \u2014 skeptics find the failure modes enthusiasts forgive. Gate: retention above 40% weekly active, NPS above 30, no safety incidents.<br><br><strong>Red-teaming gate (1\u20142 weeks between beta and LA):</strong> Structured adversarial testing. Prompt injection, domain edge cases, bias testing, privacy leakage. This is non-negotiable. Document every finding and mitigation. Sign-off from security and legal before proceeding.<br><br><strong>Phase 3 \u2014 Limited availability (4\u20148 weeks):</strong> Waitlist-controlled expansion to 1,000\u201310,000 users. Purpose: validate at scale. Monitor cost-per-user, quality metrics at higher volume, and support load. Gate: unit economics work, quality holds at scale, support is manageable.<br><br><strong>Phase 4 \u2014 GA:</strong> Full launch. Developer channels first (Anthropic Cookbook, Hacker News, Latent Space), then broader marketing. Success metrics predefined: DAU target at 30/60/90 days, quality guardrails, cost ceiling. If any kill criteria trigger within 30 days, we have a documented rollback plan.<br><br>The common mistake: rushing from beta directly to GA without the red-teaming gate. Every major AI product embarrassment in the last two years resulted from skipping structured adversarial testing.` },
  pmAngle: 'The AI PM who defines launch success metrics before launch \u2014 including kill criteria \u2014 earns credibility that survives a rough launch. The PM who launches without predefined success metrics spends the first month arguing about whether the launch went well instead of improving the product. Red-teaming as a required gate is the other non-negotiable: no AI product should reach GA without surviving structured adversarial testing.',
  resources: [
    { type: 'GITHUB', title: 'Anthropic Cookbook', url: 'https://github.com/anthropics/anthropic-cookbook', note: 'Publish integration examples here as a developer launch channel.' },
    { type: 'BLOG', title: 'Latent Space', url: 'https://www.latent.space/', note: 'Top AI newsletter. Sponsor or contribute for developer reach.' },
    { type: 'DOCS', title: 'Anthropic: Testing and Evaluation', url: 'https://docs.anthropic.com/en/docs/test-and-evaluate', note: 'Testing and evaluation methodology for AI products.' },
    { type: 'BLOG', title: 'Lenny\u2019s Newsletter: AI Launches', url: 'https://www.lennysnewsletter.com/', note: 'Case studies of successful AI product launches.' },
    { type: 'BLOG', title: 'First Round Review: GTM for AI', url: 'https://review.firstround.com/', note: 'Tactical go-to-market advice for AI startups.' }
  ]
};
