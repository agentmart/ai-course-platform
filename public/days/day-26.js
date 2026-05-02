// Day 26 — Agent-to-Agent Protocol (A2A)
// Updated: April 2026 | Review: Google A2A GA status, AgentCard spec, A2A vs ACP/MCP positioning

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[26] = {
  subtitle: 'How AI agents discover, negotiate with, and delegate to each other — and why A2A changes enterprise AI architecture.',
  context: `<p><strong>Agent-to-Agent (A2A)</strong> is an open protocol developed by Google (with 50+ partners including Atlassian, Salesforce, SAP, and Deloitte) that defines how autonomous AI agents discover, authenticate, communicate, and delegate tasks to each other across organizational boundaries. It was announced in April 2025 and is the most widely-backed agent interoperability standard to date.</p>
  <p>The core problem A2A solves: as enterprises deploy multiple specialized AI agents (one for CRM, one for finance, one for HR), they need those agents to collaborate without human orchestration at every step. Without a standard protocol, each agent integration is a custom point-to-point build. A2A provides the common language.</p>
  <p><strong>The three primitives of A2A:</strong> (1) <strong>Agent Cards</strong> — a JSON manifest at <code>/.well-known/agent.json</code> that describes what an agent can do, what inputs it accepts, what outputs it produces, and how to authenticate with it; (2) <strong>Task lifecycle</strong> — a standardized state machine (submitted → working → input-required → completed/failed/canceled) with streaming updates via Server-Sent Events; (3) <strong>Part types</strong> — structured message types (TextPart, FilePart, DataPart) that allow agents to exchange rich content, not just text.</p>
  <p><strong>A2A vs MCP vs ACP</strong> is the most common interview topic in this space. MCP (Model Context Protocol, Anthropic) solves agent-to-tool connectivity — it lets a single agent call tools, APIs, and data sources. A2A solves agent-to-agent delegation — it lets one agent hand off tasks to another specialist agent. ACP (Agent Communication Protocol, Cisco/LangChain) is a competing standard with a similar goal to A2A but with different design choices: ACP uses REST/WebSocket natively, while A2A builds on HTTP with SSE. The right mental model: MCP is the tool layer, A2A/ACP are the agent coordination layer.</p>
  <p><strong>Enterprise implications</strong>: A2A enables a new class of multi-agent enterprise architectures. A procurement orchestrator agent can discover a supplier-risk specialist agent via its Agent Card, delegate a supplier evaluation task, and receive structured results — all without a human in the loop and without a custom integration. For a PM at an AI lab, understanding A2A is essential because it shapes how enterprise customers will deploy and orchestrate models in production.</p>
  <p><strong>Security model</strong>: A2A agents authenticate via standard HTTP mechanisms (OAuth 2.0, API keys) declared in the Agent Card. Agents should be given minimum-necessary permissions, and all cross-agent task delegations should be logged. The protocol does not define trust establishment between unknown agents — that remains a deployment-level decision.</p>`,
  tasks: [
    {
      title: 'Read the A2A spec and map the Agent Card fields',
      description: 'Visit the A2A GitHub repo (google/A2A). Read the Agent Card specification. List every required and optional field, explain what each does, and identify which fields are most important for security (authentication) and discoverability (capabilities). Save as /day-26/agent_card_analysis.md.',
      time: '25 min'
    },
    {
      title: 'Design an Agent Card for a fictional specialist agent',
      description: 'Design a complete Agent Card JSON for a "Contract Review Agent" — an agent that reviews legal contracts and flags risk clauses. Define its name, description, capabilities, inputModes, outputModes, and authentication scheme. Make it realistic enough to be used in an enterprise deployment. Save as /day-26/contract_review_agent_card.json.',
      time: '20 min'
    },
    {
      title: 'Map the A2A vs MCP vs ACP decision framework',
      description: 'Write a PM-ready decision framework: given a specific integration need, when do you choose A2A, MCP, or ACP? Cover: agent-to-tool vs agent-to-agent, Google ecosystem vs neutral, streaming requirements, and enterprise support maturity. Include a 2x2 or table. Save as /day-26/protocol_decision_framework.md.',
      time: '20 min'
    },
    {
      title: 'Identify 2 real enterprise multi-agent use cases',
      description: 'Pick 2 real enterprise workflows (e.g., employee onboarding, sales pipeline management) and sketch a multi-agent architecture using A2A. For each: identify the orchestrator agent, the specialist agents, what tasks get delegated, and what the Agent Cards would describe. This is an Anthropic-style PM design exercise. Save as /day-26/enterprise_a2a_architectures.md.',
      time: '15 min'
    },
  ],
  codeExample: {
    title: 'A2A Agent Card — parsing and task lifecycle simulation',
    lang: 'python',
    code: `# Day 26: A2A Agent Card validation + task lifecycle simulation
import json

# Minimal valid A2A Agent Card (per spec)
agent_card = {
    "name": "Contract Review Agent",
    "description": "Reviews legal contracts and flags risk clauses.",
    "url": "https://agents.example.com/contract-review",
    "version": "1.0.0",
    "capabilities": {
        "streaming": True,
        "pushNotifications": False,
        "stateTransitionHistory": True
    },
    "defaultInputModes": ["text", "file"],
    "defaultOutputModes": ["text", "data"],
    "skills": [
        {
            "id": "review-contract",
            "name": "Review Contract",
            "description": "Analyze a contract document for risk clauses, missing terms, and compliance issues.",
            "inputModes": ["file", "text"],
            "outputModes": ["data"],
            "examples": ["Review this NDA for IP assignment clauses"]
        }
    ],
    "authentication": {"schemes": ["OAuth2"]}
}

# Validate required fields
required_fields = ["name", "description", "url", "version", "capabilities", "skills"]
print("=== Agent Card Validation ===")
for field in required_fields:
    present = field in agent_card
    print(f"  {'✓' if present else '✗'} {field}")

# Simulate A2A task state machine
print("\\n=== A2A Task Lifecycle ===")
task_states = ["submitted", "working", "working", "completed"]
for i, state in enumerate(task_states):
    icon = {"submitted": "📤", "working": "⚙️", "completed": "✅", "failed": "❌", "input-required": "❓"}.get(state, "?")
    print(f"  Step {i+1}: {icon} {state.upper()}")

print("\\n=== Protocol Comparison ===")
comparison = [
    ("Protocol",  "Layer",          "Designed By",   "Primary Use Case"),
    ("MCP",       "Agent → Tool",   "Anthropic",     "Connect agent to tools/APIs/data"),
    ("A2A",       "Agent → Agent",  "Google+50",     "Agent-to-agent task delegation"),
    ("ACP",       "Agent → Agent",  "Cisco/LangChain","REST-native agent coordination"),
]
for row in comparison:
    print(f"  {row[0]:<8} {row[1]:<18} {row[2]:<18} {row[3]}")
`,
  },
  interview: {
    question: 'How would you explain the difference between MCP and A2A to a VP of Engineering evaluating agent infrastructure?',
    answer: `MCP and A2A solve different layers of the agent stack, and both are likely needed in a mature enterprise deployment.<br><br><strong>MCP (Model Context Protocol)</strong> is the tool connectivity layer. It defines how a single AI agent connects to external tools, APIs, databases, and file systems. Think of it as giving an agent hands — the ability to call a CRM, query a database, or run a code interpreter. MCP is Anthropic's standard and is now supported across Claude, many IDE tools, and a growing ecosystem of MCP servers.<br><br><strong>A2A (Agent-to-Agent Protocol)</strong> is the agent coordination layer. It defines how one AI agent discovers another specialist agent, hands off a task, and receives structured results. A2A is Google's standard with 50+ enterprise partners. It uses Agent Cards (JSON manifests at a well-known URL) to declare agent capabilities, and a standardized task state machine (submitted → working → completed) for async delegation.<br><br>The practical stack: an orchestrator agent uses MCP to call tools directly, and uses A2A to delegate to specialist agents that are more capable for a specific domain. For a VP evaluating infrastructure, the decision framework is: you'll likely need both layers, and picking standards-based protocols (vs proprietary point-to-point integrations) reduces vendor lock-in and maintenance costs as the agent ecosystem grows.`
  },
  pmAngle: 'A2A is a bet on the multi-agent future of enterprise AI. The PM question is not whether multi-agent architectures will happen — they will — but which coordination standards will win. Google\'s backing and the 50+ partner ecosystem gives A2A credibility, but ACP\'s REST-native design has simplicity advantages. For an Anthropic PM interview, know that Anthropic\'s MCP and Google\'s A2A are complementary (different layers), not competing. The ability to articulate this layered architecture clearly is a strong signal of AI infrastructure fluency.',
  resources: [
    { type: 'SPEC', title: 'A2A Protocol — google/A2A on GitHub', url: 'https://github.com/google-a2a/A2A', note: 'The canonical source. Read the Agent Card spec and task lifecycle docs.' },
    { type: 'BLOG', title: 'Google A2A Announcement', url: 'https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/', note: 'Original announcement with enterprise partner list and design rationale.' },
    { type: 'DOCS', title: 'MCP — Anthropic', url: 'https://modelcontextprotocol.io/introduction', note: 'The complementary tool-connectivity layer. Read alongside A2A.' },
    { type: 'BLOG', title: 'ACP — Agent Communication Protocol', url: 'https://agentcommunicationprotocol.dev/', note: 'The competing standard from Cisco/LangChain. Know the tradeoffs.' },
    { type: 'DOCS', title: 'A2A Python SDK', url: 'https://github.com/google-a2a/a2a-python', note: 'Official SDK. Useful for understanding the implementation surface area as a PM.' },
  ]
};
