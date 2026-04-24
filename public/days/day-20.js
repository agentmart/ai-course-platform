// Day 20 — Phase 1 Capstone: Product Strategy Document
// Updated: March 2026
// Review changes:
// - Added network effects as fourth defensibility dimension
// - Recalibrated "why now" for 2026 capabilities (reasoning models, cost drops, agents)
// - Added agent layer placeholder in strategy document
// - Added commit portfolio checkpoint (target: 19 commits)
// - Updated model references to Claude 4.x
// - Added open-source stress test question
// - Added GitHub commit task structure
// - Preserved: model dependency map concept (course strength #2), 5-question framework

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

window.COURSE_DAY_DATA[20] = {
  subtitle: 'Synthesize Phase 1 \u2014 write the strategy document that will define your Phase 2 work and anchor your portfolio.',

  context: `<p>You\u2019ve spent 19 days building the foundational knowledge that separates a real AI PM from someone with surface-level familiarity. Today\u2019s capstone asks you to synthesize that knowledge into a written product strategy document \u2014 the format you will use in interviews, product planning, and design reviews. The goal is not to produce a perfect document; it\u2019s to discover where your knowledge is solid and where it\u2019s still thin.</p>
  <p>A product strategy for an AI product must answer <strong>five questions</strong>: (1) What is the problem worth solving, and who has it? (2) Why is AI the right solution <em>now</em>? In 2026, "now" has changed: reasoning models handle edge cases that previously required human review, costs have dropped 100x from 2023, and agentic capabilities enable workflows that were impossible two years ago. (3) What is the architecture \u2014 model, infrastructure, tools? Be specific: not "use an LLM" but "Claude Sonnet 4.6 with 200K context for full-document ingestion, hybrid RAG with Voyage AI embeddings for knowledge retrieval, prompt caching for cost efficiency." (4) What is the cost model \u2014 can this be a viable business? (5) How do you know when you\u2019ve succeeded \u2014 evals, metrics, success criteria?</p>
  <p>Add a <strong>sixth question for 2026</strong>: "If Meta releases a comparable open-weight model for free next quarter, does your product survive? Why?" Every strategy document must answer this. If your only defensible answer is "our model is better," you don\u2019t have a moat. Acceptable answers: workflow integration depth, proprietary data flywheel, compliance certification stack, customer switching costs, or <strong>network effects</strong> (more users \u2192 more data \u2192 better model \u2192 more users \u2014 the fourth defensibility type beyond data, workflow, and evaluation expertise).</p>
  <p>Your strategy should also include a placeholder: <strong>"How does this product evolve into an agentic product?"</strong> You haven\u2019t covered agentic topics yet (Phases 2-3), but most successful AI products in 2026 are adding autonomous capabilities. Acknowledging this trajectory \u2014 even before you\u2019ve studied it \u2014 shows strategic foresight.</p>
  <p><strong>Portfolio checkpoint:</strong> You should have 19 commits in your <code>ai-pm-60days</code> GitHub repo by now. If you don\u2019t, Day 20 is the catch-up checkpoint. Review your repo: Is the README clear? Is the writing quality high enough to show a hiring manager? Is there at least one working code example? Your GitHub repo IS your primary portfolio artifact \u2014 60 days of commits demonstrates applied learning more credibly than any resume claim.</p>`,

  tasks: [
    {
      title: 'Choose your product concept and write the strategy',
      description: 'Pick one: (a) AI legal assistant for contract review at SMB law firms, (b) AI code reviewer integrated into GitHub PRs, (c) AI customer support automation for SaaS, (d) AI document Q&A for financial analysts, or (e) something you\u2019d genuinely build. Write a 1,500+ word strategy document answering all 6 questions (including the open-source stress test). Be specific on model choice, architecture, cost model, and evals. Save as /day-20/phase1_capstone/product_strategy.md.',
      time: '40 min'
    },
    {
      title: 'Technical architecture section',
      description: 'Specify: which Claude model and why (with model string), RAG vs fine-tune vs raw API, embedding provider (Voyage AI or OpenAI), vector DB choice, tool use requirements, prompt caching strategy, expected context window usage, estimated cost per user per month. This should be specific enough for an engineer to start building. Save as /day-20/phase1_capstone/technical_architecture.md.',
      time: '20 min'
    },
    {
      title: 'Success metrics and model dependency map',
      description: 'Define: (a) primary quality eval metric, (b) North Star business metric, (c) guardrail metrics (what triggers rollback?), (d) launch criteria. Then create a model dependency map: which product features depend on which model capabilities? What happens if a capability improves? Degrades? Save as /day-20/phase1_capstone/success_metrics.md.',
      time: '20 min'
    },
    {
      title: 'Portfolio checkpoint: review your GitHub repo',
      description: 'Review your ai-pm-60days repo. How many commits do you have? (Target: 19.) Is the README clear and professional? Is there at least one working code example? Identify the 3 weakest daily entries and plan to improve them during Phase 2. Save as /day-20/phase1_retrospective.md.',
      time: '10 min'
    }
  ],

  interview: {
    question: 'Present a 2-minute product strategy for an AI product you\u2019d build at Anthropic.',
    answer: `Here\u2019s the structure. <strong>Opening (20s):</strong> "Enterprise legal teams spend 40% of their time on contract review. Existing tools hallucinate critical clauses, creating liability." <strong>Model (20s):</strong> "Claude Sonnet 4.6 \u2014 200K context handles full contracts without chunking, Constitutional AI training produces calibrated outputs on sensitive legal content." <strong>Architecture (30s):</strong> "Hybrid RAG with Voyage AI embeddings and Contextual Retrieval for the firm\u2019s case law database. Structured JSON output for clause extraction. Prompt caching on the 8K-token system prompt saves 85% on that component. Human-in-the-loop for any clause flagged high-risk." <strong>Cost (20s):</strong> "At current Sonnet pricing with caching: ~$0.15/contract after caching. 100 contracts/user/month = $15/user/month fully loaded. Price at $200/user/month \u2014 strong unit economics." <strong>Success (20s):</strong> "Primary eval: extraction accuracy vs lawyer review on 100-document golden set. Launch threshold: 95%. North Star: billable hours saved per attorney." <strong>Defensibility (10s):</strong> "Workflow integration into the firm\u2019s document management, proprietary case law RAG index, compliance certifications (SOC 2, HIPAA). Open-source alternative can\u2019t match the compliance stack."<br><br>That hits all six questions in 2 minutes and demonstrates cost awareness, architectural specificity, and awareness of the open-source objection.`
  },

  pmAngle: 'The capstone document is the seed of your portfolio. A PM who presents a coherent AI strategy \u2014 with model selection, architecture, cost model, evals, and defensibility against open-source alternatives \u2014 in writing and verbally is demonstrably more qualified than one who discusses concepts abstractly. The model dependency map (which features depend on which capabilities) is a genuinely novel PM framework \u2014 use it in every strategy document going forward.',

  resources: [
    { type: 'DOCS', title: 'Anthropic Building Overview', url: 'https://docs.anthropic.com/en/docs/build-with-claude/overview', note: 'Architecture reference for Claude-based products.' },
    { type: 'BLOG', title: 'Product Strategy Framework \u2014 Lenny\u2019s Newsletter', url: 'https://www.lennysnewsletter.com/', note: 'Strong product strategy framework. Adapt for AI context.' },
    { type: 'BLOG', title: 'AI Product Spec Writing', url: 'https://www.intercom.com/blog', note: 'Intercom\u2019s spec template. Transfers well to AI products.' },
    { type: 'PRICING', title: 'Anthropic Pricing (live)', url: 'https://www.anthropic.com/pricing', note: 'Use live pricing for your cost model. Never hardcode.' },
    { type: 'DOCS', title: 'Voyage AI (embeddings)', url: 'https://docs.voyageai.com/', note: 'Anthropic-ecosystem embeddings for your RAG architecture.' },
    { type: 'TOOL', title: 'Artificial Analysis (benchmarks)', url: 'https://artificialanalysis.ai/', note: 'Compare Claude Sonnet 4.6 vs alternatives for your strategy\u2019s model choice rationale.' }
  ]
};
