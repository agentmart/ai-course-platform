// Day 31 — AI Metrics & KPIs
// Updated: March 2026 | Review: TTFT/TTLT distinction, acceptance rate, hallucination measurement, AI A/B testing

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[31] = {
  subtitle: 'The metrics that matter for AI products \u2014 beyond accuracy, into business outcomes.',
  context: `<p>AI product metrics are fundamentally different from traditional software metrics. <strong>Accuracy</strong> is necessary but insufficient \u2014 you need to measure latency, cost, user trust, and business impact simultaneously. The biggest mistake new AI PMs make: optimizing for proxy metrics (benchmark scores, BLEU/ROUGE) instead of the metric that actually matters to the business (revenue impact, support ticket deflection, user retention).</p>
  <p><strong>Latency has two distinct measurements in AI.</strong> <strong>TTFT (Time to First Token)</strong> measures how quickly the model starts responding \u2014 critical for perceived responsiveness in streaming UIs. <strong>TTLT (Time to Last Token)</strong> measures total generation time \u2014 critical for batch processing and agent workflows where you need the complete response before acting. A streaming UI can mask high TTLT with fast TTFT, but agent-to-agent communication (A2A) needs fast TTLT because the next agent waits for the full output. When specifying latency requirements, always distinguish which metric you mean. Production targets: TTFT under 500ms for interactive use, TTLT under 3s for most user-facing completions.</p>
  <p><strong>Acceptance rate is the most undervalued metric in AI products.</strong> It measures how often users accept, edit, or reject AI suggestions. GitHub Copilot\u2019s ~30% acceptance rate is considered strong for code completion. Cursor tracks not just accept/reject but <em>edit distance after acceptance</em> \u2014 how much the user modifies the suggestion after accepting. Low acceptance with low edit distance means the AI is almost right (tune prompts). Low acceptance with high edit distance means the AI is fundamentally wrong (rethink the approach). Track acceptance rate by feature, user segment, and task type \u2014 aggregate acceptance rate hides critical signal.</p>
  <p><strong>Hallucination measurement</strong> requires multiple frameworks depending on context. <strong>Faithful summaries</strong>: does the output stay true to the input context? Measure with NLI (Natural Language Inference) models or LLM-as-judge using claude-sonnet-4-6. <strong>Factual consistency</strong>: are claims verifiable against a knowledge base? Tools like RAGAS and DeepEval provide automated hallucination detection pipelines. Neither automated method is perfect \u2014 human evaluation remains the gold standard, but you need automated metrics for continuous monitoring at scale.</p>
  <p><strong>A/B testing AI products</strong> is harder than traditional A/B testing because of non-determinism. The same prompt can produce different quality outputs across runs. You need larger sample sizes (typically 2\u20145x traditional tests) and should test at the <em>session level</em>, not the request level \u2014 one bad response in a good session matters less than consistently mediocre responses. Consider multi-armed bandit approaches for prompt variant testing to converge faster than fixed A/B splits.</p>`,
  tasks: [
    { title: 'Build an AI product metrics dashboard spec', description: 'For an AI customer support chatbot: define 8 metrics across four layers \u2014 model quality (accuracy, hallucination rate), user experience (TTFT, acceptance rate), operational (cost per conversation, error rate), and business (ticket deflection, CSAT). For each metric: data source, measurement method, target, and alert threshold. Save as /day-31/metrics_dashboard_spec.md.', time: '25 min' },
    { title: 'Design a hallucination measurement pipeline', description: 'Your product summarizes legal documents. Design an automated hallucination detection pipeline: what baseline data do you need, which evaluation method (NLI model, LLM-as-judge with claude-sonnet-4-6, or human review), what thresholds trigger alerts, and how do you handle detected hallucinations in production? Save as /day-31/hallucination_pipeline.md.', time: '25 min' },
    { title: 'Design an A/B test for a non-deterministic AI feature', description: 'You want to test two system prompts for your AI writing assistant. Design the experiment: sample size calculation (accounting for non-determinism), randomization unit (user vs session vs request), primary metric, guardrail metrics, and statistical methodology. Why do AI products need 2\u20145x more samples than traditional A/B tests? Save as /day-31/ab_test_design.md.', time: '20 min' },
    { title: 'Acceptance rate deep-dive', description: 'Analyze acceptance rate as a product metric. For three AI products (code assistant, email composer, search summarizer): define what "acceptance" means in each context, what "edit distance after acceptance" signals, how to segment by user expertise level, and what acceptance rate target is realistic. Save as /day-31/acceptance_rate_analysis.md.', time: '10 min' }
  ],

  codeExample: {
    title: 'AI product metrics framework — Python',
    lang: 'python',
    code: `# Day 31 — AI product metrics framework calculator
# Pedagogical goal: stop optimizing proxy metrics. Instrument acceptance rate,
# cost per outcome, hallucination rate, and tie them to a business KPI.

from dataclasses import dataclass
from typing import List, Dict
import math
import statistics


@dataclass
class Event:
    user_id: str
    suggested: bool         # model produced a usable answer
    accepted: bool          # user accepted/used the answer
    latency_ms: int
    input_tokens: int
    output_tokens: int
    flagged_hallucination: bool
    business_outcome_value: float   # $ saved or earned per accepted answer


# Pricing (USD per 1K tokens) — illustrative current models
PRICES = {
    "claude-sonnet-4-6":   {"in": 0.003, "out": 0.015},
    "gpt-4o":              {"in": 0.0025, "out": 0.010},
    "claude-haiku-4-5-20251001": {"in": 0.0008, "out": 0.004},
}


def cost_for(model: str, in_tok: int, out_tok: int) -> float:
    p = PRICES[model]
    return (in_tok / 1000.0) * p["in"] + (out_tok / 1000.0) * p["out"]


def percentile(values: List[float], pct: float) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    k = max(0, min(len(s) - 1, int(round((pct / 100.0) * (len(s) - 1)))))
    return s[k]


def summarize(events: List[Event], model: str) -> Dict[str, float]:
    n = len(events)
    suggested = [e for e in events if e.suggested]
    accepted = [e for e in events if e.accepted]
    halluc = [e for e in events if e.flagged_hallucination]
    latencies = [e.latency_ms for e in events]
    costs = [cost_for(model, e.input_tokens, e.output_tokens) for e in events]
    revenue = sum(e.business_outcome_value for e in accepted)
    total_cost = sum(costs)
    return {
        "n": n,
        "suggestion_rate": len(suggested) / n,
        "acceptance_rate": (len(accepted) / len(suggested)) if suggested else 0.0,
        "hallucination_rate": len(halluc) / n,
        "p50_latency_ms": percentile(latencies, 50),
        "p95_latency_ms": percentile(latencies, 95),
        "cost_per_query": total_cost / n,
        "cost_per_accepted": (total_cost / len(accepted)) if accepted else float("inf"),
        "revenue": revenue,
        "roi": (revenue - total_cost) / total_cost if total_cost > 0 else 0.0,
        "active_users": len({e.user_id for e in events}),
    }


# Synthetic week of traffic for a coding assistant feature.
def make_events(seed: int = 7) -> List[Event]:
    import random
    random.seed(seed)
    events: List[Event] = []
    for i in range(2000):
        suggested = random.random() < 0.92
        accepted = suggested and random.random() < 0.41
        events.append(Event(
            user_id=f"u_{random.randint(1, 220)}",
            suggested=suggested,
            accepted=accepted,
            latency_ms=int(random.gauss(740, 220)),
            input_tokens=random.randint(400, 1800),
            output_tokens=random.randint(80, 600),
            flagged_hallucination=random.random() < 0.018,
            business_outcome_value=2.10 if accepted else 0.0,
        ))
    return events


events = make_events()
metrics = summarize(events, "claude-sonnet-4-6")

print("=== AI Product Metrics — Coding Assistant (week N) ===")
print(f"  events                : {metrics['n']}")
print(f"  active users          : {metrics['active_users']}")
print(f"  suggestion rate       : {metrics['suggestion_rate']*100:5.1f}%")
print(f"  ACCEPTANCE RATE       : {metrics['acceptance_rate']*100:5.1f}%   <- north star")
print(f"  hallucination rate    : {metrics['hallucination_rate']*100:5.2f}%  (target < 1%)")
print(f"  p50 / p95 latency     : {metrics['p50_latency_ms']:.0f} / {metrics['p95_latency_ms']:.0f} ms")
print(f"  cost per query        : \${metrics['cost_per_query']:.4f}")
print(f"  cost per accepted     : \${metrics['cost_per_accepted']:.4f}")
print(f"  revenue (value)       : \${metrics['revenue']:.2f}")
print(f"  ROI                   : {metrics['roi']*100:.1f}%")

print("\\n=== Cost comparison across model choices ===")
for m in PRICES:
    c = sum(cost_for(m, e.input_tokens, e.output_tokens) for e in events)
    cpa = c / max(1, sum(1 for e in events if e.accepted))
    print(f"  {m:<28} total=\${c:7.2f}   cost/accepted=\${cpa:.4f}")

# Health gates for launch / post-launch reviews.
GATES = [
    ("acceptance_rate >= 0.30",   metrics["acceptance_rate"] >= 0.30),
    ("hallucination_rate < 0.02", metrics["hallucination_rate"] < 0.02),
    ("p95_latency_ms < 1500",     metrics["p95_latency_ms"] < 1500),
    ("cost_per_accepted < $0.50", metrics["cost_per_accepted"] < 0.50),
    ("ROI > 0",                   metrics["roi"] > 0),
]

print("\\n=== Launch readiness gates ===")
for name, ok in GATES:
    print(f"  {'PASS' if ok else 'FAIL'}  {name}")

print("\\n=== A/B math ===")
# Treatment (gpt-4o) vs control (claude-sonnet-4-6): same accept rate, different cost.
n = metrics["n"]
p = metrics["acceptance_rate"]
se = math.sqrt(p * (1 - p) / max(1, len(events)))
print(f"  acceptance MOE 95%    : +/- {1.96 * se * 100:.2f} pp on n={n}")
print(f"  rule of thumb         : need ~{int(math.ceil((1.96/0.02)**2 * p*(1-p)))} samples for +/-2pp")
`,
  },

  interview: { question: 'What metrics would you track for an AI customer support product?', answer: `I\u2019d structure metrics in four layers, from model to business.<br><br><strong>Model quality:</strong> Hallucination rate (measured via LLM-as-judge using claude-sonnet-4-6 against ground truth), response accuracy (human-evaluated sample weekly), and response relevance score. These are necessary but not sufficient \u2014 a perfectly accurate bot that takes 10 seconds to respond still fails.<br><br><strong>User experience:</strong> TTFT under 500ms for perceived responsiveness, acceptance rate (do users accept the AI\u2019s suggested resolution or escalate to a human?), and conversation length (shorter usually means the AI resolved the issue faster). TTFT and TTLT matter differently here \u2014 streaming makes TTFT critical for the first response, but TTLT matters for complex multi-step resolutions.<br><br><strong>Operational:</strong> Cost per conversation (model API cost plus compute), error rate (failed responses, timeouts), and escalation rate to human agents. Cost per conversation is essential \u2014 if AI support costs more per ticket than human support, the business case collapses.<br><br><strong>Business impact:</strong> Ticket deflection rate (the metric executives care about most), CSAT for AI-handled versus human-handled tickets, resolution rate, and repeat contact rate. The north star: did AI support resolve the customer\u2019s problem without a human? Track weekly and segment by issue category \u2014 AI handles password resets at 95% but billing disputes at 30%.` },
  pmAngle: 'The biggest measurement mistake in AI products is optimizing for proxy metrics. Benchmark scores don\u2019t predict user satisfaction. BLEU/ROUGE scores don\u2019t predict business impact. The PM who instruments acceptance rate, cost per outcome, and hallucination rate at launch \u2014 and ties them to business metrics within 30 days \u2014 is the one who keeps the AI product funded past v1.',
  resources: [
    { type: 'TOOL', title: 'RAGAS \u2014 RAG Evaluation Framework', url: 'https://docs.ragas.io/', note: 'Automated hallucination detection and RAG quality metrics.' },
    { type: 'TOOL', title: 'DeepEval \u2014 LLM Evaluation', url: 'https://docs.confident-ai.com/', note: 'Open-source framework for hallucination, relevance, and faithfulness metrics.' },
    { type: 'BLOG', title: 'Anthropic: Evaluating AI Systems', url: 'https://www.anthropic.com/research', note: 'Research on model evaluation and safety metrics.' },
    { type: 'BLOG', title: 'GitHub Copilot Metrics', url: 'https://github.blog/news-insights/research/', note: 'How GitHub measures acceptance rate and developer productivity.' },
    { type: 'TOOL', title: 'Artificial Analysis', url: 'https://artificialanalysis.ai/', note: 'Independent benchmarks for TTFT, TTLT, and throughput across providers.' }
  ]
};
