// Day 51 \u2014 Leading AI Product Teams
// Updated: March 2026 | Review: AI Safety PM role, Evals Lead, AI Engineer vs ML Engineer, cross-functional pod topology, in-person frontier labs

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[51] = {
  subtitle: 'Build and lead the cross-functional AI product team that actually ships \u2014 roles, topology, and hiring that works.',
  context: `<p>The AI product team of 2026 looks nothing like the product team of 2022. New roles have emerged, old roles have transformed, and the organizational topology that works for traditional software actively hinders AI product development. Today you learn how to build and lead the team that ships AI products safely and effectively.</p>
  <p><strong>New roles you need to know.</strong> Three roles have crystallized in 2026 that didn\u2019t exist or weren\u2019t distinct two years ago: (1) <strong>AI Safety PM</strong> \u2014 Anthropic and other frontier labs now have dedicated Safety PMs who own the intersection of product decisions and safety constraints. This isn\u2019t a policy role; it\u2019s a product role. The Safety PM defines what the model should and shouldn\u2019t do in specific product contexts, writes system prompt specifications, reviews evals for safety regressions, and owns the red-teaming cadence. At Anthropic, Safety PMs sit on the product team, not the policy team. (2) <strong>Evals Lead</strong> \u2014 a dedicated role responsible for designing, maintaining, and interpreting evaluation suites. This role emerged because evals are too important to be a side project for an engineer. The Evals Lead owns the eval pipeline, monitors quality metrics, designs new evals for new capabilities, and raises the alarm when quality regresses. (3) <strong>AI Engineer</strong> \u2014 distinct from the traditional ML Engineer. The ML Engineer trains models, manages training infrastructure, and optimizes model performance. The AI Engineer integrates pre-trained models (like Claude) into products: writes system prompts, builds tool-use pipelines, designs agentic workflows, implements MCP servers, and optimizes latency and cost. Most product teams need AI Engineers, not ML Engineers.</p>
  <p><strong>The cross-functional AI pod.</strong> The team topology that works: a cross-functional pod consisting of PM + AI Engineer + Backend Engineer + Designer + Safety Reviewer. This pod owns a complete AI feature end-to-end. The Safety Reviewer can be the AI Safety PM or a rotating role \u2014 the point is that safety review is embedded in the team, not a gate at the end. Anti-pattern to avoid: a centralized \u201cAI platform team\u201d that other product teams submit requests to. This creates a bottleneck where the AI team doesn\u2019t understand the product context and the product team doesn\u2019t understand the AI constraints.</p>
  <p><strong>Frontier labs are in-person.</strong> A practical note for candidates: frontier AI labs are primarily in-person, especially in San Francisco. Anthropic, OpenAI, and other leading labs require in-office presence for most roles. This is deliberate \u2014 the pace of iteration on frontier models requires high-bandwidth communication. If you\u2019re targeting a PM role at a frontier lab, be prepared to relocate to SF. Remote positions exist but are the exception, not the rule, and typically go to very senior hires with established track records.</p>
  <p><strong>Hiring for AI teams.</strong> The biggest hiring insight for AI product teams: <strong>mission and technical challenge matter more than compensation for top talent</strong>. The best AI engineers and researchers choose companies based on the importance of the mission and the quality of the technical problems. Anthropic attracts top talent because safety-focused AI development is both a deeply meaningful mission and a set of genuinely hard technical problems. When building your team, lead with mission and challenge in your job descriptions and interviews. Compensation must be competitive, but it won\u2019t differentiate you \u2014 every AI company pays well. What differentiates is: \u201cHere\u2019s why the problem we\u2019re solving matters, and here\u2019s why it\u2019s technically fascinating.\u201d</p>
  <p><strong>Team anti-patterns to avoid.</strong> (1) Building a dedicated prompt engineering team separate from product teams. Prompt engineering is a skill for AI engineers, not a separate function. (2) Treating safety review as a stage gate rather than an embedded practice. If safety review only happens before launch, it\u2019s too late. (3) Hiring ML Engineers when you need AI Engineers. If you\u2019re building on top of Claude, you don\u2019t need people who can train models \u2014 you need people who can use them effectively.</p>`,
  tasks: [
    { title: 'Design your AI product team', description: 'Design the ideal AI product team for a company building a customer-facing AI assistant using claude-sonnet-4-6. Define each role (PM, AI Engineer, Backend Engineer, Designer, Safety Reviewer, Evals Lead), their responsibilities, required skills, and how they interact. Explain why you chose AI Engineer over ML Engineer for this context. Draw the team topology as a pod structure. Save as /day-51/ai_team_design.md.', time: '25 min' },
    { title: 'Write an AI Safety PM job description', description: 'Write a compelling job description for an AI Safety PM role. Include: mission statement (why this role matters), responsibilities (system prompt specs, eval review, red-teaming cadence, safety incident response), required skills (technical enough to read evals, product-minded enough to balance safety with utility), and what makes this role different from a traditional PM or policy role. Lead with mission and technical challenge. Save as /day-51/safety_pm_jd.md.', time: '20 min' },
    { title: 'Map AI Engineer vs ML Engineer', description: 'Create a detailed comparison of the AI Engineer and ML Engineer roles. For each: daily activities, required technical skills, tools they use, how they interact with the PM, career trajectory, and when to hire one vs the other. Include specific examples: an AI Engineer builds an MCP server for Claude tool use; an ML Engineer fine-tunes a classification model for content moderation. Save as /day-51/ai_vs_ml_engineer.md.', time: '15 min' },
    { title: 'Cross-functional pod simulation', description: 'Simulate a sprint planning meeting for your AI product pod. Write the agenda, identify three user stories for the sprint (one feature, one safety improvement, one eval improvement), assign owners from your pod, and identify cross-functional dependencies. Include a safety review checkpoint mid-sprint, not just at the end. Document the anti-patterns you\u2019re deliberately avoiding. Save as /day-51/pod_sprint_sim.md.', time: '20 min' }
  ],

  codeExample: {
    title: 'Cross-Functional AI Team Topology Designer — Python',
    lang: 'python',
    code: `# Day 51 — Cross-Functional AI Team Topology Designer
# Detects role-coverage gaps for an AI product pod. Pure stdlib.

# Canonical role catalog with the *capabilities* each role typically owns.
ROLE_CATALOG = {
    "AI PM":             ["roadmap", "prioritization", "discovery", "metrics"],
    "AI Safety PM":      ["red-team", "policy", "eu-ai-act", "abuse-review"],
    "AI Engineer":       ["prompts", "agents", "evals", "tool-use"],
    "ML Engineer":       ["fine-tune", "training", "inference-perf"],
    "Platform Engineer": ["mcp-servers", "deploy", "observability", "cost"],
    "Designer":          ["ux", "trust-ui", "error-states"],
    "Data Engineer":     ["pipelines", "ground-truth", "labeling"],
    "DevRel":            ["cookbook", "samples", "docs"],
    "Eng Manager":       ["delivery", "hiring", "rituals"],
    "Domain Expert":     ["sme-input", "rubric-design"],
}

# Required capabilities per product archetype.
ARCHETYPE_NEEDS = {
    "internal-copilot": {
        "must":   ["roadmap", "prompts", "evals", "deploy", "ux", "abuse-review"],
        "should": ["mcp-servers", "ground-truth", "rubric-design", "cost"],
    },
    "developer-api": {
        "must":   ["roadmap", "prompts", "evals", "cookbook", "docs", "deploy"],
        "should": ["samples", "observability", "red-team", "metrics"],
    },
    "agentic-workflow": {
        "must":   ["roadmap", "agents", "tool-use", "evals", "red-team", "deploy"],
        "should": ["mcp-servers", "policy", "cost", "rubric-design"],
    },
}

def expand_capabilities(team):
    """team is list of role names. Return set of capabilities covered."""
    caps = set()
    for role in team:
        caps.update(ROLE_CATALOG.get(role, []))
    return caps

def gap_analysis(team, archetype):
    needs = ARCHETYPE_NEEDS[archetype]
    covered = expand_capabilities(team)
    must_missing   = [c for c in needs["must"]   if c not in covered]
    should_missing = [c for c in needs["should"] if c not in covered]
    return must_missing, should_missing, covered

def staffing_score(must_missing, should_missing):
    # Must-have gaps cost 2x should-have gaps.
    penalty = 2 * len(must_missing) + len(should_missing)
    raw = max(0, 10 - penalty)
    return raw

def topology_for(archetype):
    """Recommended pod topology by archetype."""
    if archetype == "internal-copilot":
        return "Single product pod: PM + AI Eng + Platform Eng + Designer + Safety PM (shared)."
    if archetype == "developer-api":
        return "Platform pod: PM + 2 AI Eng + DevRel + Platform Eng + Safety PM."
    if archetype == "agentic-workflow":
        return "Agent pod: PM + 2 AI Eng + ML Eng (eval) + Platform Eng + Safety PM (embedded)."
    return "Custom — start from product archetype."

def print_team(team):
    print("Team:")
    for r in team:
        caps = ", ".join(ROLE_CATALOG[r])
        print(f"  - {r:18} -> {caps}")

def print_report(team, archetype):
    must, should, covered = gap_analysis(team, archetype)
    score = staffing_score(must, should)
    print("=" * 60)
    print(f"ARCHETYPE: {archetype}")
    print("=" * 60)
    print_team(team)
    print()
    print(f"Capabilities covered: {len(covered)}")
    print(f"MUST-HAVE gaps   ({len(must)}): {must or 'none'}")
    print(f"SHOULD-HAVE gaps ({len(should)}): {should or 'none'}")
    print(f"Staffing score: {score}/10")
    print()
    print("Recommended topology:")
    print("  " + topology_for(archetype))
    return score

# Three example team configurations the PM might be evaluating.
SCENARIOS = [
    {
        "name": "Lean copilot pilot",
        "team": ["AI PM", "AI Engineer", "Platform Engineer", "Designer"],
        "archetype": "internal-copilot",
    },
    {
        "name": "API platform launch",
        "team": ["AI PM", "AI Engineer", "AI Engineer", "DevRel", "Platform Engineer"],
        "archetype": "developer-api",
    },
    {
        "name": "Agent workflow product",
        "team": ["AI PM", "AI Engineer", "Platform Engineer", "Eng Manager"],
        "archetype": "agentic-workflow",
    },
]

def main():
    print("CROSS-FUNCTIONAL AI TEAM TOPOLOGY DESIGNER")
    print()
    results = []
    for s in SCENARIOS:
        print(">>> Scenario:", s["name"])
        sc = print_report(s["team"], s["archetype"])
        results.append((s["name"], sc))
        print()
    # Final ranking helps the PM see which staffing plan is closest to ready.
    print("Ranking by staffing score:")
    for name, sc in sorted(results, key=lambda x: -x[1]):
        marker = "READY" if sc >= 8 else "GAPS"
        print(f"  [{marker}] {name}: {sc}/10")
    print()
    print("Hiring rule of thumb: close MUST gaps before launch, SHOULD gaps before scale.")

if __name__ == "__main__":
    main()
`,
  },

  interview: { question: 'How would you structure an AI product team, and what roles are essential?', answer: `I structure AI product teams as cross-functional pods, not siloed functions \u2014 and the roles have evolved significantly from traditional product teams.<br><br><strong>The core pod:</strong> PM, AI Engineer, Backend Engineer, Designer, and an embedded Safety Reviewer. This pod owns a complete AI feature end-to-end. The critical distinction from traditional teams: safety is embedded in the pod, not a stage gate at the end of development.<br><br><strong>Three roles that didn\u2019t exist two years ago:</strong> First, the AI Safety PM \u2014 a product role, not a policy role. They own what the model should and shouldn\u2019t do in specific product contexts, write system prompt specs, and manage the red-teaming cadence. Anthropic pioneered this as a dedicated product function. Second, the Evals Lead \u2014 someone who owns the evaluation pipeline full-time. Evals are too important to be a side project. Third, the AI Engineer, distinct from the ML Engineer. If you\u2019re building on Claude, you need people who integrate pre-trained models into products \u2014 system prompts, tool-use pipelines, agentic workflows, MCP servers \u2014 not people who train models from scratch.<br><br><strong>Hiring philosophy:</strong> Mission and technical challenge differentiate you, not comp. Every AI company pays well. What attracts the best talent is a meaningful problem and fascinating technical challenges. I lead with those in job descriptions and interviews.<br><br><strong>Anti-patterns I avoid:</strong> Centralized AI platform teams that create bottlenecks. Separate prompt engineering teams. Safety review only at launch. And hiring ML Engineers when the work requires AI Engineers.` },
  pmAngle: 'The PM who can build and lead an AI product team \u2014 with the right roles, the right topology, and embedded safety \u2014 is the PM who ships AI products that work. Team structure is strategy: a misstructured AI team will build the wrong things safely or the right things unsafely. Getting the team right is the highest-leverage thing you do.',
  resources: [
    { type: 'CAREERS', title: 'Anthropic Careers', url: 'https://www.anthropic.com/careers', note: 'See real AI Safety PM and AI Engineer job descriptions at a frontier lab.' },
    { type: 'BLOG', title: 'Anthropic: Building Effective Agents', url: 'https://www.anthropic.com/research/building-effective-agents', note: 'Understand what AI Engineers actually build day-to-day.' },
    { type: 'DOCS', title: 'MCP Specification', url: 'https://modelcontextprotocol.io/', note: 'The protocol AI Engineers implement for tool integration.' },
    { type: 'BLOG', title: 'Anthropic: Core Views on AI Safety', url: 'https://www.anthropic.com/news/core-views-on-ai-safety', note: 'The mission that attracts top talent to safety-focused companies.' }
  ]
};
