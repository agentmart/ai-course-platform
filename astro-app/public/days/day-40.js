// Day 40 — Mock Interview Sprint
// Updated: March 2026 | Review: Phase 2 mock topics, Anthropic-specific prep, updated platform recommendations

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[40] = {
  subtitle: 'Simulate the full AI PM interview loop \u2014 pressure-test every skill.',
  context: `<p>Day 40 is a mock interview sprint. By now you\u2019ve built the strategic toolkit (Days 21\u201330) and refined the analytical skills (Days 31\u201339). Today you pressure-test everything under timed conditions. The format: four mock interviews covering the four question types that dominate AI PM interview loops at frontier labs and AI-native companies in 2026.</p>
  <p><strong>Phase 2-specific mock topics</strong> draw from the strategic and analytical skills built in this phase. <strong>Multi-agent design:</strong> \u201cDesign a multi-agent system for automated financial compliance review. How do agents coordinate? What happens when they disagree?\u201d This tests your understanding of agent architectures, inter-agent protocols (MCP for tool access, A2A for agent communication), and failure mode thinking from Day 25\u201326 material. <strong>A2A vs MCP:</strong> \u201cWhen would you use A2A versus MCP for inter-service communication in an AI product?\u201d This tests protocol understanding from Days 25\u201326 \u2014 MCP connects agents to tools/data, A2A connects agents to other agents. <strong>RAG architecture:</strong> \u201cDesign the retrieval architecture for an enterprise knowledge base serving 10,000 employees.\u201d Tests Days 21\u201324 material on document intelligence, embedding strategies, and permission-aware retrieval.</p>
  <p><strong>Anthropic-specific interview preparation.</strong> Anthropic interviews emphasize three areas beyond standard PM questions: (1) <strong>AI safety reasoning</strong> \u2014 expect scenarios about capability vs safety tradeoffs, responsible deployment in high-stakes domains, and alignment with Anthropic\u2019s responsible scaling policy. (2) <strong>Technical depth</strong> \u2014 Anthropic expects PMs to understand Claude\u2019s architecture at a level sufficient to make informed product decisions. Know extended thinking, tool use, the Messages API, and system prompt design. (3) <strong>Mission alignment</strong> \u2014 \u201cWhy Anthropic specifically?\u201d needs a genuine answer about safety-first AI development, not a generic \u201cI love AI\u201d response. Research the responsible scaling policy, RLHF methodology, and constitutional AI before interviewing.</p>
  <p><strong>Mock interview platforms (2026 recommendations):</strong> <a href="https://www.tryexponent.com/" target="_blank">Exponent</a> offers structured AI PM interview questions with video answers from industry PMs \u2014 best for solo practice. <a href="https://interviewing.io/" target="_blank">Interviewing.io</a> provides anonymous practice interviews with engineers at top companies \u2014 best for live practice with feedback. For peer practice: find an AI PM study group (Lenny\u2019s Slack, AI PM communities on Discord) and do weekly mock sessions. The combination of solo practice (Exponent) plus live practice (Interviewing.io or peer) is the most effective preparation approach.</p>`,
  tasks: [
    { title: 'Mock 1: Product design (30 min)', description: 'Set a timer. Answer this prompt as if in a live interview: \u201cDesign an AI agent that automates insurance claims processing. Walk me through the user experience, agent architecture, model selection, evaluation methodology, and launch plan.\u201d Write your answer in 20 minutes, then spend 10 minutes self-critiquing: what did you miss? Did you address failure modes and human-in-the-loop? Save as /day-40/mock1_product_design.md.', time: '30 min' },
    { title: 'Mock 2: Technical depth (25 min)', description: 'Set a timer. Answer: \u201cYour RAG system for legal document search has a 15% hallucination rate on complex multi-clause questions. Walk me through how you would diagnose the root cause, propose solutions, and measure improvement.\u201d Cover: chunking strategy, retrieval quality, prompt engineering, evaluation pipeline, and when to escalate to human review. Save as /day-40/mock2_technical_depth.md.', time: '25 min' },
    { title: 'Mock 3: Strategy and competitive (20 min)', description: 'Set a timer. Answer: \u201cYou\u2019re the PM for an AI customer support product. OpenAI just launched a competing feature built into ChatGPT. Your CEO asks for a response strategy by end of day. What do you recommend?\u201d Address: immediate competitive response, defensibility assessment, customer communication, and 90-day strategic plan. Save as /day-40/mock3_strategy.md.', time: '20 min' },
    { title: 'Mock 4: Anthropic-specific safety (20 min)', description: 'Set a timer. Answer: \u201cYou\u2019re a PM at Anthropic. A customer wants to use Claude for automated hiring decisions. Walk me through your framework for deciding whether to support this use case, what safeguards you\u2019d require, and how you\u2019d communicate the decision internally and externally.\u201d This is the Anthropic-specific safety question format. Save as /day-40/mock4_safety_anthropic.md. Stage and commit all Day 40 work and celebrate completing Phase 2.', time: '20 min' }
  ],

  codeExample: {
    title: 'AI PM interview loop scoring simulator — Python',
    lang: 'python',
    code: `# Day 40 — AI PM Interview Loop Simulator
# Score four mock-interview rounds with role-specific weights.
# Mirrors how real loops are calibrated: each interviewer cares about different things.

# Each role weights the four competencies differently.
# Competencies: product_design, technical_depth, strategy, safety_judgment
ROLE_WEIGHTS = {
    "PM Lead":      {"product_design": 0.40, "technical_depth": 0.20,
                     "strategy": 0.30, "safety_judgment": 0.10},
    "Eng Manager":  {"product_design": 0.20, "technical_depth": 0.50,
                     "strategy": 0.10, "safety_judgment": 0.20},
    "Design Lead":  {"product_design": 0.55, "technical_depth": 0.10,
                     "strategy": 0.25, "safety_judgment": 0.10},
    "Exec (VP)":    {"product_design": 0.20, "technical_depth": 0.10,
                     "strategy": 0.45, "safety_judgment": 0.25},
}

# Candidate's raw scores per competency (1-5) from each mock interview.
LOOP = [
    {"round": "Mock 1 — Product design",      "interviewer": "Design Lead",
     "scores": {"product_design": 4, "technical_depth": 3,
                "strategy": 4, "safety_judgment": 3}},
    {"round": "Mock 2 — Technical depth",     "interviewer": "Eng Manager",
     "scores": {"product_design": 3, "technical_depth": 4,
                "strategy": 3, "safety_judgment": 4}},
    {"round": "Mock 3 — Strategy",            "interviewer": "PM Lead",
     "scores": {"product_design": 4, "technical_depth": 3,
                "strategy": 5, "safety_judgment": 3}},
    {"round": "Mock 4 — Anthropic safety",    "interviewer": "Exec (VP)",
     "scores": {"product_design": 3, "technical_depth": 4,
                "strategy": 4, "safety_judgment": 5}},
]

HIRE_BAR = 3.5  # weighted avg per round needed for "leaning hire"


def round_score(round_data):
    weights = ROLE_WEIGHTS[round_data["interviewer"]]
    weighted = sum(round_data["scores"][k] * w for k, w in weights.items())
    return weighted


def signal(weighted):
    if weighted >= 4.3:
        return "Strong Hire"
    if weighted >= HIRE_BAR:
        return "Hire"
    if weighted >= 2.8:
        return "Mixed — needs follow-up"
    return "No Hire"


def weakness_finder(scores):
    # Returns the lowest-scoring competency to coach next.
    lo = min(scores.items(), key=lambda kv: kv[1])
    return lo


def main():
    print("=" * 64)
    print("AI PM Mock Interview Loop — Day 40")
    print("=" * 64)
    totals = {}
    weighted_loop = 0.0
    for r in LOOP:
        w = round_score(r)
        sig = signal(w)
        weak = weakness_finder(r["scores"])
        weighted_loop += w
        print()
        print("{}  ({})".format(r["round"], r["interviewer"]))
        print("  Raw:        " + ", ".join("{}={}".format(k, v) for k, v in r["scores"].items()))
        print("  Weighted:   {:.2f} / 5   ->  {}".format(w, sig))
        print("  Coach next: {} (currently {}/5)".format(weak[0], weak[1]))
        for comp, val in r["scores"].items():
            totals[comp] = totals.get(comp, 0) + val

    avg_loop = weighted_loop / len(LOOP)
    print()
    print("-" * 64)
    print("Loop summary")
    print("-" * 64)
    print("Weighted average across loop: {:.2f} / 5".format(avg_loop))
    print("Loop-level signal:            {}".format(signal(avg_loop)))

    print()
    print("Competency totals (sum across all 4 rounds):")
    for comp, total in sorted(totals.items(), key=lambda kv: kv[1]):
        print("  {:<18} {}/20".format(comp, total))

    weakest = min(totals.items(), key=lambda kv: kv[1])
    strongest = max(totals.items(), key=lambda kv: kv[1])
    print()
    print("Strongest area:  {} ({}/20)".format(strongest[0], strongest[1]))
    print("Weakest area:    {} ({}/20)  <- prioritize for next 5 mocks".format(
        weakest[0], weakest[1]))

    print()
    print("Lesson: 10 mocks > 10 articles. Loops are won on weakest dimension.")


if __name__ == "__main__":
    main()
`,
  },

  interview: { question: 'What\u2019s your preparation process for an AI PM interview at a frontier lab?', answer: `My preparation has three pillars: knowledge, practice, and company-specific research.<br><br><strong>Knowledge foundation (ongoing):</strong> Stay current with Artificial Analysis for model benchmarks, Latent Space for industry analysis, and hands-on experimentation with new models within 48 hours of release. The interviewer expects you to know the current landscape: which models lead on which benchmarks, current pricing, and recent capability jumps. Being 2 weeks out of date is noticeable.<br><br><strong>Structured practice (2\u20144 weeks before):</strong> I use Exponent for solo practice with AI PM-specific questions \u2014 their video answers calibrate quality expectations. Then Interviewing.io for live practice with feedback, focusing on thinking out loud and structuring answers. I do 2\u20133 mock interviews per week in the final two weeks, specifically practicing: multi-agent design questions, RAG architecture questions, and the \u201cdesign an AI agent for X\u201d format that\u2019s now standard.<br><br><strong>Company-specific research (1 week before):</strong> For Anthropic: read the responsible scaling policy end-to-end, understand constitutional AI methodology, review recent research publications, and prepare a genuine answer for \u201cwhy safety-first AI development matters to you.\u201d For other companies: understand their model strategy, their competitive position, and their product philosophy. Use their product hands-on.<br><br><strong>Day-of mindset:</strong> Structure every answer. I use \u201csituation, approach, tradeoffs, metrics\u201d for product design questions and \u201cdefine, decompose, design, defend\u201d for system design questions. Always acknowledge tradeoffs explicitly \u2014 the interviewer wants to see judgment, not just knowledge. And always discuss how you\u2019d measure success, because AI PM interviews disproportionately weight evaluation methodology.` },
  pmAngle: 'Mock interviews under timed pressure reveal the gap between knowing concepts and articulating them fluently. The candidate who practices 10 mock interviews outperforms the one who reads 10 more articles. Phase 2 has given you the strategic depth \u2014 multi-agent design, competitive analysis, pricing strategy, safety frameworks. Today you pressure-test whether you can deliver that depth in a 30-minute interview under time pressure.',
  resources: [
    { type: 'TOOL', title: 'Exponent \u2014 AI PM Interview Prep', url: 'https://www.tryexponent.com/', note: 'Structured AI PM practice questions with video answers. Best for solo prep.' },
    { type: 'TOOL', title: 'Interviewing.io', url: 'https://interviewing.io/', note: 'Anonymous live practice interviews with engineers at top companies.' },
    { type: 'DOCS', title: 'Anthropic Responsible Scaling Policy', url: 'https://www.anthropic.com/index/anthropics-responsible-scaling-policy', note: 'Required reading before any Anthropic interview.' },
    { type: 'DOCS', title: 'Anthropic Research', url: 'https://www.anthropic.com/research', note: 'Recent research publications. Know the latest 2\u20133 papers.' },
    { type: 'BLOG', title: 'Latent Space', url: 'https://www.latent.space/', note: 'Stay current with AI industry developments for interview prep.' },
    { type: 'BLOG', title: 'Lenny\u2019s Newsletter', url: 'https://www.lennysnewsletter.com/', note: 'Product management perspectives relevant to PM interview prep.' }
  ]
};
