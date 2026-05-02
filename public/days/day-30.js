// Day 30 — Enterprise AI Integration
// Updated: March 2026 | Review: updated certifications, MCP for enterprise, integration timeline fix

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[30] = {
  subtitle: 'What enterprise AI buyers actually care about \u2014 and how to sell to them.',
  context: `<p>Enterprise AI integration is a different discipline from consumer AI or developer API products. The three-layer concern framework: <strong>security</strong> (data handling, certifications, access control), <strong>integration</strong> (connecting to existing systems), and <strong>change management</strong> (organizational adoption). Security review is typically the longest gatekeeper \u2014 expect 2-6 months for enterprise security evaluation. Build this into your launch timeline.</p>
  <p><strong>Anthropic\u2019s enterprise security posture</strong> has strengthened significantly. Current certifications (verify at <a href="https://trust.anthropic.com" target="_blank">anthropic.com/security</a>): SOC 2 Type II, HIPAA eligibility, GDPR compliance, zero-data-retention options. For European enterprises, Claude on AWS Bedrock in EU regions solves data residency \u2014 the recommendation to use Bedrock for European customers is still correct, with expanded region availability.</p>
  <p><strong>MCP as the enterprise integration layer:</strong> By 2025-2026, there are official MCP servers for GitHub, GitLab, Jira, Confluence, and other enterprise systems, plus community servers for Salesforce, HubSpot, and more. Integration timelines have improved dramatically: <strong>connecting to enterprise systems via existing MCP servers takes days to weeks, not the 3-6 months per integration cited in earlier course versions.</strong> Before building a custom integration, always check the <a href="https://github.com/modelcontextprotocol/servers" target="_blank">MCP server registry</a>. This is the single biggest time-saver for enterprise AI product teams.</p>
  <p>Enterprise-native AI platforms (Salesforce Einstein, ServiceNow AI, Microsoft Copilot for M365) have matured significantly and are now serious alternatives to custom Claude deployments for enterprises already in those ecosystems. A PM should understand when to recommend building on Claude vs integrating with the platform\u2019s native AI \u2014 the answer depends on customization needs, safety requirements, and switching costs.</p>`,
  tasks: [
    { title: 'Design enterprise security checklist', description: 'Write a 10-question security assessment for an enterprise evaluating Claude. Include: data residency, certifications (SOC 2, HIPAA), encryption at rest/transit, access control, audit logging, incident response. Save as /day-30/enterprise_security_checklist.md.', time: '25 min' },
    { title: 'Enterprise integration audit', description: 'For a vertical (legal, healthcare, or financial services): list the 5 most critical system integrations. For each: check if an MCP server exists, estimate integration effort, and identify the security requirements. Save as /day-30/integration_audit.md.', time: '20 min' },
    { title: 'Data residency options', description: 'Map deployment options for a European enterprise: Claude direct API, AWS Bedrock (EU regions), Google Vertex AI. For each: data residency guarantees, pricing differences, feature availability. When is each the right choice? Save as /day-30/data_residency_options.md.', time: '20 min' },
    { title: 'Change management plan', description: 'Your enterprise customer approved the AI product. Now 500 employees need to adopt it. Design: rollout phases, change champion model, training approach, success metrics, and the "what happens when AI gets it wrong" communication plan. Save as /day-30/change_management_plan.md.', time: '15 min' }
  ],

  codeExample: {
    title: 'Enterprise AI buyer persona scorer — Python',
    lang: 'python',
    code: `# Day 30 — Enterprise AI buyer persona scoring matrix
# Pedagogical goal: an AI PM who leads with compliance/integration/ROI scores
# closes deals the PM who leads with capability does not.

from dataclasses import dataclass
from typing import Dict, List


@dataclass
class Persona:
    name: str
    title: str
    weights: Dict[str, float]   # security, compliance, roi, integration, capability


@dataclass
class Product:
    name: str
    scores: Dict[str, int]      # 0..10 per dimension


PERSONAS: List[Persona] = [
    Persona("CISO",        "Chief Information Security Officer",
            {"security": 0.40, "compliance": 0.30, "roi": 0.05, "integration": 0.15, "capability": 0.10}),
    Persona("CIO",         "Chief Information Officer",
            {"security": 0.20, "compliance": 0.20, "roi": 0.20, "integration": 0.30, "capability": 0.10}),
    Persona("CFO",         "Chief Financial Officer",
            {"security": 0.10, "compliance": 0.20, "roi": 0.50, "integration": 0.10, "capability": 0.10}),
    Persona("VP_Eng",      "VP Engineering / platform owner",
            {"security": 0.15, "compliance": 0.10, "roi": 0.10, "integration": 0.40, "capability": 0.25}),
    Persona("LineOfBiz",   "Line-of-business buyer (Ops/Legal/Sales)",
            {"security": 0.10, "compliance": 0.15, "roi": 0.30, "integration": 0.15, "capability": 0.30}),
]

# Two real-feeling products on the same enterprise short list.
PRODUCTS: List[Product] = [
    Product("ClaudeForEnterprise", {
        "security": 9, "compliance": 9, "roi": 7, "integration": 8, "capability": 9
    }),
    Product("OpenSourceLlamaStack", {
        "security": 6, "compliance": 5, "roi": 9, "integration": 6, "capability": 8
    }),
]


def score_for(persona: Persona, product: Product) -> float:
    return round(sum(persona.weights[k] * product.scores[k] for k in persona.weights), 2)


def explain(persona: Persona, product: Product) -> List[str]:
    bits = []
    for k, w in sorted(persona.weights.items(), key=lambda x: -x[1]):
        s = product.scores[k]
        bits.append(f"{k}={s}/10 (w={w:.2f})")
    return bits


def gate_check(product: Product) -> Dict[str, bool]:
    # Hard gates that override weighted scoring for most enterprise deals.
    s = product.scores
    return {
        "soc2_type2":     s["compliance"] >= 8,
        "sso_scim":       s["integration"] >= 7,
        "data_residency": s["security"] >= 7,
        "audit_logs":     s["security"] >= 7,
    }


print("=== Persona x Product weighted scores (out of 10) ===")
header = "  " + "Product".ljust(24) + "  " + "  ".join(p.name.ljust(11) for p in PERSONAS)
print(header)
for prod in PRODUCTS:
    row = "  " + prod.name.ljust(24)
    for persona in PERSONAS:
        row += "  " + f"{score_for(persona, prod):>6.2f}".ljust(11)
    print(row)

print("\\n=== Hard gates (must-pass before scoring matters) ===")
for prod in PRODUCTS:
    gates = gate_check(prod)
    summary = "  ".join(f"{k}={'PASS' if v else 'FAIL'}" for k, v in gates.items())
    overall = "PASS" if all(gates.values()) else "FAIL"
    print(f"  {prod.name:<24} overall={overall}  {summary}")

print("\\n=== Why CISO ranks ClaudeForEnterprise higher ===")
ciso = PERSONAS[0]
for line in explain(ciso, PRODUCTS[0]):
    print("  " + line)

print("\\n=== Why CFO is tempted by open-source ===")
cfo = next(p for p in PERSONAS if p.name == "CFO")
for line in explain(cfo, PRODUCTS[1]):
    print("  " + line)

print("\\n=== Talking points by persona (PM pre-call prep) ===")
talking = {
    "CISO":     "Lead with SOC 2 Type II, data residency, model-side prompt logging.",
    "CIO":      "Lead with SSO/SCIM, MCP/Bedrock/Vertex deployment options.",
    "CFO":      "Lead with cost-per-outcome, not cost-per-token; show payback months.",
    "VP_Eng":   "Lead with eval harness, latency/cost SLOs, escape hatches.",
    "LineOfBiz":"Lead with one workflow demo, time-saved-per-week, change mgmt support.",
}
for name, line in talking.items():
    print(f"  {name:<10} -> {line}")

# Recommend the buying-committee winner: weighted across personas (equal weight).
print("\\n=== Buying-committee blended score ===")
for prod in PRODUCTS:
    blended = sum(score_for(p, prod) for p in PERSONAS) / len(PERSONAS)
    gates_ok = all(gate_check(prod).values())
    flag = "RECOMMEND" if gates_ok and blended >= 7.5 else "INVESTIGATE"
    print(f"  {prod.name:<24} blended={blended:.2f}  {flag}")
`,
  },

  interview: { question: 'What are the three biggest blockers to enterprise AI adoption, and how do you address them?', answer: `<strong>Security review (longest):</strong> Enterprises need SOC 2 Type II, HIPAA eligibility (if healthcare), data residency (EU customers need EU processing), and zero-data-retention options. Anthropic now has all of these. Deploy via AWS Bedrock for the strongest enterprise security story \u2014 VPC peering, IAM integration, and data never leaves the customer\u2019s AWS account. Lead with certifications, not capability.<br><br><strong>Integration complexity (most expensive):</strong> AI is useless if it can\u2019t connect to the systems employees already use. The game-changer: MCP servers. Official servers exist for GitHub, Jira, Confluence, and many more. Before building any custom integration, check the MCP server registry \u2014 this turns 3-month integration projects into days. For enterprises on Salesforce or ServiceNow, evaluate whether the platform\u2019s native AI is sufficient before building custom.<br><br><strong>Change management (most underestimated):</strong> Technology works; people don\u2019t adopt it. The change champion model: identify 5-10 power users per department, train them first, let them train their teams. Measure adoption weekly. Address the "AI got it wrong" scenario proactively with a documented escalation path. The PM who has a change management plan closes enterprise deals; the one who only has a product demo doesn\u2019t.` },
  pmAngle: 'The difference between a $5M and $50M ARR AI product is usually enterprise sales readiness. Know your certifications (SOC 2, HIPAA), your deployment options (direct vs Bedrock vs Vertex), and your integration accelerators (MCP servers). The PM who leads with compliance closes deals the PM who leads with capability does not.',
  resources: [
    { type: 'DOCS', title: 'Anthropic Security', url: 'https://trust.anthropic.com', note: 'SOC 2 Type II, HIPAA, certifications. Essential for enterprise conversations.' },
    { type: 'GITHUB', title: 'MCP Servers Registry', url: 'https://github.com/modelcontextprotocol/servers', note: 'Check before building any custom integration. Saves months.' },
    { type: 'DOCS', title: 'AWS Bedrock \u2014 Claude', url: 'https://aws.amazon.com/bedrock/claude/', note: 'Enterprise Claude deployment with VPC peering and IAM.' },
    { type: 'DOCS', title: 'Google Vertex AI \u2014 Claude', url: 'https://cloud.google.com/vertex-ai/generative-ai/docs/partner-models/use-claude', note: 'For Google Cloud-native enterprises.' },
    { type: 'DOCS', title: 'Anthropic Enterprise', url: 'https://www.anthropic.com/enterprise', note: 'Claude for Enterprise features and positioning.' },
    { type: 'BLOG', title: 'Anthropic Trust Center', url: 'https://trust.anthropic.com/', note: 'Detailed security and compliance documentation.' }
  ]
};
