// Day 35 — AI Roadmapping
// Updated: March 2026 | Review: model deprecation management, API versioning, three-horizon with model dependencies

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[35] = {
  subtitle: 'How to roadmap an AI product when capability changes every 90 days.',
  context: `<p>AI product roadmapping operates on fundamentally different assumptions than traditional software roadmapping. In traditional products, your stack\u2019s capabilities are stable \u2014 you plan around what you build. In AI products, the underlying model capabilities change every 60\u201490 days: new model releases, capability jumps, pricing changes, deprecations. Your roadmap must be a living document that can absorb these shifts without losing strategic direction.</p>
  <p><strong>The three-horizon roadmap with model dependencies</strong> is the framework that works. <strong>Horizon 1 (0\u20143 months):</strong> Features built on current model capabilities. These are your committed deliverables with known model performance. <strong>Horizon 2 (3\u20149 months):</strong> Features that depend on expected capability improvements \u2014 mark these as \u201ccontingent on model capability X\u201d and define the specific benchmark that unblocks them. <strong>Horizon 3 (9\u201418 months):</strong> Strategic bets on capabilities that don\u2019t exist yet. These are directional, not committed. The key insight: every H2 and H3 item should specify what model capability it needs and how you\u2019ll test for that capability when new models release.</p>
  <p><strong>Model deprecation management</strong> is a process most AI teams learn the hard way. Model providers deprecate versions on schedules that don\u2019t align with your roadmap. Process: (1) Track deprecation announcements from every provider you use (Anthropic, OpenAI, Google). (2) Maintain a deprecation calendar integrated with your product roadmap. (3) When a new model version releases, immediately run your evaluation suite against it. (4) Budget 1\u20132 sprint cycles per quarter for model migration testing. (5) Never skip a deprecated version \u2014 migrating from a model two versions behind is exponentially harder than keeping current.</p>
  <p><strong>API versioning: pinned vs latest model strings.</strong> A critical technical decision with product implications. <strong>Pinned versions</strong> (e.g., <code>claude-sonnet-4-6-20250514</code>) guarantee identical behavior over time \u2014 essential for regulated industries and products where consistency matters. <strong>Latest aliases</strong> (e.g., <code>claude-sonnet-4-6</code>) automatically upgrade to the newest version \u2014 you get improvements but risk regressions. Best practice: use pinned versions in production, run your eval suite against latest versions in CI/CD, and upgrade pinned versions deliberately after validation passes.</p>
  <p><strong>Roadmap communication to stakeholders</strong> requires translating model uncertainty into business language. Executives want dates and commitments. Engineers want technical clarity. The framework: commit to Horizon 1, signal confidence levels for Horizon 2 (high/medium/low), and frame Horizon 3 as strategic options, not promises. Use monthly roadmap reviews to absorb model capability changes \u2014 a quarterly review cycle is too slow for AI products.</p>`,
  tasks: [
    { title: 'Build a three-horizon AI roadmap', description: 'For an AI writing assistant: create a three-horizon roadmap. H1 (0\u20143 months): 3 features built on current claude-sonnet-4-6 capabilities. H2 (3\u20149 months): 2 features contingent on specific capability improvements (define the benchmarks). H3 (9\u201418 months): 1 strategic bet. For each H2/H3 item, specify the model capability gate and how you\u2019d test for it. Save as /day-35/three_horizon_roadmap.md.', time: '25 min' },
    { title: 'Create a model deprecation process', description: 'Document a complete model deprecation management process: monitoring deprecation announcements, evaluation pipeline on new releases, migration sprint planning, rollback procedures, and communication templates for when a migration changes product behavior. Include a deprecation calendar template. Save as /day-35/deprecation_management.md.', time: '20 min' },
    { title: 'API versioning decision guide', description: 'Create a decision guide for when to use pinned vs latest model versions. Cover: regulated industries (pinned only), consumer products (latest with guardrails), enterprise (customer choice), and the CI/CD pipeline that validates latest before promoting to pinned. Include example version strings for claude-sonnet-4-6 and claude-haiku-4-5-20251001. Save as /day-35/api_versioning_guide.md.', time: '20 min' },
    { title: 'Stakeholder roadmap communication', description: 'Write three versions of your roadmap for different audiences: (1) Executive summary (1 page: what we\u2019re shipping, business impact, risks), (2) Engineering detail (technical dependencies, model versions, evaluation gates), (3) Customer-facing roadmap (capabilities coming, no internal details). Save as /day-35/roadmap_communication.md.', time: '15 min' }
  ],

  codeExample: {
    title: '90-day capability-aware roadmap planner — Python',
    lang: 'python',
    code: `# Day 35 — Capability-aware 90-day AI roadmap planner
# Pedagogical goal: roadmap items depend on model capability gates.
# Model releases land every ~90 days, so confidence intervals matter.

from dataclasses import dataclass, field
from typing import Dict, List, Tuple
import statistics


@dataclass
class ModelCapability:
    name: str
    available_now: bool
    eta_days: int                    # days until expected GA
    p_ship: float                    # probability the capability ships within eta


@dataclass
class RoadmapItem:
    title: str
    horizon: str                     # H1 (now-30d), H2 (30-60d), H3 (60-90d)
    effort_days: int
    requires: List[str] = field(default_factory=list)
    revenue_pct: int = 0             # expected revenue lift if shipped


CAPS: Dict[str, ModelCapability] = {
    "long_context_2m":      ModelCapability("long_context_2m",      True,   0,  1.00),
    "structured_outputs":   ModelCapability("structured_outputs",   True,   0,  1.00),
    "agentic_tool_use_v2":  ModelCapability("agentic_tool_use_v2",  False, 30,  0.80),
    "multimodal_video_in":  ModelCapability("multimodal_video_in",  False, 60,  0.55),
    "on_device_haiku":      ModelCapability("on_device_haiku",      False, 90,  0.35),
}


ITEMS: List[RoadmapItem] = [
    RoadmapItem("Bulk contract ingestion (2M ctx)", "H1", 12,
                ["long_context_2m", "structured_outputs"], 8),
    RoadmapItem("Auto-redline w/ tool-use",          "H2", 18,
                ["agentic_tool_use_v2"], 14),
    RoadmapItem("Video deposition summarizer",       "H3", 25,
                ["multimodal_video_in"], 9),
    RoadmapItem("Offline review for regulated ICP",  "H3", 22,
                ["on_device_haiku"], 6),
    RoadmapItem("Quality eval harness v2",           "H1", 8,
                ["structured_outputs"], 0),
]


def confidence(item: RoadmapItem) -> float:
    if not item.requires:
        return 1.0
    return round(min(CAPS[c].p_ship for c in item.requires), 2)


def plan(items: List[RoadmapItem]) -> List[Dict]:
    rows = []
    for it in items:
        c = confidence(it)
        expected_value = it.revenue_pct * c
        risk = "LOW" if c >= 0.85 else "MED" if c >= 0.55 else "HIGH"
        rows.append({
            "title": it.title,
            "horizon": it.horizon,
            "effort_days": it.effort_days,
            "confidence": c,
            "expected_value_pct": round(expected_value, 1),
            "risk": risk,
            "requires": it.requires,
        })
    rows.sort(key=lambda r: (r["horizon"], -r["expected_value_pct"]))
    return rows


def deprecation_check(today: int, items: List[RoadmapItem]) -> List[str]:
    # Surface items that depend on a capability with low p_ship.
    warnings = []
    for it in items:
        for cap_name in it.requires:
            cap = CAPS[cap_name]
            if not cap.available_now and cap.p_ship < 0.6 and cap.eta_days <= today + 60:
                warnings.append(f"'{it.title}' relies on '{cap_name}' (p_ship={cap.p_ship})")
    return warnings


print("=== Capability inventory (today) ===")
for cap in CAPS.values():
    avail = "AVAILABLE" if cap.available_now else f"ETA +{cap.eta_days}d  p_ship={cap.p_ship}"
    print(f"  {cap.name:<22}  {avail}")


rows = plan(ITEMS)
print("\\n=== 90-day roadmap (sorted by horizon, then expected value) ===")
print(f"  {'horizon':<3}  {'risk':<4}  {'conf':<4}  {'eff':>3}  {'EV%':>4}  title")
for r in rows:
    print(f"  {r['horizon']:<3}  {r['risk']:<4}  {r['confidence']:<4}  "
          f"{r['effort_days']:>3}  {r['expected_value_pct']:>4}  {r['title']}")


print("\\n=== Capability gates (block H2 items until cap is GA) ===")
for r in rows:
    if r["horizon"] != "H1":
        gate = "; ".join(f"{c}={CAPS[c].p_ship}" for c in r["requires"]) or "n/a"
        print(f"  {r['title']:<40}  gate: {gate}")


print("\\n=== Risk warnings ===")
for w in deprecation_check(today=0, items=ITEMS):
    print("  ! " + w)


print("\\n=== Stakeholder summary ===")
total_effort = sum(i.effort_days for i in ITEMS)
exp_value = sum(r["expected_value_pct"] for r in rows)
print(f"  total engineering days   : {total_effort}")
print(f"  expected revenue lift    : {exp_value:.1f}%  (probability-weighted)")
print(f"  roadmap items            : {len(ITEMS)}  across H1/H2/H3")
print(f"  monthly review trigger   : new model release OR p_ship change > 0.10")


print("\\nPM takeaway: present the roadmap as a portfolio of bets,")
print("not a deterministic list. Confidence numbers force honest prioritization.")
`,
  },

  interview: { question: 'How do you plan a product roadmap when the underlying AI capabilities change every few months?', answer: `The three-horizon model adapted for AI uncertainty.<br><br><strong>Horizon 1 (0\u20143 months):</strong> This is committed work built on validated model capabilities. I run our eval suite against current models and only commit features we can ship with today\u2019s performance. These have dates, owners, and success metrics.<br><br><strong>Horizon 2 (3\u20149 months):</strong> These are contingent on specific capability improvements. Each item has a model capability gate \u2014 like \u201crequires less than 2% hallucination rate on legal documents\u201d or \u201crequires sub-200ms TTFT for real-time features.\u201d When a new model releases, I run our eval suite against these gates. If a gate passes, the feature moves to H1 with a sprint commitment. This turns model releases into roadmap acceleration events rather than disruptions.<br><br><strong>Horizon 3 (9\u201418 months):</strong> Strategic bets. \u201cIf multi-modal models can reliably process video, we\u2019ll build X.\u201d These are directional, not promises. I communicate them as options, not commitments.<br><br><strong>The deprecation process matters as much as the roadmap.</strong> I budget 1\u20132 sprint cycles per quarter specifically for model migration testing. When a provider announces a deprecation, we have a runbook: evaluate the new version, identify regressions, communicate changes to customers, and migrate deliberately. The PM who doesn\u2019t budget for model migrations ships a broken product when a deprecation deadline hits.` },
  pmAngle: 'The three-horizon roadmap with explicit model dependency gates is the highest-signal artifact you can produce as an AI PM. It shows you understand that AI product planning requires absorbing external capability changes, not just internal execution. The PM who reviews the roadmap monthly against new model releases ships features faster than the one locked into a quarterly plan.',
  resources: [
    { type: 'DOCS', title: 'Anthropic Model Deprecations', url: 'https://docs.anthropic.com/en/docs/resources/model-deprecations', note: 'Track Claude model deprecation timelines. Essential for roadmap planning.' },
    { type: 'DOCS', title: 'Anthropic API Versioning', url: 'https://docs.anthropic.com/en/api/versioning', note: 'How API version headers and model strings work.' },
    { type: 'BLOG', title: 'Lenny\u2019s Newsletter: AI Roadmapping', url: 'https://www.lennysnewsletter.com/', note: 'How top AI PMs structure roadmaps under uncertainty.' },
    { type: 'TOOL', title: 'Artificial Analysis', url: 'https://artificialanalysis.ai/', note: 'Track model capabilities to inform Horizon 2 planning gates.' },
    { type: 'DOCS', title: 'OpenAI Model Deprecations', url: 'https://platform.openai.com/docs/deprecations', note: 'Competitive awareness: know deprecation timelines across providers.' }
  ]
};
