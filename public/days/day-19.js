// Day 19 — Responsible Scaling Policy (RSP)
// Updated: March 2026
// Review changes:
// - Updated RSP to current version (2024 update)
// - Added autonomous replication and cyberoffense as ASL-3 triggers
// - Added Anthropic's formal commitments to UKAIS, EU AI Office, US initiatives
// - Added task: Compare RSP to EU AI Act GPAI requirements
// - Added multi-layer governance context (RSP + AWS/Google safety policies)
// - Added Claude 4 series evaluated as ASL-2 (now historical fact)
// - Added GitHub commit task structure
// - Preserved: RSP content is the strongest safety day in the course

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

window.COURSE_DAY_DATA[19] = {
  subtitle: 'Anthropic\u2019s commitment to slow down before AI becomes dangerous \u2014 and why that commitment sells to enterprise buyers.',

  context: `<p>Anthropic\u2019s <strong>Responsible Scaling Policy (RSP)</strong> is a self-imposed commitment that ties commercial deployment to safety evaluations. It defines <strong>AI Safety Levels (ASL)</strong>: <strong>ASL-1</strong> (clearly not dangerous, like a chess AI), <strong>ASL-2</strong> (current deployed models \u2014 potentially useful for harm but below meaningful uplift threshold), <strong>ASL-3</strong> (models that could provide meaningful assistance to mass-casualty attacks with CBRN weapons, enable autonomous replication and self-improvement, or provide large-scale cyberoffense capabilities), and <strong>ASL-4</strong> (not yet precisely defined, implies capabilities requiring nation-state-level safeguards). Anthropic published an updated RSP in 2024 with more specific evaluation criteria and capability thresholds for each level.</p>
  <p>The practical mechanism: before deploying a new model, Anthropic runs <strong>capability evaluations</strong> testing for dangerous capabilities \u2014 CBRN uplift, autonomous replication, and cyberoffense at scale. If a model passes these evaluations (doesn\u2019t exhibit dangerous capabilities at threshold levels), it deploys. All deployed Claude 4.x models have been evaluated as ASL-2 \u2014 this is now verifiable historical fact, not just a forward-looking commitment. The RSP explicitly states Anthropic will slow down or stop deployment if models approach ASL-3 thresholds without adequate safeguards in place.</p>
  <p><strong>Beyond the self-imposed RSP:</strong> By 2025, Anthropic has made formal commitments to external bodies that are more binding than internal policy: commitments to the <strong>UK AI Safety Institute (UKAIS)</strong> for pre-deployment testing, <strong>EU AI Office</strong> compliance with GPAI provisions under the AI Act, and <strong>US federal AI safety initiatives</strong>. These formal commitments add accountability beyond self-regulation. For enterprise customers in government, healthcare, or financial services, these external commitments provide additional assurance that Anthropic\u2019s safety posture is verified by third parties.</p>
  <p><strong>Multi-layer governance</strong> matters for enterprise sales. An enterprise deploying Claude via AWS Bedrock is subject to three governance layers: Anthropic\u2019s RSP, Amazon\u2019s responsible AI policies, and the enterprise\u2019s own AI governance framework. This stacking is actually a selling point for regulated industries: multiple independent oversight layers reduce the surface area for uncontrolled risk. The PM who can explain this multi-layer model in a CISO conversation is more credible than one who only knows Anthropic\u2019s layer.</p>`,

  tasks: [
    {
      title: 'Read and summarize the RSP',
      description: 'Read the current RSP at anthropic.com/responsible-scaling-policy. Write 3 bullet points on the biggest implications for a PM building on Claude. Which ASL level are current Claude models at? What would trigger a deployment pause? Save as /day-19/rsp_summary.md.',
      time: '25 min'
    },
    {
      title: 'Map your product to the RSP',
      description: 'Choose a hypothetical AI product (legal, medical, security research, HR screening). Identify which features might trigger RSP review. How would you design guardrails? Which features are clearly ASL-2 safe? Where are the gray areas? Save as /day-19/product_safety_mapping.md.',
      time: '20 min'
    },
    {
      title: 'Compare RSP to EU AI Act GPAI requirements',
      description: 'The EU AI Act\u2019s GPAI provisions (effective August 2025) require providers of foundation models above 10^25 FLOPs to provide technical documentation, adversarial testing results, and incident reporting. How do these overlap with the RSP? Where do they diverge? What does this mean for enterprise customers in EU-regulated industries? Save as /day-19/rsp_vs_eu_ai_act.md.',
      time: '20 min'
    },
    {
      title: 'Write the enterprise safety pitch',
      description: 'Write a 200-word pitch for a CISO at a healthcare company: why should they trust Claude for processing patient data? Reference specific commitments: RSP, SOC 2 Type II, HIPAA eligibility, UKAIS testing, EU AI Office compliance. Explain the multi-layer governance model (Anthropic + cloud provider + enterprise). Save as /day-19/enterprise_safety_pitch.md.',
      time: '15 min'
    }
  ],

  codeExample: {
    title: 'RSP capability threshold checker — Python',
    lang: 'python',
    code: `# Day 19 — Responsible Scaling Policy (RSP) Capability Threshold Checker
#
# Anthropic's Responsible Scaling Policy assigns models AI Safety Levels
# (ASLs) based on dangerous-capability evaluations: CBRN uplift, autonomy,
# cyber. A model that crosses an ASL threshold cannot deploy until matching
# safeguards exist. This script encodes a SIMPLIFIED version of that gate
# so a PM can see the mechanics — it is NOT the actual policy and is for
# pedagogy only. Read the real RSP at https://www.anthropic.com/rsp.

from dataclasses import dataclass, field
from typing import Dict, List

@dataclass
class CapabilityScore:
    cbrn_uplift:    float   # 0..1; expert-graded uplift to a non-expert
    autonomy:       float   # 0..1; can it complete a multi-week project?
    cyber:          float   # 0..1; offensive cyber capability
    self_replicate: float   # 0..1; can it acquire resources & persist?

# Toy thresholds — pedagogical, not the actual RSP numbers.
ASL_THRESHOLDS = {
    "ASL-2": CapabilityScore(0.30, 0.30, 0.30, 0.10),
    "ASL-3": CapabilityScore(0.55, 0.55, 0.55, 0.30),
    "ASL-4": CapabilityScore(0.75, 0.75, 0.75, 0.60),
    "ASL-5": CapabilityScore(0.90, 0.90, 0.90, 0.85),
}

REQUIRED_MITIGATIONS = {
    "ASL-2": ["usage_policies", "abuse_monitoring"],
    "ASL-3": ["red_team_program", "weight_security_v1", "deployment_misuse_evals"],
    "ASL-4": ["weight_security_v2", "internal_compartmentalization", "third_party_audit"],
    "ASL-5": ["weight_security_v3", "external_pause_authority", "frontier_govt_briefings"],
}

@dataclass
class ModelEvalResult:
    name: str
    scores: CapabilityScore
    mitigations_in_place: List[str] = field(default_factory=list)

def required_asl(scores: CapabilityScore) -> str:
    """Highest ASL whose threshold is crossed on ANY axis."""
    selected = "ASL-1"
    for level, t in ASL_THRESHOLDS.items():
        crossed = (scores.cbrn_uplift    >= t.cbrn_uplift   or
                   scores.autonomy       >= t.autonomy      or
                   scores.cyber          >= t.cyber         or
                   scores.self_replicate >= t.self_replicate)
        if crossed:
            selected = level
    return selected

def gating_decision(model: ModelEvalResult) -> Dict:
    asl = required_asl(model.scores)
    needed: List[str] = []
    for level, mits in REQUIRED_MITIGATIONS.items():
        if level <= asl:
            needed.extend(mits)
    missing = [m for m in needed if m not in model.mitigations_in_place]
    return {
        "model":     model.name,
        "asl":       asl,
        "needed":    needed,
        "missing":   missing,
        "deployable": len(missing) == 0,
    }

# --- Demo: three candidate models ---------------------------------------
candidates = [
    ModelEvalResult(
        name="claude-haiku-4-5-20251001",
        scores=CapabilityScore(0.20, 0.25, 0.22, 0.05),
        mitigations_in_place=["usage_policies", "abuse_monitoring"],
    ),
    ModelEvalResult(
        name="claude-sonnet-4-6",
        scores=CapabilityScore(0.45, 0.60, 0.40, 0.15),
        mitigations_in_place=["usage_policies", "abuse_monitoring",
                              "red_team_program", "weight_security_v1",
                              "deployment_misuse_evals"],
    ),
    ModelEvalResult(
        name="claude-opus-4-6",
        scores=CapabilityScore(0.62, 0.78, 0.58, 0.35),
        mitigations_in_place=["usage_policies", "abuse_monitoring",
                              "red_team_program", "weight_security_v1",
                              "deployment_misuse_evals"],
    ),
]

print("RSP gate (toy thresholds — see real RSP for actual numbers)\\n")
for m in candidates:
    d = gating_decision(m)
    print(f"Model       : {d['model']}")
    print(f"  Required ASL : {d['asl']}")
    print(f"  Mitigations  : {len(d['needed'])} required, "
          f"{len(d['needed']) - len(d['missing'])} in place")
    if d["missing"]:
        print(f"  MISSING      : {d['missing']}")
    print(f"  Deployable?  : {'YES' if d['deployable'] else 'NO — block release'}")
    print()

# --- Threshold table -----------------------------------------------------
print("ASL thresholds (toy):")
print(f"  {'level':6} {'cbrn':>6} {'auton':>7} {'cyber':>7} {'self_rep':>9}")
for level, t in ASL_THRESHOLDS.items():
    print(f"  {level:6} {t.cbrn_uplift:>6.2f} {t.autonomy:>7.2f} "
          f"{t.cyber:>7.2f} {t.self_replicate:>9.2f}")

print("\\nPM takeaway: the RSP is a product gate as much as a safety doc. "
      "If your launch slips because mitigations aren't ready, that IS the "
      "system working — and it is the most credible enterprise sales story "
      "Anthropic has against frontier-lab competitors.")
`,
  },

  interview: {
    question: 'What is Anthropic\u2019s RSP and how does it affect product decisions?',
    answer: `The RSP is Anthropic\u2019s framework that links deployment decisions to safety evaluations. It defines capability thresholds (ASL 1-4) and commits Anthropic to implementing specific safeguards before deploying models that exceed those thresholds. All Claude 4.x models currently deployed are evaluated as ASL-2.<br><br>For product decisions, it affects three things. First, <strong>feature scope:</strong> some capabilities might be technically possible but would require ASL-3 evaluation \u2014 meaning enhanced safeguards and longer review cycles. As a PM, I need to understand this before committing to a roadmap that depends on capabilities not yet cleared for deployment.<br><br>Second, <strong>enterprise positioning:</strong> the RSP is a competitive differentiator with risk-averse buyers. For banks, hospitals, and government agencies, a transparent safety policy with specific commitments \u2014 reinforced by formal agreements with the UK AI Safety Institute and EU AI Office \u2014 is a reason to choose Anthropic over providers without equivalent frameworks.<br><br>Third, <strong>multi-layer governance:</strong> enterprise buyers deploying Claude via Bedrock get three oversight layers: Anthropic\u2019s RSP, Amazon\u2019s responsible AI policies, and their own governance. This stacking is a selling point for regulated industries. The PM who can explain this in a CISO meeting closes deals that the PM who only knows "we do safety testing" does not.<br><br>Compare to OpenAI\u2019s Preparedness Framework: similar intent, different specificity. The RSP\u2019s public commitment to halt deployment at capability thresholds is more explicit.`
  },

  pmAngle: 'The RSP is not just a safety document \u2014 it\u2019s a product document and a sales tool. Understanding it lets you position Anthropic honestly with risk-averse enterprise buyers, design features aligned with safety commitments, and explain multi-layer governance to CISOs and compliance officers. By 2025, formal commitments to UKAIS and the EU AI Office add external accountability beyond self-regulation.',

  resources: [
    { type: 'BLOG', title: 'Anthropic Responsible Scaling Policy', url: 'https://www.anthropic.com/responsible-scaling-policy', note: 'The primary document. Read the full text \u2014 not summaries.' },
    { type: 'BLOG', title: 'OpenAI Preparedness Framework', url: 'https://cdn.openai.com/openai-preparedness-framework-beta.pdf', note: 'OpenAI\u2019s equivalent. Compare approaches for competitive analysis.' },
    { type: 'DOCS', title: 'Anthropic Security & Compliance', url: 'https://trust.anthropic.com', note: 'SOC 2 Type II, HIPAA, certifications. Essential for enterprise sales.' },
    { type: 'BLOG', title: 'Anthropic Safety Research', url: 'https://www.anthropic.com/research', note: 'Interpretability, evals, and red-teaming research informing the RSP.' },
    { type: 'DOCS', title: 'EU AI Act \u2014 GPAI Provisions', url: 'https://artificialintelligenceact.eu/', note: 'GPAI requirements effective August 2025. Applies to Claude as a foundation model.' },
    { type: 'DOCS', title: 'Anthropic Model Card', url: 'https://www.anthropic.com/model-card', note: 'Safety evaluations for each Claude model. References ASL determinations.' }
  ]
};
