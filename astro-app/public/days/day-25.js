// Day 25 — Computer Use Agents
// Updated: March 2026 | Review: GA status, OpenAI Operator comparison, UI-TARS, pricing

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[25] = {
  subtitle: 'AI that sees and interacts with any software \u2014 now GA, with competitive dynamics every PM must know.',
  context: `<p><strong>Computer use agents</strong> can see screenshots of any software interface and interact using mouse clicks, keyboard input, and scroll actions. This is now production-ready: <strong>Anthropic\u2019s computer use exited beta and is in general availability</strong> via the API. Computer use agents solve the most common enterprise automation problem: 70% of enterprise software has no API. Forms, legacy systems, and internal tools that can only be operated through a GUI are now automatable.</p>
  <p>The competitive landscape has matured: <strong>OpenAI Operator</strong> (launched January 2025) is the direct competitor \u2014 but with a different approach. Anthropic\u2019s computer use is API-first (a developer primitive you build products on), while Operator is consumer-facing (a product that controls a browser for end users). <strong>Google Project Jarvis</strong> is in limited availability. <strong>UI-TARS</strong> (ByteDance, 2025) is a specialized GUI interaction model outperforming general-purpose models on interface tasks. This competitive landscape is interview-ready knowledge for Anthropic PM candidates.</p>
  <p><strong>"Computer use is the automation option of last resort"</strong> remains the correct framing. If an API exists, use it \u2014 APIs are faster, cheaper, more reliable, and more secure. Computer use is for the systems where no API exists and the business value of automation justifies the complexity. The evaluation framework: task completion rate, steps vs optimal, error recovery rate, and session duration.</p>
  <p><strong>Pricing matters for product design.</strong> Computer use incurs image token costs for each screenshot (approximately 1,000-2,000 tokens per screenshot depending on resolution). For updated pricing details, see <a href="https://www.anthropic.com/pricing">anthropic.com/pricing</a>. A PM designing a computer use product needs to model these costs: at 1,000 executions/day, that\u2019s $50-100/day in screenshot tokens alone.</p>
  <p><strong>Safety is non-negotiable.</strong> Computer use agents need: minimum-necessary access (don\u2019t give the agent admin access for a read-only task), isolated environments (sandbox or VM), explicit human approval before irreversible actions, comprehensive audit logging, and time-bounded sessions. Design the safety model before the product, not after.</p>`,
  tasks: [
    { title: 'Identify 3 legacy automation opportunities', description: 'Find 3 workflows at a company where: (a) there\u2019s no API, (b) it\u2019s currently manual GUI work, (c) the business value of automation is clear. For each: describe the workflow, estimate time saved, and assess whether computer use is the right approach vs API. Save as /day-25/legacy_automation_opportunities.md.', time: '20 min' },
    { title: 'Design safety model for HR onboarding', description: 'An HR team wants to automate new employee system setup (create accounts in 5 internal tools). Design the safety model: what permissions does the agent need, what environment does it run in, when does it ask for human approval, what\u2019s logged, and what\u2019s the rollback plan? Save as /day-25/safety_model_design.md.', time: '25 min' },
    { title: 'Computer use vs API integration framework', description: 'Write a decision framework: when to use computer use vs building an API integration. Consider: reliability, cost, security, maintenance, speed. Include a "hybrid" option where computer use handles the UI parts and API handles the data parts. Save as /day-25/computer_use_vs_api.md.', time: '20 min' },
    { title: 'Operator vs Claude computer use comparison', description: 'Compare Anthropic computer use and OpenAI Operator on: API-first vs consumer product, pricing model, safety controls, enterprise support, and developer experience. Which approach wins for enterprise? Which for consumer? Save as /day-25/operator_vs_claude_comparison.md.', time: '15 min' },
  ],

  codeExample: {
    title: 'Computer Use action-log analyzer — Python',
    lang: 'python',
    code: `# Day 25 — Computer Use Action-Log Analyzer + Safety Gate
#
# Anthropic's computer use lets a model click, type, and scroll on a real
# OS. It's powerful and risky — the PM job is to design a SAFETY MODEL
# that gates irreversible actions. This script ingests a synthetic action
# log, classifies each step, blocks anything that violates policy, and
# produces an audit summary. No screenshots, no real automation — just the
# control-plane logic you would build around the API.

from collections import Counter
from dataclasses import dataclass, field
from typing import List
import re

@dataclass
class Action:
    step: int
    tool: str            # screenshot | mouse | keyboard | bash
    detail: str          # e.g. "click(x=812, y=440)" or "type('hello')"
    target_app: str

@dataclass
class Decision:
    step: int
    verdict: str         # ALLOW | REQUIRE_HUMAN | BLOCK
    reasons: List[str] = field(default_factory=list)

# --- Policy ------------------------------------------------------------
IRREVERSIBLE_KEYWORDS = [
    "delete", "drop table", "rm -rf", "format", "wire",
    "transfer", "send invoice", "publish", "submit ach",
]
SENSITIVE_APPS = {"banking", "payroll", "production-db-console"}
ALLOWED_BASH = re.compile(r"^(ls|cat|head|tail|grep|wc)\\b")

def classify(a: Action) -> Decision:
    d = Decision(step=a.step, verdict="ALLOW")
    text = a.detail.lower()

    # Rule 1: irreversible verbs anywhere in the action text -> BLOCK.
    for kw in IRREVERSIBLE_KEYWORDS:
        if kw in text:
            d.verdict = "BLOCK"
            d.reasons.append(f"irreversible keyword '{kw}'")
            return d

    # Rule 2: any action targeting a sensitive app needs a human.
    if a.target_app in SENSITIVE_APPS:
        d.verdict = "REQUIRE_HUMAN"
        d.reasons.append(f"sensitive app '{a.target_app}' — needs approval")

    # Rule 3: bash tool restricted to a safe read-only allowlist.
    if a.tool == "bash" and not ALLOWED_BASH.match(a.detail.strip()):
        d.verdict = "BLOCK"
        d.reasons.append("bash command outside read-only allowlist")

    # Rule 4: rapid-fire mouse clicks indicate a stuck loop.
    return d

def detect_loops(actions: List[Action], window: int = 6) -> List[int]:
    """Flag indices where the last \`window\` actions are identical."""
    flags = []
    for i in range(window, len(actions) + 1):
        chunk = actions[i - window:i]
        if len({(a.tool, a.detail, a.target_app) for a in chunk}) == 1:
            flags.append(actions[i - 1].step)
    return flags

# --- Synthetic trace ----------------------------------------------------
trace: List[Action] = [
    Action(1, "screenshot", "capture()",                          "browser"),
    Action(2, "mouse",      "click(x=120, y=240)",                "browser"),
    Action(3, "keyboard",   "type('Q3 onboarding checklist')",    "browser"),
    Action(4, "screenshot", "capture()",                          "browser"),
    Action(5, "bash",       "ls /tmp/onboarding",                 "shell"),
    Action(6, "bash",       "cat /tmp/onboarding/README",         "shell"),
    Action(7, "mouse",      "click(x=812, y=440)",                "payroll"),
    Action(8, "keyboard",   "type('Submit ACH for vendor 481')",  "payroll"),
    Action(9, "bash",       "rm -rf /var/log/onboarding",         "shell"),
    Action(10, "mouse",     "click(x=812, y=440)",                "browser"),
    Action(11, "mouse",     "click(x=812, y=440)",                "browser"),
    Action(12, "mouse",     "click(x=812, y=440)",                "browser"),
    Action(13, "mouse",     "click(x=812, y=440)",                "browser"),
    Action(14, "mouse",     "click(x=812, y=440)",                "browser"),
    Action(15, "mouse",     "click(x=812, y=440)",                "browser"),
]

# --- Apply policy --------------------------------------------------------
decisions = [classify(a) for a in trace]
loop_steps = detect_loops(trace)

print("Per-action verdicts:")
print(f"{'step':>4} {'tool':10} {'verdict':14} target/app    detail")
for a, d in zip(trace, decisions):
    print(f"{a.step:>4} {a.tool:10} {d.verdict:14} {a.target_app:13} {a.detail}")

# --- Roll-up -----------------------------------------------------------
counts = Counter(d.verdict for d in decisions)
print("\\nVerdict counts:")
for v, n in counts.items():
    print(f"  {v:14} {n}")

if loop_steps:
    print(f"\\nLoop detection: identical action repeated through step(s) {loop_steps}")
    print("  -> recommend halt + human review (model is stuck).")

blocks = [(a.step, d.reasons) for a, d in zip(trace, decisions) if d.verdict == "BLOCK"]
if blocks:
    print("\\nBlocked actions (would NOT execute):")
    for step, reasons in blocks:
        print(f"  step {step}: {'; '.join(reasons)}")

# --- Cost & viability comment ------------------------------------------
screenshot_tokens_each = 1568   # claude-sonnet-4-6 image token estimate
total_screenshots = sum(1 for a in trace if a.tool == "screenshot")
print(f"\\nScreenshots: {total_screenshots}  (~{total_screenshots * screenshot_tokens_each} input tokens)")

print("\\nPM takeaway: computer use is the automation option of last resort. "
      "If an API exists, use it. If you must use computer use, BLOCK "
      "irreversible verbs, REQUIRE_HUMAN on sensitive apps, allowlist "
      "bash, and detect loops. That control plane is your safety story "
      "to a CISO — and the difference between a demo and a deployment.")
`,
  },
  interview: { question: 'When would you use computer use agents vs building a proper API integration?', answer: `Computer use is the right choice when: (1) no API exists for the target system, (2) the business value justifies the cost and complexity, (3) the workflow is well-defined enough to be reliable at >90% success rate, and (4) safety controls can be implemented (sandboxed environment, human approval for irreversible actions, audit logging).<br><br>API integration wins on: reliability (99.9% vs ~90-95% for computer use), speed (milliseconds vs seconds per step), cost (no screenshot tokens), security (authenticated API vs screen scraping), and maintainability (API contracts vs UI changes breaking automation).<br><br>The hybrid pattern is often the best answer: use the API for data operations and computer use only for the UI-exclusive parts that have no API. This minimizes the fragile screen-interaction surface area.<br><br>The competitive landscape matters: Anthropic\u2019s computer use is API-first, designed for developers to build automation products. OpenAI\u2019s Operator is consumer-facing \u2014 a product, not a primitive. For enterprise automation, Anthropic\u2019s API approach is more appropriate because the customer controls the agent, the environment, and the safety model. Know this distinction for Anthropic interviews.` },
  pmAngle: 'Computer use is powerful, but it\u2019s the automation option of last resort. APIs are always better when they exist. The PM skill is knowing when computer use is the right tool and designing the safety model that makes it enterprise-deployable. And know the competitive landscape: Anthropic (API-first) vs OpenAI Operator (consumer product) is a strategic positioning conversation you\u2019ll have in interviews.',
  resources: [
    { type: 'DOCS', title: 'Claude Computer Use', url: 'https://docs.anthropic.com/en/docs/build-with-claude/computer-use', note: 'Now GA. API reference and safety guidelines.' },
    { type: 'BLOG', title: 'OpenAI Operator', url: 'https://openai.com/index/introducing-operator/', note: 'Consumer-facing computer use. Compare approach to Anthropic\u2019s API-first.' },
    { type: 'TOOL', title: 'WebArena Benchmark', url: 'https://webarena.dev/', note: 'Leading benchmark for web agent evaluation. Know for competitive context.' },
    { type: 'BLOG', title: 'Anthropic Computer Use Announcement', url: 'https://www.anthropic.com/news/developing-computer-use', note: 'Original announcement and design philosophy.' },
    { type: 'PRICING', title: 'Anthropic Pricing', url: 'https://www.anthropic.com/pricing', note: 'Computer use incurs image token costs. Model these for product economics.' },
    { type: 'DOCS', title: 'Building Effective Agents \u2014 Anthropic', url: 'https://www.anthropic.com/research/building-effective-agents', note: 'Safety patterns for agentic systems including computer use.' }
  ]
};
