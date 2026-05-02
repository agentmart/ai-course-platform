// Day 14 — Fine-Tuning & Distillation
// Updated: March 2026
// Review changes:
// - Added LoRA/PEFT for open-source models context
// - Added 3-option decision tree: Claude fine-tune → open-weight LoRA → prompting
// - Added open-weight fine-tuning interview question preparation
// - Added synthetic data generation for fine-tuning
// - Updated Anthropic fine-tuning availability with honest status
// - Added threshold numbers caveat: task and model dependent
// - Added Phi-4 as LoRA fine-tuning target example
// - Added GitHub commit task structure

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

window.COURSE_DAY_DATA[14] = {
  subtitle: 'When to adapt a model vs when to prompt better \u2014 the decision tree now includes open-weight alternatives.',

  context: `<p><strong>Fine-tuning</strong> updates a model\u2019s weights on a curated training dataset to improve performance on a specific task. It\u2019s appropriate when: format consistency that\u2019s hard to achieve through prompting alone, domain-specific vocabulary that general models handle poorly, high-volume inference where a smaller fine-tuned model replaces a larger general one, or proprietary behavioral patterns that can\u2019t be exposed in a system prompt. Start with prompt engineering \u2014 the majority of production AI products are still prompt-engineered because it\u2019s faster, cheaper, and more maintainable. Fine-tune only when prompting hits a quality ceiling.</p>
  <p><strong>The decision tree has expanded.</strong> In 2024, the choice was binary: fine-tune a proprietary model or improve your prompts. In 2026, there are three options: (1) <strong>Prompt engineering first</strong> \u2014 fastest, cheapest, most maintainable; (2) <strong>Fine-tune Claude via AWS Bedrock</strong> if you need Anthropic\u2019s safety guarantees and enterprise SLAs (verify current fine-tuning availability at <a href="https://docs.anthropic.com" target="_blank">docs.anthropic.com</a>); (3) <strong>Fine-tune an open-weight model with LoRA</strong> (Llama 4, Phi-4, Mistral) if data privacy is the primary constraint \u2014 no data leaves your environment. All three options are legitimate. Know all three.</p>
  <p><strong>LoRA (Low-Rank Adaptation)</strong> is the dominant fine-tuning technique for open-source models. It adds small trainable adapter layers to a frozen base model, making fine-tuning dramatically cheaper and faster: Phi-4 (14B parameters) can be LoRA fine-tuned on a single A100 GPU in hours. This is now a real alternative to proprietary API solutions for some use cases. When an enterprise asks "can we fine-tune Llama 4 on our proprietary data instead of paying for Claude API?", LoRA makes that not only possible but cheap. The PM answer: "Yes, and here\u2019s when to choose each option" \u2014 not "that\u2019s not possible."</p>
  <p><strong>Distillation</strong> trains a smaller model to mimic a larger one using synthetic training data from the teacher\u2019s outputs. OpenAI explicitly supports distillation: GPT-4o outputs \u2192 fine-tune GPT-4o-mini. This gives large-model quality at small-model inference cost. <strong>Synthetic data generation</strong> \u2014 using Claude or GPT-4o to generate high-quality training examples \u2014 is now a standard production pattern, more cost-effective than human labeling for many use cases.</p>
  <p>Data quality matters enormously more than quantity. Threshold guidelines (50 examples minimum, 500-1000 for reliable improvement) are <em>rough approximations that vary significantly by task type and model</em>. Don\u2019t present them as universal rules \u2014 always benchmark your specific task and model combination. Budget 80% of effort on data curation and quality, 20% on the actual fine-tuning process.</p>`,

  tasks: [
    {
      title: 'Fine-tuning decision audit: 3-option framework',
      description: 'Identify 3 AI product features where better model performance is needed. For each, evaluate all three options: (1) improved prompt engineering, (2) fine-tune Claude via Bedrock, (3) LoRA fine-tune Llama 4 or Phi-4. Which wins and why? Consider: data sensitivity, required safety guarantees, maintenance burden, and cost. Save as /day-14/finetune_decision_audit.md.',
      time: '25 min'
    },
    {
      title: 'Design a data collection workflow',
      description: 'You want to fine-tune a model for customer support at a SaaS company. Design the workflow: how do you identify good examples from existing tickets? Who reviews quality? What JSONL format do you use? Also: design a synthetic data generation approach using Claude to create additional training examples. Save as /day-14/data_collection_workflow.md.',
      time: '25 min'
    },
    {
      title: 'Fine-tune vs prompt comparison',
      description: 'Take a task where format consistency matters (e.g., writing product changelog entries in a specific style). Write a detailed system prompt with 3-5 few-shot examples. Then design what a fine-tuning dataset for the same task would look like (10 example pairs). Which approach gives better results with less ongoing maintenance? Save as /day-14/finetune_vs_prompt_comparison.md.',
      time: '20 min'
    },
    {
      title: 'Prepare the open-weight fine-tuning interview answer',
      description: 'Write a 200-word answer to: "We have 10,000 proprietary customer service transcripts. Should we fine-tune Claude, fine-tune Llama 4, or just prompt engineer?" Your answer must address all three options with specific prerequisites for each (data volume, privacy requirements, safety needs, cost). Save as /day-14/open_weight_finetune_answer.md.',
      time: '10 min'
    }
  ],

  codeExample: {
    title: 'Fine-tune vs prompt vs open-weight calculator — Python',
    lang: 'python',
    code: `# Day 14 — Fine-Tune vs Prompt vs Open-Weight LoRA Decision Calculator
#
# In 2026 the model-adaptation question is no longer two-way. The full
# answer covers three options and a PM should be able to defend a pick on
# cost, quality, latency, IP control, and time-to-first-value.
#
# This script scores the three options on a per-use-case weight vector and
# also runs a 12-month TCO comparison so the recommendation has a number
# attached, not just a vibe.

from dataclasses import dataclass
from typing import Dict

@dataclass
class Option:
    name: str
    quality:        float   # 0..10  on the target task post-adaptation
    latency_p95_ms: int
    setup_weeks:    float
    fixed_setup_usd:    float    # one-time engineering + compute
    monthly_run_usd_at_1m_calls: float

OPTIONS = {
    "prompt": Option(
        name="Prompt engineering on claude-sonnet-4-6",
        quality=7.8, latency_p95_ms=900, setup_weeks=1.0,
        fixed_setup_usd=8_000, monthly_run_usd_at_1m_calls=18_000,
    ),
    "ft_proprietary": Option(
        name="Proprietary fine-tune (Anthropic / OpenAI hosted)",
        quality=8.7, latency_p95_ms=950, setup_weeks=4.0,
        fixed_setup_usd=45_000, monthly_run_usd_at_1m_calls=22_000,
    ),
    "lora_open": Option(
        name="Open-weight LoRA (Llama 3.x, self-hosted)",
        quality=8.4, latency_p95_ms=600, setup_weeks=8.0,
        fixed_setup_usd=120_000, monthly_run_usd_at_1m_calls=9_500,
    ),
}

def normalized(value: float, lo: float, hi: float, invert: bool = False) -> float:
    if hi == lo: return 0.5
    n = (value - lo) / (hi - lo)
    return 1.0 - n if invert else n

def score(opt: Option, weights: Dict[str, float]) -> float:
    qs = [o.quality for o in OPTIONS.values()]
    ls = [o.latency_p95_ms for o in OPTIONS.values()]
    ss = [o.setup_weeks for o in OPTIONS.values()]
    cs = [o.monthly_run_usd_at_1m_calls for o in OPTIONS.values()]
    parts = {
        "quality":   normalized(opt.quality,        min(qs), max(qs)),
        "latency":   normalized(opt.latency_p95_ms, min(ls), max(ls), invert=True),
        "speed_ttv": normalized(opt.setup_weeks,    min(ss), max(ss), invert=True),
        "run_cost":  normalized(opt.monthly_run_usd_at_1m_calls, min(cs), max(cs), invert=True),
    }
    return round(sum(parts[k] * weights.get(k, 0.0) for k in parts), 3)

def tco_12mo(opt: Option, monthly_calls_millions: float) -> float:
    return opt.fixed_setup_usd + opt.monthly_run_usd_at_1m_calls * monthly_calls_millions * 12

# --- Use-case weight profiles -------------------------------------------
PROFILES = {
    "PROTOTYPE  (speed-to-first-value first)":
        {"quality": 0.20, "latency": 0.10, "speed_ttv": 0.50, "run_cost": 0.20},
    "REGULATED  (compliance + quality first)":
        {"quality": 0.50, "latency": 0.10, "speed_ttv": 0.10, "run_cost": 0.30},
    "PRIVACY    (data residency + cost at scale)":
        {"quality": 0.30, "latency": 0.20, "speed_ttv": 0.10, "run_cost": 0.40},
}

print("Option scoring per use-case profile\\n")
for profile_name, w in PROFILES.items():
    print(f"### {profile_name}")
    print(f"  weights: {w}")
    ranked = sorted(OPTIONS.values(), key=lambda o: score(o, w), reverse=True)
    for i, opt in enumerate(ranked, 1):
        print(f"  {i}. {opt.name:48} score={score(opt, w):.3f}")
    print()

# --- 12-month TCO sweep -------------------------------------------------
print(f"{'Volume (M calls/mo)':>22}  " +
      "  ".join(f"{k:>16}" for k in OPTIONS))
print("-" * 80)
for vol in (0.1, 0.5, 1.0, 5.0, 20.0):
    row = [f"{tco_12mo(o, vol):>16,.0f}" for o in OPTIONS.values()]
    print(f"{vol:>22.1f}  " + "  ".join(row))

# --- Headline recommendation per profile --------------------------------
print("\\nHeadline recommendation (highest-scoring option per profile):")
for profile_name, w in PROFILES.items():
    best = max(OPTIONS.values(), key=lambda o: score(o, w))
    print(f"  {profile_name[:11]} -> {best.name}")

print("\\nPM takeaway: the right answer is rarely 'fine-tune'. Prompt first, "
      "fine-tune only when prompt+RAG plateaus, and reach for open-weight "
      "LoRA only when data residency or run-cost at scale demands it.")
`,
  },

  interview: {
    question: 'A customer wants their AI to always respond in their brand voice. Should you fine-tune or prompt engineer?',
    answer: `The 2026 answer has three options, not two. Start with prompting, escalate to fine-tuning only if prompting fails, and choose the right fine-tuning target.<br><br><strong>Option 1 \u2014 Prompt engineering (try first):</strong> A well-crafted system prompt with 3-5 brand voice examples (few-shot) achieves remarkable consistency for most use cases. You can iterate in minutes, the style guide is directly visible, and brand voice changes don\u2019t require retraining. Try this for 2 weeks before considering fine-tuning. If you achieve 90%+ brand consistency, you\u2019re done.<br><br><strong>Option 2 \u2014 Fine-tune Claude via Bedrock:</strong> If prompting hits a quality ceiling on highly distinctive voice (unusual tone, specific jargon, strict formatting), fine-tune on 200-500 brand-aligned examples. This gives better consistency and removes style instructions from the system prompt (reducing per-call cost at high volume). Choose this when you need Anthropic\u2019s safety guarantees and compliance (SOC 2, HIPAA eligibility).<br><br><strong>Option 3 \u2014 LoRA fine-tune Llama 4 or Phi-4:</strong> Choose this when data privacy is the primary constraint \u2014 the customer\u2019s brand content never leaves their environment. LoRA on Phi-4 (14B params) runs on a single GPU. Trade-off: you lose Anthropic\u2019s safety training and enterprise SLAs.<br><br>My recommendation: prompt engineering first (90% of the time it\u2019s enough), then choose fine-tuning target based on the customer\u2019s primary constraint \u2014 safety/compliance or data privacy.`
  },

  pmAngle: 'The fine-tune vs prompt decision is asked in every AI PM interview. In 2026, the complete answer includes three options: prompt engineering (default), proprietary fine-tune (compliance-first), and open-weight LoRA (privacy-first). The PM who only knows the first two is missing the option that many enterprise buyers will ask about. Know all three.',

  resources: [
    { type: 'DOCS', title: 'OpenAI Fine-tuning Guide', url: 'https://platform.openai.com/docs/guides/fine-tuning', note: 'Most comprehensive public fine-tuning guide. Includes distillation workflow.' },
    { type: 'DOCS', title: 'Anthropic Fine-tuning (verify availability)', url: 'https://docs.anthropic.com', note: 'Check current fine-tuning availability. Status changes \u2014 verify before claiming.' },
    { type: 'PAPER', title: 'LoRA Paper', url: 'https://arxiv.org/abs/2106.09685', note: 'Low-Rank Adaptation: the dominant open-source fine-tuning technique.' },
    { type: 'PAPER', title: 'Phi-4 Technical Report', url: 'https://arxiv.org/abs/2412.08905', note: 'Microsoft\u2019s 14B model. LoRA fine-tunable on single GPU. Enterprise alternative.' },
    { type: 'DOCS', title: 'AWS Bedrock Fine-tuning', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/custom-models.html', note: 'Enterprise Claude fine-tuning via Bedrock. Different options than direct API.' },
    { type: 'PAPER', title: 'Knowledge Distillation Survey', url: 'https://arxiv.org/abs/2006.05525', note: 'Comprehensive distillation techniques survey.' }
  ]
};
