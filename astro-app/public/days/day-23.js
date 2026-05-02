// Day 23 — AutoGen v0.4 (Microsoft Agent Framework)
// Updated: March 2026 | Review: Magentic-One, Claude client, SK relationship, Swarm pattern

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[23] = {
  subtitle: 'Microsoft\u2019s production-grade multi-agent framework \u2014 async, event-driven, enterprise-ready.',
  context: `<p><strong>AutoGen</strong> is Microsoft Research\u2019s open-source framework for multi-agent AI. Version 0.4 (January 2025) was a complete architectural redesign: asynchronous, event-driven, with three tiers \u2014 <strong>Core</strong> (event-driven actor framework), <strong>AgentChat</strong> (task-driven high-level API), and <strong>Extensions</strong> (integrations for memory, model clients, tools). Key additions through 2025-2026: <strong>GraphFlow</strong> for directed agent graphs, <strong>Swarm pattern</strong> for dynamic orchestration without fixed hierarchies, and <strong>declarative agent specifications</strong> (YAML-based). Verify the current version at <a href="https://microsoft.github.io/autogen/" target="_blank">microsoft.github.io/autogen</a>.</p>
  <p><strong>Magentic-One</strong> (Microsoft, 2024) is a multi-agent benchmark system built on AutoGen that demonstrates where the framework is heading. Understanding its architecture \u2014 an Orchestrator agent delegating to specialist Web Surfer, File Surfer, Coder, and Computer Terminal agents \u2014 gives insight into production multi-agent design patterns.</p>
  <p>AutoGen\u2019s key differentiator: <strong>human-in-the-loop</strong> patterns and enterprise observability. The UserProxyAgent provides clean human review injection at any workflow point \u2014 critical for regulated industries. AutoGen now has a <strong>Claude client</strong> (AnthropicClient), so Anthropic-focused PM candidates should know how to configure AutoGen with Claude models. Microsoft\u2019s official guidance: use AutoGen for multi-agent coordination, Semantic Kernel (Day 47) for single-agent orchestration on Azure. These two frameworks are complementary, not competing.</p>`,
  tasks: [
    { title: 'Compare AutoGen vs CrewAI for enterprise', description: 'Compare on 5 dimensions: observability, human-in-the-loop, Azure deployment, developer experience, community. Which for a regulated financial services product? Save as /day-23/autogen_vs_crewai_comparison.md.', time: '25 min' },
    { title: 'Design expense review with human approval', description: 'Build an AutoGen team: expense reviewer agent + human approver (UserProxyAgent). What happens when the human rejects? How does the agent retry? Save as /day-23/autogen_expense_review.md.', time: '25 min' },
    { title: 'AgentChat vs Core decision guide', description: 'For 3 products: (a) quarterly report generator, (b) real-time alert triage, (c) nightly document pipeline \u2014 choose AgentChat (task-driven) or Core (event-driven). Rationale for each. Save as /day-23/enterprise_agent_architecture.md.', time: '15 min' },
    { title: 'Research Magentic-One architecture', description: 'Read about Magentic-One at microsoft.com/research. How does the Orchestrator delegate to specialists? What design patterns transfer to your products? Save as /day-23/magentic_one_analysis.md.', time: '15 min' },
  ],

  codeExample: {
    title: 'Async event-driven agent state machine — Python',
    lang: 'python',
    code: `# Day 23 — Async Event-Driven Agent State Machine (AutoGen pattern)
#
# Microsoft's AutoGen v0.4+ is built around an event-driven core: agents
# subscribe to topics, react to messages, and a UserProxyAgent gates
# irreversible actions for human approval. This script simulates that
# topology in pure stdlib (no asyncio import — we model the event loop as
# a deterministic queue) so the architecture is inspectable.
#
# Use case: expense report review with a human-in-the-loop on any item
# above $1,000 — exactly the regulated workflow AutoGen targets.

from collections import deque
from dataclasses import dataclass, field
from typing import Callable, Dict, List

@dataclass
class Event:
    topic: str
    payload: dict
    causation_id: int = 0

@dataclass
class Bus:
    queue: "deque[Event]" = field(default_factory=deque)
    subs: Dict[str, List[Callable[[Event, "Bus"], None]]] = field(default_factory=dict)
    log: List[Event] = field(default_factory=list)

    def subscribe(self, topic: str, handler):
        self.subs.setdefault(topic, []).append(handler)

    def publish(self, ev: Event):
        self.queue.append(ev)
        self.log.append(ev)

    def run(self, max_steps: int = 50):
        steps = 0
        while self.queue and steps < max_steps:
            ev = self.queue.popleft()
            for h in self.subs.get(ev.topic, []):
                h(ev, self)
            steps += 1
        return steps

# --- Agents -------------------------------------------------------------
def policy_agent(ev: Event, bus: Bus):
    """Classifies the expense and decides next topic."""
    item = ev.payload
    state = "OK"
    if item["amount"] > 1000:
        state = "NEEDS_APPROVAL"
    elif item["category"] not in {"travel", "meals", "software"}:
        state = "REJECTED"
    print(f"[policy ] item={item['id']} amount=\${item['amount']} -> {state}")
    out_topic = {"OK": "expense.approved",
                 "NEEDS_APPROVAL": "expense.review_requested",
                 "REJECTED": "expense.rejected"}[state]
    bus.publish(Event(out_topic, {**item, "state": state}, causation_id=ev.causation_id))

def user_proxy(ev: Event, bus: Bus, human_decision: Dict[str, str]):
    """Stand-in for AutoGen's UserProxyAgent — looks up a pre-recorded answer."""
    item = ev.payload
    decision = human_decision.get(item["id"], "deny")
    print(f"[human  ] reviewed item={item['id']} -> {decision}")
    bus.publish(Event(
        "expense.approved" if decision == "approve" else "expense.rejected",
        {**item, "state": "HUMAN_" + decision.upper()},
        causation_id=ev.causation_id,
    ))

def ledger(ev: Event, bus: Bus, totals: Dict[str, float]):
    item = ev.payload
    totals[ev.topic] = totals.get(ev.topic, 0.0) + item["amount"]
    print(f"[ledger ] {ev.topic:25} item={item['id']} running=\${totals[ev.topic]:.2f}")

# --- Wire it up ---------------------------------------------------------
def build_system(human_decision):
    bus = Bus()
    totals: Dict[str, float] = {}
    bus.subscribe("expense.submitted",        policy_agent)
    bus.subscribe("expense.review_requested", lambda e, b: user_proxy(e, b, human_decision))
    bus.subscribe("expense.approved",         lambda e, b: ledger(e, b, totals))
    bus.subscribe("expense.rejected",         lambda e, b: ledger(e, b, totals))
    return bus, totals

# --- Demo: 5 expense items with mixed outcomes --------------------------
expenses = [
    {"id": "E-001", "amount":   45.10, "category": "meals"},
    {"id": "E-002", "amount":  220.00, "category": "software"},
    {"id": "E-003", "amount": 1850.00, "category": "travel"},     # needs human
    {"id": "E-004", "amount":   30.00, "category": "lottery"},    # auto-reject
    {"id": "E-005", "amount": 4200.00, "category": "travel"},     # needs human
]

human_decisions = {"E-003": "approve", "E-005": "deny"}
bus, totals = build_system(human_decisions)
for i, x in enumerate(expenses):
    bus.publish(Event("expense.submitted", x, causation_id=i + 1))

steps = bus.run(max_steps=100)
print(f"\\nProcessed {len(expenses)} items in {steps} bus cycles, "
      f"{len(bus.log)} total events on the wire.")

# --- Roll-up ------------------------------------------------------------
print("\\nLedger totals by terminal topic:")
for k, v in totals.items():
    print(f"  {k:25}  \${v:,.2f}")

print("\\nAudit trail (topic | id | causation):")
for ev in bus.log:
    print(f"  {ev.topic:28} {ev.payload.get('id'):6}  caused_by={ev.causation_id}")

print("\\nPM takeaway: in regulated industries the human-approval edge "
      "isn't a UX nicety — it is the deployment license. AutoGen's "
      "UserProxyAgent makes it a first-class topology element rather "
      "than an afterthought bolted onto a single-agent loop.")
`,
  },
  interview: { question: 'What are the key differences between AutoGen, CrewAI, and LangGraph?', answer: `LangGraph is best for agentic workflows within the LangChain ecosystem \u2014 graph-based state management, conditional routing, cycles. Most flexible for tool-use loops.<br><br>CrewAI is optimized for role-based crews with structured task delegation. Strongest feature: explicit role/goal/task structure producing consistent outputs on analytical workflows. Less suitable for event-driven systems.<br><br>AutoGen v0.4+ is optimized for enterprise deployments needing human-in-the-loop, Azure integration, and observability. The event-driven Core handles real-time systems CrewAI and LangGraph don\u2019t cover well. UserProxyAgent for human review is the key differentiator for compliance-sensitive deployments. AutoGen now supports Claude via AnthropicClient, so it\u2019s not Azure-only.<br><br>Selection heuristic: LangGraph for flexible agentic tool loops, CrewAI for self-contained analytical crews, AutoGen for enterprise with compliance requirements. Many teams use LangGraph for orchestration calling CrewAI or AutoGen agents as tools.` },
  pmAngle: 'AutoGen\u2019s human-in-the-loop design makes it deployable in regulated industries where fully autonomous AI action creates liability. If building for financial services, healthcare, or legal, AutoGen\u2019s architecture is the right starting point. Know the AutoGen vs Semantic Kernel distinction: AutoGen for multi-agent, SK for single-agent orchestration on Azure.',
  resources: [
    { type: 'DOCS', title: 'AutoGen Documentation', url: 'https://microsoft.github.io/autogen/', note: 'v0.4+ docs. Start with AgentChat quickstart.' },
    { type: 'BLOG', title: 'Magentic-One', url: 'https://www.microsoft.com/en-us/research/blog/magentic-one-a-generalist-multi-agent-system-for-solving-complex-tasks/', note: 'Microsoft\u2019s flagship multi-agent system built on AutoGen.' },
    { type: 'TOOL', title: 'AutoGen Studio', url: 'https://microsoft.github.io/autogen/docs/autogen-studio/getting-started/', note: 'Low-code visual interface. Verify current features at docs.' },
    { type: 'BLOG', title: 'AutoGen v0.4 Architecture', url: 'https://devblogs.microsoft.com/autogen/autogen-reimagined-launching-autogen-0-4/', note: 'The redesign rationale. Core vs AgentChat explained.' },
    { type: 'DOCS', title: 'Building Effective Agents \u2014 Anthropic', url: 'https://www.anthropic.com/research/building-effective-agents', note: 'Apply Anthropic\u2019s agent design principles when building AutoGen workflows.' },
    { type: 'DOCS', title: 'Semantic Kernel', url: 'https://learn.microsoft.com/semantic-kernel/', note: 'Complementary to AutoGen. SK for orchestration, AutoGen for multi-agent.' }
  ]
};
