// Day 15 — LangChain & Orchestration Frameworks
// Updated: March 2026
// Review changes:
// - CRITICAL factual error fixed: LangSmith is LangChain's product, NOT Anthropic's
// - Added LangGraph as the primary agentic workflow approach (major omission)
// - Added Pydantic AI as fast-growing type-safe alternative
// - Updated orchestration decision guide with 2026 framework landscape
// - Updated LangChain version context (v0.3+, LCEL)

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

window.COURSE_DAY_DATA[15] = {
  subtitle: 'When orchestration adds real value — and when it is just complexity. The 2026 framework landscape.',

  context: `<p><strong>LangChain</strong> is an open-source Python/JavaScript framework for building LLM applications with composable chains, memory management, and tool integration. Its core abstraction is the <strong>LangChain Expression Language (LCEL)</strong> — a pipe syntax for composing chains: <code>prompt | llm | parser</code>. LCEL supports streaming and async natively, making it the right foundation for production LangChain work. LangChain's value is clearest in complex multi-step pipelines: multiple LLM calls, retrieval-augmented generation, and managed conversation state. For simple use cases — a single system prompt with conversation history — LangChain adds abstraction without adding value. The right approach is "use LangChain where its abstractions help, raw API calls everywhere else."</p>
  <p><strong>LangGraph</strong> is LangChain's evolution for agentic systems, and as of 2025 it is the primary recommended way to build stateful agentic workflows within the LangChain ecosystem. Where LangChain is chain-oriented (input → output), LangGraph is graph-oriented: agents are nodes, state flows along edges, and cycles are first-class (unlike sequential chains). This makes LangGraph dramatically better for multi-agent coordination, tool-use loops, and human-in-the-loop workflows. If you're building an agentic product on LangChain, you should be using LangGraph, not bare LCEL chains.</p>
  <p><strong>LangSmith</strong> is LangChain's commercial observability product — it traces every LLM call, shows the exact prompt sent, tokens used, latency, and output. It is a <em>LangChain product</em>, not an Anthropic product. This is a common misconception to correct: Anthropic and LangChain are separate companies; LangSmith is LangChain's commercial offering. Even if you don't use LangChain, the observability model LangSmith provides is the right mental model for production AI monitoring: capture inputs, outputs, tokens, latency, and errors for every LLM call. Langfuse is the leading open-source alternative.</p>
  <p><strong>Pydantic AI</strong>, released in late 2024 by the team behind Pydantic (the dominant Python data validation library), is a type-safe, model-agnostic agent framework that has gained significant traction among Python developers who want LangChain's orchestration power without its complexity. Its key advantage: end-to-end type safety using Python's type system, which makes agent code significantly easier to debug and maintain. If your team is Python-first and frustrated with LangChain's abstraction layers, Pydantic AI is worth evaluating as an alternative.</p>`,

  tasks: [
    {
      title: 'Build a simple LangChain LCEL chain',
      description: 'Use LangChain (Python or JS) with LCEL to build: user input → prompt template → Claude (claude-sonnet-4-6) → output parser that extracts a specific JSON field. Time how long it takes vs a direct API call. What does the LCEL abstraction actually give you in this case? Save as /day-15/langchain_simple_chain.py.',
      time: '30 min'
    },
    {
      title: 'Understand LangGraph vs LCEL',
      description: 'Read the LangGraph quickstart at python.langchain.com/docs/langgraph. What problem does the graph abstraction solve that LCEL chains cannot? Design (on paper) how you would model a 3-step research workflow with a conditional branch (if sources found → continue; if not → retry) as a LangGraph vs a LCEL chain. Which is clearer? Save as /day-15/langgraph_vs_langchain.md.',
      time: '25 min'
    },
    {
      title: 'Build the orchestration framework decision guide',
      description: 'Write a 1-page decision framework: for each of 5 different AI product scenarios (single LLM call, RAG Q&A, multi-step research agent, multi-agent coordination, enterprise .NET integration), specify which framework to use: raw API, LCEL, LangGraph, LlamaIndex, Pydantic AI, or Semantic Kernel. One-sentence rationale for each. Save as /day-15/orchestration_decision_guide.md.',
      time: '25 min'
    },
    {
      title: 'Analyze a LangSmith trace',
      description: 'If you have LangSmith access: run your Day 15 Task 1 chain and inspect the trace. If not: review the demo traces at smith.langchain.com. Answer: what information does a trace provide that you could not get from application logs alone? What does it show about token usage and latency distribution? Save findings as /day-15/langsmith_trace_analysis.md.',
      time: '20 min'
    }
  ],

  codeExample: {
    title: 'LangGraph state machine vs raw API \u2014 JavaScript comparison',
    lang: 'js',
    code: `// LangGraph vs Raw API \u2014 when the abstraction earns its keep
// Demonstrating the key difference: LangGraph manages state across agent loop cycles

// === PATTERN 1: Raw API (best for simple, stateless tasks) ===
var rawAPIPattern = {
  useCase: "Single extraction task, no loops, no state",
  pseudocode: [
    "// Direct API call \u2014 simple, transparent, easy to debug",
    "const response = await anthropic.messages.create({",
    "  model: 'claude-sonnet-4-6',",
    "  max_tokens: 1024,",
    "  system: 'Extract key contract terms as JSON',",
    "  messages: [{ role: 'user', content: contractText }]",
    "});"
  ],
  pros: ['Zero abstraction overhead', 'Full token visibility', 'Easy to debug', 'No framework dependency'],
  cons: ['No built-in state management', 'No cycle support', 'Manual error handling']
};

// === PATTERN 2: LangGraph (best for agentic loops with state) ===
var langGraphPattern = {
  useCase: "Research agent that searches, evaluates, and retries if needed",
  pseudocode: [
    "// LangGraph manages state across multiple agent cycles",
    "import { StateGraph, END } from '@langchain/langgraph';",
    "const workflow = new StateGraph({ channels: { query, searchResults, answer, retryCount } });",
    "workflow.addNode('search', searchNode);",
    "workflow.addNode('evaluate', evaluateNode);",
    "workflow.addNode('answer', answerNode);",
    "// Conditional edge: retry if sources insufficient",
    "workflow.addConditionalEdges('evaluate', (state) => {",
    "  if (state.retryCount < 3 && state.searchResults.length < 2) return 'search';",
    "  return 'answer';",
    "});"
  ],
  pros: ['State persists across cycles', 'Conditional routing is explicit', 'Human-in-loop built in', 'Parallel node execution'],
  cons: ['More setup than raw API', 'Overkill for simple tasks', 'LangChain dependency']
};

// === DECISION FRAMEWORK ===
var orchestrationDecisions = [
  { scenario: 'Single LLM call (extract, classify, summarize)', recommendation: 'Raw API', reason: 'No orchestration needed' },
  { scenario: 'RAG pipeline (retrieve + generate)', recommendation: 'LlamaIndex or LangChain LCEL', reason: 'Built-in retrieval abstractions' },
  { scenario: 'Agentic tool-use loop', recommendation: 'LangGraph', reason: 'State + cycles + conditional routing' },
  { scenario: 'Multi-agent coordination', recommendation: 'LangGraph or CrewAI', reason: 'Agent-to-agent message passing' },
  { scenario: 'Type-safe Python agent', recommendation: 'Pydantic AI', reason: 'End-to-end Python type safety' },
  { scenario: '.NET / Azure enterprise', recommendation: 'Semantic Kernel', reason: 'Native C# SDK, Azure integration' },
];

console.log('ORCHESTRATION DECISION FRAMEWORK — 2026');
console.log('='.repeat(60));
orchestrationDecisions.forEach(d => {
  console.log('\nScenario:       ' + d.scenario);
  console.log('Recommendation: ' + d.recommendation);
  console.log('Reason:         ' + d.reason);
});

console.log('\n' + '='.repeat(60));
console.log('CRITICAL CORRECTION:');
console.log('LangSmith is a LANGCHAIN product, not an Anthropic product.');
console.log('Anthropic and LangChain are separate companies.');
console.log('For Anthropic-native observability: use Anthropic console + Langfuse.');
console.log('For LangChain-native observability: LangSmith is the right tool.');`
  },

  interview: {
    question: 'When would you use an orchestration framework like LangChain vs calling the API directly?',
    answer: `The framework decision has gotten more nuanced in 2025-2026 because the landscape has matured. Here\u2019s my current framework:<br><br><strong>Raw API calls</strong> for: single LLM calls with a system prompt and conversation history (which is the majority of production features), anything where I need full token visibility and easy debugging, and early-stage products where framework churn would cost more than it saves.<br><br><strong>LangChain LCEL</strong> for: RAG pipelines where the built-in retriever integrations save significant boilerplate, multi-step processing chains with clear linear flow, and teams already standardized on LangChain.<br><br><strong>LangGraph</strong> for: agentic systems that require state across multiple tool-use cycles, workflows with conditional branching (retry if not enough results, escalate if confidence is low), and multi-agent coordination. LangGraph is now the primary recommendation for agentic LangChain work — not bare LCEL.<br><br><strong>Pydantic AI</strong> for: Python-first teams that want type safety end-to-end without LangChain\u2019s abstraction overhead. Growing fast in 2025.<br><br>One important correction: LangSmith is a LangChain product — not Anthropic\u2019s. It\u2019s an excellent observability tool for LangChain-based applications. For Anthropic-native observability, use Langfuse or Braintrust alongside the Anthropic console.`
  },

  pmAngle: 'The orchestration framework decision is an architectural PM call, not just an engineering preference. LangGraph vs raw API is a tradeoff between expressiveness and debuggability. The wrong choice adds tech debt that is painful to unwind six months later. Know the landscape well enough to make the call deliberately.',

  resources: [
    { type: 'DOCS', title: 'LangGraph — Agentic Workflows', url: 'https://python.langchain.com/docs/langgraph', note: 'The primary LangChain tool for agentic systems as of 2025. Replaces bare LCEL for agent loops.' },
    { type: 'DOCS', title: 'LangChain LCEL', url: 'https://python.langchain.com/docs/expression_language/', note: 'Pipe-based chain composition. Use for linear RAG/processing pipelines.' },
    { type: 'TOOL', title: 'LangSmith (LangChain\u2019s observability product)', url: 'https://www.langchain.com/langsmith', note: 'NOTE: LangChain product, not Anthropic. Tracing and evals for LangChain applications.' },
    { type: 'DOCS', title: 'Pydantic AI', url: 'https://ai.pydantic.dev/', note: 'Type-safe, model-agnostic agent framework. Growing fast in Python-first teams. Released late 2024.' },
    { type: 'TOOL', title: 'Langfuse — Open-Source Observability', url: 'https://langfuse.com/', note: 'Best open-source alternative to LangSmith. Works with any LLM framework.' }
  ]
};
