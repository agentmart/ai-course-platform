// Day 29 — Open Agent Schema Framework (OASF)
// Updated: March 2026 | Review: adoption status, A2A Agent Card relationship

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[29] = {
  subtitle: 'The open schema for agent capability discovery \u2014 making agents interoperable by design.',
  context: `<p><strong>Open Agent Schema Framework (OASF)</strong> is an open standard developed by Agntcy (backed by Cisco) providing a common schema language for describing AI agent capabilities, inputs, outputs, and constraints. The OpenAPI analogy is exact and useful: OpenAPI standardized how REST APIs describe themselves; OASF aims to standardize how AI agents describe themselves. This enables automated agent discovery, capability matching, and procurement evaluation.</p>
  <p>OASF\u2019s relationship to A2A Agent Cards should be clarified: both describe agent capabilities but at different levels. A2A Agent Cards are transport-level descriptors (endpoint, auth, task types). OASF schemas are capability-level descriptors (detailed inputs/outputs, compliance certifications, data handling policies, performance guarantees). They\u2019re complementary \u2014 an OASF schema can be referenced from an A2A Agent Card for richer capability description.</p>
  <p><strong>Adoption reality check:</strong> Verify current OASF adoption before citing it as a standard. By 2026, it may have gained significant traction beyond the initial Cisco/Agntcy backing, or it may remain niche. For enterprise procurement specifically, the value proposition is strongest: compliance certifications, data handling policies, and performance guarantees as machine-readable schema dimensions enable automated vendor evaluation.</p>`,
  tasks: [
    { title: 'Write an OASF schema for your agent', description: 'Create a capability schema for an AI agent: name, capabilities, inputs/outputs, compliance certs, data handling policy, SLA guarantees. Format as JSON. Save as /day-29/oasf_agent_schema.json.', time: '25 min' },
    { title: 'Compare OASF and A2A Agent Cards', description: 'How do they differ? What does each describe? How can they work together? Save as /day-29/oasf_vs_a2a_comparison.md.', time: '15 min' },
    { title: 'Enterprise procurement checklist', description: 'Design a 10-question AI agent procurement checklist for an enterprise buyer. Which questions can be answered by OASF schema fields? Which require manual verification? Save as /day-29/enterprise_procurement_checklist.md.', time: '20 min' },
    { title: 'Verify OASF adoption status', description: 'Research: how widely adopted is OASF? Are there production agent registries using it? Be honest about the maturity level. Save as /day-29/oasf_adoption_check.md.', time: '20 min' }
  ],

  codeExample: {
    title: 'OASF capability schema validator — Python',
    lang: 'python',
    code: `# Day 29 — OASF (Open Agent Capability Schema) validator
# Make capabilities machine-readable so a marketplace can match buyers
# to agents without humans reading docs.

from dataclasses import dataclass
from typing import Any, Dict, List, Tuple
import json
import re


REQUIRED_TOP = ["schema_version", "agent", "capabilities", "interfaces", "compliance"]
REQUIRED_AGENT = ["name", "vendor", "version", "description"]
ALLOWED_INTERFACES = {"a2a", "acp", "mcp", "rest", "grpc"}
SEMVER = re.compile(r"^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z\\.-]+)?$")


@dataclass
class Issue:
    path: str
    code: str
    message: str


def validate(doc: Dict[str, Any]) -> List[Issue]:
    issues: List[Issue] = []

    for k in REQUIRED_TOP:
        if k not in doc:
            issues.append(Issue(k, "MISSING", f"top-level field '{k}' required"))

    agent = doc.get("agent", {})
    for k in REQUIRED_AGENT:
        if k not in agent:
            issues.append(Issue("agent." + k, "MISSING", f"agent.{k} required"))
    if "version" in agent and not SEMVER.match(str(agent["version"])):
        issues.append(Issue("agent.version", "FORMAT", "must be semver"))

    caps = doc.get("capabilities", [])
    if not isinstance(caps, list) or not caps:
        issues.append(Issue("capabilities", "EMPTY", "must be non-empty list"))
    for i, c in enumerate(caps):
        base = f"capabilities[{i}]"
        for k in ("id", "name", "input_schema", "output_schema"):
            if k not in c:
                issues.append(Issue(f"{base}.{k}", "MISSING", f"{k} required"))
        if "id" in c and not re.match(r"^[a-z][a-z0-9_.-]*$", str(c["id"])):
            issues.append(Issue(f"{base}.id", "FORMAT", "kebab/dotted lowercase"))

    ifs = doc.get("interfaces", [])
    for i, iface in enumerate(ifs):
        if iface.get("type") not in ALLOWED_INTERFACES:
            issues.append(Issue(f"interfaces[{i}].type", "ENUM", f"must be one of {sorted(ALLOWED_INTERFACES)}"))

    comp = doc.get("compliance", {})
    for k in ("data_residency", "pii_handling", "auth"):
        if k not in comp:
            issues.append(Issue("compliance." + k, "MISSING", f"compliance.{k} required"))
    return issues


def score(doc: Dict[str, Any], issues: List[Issue]) -> Tuple[int, str]:
    # 100 - 8 per missing/format issue, floored at 0
    raw = max(0, 100 - 8 * len(issues))
    grade = "A" if raw >= 90 else "B" if raw >= 75 else "C" if raw >= 60 else "F"
    return raw, grade


# A reasonable OASF descriptor for a Contract Review agent.
oasf_doc = {
    "schema_version": "0.3",
    "agent": {
        "name": "Contract Review Agent",
        "vendor": "Acme Legaltech",
        "version": "2.1.0",
        "description": "Extracts risk clauses from contracts and returns structured findings.",
    },
    "capabilities": [
        {
            "id": "contract.review",
            "name": "Review Contract",
            "input_schema":  {"type": "object", "required": ["contract_text"]},
            "output_schema": {"type": "object", "required": ["findings"]},
            "examples": ["Flag IP assignment clauses in this NDA."],
        },
        {
            "id": "clause.extract",
            "name": "Extract Clause",
            "input_schema":  {"type": "object", "required": ["contract_text", "clause_type"]},
            "output_schema": {"type": "object", "required": ["clause_text", "page"]},
        },
    ],
    "interfaces": [
        {"type": "a2a", "url": "https://agents.acme.io/contract-review/.well-known/agent.json"},
        {"type": "acp", "url": "https://agents.acme.io/contract-review/runs"},
        {"type": "mcp", "url": "stdio://acme-contract-review"},
    ],
    "compliance": {
        "data_residency": ["us", "eu"],
        "pii_handling":   "redact-before-log",
        "auth":           ["oauth2", "api_key"],
    },
}


print("=== OASF document ===")
print(json.dumps(oasf_doc, indent=2)[:400] + " ...")

issues = validate(oasf_doc)
total, grade = score(oasf_doc, issues)
print(f"\\n=== Validation: {len(issues)} issue(s)  score={total}/100  grade={grade} ===")
for it in issues:
    print(f"  [{it.code}] {it.path}: {it.message}")

# Negative test: strip required pieces and re-score.
broken = json.loads(json.dumps(oasf_doc))
broken["agent"].pop("version")
broken["capabilities"][0].pop("output_schema")
broken["compliance"].pop("pii_handling")
broken["interfaces"].append({"type": "soap"})
b_issues = validate(broken)
b_total, b_grade = score(broken, b_issues)
print(f"\\n=== Broken doc: {len(b_issues)} issue(s)  score={b_total}/100  grade={b_grade} ===")
for it in b_issues:
    print(f"  [{it.code}] {it.path}: {it.message}")

print("\\n=== OASF vs A2A AgentCard (PM cheat sheet) ===")
print("  OASF      : portable capability + compliance descriptor (vendor-neutral)")
print("  AgentCard : A2A-specific manifest at /.well-known/agent.json")
print("  Use OASF for procurement, AgentCard for runtime A2A discovery.")
`,
  },

  interview: { question: 'Why would an enterprise care about standardized agent schemas like OASF?', answer: `Enterprises evaluating AI agents face the same problem they faced with APIs before OpenAPI: every vendor describes capabilities differently, making comparison and procurement difficult. OASF provides machine-readable schemas that include capability descriptions, compliance certifications, data handling policies, and performance guarantees.<br><br>For enterprise procurement, this enables: automated vendor capability matching against requirements, compliance verification (does this agent meet our HIPAA/SOC 2 requirements?), and performance SLA comparison. Without standardized schemas, every agent evaluation is a custom due diligence exercise.<br><br>The relationship to A2A: Agent Cards describe transport-level details (endpoint, auth). OASF describes capability-level details (what the agent does, what data it handles, what certifications it has). They\u2019re complementary \u2014 a rich agent discovery system uses both.<br><br>The honest caveat: schema standardization is early. Adoption may not be universal yet. But the trajectory is clear: as enterprises deploy more agents, the need for standardized capability description will drive adoption, just as API proliferation drove OpenAPI adoption.` },
  pmAngle: 'Schema standardization always precedes marketplace emergence. The PM who designs their agent\u2019s capabilities as a machine-readable schema \u2014 not just documentation \u2014 is building for the agent marketplace that\u2019s coming.',
  resources: [
    { type: 'GITHUB', title: 'OASF Specification', url: 'https://github.com/agntcy/oasf', note: 'Agntcy/Cisco-backed schema standard. Verify current adoption.' },
    { type: 'GITHUB', title: 'A2A Specification', url: 'https://github.com/google/a2a', note: 'Compare Agent Cards with OASF schemas \u2014 they\u2019re complementary.' },
    { type: 'DOCS', title: 'OpenAPI Specification', url: 'https://swagger.io/specification/', note: 'The precedent: how API schema standardization drove API ecosystem growth.' },
    { type: 'DOCS', title: 'Anthropic Security', url: 'https://trust.anthropic.com', note: 'Example of certifications that would appear in an OASF compliance schema.' }
  ]
};
