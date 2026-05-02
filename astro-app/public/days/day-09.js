// Day 09 — Anthropic API Deep Dive
// Updated: March 2026
// Review changes:
// - CRITICAL: model string updated claude-3-5-sonnet-20241022 → claude-sonnet-4-6
// - Added prompt caching (highest-ROI API feature, first-party Anthropic)
// - Added token counting endpoint (/v1/messages/count_tokens)
// - Added Files API mention
// - Updated interview answer with caching architecture

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

window.COURSE_DAY_DATA[9] = {
  subtitle: 'The API your products will be built on — understand every parameter, plus the cost-saving features most teams miss.',

  context: `<p>The Anthropic Messages API is the primary interface for building on Claude. Every API call has the same structure: a <strong>model</strong> identifier, a <strong>max_tokens</strong> limit, a <strong>messages</strong> array of user/assistant turns, and an optional <strong>system</strong> prompt. The correct model string for production workloads as of early 2026 is <code>claude-sonnet-4-6</code> (or <code>claude-haiku-4-5-20251001</code> for high-volume lightweight tasks, <code>claude-opus-4-6</code> for maximum capability). Using outdated strings like <code>claude-3-5-sonnet-20241022</code> in production or in interviews is a red flag. The current models are documented at <a href="https://docs.anthropic.com/en/docs/about-claude/models" target="_blank">docs.anthropic.com/en/docs/about-claude/models</a> — bookmark it and check before every project.</p>
  <p><strong>Streaming</strong> dramatically improves perceived UX. When Claude generates a long response, streaming returns tokens as they're generated via Server-Sent Events, rather than waiting for the full response. For a 500-token response at typical speeds, streaming reduces time-to-first-token from ~5 seconds to ~0.5 seconds. The difference between "waiting for the page to load" and "watching it type" significantly affects user experience and directly impacts retention and satisfaction metrics. Implementing streaming requires slightly different backend code but is almost always worth it for user-facing features.</p>
  <p><strong>Prompt caching</strong> is the single highest-ROI cost optimization available on the Anthropic API, and it's a first-party feature that most teams don't use. The mechanism: mark a block of your system prompt (or other repeated content) with <code>cache_control: {type: "ephemeral"}</code>. First call: that block is written to cache at 1.25× normal input cost. Subsequent calls within 5 minutes: that block is read at 0.1× normal input cost — a 90% reduction. The minimum cacheable block is 1024 tokens for Sonnet/Opus and 2048 for Haiku. For a product sending 10,000 requests/day with a 10,000-token system prompt, prompt caching reduces that component from roughly $300/month to ~$37/month. This is not an optimization you add after scaling — it should be in your architecture from day one.</p>
  <p>Two other API features worth knowing: The <strong>token counting endpoint</strong> (<code>POST /v1/messages/count_tokens</code>) allows pre-flight token estimation before making the actual API call — essential for cost guardrails and context window management. The <strong>Batch API</strong> processes requests asynchronously at 50% of standard pricing with a 24-hour completion window, ideal for bulk document processing, nightly evals, and content enrichment pipelines.</p>`,

  tasks: [
    {
      title: 'Make your first structured API call',
      description: 'Call the Anthropic Messages API using model claude-sonnet-4-6 with: (1) a system prompt that gives Claude a specific persona, (2) a multi-turn conversation array with at least 3 turns, (3) a request for JSON output. Verify the response structure. Log the input and output token counts. Save as /day-09/api_call_analysis.js in your portfolio repo.',
      time: '30 min'
    },
    {
      title: 'Implement streaming',
      description: 'Modify your API call to use streaming (stream: true in the SDK). Display tokens progressively. Measure the time-to-first-token compared to non-streaming. Document both the implementation difference and the UX difference. This is a real product decision you will make repeatedly.',
      time: '25 min'
    },
    {
      title: 'Implement prompt caching and calculate savings',
      description: 'Take your system prompt from Task 1. Add cache_control: {type: "ephemeral"} to it. Run 5 calls and compare the usage.cache_read_input_tokens vs usage.input_tokens breakdown. Calculate: at 10,000 calls/day with this system prompt, what is the monthly cost with and without caching? Save as /day-09/prompt_caching_demo.js. This calculation should be in every architecture doc you write.',
      time: '25 min'
    },
    {
      title: 'Design the API architecture for a document analysis product',
      description: 'Sketch the full API call sequence for a user uploading a 50-page contract and asking 5 questions about it. Specify: model string, system prompt length and caching strategy, how questions are structured, streaming or not, and the estimated cost per document. Save as /day-09/document_analysis_architecture.md.',
      time: '20 min'
    }
  ],

  codeExample: {
    title: 'Prompt caching savings calculator — JavaScript',
    lang: 'js',
    code: `// Anthropic API — Prompt Caching Cost Calculator
// IMPORTANT: Verify current pricing at anthropic.com/pricing before using real numbers
// Current model strings (March 2026):
//   claude-sonnet-4-6       — primary production model
//   claude-haiku-4-5-20251001 — fast, cost-efficient
//   claude-opus-4-6         — highest capability

// Pricing framework (check anthropic.com/pricing for current rates)
const PRICING = {
  'claude-sonnet-4-6': {
    input:       3.00,  // per 1M tokens — VERIFY CURRENT
    output:     15.00,  // per 1M tokens — VERIFY CURRENT
    cacheWrite:  3.75,  // 1.25x input price for cache writes
    cacheRead:   0.30,  // 0.10x input price for cache reads
    minCacheTokens: 1024 // minimum block size for caching
  },
  'claude-haiku-4-5-20251001': {
    input:       0.25,
    output:      1.25,
    cacheWrite:  0.3125,
    cacheRead:   0.025,
    minCacheTokens: 2048
  }
};

function calcMonthlyCost(model, dailyRequests, systemPromptTokens, avgUserTokens, avgOutputTokens) {
  const p = PRICING[model];
  if (!p) return { error: 'Model not found — check current pricing at docs.anthropic.com' };
  
  // Without caching: all tokens charged at input rate
  const withoutCaching = (
    (systemPromptTokens + avgUserTokens) / 1e6 * p.input +
    avgOutputTokens / 1e6 * p.output
  ) * dailyRequests * 30;

  // With caching: 1 cache write per day (5-min TTL), rest are cache reads
  const cacheWritesPerDay = 1; // one cold start per 5-min TTL window
  const cacheReadsPerDay  = dailyRequests - cacheWritesPerDay;
  
  const withCaching = (
    // Cache writes (1.25x input price, once per TTL)
    (systemPromptTokens / 1e6 * p.cacheWrite) * cacheWritesPerDay * 30 +
    // Cache reads (0.10x input price)
    (systemPromptTokens / 1e6 * p.cacheRead) * cacheReadsPerDay * 30 +
    // User tokens still charged normally
    (avgUserTokens / 1e6 * p.input) * dailyRequests * 30 +
    // Output tokens
    (avgOutputTokens / 1e6 * p.output) * dailyRequests * 30
  );

  return {
    withoutCaching: withoutCaching.toFixed(2),
    withCaching: withCaching.toFixed(2),
    savingsPerMonth: (withoutCaching - withCaching).toFixed(2),
    savingsPct: Math.round((1 - withCaching / withoutCaching) * 100)
  };
}

// Scenario: customer support product with large system prompt
const scenarios = [
  { name: 'Startup (1K req/day)',  daily: 1000 },
  { name: 'Growing (10K req/day)', daily: 10000 },
  { name: 'Scale (100K req/day)',  daily: 100000 },
];

console.log('='.repeat(70));
console.log('PROMPT CACHING SAVINGS — claude-sonnet-4-6');
console.log('System prompt: 8,000 tokens | Avg user message: 500 tokens | Avg output: 300 tokens');
console.log('Note: verify current pricing at anthropic.com/pricing');
console.log('='.repeat(70));

scenarios.forEach(s => {
  const result = calcMonthlyCost('claude-sonnet-4-6', s.daily, 8000, 500, 300);
  console.log('\\n' + s.name);
  console.log('  Without caching: $' + result.withoutCaching + '/month');
  console.log('  With caching:    $' + result.withCaching + '/month');
  console.log('  Savings:         $' + result.savingsPerMonth + '/month (' + result.savingsPct + '% reduction)');
});

console.log('\\n' + '='.repeat(70));
console.log('CACHING ELIGIBILITY CHECK');
console.log('Minimum cacheable block: 1024 tokens (Sonnet/Opus), 2048 (Haiku)');
console.log('Cache TTL: 5 minutes (ephemeral)');
console.log('ROI is highest when: large system prompt + high request volume');
console.log('\\nImplementation: add cache_control to system prompt block:');
console.log(JSON.stringify({
  type: 'text',
  text: 'Your system prompt here...',
  cache_control: { type: 'ephemeral' }
}, null, 2));`
  },

  interview: {
    question: 'Walk me through how you\u2019d architect a document analysis product on the Anthropic API.',
    answer: `For a document analysis product, I\u2019d architect four key layers: ingestion, context management, API integration, and output handling. And I\u2019d build in prompt caching from the start.<br><br><strong>Ingestion:</strong> convert incoming documents (PDF, DOCX) to clean text. Split documents over 150K tokens into overlapping chunks of ~100K tokens with 10K overlap to preserve context across splits. Use the token counting endpoint (<code>POST /v1/messages/count_tokens</code>) to measure each document before choosing single-call vs multi-call strategy.<br><br><strong>Context management:</strong> the system prompt defines the analysis persona and JSON output format. Keep it precise and cacheable — add <code>cache_control: {type: \u201cephemeral\u201d}</code> to the system block. If the system prompt is 8,000 tokens and you\u2019re processing 1,000 contracts/month, caching reduces that component cost by ~85%.<br><br><strong>API integration:</strong> use model <code>claude-sonnet-4-6</code> for most analysis. Use streaming for user-facing real-time responses; batch API for async bulk processing at 50% cost reduction. Implement exponential backoff for rate limit handling.<br><br><strong>Output handling:</strong> specify JSON schema in system prompt, validate with a schema checker, retry with feedback on validation failures. Cache outputs for identical document+question combinations to avoid redundant API calls.`
  },

  pmAngle: 'Prompt caching is not an optimization you discover after your AWS bill arrives — it\u2019s an architectural decision you make on day one. A PM who spec\u2019s a high-system-prompt product without caching is leaving 50-85% of the cost reduction on the table. Know the feature, know the thresholds (1024 tokens minimum), and put it in every architecture document you write.',

  resources: [
    { type: 'DOCS', title: 'Anthropic Models Overview (current strings)', url: 'https://docs.anthropic.com/en/docs/about-claude/models', note: 'Bookmark this — always use current model strings. Check before every project.' },
    { type: 'DOCS', title: 'Prompt Caching Guide', url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching', note: 'First-party Anthropic feature. Highest ROI optimization for high-volume products.' },
    { type: 'DOCS', title: 'Token Counting API', url: 'https://docs.anthropic.com/en/api/messages-count-tokens', note: 'Pre-flight token estimation before making the actual call — essential for cost guardrails.' },
    { type: 'DOCS', title: 'Messages API Reference', url: 'https://docs.anthropic.com/en/api/messages', note: 'Full API reference — read the request and response schemas.' },
    { type: 'DOCS', title: 'Batch API (50% cost reduction)', url: 'https://docs.anthropic.com/en/docs/build-with-claude/message-batches', note: 'Async processing at half price. Use for bulk classification, evals, nightly pipelines.' },
    { type: 'PRICING', title: 'Anthropic Pricing (live)', url: 'https://www.anthropic.com/pricing', note: 'Always verify current prices. Never hardcode — pricing changes quarterly.' }
  ]
};
