// Day 58 \u2014 Your AI Product Vision Statement
// Updated: March 2026 | Review: vision failure modes, good vision examples, three-criteria test, deliver aloud exercise

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[58] = {
  subtitle: 'Craft the AI product vision that inspires teams and survives scrutiny \u2014 aspirational, bounded, grounded.',
  context: `<p>A product vision statement is the most compressed form of product strategy. It tells the team where you\u2019re going and why it matters. For AI products, vision statements are especially tricky because the technology is evolving so fast that visions either become obsolete or so vague they mean nothing. Today you learn how to write an AI product vision that is aspirational but not vague, time-bounded but not timid, and product-grounded but not feature-limited.</p>
  <p><strong>Vision failure modes to avoid.</strong> Three common failure modes kill AI product visions: (1) <strong>The capability claim</strong> \u2014 \u201cWe will build the most advanced AI assistant.\u201d This isn\u2019t a vision; it\u2019s a capability claim that every AI company makes. It tells the team nothing about who you serve, what problem you solve, or why it matters. (2) <strong>The platform for all needs</strong> \u2014 \u201cWe will be the AI platform that serves every user and every use case.\u201d This is a strategy to serve no one well. Great products are opinionated about who they serve and how. (3) <strong>\u201cDemocratizing AI\u201d</strong> \u2014 the most overused phrase in AI product marketing. It sounds inspiring but means nothing concrete. Democratizing for whom? To do what? By when? If your vision could appear on any AI company\u2019s website, it\u2019s not specific enough to guide decisions.</p>
  <p><strong>Good vision examples.</strong> Study these as models of effective AI product vision: (1) <strong>GitHub Copilot</strong> \u2014 a vision centered on making every developer more productive by handling routine coding tasks, so developers can focus on creative problem-solving. It\u2019s specific (developers), bounded (coding tasks), and aspirational (more productive). (2) <strong>Harvey AI</strong> \u2014 a vision of transforming legal work by making AI the associate that handles research, drafting, and analysis, so lawyers can focus on judgment and client relationships. It\u2019s specific (legal), bounded (associate-level work), and grounded (research/drafting/analysis). (3) <strong>Claude as a \u201cbrilliant friend\u201d</strong> \u2014 Anthropic\u2019s vision articulated as an AI that gives the quality of advice you\u2019d get from a brilliant friend who happens to have the knowledge of a doctor, lawyer, and financial advisor. It\u2019s aspirational (brilliant friend), grounded (advice quality), and relatable (everyone understands what a helpful friend means).</p>
  <p><strong>The three-criteria test.</strong> Every AI product vision should pass three tests: (1) <strong>Aspirational, not vague</strong> \u2014 does it describe a future state that\u2019s genuinely better? Can two people read it and agree on what success looks like? \u201cMore productive developers\u201d passes. \u201cTransforming the world with AI\u201d fails. (2) <strong>Time-bounded</strong> \u2014 is there an implicit or explicit timeframe? A 3-year vision differs from a 10-year vision. Frontier AI moves so fast that 2\u20133 year vision horizons are appropriate. Beyond that, you\u2019re writing science fiction, not product strategy. (3) <strong>Product-grounded</strong> \u2014 can you trace the vision back to specific product decisions? If the vision says \u201cevery developer more productive,\u201d you can evaluate every feature against that: does this feature make a developer more productive? If a vision can\u2019t be used to make feature prioritization decisions, it\u2019s decoration, not strategy.</p>
  <p><strong>Delivering your vision aloud.</strong> A vision that only works on paper isn\u2019t effective. Product leaders deliver visions verbally \u2014 in team meetings, board presentations, candidate pitches, and customer conversations. The verbal version must be: (1) Under 60 seconds. If you can\u2019t say it in a minute, it\u2019s too complex. (2) Jargon-free. If a non-technical person can\u2019t understand it, simplify. (3) Emotionally resonant. The best visions make people feel something \u2014 excitement about the future state, urgency about the problem, connection to the mission. Practice delivering your vision aloud until it sounds natural, not rehearsed. Record yourself. Listen. Revise.</p>`,
  tasks: [
    { title: 'Write your AI product vision', description: 'Choose an AI product (real or imagined) and write a vision statement. It must pass the three-criteria test: aspirational not vague, time-bounded (2\u20133 year horizon), and product-grounded (can be used for feature prioritization). Write three drafts, each improving on the last. For each draft, evaluate it against the three criteria and note what improved. Save your final version and the iteration history as /day-58/vision_statement.md.', time: '25 min' },
    { title: 'Diagnose vision failure modes', description: 'Here are five bad AI product visions. For each, identify which failure mode it exhibits (capability claim, platform for all needs, or democratizing AI) and rewrite it to pass the three-criteria test. (1) \u201cBuild the world\u2019s most powerful AI.\u201d (2) \u201cDemocratize AI for everyone.\u201d (3) \u201cBecome the one-stop AI platform for all enterprise needs.\u201d (4) \u201cMake AI safe and beneficial for humanity.\u201d (5) \u201cDeliver cutting-edge AI capabilities to the world.\u201d Save as /day-58/vision_diagnosis.md.', time: '20 min' },
    { title: 'Deliver your vision aloud', description: 'Practice delivering your vision statement verbally. Requirements: under 60 seconds, jargon-free, emotionally resonant. Record yourself (voice memo or video). Listen to the recording. Note: Did you sound natural or rehearsed? Was it under 60 seconds? Would a non-technical person understand it? Revise and record again. Do this three times. Write notes on what improved with each iteration. Save as /day-58/vision_delivery_notes.md.', time: '15 min' },
    { title: 'Vision-to-roadmap translation', description: 'Take your final vision statement and translate it into three quarterly priorities. For each quarter: what specific product work advances the vision? How would you measure progress toward the vision? What would you explicitly NOT build (because it doesn\u2019t advance the vision)? The \u201cwhat we won\u2019t build\u201d section is the most important \u2014 a vision is only useful if it helps you say no. Save as /day-58/vision_to_roadmap.md.', time: '20 min' }
  ],

  codeExample: {
    title: 'AI Product Vision Statement Linter — Python',
    lang: 'python',
    code: `# Day 58 — AI Product Vision Statement Linter
# Checks vision statements against three criteria: aspirational, bounded,
# grounded. Pure stdlib. Hardcoded examples.

ASPIRATIONAL_WORDS = ["enable", "empower", "transform", "default", "unlock", "north"]
BOUNDED_HINTS      = ["for", "by 20", "within", "team", "segment", "industry"]
GROUNDED_SIGNALS   = ["claude", "agent", "eval", "rag", "tool", "%", "users"]

# A vision is good when each criterion is met, not when it's the longest.
MAX_WORDS = 35  # Vision statements should be deliverable in under 30 seconds.

VISIONS = [
    {
        "id": "V1", "author": "PM A",
        "text": "Become the default AI copilot for relationship managers at mid-market banks by 2027, with claude-sonnet-4-6 powering 70% of weekly workflows.",
    },
    {
        "id": "V2", "author": "PM B",
        "text": "Use AI to make everything better.",  # too vague
    },
    {
        "id": "V3", "author": "PM C",
        "text": "Empower legal teams to draft contracts in 1/10th the time using a claude-opus-4-6 agent grounded in firm precedent by end of 2026.",
    },
    {
        "id": "V4", "author": "PM D",
        "text": "Build an enterprise platform that revolutionizes everything across all teams in all industries forever and ever.",  # unbounded
    },
    {
        "id": "V5", "author": "PM E",
        "text": "Replace human writers entirely with an LLM that always produces perfect output.",  # unrealistic + ungrounded
    },
]

def words_in(text):
    return text.lower().split()

def aspirational_score(text):
    hits = [w for w in ASPIRATIONAL_WORDS if w in text.lower()]
    return min(len(hits), 2) / 2.0, hits

def bounded_score(text):
    hits = [h for h in BOUNDED_HINTS if h in text.lower()]
    return min(len(hits), 2) / 2.0, hits

def grounded_score(text):
    hits = [s for s in GROUNDED_SIGNALS if s in text.lower()]
    return min(len(hits), 2) / 2.0, hits

def length_score(text):
    n = len(words_in(text))
    if n <= MAX_WORDS:
        return 1.0, n
    # Steep penalty above the cap.
    return max(0.0, 1 - (n - MAX_WORDS) / MAX_WORDS), n

def hyperbole_check(text):
    """Flag absolutism words that fail the 'bounded' test."""
    bad = ["always", "never", "everything", "everyone", "perfect", "forever", "all industries"]
    return [b for b in bad if b in text.lower()]

def deliverable_in_60s(text):
    """Heuristic: short vision = deliverable aloud in under a minute."""
    return len(words_in(text)) <= MAX_WORDS

def lint_vision(v):
    text = v["text"]
    a_s, a_hits = aspirational_score(text)
    b_s, b_hits = bounded_score(text)
    g_s, g_hits = grounded_score(text)
    l_s, n      = length_score(text)
    bad_words   = hyperbole_check(text)
    overall = (a_s + b_s + g_s + l_s) / 4.0
    return {
        "id": v["id"], "author": v["author"], "text": text,
        "aspirational": (a_s, a_hits),
        "bounded":      (b_s, b_hits),
        "grounded":     (g_s, g_hits),
        "length":       (l_s, n),
        "hyperbole":    bad_words,
        "overall":      overall,
        "deliverable":  deliverable_in_60s(text),
    }

def grade(pct):
    if pct >= 0.85: return "A"
    if pct >= 0.70: return "B"
    if pct >= 0.55: return "C"
    if pct >= 0.40: return "D"
    return "F"

def print_one(r):
    print(f"[{r['id']}] {r['author']}")
    print(f"  Text: {r['text']}")
    print(f"  Words: {r['length'][1]}  (cap {MAX_WORDS})  deliverable<60s: {r['deliverable']}")
    print(f"  Aspirational: {r['aspirational'][0]:.2f}  hits={r['aspirational'][1]}")
    print(f"  Bounded:      {r['bounded'][0]:.2f}  hits={r['bounded'][1]}")
    print(f"  Grounded:     {r['grounded'][0]:.2f}  hits={r['grounded'][1]}")
    if r["hyperbole"]:
        print(f"  HYPERBOLE FLAGS: {r['hyperbole']}")
    print(f"  Overall: {r['overall']:.2f}  ({grade(r['overall'])})")

def main():
    print("AI PRODUCT VISION LINTER")
    print("=" * 60)
    results = [lint_vision(v) for v in VISIONS]
    for r in results:
        print_one(r)
        print()
    print("-" * 60)
    keepers = [r for r in results if r["overall"] >= 0.70 and not r["hyperbole"]]
    print(f"Vision statements passing the bar (>=0.70 and no hyperbole): {len(keepers)}/{len(results)}")
    for r in keepers:
        print(f"  ✓ {r['id']} ({r['author']})")
    print()
    print("Three criteria, in order: aspirational, bounded, grounded.")
    print("If your vision can't be said aloud in 60 seconds, it isn't a vision yet.")

if __name__ == "__main__":
    main()
`,
  },

  interview: { question: 'What\u2019s your product vision for an AI assistant, and how does it guide decisions?', answer: `A strong AI product vision passes three tests: aspirational not vague, time-bounded, and product-grounded enough to guide feature prioritization.<br><br><strong>Common failure modes I avoid:</strong> Capability claims (\u201cmost advanced AI\u201d), platform-for-everything (\u201cserve every use case\u201d), and \u201cdemocratizing AI\u201d \u2014 which sounds inspiring but means nothing concrete. If the vision could appear on any AI company\u2019s website, it\u2019s not specific enough to guide decisions.<br><br><strong>What good looks like:</strong> GitHub Copilot\u2019s vision \u2014 making every developer more productive by handling routine coding tasks \u2014 is specific (developers), bounded (coding tasks), and aspirational (more productive). Claude\u2019s \u201cbrilliant friend\u201d framing works because it\u2019s relatable, aspirational, and product-grounded. I study both as models.<br><br><strong>The real test is feature prioritization:</strong> A vision is only useful if it helps you say no. If the vision says \u201cevery developer more productive,\u201d every feature gets evaluated: does this make a developer more productive? If a vision can\u2019t be used to kill a feature that doesn\u2019t align, it\u2019s decoration, not strategy.<br><br><strong>Verbal delivery matters:</strong> I can deliver the vision in under 60 seconds, jargon-free, to any audience. The best visions make people feel something \u2014 excitement about the future state, urgency about the problem. I practice delivering verbally until it sounds natural, not rehearsed.` },
  pmAngle: 'The product vision is the most compressed form of strategy. In AI, where the technology evolves faster than plans, a well-crafted vision is the North Star that keeps teams aligned when everything else changes. The PM who can write a vision that passes the three-criteria test and deliver it aloud in under 60 seconds is the PM who leads, not just manages.',
  resources: [
    { type: 'BLOG', title: 'Anthropic: Company Overview', url: 'https://www.anthropic.com/company', note: 'Study how Anthropic articulates its mission and product vision.' },
    { type: 'BLOG', title: 'GitHub Copilot', url: 'https://github.com/features/copilot', note: 'Example of a well-articulated AI product vision.' },
    { type: 'BLOG', title: 'Harvey AI', url: 'https://www.harvey.ai/', note: 'Example of a domain-specific AI product vision.' },
    { type: 'DOCS', title: 'Anthropic Model Spec', url: 'https://docs.anthropic.com/en/docs/resources/model-spec', note: 'See how Anthropic\u2019s values document shapes product vision.' }
  ]
};
