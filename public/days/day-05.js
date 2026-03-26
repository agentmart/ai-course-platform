// Day 05 — OpenAI Model Strategy
// Updated: March 2026
// Review changes:
// - Added GPT-4.5, o4-mini, gpt-4o-mini context
// - Added OpenAI Operator as competitive context (agentic browser use)
// - Added DeepSeek R1 response analysis: how OpenAI responded to competitive inflection
// - Added open-source tier as threat in SWOT analysis
// - Removed specific ARR estimates → teach research skill
// - Updated safety team departures with nuance (restructured, not just departed)
// - Upgraded GPT Store task → analyze OpenAI's full product surface
// - Added GitHub commit task structure

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

window.COURSE_DAY_DATA[5] = {
  subtitle: 'Understand OpenAI\u2019s model strategy to compete, partner, and benchmark effectively.',

  context: `<p>OpenAI operates two distinct businesses from one model family: a <strong>consumer platform</strong> (ChatGPT, 200M+ weekly users) and an <strong>API business</strong> (GPT-4o, o-series, powering developer applications). The consumer platform builds habits and brand affinity at scale. The API business is the infrastructure play — becoming the default LLM for production applications. These two businesses have different success metrics and sometimes conflicting incentives: ChatGPT optimizes for engagement and retention; the API optimizes for developer adoption and enterprise contracts. Both are reinforced by the Microsoft partnership ($13B+ investment, Azure OpenAI integration across enterprise).</p>
  <p>The model ladder as of early 2026: <strong>GPT-4o-mini</strong> (high-volume cheap tier, the default for most price-sensitive applications), <strong>GPT-4o</strong> (128K context, multimodal, the workhorse), <strong>GPT-4.5</strong> (released 2025, positions between 4o and o-series in capability), and the <strong>o-series reasoning models</strong> — <code>o3</code> (highest reasoning, premium pricing), <code>o4-mini</code> (strong reasoning at a fraction of o3's cost, the most important model launch of 2025 for competitive dynamics). The o-series uses test-time compute — spending more inference time on harder problems — creating a new product tier that forces routing decisions.</p>
  <p><strong>OpenAI Operator</strong> (launched January 2025) is OpenAI's entry into agentic browser and computer use — directly competitive with Anthropic's computer use capability (Day 25). Operator is a consumer-facing product that controls a browser to complete tasks, rather than an API primitive. This is a different go-to-market strategy from Anthropic's API-first approach and reveals OpenAI's consumer-first orientation.</p>
  <p><strong>The DeepSeek R1 inflection point.</strong> In January 2025, DeepSeek released R1, demonstrating near-frontier reasoning performance at a reported training cost under $6M — a fraction of what OpenAI and Anthropic spend. The competitive economics story is critical: OpenAI responded by accelerating price reductions (o4-mini pricing undercuts o3 dramatically), increasing transparency on capabilities, and doubling down on the enterprise moat (Azure integration, compliance, support). Understanding why OpenAI made specific pricing and product moves in 2025 requires understanding the DeepSeek provocation. This is a competitive economics story, not a geopolitical one.</p>
  <p><strong>The open-source tier</strong> is OpenAI's silent competitor and must be part of any competitive analysis. Meta's Llama 4 (free, enterprise-deployable), Mistral (strong European positioning), and Phi-4 (Microsoft's small but capable 14B model) all compete for the same developer and enterprise budgets. OpenAI's response: aggressive pricing on lower tiers (GPT-4o-mini, o4-mini) to compete on cost while maintaining quality premium at the top. Any SWOT analysis of OpenAI that doesn't include the open-source tier in the Threats quadrant is incomplete.</p>`,

  tasks: [
    {
      title: 'Analyze OpenAI\u2019s product surface',
      description: 'Map OpenAI\u2019s product surface across three channels: consumer (ChatGPT Free/Plus/Team/Enterprise), enterprise (Azure OpenAI), and developer (API + Operator). For each channel: primary user, key value proposition, competitive vulnerability. How does each channel reinforce the others? Where is the strategic lock-in? Where is each channel vulnerable to open-source alternatives? Save as /day-05/openai_product_surface_analysis.md.',
      time: '25 min'
    },
    {
      title: 'SWOT analysis with open-source threat',
      description: 'Build a 2x2 SWOT matrix for OpenAI\u2019s model strategy. Be specific — not "strong brand" but "200M weekly ChatGPT users create preference data flywheel." The Threats quadrant MUST include the open-source tier (Llama 4, Mistral, Phi-4) and the DeepSeek training cost signal. Save as /day-05/openai_swot_matrix.md.',
      time: '20 min'
    },
    {
      title: 'Competitive positioning for 3 enterprise use cases',
      description: 'For each of (a) enterprise code review, (b) contract analysis, (c) customer support automation — write 2-3 sentences on whether you\u2019d recommend Claude, GPT-4o, or an open-source alternative and why. Include the open-source "why not self-host" consideration. Save as /day-05/competitive_positioning_3usecases.md.',
      time: '15 min'
    },
    {
      title: 'DeepSeek R1 response analysis',
      description: 'Research how OpenAI responded to DeepSeek R1 (January 2025). What pricing changes were made? What product moves followed? What does this tell you about how frontier labs respond to competitive cost pressure? This is a real competitive intelligence exercise — the answer informs how you think about competitive dynamics at any frontier lab. Save as /day-05/deepseek_r1_response_analysis.md.',
      time: '20 min'
    }
  ],

  interview: {
    question: 'OpenAI released o3 as a reasoning model. How does this change the competitive landscape for AI products?',
    answer: `O3 changes two things: it raises the capability ceiling for complex reasoning tasks, and it creates a new pricing tier that forces routing decisions.<br><br><strong>Capability:</strong> Tasks previously unreliable for AI — complex multi-step math, advanced code generation, scientific analysis — are now solvable with reasoning models. This opens new product categories. For Anthropic, it accelerated the need for Claude\u2019s extended thinking capability to match this tier.<br><br><strong>Pricing and o4-mini:</strong> The bigger strategic move was o4-mini — strong reasoning at dramatically lower cost than o3. This changes the routing calculus: "reasoning vs. non-reasoning" is no longer a $40/1M vs. $5/1M choice. O4-mini compresses the spread, making reasoning accessible for more use cases. Products need a routing classifier, but the economic penalty for over-routing is much lower with o4-mini.<br><br><strong>Open-source pressure:</strong> DeepSeek R1 demonstrated near-frontier reasoning at a fraction of the training cost, which accelerated OpenAI\u2019s pricing pressure. OpenAI responded with both o4-mini pricing and general price reductions. The competitive dynamic isn\u2019t just Anthropic vs. OpenAI — it\u2019s proprietary APIs vs. "run it ourselves for free" across the entire enterprise market.<br><br><strong>Strategic implication:</strong> OpenAI now competes on two axes — quality (o3) and affordability (o4-mini/GPT-4o-mini). This good-better-best product ladder captures more wallet share at both ends, which is textbook pricing strategy.`
  },

  pmAngle: 'The best AI PMs at Anthropic understand OpenAI deeply — not to dismiss them, but to find the specific gaps where Claude genuinely wins. In 2026, that analysis must include the open-source tier as a silent competitor to both companies. The enterprise question is increasingly "proprietary API vs self-host" before it\u2019s "Claude vs GPT-4o."',

  resources: [
    { type: 'DOCS', title: 'OpenAI Model Overview', url: 'https://platform.openai.com/docs/models', note: 'All current OpenAI models, capabilities, and pricing. Verify before any competitive analysis.' },
    { type: 'BLOG', title: 'OpenAI o3 System Card', url: 'https://openai.com/index/openai-o3-system-card/', note: 'Safety and capability evaluation for the o-series reasoning models.' },
    { type: 'BLOG', title: 'OpenAI Operator', url: 'https://openai.com/index/introducing-operator/', note: 'OpenAI\u2019s agentic browser use product. Compare to Anthropic computer use (Day 25).' },
    { type: 'PAPER', title: 'DeepSeek-R1 Technical Report', url: 'https://arxiv.org/abs/2501.12948', note: 'The January 2025 competitive inflection point. Read abstract + results for competitive context.' },
    { type: 'BLOG', title: 'OpenAI Preparedness Framework', url: 'https://openai.com/preparedness/', note: 'OpenAI\u2019s equivalent of Anthropic\u2019s RSP. Compare approaches for enterprise sales knowledge.' },
    { type: 'PRICING', title: 'OpenAI Pricing (live)', url: 'https://openai.com/pricing', note: 'Compare GPT-4o vs o-series vs mini pricing. Always use live pricing, never cached numbers.' }
  ]
};
