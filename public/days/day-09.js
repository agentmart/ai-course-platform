// Day 09 — Anthropic API Deep Dive
// Updated: March 2026
// Review changes:
// - CRITICAL: model string updated claude-3-5-sonnet-20241022 → claude-sonnet-4-6
// - Added prompt caching (highest-ROI API feature, first-party Anthropic)
// - Added token counting endpoint
// - Added Files API mention
// - Updated rate limit guidance to link to live docs

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

window.COURSE_DAY_DATA[9] = {
  subtitle: 'The API your products will be built on — understand every parameter, and the cost-saving features most teams miss.',

  context: `<p>The Anthropic Messages API is the primary interface for building on Claude. Every API call has the same structure: a <strong>model</strong> identifier, a <strong>max_tokens</strong> limit, a <strong>messages</strong> array of user/assistant turns, and an optional <strong>system</strong> prompt. The current production model strings are <code>claude-sonnet-4-6</code> (primary workhorse), <code>claude-opus-4-6</code> (highest capability), and <code>claude-haiku-4-5-20251001</code> (fastest, cheapest). Always verify current strings at <a href="https://docs.anthropic.com/en/docs/about-claude/models" target="_blank">docs.anthropic.com/en/docs/about-claude/models</a> before coding — using outdated strings causes 404-equivalent errors in production.</p>
  <p><strong>Streaming</strong> dramatically improves perceived UX. When Claude generates a long response, streaming returns tokens as they're generated via Server-Sent Events, rather than waiting for the full response. For a 500-token response, streaming reduces time-to-first-token from ~5 seconds to ~0.5 seconds. This difference between "waiting for the page to load" and "watching it type" significantly affects user trust and product quality. Implementing streaming is slightly more complex backend code but is almost always worth it for user-facing features.</p>
  <p><strong>Prompt caching</strong> is the single highest-ROI cost optimization available on the Claude API — and it's a first-party Anthropic feature that most teams don't use. Add <code>"cache_control": {"type": "ephemeral"}</code> to any content block of 1,024+ tokens to make it cacheable. Cache writes cost 1.25x normal input pricing; cache reads cost 0.1x (90% savings). For a product making 10,000 calls/day with a 10,000-token system prompt: without caching ~$300/day, with caching ~$37.50/day. An 87% reduction on that component, from a single API parameter. Five-minute cache TTL; reset on each cache hit. Source: <a href="https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching" target="_blank">Anthropic prompt caching docs</a>.</p>
  <p>Key operational features: the <strong>token counting endpoint</strong> (<code>POST /v1/messages/count_tokens</code>) allows pre-flight token counting before making the actual call — essential for cost management and context window planning. The <strong>Batch API</strong> processes requests asynchronously at 50% discount, essential for offline workflows. The <strong>Files API</strong> allows uploading documents once and referencing them by file ID across multiple API calls, eliminating repeated document transmission for document-heavy workflows. Always check <a href="https://docs.anthropic.com/en/api/rate-limits" target="_blank">current rate limits</a> rather than using hardcoded tier numbers — they evolve.</p>`,

  tasks: [
    {
      title: 'Make your first structured API call with current model strings',
      description: 'Call the Anthropic Messages API with: (1) model set to claude-sonnet-4-6, (2) a system prompt giving Claude a specific persona, (3) a multi-turn conversation array with at least 3 turns, (4) a request for JSON output. Verify the response structure. Log the input and output token counts from the response. Save as /day-09/api_call_analysis.js.',
      time: '30 min'
    },
    {
      title: 'Implement streaming and measure the UX difference',
      description: 'Modify your API call from Task 1 to use streaming (stream: true). Display tokens progressively in the terminal. Measure time-to-first-token vs non-streaming. Document: how many milliseconds faster is the first token? How does this change the user experience design of a product? Save your streaming implementation as /day-09/streaming_implementation.js.',
      time: '25 min'
    },
    {
      title: 'Implement prompt caching and calculate savings',
      description: 'Take your system prompt from Task 1. If it\'s under 1,024 tokens, expand it (add detailed persona, instructions, examples) until it exceeds that threshold. Add cache_control: {type: "ephemeral"} to the system block. Make the same call 3 times and compare: (a) first call (cache write), (b) second call (cache read), (c) third call (cache read). Verify via the usage object: cache_creation_input_tokens on call 1, cache_read_input_tokens on calls 2-3. Calculate your monthly savings at 10,000 calls/day. Save as /day-09/prompt_caching_demo.js.',
      time: '25 min'
    },
    {
      title: 'Design the API architecture for a document analysis product',
      description: 'Sketch the full API call sequence for a user uploading a 50-page contract and asking 5 questions about it. Include: which model, prompt caching strategy for the system prompt, token counting pre-flight, streaming for user-facing responses, Batch API for nightly bulk processing. What\'s the estimated cost per document with and without caching? Save as /day-09/document_analysis_architecture.md.',
      time: '20 min'
    }
  ],

  codeExample: {
    title: 'Anthropic API with prompt caching — JavaScript',
    lang: 'js',
    code: `// Anthropic Messages API — current model strings + prompt caching
// IMPORTANT: Always verify current model strings at:
// https://docs.anthropic.com/en/docs/about-claude/models

// Current model strings (March 2026)
const MODELS = {
  sonnet: "claude-sonnet-4-6",         // Primary production model
  opus:   "claude-opus-4-6",           // Highest capability
  haiku:  "claude-haiku-4-5-20251001", // Fastest, cheapest
};

// === PROMPT CACHING EXAMPLE ===
// Add cache_control to any content block >= 1,024 tokens
// Cache write: 1.25x normal input cost (one-time per unique prefix)
// Cache read:  0.10x normal input cost (90% savings on subsequent calls)

const SYSTEM_PROMPT = `You are a contract analysis assistant for enterprise legal teams.
You extract key terms with precision and respond in structured JSON format.

Your analysis should cover:
1. Parties and signatories (full legal names, roles)
2. Effective date and term duration
3. Payment terms (amounts, schedule, late penalties)
4. Termination conditions (notice period, for cause, for convenience)
5. Liability limitations and indemnification
6. Governing law and dispute resolution
7. Key obligations of each party
8. Any non-standard or concerning clauses

Always note: (a) what is clearly stated, (b) what is ambiguous, (c) what appears to be missing.
If a section is not present in the document, state that explicitly rather than inferring.
[Additional persona instructions would go here to reach 1,024+ token threshold for caching]`;

// Structure with cache_control on the system prompt
const requestWithCaching = {
  model: MODELS.sonnet,
  max_tokens: 2048,
  system: [
    {
      type: "text",
      text: SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" }  // <- This is the caching magic
    }
  ],
  messages: [
    { role: "user", content: "What are the payment terms in this contract? [contract text here]" }
  ]
};

// Simulate cost comparison: 10,000 calls/day, 10K-token system prompt
function calculateMonthlySavings(dailyCalls, systemTokens, inputPricePerM, cachePricePerM, cacheReadPricePerM) {
  const withoutCaching = dailyCalls * 30 * (systemTokens / 1e6) * inputPricePerM;
  // With caching: 1 write per cache TTL (5 min), ~reads for the rest
  // Simplified: assume 1 write, (dailyCalls - 1) reads per 5-min window
  const writeCost = (systemTokens / 1e6) * cachePricePerM;         // 1 write per 5 min
  const readCost  = (dailyCalls / (5/60/24)) * 30 * (systemTokens / 1e6) * cacheReadPricePerM; // reads
  const withCaching = (writeCost + readCost);
  return { withoutCaching: withoutCaching.toFixed(2), withCaching: withCaching.toFixed(2), savings: (withoutCaching - withCaching).toFixed(2) };
}

console.log("=== CURRENT MODEL STRINGS ===");
Object.entries(MODELS).forEach(([tier, model]) => {
  console.log("  " + tier.padEnd(8) + model);
});

console.log("\n=== REQUEST STRUCTURE WITH PROMPT CACHING ===");
console.log("Model:    ", requestWithCaching.model);
console.log("Caching:  ", JSON.stringify(requestWithCaching.system[0].cache_control));
console.log("Threshold: 1,024 tokens minimum for Sonnet/Opus, 2,048 for Haiku");

console.log("\n=== COST SAVINGS SIMULATION ===");
console.log("Scenario: 10,000 calls/day with 10,000-token system prompt");
console.log("(Use live pricing from anthropic.com/pricing for real estimates)");
// Using example prices - VERIFY CURRENT PRICES before using in real calculations
const example = calculateMonthlySavings(10000, 10000, 3.00, 3.75, 0.30);
console.log("Without caching: $" + example.withoutCaching + "/month");
console.log("With caching:    $" + example.withCaching + "/month (approx)");
console.log("Monthly savings: $" + example.savings);
console.log("\nNOTE: Cache TTL is 5 minutes. Cache resets on each read.");
console.log("Check usage.cache_creation_input_tokens and usage.cache_read_input_tokens in API response.");
`
  },

  interview: {
    question: 'Walk me through how you\'d architect a document analysis product on the Anthropic API, including cost optimization.',
    answer: `For a document analysis product, I\'d architect five layers: ingestion, context management, API integration with cost optimization, output handling, and observability.<br><br><strong>Ingestion:</strong> convert PDFs to clean text using a parsing library (or use the Files API to upload once and reference by file_id across calls). Split documents over 150K tokens into overlapping chunks of ~100K with 10K overlap to preserve context across splits.<br><br><strong>Context management:</strong> the system prompt defines the analysis persona and output schema. Keep it focused but substantial enough to benefit from prompt caching — a 2K-token system prompt at 10K calls/day saves ~80% on that component with cache_control: ephemeral. Use the token counting endpoint (<code>POST /v1/messages/count_tokens</code>) for pre-flight cost estimation.<br><br><strong>API integration:</strong> use <code>claude-sonnet-4-6</code> for most analysis tasks. Use streaming for user-facing real-time responses. Use the Batch API (50% discount) for nightly bulk processing. The batch and streaming decisions save as much as model selection in many architectures.<br><br><strong>Output handling:</strong> specify JSON schema in the system prompt, validate with a schema checker, retry with error feedback when validation fails. Never trust unvalidated AI JSON in production.<br><br><strong>Observability:</strong> log all calls with token counts broken down by component. Within 2 weeks of launch you'll see which system prompt sections are actually influencing output quality — cut the rest to reduce cost further.`
  },

  pmAngle: 'Prompt caching is the most valuable cost optimization most teams never implement because they don\'t know it exists. As an AI PM, knowing this feature cold — and the specific threshold numbers (1,024 tokens for Sonnet, 90% savings on reads) — is the kind of depth that signals genuine product ownership to engineers and interviewers.',

  resources: [
    { type: 'DOCS', title: 'Anthropic Models Overview (live)', url: 'https://docs.anthropic.com/en/docs/about-claude/models', note: 'Always check here for current model strings. Bookmark it.' },
    { type: 'DOCS', title: 'Prompt Caching — Anthropic', url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching', note: 'The most important cost optimization in the API. Read this before your first production deployment.' },
    { type: 'DOCS', title: 'Token Counting Endpoint', url: 'https://docs.anthropic.com/en/api/messages-count-tokens', note: 'Pre-flight token counting before making the actual API call. Use for cost management.' },
    { type: 'DOCS', title: 'Anthropic Batch API', url: 'https://docs.anthropic.com/en/docs/build-with-claude/message-batches', note: '50% cost reduction for async workloads. Essential for bulk processing.' },
    { type: 'DOCS', title: 'Streaming Guide', url: 'https://docs.anthropic.com/en/api/messages-streaming', note: 'How to implement SSE streaming. Required reading before any user-facing feature.' },
    { type: 'DOCS', title: 'Rate Limits (live)', url: 'https://docs.anthropic.com/en/api/rate-limits', note: 'Always check live docs — rate limit tiers evolve.' }
  ]
};
