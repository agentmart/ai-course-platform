// Day 15 — LangChain & Orchestration
// Updated: March 2026
// Review changes:
// - CRITICAL FACTUAL FIX: "LangSmith is Anthropic's observability sibling" →
//   LangSmith is a LangChain product, NOT an Anthropic product
// - Added LangGraph (LangChain's agentic evolution, now primary for multi-agent workflows)
// - Added Pydantic AI (fast-growing type-safe alternative framework)
// - Updated LangChain version context
// - Kept honest critique of LangChain

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

window.COURSE_DAY_DATA[15] = {
  subtitle: 'When orchestration adds real value — and when to use raw API calls instead.',

  context: `<p><strong>LangChain</strong> is an open-source framework for building LLM applications with composable chains, memory management, and tool integration. Its core abstractions: <strong>LLMChain</strong> (a prompt template + model + output parser), the <strong>LangChain Expression Language (LCEL)</strong> which uses pipe syntax (<code>prompt | llm | parser</code>) for composable chains, and <strong>LangGraph</strong> — now LangChain's primary approach for agentic workflows. LangGraph introduces a graph-based execution model with explicit state management, better suited for complex multi-step agents than LCEL chains. If you're building a simple pipeline, use LCEL. If you're building an agent with branching logic, loops, and persistent state, use LangGraph.</p>
  <p>LangChain's value is clearest in complex multi-step pipelines where you're composing multiple LLM calls, combining retrieval with generation, and managing complex state. For simple use cases — a single system prompt with conversation history — LangChain adds abstraction without adding value. The honest recommendation: use raw API calls for anything under 3-4 LLM calls; reach for LangChain/LangGraph when the complexity demands it. LangChain's largest real value-add is its integrations ecosystem: hundreds of pre-built connectors for data sources, tools, and services via LangChain Hub and LangSmith.</p>
  <p><strong>LangSmith</strong> is LangChain's commercial observability product — it traces every LLM call, shows the exact prompt sent, tokens used, latency, and output. It is <em>not</em> an Anthropic product; it's built and maintained by LangChain. LangSmith is indispensable for debugging complex chains where you can't tell which step failed. Even if you don't use LangChain itself, LangSmith works with direct API calls and provides the right mental model for production AI monitoring: capture inputs, outputs, tokens, latency, and error rates for every LLM call.</p>
  <p><strong>Pydantic AI</strong> (released late 2024 by the team behind Pydantic, the dominant Python validation library) is a type-safe, model-agnostic agent framework that has gained significant traction among Python developers who want structured, validated AI outputs without LangChain's complexity. If your team is Python-native and values type safety and minimal abstraction, Pydantic AI is worth evaluating as an alternative. The broader <strong>orchestration landscape</strong> now includes LangGraph (stateful agents), CrewAI (multi-agent teams, Day 22), AutoGen (enterprise human-in-the-loop, Day 23), and Pydantic AI (type-safe Python). Each has a different strength; the decision isn't "use LangChain or not" but which tool fits the specific workflow.</p>`,

  tasks: [
    {
      title: 'Build a simple LCEL chain',
      description: 'Use LangChain LCEL (Python or JS) to build: user input → prompt template → claude-sonnet-4-6 → output parser that extracts a specific field as JSON. Time how long it takes to implement vs a direct API call. What did the abstraction give you? Save as /day-15/langchain_simple_chain.py.',
      time: '30 min'
    },
    {
      title: 'LangGraph vs raw API: the agent decision',
      description: 'Design (on paper, not code) a 3-step agentic workflow for: (1) search the web for a company, (2) assess if they match your ICP criteria, (3) draft an outreach email if match. Write two architectures: one using LangGraph state machine, one using raw API calls with Python control flow. What does LangGraph give you that raw calls don\'t? What does it add that you don\'t need? Save as /day-15/langgraph_vs_raw_api.md.',
      time: '25 min'
    },
    {
      title: 'LangSmith trace analysis',
      description: 'If you have LangSmith access: run your LCEL chain and inspect the trace. If not: review LangSmith\'s documentation at smith.langchain.com. Identify: what information does a trace give you that you couldn\'t get from print statements? When is this visibility worth the integration cost? Save notes as /day-15/langsmith_trace_analysis.md.',
      time: '20 min'
    },
    {
      title: 'Orchestration framework decision guide',
      description: 'For 5 different AI product scenarios, write a 1-sentence rationale for your framework choice. Scenarios: (a) simple single-turn Q&A with a system prompt, (b) document RAG with 3 retrieval steps, (c) multi-agent research pipeline that loops until confidence threshold is met, (d) customer support bot that escalates based on sentiment, (e) code review agent that can run tests and iterate. Options: raw API calls, LangChain LCEL, LangGraph, Pydantic AI, CrewAI. Save as /day-15/orchestration_decision_guide.md.',
      time: '15 min'
    }
  ],

  codeExample: {
    title: 'LangChain LCEL chain — Python',
    lang: 'python',
    code: `# Day 15 — LangChain LCEL: composable chain with current Claude model
# NOTE: LangSmith is a LangChain product, NOT an Anthropic product.
# Install: pip install langchain langchain-anthropic

# This is a conceptual walkthrough — run in your local environment, not the browser.

LCEL_EXAMPLE = '''
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Current model string (March 2026) — verify at docs.anthropic.com/en/docs/about-claude/models
model = ChatAnthropic(model="claude-sonnet-4-6")

prompt = ChatPromptTemplate.from_template(
    "Extract the 3 most important risks from this contract clause:\\n\\n{clause}"
)

# LCEL pipe syntax: prompt | model | parser
chain = prompt | model | StrOutputParser()

# Invoke
result = chain.invoke({"clause": "Party A shall indemnify..."})
print(result)

# Stream (better UX for long responses)
for chunk in chain.stream({"clause": "Party A shall indemnify..."}):
    print(chunk, end="", flush=True)
'''

# LangGraph vs LCEL — when to use which
FRAMEWORK_GUIDE = [
    {
        "use_case": "Simple prompt + response",
        "choice": "Raw API call",
        "reason": "No added value from abstraction; raw is clearer and faster"
    },
    {
        "use_case": "3-step RAG pipeline (embed → retrieve → generate)",
        "choice": "LangChain LCEL",
        "reason": "Composability + LangSmith tracing worth the overhead"
    },
    {
        "use_case": "Agent with loops, branching, persistent state",
        "choice": "LangGraph",
        "reason": "Explicit state management prevents hard-to-debug implicit state"
    },
    {
        "use_case": "Multi-agent team with roles",
        "choice": "CrewAI or LangGraph",
        "reason": "Built for agent coordination; raw API gets messy fast"
    },
    {
        "use_case": "Python-first, type-safe structured outputs",
        "choice": "Pydantic AI",
        "reason": "Minimal overhead, leverages existing Pydantic ecosystem"
    },
]

print("=" * 65)
print("LANGCHAIN FAMILY OVERVIEW")
print("=" * 65)
print("LangChain LCEL  → Composable chains, pipe syntax, streaming")
print("LangGraph       → Stateful agents, graph execution, human-in-loop")
print("LangSmith       → Observability & tracing (LangChain product, NOT Anthropic)")
print("LangChain Hub   → Shared prompts and chain templates")
print()
print("=" * 65)
print("FRAMEWORK SELECTION GUIDE")
print("=" * 65)
for g in FRAMEWORK_GUIDE:
    print(f"\nUse case: {g['use_case']}")
    print(f"  → {g['choice']}: {g['reason']}")
print()
print("=" * 65)
print("LCEL CHAIN EXAMPLE (run locally with langchain-anthropic installed)")
print("=" * 65)
print(LCEL_EXAMPLE)
`
  },

  interview: {
    question: 'When would you use an orchestration framework like LangChain or LangGraph vs calling the API directly?',
    answer: `I use raw API calls when: the use case is a single LLM call with a system prompt and conversation history, when I need precise control over every token, or when the team is new to AI and I don\'t want an abstraction layer obscuring how the API actually works. That covers the majority of production AI features.<br><br>I reach for LangChain LCEL when: I\'m composing 3+ LLM calls with intermediate state, I want LangSmith tracing to debug complex pipelines, or I need to swap models or parsers without rewriting logic. LCEL\'s pipe syntax is genuinely readable once you\'re used to it.<br><br>I use LangGraph specifically when: the workflow has loops (retry logic, self-critique), branching (different paths based on tool results), or persistent state across multiple agent turns. LangGraph makes state machines explicit; LCEL and raw calls make them implicit (and hard to debug).<br><br>One important clarification I make in every team discussion: LangSmith is a LangChain commercial product — it's not affiliated with Anthropic. It works well with Claude but it\'s not an Anthropic offering. This matters for enterprise procurement conversations where teams ask whether observability is coming from the model provider.`
  },

  pmAngle: 'The LangSmith/Anthropic confusion is surprisingly common — it appears in vendor evaluations, technical blog posts, and interview answers. Knowing the landscape cleanly (Anthropic makes Claude; LangChain makes LangSmith and LangGraph; both work together but are separate companies and products) is basic professional knowledge for an AI PM.',

  resources: [
    { type: 'DOCS', title: 'LangGraph Documentation', url: 'https://langchain-ai.github.io/langgraph/', note: 'Primary resource for stateful agent workflows with LangChain. This is the current recommended approach for complex agents.' },
    { type: 'DOCS', title: 'LangChain LCEL Reference', url: 'https://python.langchain.com/docs/expression_language/', note: 'The modern composable chain syntax. Use this, not the older Chain classes.' },
    { type: 'TOOL', title: 'LangSmith', url: 'https://www.langchain.com/langsmith', note: 'LangChain\'s tracing and observability product. Works with Claude and all major models.' },
    { type: 'DOCS', title: 'Pydantic AI Documentation', url: 'https://ai.pydantic.dev/', note: 'Type-safe agent framework from the Pydantic team. Worth evaluating for Python-native teams.' },
    { type: 'DOCS', title: 'LangChain Anthropic Integration', url: 'https://python.langchain.com/docs/integrations/chat/anthropic/', note: 'How to use Claude with LangChain. Uses claude-sonnet-4-6 and other current models.' }
  ]
};
