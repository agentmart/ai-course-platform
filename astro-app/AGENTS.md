# Agents (Sprint 7)

This doc covers how AI agents are structured in the Astro app on Cloudflare
Workers. Scaffolding lives in `src/lib/llm.ts` and `src/pages/api/agent-smoke.ts`.

## Why LangChain.js + LangGraph.js (and not Microsoft Agent Framework)

We picked **LangChain.js + LangGraph.js** over Microsoft Agent Framework for one
reason: **runtime mismatch on Cloudflare Workers**.

- The Astro app runs on Workers (V8 isolates, not Node), with `nodejs_compat`
  for the few Node built-ins our deps use (`node:crypto`, `node:buffer`).
- Microsoft Agent Framework's JS SDK pulls in heavier Node-only modules
  (`node:fs`, `node:net`, full Node-style streams) that don't compile cleanly
  in the Workers build pipeline.
- LangChain.js exposes **slim, focused entry points** that compile under
  `nodejs_compat`: `@langchain/core`, `@langchain/anthropic`,
  `@langchain/openai`, `@langchain/langgraph`.
- LangGraph.js gives us the state-machine model we want for multi-step agents
  without dragging in a Python runtime or a separate orchestrator service.

We deliberately **do NOT depend on the kitchen-sink `langchain` umbrella
package** — it transitively imports `node:fs` and breaks Workers builds. Only
import from the slim packages above.

## Lazy-import requirement

LangChain modules do non-trivial work at import time. On Cold-start Workers,
that's billed against every cold request, even ones that don't touch an LLM.
**Always lazy-import LangChain inside the handler function**, never at the top
of a module:

```ts
export const GET: APIRoute = async ({ request, locals }) => {
  const { ChatAnthropic } = await import('@langchain/anthropic'); // lazy ✓
  // ...
};
```

`src/lib/llm.ts` follows this rule — it only imports the `BaseChatModel`
**type** at top-level (erased at compile time) and dynamically imports the
provider modules inside `getChatModel`.

## Provider switching: `getChatModel(env, opts)`

All agents construct chat models through one helper:

```ts
import { getChatModel } from '~/lib/llm';

const model = await getChatModel(env, { provider: 'anthropic' });
// or { provider: 'openai', model: 'gpt-5-mini', temperature: 0.2 }
```

- Defaults: `claude-sonnet-4-6` (Anthropic), `gpt-5-mini` (OpenAI).
- Throws if the chosen provider has no key in env — handlers map that to 503.
- This is the **single switch point** for the future Azure AI Foundry move
  (todo `s7-foundry-llm`). Adding a `'foundry'` case here is the only change
  needed; no agent code is touched.

## Example: minimal agent skeleton

A LangGraph state machine with one tool node and one model node:

```ts
const { StateGraph, MessagesAnnotation, START, END } = await import('@langchain/langgraph');
const model = await getChatModel(env);
const graph = new StateGraph(MessagesAnnotation)
  .addNode('call_tool',  async (s) => ({ messages: [/* tool result */] }))
  .addNode('call_model', async (s) => ({ messages: [await model.invoke(s.messages)] }))
  .addEdge(START, 'call_tool').addEdge('call_tool', 'call_model').addEdge('call_model', END)
  .compile();
const result = await graph.invoke({ messages: [/* user input */] });
```

See `src/pages/api/agent-smoke.ts` for a working 1-node version that runs end-
to-end on Workers.

## Refactor roadmap

The four existing pseudo-agents will be migrated to real LangGraph state
machines, each in its own todo. **None of those refactors are part of this
todo (`s7-langchain-setup`).**

| Pseudo-agent | Sprint 7 todo | Plan |
|---|---|---|
| Gap detector (sprint progress diagnostics) | `s7-gap-detector-graph` | Multi-node LangGraph: load progress → diagnose gaps → recommend next module. |
| Interview prep (`/api/interview-prep`) | `s7-interview-factcheck` | Add a fact-check tool node that grounds answers in the day-file corpus before returning. |
| Course advisor (`/api/course-advisor`) | `s7-advisor-agent` | Replace heuristic with an agent that calls a "spine search" tool over course content. |
| Job alerts relevance ranking | `s7-job-screener` | LLM screener node that scores AI-PM relevance per job posting. |
| LLM provider abstraction | `s7-foundry-llm` | Add Azure AI Foundry as a third provider in `getChatModel`. |

## Smoke test

`GET /api/agent-smoke?q=<question>` (Clerk-authed) runs a 1-node LangGraph
agent and returns `{ provider, model, response, latency_ms }`. Use it to
verify the runtime works after dependency or compatibility-flag changes.
Returns 503 if no LLM key is configured.
