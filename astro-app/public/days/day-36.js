// Day 36 — Competitive Analysis Framework
// Updated: March 2026 | Review: Artificial Analysis, open-source monitoring layer, 4-layer competitive stack

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[36] = {
  subtitle: 'Build the 4-layer competitive monitoring stack that makes you the most informed PM.',
  context: `<p>Competitive analysis for AI products requires monitoring four distinct layers, each with different cadences and signals. Most PMs track only layers 1 and 2 and miss the disruptions coming from layers 3 and 4. The PM who monitors all four layers is consistently the most informed person in any strategy meeting.</p>
  <p><strong>Layer 1: Direct competitors (weekly).</strong> Products competing for the same user and budget. Track: feature releases, pricing changes, customer wins/losses, and hiring patterns. For AI products, also track: which models they use (often visible in API responses or documentation), their evaluation methodology (published benchmarks), and their safety/trust investments. Set up Google Alerts, follow competitor engineering blogs, and monitor their changelog.</p>
  <p><strong>Layer 2: Platform and model providers (bi-weekly).</strong> Anthropic, OpenAI, Google, and other model providers are both your supply chain and potential competitors. Track: new model releases (capability jumps that enable new features), pricing changes (affects your unit economics), new features (function calling, vision, tool use), and most importantly \u2014 new first-party products that compete with your use case. When Anthropic ships Claude Artifacts or OpenAI ships GPTs, does that overlap with your product?</p>
  <p><strong>Layer 3: Adjacent categories (monthly).</strong> Products solving related problems that could expand into your space. A CRM AI feature could become a standalone AI sales assistant. A code editor AI (Cursor) could become a full development platform. Track category expansion signals: new pricing tiers, new user segments, and API platform launches.</p>
  <p><strong>Layer 4: Open-source and research (bi-weekly).</strong> This is the most undertracked threat. Monitor: <a href="https://huggingface.co/" target="_blank">Hugging Face trending models</a> (weekly), arXiv papers from major labs (bi-weekly), and open-weight model releases from Meta (Llama), Microsoft (Phi), Mistral, and others. When an open-source model matches your product\u2019s quality threshold, any developer can build a competing product at near-zero marginal cost. <a href="https://artificialanalysis.ai/" target="_blank">Artificial Analysis</a> is the best single resource for tracking model capabilities, pricing, and performance across all providers and open-source alternatives.</p>
  <p><strong>Monitoring cadence summary:</strong> Direct competitors weekly, platform providers bi-weekly, adjacent categories monthly, open-source releases bi-weekly. Total time investment: approximately 2\u20133 hours per week. The PM who allocates this time consistently avoids strategic surprises.</p>`,
  tasks: [
    { title: 'Build a 4-layer competitive monitoring dashboard', description: 'Set up a competitive monitoring document for an AI product of your choice. For each of the four layers: identify 3\u20145 entities to track, define what signals to monitor, specify the monitoring cadence and tools (Google Alerts, Artificial Analysis, Hugging Face trending, RSS feeds), and set review triggers (what change would warrant immediate strategy review). Save as /day-36/competitive_monitoring_dashboard.md.', time: '25 min' },
    { title: 'Open-source threat analysis', description: 'Pick a commercial AI product category (code completion, document summarization, customer support). Identify the best open-source alternative today. Compare on: model quality, deployment cost, customizability, support/reliability, and time to production. At what point does the open-source option become a credible threat? What must the commercial product do that open-source cannot? Save as /day-36/open_source_threat_analysis.md.', time: '25 min' },
    { title: 'Platform provider competitive assessment', description: 'Analyze one AI platform provider (Anthropic, OpenAI, or Google) as both a supplier and potential competitor. What first-party products compete with applications built on their API? What signals indicate they\u2019re moving into your space? How do you maintain strategic leverage when your competitor is also your supplier? Save as /day-36/platform_provider_assessment.md.', time: '20 min' },
    { title: 'Weekly competitive brief', description: 'Write a one-page weekly competitive brief covering all four layers. Use real, current information: check Artificial Analysis for recent model releases, Hugging Face for trending open-source models, and competitor changelogs. This is the brief you\u2019d share with your leadership team. Save as /day-36/weekly_competitive_brief.md.', time: '10 min' }
  ],

  codeExample: {
    title: '4-layer competitive monitoring stack — Python',
    lang: 'python',
    code: `# Day 36 — 4-layer competitive monitoring stack with priority scoring
# Pedagogical goal: most PMs only watch competitors + platforms.
# Strong AI PMs also watch open-source releases and adjacent categories.

from dataclasses import dataclass
from typing import List, Dict
from collections import Counter
import datetime as dt


LAYERS = ["competitor", "platform", "open_source", "adjacent"]


@dataclass
class Signal:
    layer: str            # competitor | platform | open_source | adjacent
    source: str
    headline: str
    date: str             # ISO date
    impact: int           # 1..5
    proximity: int        # 1..5  (1 = very close to our roadmap)


def parse_date(s: str) -> dt.date:
    return dt.date.fromisoformat(s)


def recency_weight(d: dt.date, today: dt.date) -> float:
    age = (today - d).days
    if age <= 7:   return 1.00
    if age <= 30:  return 0.75
    if age <= 90:  return 0.45
    return 0.20


def priority(sig: Signal, today: dt.date) -> float:
    base = sig.impact * (6 - sig.proximity)         # close + high-impact = higher
    layer_boost = {
        "competitor":  1.0,
        "platform":    1.1,    # platform shifts are existential
        "open_source": 1.2,    # most undertracked
        "adjacent":    0.8,
    }[sig.layer]
    return round(base * layer_boost * recency_weight(parse_date(sig.date), today), 2)


# Hand-curated week of signals across 4 layers (April 2026 snapshot).
TODAY = dt.date(2026, 4, 8)
SIGNALS: List[Signal] = [
    Signal("competitor", "Harvey AI",
           "Launches contract redlining with tool-use", "2026-04-02", 5, 1),
    Signal("competitor", "Ironclad",
           "Adds AI clause-library Q&A to enterprise tier", "2026-03-28", 3, 2),
    Signal("platform",   "Anthropic",
           "claude-sonnet-4-6 adds JSON-mode + 2M context GA", "2026-04-04", 5, 1),
    Signal("platform",   "Anthropic",
           "claude-haiku-4-5-20251001 price drops 30%", "2026-03-22", 4, 2),
    Signal("platform",   "OpenAI",
           "gpt-4o long-output mode public preview", "2026-03-30", 4, 3),
    Signal("open_source","Meta",
           "Llama-4-70B-Instruct released, beats prior closed legal eval", "2026-04-01", 5, 1),
    Signal("open_source","Mistral",
           "Mistral-Large-3 with 1M context open weights", "2026-03-15", 4, 2),
    Signal("adjacent",   "Notion AI",
           "Adds workspace-wide retrieval; legal teams using it", "2026-03-25", 3, 3),
    Signal("adjacent",   "DocuSign",
           "Adds 'AI summary' to envelope review screen", "2026-03-18", 2, 4),
    Signal("competitor", "EvenUp",
           "Closes $80M Series C, hires GTM lead from Harvey", "2026-04-05", 4, 3),
]


# Build the dashboard.
counts = Counter(s.layer for s in SIGNALS)
print("=== Coverage check (per layer) ===")
for layer in LAYERS:
    n = counts.get(layer, 0)
    flag = "OK" if n >= 2 else "GAP"
    print(f"  {layer:<11}  signals={n}  [{flag}]")


scored = sorted(
    [(priority(s, TODAY), s) for s in SIGNALS],
    key=lambda x: -x[0],
)


print("\\n=== Top 5 priority signals this week ===")
for score, s in scored[:5]:
    print(f"  P={score:>5.2f}  [{s.layer:<11}] {s.source:<10}  {s.headline}")


print("\\n=== Open-source threat detail (the undertracked layer) ===")
for score, s in scored:
    if s.layer == "open_source":
        threshold = "ON our quality threshold" if s.impact >= 5 else "watching"
        print(f"  {s.date}  P={score:.2f}  {s.source:<10}  {s.headline}  -> {threshold}")


# Translate top signals into action recommendations.
def recommend(s: Signal) -> str:
    if s.layer == "competitor" and s.proximity <= 2:
        return "Win/loss interview within 7 days; update battlecard."
    if s.layer == "platform"   and s.proximity <= 2:
        return "Run capability through eval harness; revisit roadmap gates."
    if s.layer == "open_source" and s.impact >= 4:
        return "Re-run quality eval against open weights; reassess pricing floor."
    if s.layer == "adjacent":
        return "Customer interview: are they replacing us? Bundling against us?"
    return "Note in weekly brief; no action."


print("\\n=== Action recommendations (top 5) ===")
for score, s in scored[:5]:
    print(f"  - [{s.layer}] {s.headline}")
    print(f"      action: {recommend(s)}")


print("\\n=== Weekly brief (auto-stub) ===")
brief_layers = {layer: [s for _, s in scored if s.layer == layer][:2] for layer in LAYERS}
for layer in LAYERS:
    print(f"  {layer.upper()}:")
    for s in brief_layers[layer]:
        print(f"    - {s.source}: {s.headline}")

print("\\nPM takeaway: the open-source layer is the one that flips your")
print("competitive landscape overnight. Track it weekly, not quarterly.")
`,
  },

  interview: { question: 'How do you stay ahead of competitors in a market where the underlying technology changes every few months?', answer: `I use a four-layer competitive monitoring framework with different cadences for each.<br><br><strong>Layer 1 \u2014 Direct competitors (weekly):</strong> Feature releases, pricing changes, customer movements. For AI products, I also track which models competitors use \u2014 this signals their cost structure and capability ceiling. If a competitor switches from claude-opus-4-6 to claude-haiku-4-5-20251001, they\u2019re optimizing for cost over quality, which tells me about their unit economics pressure.<br><br><strong>Layer 2 \u2014 Platform providers (bi-weekly):</strong> New model releases, pricing changes, and critically, new first-party products. My biggest competitive risk isn\u2019t another startup; it\u2019s Anthropic or OpenAI building my product as a native feature. I track their product roadmap signals and maintain architectural flexibility to add value beyond what the platform provides.<br><br><strong>Layer 3 \u2014 Adjacent categories (monthly):</strong> Products solving related problems that could expand into my space. Category boundaries in AI are particularly fluid \u2014 any tool-using agent can become a competitor overnight.<br><br><strong>Layer 4 \u2014 Open-source (bi-weekly):</strong> This is what most PMs miss. I monitor Hugging Face trending and Artificial Analysis weekly. When an open-source model reaches 90% of our quality threshold, our pricing power has an expiration date. Strategic response: invest in product differentiation (workflow, data, evaluation) that can\u2019t be replicated by swapping in an open-source model.<br><br>Total investment: about 2\u20133 hours per week. The ROI is being the most informed person in every strategy meeting.` },
  pmAngle: 'The competitive monitoring stack that differentiates strong AI PMs has four layers, not two. Most PMs track competitors and platforms but miss open-source releases and adjacent categories. The open-source layer is particularly undertracked \u2014 when an open-weight model matches your product\u2019s quality threshold, your competitive landscape changes overnight. Two hours a week on monitoring prevents strategic surprises that take months to recover from.',
  resources: [
    { type: 'TOOL', title: 'Artificial Analysis', url: 'https://artificialanalysis.ai/', note: 'Best single resource for model capabilities, pricing, and benchmarks across providers.' },
    { type: 'TOOL', title: 'Hugging Face \u2014 Trending Models', url: 'https://huggingface.co/models?sort=trending', note: 'Track open-source model releases. Check weekly for emerging threats.' },
    { type: 'TOOL', title: 'Papers With Code', url: 'https://paperswithcode.com/', note: 'Research breakthroughs with implementation. Early signal for future capabilities.' },
    { type: 'TOOL', title: 'Google Alerts', url: 'https://www.google.com/alerts', note: 'Set up alerts for competitor names, key AI terms, and your product category.' },
    { type: 'BLOG', title: 'Latent Space Podcast', url: 'https://www.latent.space/', note: 'Weekly AI industry analysis. Best signal-to-noise ratio in AI media.' }
  ]
};
