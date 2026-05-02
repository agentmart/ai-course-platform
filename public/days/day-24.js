// Day 24 — AI Observability (Tracing & Monitoring)
// Updated: March 2026 | Review: Braintrust, Arize Phoenix, OpenTelemetry, Helicone, cost attribution

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[24] = {
  subtitle: 'You can\u2019t debug what you can\u2019t see \u2014 build the observability stack for production AI.',
  context: `<p>AI observability makes LLM application behavior visible, debuggable, and improvable in production. Unlike traditional software where stack traces tell you what happened, LLM applications fail subtly: technically valid but incorrect outputs, wrong tool selections, poor retrieval, unexpected agent paths. Without observability, debugging is guessing. With it, every failure has a traceable root cause.</p>
  <p>The <strong>four-layer approach</strong>: (1) <strong>Instrumentation</strong> \u2014 capture inputs, outputs, tokens, latency, and errors for every LLM call as spans in a trace. (2) <strong>Monitoring</strong> \u2014 track quality metrics, cost, and latency trends over time. (3) <strong>Alerting</strong> \u2014 trigger when quality degrades (the thing that actually hurts the product). (4) <strong>Quality sampling</strong> \u2014 regularly review production outputs for issues automated metrics miss.</p>
  <p><strong>Platform landscape (2026):</strong> <strong>LangSmith</strong> \u2014 LangChain\u2019s product but works beyond LangChain apps; strong tracing and eval integration. <strong>Braintrust</strong> \u2014 growing fast, excellent eval + experimentation features. <strong>Langfuse</strong> \u2014 leading open-source option, v3 with improved UI and production monitoring. <strong>Arize Phoenix</strong> \u2014 open-source, OpenTelemetry-native. <strong>Helicone</strong> \u2014 proxy-based, zero code changes (just change API base URL). <strong>OpenTelemetry</strong> is now the de-facto instrumentation standard; LlamaIndex, LangChain, AutoGen, and CrewAI all support it natively. Specify "use OpenTelemetry instrumentation" rather than framework-specific tracing.</p>
  <p><strong>Cost attribution by feature</strong>: Add metadata tags to each API call (<code>{"feature": "contract_review", "user_tier": "enterprise"}</code>) and track cost per feature in your observability layer. This enables targeting the highest-spend features for optimization first. Most platforms (LangSmith, Langfuse, Helicone) support this.</p>
  <p><strong>Anomaly detection</strong>: Beyond static thresholds, production AI monitoring uses statistical anomaly detection. If your acceptance rate drops 2 standard deviations from the rolling average, that\u2019s more sensitive than any static threshold. This is how you catch quality regressions before customers notice.</p>`,
  tasks: [
    { title: 'Design your observability plan', description: 'Define: 5 spans to trace (embed, retrieve, LLM call, tool call, output validation), 3 metrics to monitor (latency p99, acceptance rate, cost per request), and 2 alerts (quality drop, cost spike). Save as /day-24/observability_plan.md.', time: '25 min' },
    { title: 'Explore Langfuse or Helicone', description: 'Set up Langfuse (open-source) or Helicone (proxy-based, zero code changes). Instrument a simple LLM call. Inspect the trace: what does it show about token usage and latency that logs alone don\u2019t? Save as /day-24/trace_analysis.md.', time: '25 min' },
    { title: 'Design cost attribution', description: 'Your product has 5 features using LLM calls. Design the metadata tagging scheme and the dashboard that shows cost per feature per day. How do you identify which feature is driving a sudden cost spike? Save as /day-24/cost_attribution_design.md.', time: '20 min' },
    { title: 'Debug a production failure from a trace', description: 'A user reports a wrong answer. You open the trace and see: retrieval returned 3 chunks, 2 were irrelevant. Write the root cause analysis and the fix (improve retrieval, not the prompt). Save as /day-24/trace_debug_exercise.md.', time: '10 min' },
  ],

  codeExample: {
    title: 'Trace + metric aggregator — Python',
    lang: 'python',
    code: `# Day 24 — Trace + Metric Aggregator (Langfuse / Helicone shape)
#
# An observability stack for AI products needs more than logs — it needs
# per-call SPANS (model, tokens, latency, cost, accept/reject) that roll
# up into p50/p95/p99 percentile dashboards by feature. This script
# implements the rollup logic Langfuse and Helicone do for you, so you
# understand what the numbers mean before you trust a vendor dashboard.
#
# It also demonstrates "debug a failure from a trace" — locate the slowest
# trace, drill into its spans, and produce a one-line root-cause hypothesis.

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List
import math
import random

@dataclass
class Span:
    trace_id: str
    feature: str
    model: str
    input_tokens: int
    output_tokens: int
    latency_ms: int
    accepted: bool
    error: str = ""

PRICES = {
    "claude-sonnet-4-6":         (3.00, 15.00),
    "claude-haiku-4-5-20251001": (0.80,  4.00),
    "gpt-4o":                    (2.50, 10.00),
}

def cost_usd(s: Span) -> float:
    p_in, p_out = PRICES[s.model]
    return (s.input_tokens / 1e6) * p_in + (s.output_tokens / 1e6) * p_out

# --- Percentile (no numpy; pure stdlib) ---------------------------------
def percentile(values: List[float], p: float) -> float:
    if not values: return 0.0
    xs = sorted(values)
    k = (len(xs) - 1) * (p / 100.0)
    lo = math.floor(k); hi = math.ceil(k)
    if lo == hi: return xs[int(k)]
    return xs[lo] + (xs[hi] - xs[lo]) * (k - lo)

# --- Aggregator ---------------------------------------------------------
def rollup(spans: List[Span]) -> Dict:
    by_feature = defaultdict(list)
    for s in spans:
        by_feature[s.feature].append(s)

    out = {}
    for feat, ss in by_feature.items():
        lats = [s.latency_ms for s in ss]
        accepted = sum(1 for s in ss if s.accepted)
        errors   = sum(1 for s in ss if s.error)
        spend    = sum(cost_usd(s) for s in ss)
        out[feat] = {
            "calls":      len(ss),
            "p50_ms":     round(percentile(lats, 50), 1),
            "p95_ms":     round(percentile(lats, 95), 1),
            "p99_ms":     round(percentile(lats, 99), 1),
            "accept_pct": round(100.0 * accepted / len(ss), 1),
            "error_pct":  round(100.0 *   errors / len(ss), 1),
            "spend_usd":  round(spend, 4),
            "spend_per_1k": round(spend / len(ss) * 1000, 2),
        }
    return out

# --- Synthetic production traces ----------------------------------------
random.seed(7)
features = ["chat_qa", "doc_summary", "code_assist"]
spans: List[Span] = []
for i in range(900):
    f = random.choice(features)
    model = "claude-sonnet-4-6" if f != "code_assist" else "claude-haiku-4-5-20251001"
    base_latency = {"chat_qa": 700, "doc_summary": 1800, "code_assist": 350}[f]
    lat = max(50, int(random.gauss(base_latency, base_latency * 0.25)))
    if random.random() < 0.01:
        lat *= 6   # injected slow-call anomaly
    accepted = random.random() < (0.92 if f != "doc_summary" else 0.78)
    err = "" if random.random() > 0.005 else "context_length_exceeded"
    spans.append(Span(
        trace_id=f"tr-{i:04d}", feature=f, model=model,
        input_tokens=random.randint(400, 6000),
        output_tokens=random.randint(80, 900),
        latency_ms=lat, accepted=accepted, error=err,
    ))

# --- Per-feature dashboard ----------------------------------------------
print("Per-feature rollup\\n")
print(f"{'feature':14} {'calls':>6} {'p50':>6} {'p95':>6} {'p99':>6} "
      f"{'acc%':>6} {'err%':>6} {'spend $':>9} {'$/1k':>7}")
for feat, m in rollup(spans).items():
    print(f"{feat:14} {m['calls']:>6} {m['p50_ms']:>6.0f} {m['p95_ms']:>6.0f} "
          f"{m['p99_ms']:>6.0f} {m['accept_pct']:>6.1f} {m['error_pct']:>6.1f} "
          f"{m['spend_usd']:>9.2f} {m['spend_per_1k']:>7.2f}")

# --- Debug-from-trace ---------------------------------------------------
slowest = max(spans, key=lambda s: s.latency_ms)
print(f"\\nSlowest trace: {slowest.trace_id} feature={slowest.feature} "
      f"model={slowest.model} {slowest.latency_ms}ms "
      f"in_tok={slowest.input_tokens} out_tok={slowest.output_tokens}")

# Hypothesis: feature p95 vs this call.
feat_p95 = rollup([s for s in spans if s.feature == slowest.feature])[slowest.feature]["p95_ms"]
ratio = slowest.latency_ms / max(feat_p95, 1)
hypothesis = ("input-token bloat — likely retrieval pulled too many chunks"
              if slowest.input_tokens > 4000 else
              "transient provider slowness — retry & alert")
print(f"  feature p95 = {feat_p95}ms ; this call is {ratio:.1f}x p95")
print(f"  root-cause hypothesis: {hypothesis}")

# --- Errors --------------------------------------------------------------
err_traces = [s for s in spans if s.error]
print(f"\\nError sample ({len(err_traces)} total):")
for s in err_traces[:5]:
    print(f"  {s.trace_id}  feature={s.feature}  err={s.error}")

print("\\nPM takeaway: percentiles, accept-rate, and $/1k calls are the "
      "three numbers that belong on every AI-feature dashboard. Open one "
      "trace per week; you will catch issues no aggregate metric shows.")
`,
  },
  interview: { question: 'How would you set up observability for an AI product in production?', answer: `Four layers, in order of implementation priority.<br><br><strong>Instrumentation (week 1):</strong> Every LLM call captured as a span with: input prompt, output, model, tokens (input/output/cached), latency, and custom metadata (feature name, user tier). Use OpenTelemetry \u2014 it\u2019s the de-facto standard supported by all major frameworks. Send to Langfuse (open-source) or Helicone (proxy-based, zero code changes).<br><br><strong>Monitoring (week 2):</strong> Dashboard tracking: p99 latency by feature, acceptance rate (users accepting vs rejecting AI outputs), cost per request and per feature, and error rate. The acceptance rate is the most undervalued metric \u2014 it\u2019s the leading indicator of product quality.<br><br><strong>Alerting (week 3):</strong> Statistical anomaly detection on acceptance rate (2 standard deviations from rolling 7-day average) and static threshold on p99 latency. Quality degradation is what hurts the product.<br><br><strong>Quality sampling (ongoing):</strong> Weekly manual review of 50 random production outputs. Automated evals miss edge cases that a PM reviewing real outputs catches. This is the PM\u2019s direct connection to product quality.` },
  pmAngle: 'Observability is a PM responsibility. You should be able to open a trace, see why the product gave a wrong answer, and diagnose whether the fix is retrieval quality, prompt engineering, or model selection. The PM who reviews production traces weekly builds better products than one who waits for complaint tickets.',
  resources: [
    { type: 'TOOL', title: 'Langfuse', url: 'https://langfuse.com/', note: 'Leading open-source LLM observability. V3 with production monitoring.' },
    { type: 'TOOL', title: 'Helicone', url: 'https://www.helicone.ai/', note: 'Proxy-based: change API base URL, get full observability. Zero code changes.' },
    { type: 'TOOL', title: 'Braintrust', url: 'https://www.braintrustdata.com/', note: 'Eval + observability platform. Strong experimentation features.' },
    { type: 'TOOL', title: 'LangSmith', url: 'https://www.langchain.com/langsmith', note: 'LangChain\u2019s observability product. Works beyond LangChain apps.' },
    { type: 'TOOL', title: 'Arize Phoenix', url: 'https://docs.arize.com/phoenix', note: 'Open-source, OpenTelemetry-native observability.' },
    { type: 'DOCS', title: 'OpenTelemetry for LLMs', url: 'https://opentelemetry.io/', note: 'De-facto instrumentation standard. All major AI frameworks support it.' }
  ]
};
