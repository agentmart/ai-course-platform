// Day 02 — How LLMs Work: Tokens, Context, Sampling
// Updated: March 2026
// Review changes:
// - Updated model references to Claude 4.x generation
// - Added Anthropic token counting API endpoint
// - Updated context windows: Gemini 2.5 Pro 1M+, Claude 200K combined I/O
// - Added Anthropic guidance on sampling: only alter temperature
// - Replaced word-count token estimator with API-first guidance
// - Introduced prompt caching concept (detailed in Days 9, 17)
// - Added GitHub commit task structure

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

window.COURSE_DAY_DATA[2] = {
  subtitle: 'Understand how language models process text — the foundation of every AI product decision.',

  context: `<p>Language models don't read words — they read <strong>tokens</strong>. A token is roughly 0.75 words on average, but the actual mapping is irregular: "the" is one token, "unbelievable" might be three. This matters for product decisions because every API call is priced per token, and every model has a hard context limit measured in tokens. As of early 2026: Claude Sonnet 4.6 supports 200K tokens, GPT-4o supports 128K, and Gemini 2.5 Pro supports 1M+ tokens natively. A 200-page contract is roughly 80K tokens — it fits in Claude or Gemini without chunking but may need RAG or splitting for GPT-4o depending on other context.</p>
  <p>The <strong>context window</strong> is everything the model can "see" when generating a response — system prompt, conversation history, retrieved documents, tool call results, and the model's own outputs. A critical nuance: Claude's 200K limit applies to <em>combined input and output</em>, not input alone. If your system prompt is 10K tokens, your document is 150K, and you expect a 5K output, that's 165K — it fits, but only with 35K to spare for conversation history and tool results. Context window budgeting is a product architecture decision. Gemini 2.5 Pro's 1M+ window changes the architecture calculus: you may not need RAG for document Q&A if context is long enough. But longer context costs more — always model the economics.</p>
  <p><strong>Sampling parameters</strong> control how the model selects each next token from its probability distribution. <strong>Temperature</strong> (0–1) controls randomness: temperature 0 is nearly deterministic, temperature 1 is creative. Claude also exposes <code>top_p</code> (nucleus sampling) and <code>top_k</code> parameters. However, Anthropic's documentation explicitly recommends: <em>"We recommend only altering temperature from the defaults, and not top_p or top_k."</em> For production AI products, temperature 0 is standard for factual extraction and code; 0.3–0.7 for creative or conversational tasks. When writing product specs, specify the temperature — it's a product behavior decision, not an engineering detail.</p>
  <p><strong>Token counting in production:</strong> Don't estimate — measure. Anthropic provides a dedicated token counting endpoint (<code>POST /v1/messages/count_tokens</code>) that returns exact token counts before you make the actual API call. Use this for cost guardrails, context window management, and pre-flight checks. Approximate estimators (words ÷ 0.75) are fine for rough planning but can be 20-30% off for code, non-English text, or structured data. Always use the official API in production.</p>
  <p><strong>A cost concept to know now:</strong> Anthropic's <strong>prompt caching</strong> (covered in depth on Days 9 and 17) lets you cache repeated content like system prompts, reducing costs by up to 90% on that component. When you're budgeting tokens for a product with a large system prompt, know that caching makes the system prompt nearly free after the first call. This changes the economics of prompt design significantly.</p>`,

  tasks: [
    {
      title: 'Tokenize your content using the real API',
      description: 'Use the Anthropic token counting endpoint (POST /v1/messages/count_tokens) to count exact tokens for: your resume, a product spec, and a customer support email. Compare the actual count to the rough estimate (words ÷ 0.75). How far off is the estimate? How would this affect a cost model at 10,000 requests/day? Save as /day-02/token_analysis.md.',
      time: '20 min'
    },
    {
      title: 'Run temperature experiments',
      description: 'Using the Claude API (model: claude-sonnet-4-6), send the same prompt ("Write 3 product names for an AI coding assistant") at temperature 0, 0.5, and 1.0. Document the differences. When would you use each setting in a real product? What does Anthropic recommend about top_p and top_k? Save as /day-02/temperature_experiments.md.',
      time: '25 min'
    },
    {
      title: 'Design a context window budget',
      description: 'You are building a document Q&A product. Users upload up to 3 documents (~50K tokens each). Design the context budget: system prompt (how many tokens?), documents (which ones fit?), conversation history (how many turns?), tool results (how much space?). What is cut first when you hit 200K? When does the product need RAG vs full-context? Consider: Gemini 2.5 Pro at 1M+ removes the chunking need — but at what cost? Save as /day-02/token_budget_design.md.',
      time: '20 min'
    },
    {
      title: 'Explain sampling to a non-technical stakeholder',
      description: 'Write a 150-word explanation of why your AI product sometimes gives different answers to the same question. This is a real customer objection you will face. Make it accurate, simple, and reassuring. Save as /day-02/customer_explanation.md.',
      time: '15 min'
    }
  ],

  codeExample: {
    title: 'Token counting and cost framework — JavaScript',
    lang: 'js',
    code: `// Day 02 — Token Counting and Context Budget Framework
// IMPORTANT: Use Anthropic's token counting API in production, not estimates.
// API endpoint: POST https://api.anthropic.com/v1/messages/count_tokens
// Docs: https://docs.anthropic.com/en/api/messages-count-tokens

// For rough planning: approximate estimator (NOT for production use)
function roughEstimateTokens(text) {
  // Word-based: within 10-25% of actual BPE count
  // WARNING: Inaccurate for code, non-English, structured data
  const words = text.trim().split(/\\s+/).length;
  return Math.ceil(words / 0.75);
}

// Context window budgets by model (verify at docs.anthropic.com/en/docs/about-claude/models)
const CONTEXT_WINDOWS = {
  'claude-sonnet-4-6':       200000,  // 200K combined input+output
  'claude-opus-4-6':         200000,
  'claude-haiku-4-5-20251001': 200000,
  'gpt-4o':                  128000,
  'gemini-2.5-pro':         1000000,  // 1M+ tokens
};

// Context budget designer
function designContextBudget(model, systemPromptTokens, maxDocTokens, maxHistoryTurns, avgTurnTokens, reservedOutput) {
  const totalWindow = CONTEXT_WINDOWS[model];
  if (!totalWindow) return { error: 'Unknown model — check docs.anthropic.com' };

  const historyTokens = maxHistoryTurns * avgTurnTokens * 2; // user + assistant per turn
  const totalNeeded = systemPromptTokens + maxDocTokens + historyTokens + reservedOutput;
  const headroom = totalWindow - totalNeeded;

  return {
    model,
    totalWindow,
    budget: {
      systemPrompt: systemPromptTokens,
      documents: maxDocTokens,
      conversationHistory: historyTokens,
      reservedForOutput: reservedOutput,
      total: totalNeeded,
      headroom: headroom
    },
    fits: headroom > 0,
    recommendation: headroom > 0
      ? 'Full-context approach viable — no RAG needed'
      : 'Over budget by ' + Math.abs(headroom) + ' tokens — need RAG or document selection'
  };
}

// Scenario: Document Q&A product
console.log('CONTEXT WINDOW BUDGET — Document Q&A Product');
console.log('='.repeat(60));

const budget = designContextBudget(
  'claude-sonnet-4-6',
  2000,    // system prompt
  120000,  // 3 docs × 40K avg
  5,       // 5 turns of history
  200,     // ~200 tokens per message
  4000     // reserve 4K for output
);

console.log('Model:             ' + budget.model);
console.log('Total window:      ' + budget.totalWindow.toLocaleString() + ' tokens');
console.log('System prompt:     ' + budget.budget.systemPrompt.toLocaleString());
console.log('Documents:         ' + budget.budget.documents.toLocaleString());
console.log('History (5 turns): ' + budget.budget.conversationHistory.toLocaleString());
console.log('Reserved output:   ' + budget.budget.reservedForOutput.toLocaleString());
console.log('Total needed:      ' + budget.budget.total.toLocaleString());
console.log('Headroom:          ' + budget.budget.headroom.toLocaleString());
console.log('Fits?              ' + budget.fits);
console.log('Recommendation:    ' + budget.recommendation);

console.log('\\n' + '='.repeat(60));
console.log('SAMPLING PARAMETERS — Anthropic Guidance');
console.log('Temperature: the ONLY parameter you should usually change');
console.log('  0.0 → deterministic (extraction, classification, code)');
console.log('  0.3-0.7 → balanced (conversation, creative tasks)');
console.log('  1.0 → maximum variety (brainstorming)');
console.log('top_p & top_k: Anthropic recommends leaving at defaults');
console.log('\\nProduction tip: always use the token counting API, not estimates');
console.log('POST /v1/messages/count_tokens → exact count before making the call');`
  },

  interview: {
    question: 'What is a context window and why does it matter for product decisions?',
    answer: `The context window is the total amount of text — measured in tokens — that a model can process in a single call. It includes everything: system prompt, conversation history, retrieved documents, tool results, and the response itself. As of early 2026, Claude Sonnet 4.6 supports 200K tokens (combined input and output), GPT-4o supports 128K, and Gemini 2.5 Pro supports over 1 million tokens natively.<br><br>For product decisions, context window size is a key architectural constraint. If your use case requires processing long documents (contracts, codebases, research papers), you need a model with sufficient context, or you need to build a retrieval layer (RAG) to work around the limit. Claude\u2019s 200K window handles most documents natively; GPT-4o at 128K requires chunking for anything over ~100 pages. Gemini\u2019s 1M+ window can handle almost anything in a single call — but the cost scales with tokens, so "fits in context" doesn\u2019t mean "economically viable in context."<br><br>An important nuance: Claude\u2019s 200K is the combined input+output budget. If you\u2019re passing 180K tokens of input, you only have 20K tokens for the response. This matters for product design — long documents with long expected outputs need careful budget management. Use the token counting API (<code>POST /v1/messages/count_tokens</code>) to measure before calling.<br><br>Context also affects cost: every token in context costs money. Anthropic\u2019s prompt caching feature reduces the cost of repeated system prompts by up to 90%, which changes the economics of large system prompts significantly. A product decision I make early is: what tokens are cacheable (system prompt), what tokens are dynamic (user content), and how does that split affect my unit economics.`
  },

  pmAngle: 'Tokenization and context windows are the infrastructure constraints that determine your product\u2019s architecture. The 2026 landscape gives you choices: Claude\u2019s 200K for most enterprise use cases, Gemini\u2019s 1M+ for document-heavy workloads, and RAG when even 1M isn\u2019t enough or cost matters. Understand these constraints before you start building, not after a production incident when a document is too long or costs spike unexpectedly.',

  resources: [
    { type: 'DOCS', title: 'Anthropic Token Counting API', url: 'https://docs.anthropic.com/en/api/messages-count-tokens', note: 'Count exact tokens before making API calls. Essential for cost management.' },
    { type: 'DOCS', title: 'Claude Context Windows', url: 'https://docs.anthropic.com/en/docs/build-with-claude/context-windows', note: 'Anthropic\u2019s guidance on managing large contexts effectively.' },
    { type: 'DOCS', title: 'Anthropic Prompt Caching', url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching', note: 'Cache system prompts for 90% cost reduction. Introduced here, deep-dived on Days 9 and 17.' },
    { type: 'TOOL', title: 'OpenAI Tokenizer', url: 'https://platform.openai.com/tokenizer', note: 'Visual BPE tokenizer. Useful for learning — but GPT and Claude tokenizers differ.' },
    { type: 'PAPER', title: 'BPE Tokenization Explainer', url: 'https://huggingface.co/learn/nlp-course/chapter6/5', note: 'How byte-pair encoding works — go as deep as you want.' },
    { type: 'DOCS', title: 'Claude Models Overview', url: 'https://docs.anthropic.com/en/docs/about-claude/models', note: 'Current context limits, model strings, and capabilities.' }
  ]
};
