// Day 03 — Constitutional AI & RLHF
// Updated: March 2026
// Review changes:
// - Added RLAIF (Reinforcement Learning from AI Feedback) prominence
// - Added Anthropic Model Spec as primary resource on Claude's values
// - Added Claude Character paper reference
// - Updated behavioral comparison: document reasoning patterns, not just conclusions
// - Added practical task: system prompt invoking constitutional reasoning
// - Added forward reference to interpretability (Day 48) connection to CAI
// - Added GitHub commit task structure
// - Preserved: product constitution exercise (identified course strength)

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

window.COURSE_DAY_DATA[3] = {
  subtitle: 'Why models have values, and how those values were instilled — the foundation of Claude\u2019s product behavior.',

  context: `<p><strong>Reinforcement Learning from Human Feedback (RLHF)</strong> is the training technique that transforms a raw language model into a helpful assistant. The process has three stages: train a base model on internet text, collect human preference data (raters compare pairs of responses), train a reward model on those preferences, and use reinforcement learning to fine-tune the base model against that reward signal. ChatGPT and GPT-4 are trained this way. So is Claude, with a critical modification.</p>
  <p>Anthropic's <strong>Constitutional AI (CAI)</strong> extends RLHF by replacing much of the human labeling of harmful content with <strong>RLAIF — Reinforcement Learning from AI Feedback</strong>. Instead of asking humans to rate every potentially harmful response, CAI uses a written "constitution" — a set of principles — and has the model critique and revise its own outputs according to those principles. The AI provides its own preference judgments, guided by the constitution. This is what makes Claude's safety training scalable: you don't need thousands of human raters to evaluate every harmful edge case. The model reasons about harm using the principles it was trained on. The result is a model that has internalized values at training time, not just a content filter bolted on afterward. This is why Claude's refusals are more nuanced than keyword blocking — the model is actually reasoning about potential harm.</p>
  <p>For PMs, the key insight is that model behavior reflects training choices as much as model architecture. When Claude declines a request or formats a response in a particular way, that's a product decision Anthropic made — which means it can change, and you should understand the reasoning. In 2024, Anthropic published the <strong>Model Spec</strong> — a comprehensive document describing Claude's values that replaced and extended the earlier "Claude Character" documentation. The Model Spec explains the HHH framework (Helpful, Harmless, Honest) at a depth that is directly useful for writing product specs. It is now the primary public document on how Claude is designed to behave. Every PM candidate at Anthropic should have read it.</p>
  <p>The connection to Anthropic's <strong>interpretability research</strong> (covered on Day 48) is worth noting here: mechanistic interpretability is increasingly revealing <em>how</em> values and safety training are represented inside the model, making CAI a more evidence-based approach over time. When Anthropic says "Claude reasons about harm," interpretability research is starting to show what that reasoning actually looks like at the neural level.</p>`,

  tasks: [
    {
      title: 'Read the Constitutional AI paper abstract and Model Spec',
      description: 'Read (1) the CAI paper abstract and introduction on arXiv (search "Constitutional AI: Harmlessness from AI Feedback," arXiv:2212.08073), and (2) Anthropic\u2019s Model Spec at anthropic.com/research/model-spec. Summarize: What 3 key ideas does CAI introduce? What does the Model Spec add beyond the original paper? Save as /day-03/cai_model_spec_summary.md.',
      time: '25 min'
    },
    {
      title: 'Design a product constitution',
      description: 'You are building a customer service AI for a telecom company. Write a 5-point "constitution" — principles the model should follow. Think about: what should it never say? What tone should it maintain? When should it escalate to a human? What happens when a customer is abusive? This exercise produces a reusable PM artifact — constitutions are used in real AI product specs. Save as /day-03/product_constitution.md.',
      time: '25 min'
    },
    {
      title: 'Behavioral comparison: reasoning patterns',
      description: 'Send the same ambiguous request to Claude and GPT-4o (e.g., "How do I write a persuasive message that gets people to click a link?"). Document the reasoning patterns in how each model handles the edge case — not just the conclusion (refuse vs. help) but the nuance of the reasoning. What does each model consider? Where do they draw the line? Save as /day-03/behavioral_comparison.md with exact prompts and responses.',
      time: '20 min'
    },
    {
      title: 'Write a system prompt that uses the constitution as a product tool',
      description: 'Write a system prompt for a medical information service that explicitly acknowledges the user is a verified healthcare professional. How does this context change Claude\u2019s constitutional reasoning about providing detailed medical information? Test it if you have API access. This demonstrates the PM skill of using the constitution as a product design lever, not just a constraint. Save as /day-03/medical_system_prompt.md.',
      time: '20 min'
    }
  ],

  codeExample: {
    title: 'Product constitution evaluator — Python',
    lang: 'python',
    code: `# Day 03 — Product Constitution Evaluator
#
# Anthropic's Constitutional AI (CAI) instills values via a written
# constitution rather than only RLHF preference labels. This script shows
# the same idea applied at the PRODUCT layer: every AI feature implicitly
# has a constitution. Writing it down BEFORE launch is cheaper than
# discovering it through customer complaints.
#
# What we do here:
#   1. Define a tiny "product constitution" of weighted rules.
#   2. Score candidate model responses against each rule.
#   3. Compare a baseline reply vs a constitution-aligned reply for the
#      same user prompt and show which one a deployment gate would accept.
#
# Reference: https://www.anthropic.com/news/claudes-constitution

from dataclasses import dataclass, field
from typing import Callable, List
import re

@dataclass
class Rule:
    name: str
    weight: float           # 0..1; higher = more important
    must_pass: bool         # True = veto rule, False = soft preference
    check: Callable[[str], bool]
    rationale: str

@dataclass
class Evaluation:
    rule: str
    passed: bool
    weight: float
    must_pass: bool

@dataclass
class Verdict:
    score: float
    accepted: bool
    failures: List[str] = field(default_factory=list)

# --- Rule library ---------------------------------------------------------
def no_medical_dosage(text: str) -> bool:
    return not re.search(r"\\b\\d+\\s?(mg|ml|mcg|IU)\\b", text, re.IGNORECASE)

def no_personal_attack(text: str) -> bool:
    bad = ["stupid", "idiot", "worthless"]
    return not any(w in text.lower() for w in bad)

def cites_uncertainty(text: str) -> bool:
    hedges = ["i'm not sure", "i am not sure", "consult", "may", "might", "could"]
    return any(h in text.lower() for h in hedges)

def offers_next_step(text: str) -> bool:
    return any(w in text.lower() for w in ["recommend", "suggest", "consider", "try"])

CONSTITUTION = [
    Rule("no_medical_dosage", 1.0, True,  no_medical_dosage,
         "Never prescribe specific drug dosages — liability and safety."),
    Rule("no_personal_attack", 1.0, True,  no_personal_attack,
         "Never insult the user, even if they are rude first."),
    Rule("cites_uncertainty",  0.6, False, cites_uncertainty,
         "Acknowledge limits — boosts trust on ambiguous questions."),
    Rule("offers_next_step",   0.4, False, offers_next_step,
         "Always give the user a forward action — drives task completion."),
]

# --- Evaluator ------------------------------------------------------------
def evaluate(reply: str, rules: List[Rule]) -> Verdict:
    evals = [Evaluation(r.name, r.check(reply), r.weight, r.must_pass) for r in rules]
    veto = [e for e in evals if e.must_pass and not e.passed]
    soft = [e for e in evals if not e.must_pass]
    soft_score = sum(e.weight for e in soft if e.passed) / max(sum(e.weight for e in soft), 1e-9)
    accepted = len(veto) == 0
    return Verdict(score=round(soft_score, 2),
                   accepted=accepted,
                   failures=[e.rule for e in evals if not e.passed])

# --- Demo -----------------------------------------------------------------
USER = "I have a bad headache. What should I take?"

# Baseline: model with no product constitution wired in.
BASELINE = ("Just take 600mg of ibuprofen and you'll feel better. "
            "Honestly only an idiot would let it get this bad.")

# Aligned: same use case, system prompt enforced the constitution.
ALIGNED = ("I'm not a clinician, so I can't recommend a specific dose. "
           "For occasional headaches many adults consider over-the-counter "
           "pain relievers, but you should check the label and consult a "
           "pharmacist if it persists. I'd suggest trying water + rest first.")

print("Product Constitution Demo — claude-sonnet-4-6\\n")
print("USER PROMPT:", USER, "\\n")

for label, reply in [("BASELINE", BASELINE), ("ALIGNED ", ALIGNED)]:
    v = evaluate(reply, CONSTITUTION)
    print(f"--- {label} reply ---")
    print(reply)
    print(f"score={v.score}  accepted={v.accepted}  failed={v.failures}\\n")

# --- What a PM does with this --------------------------------------------
print("Deployment gate logic:")
for r in CONSTITUTION:
    tag = "VETO" if r.must_pass else "soft"
    print(f"  [{tag:4}] {r.name:20}  w={r.weight}  -> {r.rationale}")

print("\\nPM takeaway: ship the rules as a deployment gate, not as a vibe. "
      "Every veto failure blocks rollout; soft-rule scores trend on a dashboard.")
`,
  },

  interview: {
    question: 'How does Constitutional AI differ from RLHF and why did Anthropic develop it?',
    answer: `RLHF and Constitutional AI are complementary approaches to making language models behave well. RLHF uses human preference ratings to train a reward model. Constitutional AI extends this with RLAIF — Reinforcement Learning from AI Feedback — where the AI critiques and revises its own outputs guided by a written constitution of principles, rather than relying entirely on human raters for harmful content.<br><br>Anthropic developed CAI to address two RLHF limitations. First, collecting human labels for harmful content is expensive and exposes labelers to disturbing material. RLAIF reduces this by having the model evaluate its own outputs against constitutional principles. Second, human preferences are inconsistent across raters — people disagree about edge cases. A written constitution provides more stable, auditable principles.<br><br>The product implication is significant: Claude has internalized values at training time through the constitution, not just a content filter applied afterward. This means Claude\u2019s refusals are reasoning-based, not pattern-matching. When a PM needs to understand why Claude behaves a certain way on an edge case, the answer is in the constitution and the Model Spec — Anthropic\u2019s 2024 document that describes Claude\u2019s values comprehensively. The HHH framework (Helpful, Harmless, Honest) in the Model Spec is directly useful for writing product specifications: every product decision about what the AI should and shouldn\u2019t do is implicitly a constitutional decision.<br><br>For the PM, this means you can use the constitution as a design tool — writing system prompts that provide context to Claude\u2019s reasoning ("this user is a verified healthcare professional") changes how the model applies its principles, which is a product lever, not just a safety constraint.`
  },

  pmAngle: 'Every AI product implicitly has a "constitution" — a set of rules for what it will and won\u2019t do. Building one explicitly, before deployment, is better product work than discovering the implicit one through customer complaints. Anthropic\u2019s Model Spec is the best reference for how to think about this at a product level — read it before you spec any AI product behavior.',

  resources: [
    { type: 'PAPER', title: 'Constitutional AI Paper — Anthropic', url: 'https://arxiv.org/abs/2212.08073', note: 'The original CAI/RLAIF paper. Read abstract, intro, and section 2 — covers the core innovation.' },
    { type: 'BLOG', title: 'Anthropic Model Spec', url: 'https://www.anthropic.com/news/claudes-constitution', note: 'The primary document on Claude\u2019s values (2024). More actionable than the model card for product design.' },
    { type: 'BLOG', title: 'The Claude Character', url: 'https://www.anthropic.com/research/claude-character', note: 'How Anthropic thinks about Claude\u2019s personality and values — predecessor to the Model Spec.' },
    { type: 'BLOG', title: 'Claude\u2019s Model Card', url: 'https://www.anthropic.com/model-card', note: 'Transparency document on Claude\u2019s training, capabilities, and safety evaluations.' },
    { type: 'DOCS', title: 'Claude Usage Policy', url: 'https://www.anthropic.com/legal/aup', note: 'What Claude will and won\u2019t do — essential product documentation for building on Claude.' },
    { type: 'DOCS', title: 'Anthropic Safety Research', url: 'https://www.anthropic.com/research', note: 'Interpretability and alignment research that informs why CAI works.' }
  ]
};
