// Day 26 — Agent-to-Agent Protocol (A2A)
// Updated: March 2026 | Review: spec evolution, OAuth, MCP+A2A architecture

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[26] = {
  subtitle: 'Google\u2019s open standard for agent-to-agent collaboration \u2014 the protocol that connects agents to other agents.',
  context: `<p><strong>Agent-to-Agent Protocol (A2A)</strong> was announced by Google in April 2025 as an open standard for communication between AI agents. Where MCP (Day 12) solves agent-to-tool connections, A2A solves agent-to-agent: how two autonomous agents \u2014 potentially from different vendors, different models, different infrastructure \u2014 collaborate on a task. The analogy: MCP is USB (agent to peripheral); A2A is work assignment between contractors.</p>
  <p>A2A\u2019s core concepts: An <strong>Agent Card</strong> (JSON) describes an agent\u2019s capabilities, endpoint, and authentication requirements. <strong>Tasks</strong> flow through five states: submitted, working, input-required, completed, or failed/canceled. The input-required state is the human-in-the-loop mechanism. The specification has evolved since the initial release; always check the <a href="https://github.com/google/a2a" target="_blank">official A2A repository</a> for the current version. A2A now supports <strong>OAuth 2.0</strong> for enterprise authentication.</p>
  <p><strong>MCP + A2A together form the agentic architecture:</strong> User \u2192 Orchestrator Agent (uses A2A to delegate to) \u2192 Specialist Agents (each uses MCP to access) \u2192 Tools/Databases. This two-layer architecture is the most important diagram a PM can draw about agentic systems in 2026.</p>`,
  tasks: [
    { title: 'Design an Agent Card', description: 'Write a complete A2A Agent Card (JSON) for a Contract Review Agent. Include: name, description, capabilities, endpoint URL, authentication (OAuth 2.0), supported task types. Save as /day-26/a2a_agent_card.json.', time: '20 min' },
    { title: 'Draw the MCP + A2A architecture', description: 'Draw the two-layer architecture: which agents communicate via A2A, which tool calls use MCP, where the Orchestrator sits. Label each connection. Save as /day-26/mcp_a2a_architecture.md.', time: '20 min' },
    { title: 'Map the A2A task lifecycle', description: 'Walk through the 5 task states with a specific example. When does input-required trigger? How does human-in-the-loop work? Save as /day-26/a2a_task_lifecycle.md.', time: '20 min' },
    { title: 'Protocol decision framework', description: 'When to use MCP alone, A2A alone, or both together. Include 3 product scenarios for each. Save as /day-26/protocol_decision_framework.md.', time: '20 min' }
  ],
  interview: { question: 'Explain the difference between MCP and A2A.', answer: 'MCP connects agents to tools \u2014 how a single agent discovers and calls external capabilities. A2A connects agents to other agents \u2014 how autonomous agents collaborate on tasks.<br><br>The analogy: MCP is USB (universal connector for peripherals). A2A is a work order system between contractors \u2014 one agent submits a task, another executes it, with defined states.<br><br>In production, you use both: Orchestrator delegates to Specialists via A2A, each Specialist accesses tools via MCP. This two-protocol architecture is the standard agentic design in 2026. Key A2A features: Agent Cards for discovery, OAuth 2.0 for enterprise auth, input-required state for human-in-the-loop.' },
  pmAngle: 'A2A and MCP together form the plumbing of the agentic internet. The PM who can explain this two-layer architecture and draw the diagram clearly demonstrates the architectural fluency frontier labs expect.',
  resources: [
    { type: 'GITHUB', title: 'A2A Specification', url: 'https://github.com/google/a2a', note: 'Official spec. Check current version before citing schema details.' },
    { type: 'DOCS', title: 'MCP Specification', url: 'https://spec.modelcontextprotocol.io/', note: 'The complementary protocol. MCP for tools, A2A for agents.' },
    { type: 'BLOG', title: 'Google A2A Announcement', url: 'https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/', note: 'Launch context and partner ecosystem.' },
    { type: 'BLOG', title: 'Building Effective Agents', url: 'https://www.anthropic.com/research/building-effective-agents', note: 'Apply Anthropic agent design principles to A2A architectures.' }
  ]
};
