// Day 32 — AI Product Strategy
// Updated: March 2026 | Review: four defensibilities, platform risk, open-source moat, vibe-coding implications

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[32] = {
  subtitle: 'How to write an AI product strategy that engineers respect and executives fund.',
  context: `<p>AI product strategy requires answering questions that don\u2019t exist in traditional product management. The four pillars of AI product defensibility: <strong>proprietary data</strong> (unique training or fine-tuning data competitors can\u2019t replicate), <strong>workflow integration</strong> (deep embedding in user workflows that creates switching costs), <strong>evaluation expertise</strong> (knowing how to measure quality in your domain better than anyone), and <strong>network effects</strong> (each user\u2019s data improving the product for all users). Most AI startups have at most one of these. The best have two or three.</p>
  <p><strong>The required strategy question every AI PM must answer: \u201cWhy won\u2019t OpenAI or Anthropic build this?\u201d</strong> If your product is a thin wrapper around an API call, the model provider can replicate it with a prompt template. Defensible AI products have at least one of: domain-specific data the model provider doesn\u2019t have, deep workflow integration the provider won\u2019t build, or regulatory/compliance expertise the provider can\u2019t easily acquire. If you can\u2019t answer this question convincingly, your strategy needs rework.</p>
  <p><strong>The open-source moat question:</strong> \u201cIf Meta releases a comparable model for free tomorrow, does your product survive?\u201d With Llama, Phi, and Mistral models approaching frontier quality for many tasks, any strategy that depends on model access as a moat is fragile. Your moat must be in the product layer \u2014 data, UX, workflow, evaluations \u2014 not the model layer. Products that survive open-source competition: those where the model is 20% of the value and the product is 80%.</p>
  <p><strong>Vibe-coding compresses time-to-competition.</strong> Tools like Lovable, Bolt, and v0 enable non-engineers to build functional prototypes in hours. Strategic implication: if your product\u2019s value is primarily in the UI/UX layer, a competitor can replicate it in days instead of months. This makes workflow integration, proprietary data, and domain expertise even more critical as defensibility \u2014 the code itself is no longer a meaningful barrier to entry.</p>
  <p><strong>The model dependency map</strong> remains essential for strategy. Document every model you depend on, which provider supplies it, what happens if pricing doubles, and your migration path to alternatives. Include: primary model (e.g., claude-sonnet-4-6 for core inference), secondary model (e.g., claude-haiku-4-5-20251001 for classification/routing), embedding model, and any fine-tuned models. This map should be a living document reviewed quarterly.</p>
  <p><strong>Build vs Buy vs Partner vs Open-Source</strong> is the updated decision framework. Build when you need full control and the capability is core to your product. Buy (API) when speed matters and the capability is commoditized. Partner when you need enterprise distribution. Open-source (self-host) when you need cost control at scale, data sovereignty, or freedom from provider lock-in. Most products use a hybrid: open-source for high-volume low-complexity tasks, frontier API for complex reasoning.</p>`,
  tasks: [
    { title: 'Write a defensibility audit', description: 'Pick an AI product you use (Cursor, Notion AI, Perplexity, etc.). Score it 1\u20145 on each of the four defensibility pillars: proprietary data, workflow integration, evaluation expertise, network effects. Where is it strongest? Where is it most vulnerable to OpenAI/Anthropic building a competitor? Save as /day-32/defensibility_audit.md.', time: '25 min' },
    { title: 'Answer the platform risk questions', description: 'For your product or a hypothetical AI product: write one-paragraph answers to (1) \u201cWhy won\u2019t OpenAI/Anthropic build this?\u201d (2) \u201cIf Meta releases a comparable model free, does the product survive?\u201d (3) \u201cIf our primary model provider doubles pricing, what\u2019s the migration plan?\u201d Be brutally honest. Save as /day-32/platform_risk_assessment.md.', time: '20 min' },
    { title: 'Create a model dependency map', description: 'Document every model dependency: primary inference model, secondary/routing model, embedding model, evaluation model. For each: provider, version string, fallback option, estimated monthly cost, and what breaks if it\u2019s unavailable. Save as /day-32/model_dependency_map.md.', time: '20 min' },
    { title: 'Build vs Buy vs Partner vs Open-Source matrix', description: 'For a vertical AI product (legal, healthcare, or finance): identify 5 key capabilities. For each, evaluate Build/Buy/Partner/Open-Source using criteria: control needed, speed to market, cost at scale, data sensitivity, and competitive differentiation. Present as a decision matrix. Save as /day-32/build_buy_matrix.md. Stage and commit your Day 31\u201332 work.', time: '15 min' }
  ],

  codeExample: {
    title: 'Strategy doc completeness scorer — Python',
    lang: 'python',
    code: `# Day 32 — AI product strategy doc completeness scorer
# Pedagogical goal: a fundable AI strategy answers WHY the model provider
# won't build it, WHY OSS won't kill it, and WHERE defensibility compounds.

from dataclasses import dataclass, field
from typing import Dict, List, Tuple


@dataclass
class Section:
    key: str
    title: str
    weight: int
    must_mention: List[str] = field(default_factory=list)


SECTIONS: List[Section] = [
    Section("problem", "Problem & user", 10, ["user", "pain", "today"]),
    Section("wedge", "Wedge & ICP", 10, ["icp", "wedge", "first 10 customers"]),
    Section("model_dep", "Model dependency map", 12, ["primary model", "fallback", "fine-tune", "eval"]),
    Section("provider_risk", "Why the model provider won't build this", 14, ["distribution", "vertical", "data", "workflow"]),
    Section("oss_risk", "Why open-source won't kill this", 14, ["latency", "compliance", "data", "fine-tune", "ops"]),
    Section("defensibility", "Defensibility that compounds", 14, ["data", "workflow", "integration", "switching cost"]),
    Section("metrics", "Success metrics", 10, ["acceptance", "cost per outcome", "hallucination"]),
    Section("risks", "Risks & mitigations", 8, ["model deprecation", "pricing", "regulation"]),
    Section("buy_build", "Build vs Buy vs Partner vs OSS", 8, ["build", "buy", "partner", "open-source"]),
]


@dataclass
class StrategyDoc:
    title: str
    body: Dict[str, str]   # section key -> prose


def score_section(section: Section, text: str) -> Tuple[int, List[str]]:
    if not text or len(text.strip()) < 80:
        return 0, [f"section too short (<80 chars)"]
    lower = text.lower()
    missing = [kw for kw in section.must_mention if kw not in lower]
    coverage = (len(section.must_mention) - len(missing)) / max(1, len(section.must_mention))
    raw = int(round(section.weight * coverage))
    notes = []
    if missing:
        notes.append("missing keywords: " + ", ".join(missing))
    if len(text) < 220:
        notes.append("thin: aim for 220+ chars")
    return raw, notes


def score_doc(doc: StrategyDoc) -> Dict:
    total = 0
    rows = []
    for s in SECTIONS:
        text = doc.body.get(s.key, "")
        got, notes = score_section(s, text)
        total += got
        rows.append((s.key, s.title, got, s.weight, notes))
    grade = "A" if total >= 90 else "B" if total >= 75 else "C" if total >= 60 else "F"
    return {"total": total, "grade": grade, "rows": rows}


# A realistic, partially-complete strategy for a vertical legal AI product.
draft = StrategyDoc(
    title="LexAgent — vertical AI for in-house legal teams",
    body={
        "problem": (
            "In-house legal teams today triage hundreds of contracts per quarter. "
            "The user is the AGC; the pain is the manual review queue."
        ),
        "wedge": (
            "ICP: post-Series-C SaaS in-house legal (5-25 lawyers). "
            "Wedge: NDA + DPA review. First 10 customers from existing legaltech network."
        ),
        "model_dep": (
            "Primary model claude-sonnet-4-6; fallback gpt-4o for capacity. "
            "Fine-tune a small classifier for clause typing. Eval harness with 3k labeled clauses."
        ),
        "provider_risk": (
            "Anthropic won't build a vertical legal workflow tool: distribution and data are wrong fit. "
            "We own the legal workflow surface, the ICP relationships, and the labeled clause corpus."
        ),
        "oss_risk": (
            "An open-weight Llama can match base capability, but compliance (SOC 2, BAA), "
            "data residency in EU, and the fine-tune on our clause corpus create a moat. "
            "Self-hosting OSS is not free for a 12-person legal team's ops budget."
        ),
        "defensibility": (
            "Compounds via labeled clause data, workflow integration with iManage/NetDocs, "
            "and switching cost through saved playbooks per customer."
        ),
        "metrics": (
            "Acceptance rate of clause flags >= 65%. Cost per outcome < $1.20 per contract. "
            "Hallucination rate < 0.5% on quarterly red-team set."
        ),
        "risks": "",   # intentionally missing to demonstrate scoring
        "buy_build": (
            "Build core review. Buy redaction (existing vendor). "
            "Partner on iManage integration. Open-source the eval harness."
        ),
    },
)

result = score_doc(draft)
print(f"=== Strategy: {draft.title} ===")
print(f"Score: {result['total']}/100   Grade: {result['grade']}")

print("\\n=== Section breakdown ===")
for key, title, got, wt, notes in result["rows"]:
    print(f"  [{got:>2}/{wt:>2}]  {title}")
    for n in notes:
        print(f"          - {n}")

print("\\n=== The three fundability questions ===")
checks = [
    ("Why won't the model provider build it?", "provider_risk"),
    ("Why won't open-source kill it?",         "oss_risk"),
    ("Where does defensibility compound?",     "defensibility"),
]
for q, k in checks:
    sec = next(s for s in SECTIONS if s.key == k)
    got, _ = score_section(sec, draft.body.get(k, ""))
    print(f"  [{got}/{sec.weight}]  {q}")

print("\\nPM takeaway: a strategy that scores < 75 is a description, not a strategy.")
`,
  },

  interview: { question: 'How would you evaluate whether to build an AI feature in-house vs using a third-party API?', answer: `I\u2019d evaluate across five dimensions.<br><br><strong>Strategic importance:</strong> Is this capability core to our product\u2019s value proposition? If yes, lean toward building. If it\u2019s a commodity capability (summarization, classification), buy via API. Core capabilities need control over quality, latency, and iteration speed that APIs constrain.<br><br><strong>Data sensitivity:</strong> Can we send this data to a third-party? Healthcare, legal, and financial data often can\u2019t leave our infrastructure. This pushes toward self-hosted open-source models (Llama, Phi) or on-premise deployment via AWS Bedrock in the customer\u2019s VPC.<br><br><strong>Scale economics:</strong> At what volume does self-hosting become cheaper? For most tasks, API is cheaper under ~1M requests/month. Beyond that, self-hosted open-source models on dedicated GPUs often win on cost. Calculate the crossover point.<br><br><strong>Iteration speed:</strong> Building takes months; buying takes days. For v1, almost always buy. For v2+, build the components where you need differentiation. The mistake is building everything from scratch for v1 and shipping 6 months late.<br><br><strong>The open-source factor:</strong> Before buying an API <em>or</em> building from scratch, check if an open-source model handles the task adequately. Self-hosted Llama for high-volume classification is often 10x cheaper than an API and gives you full data control.` },
  pmAngle: 'The AI product strategy that gets funded answers three questions clearly: why the model provider won\u2019t build it, why an open-source alternative won\u2019t kill it, and where the defensibility compounds over time. Most AI product strategies fail because they describe what the product does, not why it\u2019s defensible. Engineers respect strategy that acknowledges technical reality; executives fund strategy that shows compounding moats.',
  resources: [
    { type: 'BLOG', title: 'Anthropic: Building Effective AI Products', url: 'https://www.anthropic.com/research', note: 'How Anthropic thinks about product design with Claude.' },
    { type: 'BLOG', title: 'a16z: Who Owns the AI Value Chain?', url: 'https://a16z.com/who-owns-the-generative-ai-platform/', note: 'The application layer value capture debate.' },
    { type: 'TOOL', title: 'Artificial Analysis \u2014 Model Comparison', url: 'https://artificialanalysis.ai/', note: 'Compare model capabilities, pricing, and performance for strategy decisions.' },
    { type: 'BLOG', title: 'Sequoia: AI\u2019s $200B Question', url: 'https://www.sequoiacap.com/article/ais-600b-question/', note: 'The gap between AI infrastructure investment and revenue.' },
    { type: 'DOCS', title: 'Hugging Face Open LLM Leaderboard', url: 'https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard', note: 'Track open-source model capabilities for your strategy assessment.' }
  ]
};
