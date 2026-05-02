// Day 59 \u2014 Capstone Case Study
// Updated: March 2026 | Review: updated model strings, safety as design constraint, written + verbal walkthrough, portfolio-readiness check

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[59] = {
  subtitle: 'Produce the capstone case study that showcases every skill you\u2019ve built \u2014 strategy, technical depth, and safety.',
  context: `<p>The capstone case study is your single most important portfolio artifact. It demonstrates everything: product strategy, technical architecture, safety thinking, regulatory awareness, and the ability to communicate complex ideas clearly. Today you produce a case study that is portfolio-ready and interview-ready \u2014 both as a written document and a 5-minute verbal walkthrough.</p>
  <p><strong>What makes a capstone case study excellent.</strong> The best AI PM case studies share three qualities: (1) <strong>End-to-end thinking</strong> \u2014 from user problem through architecture through safety through launch. A case study that covers only product strategy or only technical architecture shows half a PM. The capstone covers the full loop. (2) <strong>Safety as a product design constraint, not a disclaimer.</strong> This is the key instruction: safety is not an appendix at the end. It\u2019s a design constraint that shapes the architecture, the system prompts, the user experience, and the launch criteria. The best case studies weave safety into every section, not bolt it on at the end. (3) <strong>Specificity</strong> \u2014 specific model choices (claude-sonnet-4-6 for complex reasoning, claude-haiku-4-5-20251001 for high-volume tasks), specific eval metrics, specific regulatory requirements (EU AI Act article numbers), and specific architectural decisions (why MCP over direct function calling, why streaming over batch).</p>
  <p><strong>The case study structure.</strong> Use this six-section structure: (1) <strong>Problem statement</strong> \u2014 who is the user, what\u2019s their pain, and why is AI the right solution? (2) <strong>Product strategy</strong> \u2014 your vision, positioning, target user, and competitive differentiation. (3) <strong>Technical architecture</strong> \u2014 model selection, integration pattern, data flow, and key technical decisions with rationale. Use current model names: claude-sonnet-4-6 for production reasoning, claude-haiku-4-5-20251001 for high-volume/latency-sensitive operations. (4) <strong>Safety framework</strong> \u2014 threat model, defense-in-depth strategy, red-teaming results, and residual risk assessment. Woven into the architecture, not appended. (5) <strong>Eval and measurement</strong> \u2014 how you measure quality, the eval pipeline, hygiene metrics, and OKRs. (6) <strong>Launch and iteration plan</strong> \u2014 phased rollout, monitoring, feedback loops, and iteration cadence.</p>
  <p><strong>The 5-minute verbal walkthrough.</strong> In addition to the written document, prepare a 5-minute verbal walkthrough. This is what you\u2019ll deliver in an interview when asked to \u201cwalk me through a product you\u2019ve designed.\u201d The verbal version is not a reading of the document \u2014 it\u2019s a structured narrative: 30 seconds on the problem (make the interviewer care), 60 seconds on strategy (your insight), 90 seconds on architecture and safety (your technical depth), 60 seconds on measurement (your rigor), and 60 seconds on what you learned (your self-awareness). Practice until you can deliver it in exactly 5 minutes without notes.</p>
  <p><strong>Portfolio-readiness checklist.</strong> Before considering the capstone done, verify: (1) Could a hiring manager understand the case study in 10 minutes? (2) Does the safety section demonstrate genuine frameworks, not performative statements? (3) Are model names current (claude-sonnet-4-6, not deprecated strings)? (4) Does the architecture diagram exist and is it clear? (5) Are eval metrics specific and measurable? (6) Would you be proud to share this in an interview? If any answer is no, revise before marking the capstone complete.</p>`,
  tasks: [
    { title: 'Write the capstone case study', description: 'Choose a product scenario (enterprise customer service AI, AI-powered code review tool, healthcare Q&A system, or your own idea). Write the complete six-section case study: Problem Statement, Product Strategy, Technical Architecture (using claude-sonnet-4-6 and claude-haiku-4-5-20251001), Safety Framework (woven in, not appended), Eval and Measurement, Launch and Iteration Plan. Target: 2,500\u20134,000 words. Safety must be a design constraint in every section. Save as /day-59/capstone_case_study.md.', time: '35 min' },
    { title: 'Prepare the 5-minute verbal walkthrough', description: 'Write bullet-point notes for your 5-minute verbal walkthrough. Structure: 30s problem (make them care), 60s strategy (your insight), 90s architecture + safety (your depth), 60s measurement (your rigor), 60s learnings (your self-awareness). Practice delivering it aloud 3 times. Time yourself. Refine until it\u2019s exactly 5 minutes. Save your speaking notes as /day-59/verbal_walkthrough_notes.md.', time: '20 min' },
    { title: 'Run the portfolio-readiness checklist', description: 'Evaluate your capstone against the six-point checklist: (1) Understandable in 10 minutes? (2) Safety section shows genuine frameworks? (3) Model names current? (4) Architecture diagram exists and is clear? (5) Eval metrics specific and measurable? (6) Proud to share in interview? For any \u201cno\u201d answer, revise the capstone until it passes. Document your checklist results and revisions. Save as /day-59/readiness_checklist.md.', time: '15 min' },
    { title: 'Peer review preparation', description: 'Prepare your capstone for peer review. Write a one-paragraph summary of the case study, list three specific areas where you want feedback, and identify your biggest uncertainty (\u201cI\u2019m not sure whether the architecture section is detailed enough for a technical interviewer\u201d). Share the case study with a peer or colleague and request specific, actionable feedback. Save your review request and self-assessment as /day-59/peer_review_request.md.', time: '10 min' }
  ],

  codeExample: {
    title: 'Capstone Case Study Completeness Checker — Python',
    lang: 'python',
    code: `# Day 59 — Capstone Case Study Completeness Checker
# Verifies a capstone case study covers all 10 required sections, with
# minimum content thresholds. Pure stdlib. Hardcoded sample case study.

REQUIRED_SECTIONS = [
    ("problem",       "User problem and context",                 80),
    ("users",         "Target users and JTBD",                    60),
    ("constraints",   "Regulatory, latency, cost constraints",    60),
    ("architecture",  "Reference architecture w/ named models",   100),
    ("safety",        "Safety design and red-team plan",          80),
    ("evals",         "Eval harness, golden set, gates",          80),
    ("metrics",       "Leading + lagging metrics tied to OKRs",   60),
    ("rollout",       "Phased rollout and kill switches",         60),
    ("results",       "Results: numbers, before/after",           60),
    ("learnings",     "What you'd do differently next time",      60),
]

# Fake but realistic sample case study (would be loaded from disk).
CASE_STUDY = {
    "title": "Atlas Copilot for Mid-Market Banking Relationship Managers",
    "sections": {
        "problem":      "RMs spend 8 hours/week assembling client briefings from 7 systems. The brief misses risk flags 22% of the time. Context: regulated environment, no client data leaves the bank's tenancy.",
        "users":        "Primary: 1,200 relationship managers across 3 regional banks. JTBD: walk into a client meeting fully prepped in under 10 minutes.",
        "constraints":  "EU AI Act high-risk classification. P95 latency under 5s. COGS per RM-day under $0.20. Data residency in EU.",
        "architecture": "claude-sonnet-4-6 via Bedrock for synthesis. claude-haiku-4-5-20251001 for routing. MCP servers fronting core banking, CRM, news. RAG over internal research notes.",
        "safety":       "Quarterly red-team exercise. PII scrubber on all egress. Refusal policy for trade ideas. Runbook for jailbreak detection.",
        "evals":        "180-example golden set across 6 task families. Rubric scoring 1-5. CI gate at rubric_p50 >= 4.2 and red_team_block_rate >= 95%.",
        "metrics":      "Leading: rubric_p50, eval_pass_rate, tool_call_success. Lagging: brief-prep-time, missed-risk rate, weekly active RMs.",
        "rollout":      "Pilot 1 bank, 50 RMs, 4 weeks. Expand to 3 banks at month 3. Full rollout month 6. Feature-flag kill switch per bank.",
        "results":      "Brief prep cut from 8h to 2.5h (-69%). Missed-risk rate down to 6%. WAU = 78%. CSAT 4.5.",
        "learnings":    "Underinvested in observability week 1. Should have started with the eval harness, not the prompts. Multi-turn evals matter more than single-turn.",
        # 'glossary' is extra — the checker should ignore it.
        "glossary":     "RM = Relationship Manager. JTBD = Jobs To Be Done.",
    },
}

def word_count(text):
    return len(text.split())

def section_status(case_study, key, label, min_words):
    text = case_study["sections"].get(key, "")
    n = word_count(text)
    present = bool(text.strip())
    meets_min = n >= min_words
    return {
        "key": key, "label": label, "min": min_words,
        "present": present, "words": n, "meets_min": meets_min,
    }

def check(case_study):
    return [section_status(case_study, k, l, m) for k, l, m in REQUIRED_SECTIONS]

def overall_grade(rows):
    passed = sum(1 for r in rows if r["meets_min"])
    return passed, len(rows), passed / len(rows)

def grade(pct):
    if pct >= 0.95: return "A"
    if pct >= 0.85: return "B"
    if pct >= 0.70: return "C"
    return "F"  # capstone bar is high

def print_table(rows):
    print(f"{'KEY':14} {'WORDS':>6}/{'MIN':<5} STATUS  LABEL")
    print("-" * 70)
    for r in rows:
        if not r["present"]:
            mark = "MISSING"
        elif not r["meets_min"]:
            mark = "THIN   "
        else:
            mark = "OK     "
        print(f"{r['key']:14} {r['words']:6}/{r['min']:<5} {mark} {r['label']}")

def actionable_fixes(rows):
    fixes = []
    for r in rows:
        if not r["present"]:
            fixes.append(f"Add the '{r['key']}' section ({r['label']}). Min {r['min']} words.")
        elif not r["meets_min"]:
            need = r["min"] - r["words"]
            fixes.append(f"Expand '{r['key']}' by ~{need} words to clear the bar.")
    return fixes

def main():
    print("CAPSTONE COMPLETENESS CHECKER")
    print("=" * 70)
    print("Title: " + CASE_STUDY["title"])
    print()
    rows = check(CASE_STUDY)
    print_table(rows)
    passed, total, pct = overall_grade(rows)
    print()
    print(f"Sections passing: {passed}/{total}  ({pct:.0%})  GRADE: {grade(pct)}")
    print()
    fixes = actionable_fixes(rows)
    if not fixes:
        print("Ready for peer review. Schedule the 5-minute walkthrough.")
    else:
        print("Required fixes before peer review:")
        for f in fixes:
            print("  - " + f)
    print()
    print("Reminder: every section must reference numbers, models, or sources.")
    print("A capstone without specifics reads like an essay, not a case study.")

if __name__ == "__main__":
    main()
`,
  },

  interview: { question: 'Walk me through a product you\u2019ve designed from problem to launch.', answer: `I\u2019ll walk through an AI-powered customer service system I designed using Claude.<br><br><strong>The problem (30 seconds):</strong> Enterprise support teams handle 10,000+ tickets monthly. 60% are repetitive questions with known answers. Agents spend time on lookup and copy-paste instead of complex problem-solving. The cost is $45 per agent-handled ticket. The opportunity: AI handles the repetitive 60%, reducing cost to $2 per ticket while agents focus on the complex 40%.<br><br><strong>Strategy (60 seconds):</strong> Not a chatbot that replaces agents \u2014 an AI assistant that handles tier-1 tickets autonomously and escalates intelligently. Differentiated by: safety-first design (every response auditable), progressive trust (start with draft responses for agent approval, then graduate to autonomous for validated categories), and enterprise compliance (EU AI Act compliant from day one).<br><br><strong>Architecture and safety (90 seconds):</strong> claude-sonnet-4-6 for complex multi-step tickets, claude-haiku-4-5-20251001 for high-volume classification and routing. MCP servers connect Claude to the knowledge base, ticketing system, and customer data. Safety is a design constraint: system prompt restricts Claude to knowledge-base-sourced answers only (no hallucinated solutions), output validation checks every response against the knowledge base before sending, and sensitive categories (billing disputes, account security) always escalate to humans. Red-teaming with Garak covers prompt injection via ticket content. Residual risk: novel queries outside the knowledge base \u2014 mitigated by confidence scoring and automatic escalation below threshold.<br><br><strong>Measurement (60 seconds):</strong> Hygiene: response accuracy stays above 95% (eval suite of 500 real tickets). OKRs: autonomous resolution rate from 0% to 40% in Q1, customer satisfaction maintained above baseline, cost per ticket reduced by 50%. Weekly health review monitors quality, cost, safety, and escalation patterns.<br><br><strong>What I learned (60 seconds):</strong> Safety as a design constraint, not a disclaimer, produced a better product. The escalation logic and confidence thresholds were the hardest design decisions \u2014 too aggressive and you get safety failures, too conservative and you never achieve autonomous handling. Baseline discovery in the first month was essential for setting credible OKR targets.` },
  pmAngle: 'The capstone case study is where all 59 days converge. It\u2019s the artifact that proves you can think end-to-end: from user problem through architecture through safety through measurement. A case study where safety is woven in as a design constraint, not bolted on as a disclaimer, is the one that gets you hired at companies that take AI seriously.',
  resources: [
    { type: 'DOCS', title: 'Claude API Documentation', url: 'https://docs.anthropic.com/en/docs', note: 'Reference for technical architecture section.' },
    { type: 'DOCS', title: 'Anthropic API Pricing', url: 'https://www.anthropic.com/pricing', note: 'Model pricing for cost analysis in the case study.' },
    { type: 'BLOG', title: 'Anthropic: Building Effective Agents', url: 'https://www.anthropic.com/research/building-effective-agents', note: 'Agent patterns for the architecture section.' },
    { type: 'DOCS', title: 'MCP Specification', url: 'https://modelcontextprotocol.io/', note: 'Protocol reference for tool integration architecture.' },
    { type: 'DOCS', title: 'EU AI Act', url: 'https://artificialintelligenceact.eu/', note: 'Regulatory reference for the compliance section.' }
  ]
};
