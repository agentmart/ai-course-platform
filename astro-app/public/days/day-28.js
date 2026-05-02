// Day 28 — Agent Network Protocol (ANP)
// Updated: March 2026 | Review: adoption reality check, alternative cross-org approaches

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[28] = {
  subtitle: 'Decentralized agent discovery and trust \u2014 the protocol for the open agent internet.',
  context: `<p><strong>Agent Network Protocol (ANP)</strong> is an open specification for agent discovery, authentication, and communication across organizational boundaries \u2014 essentially DNS + TLS for the agent internet. Where A2A and ACP handle intra-organization agent collaboration, ANP addresses the harder inter-organizational problem: how agents from Company A discover and trustfully interact with agents from Company B without pre-arranged integration.</p>
  <p>ANP\u2019s core technical innovation: <strong>Decentralized Identifiers (DIDs)</strong> as the identity layer. Each agent has a DID that is self-sovereign \u2014 not controlled by any central registry. This enables trust without a central authority, which is the architectural requirement for a truly open agent network. The "DNS plus TLS" analogy: ANP provides discovery (find the agent) and trust (verify the agent\u2019s identity), much as DNS provides name resolution and TLS provides encrypted communication.</p>
  <p><strong>Reality check (Q1 2026):</strong> ANP remains early-stage. The open agent internet has not fully materialized. Cross-organizational agent communication in practice is happening through: <strong>MCP over HTTPS with OAuth</strong> (securing existing MCP for remote access), <strong>traditional REST APIs</strong> (still the dominant cross-org integration pattern), and <strong>agent marketplaces</strong> (ServiceNow AI, Salesforce Agentforce) providing proprietary cross-org communication. The PM\u2019s job is honest assessment: where is agent interoperability actually happening vs where it\u2019s aspirational?</p>`,
  tasks: [
    { title: 'Map the agent protocol stack', description: 'Draw a 4-layer architecture: ANP (cross-org discovery/trust) \u2192 A2A/ACP (inter-agent tasks) \u2192 MCP (agent-to-tool) \u2192 LLM APIs. Label where each protocol operates. Save as /day-28/agent_protocol_stack.md.', time: '20 min' },
    { title: 'Design an ANP use case', description: 'Describe a cross-organizational scenario (travel booking, supply chain, or financial data) where agents from 3 companies need to interact. How does ANP\u2019s DID-based identity help? What fails without it? Save as /day-28/anp_use_case_design.md.', time: '20 min' },
    { title: 'Verify current ANP adoption', description: 'Research: are there production ANP deployments? Has the open agent internet materialized? Be honest. If adoption is minimal, document where cross-org agent interop IS happening instead. Save as /day-28/protocol_ecosystem_update.md.', time: '20 min' },
    { title: 'Alternative cross-org approaches', description: 'Compare 3 ways enterprises solve cross-org agent communication today: (1) MCP over HTTPS with OAuth, (2) REST APIs, (3) agent marketplaces (ServiceNow, Salesforce). When does ANP become necessary vs overkill? Save as /day-28/cross_org_alternatives.md.', time: '20 min' }
  ],

  codeExample: {
    title: 'Decentralized agent registry with reputation — Python',
    lang: 'python',
    code: `# Day 28 — Decentralized agent discovery (ANP-style DID registry + reputation)
# The "open agent internet" relies on Decentralized Identifiers (DIDs) and
# reputation-weighted discovery instead of a central directory.
# This simulates a tiny registry so a PM can reason about trust, not just transport.

from dataclasses import dataclass, field
from typing import List, Dict
import hashlib
import json
import math


@dataclass
class AgentRecord:
    did: str                       # did:web:agents.acme.io#contract-review
    endpoints: List[str]
    capabilities: List[str]
    public_key: str                # short fingerprint for demo
    attestations: List[str] = field(default_factory=list)  # signed-by issuers
    interactions: int = 0
    successes: int = 0


def did_for(domain: str, name: str) -> str:
    digest = hashlib.sha256((domain + ":" + name).encode()).hexdigest()[:12]
    return f"did:web:{domain}#{name}-{digest}"


class AgentRegistry:
    def __init__(self) -> None:
        self.agents: Dict[str, AgentRecord] = {}

    def register(self, record: AgentRecord) -> None:
        self.agents[record.did] = record

    def find(self, capability: str) -> List[AgentRecord]:
        return [a for a in self.agents.values() if capability in a.capabilities]

    def reputation(self, did: str) -> float:
        a = self.agents[did]
        # Wilson-ish smoothing so a brand-new agent isn't 0 or 1.
        n = a.interactions
        s = a.successes
        smoothed = (s + 2) / (n + 4)
        attestation_boost = min(0.20, 0.05 * len(a.attestations))
        return round(min(1.0, smoothed + attestation_boost), 3)

    def rank(self, capability: str) -> List[Dict]:
        rows = []
        for a in self.find(capability):
            rep = self.reputation(a.did)
            rows.append({"did": a.did, "rep": rep, "n": a.interactions})
        rows.sort(key=lambda r: (-r["rep"], -r["n"]))
        return rows


# Seed a small open-agent-internet snapshot
reg = AgentRegistry()
reg.register(AgentRecord(
    did=did_for("agents.acme.io", "contract-review"),
    endpoints=["https://agents.acme.io/contract-review"],
    capabilities=["contract.review", "clause.extract"],
    public_key="ed25519:ACME1...",
    attestations=["issuer:soc2-auditor", "issuer:legaltech-consortium"],
    interactions=212, successes=205,
))
reg.register(AgentRecord(
    did=did_for("legalbots.io", "contract-review"),
    endpoints=["https://legalbots.io/cr"],
    capabilities=["contract.review"],
    public_key="ed25519:LBOT9...",
    attestations=[],
    interactions=18, successes=11,
))
reg.register(AgentRecord(
    did=did_for("agents.acme.io", "supplier-risk"),
    endpoints=["https://agents.acme.io/supplier-risk"],
    capabilities=["supplier.risk"],
    public_key="ed25519:ACME2...",
    attestations=["issuer:soc2-auditor"],
    interactions=80, successes=74,
))


print("=== Registered agents ===")
for did, a in reg.agents.items():
    print(f"  {did}")
    print(f"    caps={a.capabilities}  attestations={len(a.attestations)}")

print("\\n=== Discover capability: contract.review ===")
for row in reg.rank("contract.review"):
    print(f"  rep={row['rep']:.3f}  n={row['n']:>3}  {row['did']}")

print("\\n=== Discover capability: supplier.risk ===")
for row in reg.rank("supplier.risk"):
    print(f"  rep={row['rep']:.3f}  n={row['n']:>3}  {row['did']}")

print("\\n=== Trust simulation: 5 new interactions ===")
target = list(reg.agents.values())[1]   # legalbots
for outcome in [True, True, False, True, True]:
    target.interactions += 1
    if outcome:
        target.successes += 1
print(f"  legalbots now: rep={reg.reputation(target.did):.3f}  n={target.interactions}")

print("\\n=== Aspirational vs production check ===")
checks = [
    ("Cross-org REST/OAuth integrations live today",     "PRODUCTION"),
    ("Proprietary marketplace agents (OpenAI, Salesforce)", "PRODUCTION"),
    ("DID-based discovery between unrelated orgs",       "ASPIRATIONAL"),
    ("On-chain reputation across providers",             "ASPIRATIONAL"),
]
for desc, status in checks:
    flag = "[OK]" if status == "PRODUCTION" else "[--]"
    print(f"  {flag} {status:<13} {desc}")

print("\\nPM takeaway: design behind a discovery interface so today's REST")
print("APIs and tomorrow's DID registries are the same call site.")
`,
  },

  interview: { question: 'How does ANP differ from A2A and why does cross-organizational agent communication require a separate protocol?', answer: `A2A and ACP solve intra-organizational agent coordination \u2014 agents within one company or one cloud account working together. ANP solves the harder inter-organizational problem: agents across company boundaries need to discover each other, verify identity, and establish trust without pre-arranged integration.<br><br>The technical requirement is decentralized identity. Within an organization, you trust your own identity provider. Across organizations, neither party controls the other\u2019s identity system. ANP uses Decentralized Identifiers (DIDs) \u2014 self-sovereign agent identity that doesn\u2019t depend on a central registry. The DNS+TLS analogy: ANP provides discovery and trust verification, just as DNS resolves names and TLS encrypts communication.<br><br>The honest assessment: as of Q1 2026, cross-org agent interoperability is mostly happening through traditional mechanisms \u2014 REST APIs, MCP over HTTPS with OAuth, and proprietary agent marketplaces (ServiceNow AI, Salesforce Agentforce). ANP represents the long-term vision. The PM\u2019s job is knowing the difference between what\u2019s shipping today and what\u2019s aspirational, and making architectural decisions accordingly.` },
  pmAngle: 'The open agent internet is coming \u2014 but as of 2026, cross-org agent interop is mostly happening through traditional REST APIs and proprietary platforms. The PM who honestly distinguishes between aspirational protocol visions and production reality makes better architectural decisions.',
  resources: [
    { type: 'GITHUB', title: 'ANP Specification', url: 'https://modelcontextprotocol.io/specification', note: 'The specification. Early-stage \u2014 verify current adoption.' },
    { type: 'DOCS', title: 'W3C DIDs', url: 'https://www.w3.org/TR/did-core/', note: 'Decentralized Identifiers \u2014 the identity layer ANP uses.' },
    { type: 'GITHUB', title: 'A2A Specification', url: 'https://github.com/google/a2a', note: 'Compare: A2A for intra-org, ANP for inter-org.' },
    { type: 'DOCS', title: 'MCP Specification', url: 'https://modelcontextprotocol.io/specification', note: 'MCP over HTTPS with OAuth is the pragmatic cross-org solution today.' }
  ]
};
