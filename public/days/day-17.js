// Day 17 — AI Cost Optimization
// Updated: March 2026
// Review changes:
// - CRITICAL: Added prompt caching as #1 cost optimization technique
// - Reordered optimization hierarchy: caching → routing → compression → batching
// - Added prompt caching cost calculation with real savings example
// - Updated model pricing references to live pricing links
// - Replaced GPTCache with current alternatives (Anthropic native caching, pgvector)
// - Added cost attribution by feature technique
// - Updated model names to Claude 4.x
// - Added GitHub commit task structure
// - Preserved: cost optimization hierarchy concept (course strength #8)

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

window.COURSE_DAY_DATA[17] = {
  subtitle: 'LLM inference is expensive at scale \u2014 the 5 levers that cut costs, starting with the one most teams miss.',

  context: `<p>AI inference costs surprise teams that haven\u2019t modeled them before launch. A customer support bot at 10,000 messages/day with a 5,000-token system prompt costs thousands per month on Claude Sonnet 4.6 \u2014 and that number scales linearly. The first rule: <strong>build your cost model before launch, not after the bill arrives.</strong> A cost calculator that takes daily requests \u00d7 average input/output tokens \u00d7 model price should exist in every architecture document.</p>
  <p><strong>The optimization hierarchy (in order of ROI):</strong></p>
  <p><strong>1. Prompt caching (highest ROI, do first).</strong> Anthropic\u2019s prompt caching is a first-party feature that most teams don\u2019t use. Mark a block of your system prompt with <code>cache_control: {type: "ephemeral"}</code>. First call: cached at 1.25\u00d7 normal input cost. Subsequent calls within 5 minutes: 0.1\u00d7 normal cost \u2014 a 90% reduction. Minimum cacheable block: 1024 tokens (Sonnet/Opus), 2048 (Haiku). For a product with a 10K-token system prompt at 10K requests/day: without caching ~$300/day on that component, with caching ~$37/day. <strong>This alone reduces costs 50-80% before any other optimization.</strong></p>
  <p><strong>2. Model routing.</strong> Route simple queries to cheap models (Haiku at ~$0.25/1M, GPT-4o-mini at ~$0.15/1M) and complex queries to expensive models (Sonnet 4.6). A two-tier classifier can reduce costs 40-70% with minimal quality degradation if the routing boundary is well-calibrated. The classifier itself must be extremely cheap \u2014 don\u2019t use Sonnet to decide whether to use Sonnet.</p>
  <p><strong>3. Prompt compression.</strong> Remove redundant instructions (test which parts are actually needed), use shorter few-shot examples, summarize older conversation turns instead of passing full history. Anthropic\u2019s prompt engineering guide shows that a well-structured 500-token prompt often outperforms a rambling 2,000-token one.</p>
  <p><strong>4. Batching.</strong> The Batch API (both Anthropic and OpenAI) processes requests asynchronously at 50% discount. Use for offline workflows: nightly document processing, bulk classification, eval runs, content enrichment pipelines.</p>
  <p><strong>5. Cost attribution by feature.</strong> How do you know which product feature drives cost spikes? Add metadata tags to each API call (<code>{"feature": "contract_review", "user_tier": "enterprise"}</code>) and track cost by feature in your observability layer (LangSmith, Langfuse, Helicone). This enables precise cost optimization targeting the highest-spend features first.</p>`,

  tasks: [
    {
      title: 'Build a cost model with prompt caching',
      description: 'Create a spreadsheet or calculator: daily requests \u00d7 system prompt tokens \u00d7 user message tokens \u00d7 output tokens. Calculate monthly cost for 3 scales (1K, 10K, 100K daily requests) both WITH and WITHOUT prompt caching. Use current pricing from anthropic.com/pricing. What is the savings percentage at each scale? Save as /day-17/cost_model_calculator.md.',
      time: '25 min'
    },
    {
      title: 'Implement a caching-aware cost wrapper',
      description: 'Write pseudocode (or real code) for an API wrapper that: (1) adds cache_control to system prompt blocks >= 1024 tokens, (2) logs cache hit/miss rates from the usage response, (3) calculates actual vs theoretical savings. This is the infrastructure Day 9\u2019s caching demo should evolve into. Save as /day-17/prompt_caching_wrapper.js.',
      time: '25 min'
    },
    {
      title: 'Design a routing strategy',
      description: 'Define routing criteria for your product: what makes a query "simple enough" for Haiku vs requiring Sonnet? Write classification logic as pseudocode. What is your estimated cost reduction? What are the quality risks of over-routing to the cheap model? Save as /day-17/routing_strategy_design.md.',
      time: '20 min'
    },
    {
      title: 'Build an optimization roadmap',
      description: 'Your product spends $50K/month on inference. Write the 90-day optimization roadmap in priority order: Week 1-2 (instrument + add caching), Week 3-4 (implement routing), Month 2 (prompt compression + batching), Month 3 (cost attribution + feature-level optimization). Target: 40% reduction. Save as /day-17/optimization_roadmap.md.',
      time: '10 min'
    }
  ],

  codeExample: {
    title: 'Prompt caching savings calculator \u2014 JavaScript',
    lang: 'js',
    code: `// Cost Optimization — Caching-First Hierarchy
// VERIFY: current pricing at anthropic.com/pricing before using real numbers

const MODELS = {
  'claude-sonnet-4-6': {
    input: 3.00, output: 15.00, cacheWrite: 3.75, cacheRead: 0.30,
    minCache: 1024, label: 'Sonnet 4.6'
  },
  'claude-haiku-4-5': {
    input: 0.25, output: 1.25, cacheWrite: 0.3125, cacheRead: 0.025,
    minCache: 2048, label: 'Haiku 4.5'
  }
};

function calcMonthlyCost(model, dailyReqs, systemTokens, userTokens, outputTokens) {
  const m = MODELS[model];
  // Without caching
  const noCaching = ((systemTokens + userTokens) / 1e6 * m.input + outputTokens / 1e6 * m.output) * dailyReqs * 30;
  
  // With caching (1 write per 5-min TTL window, rest are reads)
  // Simplified: assume ~288 cold starts/day (every 5 min) + rest are cache reads
  const coldStarts = 288;
  const cacheReads = Math.max(dailyReqs - coldStarts, 0);
  const withCaching = (
    (systemTokens / 1e6 * m.cacheWrite) * coldStarts * 30 +
    (systemTokens / 1e6 * m.cacheRead) * cacheReads * 30 +
    (userTokens / 1e6 * m.input) * dailyReqs * 30 +
    (outputTokens / 1e6 * m.output) * dailyReqs * 30
  );
  
  return { noCaching, withCaching, savings: noCaching - withCaching, pct: Math.round((1 - withCaching / noCaching) * 100) };
}

// Routing savings
function calcRoutingSavings(dailyReqs, pctSimple, userTokens, outputTokens) {
  const simple = dailyReqs * pctSimple;
  const complex = dailyReqs * (1 - pctSimple);
  const allSonnet = ((userTokens / 1e6 * 3.00) + (outputTokens / 1e6 * 15.00)) * dailyReqs * 30;
  const routed = (
    ((userTokens / 1e6 * 0.25) + (outputTokens / 1e6 * 1.25)) * simple * 30 +
    ((userTokens / 1e6 * 3.00) + (outputTokens / 1e6 * 15.00)) * complex * 30
  );
  return { allSonnet, routed, savings: allSonnet - routed, pct: Math.round((1 - routed / allSonnet) * 100) };
}

console.log("COST OPTIMIZATION HIERARCHY — Caching First");
console.log("=".repeat(60));
console.log("Product: 8K system prompt, 500 user tokens, 300 output tokens");
console.log("Prices from anthropic.com/pricing — VERIFY before using\\n");

[1000, 10000, 100000].forEach(daily => {
  const result = calcMonthlyCost('claude-sonnet-4-6', daily, 8000, 500, 300);
  console.log(daily.toLocaleString().padStart(7) + " req/day | No cache: $" + 
    result.noCaching.toFixed(0).padStart(7) + "/mo | Cached: $" + 
    result.withCaching.toFixed(0).padStart(7) + "/mo | Save: " + result.pct + "%");
});

console.log("\\nSTEP 2: ADD ROUTING (after caching)");
const routing = calcRoutingSavings(100000, 0.7, 500, 300);
console.log("100K req/day, 70% simple (Haiku) / 30% complex (Sonnet):");
console.log("  All Sonnet:      $" + routing.allSonnet.toFixed(0) + "/mo");
console.log("  70/30 routing:   $" + routing.routed.toFixed(0) + "/mo");
console.log("  Routing savings: " + routing.pct + "%");

console.log("\\nFULL OPTIMIZATION STACK:");
console.log("  1. Prompt caching: 50-80% savings on system prompt component");
console.log("  2. Model routing:  40-70% savings on simple queries");
console.log("  3. Prompt compression: 20-30% token reduction");
console.log("  4. Batch API: 50% for offline workloads");
console.log("  5. Cost attribution: metadata tags per feature → target biggest spenders");
console.log("\\nCombined: 60-85% total cost reduction is achievable.");`
  },

  interview: {
    question: 'Your AI product is spending $50K/month on LLM inference. Walk me through your optimization strategy.',
    answer: `I\u2019d approach this in five phases, ordered by ROI.<br><br><strong>Phase 1: Instrument (Week 1).</strong> Before optimizing, I need data: average tokens per request by component (system prompt, history, tools, user message), distribution of request complexity, and which features account for the most spend. Usually 20% of request types drive 80% of cost. Add metadata tags to every API call for cost attribution by feature.<br><br><strong>Phase 2: Prompt caching (Week 2).</strong> This is the highest-ROI optimization and it\u2019s first-party Anthropic. If the system prompt is 5K+ tokens, caching reduces that component by 90% on subsequent calls. For a product at our scale, this alone could save $15-25K/month.<br><br><strong>Phase 3: Model routing (Weeks 3-4).</strong> If 50-70% of requests are simple enough for Haiku or GPT-4o-mini, that\u2019s a massive cost reduction. Build a lightweight classifier, A/B test quality, deploy when quality delta is acceptable. Additional $10-15K/month savings.<br><br><strong>Phase 4: Prompt compression (Month 2).</strong> Audit the system prompt \u2014 remove instructions that can\u2019t be linked to measurable output behavior. Test against a golden dataset. 20-30% of system prompts are safe to remove.<br><br><strong>Phase 5: Batching + attribution (Month 3).</strong> Move offline workloads to Batch API (50% discount). Use cost-per-feature data to target the remaining high-spend features for specific optimization.<br><br>Target: $20K/month \u2014 a 60% reduction \u2014 within 90 days.`
  },

  pmAngle: 'Cost optimization is a product responsibility, not just engineering. The hierarchy matters: caching first (highest ROI, most teams miss it), then routing, then compression, then batching. The PM who knows Anthropic\u2019s prompt caching feature and puts it in the architecture from day one saves their company more money than any other single product decision.',

  resources: [
    { type: 'DOCS', title: 'Anthropic Prompt Caching', url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching', note: '#1 cost optimization. First-party Anthropic feature. Put it in every architecture doc.' },
    { type: 'DOCS', title: 'Anthropic Batch API', url: 'https://docs.anthropic.com/en/docs/build-with-claude/message-batches', note: '50% discount for async workloads. Essential for offline processing.' },
    { type: 'DOCS', title: 'Anthropic Prompt Engineering Guide', url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview', note: 'How to write efficient prompts. Compression starts here.' },
    { type: 'PRICING', title: 'Anthropic Pricing (live)', url: 'https://www.anthropic.com/pricing', note: 'Always use live pricing for cost models. Never hardcode.' },
    { type: 'TOOL', title: 'Helicone \u2014 Cost Tracking', url: 'https://www.helicone.ai/', note: 'Proxy-based cost tracking. Zero code changes to add cost visibility.' },
    { type: 'TOOL', title: 'Langfuse \u2014 Cost Attribution', url: 'https://langfuse.com/', note: 'Open-source. Track cost per feature, user tier, and request type.' }
  ]
};
