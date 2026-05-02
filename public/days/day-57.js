// Day 57 \u2014 Mock Interview Loop (Phase 3)
// Updated: March 2026 | Review: Phase 3 topics, Anthropic-specific prep, Exponent and Interviewing.io recommendations

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[57] = {
  subtitle: 'Prepare for the hardest AI PM interview questions \u2014 regulation, red-teaming, and research-informed product thinking.',
  context: `<p>Phase 3 interviews are where AI PM candidates separate themselves from general PMs who\u2019ve read a few articles about AI. The questions go deep: regulatory compliance, safety architecture, interpretability research, and how these shape product decisions. Today you prepare for the questions that test whether you truly understand AI product management at the frontier.</p>
  <p><strong>Phase 3 interview topics.</strong> Expect questions in three areas that most candidates are unprepared for: (1) <strong>EU AI Act compliance</strong> \u2014 can you explain which AI Act risk categories apply to a specific product? Can you map a product\u2019s features to compliance requirements? Can you estimate the timeline and cost of compliance? Interviewers don\u2019t expect you to be a lawyer, but they expect you to know the framework well enough to make product decisions. (2) <strong>Red-team exercise design</strong> \u2014 can you design a red-teaming plan for a specific product? What tools would you use (Garak, PyRIT)? How do you prioritize findings? What\u2019s the difference between a red team report that protects the company and one that\u2019s performative? (3) <strong>Interpretability roadmap impact</strong> \u2014 how does Anthropic\u2019s interpretability research (understanding what models actually compute) affect product strategy? Candidates who can connect research papers to product decisions demonstrate the depth that frontier labs value.</p>
  <p><strong>Anthropic-specific interview preparation.</strong> If you\u2019re interviewing at Anthropic specifically, three preparation steps are non-negotiable: (1) <strong>Read the Model Spec</strong> \u2014 this is Anthropic\u2019s values document for Claude\u2019s behavior. Every question about product decisions at Anthropic connects to the Model Spec. If you haven\u2019t read it, you\u2019ll give generic answers that could apply to any AI company. (2) <strong>Use the API to build something</strong> \u2014 even a simple project. Use claude-sonnet-4-6 to build a small tool, agent, or demo. Interviewers can tell the difference between a candidate who has used the product and one who has read about it. (3) <strong>Read at least 3 Anthropic research papers</strong> \u2014 alignment faking, Constitutional AI, and interpretability research. You don\u2019t need to understand the math, but you need to articulate the product implications of the findings.</p>
  <p><strong>Updated platform recommendations.</strong> For mock interview practice, two platforms stand out in 2026: (1) <strong>Exponent</strong> \u2014 the best structured course for PM interview preparation, with AI-specific modules and practice problems. Their PM interview frameworks translate well to AI PM roles with minor adaptation. (2) <strong>Interviewing.io</strong> \u2014 real practice interviews with people who\u2019ve worked at top companies. The feedback is more honest and specific than peer practice. Avoid relying solely on peer practice groups (formerly Pramp) \u2014 the feedback quality is inconsistent and most peers don\u2019t know enough about AI PM roles to give useful feedback.</p>
  <p><strong>The interview answer framework for AI PM questions.</strong> For any AI PM interview question, structure your answer in four parts: (1) <strong>Framework</strong> \u2014 name the approach you use. (2) <strong>Specifics</strong> \u2014 use concrete details: model names (claude-sonnet-4-6), tools (Garak, PyRIT), regulations (EU AI Act Article 6), and metrics. (3) <strong>Tradeoffs</strong> \u2014 acknowledge the tension explicitly. Every AI product decision involves a tradeoff between capability, safety, cost, and speed. (4) <strong>Experience</strong> \u2014 connect to something you\u2019ve actually done (from this course or your work). Candidates who cite specific artifacts, tools, and research papers get hired. Candidates who give generic frameworks get \u201cno hire.\u201d</p>`,
  tasks: [
    { title: 'Practice EU AI Act compliance question', description: 'Answer this interview question in writing: \u201cYou\u2019re building an AI-powered hiring screening tool using Claude. Walk me through how you\u2019d ensure EU AI Act compliance.\u201d Structure your answer: identify the risk category (high-risk under Annex III), list specific compliance requirements (human oversight, transparency, documentation), estimate timeline, and explain how compliance shapes the product roadmap. Time yourself: 5 minutes max for the verbal version. Save as /day-57/eu_ai_act_answer.md.', time: '20 min' },
    { title: 'Practice red-team exercise design question', description: 'Answer this interview question: \u201cDesign a red-teaming plan for a customer-facing Claude chatbot deployed in healthcare.\u201d Cover: scope definition, tools (Garak for automated scanning, PyRIT for multi-turn attacks, manual testing for domain-specific risks), team composition, attack categories (prompt injection, medical misinformation, privacy leakage), report template, and how you\u2019d prioritize findings. Save as /day-57/red_team_design_answer.md.', time: '20 min' },
    { title: 'Practice interpretability impact question', description: 'Answer this interview question: \u201cHow does Anthropic\u2019s interpretability research affect product roadmap decisions?\u201d Connect research to product: interpretability enables better debugging (finding why Claude gives wrong answers), improves safety evaluation (moving beyond behavioral testing to mechanistic understanding), and creates new product features (explaining Claude\u2019s reasoning to users). Use specific research examples. Save as /day-57/interpretability_answer.md.', time: '20 min' },
    { title: 'Full mock interview simulation', description: 'Run a complete 45-minute mock interview loop. Question 1 (10 min): product sense \u2014 \u201cHow would you improve Claude\u2019s tool-use capabilities?\u201d Question 2 (10 min): strategy \u2014 \u201cShould Anthropic build a consumer product or stay API-first?\u201d Question 3 (10 min): safety \u2014 \u201cDesign the safety review process for a new Claude feature.\u201d For each: write your answer, time yourself, then critique your own answer using the framework (Framework, Specifics, Tradeoffs, Experience). Save as /day-57/mock_interview_full.md.', time: '25 min' }
  ],

  codeExample: {
    title: 'Interview Question Difficulty Rater — Python',
    lang: 'python',
    code: `# Day 57 — Interview Question Difficulty Rater + Practice Loop Counter
# Rates AI PM interview questions by difficulty and tracks practice reps.
# Pure stdlib. Hardcoded question bank.

# Each question has: id, area, difficulty signals, target reps before "ready".
QUESTIONS = [
    {"id": "Q1",  "area": "regulation",      "prompt": "Walk through how you'd assess EU AI Act applicability for a hiring tool.",
     "signals": ["specific-article", "risk-class", "obligations", "timeline"]},
    {"id": "Q2",  "area": "red-team",        "prompt": "Design a red-team exercise for a customer-support agent with tools.",
     "signals": ["attack-tree", "multi-turn", "tool-abuse", "report-format"]},
    {"id": "Q3",  "area": "interpretability","prompt": "How does interpretability research change your product roadmap?",
     "signals": ["paper-cited", "feature-impact", "trust-ui", "limit"]},
    {"id": "Q4",  "area": "evals",           "prompt": "Build an eval plan for a multi-step agent in 5 minutes.",
     "signals": ["leading-vs-lagging", "rubric", "golden-set", "ci-gate"]},
    {"id": "Q5",  "area": "strategy",        "prompt": "Make build vs buy vs fine-tune call for legal summarization.",
     "signals": ["cogs", "moat", "latency", "data-rights"]},
    {"id": "Q6",  "area": "safety",          "prompt": "A red-team finds a jailbreak two days before launch. What now?",
     "signals": ["sev-call", "comms", "mitigation", "go-no-go"]},
    {"id": "Q7",  "area": "metrics",         "prompt": "Pick the single metric you'd report to the CEO weekly.",
     "signals": ["leading", "tied-to-objective", "non-vanity", "trend"]},
    {"id": "Q8",  "area": "research",        "prompt": "Latest paper that changed how you think about agents — why?",
     "signals": ["cited", "implication", "doubt", "next-action"]},
]

DIFFICULTY_TARGETS = {
    "easy":   {"signals_required": 2, "reps_to_ready": 2},
    "medium": {"signals_required": 3, "reps_to_ready": 4},
    "hard":   {"signals_required": 4, "reps_to_ready": 6},
}

def difficulty_for(question):
    n = len(question["signals"])
    if n <= 2: return "easy"
    if n <= 3: return "medium"
    return "hard"

# Practice log: question_id -> list of (rep_number, signals_hit_count).
PRACTICE_LOG = {
    "Q1": [(1, 2), (2, 3), (3, 3), (4, 4), (5, 4), (6, 4)],
    "Q2": [(1, 1), (2, 2), (3, 3)],
    "Q3": [(1, 2), (2, 2)],
    "Q4": [(1, 4), (2, 4), (3, 4), (4, 4)],
    "Q5": [(1, 3), (2, 3), (3, 4), (4, 4), (5, 4)],
    "Q6": [(1, 2)],
    "Q7": [(1, 4), (2, 4)],
    "Q8": [],
}

def is_passing_rep(rep_signals_hit, required):
    return rep_signals_hit >= required

def question_status(q):
    diff = difficulty_for(q)
    target = DIFFICULTY_TARGETS[diff]
    log = PRACTICE_LOG.get(q["id"], [])
    passing = sum(1 for _, hit in log if is_passing_rep(hit, target["signals_required"]))
    needed = target["reps_to_ready"]
    return diff, len(log), passing, needed

def render_question(q):
    diff, reps, passing, needed = question_status(q)
    bar_len = min(passing, needed)
    bar = "#" * bar_len + "-" * (needed - bar_len)
    ready = "READY" if passing >= needed else "PRACTICE"
    print(f"[{q['id']}] ({diff:6}) {q['area']:14} reps={reps:2} passing={passing}/{needed} [{bar}]  {ready}")
    print(f"     Q: {q['prompt']}")
    print(f"     signals expected: {', '.join(q['signals'])}")

def coverage_by_area():
    out = {}
    for q in QUESTIONS:
        out.setdefault(q["area"], []).append(q)
    return out

def main():
    print("AI PM INTERVIEW QUESTION RATER")
    print("=" * 70)
    ready_count = 0
    for q in QUESTIONS:
        render_question(q)
        _, _, passing, needed = question_status(q)
        if passing >= needed:
            ready_count += 1
        print()
    print("-" * 70)
    print(f"Overall readiness: {ready_count}/{len(QUESTIONS)} questions at target reps.")
    print()
    print("Area coverage (questions practiced at all):")
    for area, qs in coverage_by_area().items():
        practiced = sum(1 for q in qs if PRACTICE_LOG.get(q["id"]))
        print(f"  {area:14} {practiced}/{len(qs)} practiced")
    print()
    print("Next-up (lowest passing reps first):")
    ranked = sorted(
        QUESTIONS,
        key=lambda q: (question_status(q)[2], question_status(q)[1]),
    )
    for q in ranked[:3]:
        diff, _, passing, needed = question_status(q)
        print(f"  - {q['id']} ({diff}): {passing}/{needed} passing reps. Next rep aims for all signals.")
    print()
    print("Rule of thumb: 4 passing reps for hard questions, 2 for easy.")
    print("A 'passing rep' hits the required signals in <= 90 seconds out loud.")

if __name__ == "__main__":
    main()
`,
  },

  interview: { question: 'How do you prepare for AI PM interviews at frontier labs like Anthropic?', answer: `Preparation for frontier AI PM roles goes beyond standard PM interview prep \u2014 you need to demonstrate depth in safety, regulation, and research-informed product thinking.<br><br><strong>Three non-negotiable preparation steps for Anthropic:</strong> First, read the Model Spec end-to-end. It\u2019s Anthropic\u2019s values document for Claude\u2019s behavior, and every product question connects to it. Second, build something with the API. Even a small project using claude-sonnet-4-6. Interviewers can immediately tell who has used the product versus who has read about it. Third, read at least three research papers: alignment faking, Constitutional AI, and interpretability. You don\u2019t need the math, but you need the product implications.<br><br><strong>Phase 3 topics that separate candidates:</strong> EU AI Act compliance \u2014 can you map a product to risk categories and articulate compliance requirements? Red-team exercise design \u2014 can you design a plan using Garak and PyRIT, not just describe what red-teaming is? Interpretability roadmap impact \u2014 can you connect research findings to product decisions?<br><br><strong>Answer structure:</strong> Framework (name your approach), Specifics (model names, tools, regulations, metrics), Tradeoffs (acknowledge tensions explicitly), and Experience (connect to something you\u2019ve built or analyzed). Generic frameworks get \u201cno hire.\u201d Specific, research-informed answers with honest tradeoff analysis get offers.<br><br><strong>Practice platforms:</strong> Exponent for structured PM prep with AI modules. Interviewing.io for real practice with experienced interviewers who give honest feedback.` },
  pmAngle: 'The AI PM interview at a frontier lab tests depth, not breadth. Can you connect research to product? Can you design a red-teaming plan, not just describe one? Can you navigate regulation with enough detail to make product decisions? Preparation means immersing in the company\u2019s research, building with their product, and practicing until specificity is your default.',
  resources: [
    { type: 'DOCS', title: 'Anthropic Model Spec', url: 'https://docs.anthropic.com/en/docs/resources/model-spec', note: 'Non-negotiable reading for any Anthropic interview.' },
    { type: 'RESEARCH', title: 'Anthropic: Alignment Faking Research', url: 'https://www.anthropic.com/research/alignment-faking', note: 'Key research paper to discuss in interpretability questions.' },
    { type: 'TOOL', title: 'Exponent PM Interview Prep', url: 'https://www.tryexponent.com/', note: 'Best structured course for PM interview preparation.' },
    { type: 'TOOL', title: 'Interviewing.io', url: 'https://interviewing.io/', note: 'Practice interviews with experienced interviewers.' },
    { type: 'DOCS', title: 'EU AI Act Full Text', url: 'https://artificialintelligenceact.eu/', note: 'Reference for compliance questions in interviews.' }
  ]
};
