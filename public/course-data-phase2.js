// Phase 2 course content — Days 21-40
// Loaded by course.html; extends window.COURSE_DAY_DATA

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

Object.assign(window.COURSE_DAY_DATA, {

21: {
  subtitle: 'The retrieval and document-intelligence framework that powers production knowledge apps.',
  context: `<p><strong>LlamaIndex</strong> (formerly GPT Index) is a data framework purpose-built for connecting LLMs to external data. Where LangChain is a general-purpose orchestration layer, LlamaIndex is optimized for one specific and extremely common pattern: index a corpus of documents, then query it intelligently at runtime. Its core primitives — <strong>Documents</strong> (raw text/PDF/HTML), <strong>Nodes</strong> (chunked units with metadata), <strong>Indexes</strong> (vector, keyword, knowledge graph), and <strong>Query Engines</strong> (retrieval + synthesis) — map cleanly onto the product problem of "give the model access to my company's documents."</p>
  <p>LlamaIndex's standout capability is its document loaders ecosystem: built-in connectors for Notion, Google Drive, Slack, Confluence, GitHub, Salesforce, and dozens of other sources. In a production enterprise product, the hardest part of RAG is often not the retrieval logic — it's ingesting, cleaning, and keeping current the diverse document sources that constitute organizational knowledge. LlamaIndex's <strong>LlamaHub</strong> provides pre-built loaders that handle authentication, incremental sync, and metadata preservation for each source. This is months of engineering work you don't have to do.</p>
  <p>The <strong>RouterQueryEngine</strong> and <strong>SubQuestionQueryEngine</strong> are LlamaIndex's answer to multi-step reasoning over documents. A SubQuestionQueryEngine decomposes a complex question ("What did our Q3 revenue look like compared to last year's forecast?") into sub-questions that each query different indexes, then synthesizes the results. This architecture handles analytical questions that a simple embedding similarity search can't answer. For AI PMs, this distinction — "what can a retrieval system answer?" vs. "what requires synthesis across multiple retrievals?" — is the core architectural question behind every document intelligence product.</p>`,
  tasks: [
    { title: 'Map LlamaIndex vs LangChain for your use case', description: 'For a product that lets employees search internal documents: document which 5 specific capabilities you would use from LlamaIndex vs LangChain. Where do they overlap? Where is each clearly better? Which would you choose as your primary framework?', time: '20 min' },
    { title: 'Design a multi-source document index', description: 'Your product ingests Confluence, Slack, and Google Drive. Design: how often you sync each source, how you handle deleted documents, what metadata you preserve, how you handle permission-gated docs (only show results the user can access). Write the architecture spec.', time: '25 min' },
    { title: 'Explore LlamaHub loaders', description: 'Go to llamahub.ai. Find loaders for Confluence and Notion. Read the code or README for each. What authentication does each require? What metadata does each preserve? What are the rate-limit implications for initial indexing of 50,000 pages?', time: '20 min' },
    { title: 'Design a SubQuestion query for a PM use case', description: 'Write a complex business question (e.g., "How has our NPS changed since we launched the new onboarding flow, and what feedback themes correlate with the change?"). Decompose it into 4 sub-questions. What data source does each sub-question need?', time: '15 min' },
  ],
  codeExample: {
    title: 'LlamaIndex document pipeline simulation — JavaScript',
    lang: 'js',
    code: `// LlamaIndex core concepts: Document → Node → Index → QueryEngine
// (Conceptual simulation of the pipeline)

// Step 1: Documents — raw content with metadata
const documents = [
  { id: 'doc_001', text: 'Q3 2025 revenue was $4.2M, up 18% YoY. EMEA grew fastest at 34%.', source: 'confluence', title: 'Q3 Board Report' },
  { id: 'doc_002', text: 'Product NPS improved from 42 to 58 after the onboarding redesign in August.', source: 'notion', title: 'Product Metrics Q3' },
  { id: 'doc_003', text: 'Customer support volume dropped 22% post-redesign. Top issue: billing confusion.', source: 'zendesk', title: 'Support Summary Aug-Sep' },
];

// Step 2: Nodes — chunked with metadata inheritance
function documentToNodes(doc, chunkSize = 50) {
  const words = doc.text.split(' ');
  const nodes = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    nodes.push({
      id: \`\${doc.id}_node_\${Math.floor(i/chunkSize)}\`,
      text: words.slice(i, i + chunkSize).join(' '),
      metadata: { docId: doc.id, source: doc.source, title: doc.title },
    });
  }
  return nodes;
}

const allNodes = documents.flatMap(documentToNodes);

// Step 3: Index — in production, embed each node and store in vector DB
function mockSearch(query, nodes, topK = 2) {
  // Simulate relevance by counting keyword matches
  return nodes
    .map(n => ({
      ...n,
      score: query.toLowerCase().split(' ').filter(w => n.text.toLowerCase().includes(w)).length
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// Step 4: Query Engine — retrieval + synthesis
function queryEngine(question) {
  const results = mockSearch(question, allNodes);
  console.log('Query:', question);
  console.log('Retrieved nodes:');
  results.forEach(r => {
    console.log(' [' + r.metadata.title + '] ' + r.text.slice(0, 80) + '...');
  });
  console.log('→ Synthesize these chunks with LLM to answer the question\n');
}

queryEngine('What was our revenue growth and NPS improvement?');
queryEngine('How did onboarding redesign affect support volume?');
console.log('Total nodes indexed:', allNodes.length, '(from', documents.length, 'documents)');
console.log('Sources:', [...new Set(allNodes.map(n => n.metadata.source))].join(', '));`
  },
  interview: {
    question: 'When would you use LlamaIndex vs LangChain for a document intelligence product?',
    answer: `LlamaIndex is the right choice when the core problem is: "Help users find, retrieve, and reason over a large corpus of documents." It was designed for this specific use case and has deeper out-of-the-box support for document loading, chunking strategies, index types, and query decomposition. The LlamaHub ecosystem of pre-built loaders for Confluence, Notion, Google Drive, and Slack is a significant practical advantage — that\'s months of integration work that\'s already done.<br><br>LangChain is the right choice when you\'re building a general-purpose agent that needs to orchestrate multiple capabilities — web search, API calls, tool use, and retrieval as one of many steps. LangChain\'s LCEL composability and broader tool ecosystem make it better for workflows that go beyond document Q&A.<br><br>In practice, many production teams use both: LlamaIndex for the indexing and retrieval layer, LangChain for the orchestration layer that calls the retrieval engine as one of its tools. The interoperability between them (LlamaIndex as a LangChain retriever) is well-supported and often the right architecture for complex enterprise products.`
  },
  pmAngle: 'LlamaIndex\'s most underrated feature for enterprise sales is its permission-aware retrieval — the ability to filter results to only documents the querying user can access. Without this, document Q&A products are a compliance nightmare. Design this into your architecture from day one.',
  resources: [
    { type: 'DOCS', title: 'LlamaIndex Documentation', url: 'https://docs.llamaindex.ai', note: 'Start with the quickstart and the document loaders overview.' },
    { type: 'HUB', title: 'LlamaHub — Data Loaders', url: 'https://llamahub.ai', note: 'Pre-built connectors for Notion, Confluence, Google Drive, Slack, and 100+ more.' },
    { type: 'BLOG', title: 'LlamaIndex vs LangChain', url: 'https://www.llamaindex.ai/blog/llamaindex-vs-langchain', note: 'The framework\'s own comparison — read critically.' },
  ]
},

22: {
  subtitle: 'Multi-agent systems with role-based collaboration — when one agent isn\'t enough.',
  context: `<p><strong>CrewAI</strong> is an open-source framework for orchestrating multiple AI agents with defined roles, goals, and tools, working collaboratively to complete complex tasks. The core metaphor is a "crew" of specialized workers: you define a <strong>Researcher agent</strong>, a <strong>Writer agent</strong>, and an <strong>Editor agent</strong>, each with a system prompt, a tool set, and an explicit role. A <strong>Crew</strong> orchestrates them via a <strong>Process</strong> — sequential (each agent passes output to the next) or hierarchical (a manager agent delegates to workers). This role decomposition produces better results than one general agent on complex multi-step tasks because each agent's context is focused on one specialty.</p>
  <p>CrewAI's key architectural decisions differ from LangChain agents or AutoGen in important ways. <strong>Tasks</strong> in CrewAI are explicit objects: they have a description, an expected output, and an assigned agent. This structured task decomposition is the primary driver of output quality. Vague tasks produce vague outputs; precise task descriptions with explicit expected output formats produce consistent, usable results. The <strong>hierarchical process</strong> pattern — where a manager LLM dynamically assigns tasks to workers rather than following a fixed sequence — is CrewAI\'s answer to dynamic agentic workflows where the exact sequence of steps isn\'t known in advance.</p>
  <p>For AI PMs, the multi-agent architecture question arises frequently: when is one powerful agent better than many specialized ones? The answer depends on task complexity and context window constraints. A single agent with access to all tools and a long context can handle moderate complexity. When tasks require genuine specialization (legal reasoning AND financial analysis AND competitive research simultaneously), role-based decomposition consistently produces higher quality. The main cost: multi-agent systems are harder to debug, more expensive, and introduce coordination overhead. Build with a single agent first, add multi-agent architecture only when you hit quality ceilings you can\'t solve with better prompting.</p>`,
  tasks: [
    { title: 'Design a multi-agent crew for a PM use case', description: 'Design a 3-agent crew for: generating a competitive teardown report. Define each agent\'s role, goal, backstory, and the 3 tools it needs. Define the 4 tasks in sequence. What\'s the expected output of each task? What\'s the final deliverable?', time: '25 min' },
    { title: 'Sequential vs hierarchical process comparison', description: 'For a research pipeline, design the same workflow in both sequential and hierarchical modes. In the hierarchical version, what decisions does the manager agent make? What goes wrong if the manager LLM misunderstands the task? Write the failure mode analysis.', time: '20 min' },
    { title: 'CrewAI vs single-agent comparison', description: 'Choose a task that requires 3 distinct capabilities. Implement it as: (a) one agent with 3 tools, (b) a 3-agent crew. Run both on the same input. Which produces better output? Which is easier to debug when it fails?', time: '25 min' },
    { title: 'Cost and latency analysis', description: 'A 3-agent sequential crew processes one task. Each agent makes 2 LLM calls averaging 3,000 tokens input, 800 tokens output. At Claude 3.5 Sonnet pricing, what\'s the cost per run? At 100 runs/day, what\'s the monthly cost? Compare to a single agent handling the same task.', time: '10 min' },
  ],
  codeExample: {
    title: 'CrewAI architecture pattern — JavaScript',
    lang: 'js',
    code: `// CrewAI conceptual structure — agents, tasks, and crew orchestration

// Define agents
const agents = {
  researcher: {
    role: 'Senior Market Research Analyst',
    goal: 'Find accurate, current competitive intelligence on AI PM tools',
    backstory: 'Expert at synthesizing product comparisons from docs, changelogs, and user reviews',
    tools: ['web_search', 'read_url', 'summarize_doc'],
  },
  analyst: {
    role: 'Product Strategy Analyst',
    goal: 'Identify gaps and opportunities from competitive data',
    backstory: 'Former PM at a top-5 SaaS company with deep experience in competitive positioning',
    tools: ['analyze_data', 'create_matrix'],
  },
  writer: {
    role: 'Technical Content Writer',
    goal: 'Produce a structured, executive-ready competitive teardown report',
    backstory: 'Turns complex analysis into crisp, decision-useful documents',
    tools: ['write_document', 'format_markdown'],
  },
};

// Define tasks (explicit descriptions + expected outputs)
const tasks = [
  {
    agent: 'researcher',
    description: 'Research the top 5 AI-native PM tools (Notion AI, Linear AI, Productboard AI, Aha!, Jira AI). For each: features, pricing, integration depth, user reviews.',
    expectedOutput: 'Structured JSON with features, pricing, and 3 user sentiment quotes per tool.',
  },
  {
    agent: 'analyst',
    description: 'Given the research data, identify: (1) the biggest feature gap in current tools, (2) pricing white space, (3) top 3 unmet user needs.',
    expectedOutput: 'Strategic analysis with 3 specific opportunities ranked by market size.',
  },
  {
    agent: 'writer',
    description: 'Write a 2-page competitive teardown report using the research and analysis. Include: market map, feature comparison table, strategic recommendations.',
    expectedOutput: 'Professional report in markdown, ready to share with leadership.',
  },
];

// Sequential crew execution simulation
console.log('CrewAI Sequential Process');
console.log('═'.repeat(50));
let context = {};
tasks.forEach((task, i) => {
  const agent = agents[task.agent];
  console.log('\nStep ' + (i+1) + ' — ' + agent.role);
  console.log('Task:', task.description.slice(0, 70) + '...');
  console.log('Tools:', agent.tools.join(', '));
  console.log('Expected output:', task.expectedOutput.slice(0, 60) + '...');
  context['step' + (i+1)] = 'Output from ' + task.agent + ' passed to next agent';
});
console.log('\nFinal output: Executive competitive teardown report');
console.log('Total LLM calls: ~6 (2 per agent) | Estimated cost: ~$0.25/run');`
  },
  interview: {
    question: 'When would you choose a multi-agent framework like CrewAI over a single agent with multiple tools?',
    answer: `I use multi-agent architecture when three conditions hold: the task genuinely requires different reasoning modes that benefit from distinct contexts, the output quality from a single agent plateaus despite better prompting and tool design, and the latency and cost overhead is acceptable for the use case.<br><br>Good candidates for multi-agent: research reports (research agent doesn\'t need to know about formatting; writer agent doesn\'t need to know about search), code review pipelines (security agent, style agent, logic agent), and complex analysis tasks where independent "perspectives" improve output quality.<br><br>I avoid multi-agent when: the task is fundamentally sequential with a single reasoning thread (one agent can do it), the context is small enough that one agent can hold the full picture, or when debugging and observability matter more than peak output quality (multi-agent chains are significantly harder to trace and debug).<br><br>The practical rule: start with one agent. Add a second when you hit a quality ceiling you can\'t clear. Add a third only when you have a clear architectural reason for the separation.`
  },
  pmAngle: 'Multi-agent systems are easy to over-engineer. The complexity cost is real: they\'re harder to debug, more expensive, and introduce coordination failure modes that single-agent systems don\'t have. Build the simplest thing that works first.',
  resources: [
    { type: 'DOCS', title: 'CrewAI Documentation', url: 'https://docs.crewai.com', note: 'Core concepts: agents, tasks, crews, and processes.' },
    { type: 'GITHUB', title: 'CrewAI Examples', url: 'https://github.com/crewAIInc/crewAI-examples', note: 'Real-world crew implementations across common use cases.' },
    { type: 'BLOG', title: 'Multi-Agent Design Patterns', url: 'https://www.anthropic.com/research/building-effective-agents', note: 'Anthropic\'s guide to building reliable agentic systems.' },
  ]
},

23: {
  subtitle: 'Microsoft\'s production-grade multi-agent framework — asynchronous, event-driven, enterprise-ready.',
  context: `<p><strong>AutoGen</strong> is Microsoft Research\'s open-source framework for building multi-agent AI systems. Version 0.4, released in January 2025, was a complete architectural redesign — moving from a synchronous, conversation-based model to an <strong>asynchronous, event-driven architecture</strong>. The new layered structure has three tiers: <strong>Core</strong> (the foundational event-driven actor framework), <strong>AgentChat</strong> (a task-driven high-level API with pre-built agents like AssistantAgent and UserProxyAgent), and <strong>Extensions</strong> (integrations for memory, model clients, tools, and storage). By late 2025, AutoGen had released through v0.6, adding streaming tools, GraphFlow for directed agent graphs, and Mem0 memory integration.</p>
  <p>AutoGen\'s key differentiator from CrewAI and LangChain Agents is its emphasis on <strong>human-in-the-loop patterns</strong> and <strong>enterprise observability</strong>. The UserProxyAgent provides a clean abstraction for injecting human review and approval at any point in an agent workflow — critical for enterprise deployments where fully autonomous AI action is not permitted. AutoGen Studio, the low-code visual interface rebuilt on v0.4, lets non-engineers build and test agent teams without writing code. Tight integration with Semantic Kernel means AutoGen workflows can be deployed into Azure-hosted enterprise environments. The Microsoft ecosystem advantage is significant for teams already using Azure OpenAI, Copilot Studio, or .NET infrastructure.</p>
  <p>The most important AutoGen concept for AI PMs is the distinction between <strong>task-driven</strong> (AgentChat) and <strong>event-driven</strong> (Core) programming models. AgentChat is appropriate for linear agentic workflows — a user submits a task, agents collaborate, a result is returned. Core is appropriate for continuous, long-running agent systems where agents react to asynchronous events — an email arrives, a monitoring alert fires, a scheduled job triggers. Most products start with AgentChat and move to Core only when they need event-driven patterns. Knowing which you\'re building is the first architectural question.</p>`,
  tasks: [
    { title: 'Compare AutoGen vs CrewAI for your use case', description: 'For an enterprise document processing pipeline: compare AutoGen and CrewAI on 5 dimensions — observability, human-in-the-loop support, enterprise deployment (Azure), developer experience, and community ecosystem. Which would you choose and why?', time: '25 min' },
    { title: 'Design an AutoGen workflow with human approval', description: 'You are building an expense approval AI that reviews expense reports and approves or flags for human review. Design the AutoGen team: which agents, what the human approval step looks like, and what happens when the UserProxyAgent rejects an AI decision.', time: '25 min' },
    { title: 'Explore AutoGen Studio', description: 'Install AutoGen Studio (pip install autogenstudio) or review the documentation at microsoft.github.io/autogen. Build a two-agent workflow (AssistantAgent + UserProxyAgent) for a simple task. What does the visual interface give you that code alone doesn\'t?', time: '25 min' },
    { title: 'AutoGen architecture decision guide', description: 'For 3 different enterprise AI products: decide between AgentChat (task-driven) and Core (event-driven). Products: (a) a quarterly report generator, (b) a real-time alert triage system, (c) a nightly document processing pipeline. Write the architectural rationale for each.', time: '15 min' },
  ],
  codeExample: {
    title: 'AutoGen v0.4 AgentChat pattern — JavaScript',
    lang: 'js',
    code: `// AutoGen v0.4 conceptual architecture — AgentChat task-driven pattern
// Production: uses Python autogen-agentchat package

// Agent definitions following AutoGen v0.4 structure
const agentDefinitions = {
  assistant: {
    type: 'AssistantAgent',
    name: 'expense_reviewer',
    systemMessage: 'You are an expense review agent. Analyze expense reports for policy compliance. Flag any expense over $500 or missing receipts.',
    modelClient: 'claude-3-5-sonnet', // or OpenAIChatCompletionClient
    tools: ['query_policy_db', 'check_receipt_exists', 'calculate_totals'],
  },
  userProxy: {
    type: 'UserProxyAgent',
    name: 'finance_team',
    humanInputMode: 'TERMINATE', // Ask human when agent says APPROVE or FLAG
    maxConsecutiveAutoReply: 3,
  },
};

// Task execution simulation
function simulateAgentTask(expenseReport) {
  console.log('AutoGen AgentChat — Expense Review Workflow');
  console.log('═'.repeat(50));
  
  console.log('\n[UserProxy] Task submitted:');
  console.log('Report:', JSON.stringify(expenseReport, null, 2));
  
  // Simulated agent turns
  const turns = [
    { agent: 'expense_reviewer', message: 'Analyzing expense report... checking policy compliance.' },
    { agent: 'expense_reviewer', message: expenseReport.totalAmount > 500 
        ? 'FLAG: Total $' + expenseReport.totalAmount + ' exceeds $500 policy limit. Receipt verification: ' + (expenseReport.hasReceipt ? 'present' : 'MISSING')
        : 'APPROVE: Amount $' + expenseReport.totalAmount + ' within policy. Receipts verified.' },
    { agent: 'finance_team (human)', message: expenseReport.totalAmount > 500 ? 'Human reviewing flagged report...' : 'Auto-approved.' },
  ];
  
  turns.forEach((turn, i) => {
    console.log('\nTurn ' + (i+1) + ' [' + turn.agent + ']:');
    console.log(' ' + turn.message);
  });
  
  console.log('\nWorkflow terminated. Human-in-the-loop engaged:', expenseReport.totalAmount > 500);
}

simulateFunctionCall = simulateAgentTask;
simulateFunctionCall({ id: 'EXP-2025-441', employee: 'Alice Chen', totalAmount: 750, category: 'Travel', hasReceipt: true });
console.log();
simulateFunctionCall({ id: 'EXP-2025-442', employee: 'Bob Smith', totalAmount: 245, category: 'Meals', hasReceipt: true });`
  },
  interview: {
    question: 'What are the key differences between AutoGen, CrewAI, and LangChain for multi-agent systems?',
    answer: `All three build multi-agent AI workflows, but they\'re optimized for different contexts.<br><br>LangChain is the most general-purpose. Its agents and LCEL composability work for any workflow, but it\'s not specifically designed for multi-agent coordination — you build the agent coordination logic yourself. Best choice when you want full control and already use the LangChain ecosystem.<br><br>CrewAI is optimized for role-based crews with structured task delegation. Its strongest feature is the explicitness of the role/goal/backstory/task structure, which tends to produce higher-quality outputs on well-defined analytical workflows. Less suitable for event-driven or long-running agent systems.<br><br>AutoGen v0.4 is optimized for enterprise and research use cases requiring strong observability, human-in-the-loop control, and Azure/Microsoft ecosystem integration. Its event-driven Core layer handles real-time agent systems that CrewAI and LangChain don\'t cover well. The UserProxyAgent pattern for human review is a key differentiator for compliance-sensitive deployments.<br><br>My selection heuristic: CrewAI for self-contained analytical crews, AutoGen for enterprise deployments with compliance requirements, LangChain when you need maximum flexibility and tool ecosystem breadth.`
  },
  pmAngle: 'AutoGen\'s human-in-the-loop design is the feature that makes it deployable in regulated industries. If you\'re building for financial services, healthcare, or legal — where fully autonomous AI action creates liability — AutoGen\'s architecture is the right starting point.',
  resources: [
    { type: 'DOCS', title: 'AutoGen Documentation', url: 'https://microsoft.github.io/autogen/', note: 'v0.4 docs — start with AgentChat quickstart.' },
    { type: 'TOOL', title: 'AutoGen Studio', url: 'https://microsoft.github.io/autogen/docs/autogen-studio/getting-started/', note: 'Low-code visual interface for building agent teams.' },
    { type: 'BLOG', title: 'AutoGen v0.4 Architecture', url: 'https://devblogs.microsoft.com/autogen/autogen-reimagined-launching-autogen-0-4/', note: 'Microsoft\'s announcement — the architectural rationale behind the v0.4 redesign.' },
  ]
},

24: {
  subtitle: 'You can\'t debug what you can\'t see — build the observability stack for production AI.',
  context: `<p>AI observability is the practice of making LLM application behavior visible, debuggable, and improvable in production. Unlike traditional software where stack traces tell you exactly what happened, LLM applications fail in subtle ways: the model produced an output that was technically valid but incorrect, the wrong tool was called, a retrieval returned the wrong chunks, or a multi-step agent took an unexpected path. Without observability, debugging these failures is essentially guessing. With it, every failure has a traceable root cause.</p>
  <p>The core instrumentation primitives are <strong>traces</strong>, <strong>spans</strong>, and <strong>evals</strong>. A trace represents a single user interaction end-to-end, composed of spans — individual operations like an LLM call, a tool invocation, or a retrieval. Each span captures: the exact prompt sent, the response received, token counts, latency, and any metadata. The leading observability platforms — <strong>LangSmith</strong> (for LangChain-based apps), <strong>Langfuse</strong> (open-source, provider-agnostic), <strong>Arize Phoenix</strong> (open-source, strong eval integration), and <strong>Helicone</strong> (lightweight proxy) — all expose this structure. The OpenTelemetry standard is increasingly being adopted by both frameworks (LlamaIndex, AutoGen) and observability platforms, moving toward a common instrumentation layer.</p>
  <p>The most valuable observability insight for production AI products is <strong>latency breakdown</strong>: knowing that 68% of your p99 latency is in the LLM call, 22% is in retrieval, and 10% is in tool execution gives you a clear optimization target. Token count by prompt component tells you where your input token budget goes. Error rate by tool and by prompt template identifies your most brittle components. Production AI teams at scale run daily eval sweeps on sampled production traces — using LLM-as-judge to flag quality regressions before customers report them. This is the operational discipline that separates teams that improve continuously from teams that react to complaints.</p>`,
  tasks: [
    { title: 'Design the observability plan for your AI product', description: 'Choose an AI product. Define: (a) the 5 most important spans to trace, (b) the 3 metrics you would put on a daily dashboard (latency, cost, quality signal), (c) the alert threshold for each metric. What does "unexpected" look like for your product?', time: '25 min' },
    { title: 'Explore LangSmith or Langfuse', description: 'Sign up for a free LangSmith account (smith.langchain.com) or Langfuse (langfuse.com). Review the trace view. What information is visible that you couldn\'t get from application logs alone? Specifically: what does the span for a tool call show?', time: '25 min' },
    { title: 'Instrument a production failure', description: 'Design a scenario: a user asks a document Q&A product a question and gets a wrong answer. Using an observability tool, trace the exact root cause through the spans. What are the 3 most likely failure points? How would you identify which one failed from the trace?', time: '20 min' },
    { title: 'Cost monitoring design', description: 'Design a cost monitoring system for an AI product. What are the 4 metrics you would track? At what cost increase would you trigger an alert? How would you attribute cost to individual features or user segments?', time: '10 min' },
  ],
  codeExample: {
    title: 'Observability span tracking — JavaScript',
    lang: 'js',
    code: `// Observability: trace structure for a RAG query
// Production: use Langfuse, LangSmith, or OpenTelemetry instrumentation

function createSpan(name, parentId = null) {
  return { id: Math.random().toString(36).slice(2,8), name, parentId, startMs: Date.now(), endMs: null, metadata: {}, status: 'running' };
}

function endSpan(span, metadata = {}) {
  span.endMs = Date.now();
  span.latencyMs = span.endMs - span.startMs;
  span.metadata = { ...span.metadata, ...metadata };
  span.status = 'ok';
  return span;
}

const delay = ms => new Promise(r => setTimeout(r, ms));

async function instrumentedRAGQuery(userQuery) {
  const trace = { id: 'trace_' + Date.now(), query: userQuery, spans: [] };
  
  // Root span
  const rootSpan = createSpan('rag_query');
  trace.spans.push(rootSpan);
  await delay(5);
  
  // Embed query
  const embedSpan = createSpan('embed_query', rootSpan.id);
  trace.spans.push(embedSpan);
  await delay(40 + Math.random() * 20); // Simulate 40-60ms
  endSpan(embedSpan, { model: 'text-embedding-3-small', inputTokens: Math.ceil(userQuery.length/4) });
  
  // Vector search
  const retrieveSpan = createSpan('vector_search', rootSpan.id);
  trace.spans.push(retrieveSpan);
  await delay(15 + Math.random() * 10);
  endSpan(retrieveSpan, { topK: 3, indexSize: 50000, scoreThreshold: 0.78 });
  
  // LLM call
  const llmSpan = createSpan('llm_call', rootSpan.id);
  trace.spans.push(llmSpan);
  await delay(800 + Math.random() * 400); // Simulate 800-1200ms
  endSpan(llmSpan, { model: 'claude-3-5-sonnet', inputTokens: 2340, outputTokens: 187, costUSD: 0.000009 });
  
  endSpan(rootSpan);
  
  console.log('Trace ID:', trace.id);
  console.log('Query:', userQuery);
  console.log();
  trace.spans.forEach(s => {
    const indent = s.parentId ? '  ' : '';
    console.log(indent + '[' + s.name + '] ' + s.latencyMs + 'ms' + (s.metadata.model ? ' | ' + s.metadata.model : '') + (s.metadata.costUSD ? ' | $' + s.metadata.costUSD : ''));
  });
  
  const totalCost = trace.spans.reduce((sum, s) => sum + (s.metadata.costUSD || 0), 0);
  const totalLatency = rootSpan.latencyMs;
  console.log('\nTotal latency:', totalLatency + 'ms | Total cost: $' + totalCost.toFixed(6));
}

instrumentedRAGQuery('What are our refund policies for annual subscriptions?');`
  },
  interview: {
    question: 'How would you set up observability for an AI product in production?',
    answer: `I\'d build observability in three layers: instrumentation, monitoring, and alerting.<br><br>Instrumentation: integrate a tracing SDK (Langfuse for open-source flexibility, LangSmith if the team uses LangChain) to capture spans for every LLM call, retrieval, and tool invocation. Every span should capture: exact prompt, response, model, input/output tokens, latency, and any structured metadata about the call. This is the foundation — without complete traces, you\'re debugging blind.<br><br>Monitoring: build a daily dashboard with five metrics: average latency (with p50/p95/p99 breakdown), daily cost (with trends and per-feature attribution), LLM error rate, retrieval null-result rate (queries that returned no relevant content), and an automated quality score (LLM-as-judge on a random 5% sample of daily interactions).<br><br>Alerting: set thresholds — alert if daily cost spikes >30%, if error rate exceeds 2%, if LLM-as-judge quality score drops >10% from baseline. Route alerts to the on-call PM, not just engineering — a quality regression is a product problem, not just an infrastructure problem.<br><br>The most common mistake: teams instrument for cost and latency but not quality. The cost and latency metrics are easy to measure; quality degradation is what actually hurts the product.`
  },
  pmAngle: 'Observability is a PM responsibility as much as an engineering one. You should be able to look at a trace and understand why the product gave a wrong answer. If you can\'t, you\'re flying blind when incidents happen.',
  resources: [
    { type: 'TOOL', title: 'Langfuse — Open-Source LLM Observability', url: 'https://langfuse.com', note: 'Provider-agnostic tracing, evals, and cost tracking. Works with any LLM.' },
    { type: 'TOOL', title: 'LangSmith', url: 'https://www.langchain.com/langsmith', note: 'Best-in-class for LangChain applications. Trace, evaluate, and improve.' },
    { type: 'DOCS', title: 'OpenTelemetry for LLMs', url: 'https://opentelemetry.io/docs/specs/semconv/gen-ai/', note: 'The emerging standard for LLM semantic conventions in distributed tracing.' },
  ]
},

25: {
  subtitle: 'AI that can see and interact with any software — the most powerful and most constrained agent type.',
  context: `<p><strong>Computer use agents</strong> — also called GUI agents or desktop automation agents — can see screenshots of any software interface and interact with it using mouse clicks, keyboard input, and scroll actions. Anthropic\'s Claude with computer use, available via the API, is the most capable production implementation. The technical approach: Claude receives screenshots of the desktop, reasons about what it sees, and returns structured actions (click at x,y, type text, scroll, key press). The application executes the action, takes a new screenshot, and the loop continues until the task is complete. This means Claude can operate <em>any</em> software with a visual interface — legacy enterprise apps, poorly-documented internal tools, anything a human can click.</p>
  <p>The product opportunity is enormous but the constraints are real. Computer use is significantly slower than API-native integrations (multiple screenshot-action cycles per step vs. one API call), more expensive (token-intensive screenshots), and less reliable (UI changes break flows; pixels don\'t give the same semantic signal that structured APIs do). The appropriate use cases are: <strong>legacy system automation</strong> where no API exists, <strong>one-off tasks</strong> where the friction of building a proper integration isn\'t justified, and <strong>cross-application workflows</strong> that span systems that don\'t share APIs. Computer use is the automation option of last resort — reach for it when everything else fails, not as the first choice.</p>
  <p>Anthropic\'s computer use capability runs in a sandboxed virtual machine environment in the API reference implementation. The key safety pattern: agents run in isolated environments with explicitly scoped access, not on the user\'s actual desktop by default. For enterprise deployments, the security model matters enormously — an agent that can control any application has significant lateral movement capability if it\'s compromised or misdirected. Design with minimum-necessary access, session recording, and human approval for irreversible actions. The PM who understands both the capability and the risk architecture is the one who can sell this to enterprise security teams.</p>`,
  tasks: [
    { title: 'Identify legacy automation opportunities', description: 'Think of 3 workflows in an enterprise that have no API access — only a desktop application or web form. For each: (a) describe the current human workflow, (b) describe what a computer use agent would do differently, (c) estimate time savings and error reduction.', time: '20 min' },
    { title: 'Design the safety model for a computer use agent', description: 'You are deploying a computer use agent for HR onboarding (filling forms in legacy HR systems). Design the safety controls: what can it access, what requires human approval, how do you prevent it from taking irreversible actions, how do you record what it did?', time: '25 min' },
    { title: 'Read the Anthropic computer use documentation', description: 'Find the computer use documentation at docs.anthropic.com. What are the 3 key limitations Anthropic calls out? What is the recommended sandbox architecture? What latency should you expect for a 10-step workflow?', time: '20 min' },
    { title: 'Computer use vs API integration decision framework', description: 'For 4 automation targets: (a) Salesforce, (b) a proprietary legacy invoicing tool with no API, (c) a web form that changes frequently, (d) an internal Confluence page editor — decide: computer use, API, or hybrid. Write the decision rationale.', time: '15 min' },
  ],
  interview: {
    question: 'When would you use computer use agents vs building a proper API integration?',
    answer: `Computer use is the right choice in three scenarios: the target system has no API and no way to add one (legacy enterprise software is the classic case), the integration is used infrequently enough that engineering time for an API integration isn\'t justified, or the workflow spans multiple systems that don\'t share APIs and the combinatorial integration work is prohibitive.<br><br>API integration is almost always preferable when available: it\'s faster (no screenshot loop), cheaper (no image tokens), more reliable (structured data vs. pixel parsing), and easier to debug. If the target has an API, build the API integration.<br><br>The hybrid pattern that often makes sense: use computer use for the initial data extraction from a legacy system (getting the data out), then process it programmatically. Don\'t use computer use for the entire workflow if part of it has API access.<br><br>The most important design constraint for computer use: minimum necessary access in an isolated environment, with human approval required for any irreversible action (submit, delete, send). This is non-negotiable for enterprise deployments.`
  },
  pmAngle: 'Computer use is the capability that unlocks automation for the 70% of enterprise software that has no API. The companies winning enterprise automation deals in 2025 are the ones that can automate legacy workflows, not just modern SaaS. Understand this capability — your competitors do.',
  resources: [
    { type: 'DOCS', title: 'Anthropic Computer Use Guide', url: 'https://docs.anthropic.com/en/docs/build-with-claude/computer-use', note: 'Architecture, safety model, and reference implementation.' },
    { type: 'BLOG', title: 'Introducing Computer Use', url: 'https://www.anthropic.com/news/3-5-models-and-computer-use', note: 'Anthropic\'s announcement — capability overview and early use cases.' },
    { type: 'GITHUB', title: 'Computer Use Demo', url: 'https://github.com/anthropics/anthropic-quickstarts/tree/main/computer-use-demo', note: 'Working reference implementation with Docker sandbox setup.' },
  ]
},

26: {
  subtitle: "Google's open standard for agent-to-agent collaboration — and why interoperability is the next frontier.",
  context: `<p><strong>Agent-to-Agent Protocol (A2A)</strong> was announced by Google in April 2025 as an open standard for communication between AI agents. Where MCP solves the agent-to-tool problem (how one agent calls external capabilities), A2A solves the agent-to-agent problem: how two autonomous agents — potentially from different vendors, running different models, on different infrastructure — collaborate on a task. The core problem A2A addresses: as enterprises build multi-agent systems, they inevitably combine specialized agents from different vendors. Without a standard, every agent combination is a custom integration. With A2A, any A2A-compatible agent can work with any other.</p>
  <p>A2A\'s core primitive is the <strong>Agent Card</strong> — a JSON document that every A2A agent publishes at a well-known URL, advertising its capabilities, supported input/output modes, available skills, authentication requirements, and whether it supports streaming. Think of it as an OpenAPI spec for an agent, not an API endpoint. <strong>Tasks</strong> in A2A are stateful and go through five states: <code>submitted → working → input-required → completed</code> (or <code>failed</code> or <code>canceled</code>). The <code>input-required</code> state is A2A\'s explicit mechanism for human-in-the-loop: the agent pauses and waits for additional input before proceeding. Streaming is handled via Server-Sent Events, enabling real-time progress updates for long-running tasks.</p>
  <p>The strategic landscape around A2A is evolving rapidly. Google released the spec with support from 50+ technology partners at launch. Anthropic\'s MCP and Google\'s A2A are complementary layers in the emerging agentic stack: MCP connects agents to tools; A2A connects agents to agents. In practice, an enterprise system uses both: a Coordinator Agent delegates to Specialist Agents via A2A, and each Specialist Agent accesses its specific tools via MCP. The AI PM who can explain this two-protocol architecture — and when to use each layer — is ready for agentic system design conversations at any frontier lab.</p>`,
  tasks: [
    { title: 'Read the A2A specification', description: 'Find the A2A spec at google.github.io/a2a or github.com/google/a2a. Map the five task states in a diagram. What happens at each transition? What triggers the input-required state? When does an agent send a completion vs a failure?', time: '25 min' },
    { title: 'Design an Agent Card for a real product', description: 'Design the Agent Card JSON for a "Legal Contract Review Agent" built on Claude. Include: name, description, URL, capabilities (streaming: true/false), authentication scheme, 3 specific skills with IDs and descriptions. Use the official Agent Card schema.', time: '25 min' },
    { title: 'MCP + A2A architecture diagram', description: 'Draw the architecture of an enterprise multi-agent system that uses both MCP and A2A. Identify: which agents communicate via A2A, which tool calls use MCP, and where the Coordinator Agent sits. Label each connection with the protocol used.', time: '20 min' },
    { title: 'Find A2A implementations on GitHub', description: 'Search GitHub for "a2a agent" or look at the official google/a2a repo samples. Find 3 real A2A agent implementations. What domains are they in? What authentication methods do they use?', time: '10 min' },
  ],
  codeExample: {
    title: 'A2A Agent Card and task lifecycle — JavaScript',
    lang: 'js',
    code: `// A2A Agent Card — the self-description every A2A agent publishes
const agentCard = {
  schema_version: "0.0.2",
  name: "Claude Contract Review Agent",
  description: "Reviews contracts for risks, obligations, and key terms using Claude Sonnet.",
  url: "https://agents.example.com/contract-review",
  version: "1.2.0",
  capabilities: { streaming: true, pushNotifications: false, stateTransitionHistory: true },
  authentication: { schemes: ["bearer"] },
  defaultInputModes: ["text", "file"],
  defaultOutputModes: ["text", "json"],
  skills: [
    { id: "extract_key_terms", name: "Extract Key Terms", description: "Identifies parties, dates, payment terms, and obligations", inputModes: ["file"], outputModes: ["json"] },
    { id: "identify_risks", name: "Identify Risks", description: "Flags unusual clauses, liability concerns, and missing protections", inputModes: ["file", "text"], outputModes: ["text"] },
    { id: "compare_contracts", name: "Compare Contracts", description: "Diffs two contract versions and highlights material changes", inputModes: ["file"], outputModes: ["text", "json"] },
  ]
};

// A2A Task lifecycle simulation
const TASK_STATES = ['submitted', 'working', 'input-required', 'completed'];

function simulateTask(skillId, inputType) {
  console.log('\nA2A Task Lifecycle — skill:', skillId);
  console.log('Agent:', agentCard.name);
  const states = skillId === 'extract_key_terms' 
    ? ['submitted', 'working', 'completed']
    : ['submitted', 'working', 'input-required', 'working', 'completed'];
  
  states.forEach((state, i) => {
    const msg = {
      'submitted': 'Task received, queued for processing',
      'working': i <= 1 ? 'Parsing document, applying extraction model...' : 'Continuing with provided clarification...',
      'input-required': 'Clarification needed: is this NDA governed by US or UK law?',
      'completed': 'Task complete — result attached'
    }[state];
    console.log(' ' + state.toUpperCase() + ':', msg);
  });
}

console.log('Agent Card Summary:');
console.log('Name:', agentCard.name);
console.log('Skills:', agentCard.skills.map(s => s.name).join(', '));
console.log('Streaming:', agentCard.capabilities.streaming);
console.log('Auth:', agentCard.authentication.schemes.join(', '));

simulateTask('extract_key_terms', 'file');
simulateTask('identify_risks', 'file');

console.log('\nMCP vs A2A summary:');
console.log('MCP: Agent → Tools (stateless function calls)');
console.log('A2A: Agent → Agent (stateful task delegation, streaming, human-in-the-loop)');`
  },
  interview: {
    question: 'Explain the difference between MCP and A2A. When would you use each?',
    answer: `MCP is the agent-to-tool layer — how a single AI agent accesses external capabilities like databases, APIs, and file systems. It defines a client-server architecture where the agent (MCP client) calls tools exposed by MCP servers. Each tool call is stateless: request in, result out.<br><br>A2A is the agent-to-agent layer — how two autonomous agents coordinate on a task. It\'s stateful: tasks go through lifecycle states (submitted → working → input-required → completed), support streaming, and can include human-in-the-loop pauses. The Agent Card is the discovery mechanism — agents publish their capabilities so other agents can find and invoke them.<br><br>Mental model: MCP is a USB standard for peripherals. A2A is a work assignment protocol between contractors.<br><br>In an enterprise system, you use both: a Coordinator Agent delegates to Specialist Agents via A2A. Each Specialist uses MCP to connect to its own tools. Use A2A when the capability requires an autonomous agent that maintains state across a multi-step task. Use MCP for stateless tool calls.`
  },
  pmAngle: 'A2A and MCP together form the plumbing of the agentic internet. The PM who can explain the two-layer architecture — tools via MCP, agent coordination via A2A — and make architectural recommendations for enterprise deployments is ahead of 95% of candidates.',
  resources: [
    { type: 'GITHUB', title: 'google/a2a — Official Spec', url: 'https://github.com/google/a2a', note: 'Read the README and the Agent Card schema.' },
    { type: 'DOCS', title: 'A2A Technical Documentation', url: 'https://google.github.io/a2a/', note: 'Task lifecycle, streaming, push notifications, and authentication.' },
    { type: 'BLOG', title: 'Google: Announcing A2A', url: 'https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/', note: 'Strategic context for the A2A announcement.' },
  ]
},

27: {
  subtitle: 'IBM and Red Hat\'s open protocol for agent communication — the enterprise challenger to A2A.',
  context: `<p><strong>Agent Communication Protocol (ACP)</strong> was developed by the BeeAI team at IBM Research and released as an open standard in early 2025. ACP takes a REST/HTTP-native approach to agent communication, designed to be simple enough for any developer to implement without specialized agent framework knowledge. An ACP agent exposes standard REST endpoints: <code>POST /agents/{agentId}/runs</code> to start a task, <code>GET /runs/{runId}</code> to poll status, and streaming via Server-Sent Events for real-time output. This HTTP-first design means any web service can speak ACP with minimal adaptation — a significant advantage over protocols requiring dedicated agent runtimes.</p>
  <p>ACP differs from A2A in its design philosophy. Where A2A emphasizes agent discovery (Agent Cards at well-known URLs) and agent-to-agent delegation as first-class concepts, ACP treats agents as standard REST APIs with run-based state management. ACP\'s <strong>run</strong> concept is the core abstraction: a run has a status (created, in-progress, completed, failed), accepts multimodal inputs (text, images, files), and produces structured outputs. The <strong>awaits</strong> mechanism in ACP is the equivalent of A2A\'s input-required state — the agent can pause a run and wait for additional input before continuing. BeeAI\'s framework provides a Python SDK for building ACP-compliant agents quickly.</p>
  <p>From a product strategy perspective, the existence of both A2A and ACP reflects the ongoing standardization battle in the agentic space. Google backs A2A with its cloud ecosystem; IBM/Red Hat back ACP with enterprise OpenShift deployments. Both are open standards with growing ecosystems. The practical guidance for enterprise AI PMs in 2025-2026: evaluate both when selecting an agent communication layer, weight A2A for Google Cloud-native deployments and ACP for Red Hat/OpenShift environments, and design your core agent logic to be protocol-agnostic where possible — the standards are still converging.</p>`,
  tasks: [
    { title: 'Compare A2A and ACP specifications', description: 'Find the ACP specification (github.com/i-am-bee/acp). Compare with A2A on: discovery mechanism, task/run lifecycle states, streaming approach, authentication, and SDK availability. Build a 2x2 comparison table and write a 150-word recommendation for when to use each.', time: '25 min' },
    { title: 'Design an ACP-compliant agent endpoint', description: 'Design the REST API spec for an ACP-compliant "Report Generation Agent". Define the POST /runs request body (input types, parameters), GET /runs/{id} response schema, and the awaits payload when the agent needs to ask the user for clarification. Follow the ACP spec format.', time: '25 min' },
    { title: 'Protocol selection framework', description: 'Build a decision guide for choosing between A2A, ACP, and MCP for different integration scenarios. Include: cloud provider context, existing infrastructure, team expertise, and interoperability requirements. Use a decision tree format.', time: '20 min' },
    { title: 'Explore BeeAI framework', description: 'Visit i-am-bee.github.io/bee-agent-framework. What is BeeAI? How does it relate to ACP? What LLM backends does it support? What is the primary use case it\'s designed for?', time: '10 min' },
  ],
  interview: {
    question: 'There are now multiple agent communication protocols: MCP, A2A, ACP, and ANP. How do you advise a team on which to adopt?',
    answer: `The protocols occupy different layers and solve different problems. MCP is settled technology for agent-to-tool connections — any team building agents should implement MCP for tool access. It has the broadest ecosystem and the clearest use case.<br><br>For agent-to-agent communication, the choice between A2A and ACP depends on infrastructure and vendor context. A2A is the better choice for Google Cloud-centric deployments and for teams that want the Agent Card discovery model. ACP is better for Red Hat/OpenShift enterprise environments and for teams that want HTTP-native REST simplicity. Both are actively developed open standards in 2025.<br><br>ANP addresses a different problem: agent discovery across organizational boundaries on the open internet (think: your enterprise agent finding and calling a third-party specialized agent from a marketplace). It\'s earlier stage and more relevant for agent marketplaces than internal enterprise deployments.<br><br>My practical advice: implement MCP first (clear winner), then choose A2A or ACP based on your cloud and infrastructure context, and monitor ANP for when your use case involves cross-organizational agent discovery.`
  },
  pmAngle: 'The protocol landscape is consolidating but not yet settled. As a PM, you don\'t need to pick winners — you need to design agent systems with clean protocol boundaries so you can swap implementations as standards evolve. Protocol lock-in is a real risk.',
  resources: [
    { type: 'GITHUB', title: 'ACP Specification (i-am-bee)', url: 'https://github.com/i-am-bee/acp', note: 'Official ACP spec from the BeeAI/IBM team.' },
    { type: 'DOCS', title: 'BeeAI Framework', url: 'https://i-am-bee.github.io/bee-agent-framework/', note: 'Python SDK for building ACP-compliant agents quickly.' },
    { type: 'BLOG', title: 'ACP vs A2A Comparison', url: 'https://www.agentprotocols.dev', note: 'Community resource tracking emerging agent protocol standards.' },
  ]
},

28: {
  subtitle: 'Decentralized agent discovery and trust — the protocol for the open agent internet.',
  context: `<p><strong>Agent Network Protocol (ANP)</strong> is an open specification designed to enable agent discovery, authentication, and communication across organizational boundaries — essentially a DNS/HTTP for the agent internet. While A2A and ACP solve the intra-organization agent coordination problem (agents within your system talking to each other), ANP addresses the inter-organization problem: how does your enterprise agent find, authenticate with, and communicate with a third-party specialized agent from a different company without a pre-negotiated integration? The motivating use case: an AI travel assistant that can directly query thousands of airline and hotel agents to book travel, without the booking platforms needing to build custom integrations with every AI assistant.</p>
  <p>ANP\'s architecture has three components: a <strong>Meta-Protocol</strong> for defining how agents communicate at the protocol layer, a <strong>Communication Protocol</strong> using JSON-LD and semantic web technologies for structured data exchange, and an <strong>Agent Description Protocol</strong> for publishing and discovering agent capabilities via decentralized identifiers (DIDs). The use of DIDs ties into the W3C decentralized identity standards, enabling cryptographic proof of agent identity without a central registry. This matters for enterprise trust: you can verify you\'re communicating with the genuine Legal-AI agent from ACME Corp without calling a central authority to check.</p>
  <p>ANP is earlier in its adoption curve than A2A or ACP as of 2025. The primary use case driving adoption is <strong>agentic marketplaces</strong> — platforms where specialized agents can be discovered, evaluated, and contracted by orchestrator agents. For AI PMs, the strategic question is not "should I implement ANP today" but "will my product need cross-organizational agent communication in 12-18 months, and should I design for it now?" Products in travel, procurement, financial data aggregation, and supply chain are most likely to need ANP\'s capabilities early. Design for protocol adaptability now rather than tight coupling to internal-only agent communication.</p>`,
  tasks: [
    { title: 'Map the agent protocol stack', description: 'Draw a four-layer architecture: (1) tool access (MCP), (2) intra-org agent coordination (A2A/ACP), (3) cross-org agent discovery and communication (ANP), (4) trust and identity (DIDs). For each layer, identify: what problem it solves, the leading protocol, and who controls the standard.', time: '20 min' },
    { title: 'Design an ANP use case for your domain', description: 'Choose an industry (finance, healthcare, supply chain, travel). Describe a scenario where cross-organizational agent communication via ANP would create significant value. What agents are involved? What data do they exchange? What trust requirements exist?', time: '25 min' },
    { title: 'Review the ANP specification', description: 'Search GitHub for the ANP specification (search "agent network protocol ANP"). Read the architecture overview. How does agent discovery work? What role do DIDs play? What transport protocols does it support?', time: '20 min' },
    { title: 'Competitive analysis: agent protocol ecosystem', description: 'Research: which major cloud providers or companies have adopted or endorsed each protocol (MCP, A2A, ACP, ANP)? Build a matrix: protocol × adopter. What does this tell you about where the ecosystem is consolidating?', time: '15 min' },
  ],
  interview: {
    question: 'How does ANP differ from A2A and why does cross-organizational agent communication require a separate protocol?',
    answer: `A2A solves agent coordination within a known system — both the orchestrator and the specialist agents are under the same organization\'s control and trust boundary. The discovery model (Agent Cards at known URLs) assumes you already know where to find the agents. ACP similarly assumes a known endpoint.<br><br>ANP addresses a fundamentally different problem: how does your agent find and securely communicate with an agent it has never encountered, operated by an organization it doesn\'t have a prior relationship with? This requires three things that intra-org protocols don\'t need: decentralized discovery (finding agents without a central registry), cryptographic identity (verifying the agent is who it claims to be without calling a trusted authority), and trust negotiation (establishing what data can be shared with an unknown counterparty).<br><br>ANP uses W3C Decentralized Identifiers (DIDs) and semantic web standards (JSON-LD) to address these. The analogy: A2A is like a company directory, ANP is like DNS plus TLS. You need different infrastructure for "find any agent on the open internet" vs. "coordinate with agents I know about."<br><br>The adoption curve matters here: ANP is early-stage. I\'d design for future ANP compatibility without mandating it today.`
  },
  pmAngle: 'The open agent internet is coming. Products that require data from multiple external specialized agents — procurement systems, travel platforms, financial data aggregators — will need ANP-style cross-org agent communication within 2-3 years. Design your agent architecture with this in mind.',
  resources: [
    { type: 'GITHUB', title: 'ANP Specification', url: 'https://github.com/agent-network-protocol/AgentNetworkProtocol', note: 'The open spec — read the architecture overview.' },
    { type: 'DOCS', title: 'W3C Decentralized Identifiers', url: 'https://www.w3.org/TR/did-core/', note: 'The identity layer that ANP builds on — understand DIDs at a high level.' },
    { type: 'BLOG', title: 'The Agentic Internet Protocols Overview', url: 'https://modelcontextprotocol.io/docs/concepts/architecture', note: 'MCP architecture context — see where ANP fits in the broader picture.' },
  ]
},

29: {
  subtitle: 'The open schema for agent capability discovery — making agents interoperable by design.',
  context: `<p><strong>Open Agent Schema Framework (OASF)</strong> is an open standard developed by Agntcy (backed by Cisco) to provide a common schema language for describing AI agent capabilities, inputs, outputs, and constraints. Think of it as OpenAPI for agents: just as OpenAPI standardizes how REST APIs are documented and discovered, OASF standardizes how agent capabilities are described so they can be discovered, composed, and orchestrated by other agents or developer tools. The motivation is practical: as the number of specialized agents grows, the ability to automatically understand "what can this agent do, what does it need, and what will it produce" becomes critical for automated agent composition.</p>
  <p>OASF schemas describe agents along several dimensions: <strong>skills</strong> (discrete capabilities the agent offers), <strong>input/output schemas</strong> (what data types the agent accepts and produces, including multimodal), <strong>performance characteristics</strong> (latency, throughput, context limits), and <strong>trust metadata</strong> (compliance certifications, data handling policies). This last dimension is particularly important for enterprise procurement: a compliance officer evaluating an AI agent needs a standardized way to ask "does this agent retain my data?" or "is this agent SOC 2 certified?" without reading custom documentation for every vendor.</p>
  <p>For AI PMs, OASF represents a design-time decision: do you document your agent\'s capabilities in a machine-readable schema format, or in human-readable documentation only? OASF adoption makes your agent discoverable by automated agent marketplaces and orchestration systems. In 2025, this is a nice-to-have for most products; in 2027, it may be a procurement requirement for enterprise AI deployments. The pattern mirrors OpenAPI\'s trajectory — it started as a documentation convenience and became a required standard for enterprise API integration. Agents are on the same path.</p>`,
  tasks: [
    { title: 'Write an OASF schema for your agent', description: 'Using the OASF specification as a guide (github.com/agntcy/oasf), write an agent schema in JSON for one of the agents you designed this week. Include: name, description, 3 skills with input/output schemas, performance characteristics, and at least one trust metadata field.', time: '25 min' },
    { title: 'Compare OASF, A2A Agent Cards, and OpenAPI', description: 'All three describe API/agent capabilities in machine-readable formats. Compare them on: schema completeness for agents, tooling support, adoption breadth, and intended audience. Which would you use for which purpose?', time: '20 min' },
    { title: 'Agent marketplace research', description: 'Search for "AI agent marketplace" or "agent registry" 2025. Find 2 platforms attempting to build agent discovery marketplaces. What schema do they use? How do developers list agents? What\'s missing from today\'s discovery experience?', time: '20 min' },
    { title: 'Enterprise procurement checklist', description: 'Design a 10-question checklist a compliance officer would use to evaluate an AI agent for enterprise deployment. How many of these questions could be answered automatically from an OASF schema vs. requiring manual documentation review?', time: '15 min' },
  ],
  interview: {
    question: 'Why would an enterprise care about standardized agent schemas like OASF?',
    answer: `Enterprise procurement of software has always required standardized documentation — security assessments, data handling agreements, SLA specifications. AI agents introduce new dimensions that standard documentation formats don\'t cover: what can this agent do autonomously, what data does it access, what actions can it take, and what does it produce?<br><br>OASF matters to enterprises for three reasons. First, procurement efficiency: a machine-readable agent schema lets procurement tools automatically check whether an agent meets compliance requirements, rather than manual documentation review for every vendor. Second, composition safety: an orchestration platform can check at deployment time whether the output format of Agent A is compatible with the input format of Agent B — preventing runtime failures from schema mismatches. Third, auditability: a standardized schema is easier to version control, diff, and audit over time as the agent evolves.<br><br>The adoption trajectory matters: OASF is early-stage, but the problem it solves is real and growing. My advice: design your agent to be OASF-compliant even if you don\'t formally publish the schema yet. When the tooling matures, you\'ll be ready.`
  },
  pmAngle: 'Schema standardization always precedes marketplace emergence. OpenAPI enabled the API economy; OASF (or its successor) will enable the agent economy. PMs who understand this dynamic can make early bets on platforms and integrations that will be strategically valuable in 2-3 years.',
  resources: [
    { type: 'GITHUB', title: 'OASF Specification (Agntcy)', url: 'https://github.com/agntcy/oasf', note: 'The open agent schema — read the JSON schema examples.' },
    { type: 'DOCS', title: 'Agntcy Agent Directory', url: 'https://www.agntcy.org', note: 'Cisco\'s agent discovery and composition platform built on OASF.' },
    { type: 'BLOG', title: 'The Coming Agent Marketplace', url: 'https://a16z.com/the-new-ai-infrastructure/', note: 'a16z analysis of the agent infrastructure layer, including discovery.' },
  ]
},

30: {
  subtitle: 'What enterprise AI buyers actually care about — and how to sell to them.',
  context: `<p>Enterprise AI integration is a different discipline from consumer AI or developer API products. Enterprise buyers have three layers of concern that consumer products don\'t face: <strong>security and compliance</strong> (SOC 2, HIPAA, GDPR, data residency requirements), <strong>integration complexity</strong> (the AI must connect to existing ERP, CRM, and HRIS systems that were built in a different era), and <strong>organizational change management</strong> (deploying AI to 10,000 employees requires training, role redesign, and governance that a developer API subscription doesn\'t). The enterprise sales cycle for AI products is 6-18 months, significantly longer than self-serve SaaS, because every one of these concerns gets a dedicated workstream.</p>
  <p>The security review is typically the longest gatekeeper. Enterprise security teams ask: Does data leave our environment? Where does it go? Who at the AI vendor can see it? What happens if we terminate the contract — is our data deleted? For products built on Claude, the answers to these questions depend on Anthropic\'s data handling agreements, whether you\'re using Claude via API (data handled per Anthropic\'s API terms) or via Amazon Bedrock/Google Cloud Vertex (data handled per AWS/GCP terms, which often have stronger enterprise compliance guarantees). Understanding which deployment architecture answers which security questions is essential PM knowledge for enterprise sales.</p>
  <p>The most underestimated enterprise integration concern is <strong>ERP/CRM connectivity</strong>. Salesforce has 23% of the CRM market; ServiceNow has ~60% of enterprise ITSM. An AI product that can\'t read from and write to Salesforce is a hard sell to a sales organization. Building these integrations takes 3-6 months each for a new AI startup. The strategic options: build native integrations (slow, expensive), partner with an iPaaS provider like Zapier or Workato, implement MCP servers for enterprise systems (growing best practice in 2025), or build specifically on enterprise platforms that already have these integrations (Microsoft Copilot Studio, Salesforce Einstein, ServiceNow AI).</p>`,
  tasks: [
    { title: 'Design the enterprise security checklist response', description: 'A Fortune 500 legal team wants to deploy your AI document review product. They send a 50-question security questionnaire. Identify the 10 most common questions and write model answers for a Claude API-based product. Which questions can you answer confidently? Which require architectural changes?', time: '25 min' },
    { title: 'Enterprise integration audit', description: 'For a vertical of your choice (financial services, healthcare, legal), identify the 5 core software systems that any enterprise AI product must integrate with. For each: what data does the integration need to read/write, what\'s the integration mechanism (API, MCP, webhook), and what\'s the engineering complexity (days/weeks/months)?', time: '25 min' },
    { title: 'Data residency options research', description: 'Research: what data residency options does Anthropic offer for enterprise customers? What about Claude via Amazon Bedrock vs. direct API? For a European financial services firm with strict GDPR data residency requirements, which deployment architecture would you recommend?', time: '20 min' },
    { title: 'Change management plan', description: 'You are deploying an AI document assistant to 500 employees at a law firm. Design the 90-day change management plan: who gets trained first (change champions), what metrics do you use to measure adoption, what does rollback look like, and how do you handle employees who refuse to use the tool?', time: '10 min' },
  ],
  interview: {
    question: 'What are the three biggest blockers to enterprise AI adoption, and how do you address them?',
    answer: `The three biggest blockers I consistently see: security/compliance review, integration complexity, and organizational change resistance.<br><br>Security/compliance: enterprises need to know exactly where their data goes, who can see it, and what happens when they terminate. Address this by choosing a deployment architecture that matches their requirements — AWS Bedrock for teams with existing AWS enterprise agreements, Google Vertex for GCP shops, or Anthropic\'s enterprise tier with its DPA. The answer isn\'t "trust us" — it\'s "here\'s the contractual and architectural proof."<br><br>Integration complexity: AI products that don\'t connect to existing workflows get abandoned. Address this by prioritizing the 2-3 integrations that 80% of your target enterprises need (Salesforce, Workday, ServiceNow are common) and building them before enterprise sales, not after. MCP is increasingly the right architecture for enterprise system connections.<br><br>Change resistance: employees resist AI tools that feel threatening rather than helpful. Address this with a change champion model — identify 10-15 power users who get early access, see real value, and become internal advocates. Adoption follows trust, and trust comes from personal experience, not top-down mandates.`
  },
  pmAngle: 'The difference between a $5M ARR AI product and a $50M ARR product is usually enterprise sales readiness — security documentation, integrations, and deployment architecture. Build these into your product roadmap from the start, not as afterthoughts.',
  resources: [
    { type: 'DOCS', title: 'Anthropic Enterprise', url: 'https://www.anthropic.com/enterprise', note: 'Enterprise Claude offerings, security, and compliance documentation.' },
    { type: 'BLOG', title: 'AI Security Best Practices', url: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/', note: 'OWASP Top 10 for LLMs — the security framework enterprise buyers reference.' },
    { type: 'DOCS', title: 'AWS Bedrock Enterprise', url: 'https://aws.amazon.com/bedrock/security-compliance/', note: 'How Claude on Bedrock addresses enterprise compliance requirements.' },
  ]
},

31: {
  subtitle: 'The metrics that matter for AI products — beyond accuracy, into business outcomes.',
  context: `<p>AI products require a different metrics framework than traditional software. Traditional SaaS tracks engagement (DAU, sessions, feature adoption), reliability (uptime, error rate), and conversion. AI products need all of these plus a quality layer that traditional software doesn\'t have: the model\'s outputs can be technically delivered (low error rate, good latency) but factually wrong or unhelpful. This quality dimension requires dedicated measurement infrastructure — evals, human review, LLM-as-judge — that most product teams underinvest in until quality problems hurt them in production.</p>
  <p>The AI product metrics stack has four levels. <strong>Infrastructure metrics</strong>: API error rate, latency (p50/p95/p99), token throughput, uptime. <strong>Quality metrics</strong>: task completion rate, hallucination rate (on sampled production queries), format compliance (if structured output is specified), user acceptance rate (the fraction of AI outputs the user uses without editing). <strong>Business metrics</strong>: time-to-resolution (for support products), documents processed per user per day (for document tools), cost per completed task. <strong>North Star metrics</strong>: the single metric that best captures whether the AI is creating real user value — often something like "legal hours saved per attorney per month" or "support tickets deflected per week."</p>
  <p>The metric that most teams get wrong is <strong>acceptance rate</strong> — the fraction of AI outputs that users actually use. A high-quality AI response that users edit extensively isn\'t creating the value the product promises; it\'s a more sophisticated autocomplete. Measuring acceptance rate, and separating it by task type and user segment, gives you the clearest signal about where the AI is genuinely useful vs. where it\'s a drag on productivity. High acceptance rate on one task type and low on another is a product decision: do you fix the low-acceptance task, gate it from users until it\'s better, or position it differently?</p>`,
  tasks: [
    { title: 'Build the metrics framework for your product', description: 'Choose an AI product. Define: (a) 3 infrastructure metrics with SLA thresholds, (b) 3 quality metrics with measurement methods, (c) 2 business outcome metrics, (d) 1 North Star metric. For each metric, write how you would measure it and at what value you would escalate.', time: '25 min' },
    { title: 'Design the acceptance rate measurement', description: 'How do you technically measure whether users accept or modify AI outputs? Design the instrumentation: what user events do you track, how do you handle cases where users don\'t visibly "accept" (e.g., a chatbot response), and how do you segment acceptance rate by task type.', time: '20 min' },
    { title: 'Cost per outcome analysis', description: 'Your AI customer support product costs $0.015 per conversation in LLM inference. Fully-loaded cost (infra + headcount) is $0.08/conversation. A human support ticket costs $12 fully-loaded. At what deflection rate does your AI product break even? What\'s the ROI at 60% deflection rate?', time: '20 min' },
    { title: 'Metrics dashboard design', description: 'Sketch a one-page daily metrics dashboard for an AI PM. What are the 8 most important numbers? How do you present quality metrics alongside business metrics on the same view?', time: '15 min' },
  ],
  interview: {
    question: 'What metrics would you track for an AI customer support product, and what is the North Star metric?',
    answer: `I\'d organize metrics in four tiers.<br><br>Infrastructure (the floor): API latency p95 < 3s, error rate < 0.5%, uptime > 99.9%. These are hygiene — if they fail, nothing else matters.<br><br>Quality (the core): hallucination rate on sampled conversations (LLM-as-judge evaluating factual accuracy), format compliance (did the AI follow the response template), and first-response resolution rate (did the conversation resolve without human escalation). Target 95% accuracy on factual queries and 60%+ first-response resolution.<br><br>Business outcomes: deflection rate (% of tickets fully resolved without human agent), average handle time for AI-assisted vs. fully-human conversations, CSAT score for AI-handled tickets vs. human-handled tickets.<br><br>North Star: the metric I\'d stake product quality on is <strong>cost per resolved ticket</strong> — fully-loaded AI cost divided by tickets resolved without escalation. This captures quality (if AI gives bad answers, escalation rate goes up), cost (model efficiency matters), and scale. A falling cost-per-resolution with stable CSAT is the proof that the product is working.`
  },
  pmAngle: 'The biggest measurement mistake in AI products is optimizing for proxy metrics — session length, messages sent — instead of outcome metrics. Users can be very engaged with a product that isn\'t creating real value. North Star metrics should measure outcomes, not activity.',
  resources: [
    { type: 'BLOG', title: 'AI Product Metrics Framework', url: 'https://www.lennysnewsletter.com/p/ai-product-metrics', note: 'Lenny\'s guide to metrics specifically for AI-native products.' },
    { type: 'DOCS', title: 'Anthropic Evaluation Guide', url: 'https://docs.anthropic.com/en/docs/test-and-evaluate/eval-your-prompt', note: 'How to build quality metrics infrastructure on top of Claude.' },
    { type: 'BLOG', title: 'Measuring AI ROI in Enterprise', url: 'https://hbr.org/2023/11/the-right-way-to-measure-ai-success', note: 'HBR framework for connecting AI metrics to business outcomes.' },
  ]
},

32: {
  subtitle: 'How to write an AI product strategy that engineers respect and executives fund.',
  context: `<p>AI product strategy differs from traditional SaaS product strategy in one critical dimension: the model is a variable, not a constant. In traditional software, the capability set is defined by what your team builds. In AI products, the capability set is partly determined by the underlying model — which improves on Anthropic\'s or OpenAI\'s schedule, not yours. This means AI product strategy requires a component that traditional product strategy doesn\'t: a <strong>model dependency map</strong> that identifies which product capabilities depend on which model capabilities, and what happens to the product roadmap if a model improves faster or slower than expected. PMs who build this map make better bets; PMs who don\'t get surprised when model updates change their product\'s competitive position.</p>
  <p>A strong AI product strategy document answers five questions clearly. <strong>What problem are you solving and for whom?</strong> Be specific about the user, the frequency of the problem, and the current solution. <strong>Why is AI the right solution now?</strong> Articulate specifically which model capabilities enable your product — if you couldn\'t point to a specific capability (long context, tool use, vision), your product might not actually require AI. <strong>What is your technical architecture and why?</strong> Model choice, RAG vs. fine-tune, tool use design — these should be explicitly defended in the strategy doc. <strong>What is the cost model?</strong> Can this product be profitable at the target price point given AI inference costs? <strong>How do you win?</strong> Competitive defensibility in AI is harder than in traditional software because the model layer is commoditizing — your moat must be in data, distribution, workflow integration, or switching costs.</p>
  <p>The competitive defensibility question deserves special attention. First-mover advantage in AI is weaker than in SaaS because the model layer is not proprietary — your competitor can call the same API you do. Sustainable defensibility comes from: <strong>proprietary data</strong> (training data, feedback loops, evaluation datasets that improve your product over time), <strong>workflow integration depth</strong> (the AI is embedded in the customer\'s daily workflow in a way that switching requires process change, not just vendor change), and <strong>evaluation expertise</strong> (your team\'s accumulated knowledge about what "good" looks like in your domain, encoded in your eval set, is difficult to replicate). Build for these types of defensibility from day one.</p>`,
  tasks: [
    { title: 'Write your product\'s model dependency map', description: 'For an AI product you would build: list every product feature. For each, identify which model capability it depends on (long context, vision, tool use, structured output, reasoning). What breaks if that capability degrades? What new features become possible if it improves?', time: '20 min' },
    { title: 'Answer the 5 strategy questions', description: 'Write 1 paragraph per question for your product: (1) problem and user, (2) why AI now, (3) technical architecture, (4) cost model, (5) how you win. Total: 500-700 words. This is your strategy doc skeleton.', time: '30 min' },
    { title: 'Defensibility audit', description: 'Identify your product\'s 3 most important competitive moats. For each: is it data-based, workflow-based, or eval-based? How long would it take a well-funded competitor to replicate it? What would you invest in to deepen it?', time: '20 min' },
    { title: 'Model update scenario planning', description: 'Assume the next Claude model has 2x better reasoning. What happens to your product: (a) which features become dramatically better, (b) which become obsolete because users can get the same output for free, (c) what new features become possible?', time: '10 min' },
  ],
  interview: {
    question: 'How do you build a defensible AI product when anyone can call the same API you do?',
    answer: `The question is exactly right — the model API is not a moat. Defensibility in AI comes from layers that are not API-accessible.<br><br>First, proprietary data advantage. If your product generates or collects domain-specific training data, preference data, or evaluation labels that improve your model\'s performance on your specific use case, that data advantage grows over time and is difficult to replicate. The best AI products create data flywheels: more users → more feedback → better model performance → more users.<br><br>Second, workflow integration depth. An AI product that is deeply embedded in how 500 employees do their jobs every day creates switching costs that have nothing to do with model quality. The productivity gains get attributed to the tool, not the underlying model. By the time a competitor offers the same capability, the switching cost is the process change, not the product comparison.<br><br>Third, evaluation expertise. Your team\'s accumulated knowledge about what "correct" looks like in your domain — encoded in your golden eval sets, your human reviewer rubrics, your prompt engineering decisions — is a real asset that takes time to build. Competitors calling the same API don\'t automatically have your quality infrastructure.`
  },
  pmAngle: 'Your product strategy should be a document that a senior engineer finds credible and a CFO can fund. Technical architecture decisions belong in it. Cost models belong in it. Vague strategy documents that say "leverage AI" without specifics are not strategy — they\'re aspirations.',
  resources: [
    { type: 'BLOG', title: 'AI Product Strategy Framework — a16z', url: 'https://a16z.com/ai-strategy-for-founders/', note: 'How frontier AI investors think about AI product moats.' },
    { type: 'BLOG', title: 'Sequoia: The AI Product Playbook', url: 'https://www.sequoiacap.com/article/ai-product-market-fit/', note: 'Framework for finding AI product-market fit.' },
    { type: 'BLOG', title: 'Building AI Products with Moats', url: 'https://www.lennysnewsletter.com/p/how-to-build-an-ai-product-that-lasts', note: 'Specific strategies for building defensible AI product advantages.' },
  ]
},

33: {
  subtitle: 'Crack the technical AI PM interview — what questions to expect and how to structure your answers.',
  context: `<p>Technical PM interviews at frontier AI labs differ from traditional PM interviews in two important ways. First, the technical depth expected is significantly higher — you will be asked to explain how transformers work at a high level, describe the tradeoffs between RAG and fine-tuning, or design a system architecture with specific model and tool choices. "I\'m not technical" is not a viable position for an AI PM role; the expectation is conversational fluency with the technical concepts you\'ve covered in this course. Second, the product instinct questions are framed in AI-specific contexts: "How would you prioritize the next feature for Claude\'s API?" or "Design a safety evaluation for a new multimodal capability."</p>
  <p>The most common AI PM interview question types: <strong>Technical concept explanation</strong> ("Explain how RAG works"), <strong>System design</strong> ("Design an AI product for X use case"), <strong>Tradeoff analysis</strong> ("When would you fine-tune vs. prompt engineer?"), <strong>Metrics and evals</strong> ("How would you measure the quality of Claude\'s responses?"), <strong>Competitive analysis</strong> ("How does Claude compare to GPT-4o for enterprise use cases?"), and <strong>Behavioral + AI context</strong> ("Tell me about a time you had to make a data-driven decision about an AI feature under time pressure"). You should have prepared, rehearsed answers for all six types.</p>
  <p>The system design question deserves special attention because it\'s the highest-signal question for technical depth. A strong answer has a specific structure: (1) clarify the use case and constraints, (2) define the core user journey and what the AI does in each step, (3) specify the model, architecture, and key tool integrations with explicit rationale, (4) address the cost model and latency requirements, (5) define the success metrics and eval strategy. Weak answers skip steps 3, 4, or 5 — that\'s where technical depth is demonstrated. Practice this structure until it\'s automatic.</p>`,
  tasks: [
    { title: 'Record and review yourself answering 5 questions', description: 'Set a timer for 2 minutes per question. Answer out loud (record on your phone or laptop): (1) Explain RAG to a non-technical PM. (2) When would you use MCP? (3) Design an AI product for legal document review. (4) How would you measure Claude output quality? (5) Why would you choose Claude over GPT-4o? Review the recordings critically.', time: '30 min' },
    { title: 'Build your personal answer bank', description: 'For each of the 6 question types above, write a 200-word answer that\'s specific to your background and experience. These are your prepared starting points — you\'ll adapt them in the actual interview, but having the core structure ready prevents blank-slate stress.', time: '30 min' },
    { title: 'Technical concept flashcards', description: 'Create 15 flashcards — concept on the front, crisp 2-sentence explanation on the back — for: tokens, context window, temperature, RAG, fine-tuning, MCP, A2A, tool use, constitutional AI, RLHF, evals, embeddings, vector DB, agents, model routing. Review daily for the next week.', time: '20 min' },
    { title: 'Research your target company\'s recent launches', description: 'Look up the last 6 months of product launches for your target company (Anthropic, OpenAI, Google DeepMind, or another frontier lab). For each launch: what problem did it solve, who is the target customer, and what does it tell you about the company\'s product strategy? Expect questions about recent releases.', time: '20 min' },
  ],
  interview: {
    question: 'How do you stay current on AI developments as a PM, and how do you decide what\'s worth paying attention to?',
    answer: `I stay current through a layered approach: primary sources daily, curated analysis weekly, and deep dives monthly.<br><br>Daily: I follow the official changelogs and release notes for Anthropic, OpenAI, and Google DeepMind directly — not through tech media, which often misses the technically important details. I track the GitHub activity for MCP, LlamaIndex, and CrewAI release notes. I read the model cards when new models launch.<br><br>Weekly: I read two curated AI newsletters (Ben\'s Bites and The Batch) for pattern recognition across the landscape — they surface what the primary sources produced that week. I review the papers on arXiv that get traction in the ML Twitter/X community.<br><br>Monthly: I do a deep dive on one topic I\'ve been tracking. This month it might be agent interoperability protocols; next month, reasoning model tradeoffs. I write a 500-word summary to myself — writing forces the gaps in understanding to surface.<br><br>The filter for what\'s worth paying attention to: does this change what I would recommend to a product team building on Claude or OpenAI today? If yes, it\'s urgent. If it\'s capability research without a product-deployable form yet, it goes in the monthly deep-dive queue.`
  },
  pmAngle: 'Interview preparation is a product. You are the product, the interviewer is the customer, and the job offer is the conversion. Apply your PM thinking to your own interview process: what does the customer value, what signals do they use to evaluate candidates, and what\'s your differentiation?',
  resources: [
    { type: 'BLOG', title: 'AI PM Interview Guide', url: 'https://www.productmanagementexercises.com/ai-pm-interview', note: 'Practice questions and frameworks for AI PM interviews.' },
    { type: 'BLOG', title: 'Lenny\'s: How to Get an AI PM Job', url: 'https://www.lennysnewsletter.com/p/how-to-get-a-job-at-an-ai-company', note: 'What frontier AI companies actually look for in PM candidates.' },
    { type: 'TOOL', title: 'Pramp — Mock PM Interviews', url: 'https://www.pramp.com', note: 'Peer mock interview platform. Do at least 5 mock interviews before the real thing.' },
  ]
},

34: {
  subtitle: 'How to talk about AI to executives, engineers, and skeptics — without losing any of them.',
  context: `<p>AI PM communication is harder than traditional PM communication because you\'re simultaneously translating in three directions: technical concepts to non-technical stakeholders, business requirements to AI engineers, and uncertainty to executives who want certainty. Each direction requires a different register. With executives, AI uncertainty needs to be framed as risk-managed optionality, not acknowledged ignorance — "we have two model options and we\'ll make the selection after a structured eval in week 3" is better than "we\'re not sure which model to use." With engineers, vague product requirements need to be translated into specific technical parameters — context window budget, acceptable latency, output schema, evaluation criteria.</p>
  <p>The most common communication failure in AI products is the <strong>expectation mismatch</strong>: executives see GPT-4o do something impressive in a demo and extrapolate to 100% reliability on a different task at production scale. Managing this expectation gap is a core PM responsibility. The toolkit: (1) distinguish between "demo performance" and "production performance," using concrete examples of where they diverge; (2) frame AI quality in probabilistic terms ("this model is correct 94% of the time on this task type, with a defined failure mode"); (3) anchor executive expectations on real eval numbers from your golden dataset before they crystallize around demo impressions.</p>
  <p>Writing AI product specifications requires specific additions to the standard PRD format. An AI feature spec should include: the <strong>model selection rationale</strong> (why this model, what alternatives were evaluated), the <strong>prompt specification</strong> (system prompt, few-shot examples, output format constraints — versioned and in source control), the <strong>eval criteria</strong> (how you\'ll know if the feature is working), the <strong>failure mode documentation</strong> (what the feature does when the model fails — fallback behavior, error handling), and the <strong>cost estimate</strong> (per-call and monthly at expected volume). Without these, an AI feature spec is incomplete and will generate engineering uncertainty and scope creep.</p>`,
  tasks: [
    { title: 'Write an executive AI briefing', description: 'Write a 1-page briefing for a non-technical CFO on why your AI product investment is working. Include: what the AI does, how you measure quality, what the current performance numbers are, and what the cost per outcome is. No jargon. Make the ROI case clearly.', time: '25 min' },
    { title: 'Translate requirements for an engineer', description: 'A business stakeholder says: "The AI should be really accurate and not make things up." Translate this into specific, testable technical requirements: accuracy metric definition, measurement methodology, acceptable error rate, and what "making things up" means as a measurable failure mode.', time: '20 min' },
    { title: 'Write an AI feature spec', description: 'Write a complete spec for one AI feature using the format described above: model selection rationale, prompt specification, eval criteria, failure mode handling, and cost estimate. Use the document review feature from Day 9 as a reference if needed.', time: '30 min' },
    { title: 'Expectation management email', description: 'Your CEO saw a competitor\'s AI product demo and is now asking why yours isn\'t as good. Write the email that accurately characterizes the comparison, sets realistic expectations, and proposes a specific improvement path. Keep it under 200 words.', time: '15 min' },
  ],
  interview: {
    question: 'How do you communicate AI uncertainty to executives without losing their confidence?',
    answer: `Executives are comfortable with uncertainty when it\'s bounded and managed. The framing mistake is presenting AI uncertainty as "we don\'t know" — which sounds like a lack of rigor. The right framing: "here are the bounds of our uncertainty and here\'s our process for reducing it."<br><br>Concretely: instead of "the model sometimes makes mistakes," say "our eval data shows 94% accuracy on the primary task type, with a 3% false positive rate and 3% false negative rate. We have monitoring in place to detect if this degrades in production." The same underlying uncertainty is communicated, but as a managed, measured reality rather than an acknowledged weakness.<br><br>A second technique: distinguish between what\'s known and what\'s experimental. Structure your AI roadmap with a "known-reliable" tier (features with validated eval numbers) and an "experimental" tier (features still in evaluation). This gives executives a clear mental model for what they can promise customers vs. what\'s still being validated.<br><br>The most important thing: never let executives anchor on demo performance as a reliability benchmark. Set the right reference point early, with real eval numbers, and update it consistently.`
  },
  pmAngle: 'The ability to translate between technical AI concepts and business language is the highest-value PM skill at a frontier lab. Engineers respect you when you speak their language accurately; executives trust you when you translate uncertainty into manageable risk. Do both.',
  resources: [
    { type: 'BLOG', title: 'Writing Good AI Feature Specs', url: 'https://www.industriallogic.com/blog/ai-feature-spec/', note: 'Template for AI feature specifications with the components described above.' },
    { type: 'BLOG', title: 'Managing AI Expectations in Enterprise', url: 'https://sloanreview.mit.edu/article/managing-expectations-for-ai/', note: 'MIT Sloan Research on the expectation management challenge in enterprise AI.' },
    { type: 'BLOG', title: 'Communicating AI Uncertainty', url: 'https://pair.withgoogle.com/research/designing-for-uncertainty/', note: 'Google PAIR\'s design and communication framework for AI uncertainty.' },
  ]
},

35: {
  subtitle: 'How to roadmap an AI product when the underlying capability is changing every 90 days.',
  context: `<p>AI roadmapping requires a different temporal structure than traditional SaaS roadmapping. In SaaS, your capability roadmap is driven by what your engineering team can build. In AI, a significant portion of your capability improvement comes from model upgrades that happen on the API provider\'s schedule, not yours. This creates a <strong>passive improvement curve</strong> — features that work at 85% today may work at 95% in six months without any engineering investment on your part, simply because the underlying model improved. The implication: plan for model improvement as a roadmap dependency, not just a nice-to-have. Build the eval infrastructure today so you can measure the improvement when it arrives.</p>
  <p>AI roadmap structure should have three horizons. <strong>Horizon 1 (0-6 months)</strong>: features you can ship with current model capabilities, validated by existing evals, with defined engineering scope. These are your quarterly commitments. <strong>Horizon 2 (6-18 months)</strong>: features that are possible with expected model improvements (the next Claude or GPT major release), or that require engineering work (integrations, data collection) to make model improvements useful when they arrive. These are your bets. <strong>Horizon 3 (18+ months)</strong>: features that require model capabilities not yet demonstrated — autonomous long-horizon tasks, highly reliable tool use across novel domains, very low hallucination rates on specialized knowledge. These are your directional signals, not commitments.</p>
  <p>The most common roadmap failure in AI products is over-committing Horizon 2 features as Horizon 1 commitments — promising customers a feature that requires a model improvement that hasn\'t shipped yet. The mitigation: design a fallback path for every feature that has a model improvement dependency. If the model doesn\'t improve as expected, what\'s the degraded-but-shippable version? A product roadmap with explicit "model improvement required" flags and fallback plans is both honest and pragmatically useful when the AI development timeline slips.</p>`,
  tasks: [
    { title: 'Build a 3-horizon roadmap', description: 'For an AI product you\'ve worked on in this course: build a 3-horizon roadmap with at least 3 features per horizon. For each feature: name, description, the model capability or engineering work required, and the eval that would confirm readiness to ship.', time: '30 min' },
    { title: 'Identify model improvement dependencies', description: 'For 5 features on your roadmap: classify each as (a) possible with current model, (b) requires model improvement (specify which improvement), or (c) requires data/engineering investment regardless of model. Build the dependency map.', time: '20 min' },
    { title: 'Write a fallback specification', description: 'Choose a Horizon 2 feature. Write the full specification including: the ideal version (if model improves as expected) and the fallback version (if model improvement is delayed by 6 months). How different are they? Is the fallback still valuable?', time: '20 min' },
    { title: 'Present your roadmap to a mock executive', description: 'Prepare a 5-minute roadmap presentation. Explain: what\'s committed for the next 6 months with confidence, what\'s planned for 6-18 months with specific model dependencies called out, and what\'s directional beyond 18 months. Practice distinguishing between commitments and bets.', time: '10 min' },
  ],
  interview: {
    question: 'How do you roadmap an AI product when you can\'t fully predict model capability improvements?',
    answer: `I use a three-horizon structure with explicit model dependencies and fallback paths.<br><br>Horizon 1 contains only features validated with current models against real eval data — things we can commit to. Horizon 2 contains features that require either a specific model improvement (Claude\'s context window improving from 200K to 1M, for example) or a data collection investment. For each Horizon 2 feature, I write both the "ideal" specification (if the model improves) and the fallback specification (if it doesn\'t). Horizon 3 is directional: we\'re tracking capabilities that don\'t exist yet but are on the research roadmap.<br><br>The practice that makes this work: every feature on the roadmap has a "model dependency" flag and a defined eval that will confirm it\'s ready to ship. When a new model drops, we run the eval suite. Features that pass their eval threshold get promoted. This makes model updates feel like free sprint points rather than plan disruptions.<br><br>With customers: I communicate in business outcomes, not model versions. "Q3 we\'ll deliver contract extraction accuracy above 95%" — not "when Claude 4 drops we\'ll be able to do X." Customers care about outcomes, not model names.`
  },
  pmAngle: 'The best AI PMs treat model improvements as a resource to be planned around, like engineering capacity. Build the eval infrastructure today so you can redeploy features quickly when the model improves. Most teams discover they can\'t take advantage of model improvements because they have no way to measure the improvement.',
  resources: [
    { type: 'BLOG', title: 'AI Roadmapping Frameworks', url: 'https://www.mindtheproduct.com/ai-product-roadmap/', note: 'Practical framework for AI product roadmapping under uncertainty.' },
    { type: 'BLOG', title: 'Product Roadmaps That Don\'t Lie', url: 'https://www.svpg.com/the-honest-roadmap/', note: 'Marty Cagan\'s framework for honest roadmap communication — applies strongly to AI.' },
    { type: 'BLOG', title: 'Managing Technical Debt in AI Products', url: 'https://martinfowler.com/articles/ai-technical-debt.html', note: 'How AI-specific technical debt accumulates and how to manage it.' },
  ]
},

36: {
  subtitle: 'Build the competitive analysis framework that makes you the most informed PM in the room.',
  context: `<p>Competitive analysis in AI requires monitoring three distinct layers simultaneously: the <strong>model layer</strong> (capability changes in Claude, GPT-4o, Gemini, and emerging models), the <strong>platform layer</strong> (developer ecosystem changes — new API features, SDK updates, pricing changes), and the <strong>product layer</strong> (competing products built on top of AI). Most product teams only track the product layer — watching competitor feature releases — and miss the more strategically important model and platform changes that often determine product winners 12-18 months in advance. A competitor using a better-suited model or a more efficient architecture is a more serious threat than a competitor shipping a new UI feature.</p>
  <p>The tactical toolkit for AI competitive intelligence: (1) <strong>API changelogs</strong> — Anthropic, OpenAI, and Google release changelogs that are dense with product-relevant information. A new structured output format, a new tool type, or a new model tier changes the competitive landscape. (2) <strong>Benchmark movements</strong> — MMLU, HumanEval, GPQA, and domain-specific benchmarks show when a competitor\'s model has improved. (3) <strong>Job postings</strong> — what a company is hiring for predicts what it\'s building 6-12 months out. (4) <strong>Research papers</strong> — frontier labs publish their research before it ships as product; a paper on better tool use today becomes a product feature in 3-6 months. (5) <strong>Pricing changes</strong> — price reductions signal a competitor\'s inference costs have decreased, which usually means they\'ve found an efficiency improvement that will enable new product features.</p>
  <p>The deliverable that makes competitive analysis actionable is the <strong>competitive decision matrix</strong>: a living document that maps each competitor against your product on dimensions that customers actually use to make purchase decisions — not generic dimensions like "ease of use" but specific ones like "context window for document processing," "structured output reliability," "enterprise SSO support," and "HIPAA BAA availability." This matrix should be updated monthly and shared with sales to enable honest, specific competitive positioning conversations.</p>`,
  tasks: [
    { title: 'Build a competitive monitoring stack', description: 'Design the weekly competitive monitoring process for an AI product team. Include: which sources you check, how often, who owns each, and how findings are synthesized into the product roadmap. Be specific about which changelogs, papers, and job boards are most valuable.', time: '20 min' },
    { title: 'Create a competitive decision matrix', description: 'For a document intelligence product: build a matrix comparing your product against 3 competitors. Use 8 dimensions that customers actually use to choose (context window, pricing per document, languages supported, HIPAA compliance, Salesforce integration, etc.). Fill in the matrix with real data from public sources.', time: '30 min' },
    { title: 'Research a competitor\'s product through their job postings', description: 'Go to the careers page of a competitor AI company (Glean, Notion, Coda, Harvey AI, etc.). What are the top 10 open roles? What does the hiring pattern tell you about their next 2-3 product bets? Write a 200-word analysis.', time: '20 min' },
    { title: 'Identify an under-tracked competitive threat', description: 'Identify a competitive threat to an AI product that most people aren\'t paying attention to. This could be a model-layer change, a new entrant, a platform change (Azure OpenAI adding a new enterprise feature), or a research paper. Explain why it matters and what product response it warrants.', time: '10 min' },
  ],
  interview: {
    question: 'How do you do competitive analysis for an AI product, given how fast the landscape moves?',
    answer: `I monitor three layers on different cadences: model layer weekly, platform layer weekly, product layer bi-weekly.<br><br>Model layer: I check the API changelogs for Anthropic, OpenAI, and Google weekly. New model releases, new API capabilities, and pricing changes all have immediate product implications. I also track benchmark publications — MMLU, HumanEval, and domain-specific benchmarks — which give early signals of model quality changes before they hit production APIs.<br><br>Platform layer: I track job postings, research preprints from frontier labs (arXiv cs.AI category), and infrastructure announcements from AWS, Azure, and GCP. A new model deployment option on Azure often signals an upcoming enterprise feature.<br><br>Product layer: I use a competitive decision matrix — 10-15 dimensions that customers use to choose products, updated monthly with the latest data. The matrix tells me where we\'re winning, where we\'re losing, and what changes in competitors\'s pricing or feature set would change the balance.<br><br>The key discipline: link competitive insights to product decisions. If I can\'t answer "what does this competitive change mean for our roadmap?" then the intelligence is just noise. Every significant competitive development should produce at least one roadmap implication.`
  },
  pmAngle: 'Competitive analysis at the model and platform layer is undervalued because most PMs only watch product feature releases. The team that sees a model capability improvement coming and builds the feature before competitors is playing a different — and winning — game.',
  resources: [
    { type: 'TOOL', title: 'AI Changelogs Aggregator', url: 'https://changelog.llamaindex.ai', note: 'Aggregates AI framework and API changelogs — check weekly.' },
    { type: 'TOOL', title: 'arXiv cs.AI', url: 'https://arxiv.org/list/cs.AI/recent', note: 'Research papers before they become products. Check weekly.' },
    { type: 'BLOG', title: 'Competitive Intelligence for AI Companies', url: 'https://www.sequoiacap.com/article/ai-competitive-moats/', note: 'Sequoia\'s framework for thinking about competitive dynamics in AI.' },
  ]
},

37: {
  subtitle: 'How to price AI products when your unit economics are moving targets.',
  context: `<p>Pricing AI products is uniquely difficult because the underlying cost structure is dynamic in ways traditional software costs aren\'t. Model API prices have historically fallen 10-20x over 18-24 months — GPT-3 at launch cost $120/1M tokens; GPT-4o costs $5/1M today. This creates a pricing strategy tension: you want to price high enough to capture value and fund development, but you need to remain competitive as inference costs commoditize. The typical resolution: price on outcomes (value delivered) rather than on consumption (tokens processed), so that falling inference costs expand your margin rather than forcing price decreases.</p>
  <p>The three common AI pricing models each have distinct unit economics. <strong>Per-seat SaaS</strong> ($X/user/month) works when value scales with number of users and usage per user is relatively predictable. It\'s simple but incentivizes users to over-consume. <strong>Outcome-based pricing</strong> ($X per document processed, per ticket resolved, per contract reviewed) aligns incentives — you only pay when the AI delivers a defined outcome. It\'s higher-margin when the AI succeeds and zero-revenue when it fails. <strong>Consumption-based pricing</strong> ($X per 1,000 tokens, per API call) is the simplest to implement and most transparent, but exposes you to customers\'s cost scrutiny and creates awkward conversations when they can calculate your cost basis.</p>
  <p>The most important pricing decision for an early AI product is: where do you capture value relative to the AI infrastructure cost? If your $50/seat product costs $5/user/month in inference, you have a 90% gross margin. If usage scales 3x with adoption but price is fixed, you need either a usage cap, a usage-based pricing mechanism, or a consumption-based pricing component. Design your pricing model to include a circuit breaker before you hit production. The teams that discover their pricing doesn\'t work at scale after they\'ve signed 100 enterprise contracts have a much harder conversation than the teams that designed it in.</p>`,
  tasks: [
    { title: 'Price your AI product', description: 'For an AI product you\'ve been developing in this course: calculate the fully-loaded cost per user at 3 usage levels (light, moderate, heavy). Choose a pricing model and justify it. What is your gross margin at each usage level? At what usage threshold does the unit economics break?', time: '25 min' },
    { title: 'Research competitor pricing', description: 'Research the pricing for 3 AI products in a vertical (legal AI, customer support AI, or document AI). Document: pricing model (seat/outcome/consumption), price points for each tier, what each tier includes, and what the usage limits are. What does the pricing landscape tell you about market willingness-to-pay?', time: '25 min' },
    { title: 'Design usage-based pricing guardrails', description: 'You are launching a per-seat product at $100/user/month. Design the usage guardrails that prevent a "heavy user problem" from destroying your unit economics. What are the caps? How do you handle users who exceed them? What\'s the pricing for additional usage?', time: '15 min' },
    { title: 'Outcome-based pricing design', description: 'Your AI product reviews contracts. Design an outcome-based pricing model: what is the "outcome" unit you price on? How do you measure it? How do you handle partial outcomes (contract partially reviewed, user abandons)? What\'s your price per outcome at a 60% gross margin target?', time: '15 min' },
  ],
  interview: {
    question: 'How would you price a new AI product for the enterprise market?',
    answer: `I\'d start with value-based discovery before setting prices. For enterprise, I\'d interview 10-15 prospective customers to understand: what is this replacing (what does the current solution cost in time and money), what is the ROI they expect, and what is their comparable SaaS spend in this category. This gives you a price ceiling from the customer perspective and a minimum from the value delivered.<br><br>Then I\'d model unit economics from the bottom up: inference cost per user at expected usage, hosting and engineering overhead, sales and support cost allocated per customer. This gives you the floor — the minimum price at which the product is sustainable.<br><br>For the model itself, I\'d strongly lean toward outcome-based pricing for enterprise AI — $X per document processed, per case resolved, per analysis completed. This aligns incentives (you only pay when value is delivered), doesn\'t expose you to inference cost scrutiny, and makes the ROI calculation clean for the customer (if resolving a contract costs $2 and saves 2 hours of lawyer time at $500/hour, the ROI is obvious).<br><br>The enterprise packaging would be: a starter tier with a document/outcome cap, a growth tier with higher limits and enterprise integrations, and an unlimited enterprise tier with custom SLA and dedicated support.`
  },
  pmAngle: 'Pricing is a product decision, not a sales decision. The product architecture determines whether you can implement usage-based pricing, outcome-based pricing, or seat-based pricing. Make the pricing model a first-class consideration in your architecture, not an afterthought.',
  resources: [
    { type: 'BLOG', title: 'Pricing AI Products — SaaStr', url: 'https://www.saastr.com/ai-pricing-models/', note: 'How leading AI companies are pricing in 2024-2025.' },
    { type: 'BLOG', title: 'Outcome-Based Pricing for AI', url: 'https://openviewpartners.com/blog/ai-product-pricing/', note: 'OpenView\'s framework for AI product pricing strategy.' },
    { type: 'BLOG', title: 'The Unit Economics of AI Products', url: 'https://a16z.com/the-economics-of-ai-products/', note: 'a16z deep dive on AI product margin structures and pricing levers.' },
  ]
},

38: {
  subtitle: 'Launch strategies for AI products — from developer beta to enterprise general availability.',
  context: `<p>AI products have a different launch anatomy than traditional SaaS. The standard software launch is a feature → beta → GA pipeline measured by adoption. AI product launches require an additional pre-launch phase: <strong>eval-gated readiness</strong> — demonstrating that the AI performs at an acceptable quality threshold on your target task before any users see it. This eval gate is what separates professional AI launches from "ship and hope." Without it, you discover quality problems at scale, from customers, in production — the worst time to discover that your document extraction model hallucinates clause numbers.</p>
  <p>The developer-first launch strategy is overwhelmingly common for AI products. Developers are early adopters who can debug the product, provide precise quality feedback, and build integrations that extend the product\'s value. They\'re also more forgiving of rough edges than enterprise buyers. The playbook: launch to developers first via an open API, build the integration ecosystem, accumulate quality signals and quality improvements, then launch to enterprise buyers with a validated quality story and a portfolio of enterprise-grade integrations already built by the developer community. Anthropic, OpenAI, and Stripe all used this playbook. It works for AI products because the developer API layer is the core product, and enterprise deployments of AI almost always go through developers.</p>
  <p>The launch content that AI products need (and that traditional SaaS doesn\'t): an <strong>accuracy and quality report</strong> — specific, honest claims about what the AI does well and where it fails, grounded in eval data. Enterprise buyers increasingly require this before signing. A <strong>model card</strong>-style document that describes training approach, known limitations, and intended use cases is now table stakes for serious enterprise AI sales. This transparency is both a trust-builder and a risk management tool — if you\'ve disclosed a known limitation and the customer deploys into that use case anyway, the liability is clearer.</p>`,
  tasks: [
    { title: 'Design a developer launch plan', description: 'For an AI API product: design the developer launch plan. Include: where you announce (DevRel channels, HN, Product Hunt, AI Discord servers), what developer experience you optimize for (time-to-first-call < 5 minutes), what the feedback collection mechanism is, and what success looks like after 30 days.', time: '25 min' },
    { title: 'Write an accuracy and quality report', description: 'Write a 1-page "AI Quality Report" for a document extraction product. Include: task types covered, accuracy on each task type (make up representative numbers), known limitations and failure modes, recommended use cases, and what you would not recommend it for. Model on a real model card.', time: '25 min' },
    { title: 'Design the beta → GA eval gate', description: 'What quality threshold must your product reach before general availability? Define: the minimum acceptable accuracy score for each task type, the maximum acceptable hallucination rate, the performance SLA (p95 latency), and the minimum number of beta users/queries needed to validate at scale. These are your GA gates.', time: '20 min' },
    { title: 'Launch channel analysis', description: 'Research where 3 successful AI products launched (Notion AI, Perplexity, Cursor). Where did they announce? What was the first-day response? What channel drove their highest-quality early adopters vs. volume? What would you replicate for your launch?', time: '10 min' },
  ],
  interview: {
    question: 'Walk me through how you would launch a new AI feature from beta to general availability.',
    answer: `I\'d structure the launch as three phases with explicit gates between them.<br><br>Alpha (internal, 2-4 weeks): validate the core technical architecture with internal users. Build the eval harness. Establish baseline quality metrics. Identify the highest-priority failure modes. No external users until quality meets a minimum threshold.<br><br>Beta (limited external, 4-8 weeks): invite 50-100 developers or power users from the target persona. The goal is edge case discovery, not adoption. Run daily eval sweeps on production queries. Track acceptance rate, task completion rate, and user-reported errors. Set explicit quality gates for GA: e.g., 92% accuracy on the primary task, < 2% error rate, p95 latency < 3 seconds.<br><br>GA (general availability): only when all quality gates are passed and the eval data shows stable performance across the beta traffic distribution. Launch with a quality report (honest about capabilities and limitations), integration with the top 3 enterprise systems users depend on, and a documented feedback loop so early GA users know how to report quality issues.<br><br>The key decision: never let timeline pressure override the quality gates. A bad launch with a quality-gated product damages trust more than a delayed launch.`
  },
  pmAngle: 'The eval gate before GA is the most important launch discipline in AI product development. Every major quality scandal in AI products — chatbots giving dangerous advice, AI models generating harmful content — happened because someone shipped without a quality gate.',
  resources: [
    { type: 'BLOG', title: 'AI Product Launch Playbook', url: 'https://www.lennysnewsletter.com/p/ai-product-launch', note: 'How top AI companies structure their product launches.' },
    { type: 'BLOG', title: 'Model Cards — Google Research', url: 'https://modelcards.withgoogle.com/about', note: 'The original model card framework — adapt for product-level quality reporting.' },
    { type: 'BLOG', title: 'Developer-Led Growth for AI', url: 'https://openviewpartners.com/blog/developer-led-growth-ai/', note: 'How to build developer adoption as a foundation for enterprise sales.' },
  ]
},

39: {
  subtitle: 'Phase 2 Capstone — produce the competitive teardown that proves strategic depth.',
  context: `<p>The Phase 2 Capstone asks you to produce a comprehensive competitive teardown of an AI product category. This is the deliverable that most differentiates strong AI PM candidates from average ones: it requires technical depth (understanding model and architecture choices), product sense (identifying user value and experience quality), business analysis (pricing, GTM, competitive positioning), and strategic thinking (what is the defensible position and why). A lazy teardown summarizes features from the company\'s website. A strong teardown analyzes the technical architecture, estimates the unit economics, identifies the model dependencies, and explains what the company would need to do differently to defend its position over the next 18 months.</p>
  <p>The format that works best for this deliverable: a 4-section document of 1,500-2,500 words. <strong>Section 1: Landscape map</strong> — the 5-6 key players, their positioning, and how they segment the market. A 2x2 matrix (e.g., technical sophistication vs. enterprise readiness, or breadth vs. domain specialization) is useful here. <strong>Section 2: Technical architecture teardown</strong> — for the 2-3 most interesting companies: what model are they likely using, what does their architecture look like (RAG, fine-tuned, computer use), what are the implications of those choices. <strong>Section 3: Business model analysis</strong> — pricing, GTM, enterprise readiness, and the unit economics story. <strong>Section 4: Strategic recommendations</strong> — if you were the PM at one of these companies, what would you change in the next 6 months? If you were a new entrant, where is the gap in the market?</p>
  <p>The skill being tested here is not research thoroughness — it\'s structured thinking under ambiguity. You will not have complete information about competitors\' architectures or economics. The quality of the teardown comes from how you reason from available evidence to defensible conclusions. "Cursor appears to be using Claude 3.5 Sonnet given the context window behavior we observe and their API cost structure" is a better answer than "we don\'t know what model Cursor uses." Make your reasoning explicit and your assumptions named.</p>`,
  tasks: [
    { title: 'Choose and scope your teardown', description: 'Choose one of: legal AI (Harvey, Ironclad, LexisNexis AI), code AI (Cursor, GitHub Copilot, Replit), customer support AI (Intercom, Zendesk AI, Decagon), or document intelligence (Glean, Notion AI, Guru). Write the 2-sentence framing: what problem does this category solve, and why is it interesting now?', time: '15 min' },
    { title: 'Research and write Sections 1 and 2', description: 'Research the top 4-5 players in your chosen category. Build the landscape map (2x2 matrix). Write the technical architecture teardown for the top 2 players. Use public information: landing pages, blog posts, job postings, GitHub, pricing pages.', time: '45 min' },
    { title: 'Write Sections 3 and 4', description: 'Write the business model analysis for the top 2 players (pricing, GTM, enterprise readiness). Write your strategic recommendations: where is the market gap, what would you build, and who is best positioned to win in 18 months?', time: '30 min' },
    { title: 'Review and refine', description: 'Re-read your teardown. Is every claim evidence-based or explicitly flagged as inference? Are your strategic recommendations specific enough to actually implement? Is the technical depth credible? Revise the weakest section.', time: '10 min' },
  ],
  interview: {
    question: 'Present a 2-minute competitive teardown of the AI coding assistant market.',
    answer: `Structure: market map → technical differentiation → business model → strategic outlook.<br><br>The AI coding assistant market segments into two tiers: inline completion tools (GitHub Copilot, Codeium, Tabnine — operating at file context) and agentic tools (Cursor, Claude Code, Devin — operating across the full codebase). The second tier is the faster-growing and higher-value segment, because agentic tools unlock multi-file refactoring and autonomous task completion that inline tools can\'t achieve.<br><br>Technical differentiation: Cursor\'s key architectural bet is context curation — building a proprietary code understanding layer on top of commodity LLM APIs. GitHub Copilot\'s moat is distribution (every GitHub repo, every VS Code install). Claude Code\'s advantage is the model — running on Anthropic\'s best reasoning model gives it an edge on complex multi-step tasks.<br><br>Business model: Cursor is $20/user/month with power user growth. GitHub Copilot at $10/month benefits from GitHub\'s existing billing relationship with 100M+ developers. The unit economics converge as models commoditize.<br><br>Strategic outlook: the 18-month winner is whoever builds the best codebase understanding layer above the LLM. The model is commoditizing; the context curation and tool integration layer is where defensibility lives.`
  },
  pmAngle: 'Competitive teardowns are one of the most-requested deliverables in PM interviews. Produce the one for this capstone at a level you would be proud to share with a hiring manager at Anthropic or OpenAI. That\'s your bar.',
  resources: [
    { type: 'BLOG', title: 'How to Write a Competitive Teardown', url: 'https://www.stratechery.com/methodology/', note: 'Ben Thompson\'s analytical framework — the gold standard for tech competitive analysis.' },
    { type: 'TOOL', title: 'Perplexity Pro for Research', url: 'https://www.perplexity.ai', note: 'Use for fast, cited research during the teardown — then verify primary sources.' },
    { type: 'BLOG', title: 'AI Competitive Landscape Maps', url: 'https://ai-landscape.co', note: 'Visual landscape maps for AI product categories — useful reference.' },
  ]
},

40: {
  subtitle: 'Simulate the full AI PM interview loop — pressure-test every skill before the real thing.',
  context: `<p>This sprint simulates the full interview loop at a frontier AI lab PM role. Typical interview loops for AI PM positions at Anthropic, OpenAI, or Google DeepMind include 5-6 rounds: a recruiter screen, a hiring manager conversation, a system design exercise, a product sense interview, a metrics/analytical interview, and a cross-functional interview (engineering or design partner). Each round tests different competencies, and preparation for each is different. The candidates who fail aren\'t usually underprepared on the technical side — they\'re underprepared on the behavioral side, or they over-rotate on technical depth and forget to anchor answers in user value.</p>
  <p>The system design exercise is the highest-variance round for AI PM candidates: some interviewers expect deep technical architecture; others expect product strategy and metrics. The safe approach: start with the user problem and the product vision (2 minutes), then dive into technical architecture (5 minutes), then metrics and success criteria (3 minutes), then acknowledge trade-offs and alternatives. This structure signals both product thinking and technical credibility. The candidates who fail the system design round usually do so by either (a) going straight to architecture without establishing user value, or (b) staying at the product layer without ever getting technical.</p>
  <p>The most important preparation investment is <strong>structured repetition</strong>. You need to be able to answer the 20 most common AI PM interview questions fluently — not perfectly, but fluently. The goal of practice is to reduce working memory load during the actual interview so your real-time thinking can focus on the specific nuances of each question rather than on recalling concepts under pressure. Record yourself. Review the recording critically. Do 5 mock interviews with a human partner. The candidates who get AI PM offers at frontier labs have done this work.</p>`,
  tasks: [
    { title: 'Full 45-minute mock interview', description: 'Arrange a mock interview with a peer, a mentor, or use an AI interview tool. Run a full 45-minute session: 5 min intro/background, 10 min system design (design an AI product for X), 10 min product sense (how would you improve Claude), 10 min metrics (how would you measure Y), 10 min behavioral. Record it.', time: '45 min' },
    { title: 'Self-assessment and gap analysis', description: 'Review your mock interview recording. Score yourself on each round (1-5). Identify the 3 weakest moments — what didn\'t you know, what were you unclear on, what question caught you off guard. These are your Phase 3 review priorities.', time: '20 min' },
    { title: 'Answer bank review and update', description: 'Review the answer bank you built in Day 33. Which answers are now stronger after the Phase 2 work? Which still feel thin? Update the 5 weakest answers with specific examples and data points from the Phase 2 content. Each answer should have at least one concrete, specific example.', time: '20 min' },
    { title: 'Questions to ask the interviewer', description: 'Prepare 10 strong questions to ask interviewers at frontier AI labs. Strong questions demonstrate knowledge of the company and the role while learning genuinely useful information. Avoid questions that could be answered by reading the company website.', time: '15 min' },
  ],
  interview: {
    question: 'Tell me about a time you made a significant product decision with incomplete information. What was the outcome?',
    answer: `This behavioral question is best answered with a story that has a technical dimension — showing you can reason under uncertainty in an AI-specific context.<br><br>Structure: Situation (1 sentence) → The incomplete information you had (1 sentence) → Your reasoning process (2-3 sentences) → The decision (1 sentence) → Outcome and what you learned (1-2 sentences).<br><br>Example frame: "We were deciding whether to use a fine-tuned smaller model or a larger general model for our classification task. We had benchmark data but no production data, and the two approaches had opposite cost and quality profiles. I weighted three factors: latency SLA (the fine-tuned model would hit it; the general model wouldn\'t), the 90-day inference cost projection at scale, and the maintenance burden of keeping a fine-tuned model current as our taxonomy changed. I recommended the general model, accepting the higher cost, because the maintenance burden on the fine-tuned model would have required a dedicated ML engineer we didn\'t have. Six months later, when our taxonomy changed significantly, the decision paid off — we updated prompts in 2 hours instead of retraining a model."<br><br>The key: the decision involved technical tradeoffs, you made them explicitly, and you learned something that you\'d apply again.`
  },
  pmAngle: 'The mock interview is the most underutilized tool in interview preparation. Every hour of recorded mock interview is worth 10 hours of reading about interview preparation. Do the uncomfortable thing: record yourself and watch it.',
  resources: [
    { type: 'TOOL', title: 'Interview.io', url: 'https://interviewing.io', note: 'Paid mock interviews with ex-FAANG interviewers — worth it for the final 2 weeks before a real loop.' },
    { type: 'BLOG', title: 'AI PM Interview Preparation', url: 'https://www.tryexponent.com/guides/ai-pm-interview', note: 'Exponent\'s guide to AI PM interview rounds and preparation strategy.' },
    { type: 'TOOL', title: 'BigInterview', url: 'https://biginterview.com', note: 'AI-powered mock interview tool with instant feedback on your answers.' },
  ]
},

});
