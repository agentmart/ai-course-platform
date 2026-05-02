// Day 27 — Agent Communication Protocol (ACP)
// Updated: March 2026 | Review: BeeAI status, protocol convergence reality check

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[27] = {
  subtitle: 'IBM and Red Hat\u2019s open protocol for agent communication \u2014 the REST-native enterprise challenger.',
  context: `<p><strong>Agent Communication Protocol (ACP)</strong> was developed by the BeeAI team at IBM Research and released as an open standard in 2025. ACP\u2019s key differentiator from A2A: it is <strong>REST-first</strong> \u2014 agents are standard HTTP endpoints, requiring no custom agent runtime or specialized client libraries. Any service that speaks HTTP can participate in an ACP agent network. The "awaits" mechanism (analogous to A2A\u2019s "input-required" state) allows agents to pause and request additional context from the orchestrator.</p>
  <p><strong>Protocol convergence status:</strong> As of Q1 2026, A2A (Google) and ACP (IBM/Red Hat) represent different ecosystem bets. A2A is gaining traction in Google Cloud environments; ACP aligns with Red Hat OpenShift and IBM\u2019s enterprise Kubernetes customers. The protocol landscape continues to evolve. Check current adoption figures before making architectural recommendations \u2014 the course can\u2019t predict which standard will dominate.</p>
  <p><strong>When to choose ACP over A2A:</strong> (1) You\u2019re in a Red Hat/IBM/OpenShift ecosystem, (2) you want HTTP-native with no custom agent runtime (pure REST), (3) your team is more comfortable with REST patterns than agent-specific protocols. In practice, many enterprises aren\u2019t choosing between these protocols \u2014 they\u2019re using MCP for tool connectivity and evaluating A2A vs ACP based on their cloud provider allegiance.</p>`,
  tasks: [
    { title: 'Compare A2A and ACP specifications', description: 'Read both specs. Compare on: protocol type, authentication model, state management, ecosystem support, developer experience. Save as /day-27/a2a_vs_acp_comparison_table.md.', time: '25 min' },
    { title: 'Design an ACP-compliant agent endpoint', description: 'Write the REST API spec (routes, methods, request/response schemas) for an ACP-compliant data analysis agent. Save as /day-27/acp_agent_endpoint_spec.md.', time: '20 min' },
    { title: 'Protocol selection framework', description: 'For 5 enterprise scenarios, recommend: MCP only, A2A, ACP, or A2A+MCP. Include: cloud provider, team stack, compliance requirements. Save as /day-27/protocol_selection_framework.md.', time: '20 min' },
    { title: 'Verify current ACP adoption', description: 'Research current BeeAI/ACP status. Has it gained production traction? Are there notable deployments? Be honest about the maturity level. Save as /day-27/acp_adoption_check.md.', time: '15 min' }
  ],

  codeExample: {
    title: 'ACP envelope builder + protocol selection — JavaScript',
    lang: 'js',
    code: `// Day 27 — ACP (Agent Communication Protocol, IBM/Red Hat) message envelope builder
// Pedagogical goal: show ACP's REST-native shape and contrast with A2A/MCP
// so a PM can build an abstraction that survives whichever protocol wins.

function buildAcpEnvelope(opts) {
  // ACP messages are REST-native: HTTP POST a JSON envelope to /runs
  // with a list of typed Message Parts. No SSE-only streaming required.
  var now = new Date('2026-04-01T12:00:00Z').toISOString();
  var parts = (opts.parts || []).map(function (p, i) {
    return {
      part_id: 'p_' + (i + 1),
      content_type: p.contentType,
      content: p.content,
      role: p.role || 'user'
    };
  });
  return {
    protocol: 'acp',
    protocol_version: '0.4',
    run_id: opts.runId,
    agent: opts.agent,
    created_at: now,
    auth: { scheme: 'oauth2', token_hint: 'sk_***' },
    parts: parts,
    callback_url: opts.callbackUrl || null
  };
}

function validateEnvelope(env) {
  var errs = [];
  if (env.protocol !== 'acp') errs.push('protocol must be "acp"');
  if (!env.run_id) errs.push('run_id required');
  if (!env.agent) errs.push('agent required');
  if (!Array.isArray(env.parts) || env.parts.length === 0) {
    errs.push('parts must be non-empty');
  } else {
    env.parts.forEach(function (p, i) {
      if (!p.content_type) errs.push('parts[' + i + '].content_type missing');
      if (p.content === undefined) errs.push('parts[' + i + '].content missing');
    });
  }
  return errs;
}

// PM decision matrix: which protocol layer for which job?
var matrix = [
  { need: 'Agent calls a database tool',         pick: 'MCP', why: 'tool layer' },
  { need: 'Agent delegates task to specialist',  pick: 'A2A or ACP', why: 'agent-to-agent layer' },
  { need: 'REST-only enterprise gateway',        pick: 'ACP', why: 'no SSE requirement' },
  { need: 'Streaming partial results',           pick: 'A2A', why: 'SSE-native' },
  { need: 'Cross-cloud agent discovery',         pick: 'A2A', why: 'AgentCard at /.well-known' },
  { need: 'Internal-only agent mesh',            pick: 'ACP', why: 'simpler REST shape' }
];

// Build a sample envelope that a Contract Review orchestrator would send
// to a specialist Risk Clause agent.
var envelope = buildAcpEnvelope({
  runId: 'run_8c1f',
  agent: 'risk-clause-extractor@v2',
  parts: [
    { contentType: 'text/plain',       content: 'Extract IP and indemnity clauses.' },
    { contentType: 'application/json', content: { contract_id: 'C-1042', jurisdiction: 'DE' } }
  ],
  callbackUrl: 'https://orch.example.com/acp/cb/8c1f'
});

console.log('=== ACP Envelope (REST-native) ===');
console.log(JSON.stringify(envelope, null, 2));

console.log('\\n=== Validation ===');
var errors = validateEnvelope(envelope);
console.log(errors.length === 0 ? 'OK — envelope is valid' : 'ERRORS: ' + errors.join('; '));

console.log('\\n=== Negative test: missing parts ===');
var bad = buildAcpEnvelope({ runId: 'run_bad', agent: 'x', parts: [] });
console.log('errors=' + JSON.stringify(validateEnvelope(bad)));

console.log('\\n=== Protocol selection matrix ===');
matrix.forEach(function (row) {
  console.log('  ' + row.need.padEnd(38) + ' -> ' + row.pick.padEnd(12) + ' (' + row.why + ')');
});

// Abstraction shim: same intent, swap protocol at the edge.
function dispatch(intent, protocol) {
  if (protocol === 'acp') {
    return { transport: 'POST /runs',           body: 'ACP envelope' };
  }
  if (protocol === 'a2a') {
    return { transport: 'POST /tasks/send + SSE', body: 'A2A Message' };
  }
  if (protocol === 'mcp') {
    return { transport: 'JSON-RPC over stdio/ws', body: 'tools/call' };
  }
  throw new Error('unknown protocol ' + protocol);
}

console.log('\\n=== Abstraction shim — same intent, three protocols ===');
['acp', 'a2a', 'mcp'].forEach(function (p) {
  var d = dispatch('extract clauses', p);
  console.log('  ' + p.toUpperCase() + ': ' + d.transport + '  body=' + d.body);
});

console.log('\\n=== PM takeaway ===');
console.log('Build the abstraction. The protocol war is not over;');
console.log('your code should not care whether ACP, A2A, or both win.');
`,
  },

  interview: { question: 'There are now multiple agent communication protocols. How do you advise a team on which to adopt?', answer: `First, separate the layers: MCP for agent-to-tool connectivity is the clear standard regardless of which agent-to-agent protocol you choose. For agent-to-agent, the decision depends on ecosystem.<br><br>A2A (Google): best if you\u2019re on Google Cloud/Vertex AI, need the Agent Card discovery mechanism, or want the largest partner ecosystem.<br><br>ACP (IBM/Red Hat): best if you\u2019re on OpenShift/Kubernetes, want pure REST with no custom agent runtime, or your team prefers HTTP-native patterns over agent-specific protocols.<br><br>My practical advice: (1) adopt MCP immediately \u2014 it\u2019s mature and essential. (2) For agent-to-agent, evaluate based on your cloud provider. (3) Don\u2019t commit deeply to either A2A or ACP until the convergence picture clarifies. Build your agent interfaces behind an abstraction layer so you can switch protocols without rewriting agents. The worst outcome is coupling your architecture to a protocol that loses the standards battle.` },
  pmAngle: 'The protocol landscape is consolidating but not yet settled. The PM who builds behind an abstraction layer \u2014 so agents can switch protocols without rewriting \u2014 makes the right architectural bet regardless of which standard wins.',
  resources: [
    { type: 'DOCS', title: 'ACP Specification', url: 'https://agentcommunicationprotocol.dev/', note: 'REST-first agent communication. Verify current status.' },
    { type: 'GITHUB', title: 'BeeAI Framework', url: 'https://github.com/i-am-bee/beeai', note: 'IBM\u2019s agent framework implementing ACP. Check for rebranding.' },
    { type: 'GITHUB', title: 'A2A Specification', url: 'https://github.com/google/a2a', note: 'Compare directly with ACP for your protocol decision.' },
    { type: 'DOCS', title: 'MCP Specification', url: 'https://modelcontextprotocol.io/specification', note: 'The one protocol you should adopt regardless of A2A vs ACP choice.' }
  ]
};
