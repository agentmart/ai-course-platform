// Day 60 \u2014 Retrospective & Launch
// Updated: March 2026 | Review: 30/60/90-day action plan, apply today urgency, submit one application, GitHub repo final review

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[60] = {
  subtitle: 'Close the course, lock in your gains, and launch your AI PM career \u2014 starting today.',
  context: `<p>Day 60 is not an ending \u2014 it\u2019s a launch. Everything you\u2019ve built over the past 60 days is a foundation, and foundations only matter if you build on them. Today you conduct a retrospective, polish your final deliverables, and most importantly, take the first concrete step in your AI PM career. <strong>Apply today while the course is fresh</strong> \u2014 this is the most important sentence in the entire course.</p>
  <p><strong>The 30/60/90-day post-course action plan.</strong> The biggest risk after completing a course is inertia \u2014 you feel accomplished, you rest, and momentum dies. The 30/60/90-day plan prevents this: <strong>Days 1\u201330 (Applications):</strong> Submit 10 targeted applications to AI PM roles. \u201cTargeted\u201d means: you\u2019ve customized your resume for each role, you\u2019ve included your GitHub portfolio link, and you\u2019ve written a cover letter that references something specific about the company\u2019s AI product. Spray-and-pray applications are a waste of time. Apply to a mix: 3 frontier labs (Anthropic, OpenAI, etc.), 3 AI-native startups, and 4 established companies with AI teams. <strong>Days 31\u201360 (Networking):</strong> Attend 4 AI PM meetups or virtual events. Have 8 informational conversations with people at target companies. Post 2 LinkedIn articles about AI product management (repurpose your best course artifacts). Join Lenny\u2019s Slack community and participate actively. Networking is not schmoozing \u2014 it\u2019s learning about roles and companies so you can be more effective in interviews. <strong>Days 61\u201390 (Open-source + Content):</strong> Contribute to one open-source AI project (Anthropic Cookbook, an MCP server, or a tool like Garak). Write one blog post about an AI PM topic you understand deeply. These create inbound signal: people find your work and come to you.</p>
  <p><strong>\u201cSubmit one application today.\u201d</strong> Not tomorrow. Not after you polish your portfolio one more time. Today. The realistic timeline for an AI PM job search is 2\u20134 months from first application to accepted offer. That timeline starts when you apply, not when you feel ready. Every day you delay is a day added to that timeline. Your portfolio is strong enough now. Your knowledge is fresh now. Apply today. The application you submit today with a 90% ready portfolio is worth more than the application you submit in three weeks with a 95% ready portfolio, because the first application starts the pipeline and teaches you what interviewers actually ask.</p>
  <p><strong>GitHub repo final review.</strong> Before you consider the course complete, your GitHub repository needs a final review: (1) <strong>README.md</strong> \u2014 is your positioning statement clear? Are your top 5 artifacts linked with context? Can a hiring manager understand your skill set in 3 minutes? (2) <strong>Model names</strong> \u2014 search the entire repo for deprecated model strings. Everything should use claude-sonnet-4-6, claude-haiku-4-5-20251001, or claude-opus-4-6. No deprecated model names anywhere. (3) <strong>Broken links</strong> \u2014 click every link in your portfolio. Fix or remove any that are broken. (4) <strong>Quality bar</strong> \u2014 read your top 5 artifacts with fresh eyes. Would you share each one in an interview without hedging? If not, revise. (5) <strong>Commit history</strong> \u2014 clean up messy commit messages if needed. The commit history is part of the portfolio for technical evaluators.</p>
  <p><strong>The retrospective.</strong> Before launching, reflect on three questions: (1) What was the most valuable thing you learned? Not the most interesting \u2014 the most valuable. The thing that will most impact your effectiveness as an AI PM. (2) What surprised you? What belief or assumption did you hold at the start that the course changed? (3) What do you still need to learn? Honest self-assessment of remaining gaps drives continued growth. Write these down. The retrospective is the last artifact you add to your portfolio \u2014 it demonstrates reflective thinking, which is the meta-skill that separates exceptional PMs from competent ones.</p>`,
  tasks: [
    { title: 'Write your 30/60/90-day action plan', description: 'Create a specific, actionable 30/60/90-day plan. Days 1\u201330: list 10 specific companies to apply to (3 frontier labs, 3 AI startups, 4 established companies with AI teams). For each: company name, target role, why you\u2019re a fit, and the application deadline you\u2019re setting yourself. Days 31\u201360: list 4 specific events to attend, 8 people to reach out to, 2 article topics. Days 61\u201390: identify one open-source project to contribute to, one blog post topic, and one ongoing learning goal. Save as /day-60/action_plan_30_60_90.md.', time: '25 min' },
    { title: 'Submit one application today', description: 'Choose the most compelling role from your list and submit a real application right now. Customize your resume, include your GitHub portfolio link (ai-pm-60days), and write a cover letter that references something specific about the company\u2019s AI product. This is the single most important task in the entire course. A submitted application starts a 2\u20134 month pipeline. Every day you delay adds a day to your timeline. Document which role you applied to and what you included. Save as /day-60/first_application.md.', time: '25 min' },
    { title: 'GitHub repo final review and README update', description: 'Conduct the five-point GitHub final review: (1) README.md clarity and positioning. (2) Search for deprecated model names and replace with current ones (claude-sonnet-4-6, claude-haiku-4-5-20251001, claude-opus-4-6). (3) Check all links. (4) Re-read top 5 artifacts for quality. (5) Clean up commit messages. Make all necessary fixes, commit the changes, and push. Document your review findings and fixes. Save as /day-60/github_final_review.md.', time: '20 min' },
    { title: 'Write your course retrospective', description: 'Answer three questions honestly and thoroughly: (1) What was the most valuable thing you learned? (2) What surprised you or changed a belief you held? (3) What do you still need to learn? Write 2\u20133 paragraphs for each question. This retrospective is your final portfolio artifact \u2014 add it to your GitHub repo. It demonstrates reflective thinking, which interviewers value highly. Save as /day-60/course_retrospective.md.', time: '15 min' }
  ],

  codeExample: {
    title: 'AI PM Career Launch Tracker — Python',
    lang: 'python',
    code: `# Day 60 — Career Launch Checklist + Momentum Score
# Tracks 30/60/90 launch tasks and computes a momentum score so the day-60
# graduate keeps shipping. Pure stdlib. Hardcoded sample state.

# Each task: id, horizon, weight (impact on momentum), default state.
TASKS = [
    {"id": "T01", "horizon": 30, "weight": 5, "label": "GitHub portfolio repo public with README"},
    {"id": "T02", "horizon": 30, "weight": 5, "label": "5 polished portfolio artifacts committed"},
    {"id": "T03", "horizon": 30, "weight": 5, "label": "LinkedIn updated with AI PM positioning"},
    {"id": "T04", "horizon": 30, "weight": 4, "label": "Resume v2 with AI PM accomplishments"},
    {"id": "T05", "horizon": 30, "weight": 5, "label": "First job application submitted"},
    {"id": "T06", "horizon": 30, "weight": 4, "label": "10 target companies + roles list built"},
    {"id": "T07", "horizon": 30, "weight": 3, "label": "1 informational chat scheduled"},
    {"id": "T08", "horizon": 60, "weight": 4, "label": "5 applications/week cadence sustained"},
    {"id": "T09", "horizon": 60, "weight": 4, "label": "1 mock interview completed"},
    {"id": "T10", "horizon": 60, "weight": 3, "label": "Public writeup of 1 portfolio piece (blog/X)"},
    {"id": "T11", "horizon": 60, "weight": 3, "label": "Cookbook or open-source contribution merged"},
    {"id": "T12", "horizon": 60, "weight": 3, "label": "Phone screens with 3 companies"},
    {"id": "T13", "horizon": 90, "weight": 5, "label": "Onsite/final round with 1+ company"},
    {"id": "T14", "horizon": 90, "weight": 4, "label": "Offer in hand or pipeline of 5 active processes"},
    {"id": "T15", "horizon": 90, "weight": 3, "label": "Decided on AI PM specialization (safety/eval/platform)"},
]

# Sample current state (would be persisted between sessions).
STATE = {
    "T01": "done",  "T02": "done",  "T03": "done",
    "T04": "doing", "T05": "done",  "T06": "done",
    "T07": "todo",  "T08": "doing", "T09": "todo",
    "T10": "todo",  "T11": "todo",  "T12": "todo",
    "T13": "todo",  "T14": "todo",  "T15": "todo",
}

STATE_WEIGHTS = {"done": 1.0, "doing": 0.5, "todo": 0.0}

def by_horizon():
    out = {30: [], 60: [], 90: []}
    for t in TASKS:
        out[t["horizon"]].append(t)
    return out

def horizon_progress(tasks):
    total_w = sum(t["weight"] for t in tasks)
    earned = sum(t["weight"] * STATE_WEIGHTS[STATE.get(t["id"], "todo")] for t in tasks)
    return earned, total_w, (earned / total_w if total_w else 0.0)

def overall_momentum():
    total_w = sum(t["weight"] for t in TASKS)
    earned = sum(t["weight"] * STATE_WEIGHTS[STATE.get(t["id"], "todo")] for t in TASKS)
    return earned, total_w, (earned / total_w if total_w else 0.0)

def status_marker(state):
    return {"done": "[x]", "doing": "[~]", "todo": "[ ]"}[state]

def render_horizon(label, tasks):
    print("")
    print(f"=== Horizon {label} days ===")
    for t in tasks:
        st = STATE.get(t["id"], "todo")
        print(f"  {status_marker(st)} {t['id']} (w={t['weight']})  {t['label']}")
    earned, total, pct = horizon_progress(tasks)
    print(f"  -> earned {earned:.1f}/{total} = {pct:.0%}")

def next_three_actions():
    """Highest-weight todo or doing items become the next three actions."""
    open_tasks = [t for t in TASKS if STATE.get(t["id"]) in ("todo", "doing")]
    open_tasks.sort(key=lambda t: (-t["weight"], t["horizon"]))
    return open_tasks[:3]

def momentum_grade(pct):
    if pct >= 0.80: return "LAUNCH MODE"
    if pct >= 0.60: return "ON TRACK"
    if pct >= 0.40: return "SLOW START"
    return "AT RISK"

def main():
    print("AI PM CAREER LAUNCH TRACKER")
    print("=" * 60)
    horizons = by_horizon()
    for label in (30, 60, 90):
        render_horizon(label, horizons[label])
    print()
    earned, total, pct = overall_momentum()
    print("-" * 60)
    print(f"OVERALL MOMENTUM: {earned:.1f}/{total} = {pct:.0%}  ({momentum_grade(pct)})")
    print()
    print("Next 3 actions (largest-weight open items):")
    for i, t in enumerate(next_three_actions(), 1):
        print(f"  {i}. {t['id']} (h={t['horizon']}, w={t['weight']}) {t['label']}")
    print()
    # Day-60 nudge: ship something today, not tomorrow.
    submitted_today = STATE.get("T05") == "done"
    print("Today's commitment:")
    if submitted_today:
        print("  ✓ Application submitted. Schedule tomorrow's two before signing off.")
    else:
        print("  ✗ Submit at least one application today. The next 60 days start now.")
    print()
    print("Rule: momentum compounds. 1 application/day for 60 days beats 60 in week 8.")

if __name__ == "__main__":
    main()
`,
  },
  interview: { question: 'What\u2019s your biggest takeaway from studying AI product management, and what\u2019s your plan going forward?', answer: `My biggest takeaway is that AI product management requires a fundamentally different operating model than traditional PM work \u2014 and the PMs who thrive are the ones who embrace that difference rather than trying to force traditional frameworks onto probabilistic systems.<br><br><strong>Three specific shifts:</strong> First, safety is a product design constraint, not a compliance checkbox. The best AI products weave safety into the architecture, the system prompts, the eval pipeline, and the user experience. Second, evaluation is continuous, not launch-gated. Traditional products ship and monitor; AI products require ongoing eval suites, weekly health reviews, and the humility to know that a model that works today might behave differently tomorrow. Third, technical fluency matters more than in traditional PM roles. Not coding fluency \u2014 but understanding enough to make architecture decisions, evaluate system prompts, and engage meaningfully with AI engineers about tool use, MCP integration, and model selection.<br><br><strong>My plan going forward:</strong> I have a 30/60/90-day action plan. First 30 days: 10 targeted applications to AI PM roles across frontier labs, AI startups, and established companies with AI teams. Days 31\u201360: networking with purpose \u2014 informational conversations, AI PM events, and publishing insights from my portfolio. Days 61\u201390: contributing to open-source AI projects and writing about AI product management. The timeline from first application to accepted offer is 2\u20134 months, so starting today is the highest-leverage action.<br><br><strong>What I still need to learn:</strong> Deeper technical understanding of interpretability research, more hands-on experience with production monitoring at scale, and the judgment that only comes from shipping real AI products to real users. The course gave me the foundation; the job gives me the experience.` },
  pmAngle: 'Day 60 is a launch, not an ending. The course gave you the knowledge, the portfolio gives you the proof, and the action plan gives you the momentum. The most important thing you do today is apply. Not tomorrow, not after one more revision \u2014 today. Every day you delay adds a day to your timeline. Your portfolio is ready. Your knowledge is fresh. Launch.',
  resources: [
    { type: 'CAREERS', title: 'Anthropic Careers', url: 'https://www.anthropic.com/careers', note: 'Start here: frontier AI PM roles.' },
    { type: 'CAREERS', title: 'OpenAI Careers', url: 'https://openai.com/careers/', note: 'Frontier lab AI PM opportunities.' },
    { type: 'TOOL', title: 'Anthropic Cookbook', url: 'https://github.com/anthropics/anthropic-cookbook', note: 'Open-source contribution target for your 61\u201390 day plan.' },
    { type: 'TOOL', title: 'GitHub', url: 'https://github.com/', note: 'Final review and polish your ai-pm-60days repository.' },
    { type: 'COMMUNITY', title: 'Lenny\u2019s Newsletter & Slack', url: 'https://www.lennysnewsletter.com/', note: 'Active PM community for networking and learning.' },
    { type: 'TOOL', title: 'LinkedIn', url: 'https://www.linkedin.com/', note: 'Publish AI PM insights and connect with hiring managers.' }
  ]
};
