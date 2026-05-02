// Day 22 — CrewAI & Multi-Agent Systems
// Updated: March 2026 | Review: CrewAI Flows, memory, async, updated cost framework

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[22] = {
  subtitle: 'Multi-agent systems with role-based collaboration \u2014 when one agent isn\u2019t enough.',
  context: `<p><strong>CrewAI</strong> is an open-source framework for orchestrating multiple AI agents with defined roles, goals, and tools. The core metaphor: a "crew" of specialists \u2014 a Researcher, Writer, and Editor \u2014 each with a system prompt, tool set, and explicit role. CrewAI v0.80+ (2025) introduced major additions: <strong>CrewAI Flows</strong> (code-based orchestration with explicit state management), <strong>entity memory</strong> (what the agent knows about specific entities), <strong>short-term and long-term memory</strong>, and <strong>async task execution</strong>. The <strong>CrewAI Enterprise</strong> managed platform provides skill registries relevant to Day 46.</p>
  <p><strong>CrewAI Flows</strong> complement the traditional Crew pattern. Where Crews are declarative (define agents, tasks, and process type), Flows are code-first: you define functions decorated with <code>@start()</code> and <code>@listen()</code> to create event-driven workflows with explicit state management. Flows are better for PMs to understand because the control flow is visible in the code, not hidden in the framework\u2019s routing logic.</p>
  <p>For PMs, the multi-agent architecture question: when is one powerful agent better than many specialized ones? Build with a single agent first. Add multi-agent only when you hit quality ceilings \u2014 tasks requiring genuine specialization (legal reasoning AND financial analysis simultaneously), or context is too large for one agent to handle effectively. Multi-agent systems are harder to debug, more expensive, and introduce coordination failure modes. The <strong>human_input</strong> parameter on CrewAI tasks enables human-in-the-loop for compliance use cases.</p>`,
  tasks: [
    { title: 'Design a 3-agent crew for competitive research', description: 'Define each agent\u2019s role, goal, backstory, and 3 tools. Define 4 sequential tasks with explicit expected outputs. Calculate cost per run using current pricing (don\u2019t use old model names). Save as /day-22/competitor_research_crew.md.', time: '25 min' },
    { title: 'Sequential vs hierarchical process comparison', description: 'Design the same workflow in both modes. In hierarchical: what decisions does the manager agent make? What goes wrong if the manager misunderstands? Write failure mode analysis. Save as /day-22/sequential_vs_hierarchical.md.', time: '20 min' },
    { title: 'Single agent vs multi-agent quality test', description: 'Choose a task needing 3 capabilities. Design as: (a) one agent with 3 tools, (b) a 3-agent crew. Which produces better output? Which is easier to debug? Save as /day-22/single_vs_multi_agent_test.md.', time: '25 min' },
    { title: 'Cost and latency analysis framework', description: 'A 3-agent crew makes 2 LLM calls per agent averaging 3K input, 800 output tokens. Calculate cost at current Sonnet 4.6 pricing (verify at anthropic.com/pricing). At 100 runs/day, monthly cost? Use the formula, not hardcoded numbers. Save as /day-22/cost_latency_analysis.md.', time: '10 min' },
  ],

  codeExample: {
    title: 'Multi-agent roles & message bus — JavaScript',
    lang: 'js',
    code: `// Day 22 — Multi-Agent Roles & Simulated Message Bus
//
// CrewAI/AutoGen-style multi-agent systems hide a simple shape: a few
// agents with distinct system prompts coordinated by a message bus and a
// process type (sequential vs hierarchical). This script encodes that
// shape WITHOUT calling any LLM — the "responses" are deterministic stubs
// — so the architecture is visible. Use it as a mental model before you
// reach for the real frameworks.

const ROLES = {
  RESEARCHER: {
    name: 'researcher',
    goal: 'Find authoritative sources for a topic.',
    backstory: 'Senior analyst, prefers primary sources, cites every claim.',
    tools: ['web_search', 'arxiv_lookup'],
    model: 'claude-sonnet-4-6',
  },
  WRITER: {
    name: 'writer',
    goal: 'Turn researcher notes into a 1-page brief.',
    backstory: 'Former journalist, optimizes for executive readability.',
    tools: ['markdown_format'],
    model: 'claude-sonnet-4-6',
  },
  CRITIC: {
    name: 'critic',
    goal: 'Find weak claims and missing citations.',
    backstory: 'Skeptical editor, will reject drafts with unsupported claims.',
    tools: [],
    model: 'claude-opus-4-6', // higher-reasoning model for critique
  },
};

// --- Message bus ---------------------------------------------------------
function makeBus() {
  const log = [];
  return {
    send(from, to, content) { log.push({ ts: log.length, from, to, content }); },
    history: () => log.slice(),
  };
}

// --- Stub "agent" — returns deterministic output keyed off the inbox ----
function runAgent(role, inboxContent) {
  switch (role.name) {
    case 'researcher':
      return [
        'NOTES on: ' + inboxContent,
        '- source: anthropic.com/news/claudes-constitution',
        '- key claim: CAI reduces dependence on RLHF preference labels',
      ].join('\\n');
    case 'writer':
      return [
        '# Executive brief',
        '',
        'Constitutional AI trains models against a written set of rules ' +
        'instead of pure preference labels.',
        '',
        'Sources: anthropic.com/news/claudes-constitution; arxiv.org/abs/2212.08073',
      ].join('\\n');
    case 'critic':
      const draft = inboxContent || '';
      const issues = [];
      if (!/source/i.test(draft)) issues.push('missing source citations');
      if (draft.split(' ').length < 25) issues.push('too short for an exec brief');
      return issues.length === 0
        ? 'APPROVE — claims supported by sources.'
        : 'REJECT — ' + issues.join('; ');
    default:
      return '';
  }
}

// --- Sequential process --------------------------------------------------
function runSequential(topic) {
  const bus = makeBus();
  bus.send('user', ROLES.RESEARCHER.name, topic);
  const notes = runAgent(ROLES.RESEARCHER, topic);
  bus.send(ROLES.RESEARCHER.name, ROLES.WRITER.name, notes);
  const draft = runAgent(ROLES.WRITER, notes);
  bus.send(ROLES.WRITER.name, ROLES.CRITIC.name, draft);
  const verdict = runAgent(ROLES.CRITIC, draft);
  bus.send(ROLES.CRITIC.name, 'user', verdict);
  return { draft, verdict, history: bus.history() };
}

// --- Hierarchical process (manager routes) ------------------------------
function runHierarchical(topic) {
  const bus = makeBus();
  bus.send('user', 'manager', topic);
  const order = [ROLES.RESEARCHER, ROLES.WRITER, ROLES.CRITIC];
  let payload = topic;
  for (const role of order) {
    bus.send('manager', role.name, payload);
    payload = runAgent(role, payload);
    bus.send(role.name, 'manager', payload);
  }
  bus.send('manager', 'user', payload);
  return { final: payload, history: bus.history() };
}

// --- Run the demo --------------------------------------------------------
console.log('=== Sequential process ===');
const seq = runSequential('Constitutional AI for product teams');
console.log('DRAFT:\\n' + seq.draft);
console.log('CRITIC:', seq.verdict);
console.log('messages on the bus:', seq.history.length);

console.log('\\n=== Hierarchical process (manager-routed) ===');
const hier = runHierarchical('Constitutional AI for product teams');
console.log('FINAL:', hier.final);
console.log('messages on the bus:', hier.history.length);

// --- Cost & latency napkin math -----------------------------------------
const PRICES = {
  'claude-sonnet-4-6':  { in_per_mtok: 3.00, out_per_mtok: 15.00 },
  'claude-opus-4-6':    { in_per_mtok: 15.00, out_per_mtok: 75.00 },
};
function napkinCost(role, inTok, outTok) {
  const p = PRICES[role.model];
  return ((inTok / 1e6) * p.in_per_mtok) + ((outTok / 1e6) * p.out_per_mtok);
}
const perRun =
  napkinCost(ROLES.RESEARCHER, 1500, 600) +
  napkinCost(ROLES.WRITER,     1500, 500) +
  napkinCost(ROLES.CRITIC,     2000, 200);
console.log('\\nPer-run cost (rough):  $' + perRun.toFixed(4));
console.log('At 100 runs/day, monthly: $' + (perRun * 100 * 30).toFixed(2));
console.log('\\nPM takeaway: hierarchical ~doubles bus traffic; pay only when the manager makes real decisions.');
`,
  },
  interview: { question: 'When would you choose a multi-agent framework like CrewAI over a single agent?', answer: `Multi-agent when three conditions hold: the task genuinely requires different reasoning modes benefiting from distinct contexts, single-agent quality plateaus despite better prompting, and latency/cost overhead is acceptable.<br><br>Good candidates: research reports (research agent doesn\u2019t need formatting context; writer doesn\u2019t need search context), code review pipelines (security, style, logic agents), complex analysis requiring independent perspectives.<br><br>Avoid multi-agent when: the task is fundamentally single-threaded, context fits in one agent, or debugging matters more than peak quality. CrewAI\u2019s 2025 additions \u2014 Flows for explicit state management, entity memory, and human_input for compliance \u2014 make it more enterprise-ready, but the complexity cost is still real.<br><br>Practical rule: start with one agent. Add a second when quality hits a ceiling. Add a third only with clear architectural justification.` },
  pmAngle: 'Multi-agent systems are easy to over-engineer. The complexity cost is real: harder to debug, more expensive, coordination failure modes. CrewAI Flows make state management explicit, which helps. But build the simplest thing that works first.',
  resources: [
    { type: 'DOCS', title: 'CrewAI Documentation', url: 'https://docs.crewai.com', note: 'Core concepts: agents, tasks, crews, processes, Flows. Check for v0.80+ features.' },
    { type: 'DOCS', title: 'CrewAI Flows', url: 'https://docs.crewai.com/concepts/flows', note: 'Code-based orchestration with @start() and @listen() decorators.' },
    { type: 'GITHUB', title: 'CrewAI Examples', url: 'https://github.com/crewAIInc/crewAI-examples', note: 'Production crew implementations for common use cases.' },
    { type: 'BLOG', title: 'Building Effective Agents \u2014 Anthropic', url: 'https://www.anthropic.com/research/building-effective-agents', note: 'Anthropic\u2019s guide to reliable agentic systems. Read before designing any crew.' },
    { type: 'PRICING', title: 'Anthropic Pricing (live)', url: 'https://www.anthropic.com/pricing', note: 'Use current pricing for cost calculations. Never hardcode.' },
    { type: 'DOCS', title: 'CrewAI Human Input', url: 'https://docs.crewai.com/concepts/tasks#human-input', note: 'Human-in-the-loop for compliance. Critical for regulated industries.' }
  ]
};
