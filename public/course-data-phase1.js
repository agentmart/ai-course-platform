// Phase 1 course content — Days 2-20
// Loaded by course.html; extends window.COURSE_DAY_DATA

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

Object.assign(window.COURSE_DAY_DATA, {

2: {
  subtitle: 'Understand how language models process text — the foundation of every AI product decision.',
  context: `<p>Language models don't read words — they read <strong>tokens</strong>. A token is roughly 0.75 words on average, but the actual mapping is irregular: "the" is one token, "unbelievable" might be three. This matters for product decisions because every API call is priced per token, and every model has a hard context limit measured in tokens. Claude 3.5 Sonnet supports 200K tokens; GPT-4o supports 128K. A 200-page contract is roughly 80K tokens, which fits in Claude but requires chunking in GPT-4o — a real architectural constraint, not just a detail.</p>
  <p>The <strong>context window</strong> is everything the model can "see" when generating a response. It includes the system prompt, all conversation history, retrieved documents, tool call results, and the model's own previous outputs. Larger context windows aren't just technically impressive — they unlock fundamentally different product architectures. When you can fit an entire codebase or contract in context, you don't need RAG. When you can't, you do. This is a product decision, not just an infrastructure choice.</p>
  <p><strong>Sampling parameters</strong> control how the model selects each next token from its probability distribution. Temperature (0–1) controls randomness: temperature 0 is nearly deterministic, temperature 1 is creative. Top-p (nucleus sampling) controls the cumulative probability mass the model samples from. For production AI products, temperature 0 is standard for factual extraction and code; 0.3–0.7 for creative or conversational tasks. Understanding these parameters lets you spec the right behavior for different product contexts.</p>`,
  tasks: [
    { title: 'Tokenize your own content', description: 'Go to platform.openai.com/tokenizer. Paste your resume, a product spec you\'ve written, or a support email. Count the tokens and estimate the API cost at Claude 3.5 Sonnet pricing ($3/1M input). How does this change how you\'d design prompts?', time: '20 min' },
    { title: 'Run temperature experiments', description: 'Using the Claude API or Claude.ai, send the same prompt (e.g., "Write 3 product names for an AI coding assistant") at temperature 0, 0.5, and 1.0. Document the differences. When would you use each setting in a real product?', time: '25 min' },
    { title: 'Design a context window budget', description: 'You are building a document Q&A product. The user can upload up to 3 documents. Design the context budget: system prompt, documents, conversation history, tool results. How many tokens does each component get? What do you cut first when you hit the limit?', time: '20 min' },
    { title: 'Explain sampling to a non-technical stakeholder', description: 'Write a 150-word explanation of why your AI product sometimes gives different answers to the same question. This is a real customer objection you will face. Make it accurate, simple, and reassuring.', time: '15 min' },
  ],
  codeExample: {
    title: 'Token counter & cost estimator — JavaScript',
    lang: 'js',
    code: `// Approximate token counter (GPT/Claude use similar BPE tokenization)
// Rule of thumb: 1 token ≈ 4 chars or 0.75 words

function estimateTokens(text) {
  // Word-based estimate (within 10-15% of actual BPE)
  const words = text.trim().split(/\\s+/).length;
  return Math.ceil(words / 0.75);
}

function estimateCost(inputTokens, outputTokens, model) {
  const pricing = {
    'claude-3.5-sonnet': { in: 3.00, out: 15.00 },
    'gpt-4o':            { in: 5.00, out: 15.00 },
    'claude-3-haiku':    { in: 0.25, out: 1.25  },
    'gpt-4o-mini':       { in: 0.15, out: 0.60  },
  };
  const p = pricing[model];
  const cost = (inputTokens / 1e6 * p.in) + (outputTokens / 1e6 * p.out);
  return cost.toFixed(6);
}

// Simulate a customer support product
const systemPrompt = "You are a helpful customer support agent for AcmeCorp software.";
const userMessage = "I can't log in to my account and I've tried resetting my password three times.";
const expectedResponse = "I understand how frustrating that must be. Let me help you regain access to your account."; // ~25 word response

const inputTokens = estimateTokens(systemPrompt + userMessage);
const outputTokens = estimateTokens(expectedResponse);

console.log("=== Token & Cost Analysis ===");
console.log("System prompt tokens:", estimateTokens(systemPrompt));
console.log("User message tokens: ", estimateTokens(userMessage));
console.log("Expected output:     ", outputTokens);
console.log();
console.log("Monthly cost at 10,000 conversations/day:");
for (const model of ['claude-3-haiku', 'gpt-4o-mini', 'claude-3.5-sonnet', 'gpt-4o']) {
  const dailyCost = 10000 * parseFloat(estimateCost(inputTokens, outputTokens, model));
  const monthlyCost = (dailyCost * 30).toFixed(2);
  console.log(model.padEnd(22), "$" + monthlyCost + "/month");
}`
  },
  interview: {
    question: 'What is a context window and why does it matter for product decisions?',
    answer: `The context window is the total amount of text — measured in tokens — that a model can process in a single call. It includes everything: system prompt, conversation history, retrieved documents, and the response itself. Current models range from 8K tokens (older GPT-3.5) to 1M tokens (Gemini 1.5 Pro), with Claude at 200K and GPT-4o at 128K.<br><br>For product decisions, context window size is a key architectural constraint. If your use case requires processing long documents (contracts, codebases, research papers), you need a model with sufficient context, or you need to build a chunking and retrieval layer (RAG) to work around the limit. Claude's 200K window handles most documents natively; GPT-4o at 128K requires chunking for anything over about 100 pages.<br><br>Context also affects cost: every token in context costs money. A product with a 10,000-token system prompt and a 5,000-token conversation history is paying for 15,000 tokens of input on every single API call. Managing context efficiently — summarizing old messages, truncating history, being concise in system prompts — is a real engineering and product decision that affects unit economics.`
  },
  pmAngle: 'Tokenization and context windows are the infrastructure constraints that determine your product\'s architecture. Understand them early, before you start building, or you\'ll discover them painfully in production when a document is too long or costs spike unexpectedly.',
  resources: [
    { type: 'TOOL', title: 'OpenAI Tokenizer', url: 'https://platform.openai.com/tokenizer', note: 'Paste any text and see exact token counts. Essential for prompt budgeting.' },
    { type: 'DOCS', title: 'Claude Context Windows', url: 'https://docs.anthropic.com/en/docs/build-with-claude/context-windows', note: 'Anthropic\'s guidance on managing large contexts effectively.' },
    { type: 'PAPER', title: 'BPE Tokenization Explainer', url: 'https://huggingface.co/learn/nlp-course/chapter6/5', note: 'How byte-pair encoding actually works — go as deep as you want.' },
  ]
},

3: {
  subtitle: 'Why models have values, and how those values were instilled.',
  context: `<p><strong>Reinforcement Learning from Human Feedback (RLHF)</strong> is the training technique that transforms a raw language model into a helpful assistant. The process has three stages: train a base model on internet text, then collect human preference data (showing raters pairs of responses and asking which is better), then train a reward model to predict human preferences, and finally use RL (typically PPO) to fine-tune the base model to maximize that reward signal. ChatGPT and GPT-4 are trained this way. So is Claude, with modifications.</p>
  <p>Anthropic's <strong>Constitutional AI (CAI)</strong> extends RLHF by reducing dependence on human labels for harmful content. Instead of asking humans to rate every potentially harmful response, CAI uses a written "constitution" — a set of principles — and has the model critique and revise its own outputs according to those principles. The result is a model that has internalized values at training time, not just a filter bolted on afterward. This is why Claude's refusals tend to be more nuanced than a keyword block: the model is actually reasoning about harm, not pattern-matching.</p>
  <p>For PMs, the key insight is that model behavior reflects training choices as much as model architecture. When Claude declines a request or formats a response in a particular way, that's a product decision Anthropic made — which means it can change, and you should understand the reasoning. Claude's model card and usage policies are product documentation as much as safety documentation. Read them before building anything that pushes limits.</p>`,
  tasks: [
    { title: 'Read the Constitutional AI paper abstract', description: 'Find Anthropic\'s Constitutional AI paper on arXiv (search "Constitutional AI: Harmlessness from AI Feedback"). Read the abstract and introduction. Summarize the 3 key ideas in your own words. What problem does it solve that RLHF alone doesn\'t?', time: '25 min' },
    { title: 'Design a product constitution', description: 'You are building a customer service AI for a telecom company. Write a 5-point "constitution" — principles the model should follow. Think about: what should it never say? What tone should it maintain? When should it escalate to a human?', time: '25 min' },
    { title: 'Behavioral comparison', description: 'Send the same ambiguous request to Claude and ChatGPT (e.g., "How do I write a persuasive message that gets people to click a link?"). Document the differences in how they respond. What do those differences tell you about their training choices?', time: '20 min' },
    { title: 'Safety-helpfulness tradeoff memo', description: 'Write a 200-word internal memo: "When should an AI product decline a user request vs attempt to help?" Argue for a specific policy. What would you do differently from Claude\'s default behavior?', time: '20 min' },
  ],
  interview: {
    question: 'How does Constitutional AI differ from RLHF and why did Anthropic develop it?',
    answer: `RLHF and Constitutional AI are complementary approaches to the same problem: how do you get a language model to behave well? RLHF solves this by collecting human preference ratings and training a reward model on them. Constitutional AI extends this by using the AI itself to generate and evaluate feedback, guided by a written set of principles (the "constitution"), rather than relying entirely on human raters for harmful content.<br><br>Anthropic developed CAI to address two specific RLHF limitations. First, collecting human labels for harmful content is expensive and exposes labelers to disturbing material. CAI reduces this by having the model critique its own potentially harmful outputs. Second, RLHF preferences can be inconsistent across raters — humans disagree about edge cases. A written constitution provides more stable, auditable principles.<br><br>The product implication is significant: Claude has internalized values at training time, not just a content filter applied post-hoc. This means Claude's handling of edge cases is more reasoning-like than pattern-matching. It's also why Anthropic publishes Claude's model cards and usage policies — the training approach makes those documents meaningful in a way they aren't for models without written constitutions.`
  },
  pmAngle: 'Every AI product implicitly has a "constitution" — a set of rules for what it will and won\'t do. Building one explicitly, before deployment, is better product work than discovering the implicit one through customer complaints.',
  resources: [
    { type: 'PAPER', title: 'Constitutional AI — Anthropic', url: 'https://arxiv.org/abs/2212.08073', note: 'The original CAI paper. Read the abstract, intro, and section 2 at minimum.' },
    { type: 'BLOG', title: 'Claude\'s Model Card', url: 'https://www.anthropic.com/model-card', note: 'Anthropic\'s transparency document on Claude\'s training and behavior.' },
    { type: 'DOCS', title: 'Claude Usage Policy', url: 'https://www.anthropic.com/usage-policy', note: 'What Claude will and won\'t do — essential product documentation.' },
  ]
},

4: {
  subtitle: 'Know the product you\'re building on — Claude\'s capabilities, limits, and strategic positioning.',
  context: `<p>Anthropic's Claude family has three tiers: <strong>Haiku</strong> (fastest, cheapest, 48K output tokens), <strong>Sonnet</strong> (the workhorse — 200K context, best performance-to-cost ratio, the model most products are built on), and <strong>Opus</strong> (most capable reasoning, used for complex tasks where quality justifies cost). As a PM, your model selection decision is really a cost-quality-latency tradeoff: Haiku for high-volume classification and extraction, Sonnet for the majority of tasks, Opus for complex reasoning where accuracy is critical.</p>
  <p>Anthropic's mission — "the responsible development and maintenance of advanced AI for the long-term benefit of humanity" — is not marketing copy. It is an operational constraint that affects what Anthropic builds, what it won't build, and how quickly it moves. The RSP (Responsible Scaling Policy) ties commercial deployment to safety evaluations; Anthropic has committed to slowing down if models reach certain capability thresholds. For PMs, this means understanding that Anthropic's release cadence and feature set are influenced by safety considerations that competitors may not share.</p>
  <p>Claude's strongest areas relative to competitors: <strong>long-context understanding</strong> (200K with high-quality retention), <strong>instruction-following</strong> (especially for structured output and format compliance), <strong>coding</strong> (particularly code explanation and review), and <strong>nuanced refusal handling</strong> (more context-sensitive than many alternatives). Its weaker areas historically: real-time information (no web access by default), image generation (not a capability), and some creative writing benchmarks. Knowing both is essential for honest product positioning.</p>`,
  tasks: [
    { title: 'Build a model selection decision tree', description: 'Create a flowchart: given a use case, which Claude model do you choose? Include decision factors: expected daily request volume, required latency (p99 ms), context length needed, budget per 1M tokens. Test it on 5 different product scenarios.', time: '25 min' },
    { title: 'Research Anthropic\'s hiring to infer strategy', description: 'Go to Anthropic\'s careers page. What are the top 5 open roles by volume? What does the hiring pattern tell you about where Anthropic is investing? Write a 150-word interpretation.', time: '20 min' },
    { title: 'Draft enterprise positioning talking points', description: 'Write 3 reasons an enterprise customer should choose Claude over GPT-4o. Be specific, honest, and focused on use-case-level tradeoffs rather than vague claims about safety.', time: '20 min' },
    { title: 'Identify a Claude limitation that matters for your use case', description: 'What is the biggest technical limitation of Claude for a product you would build? How would you work around it? Document the workaround and its cost.', time: '15 min' },
  ],
  interview: {
    question: 'Why would you choose to build on Claude rather than GPT-4o?',
    answer: `The answer depends entirely on the use case, but here are the scenarios where Claude wins: First, long-context applications. 200K vs 128K tokens matters when you\'re processing full contracts, codebases, or research papers. Claude handles 150-page documents natively; GPT-4o requires chunking. Second, instruction-following fidelity. For products that need highly formatted structured output — JSON, tables, specific document formats — Claude tends to follow instructions more reliably with fewer deviations. Third, nuanced content moderation handling. Claude\'s Constitutional AI training means it reasons about edge cases rather than pattern-matching, which matters for products that touch sensitive content in a professional context (legal, medical, HR).<br><br>I\'d choose GPT-4o when: the customer is on Azure (tighter Microsoft integration), the use case requires GPT-4o\'s vision capabilities on complex layouts, or when strong ChatGPT ecosystem alignment matters (plugins, GPTs). I\'d benchmark both before committing for any production use case — public benchmarks don\'t always predict real-world performance on domain-specific tasks.`
  },
  pmAngle: 'At Anthropic, you will be the person who can explain your own product most honestly — including its limitations. PMs who can articulate both where Claude wins and where it doesn\'t are more trusted by customers and engineers than those who just sell.',
  resources: [
    { type: 'DOCS', title: 'Claude Models Overview', url: 'https://docs.anthropic.com/en/docs/about-claude/models', note: 'Current models, context limits, and capability notes.' },
    { type: 'BLOG', title: 'Anthropic\'s Mission', url: 'https://www.anthropic.com/company', note: 'Read the mission statement carefully — it\'s operational, not decorative.' },
    { type: 'BLOG', title: 'Claude\'s Character', url: 'https://www.anthropic.com/research/claude-character', note: 'How Anthropic thinks about Claude\'s values and personality.' },
  ]
},

5: {
  subtitle: 'Understand OpenAI\'s model strategy to compete, partner, and benchmark effectively.',
  context: `<p>OpenAI operates two distinct businesses from one model family: a <strong>consumer platform</strong> (ChatGPT, 100M+ users, $20-$30/month subscriptions) and an <strong>API business</strong> (GPT-4o, developers building on top). The consumer platform is primarily a distribution play — building habits and brand affinity at scale. The API business is the infrastructure play — becoming the default LLM for production applications. These two businesses have different success metrics, different competitive dynamics, and sometimes different incentives, which creates strategic tension that OpenAI is still navigating.</p>
  <p>The <strong>o1/o3/o4 reasoning series</strong> represents OpenAI's differentiated bet: models that think longer to answer better. These use test-time compute — spending more inference time on harder problems — rather than just training larger models. o3 significantly outperforms GPT-4o on math, coding, and scientific reasoning but costs 10-40x more per token. For PMs, this creates a new tier decision: standard tasks → GPT-4o, complex reasoning → o3. The challenge is that "complex" is user-dependent and hard to route automatically.</p>
  <p>OpenAI's strategic advantages: the largest user base of any AI product, strongest developer ecosystem (most third-party tools are built for OpenAI's API first), Microsoft distribution ($13B investment, Azure OpenAI integration across enterprise), and the o-series reasoning lead. Weaknesses: highest-profile controversies (board drama, safety team departures), premium pricing on reasoning models, and the perception risk of being the company that prioritizes capabilities over safety.</p>`,
  tasks: [
    { title: 'Test o3 on a hard reasoning task', description: 'Use o3 (or o3-mini) on a complex problem: multi-step SQL query, logical puzzle, or architecture decision. Then run the same prompt through GPT-4o. Document where o3\'s answer is meaningfully better. Under what circumstances would you use o3 in production?', time: '25 min' },
    { title: 'GPT Store analysis', description: 'Browse the top 20 custom GPTs on the GPT store. What categories do they fall into? What user problems are most common? Write a 200-word analysis: what do these GPTs tell you about unmet user needs that OpenAI hasn\'t addressed natively?', time: '20 min' },
    { title: 'SWOT analysis: OpenAI model strategy', description: 'Build a 2x2 SWOT matrix for OpenAI\'s model strategy. Be specific — not "strong brand" but "100M ChatGPT users create data flywheel for preference fine-tuning".', time: '20 min' },
    { title: 'Competitive positioning for 3 enterprise use cases', description: 'For each of (a) enterprise code review, (b) contract analysis, (c) customer support automation — write 2 sentences on whether you\'d recommend Claude or GPT-4o and why.', time: '15 min' },
  ],
  interview: {
    question: 'OpenAI released o3 as a reasoning model. How does this change the competitive landscape for AI products?',
    answer: `O3 changes two things: it raises the capability ceiling for complex reasoning tasks, and it creates a new pricing tier that forces product teams to make routing decisions they didn\'t face before.<br><br>On capability: tasks that were previously "AI can\'t do this reliably" — complex multi-step math, advanced code generation, scientific analysis — are now solvable. This opens new product categories (AI tax advisory, AI scientific literature analysis) that weren\'t viable before. For Anthropic, it accelerates the need for Claude\'s extended thinking capability to match this tier.<br><br>On pricing: o3 costs $10-40/million input tokens depending on tier — 2-8x GPT-4o. This makes model routing a real product decision: you can\'t just send everything to o3. Products need to decide what "complex enough" means and build classification layers. This is a new infrastructure cost and a new source of product bugs when routing misclassifies.<br><br>The strategic implication: OpenAI is now competing on two axes — quality (reasoning) and scale (GPT-4o mini). This is a classic good-better-best product ladder, which helps them capture more wallet share at both ends of the market.`
  },
  pmAngle: 'The best AI PMs at Anthropic understand OpenAI deeply — not to dismiss them, but to find the specific gaps where Claude genuinely wins and build products that live in those gaps.',
  resources: [
    { type: 'DOCS', title: 'OpenAI Model Overview', url: 'https://platform.openai.com/docs/models', note: 'All current OpenAI models, capabilities, and pricing.' },
    { type: 'BLOG', title: 'OpenAI o3 System Card', url: 'https://openai.com/index/openai-o3-system-card/', note: 'Safety and capability evaluation results for the o-series.' },
    { type: 'BLOG', title: 'OpenAI Preparedness Framework', url: 'https://openai.com/preparedness/', note: 'OpenAI\'s equivalent of Anthropic\'s RSP — compare the two.' },
  ]
},

6: {
  subtitle: 'Reasoning models change the product calculus — learn when to pay the premium.',
  context: `<p><strong>Reasoning models</strong> — o1, o3, o4, and Claude\'s extended thinking mode — produce significantly better answers on hard problems by spending more inference time "thinking" before responding. The mechanism: these models generate an internal chain-of-thought ("thinking tokens") that isn\'t shown to the user, verify their own reasoning, and revise before outputting a final answer. On AIME math competitions and advanced coding benchmarks, o3 scores 10-30 percentage points above GPT-4o — a genuine, meaningful improvement for hard problems.</p>
  <p>The product-critical nuance: reasoning models are dramatically worse for <em>easy</em> tasks. Asking a reasoning model to extract a name from a document, format a table, or classify sentiment is expensive overkill. The models are optimized for problems where thinking helps — mathematical reasoning, code correctness, multi-step logical deduction — not for throughput tasks. Shipping a product that routes all queries to a reasoning model is both expensive and slow: o3 can take 30-60 seconds to respond. You need routing logic.</p>
  <p>Claude\'s extended thinking mode (in Claude 3.7 Sonnet) follows a similar pattern: the model shows its thinking process explicitly, which users can see. This creates a different UX: you can watch the model reason. Whether to show thinking to users is a genuine product decision — it increases trust and explainability but also increases latency and may expose uncertainty in a way that reduces user confidence. This is a design tradeoff you will face as an AI PM.</p>`,
  tasks: [
    { title: 'Build a routing decision guide', description: 'Define criteria for when to route to a reasoning model vs a standard model. Your criteria should be specific enough to implement as code. Consider: task type, expected response complexity, user-facing latency tolerance, cost per query budget.', time: '25 min' },
    { title: 'Benchmark reasoning on a real task', description: 'Find a complex SQL query, algorithmic problem, or multi-step analysis task. Run it through o3 (or Claude extended thinking) and GPT-4o. Compare quality, latency, and cost. Write up your findings as a product recommendation.', time: '30 min' },
    { title: 'Design the "thinking" UX', description: 'If your product uses a reasoning model, should users see the thinking process? Design two UX approaches: one that shows thinking, one that hides it. What\'s the tradeoff in each? What would you ship?', time: '20 min' },
    { title: 'Cost-model the reasoning premium', description: 'Your product handles 10,000 requests/day. 20% of them are complex enough to benefit from a reasoning model. Calculate the monthly cost difference between (a) routing all to GPT-4o vs (b) routing 20% to o3. Is the quality improvement worth it?', time: '15 min' },
  ],
  codeExample: {
    title: 'Reasoning model routing logic — JavaScript',
    lang: 'js',
    code: `// Route queries to standard vs reasoning models based on complexity signals

const ROUTING_SIGNALS = {
  reasoning: [
    'calculate', 'prove', 'debug', 'analyze', 'optimize', 'compare tradeoffs',
    'write tests', 'architecture', 'why does this fail', 'step by step'
  ],
  standard: [
    'summarize', 'translate', 'extract', 'format', 'classify', 'list',
    'rewrite', 'what is', 'explain briefly', 'draft email'
  ]
};

function routeQuery(query) {
  const q = query.toLowerCase();
  let reasoningScore = 0;
  let standardScore = 0;

  ROUTING_SIGNALS.reasoning.forEach(signal => {
    if (q.includes(signal)) reasoningScore++;
  });
  ROUTING_SIGNALS.standard.forEach(signal => {
    if (q.includes(signal)) standardScore++;
  });

  const queryLength = query.split(' ').length;
  if (queryLength > 50) reasoningScore += 2; // Long queries often complex
  if (queryLength < 15) standardScore += 1;  // Short queries often simple

  const model = reasoningScore > standardScore ? 'o3' : 'gpt-4o';
  const cost = model === 'o3' ? '$0.010/1K tokens' : '$0.005/1K tokens';

  return { model, reasoningScore, standardScore, cost };
}

const queries = [
  "What is the capital of France?",
  "Debug this recursive function and explain why it fails on edge cases, then rewrite it with proper memoization",
  "Summarize this email in 2 sentences",
  "Analyze the architectural tradeoffs between a microservices and monolithic approach for our user auth system, considering team size of 8 engineers",
  "Translate this to Spanish: Good morning"
];

console.log("Query Routing Results:");
console.log("─".repeat(60));
queries.forEach(q => {
  const result = routeQuery(q);
  const preview = q.length > 60 ? q.slice(0, 57) + '...' : q.padEnd(60);
  console.log(preview.slice(0,55).padEnd(55), "->", result.model, "|", result.cost);
});`
  },
  interview: {
    question: 'When would you choose a reasoning model over a standard model for an AI product feature?',
    answer: `I\'d use a reasoning model when three conditions are true: the task has an objectively correct answer or a clearly better answer that extra thinking would find, the latency cost (30-60 seconds) is acceptable for the UX, and the quality improvement justifies the 3-10x cost increase.<br><br>Good candidates: complex code generation (not autocomplete, but writing an algorithm from scratch), financial analysis (multi-step calculations where errors cascade), scientific reasoning, and advanced SQL query writing against complex schemas. Bad candidates: content extraction, summarization, translation, simple Q&A, classification — all tasks where more thinking time doesn\'t improve quality meaningfully.<br><br>In practice, I\'d build a routing layer that classifies queries by complexity and routes the top 10-20% to the reasoning model. The classification itself should use a cheap, fast model. The tricky part is evaluating routing accuracy — you want to catch the high-complexity queries without over-routing, which destroys the cost economics.`
  },
  pmAngle: 'Reasoning models are the first time in AI that "spend more compute at inference time" is a product lever you can pull. Understanding when to flip that lever — and when not to — is a core AI PM competency.',
  resources: [
    { type: 'BLOG', title: 'OpenAI o3 Technical Summary', url: 'https://openai.com/index/openai-o3-mini/', note: 'Technical approach to test-time compute and reasoning.' },
    { type: 'DOCS', title: 'Claude Extended Thinking', url: 'https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking', note: 'How Claude\'s extended thinking mode works and when to use it.' },
    { type: 'BLOG', title: 'Scaling LLM Test-Time Compute', url: 'https://arxiv.org/abs/2408.03314', note: 'Research paper on the reasoning-at-inference-time approach.' },
  ]
},

7: {
  subtitle: 'AI is no longer text-only — learn where vision, voice, and video create product opportunities.',
  context: `<p><strong>Vision</strong> capabilities allow models to analyze images, diagrams, screenshots, and documents alongside text. Claude Vision and GPT-4o Vision can read screenshots, parse complex tables from PDFs, identify objects, and understand charts. For product managers, vision unlocks two categories: <strong>document understanding</strong> (process scanned PDFs, handwritten forms, complex layouts that resist text parsing) and <strong>visual analysis</strong> (quality inspection, content moderation, UI testing, accessibility review). The constraint: vision models are slower and more expensive than text-only calls, and accuracy varies significantly by image complexity.</p>
  <p><strong>Voice</strong> has two distinct components: speech-to-text (Whisper, Deepgram, AssemblyAI) and text-to-speech (OpenAI TTS, ElevenLabs, Amazon Polly). The GPT-4o Realtime API combines both with a conversational model in a single low-latency stream, enabling real-time voice conversations with sub-300ms response time. This powers voice assistants, phone bots, and accessibility features. The product challenge with voice is error recovery: voice input is noisier than text, and users are less tolerant of misunderstandings in voice UX than in chat UX.</p>
  <p><strong>Video</strong> understanding is the frontier capability. Google\'s Gemini 1.5 Pro can analyze hour-long videos; Claude and GPT-4o process video as sequences of frames. Current use cases are emerging: sports analysis, manufacturing defect detection, meeting summarization, security monitoring. As a PM, track video capabilities closely — they will enable product categories that don\'t exist yet, similar to how vision unlocked document processing 2-3 years ago.</p>`,
  tasks: [
    { title: 'Vision API product exercise', description: 'Upload a screenshot of a product dashboard, a form, or a chart to Claude\'s vision capability. Ask it to: (1) extract all text, (2) describe the layout, (3) identify what data is being shown. How accurate is it? Where does it fail? What product would this enable?', time: '25 min' },
    { title: 'Voice interface design', description: 'Choose a product you know. Design a voice interface for one of its features. What does the system prompt look like? How do you handle misrecognition? What happens when the user says something out of scope? Write the full conversation design spec.', time: '25 min' },
    { title: 'Multimodal capability assessment', description: 'For a product you would build: rank vision, voice, and video by (a) user value, (b) technical maturity, (c) competitive differentiation. Which capability would you ship first and why?', time: '15 min' },
    { title: 'Vision use case research', description: 'Find 3 products that have shipped vision-based AI features (not image generation — image understanding). Document each: what problem they\'re solving, how vision is used, and what the failure mode is.', time: '15 min' },
  ],
  interview: {
    question: 'How would you decide whether to add voice, vision, or text capabilities to an AI product first?',
    answer: `I\'d start with three questions: Where is the user\'s primary input modality? What\'s the latency tolerance? And what\'s the failure recovery cost?<br><br>Vision first makes sense when: the existing workflow already involves images (inspecting documents, processing forms, reviewing screenshots) and text extraction is lossy. If your users are currently photographing handwritten forms and manually typing the data, vision is a high-value, low-risk feature. The failure mode is localized — one image fails to parse, you fallback to manual entry.<br><br>Voice first makes sense when: users are mobile or hands-occupied, the interaction is inherently conversational, and you can tolerate some error rate. Customer service replacement, field worker applications, and accessibility features are the strongest voice use cases. But voice has higher failure recovery cost — a misheard command can cause real errors.<br><br>Text first is almost always the right MVP. It\'s cheapest, fastest to iterate, and easiest to evaluate. Add vision or voice when you\'ve validated the core product and identified a specific workflow where multimodal genuinely unlocks more value than improved text UX.`
  },
  pmAngle: 'The most undervalued multimodal capability right now is document vision — the ability to parse complex PDFs, forms, and scanned documents that were previously unstructured. If your target market handles any paper-based workflows, this is your highest-ROI AI feature.',
  resources: [
    { type: 'DOCS', title: 'Claude Vision Guide', url: 'https://docs.anthropic.com/en/docs/build-with-claude/vision', note: 'Image formats, size limits, and best practices for vision prompting.' },
    { type: 'DOCS', title: 'OpenAI Realtime API', url: 'https://platform.openai.com/docs/guides/realtime', note: 'Low-latency voice conversation API — the future of voice products.' },
    { type: 'TOOL', title: 'Whisper API', url: 'https://platform.openai.com/docs/guides/speech-to-text', note: 'Best open-source/API speech-to-text available today.' },
  ]
},

8: {
  subtitle: 'Follow the money — understanding frontier lab economics shapes every product decision.',
  context: `<p>Frontier AI labs run on a paradox: they require billions of dollars in compute to operate, charge prices that often don\'t cover costs, and compete with well-capitalized incumbents (Microsoft, Google, Amazon) who can absorb losses indefinitely. The sustainable version of this business model requires either (a) achieving such strong model quality that customers pay premium prices, (b) achieving scale that brings inference costs down dramatically, or (c) building platform network effects that make switching costly. All three strategies are being pursued simultaneously.</p>
  <p>Revenue streams for frontier labs: <strong>API access</strong> (pay-per-token, the developer and enterprise market), <strong>consumer subscriptions</strong> (ChatGPT Plus at $20/month, Claude Pro at $20/month — high margin at scale), and <strong>enterprise contracts</strong> (negotiated deals with volume discounts, dedicated capacity, and SLAs). Anthropic\'s commercial revenue reportedly passed $1B ARR in 2024, driven primarily by enterprise API contracts. OpenAI is estimated at $3-4B ARR with the majority from ChatGPT subscriptions. These different revenue mixes create different product priorities.</p>
  <p>The cost structure is brutal: training a frontier model costs $50-100M+ in compute alone, and inference costs don\'t decrease nearly as fast as Moore\'s Law would suggest. This is why model distillation, quantization, and speculative decoding are active research areas — they reduce inference costs without sacrificing quality. As a PM, understanding the cost structure helps you understand why labs prioritize efficiency research, why prices decline over time, and why some features (like cheap small models) are strategic even at low margins.</p>`,
  tasks: [
    { title: 'Build a frontier lab business model', description: 'Using public pricing and publicly estimated user numbers, build a simplified P&L for either Anthropic or OpenAI. Revenue = users × subscription rate + API tokens × price. Costs = training (amortized), inference, headcount. What margin can you infer? What needs to be true for this to be profitable?', time: '30 min' },
    { title: 'Compare consumer vs enterprise pricing', description: 'Document the pricing structure for ChatGPT (Free, Plus, Team, Enterprise) and Claude (Free, Pro, Team, Enterprise). What does each tier include? What constraints do the free tiers impose? What\'s the upgrade trigger?', time: '20 min' },
    { title: 'Investment round analysis', description: 'Research Anthropic\'s investment rounds. What did Google and Amazon invest? What were the implied valuations? What does the investment structure tell you about how these investors view Anthropic\'s strategic value?', time: '20 min' },
    { title: 'Mission-commercial tension memo', description: 'Write 200 words: How does the commercial imperative (grow revenue) create tension with Anthropic\'s safety mission (don\'t deploy risky capabilities)? Give a specific example of a potential product feature where this tension would be real.', time: '10 min' },
  ],
  interview: {
    question: 'What are the unit economics of an AI API business, and how do they affect product decisions?',
    answer: `The core unit economics: revenue is tokens times price per token, and cost is tokens times inference cost per token. The margin is the spread. Current margins on inference are thin — especially for large models like Opus or o3 — which is why labs push hard on model efficiency and why cheaper models like Haiku or GPT-4o-mini are strategically important. They\'re often higher-margin despite lower absolute revenue per request.<br><br>Three product implications: First, free tiers are expensive investments in customer acquisition, not genuinely free. Every free API call or free chat message is subsidized. This means free tiers get cut or constrained when cash gets tight. Second, enterprise deals are typically volume discounts in exchange for commit — which locks in revenue but reduces upside if usage grows. PM teams get pressure to maximize contract utilization. Third, model upgrades are complicated: better models cost more to run, so moving users to a better model can hurt margins unless prices increase simultaneously.`
  },
  pmAngle: 'Understanding the economics of your employer is a basic PM competency. At a frontier lab, those economics are unusual — understand them or you\'ll make product prioritization decisions that make no sense commercially.',
  resources: [
    { type: 'BLOG', title: 'Scale AI CEO on AI Business Models', url: 'https://a16z.com/ai-business-models/', note: 'a16z analysis of where AI margins actually live in the stack.' },
    { type: 'DOCS', title: 'Anthropic Pricing', url: 'https://www.anthropic.com/pricing', note: 'Current API and plan pricing — memorize the key tiers.' },
    { type: 'BLOG', title: 'OpenAI Revenue and Costs Analysis', url: 'https://www.theinformation.com/articles/openai-revenue-and-costs', note: 'Best public analysis of frontier lab financials (paywalled but worth it).' },
  ]
},

9: {
  subtitle: 'The API your products will be built on — understand every parameter before your first call.',
  context: `<p>The Anthropic Messages API is the primary interface for building on Claude. Every API call has the same structure: a <strong>model</strong> identifier, a <strong>max_tokens</strong> limit, a <strong>messages</strong> array of user/assistant turns, and an optional <strong>system</strong> prompt. The system prompt is evaluated first and sets the context for everything that follows — it\'s your product\'s personality, constraints, and knowledge. Keep it focused: every token in the system prompt is paid for on every request.</p>
  <p><strong>Streaming</strong> dramatically improves perceived UX. When Claude generates a long response, streaming returns tokens as they\'re generated via Server-Sent Events, rather than waiting for the full response. For a 500-token response at typical speeds, streaming reduces time-to-first-token from ~5 seconds to ~0.5 seconds. This difference between "waiting for the page to load" and "watching it type" significantly affects user experience. Implementing streaming requires slightly different backend code but is almost always worth it for user-facing features.</p>
  <p>Key operational considerations: Anthropic uses a <strong>tiered rate limit</strong> system (Tier 1-4 based on spend history) with separate limits for requests per minute, input tokens per minute, and output tokens per minute. Planning for scale requires understanding which limit you\'ll hit first for your use case. The <strong>Batch API</strong> processes requests asynchronously and costs 50% less — essential for offline workflows like nightly document processing, bulk classification, or eval runs.</p>`,
  tasks: [
    { title: 'Make your first structured API call', description: 'Call the Anthropic Messages API with: (1) a system prompt that gives Claude a specific persona, (2) a multi-turn conversation array with at least 3 turns, (3) a request for JSON output. Verify the response structure. What does the token count look like?', time: '30 min' },
    { title: 'Implement streaming', description: 'Modify your API call from Task 1 to use streaming (stream: true). Display tokens progressively. Measure the time-to-first-token vs non-streaming. Document the implementation difference and the UX difference.', time: '25 min' },
    { title: 'Design the API architecture for a document analysis product', description: 'Sketch the full API call sequence for a user uploading a 50-page contract and asking 5 questions about it. What\'s the system prompt? How are the questions structured? Which model? What\'s the estimated cost per document?', time: '20 min' },
    { title: 'Read the API changelog', description: 'Find Anthropic\'s API changelog or release notes. Identify the 3 most significant changes in the last 6 months. For each, write one sentence on the PM implication.', time: '15 min' },
  ],
  codeExample: {
    title: 'Anthropic API call pattern — JavaScript',
    lang: 'js',
    code: `// Anthropic Messages API call structure (conceptual — uses browser-safe simulation)
// In production: use @anthropic-ai/sdk in Node.js

const ANTHROPIC_API_STRUCTURE = {
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  system: "You are a contract analysis assistant. Extract key terms precisely. Respond in JSON.",
  messages: [
    { role: "user",      content: "What are the payment terms in this contract? [Contract text here]" },
    { role: "assistant", content: '{"payment_terms": "Net 30", "amount": "$50,000"}' },
    { role: "user",      content: "Are there any penalty clauses for late payment?" }
  ]
};

// Simulate token estimation and cost calculation
function simulateAPICall(structure) {
  const systemTokens = Math.ceil(structure.system.split(' ').length / 0.75);
  const messageTokens = structure.messages.reduce((sum, m) => 
    sum + Math.ceil(m.content.split(' ').length / 0.75), 0);
  const inputTokens = systemTokens + messageTokens;
  const outputTokens = structure.max_tokens / 4; // Assume 25% of max used on avg
  
  const costPer1M = { in: 3.00, out: 15.00 };
  const cost = (inputTokens / 1e6 * costPer1M.in) + (outputTokens / 1e6 * costPer1M.out);

  return { systemTokens, messageTokens, inputTokens, outputTokens: Math.round(outputTokens), cost };
}

const result = simulateAPICall(ANTHROPIC_API_STRUCTURE);
console.log("API Call Analysis:");
console.log("System prompt tokens: ", result.systemTokens);
console.log("Message tokens:       ", result.messageTokens);
console.log("Total input tokens:   ", result.inputTokens);
console.log("Expected output:      ", result.outputTokens, "tokens");
console.log("Estimated cost:       $" + result.cost.toFixed(6));
console.log("At 10K calls/day:     $" + (result.cost * 10000 * 30).toFixed(2) + "/month");

// Batch vs real-time comparison
console.log("\nBatch API (50% discount):");
console.log("Same call/month:      $" + (result.cost * 10000 * 30 * 0.5).toFixed(2) + "/month");
console.log("Savings:              $" + (result.cost * 10000 * 30 * 0.5).toFixed(2) + "/month");`
  },
  interview: {
    question: 'Walk me through how you\'d architect a document analysis product on the Anthropic API.',
    answer: `For a document analysis product, I\'d architect four key layers: ingestion, context management, API integration, and output handling.<br><br>Ingestion: convert incoming documents (PDF, DOCX) to clean text using a parsing library. Split documents over 150K tokens into overlapping chunks of ~100K tokens each with 10K overlap to preserve context across splits.<br><br>Context management: the system prompt defines the analysis persona and output format (JSON schema). Keep it under 2K tokens to avoid wasteful spend. User messages contain the document chunk plus specific questions. For multi-turn analysis, summarize earlier findings rather than passing full history.<br><br>API integration: use Claude 3.5 Sonnet for most analysis tasks. Use streaming for user-facing real-time responses, batch API for nightly bulk processing. Implement exponential backoff for rate limit handling. Log all calls with token counts for cost monitoring.<br><br>Output handling: specify JSON output schema in the system prompt, use a validation layer to catch malformed responses, implement a retry with feedback loop (pass failed validation error back to Claude to fix). Cache outputs for identical document+question combinations.`
  },
  pmAngle: 'Every PM building on Claude needs to be able to explain the API call structure clearly — you will review integration code, debug production issues, and estimate infrastructure costs. This isn\'t optional technical depth.',
  resources: [
    { type: 'DOCS', title: 'Anthropic Messages API Reference', url: 'https://docs.anthropic.com/en/api/messages', note: 'Full API reference — read the request and response schemas.' },
    { type: 'DOCS', title: 'Anthropic Streaming Guide', url: 'https://docs.anthropic.com/en/api/messages-streaming', note: 'How to implement SSE streaming in your application.' },
    { type: 'DOCS', title: 'Anthropic Batch API', url: 'https://docs.anthropic.com/en/docs/build-with-claude/message-batches', note: '50% cost reduction for non-real-time workloads.' },
  ]
},

10: {
  subtitle: 'The dominant API in the ecosystem — understand it deeply to compare, compete, and build.',
  context: `<p>The <strong>Chat Completions API</strong> is OpenAI\'s core endpoint and the most widely used LLM API in the world. Its format — a messages array with role/content pairs, plus parameters like temperature and max_tokens — became the de facto standard that most other LLM providers (including Anthropic\'s SDK) closely mirror. Understanding it well means you can evaluate any LLM API quickly. Key addition: JSON mode and structured outputs, which force the model to return valid JSON matching a schema — essential for production extraction pipelines.</p>
  <p>The <strong>Assistants API</strong> adds persistence and state: Threads (conversation histories stored by OpenAI), Files (uploaded documents the assistant can reference), and built-in Tools (code interpreter for running Python in a sandbox, file search for retrieval). The tradeoff vs Chat Completions: Assistants is more feature-complete but more opaque — you don\'t control the exact retrieval behavior, the context management, or the exact system prompt structure. For straightforward products, this is a gift (less code to write). For products needing fine control, it\'s a constraint.</p>
  <p>The <strong>Batch API</strong> processes up to 50,000 requests asynchronously with a 24-hour completion window at 50% of standard pricing. The use case is clear: nightly document processing, bulk content moderation, model evaluation runs, data enrichment pipelines. This is a business model advantage — predictable large-volume workloads that don\'t need real-time responses are dramatically cheaper. Fine-tuning is available for GPT-4o and GPT-3.5-turbo: you upload training examples in JSONL format, trigger a fine-tuning job, and get back a custom model endpoint. Minimum viable training set: 10-50 examples, meaningful improvement: typically 50-500 examples.</p>`,
  tasks: [
    { title: 'Implement structured JSON output', description: 'Call the Chat Completions API with response_format: { type: "json_object" } and a system prompt that specifies a JSON schema. Extract structured data from unstructured text. Test with 5 different inputs — what\'s the failure rate?', time: '25 min' },
    { title: 'Create an Assistant with a file', description: 'Create an OpenAI Assistant with file_search enabled. Upload a PDF (e.g., a product spec or company report). Ask 5 questions that require reading the document. How does the quality compare to a manual RAG implementation?', time: '25 min' },
    { title: 'Chat Completions vs Assistants decision guide', description: 'Write a 1-page guide: when do you use Chat Completions vs Assistants API? Consider: conversation state requirements, retrieval needs, debugging requirements, cost transparency, and latency.', time: '20 min' },
    { title: 'API changelog review', description: 'Review OpenAI\'s API changelog for the last 3 months. List the 3 most significant additions. For each: what use case does it unlock? Does it change your architecture choices?', time: '10 min' },
  ],
  interview: {
    question: 'What\'s the difference between Chat Completions and Assistants API? When would you use each?',
    answer: `Chat Completions is stateless — you send the full conversation history every time, get a response, and that\'s it. You own the state management. Assistants API is stateful — OpenAI stores threads (conversation histories), files, and runs for you. The model and instructions are configured once per assistant, not per request.<br><br>Use Chat Completions when: you need full control over context management (deciding exactly what history to include), you\'re doing simple single-turn tasks, you need maximum transparency for debugging, or you\'re porting to another LLM provider (Chat Completions is the industry standard format). Use Assistants when: you want built-in file retrieval without building RAG, you want conversation history managed for you, or you want code interpreter to run Python in sandboxed environments.<br><br>The key tradeoff is control vs convenience. Assistants is faster to prototype but harder to debug and optimize — you can\'t see exactly what context the model used. Chat Completions gives you full visibility. For production systems handling sensitive data or requiring auditability, Chat Completions is typically the right choice.`
  },
  pmAngle: 'OpenAI\'s API design choices set industry conventions that you will encounter repeatedly. When evaluating any new LLM API, compare it to the Chat Completions standard — compatibility and deviation from it tell you a lot about the provider\'s priorities.',
  resources: [
    { type: 'DOCS', title: 'OpenAI Chat Completions API', url: 'https://platform.openai.com/docs/api-reference/chat', note: 'The industry standard API format — know it cold.' },
    { type: 'DOCS', title: 'OpenAI Assistants API', url: 'https://platform.openai.com/docs/assistants/overview', note: 'When persistence and built-in tools are worth the tradeoff.' },
    { type: 'DOCS', title: 'Structured Outputs', url: 'https://platform.openai.com/docs/guides/structured-outputs', note: 'JSON Schema-constrained output — essential for production extraction.' },
  ]
},

11: {
  subtitle: 'The mechanism behind every AI agent — how models call functions and act on results.',
  context: `<p><strong>Tool use</strong> (also called function calling) is the mechanism that transforms a language model from a text generator into an agent that can act. The pattern: you provide a list of tool definitions in your API call (each with a name, description, and JSON Schema input specification). The model reads the user\'s request, decides whether to use a tool, generates a structured call with the appropriate arguments, and stops. Your application executes the tool, returns the result, and the model incorporates it into its final response. This execute-observe loop is the foundation of every AI agent.</p>
  <p>Writing good <strong>tool descriptions</strong> is a craft skill that directly affects product quality. The model decides when and how to call tools based entirely on the description — if the description is ambiguous, the model will call the wrong tool or pass wrong arguments. Best practices: describe what the tool does, not how it works; specify the expected input format explicitly; describe what the tool returns; include examples of when to use it vs when not to. The JSON Schema parameter definitions are also read by the model — use descriptive field names and enum values wherever possible.</p>
  <p><strong>Parallel tool calls</strong> allow the model to call multiple tools simultaneously in one response — for example, looking up a user\'s account AND checking their subscription status in the same turn. This halves latency for workflows that need multiple data sources. Error handling for tools matters more than many engineers realize: a tool failure mid-agentic-loop can cause the model to hallucinate results rather than propagate the error. Always return structured error responses, not empty or null values.</p>`,
  tasks: [
    { title: 'Design tools for a PM productivity assistant', description: 'You are building an AI assistant for PMs. Define 5 tools it should have: name, description (2-3 sentences), parameters with types and descriptions. Examples: create_jira_ticket, search_confluence, get_user_feedback. Make the descriptions good enough to actually use in an API call.', time: '25 min' },
    { title: 'Test tool call quality', description: 'Take one of your tool definitions from Task 1. Write a system prompt + 5 user messages that should trigger the tool. What fraction of the messages trigger the tool correctly? What messages cause false positives or false negatives? Revise the description to improve accuracy.', time: '25 min' },
    { title: 'Design error handling for a tool-using agent', description: 'Sketch the full error handling flow for an agent that calls 3 tools in sequence. What happens if tool 2 returns an error? What does the user see? What does the agent do? Write the spec.', time: '20 min' },
    { title: 'Research tool calling across providers', description: 'Compare how Claude tool use, OpenAI function calling, and Gemini function declarations differ. Three key differences? Which is easiest to implement? Which gives you the most control?', time: '10 min' },
  ],
  codeExample: {
    title: 'Tool definition and execution pattern — JavaScript',
    lang: 'js',
    code: `// Tool calling pattern — how an AI agent calls functions and processes results

// Tool definitions (sent to the LLM with each request)
const TOOLS = [
  {
    name: "get_user_account",
    description: "Retrieve a user's account details including subscription tier, usage this month, and account status. Use this when the user asks about their account, billing, or access.",
    input_schema: {
      type: "object",
      properties: {
        user_id: { type: "string", description: "The user's unique identifier (email or UUID)" }
      },
      required: ["user_id"]
    }
  },
  {
    name: "search_knowledge_base",
    description: "Search the product documentation and help articles. Use when the user asks a how-to question or needs information about a feature. Returns top 3 relevant articles.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query in natural language" },
        category: { 
          type: "string",
          enum: ["billing", "features", "api", "troubleshooting", "general"],
          description: "Category to narrow the search scope"
        }
      },
      required: ["query"]
    }
  }
];

// Mock tool execution (in production: call your actual APIs)
function executeTool(name, args) {
  if (name === "get_user_account") {
    return { user_id: args.user_id, tier: "Pro", usage_tokens: 245000, limit_tokens: 5000000, status: "active" };
  }
  if (name === "search_knowledge_base") {
    return { articles: [
      { title: "How to upgrade your plan", url: "/docs/billing/upgrade", relevance: 0.95 },
      { title: "Understanding token limits", url: "/docs/api/limits", relevance: 0.82 },
    ]};
  }
  return { error: "Tool not found", tool: name };
}

// Simulate an agent turn
const userMessage = "What's my current usage and how do I find docs on the API limits?";
console.log("User:", userMessage);
console.log("\nLLM decides to call 2 tools in parallel:");

// Simulated tool calls the LLM would generate
const toolCalls = [
  { name: "get_user_account", args: { user_id: "user@example.com" } },
  { name: "search_knowledge_base", args: { query: "API token limits", category: "api" } }
];

toolCalls.forEach(call => {
  const result = executeTool(call.name, call.args);
  console.log("\nTool:", call.name);
  console.log("Args:", JSON.stringify(call.args));
  console.log("Result:", JSON.stringify(result, null, 2));
});

console.log("\nLLM synthesizes tool results into final response...");`
  },
  interview: {
    question: 'How would you design the tool-use architecture for an AI assistant that can interact with 10 different internal systems?',
    answer: `I\'d approach this in layers. First, tool design: each tool needs a name, clear description, and explicit JSON Schema. The hardest part isn\'t the implementation — it\'s writing tool descriptions that are precise enough for the model to select correctly. I\'d invest significant time testing descriptions before building the integrations.<br><br>Second, tool organization: with 10 systems, the model has to reason over a large tool list. I\'d group tools into capability clusters (data retrieval, mutation/write, communication, search) and consider dynamic tool selection — loading only the relevant subset based on the conversation context rather than passing all 10 every time. This reduces cognitive load on the model and improves accuracy.<br><br>Third, error handling: every tool needs a structured error response format. If Salesforce returns a 429 or a network call fails, the tool should return {"error": "rate_limit", "retry_after": 5} — not null or an empty object. The agent loop needs to handle tool errors gracefully, either retrying or communicating the failure to the user, not silently ignoring it.`
  },
  pmAngle: 'Tool use is where language models become agents. Every agentic product feature — from automated workflows to AI assistants — depends on well-designed tools. Writing the tool descriptions is product work, not engineering work.',
  resources: [
    { type: 'DOCS', title: 'Claude Tool Use Guide', url: 'https://docs.anthropic.com/en/docs/build-with-claude/tool-use', note: 'Anthropic\'s guide with examples and best practices.' },
    { type: 'DOCS', title: 'OpenAI Function Calling', url: 'https://platform.openai.com/docs/guides/function-calling', note: 'Industry standard format — structurally similar to Claude tools.' },
    { type: 'BLOG', title: 'Tool Use Best Practices', url: 'https://www.anthropic.com/research/tool-use', note: 'Anthropic\'s research on improving tool calling accuracy.' },
  ]
},

13: {
  subtitle: 'The most-deployed AI architecture — build the retrieval layer that makes models know your data.',
  context: `<p><strong>Retrieval-Augmented Generation (RAG)</strong> solves the fundamental problem that language models don\'t know your private data. The architecture: at query time, retrieve relevant chunks from a vector database, inject them into the model\'s context, and generate a response grounded in retrieved content. This is more reliable than fine-tuning for knowledge because: it\'s updateable (add new documents without retraining), it\'s auditable (you can trace which chunks grounded the answer), and it\'s cheaper to implement. Almost every enterprise AI product with domain-specific knowledge uses RAG.</p>
  <p>The core pipeline has four components, each with product-relevant tradeoffs. <strong>Chunking</strong>: how you split documents affects retrieval quality dramatically. Fixed-size chunks (e.g., 512 tokens) are simple but split logical units mid-sentence. Sentence-boundary chunking is better but may create very small chunks. Recursive character splitting with overlap (e.g., 1000 tokens, 200 overlap) is the most common production approach. <strong>Embedding</strong>: dense vector representations of chunks, generated by a model like text-embedding-3-small. Similar content lands near each other in vector space. <strong>Retrieval</strong>: find the top-k chunks most similar to the query vector. <strong>Generation</strong>: inject retrieved chunks into the prompt and generate a response.</p>
  <p>The most common failure mode is poor retrieval, not poor generation — the model can only answer well if the right chunks are retrieved. <strong>Hybrid search</strong> (combining semantic similarity with keyword BM25 search) typically outperforms pure semantic search in production, especially for domain-specific terminology that embedding models may cluster poorly. <strong>Reranking</strong> — using a second model to reorder the top-k results by relevance — adds another quality layer at modest additional cost.</p>`,
  tasks: [
    { title: 'Sketch a production RAG architecture', description: 'You are building a knowledge base Q&A product for a company\'s internal Confluence. Draw the full data pipeline: document ingestion, chunking, embedding, storage, and query path. Identify which component you would buy vs build. What does the system do when no relevant content is found?', time: '25 min' },
    { title: 'Chunk size experiment', description: 'Take a 2,000-word document (any article or spec). Create chunks at 3 sizes: 256, 512, and 1024 tokens. For each: count how many chunks you get. Write 3 questions about the document. Manually assess: which chunk size would retrieve the most relevant content for each question?', time: '25 min' },
    { title: 'RAG vs fine-tuning decision', description: 'For each of: (a) a customer support bot for a SaaS product, (b) a legal assistant for contract drafting, (c) a code assistant for a company\'s internal frameworks — decide: RAG, fine-tuning, or both? Give a 2-sentence rationale for each.', time: '20 min' },
    { title: 'Update pipeline design', description: 'Documents change. Design the pipeline that keeps your RAG index current when: (a) a document is edited, (b) a document is deleted, (c) 50 new documents are uploaded simultaneously. What are the edge cases?', time: '10 min' },
  ],
  codeExample: {
    title: 'RAG pipeline simulation — JavaScript',
    lang: 'js',
    code: `// Simple RAG simulation: embedding similarity search + context injection
// (Mock embeddings — production uses text-embedding-3-small or similar)

// Simulate document chunks with mock "embeddings" (random vectors for demo)
function mockEmbed(text) {
  // Deterministic hash-based mock embedding (not real similarity!)
  const hash = text.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xFFFFFF, 0);
  return Array.from({length: 8}, (_, i) => Math.sin(hash * (i + 1)) * 0.5);
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (normA * normB);
}

// Simulated knowledge base chunks
const chunks = [
  { id: 1, text: "Claude's context window supports up to 200,000 tokens, enabling processing of full-length books and large codebases.", source: "docs/models.md" },
  { id: 2, text: "API rate limits are tiered: Tier 1 allows 5 requests/minute, Tier 4 allows 4,000 requests/minute.", source: "docs/limits.md" },
  { id: 3, text: "The Batch API processes requests asynchronously and costs 50% less than synchronous calls.", source: "docs/batch.md" },
  { id: 4, text: "Tool use allows Claude to call external functions, APIs, and databases during a conversation.", source: "docs/tools.md" },
  { id: 5, text: "Streaming returns tokens progressively via Server-Sent Events, reducing time-to-first-token significantly.", source: "docs/streaming.md" },
];

// Embed all chunks
const embeddedChunks = chunks.map(c => ({ ...c, embedding: mockEmbed(c.text) }));

function retrieve(query, topK = 2) {
  const queryEmb = mockEmbed(query);
  return embeddedChunks
    .map(c => ({ ...c, score: cosineSimilarity(queryEmb, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// Run retrieval
const queries = [
  "How long can my documents be?",
  "Is there a cheaper way to process large volumes?",
  "Can Claude call my database?"
];

console.log("RAG Retrieval Demo");
console.log("─".repeat(60));
queries.forEach(q => {
  console.log("\nQuery:", q);
  const results = retrieve(q);
  results.forEach((r, i) => {
    console.log(" " + (i+1) + ". [" + r.source + "] " + r.text.slice(0, 80) + "...");
  });
  console.log(" → Inject these chunks into Claude's context to answer the query");
});`
  },
  interview: {
    question: 'Design a RAG system for a legal firm\'s document Q&A product. What are the key architectural decisions?',
    answer: `For a legal RAG system, I\'d focus on three critical decisions that differ from a general RAG implementation:<br><br>First, chunking strategy. Legal documents have logical sections (clauses, sections, exhibits) that must stay together to maintain meaning. I\'d use structural chunking — respecting heading boundaries — rather than fixed token sizes. A clause split across two chunks loses its legal meaning. This requires document structure parsing, not just text splitting.<br><br>Second, retrieval accuracy. Legal queries are often precise ("does this contract have a non-compete clause?"). Hybrid search — BM25 for legal terminology plus dense semantic search — outperforms pure semantic search for domain-specific terms. Add a reranking layer (Cohere Rerank or BGE-reranker) to filter the top-20 retrieved chunks down to top-3 before injection.<br><br>Third, source citation. Lawyers need to know exactly which clause grounded an answer. Every response should cite the specific document, section, and page number. Build citation extraction into the generation prompt and verify against the retrieved chunks — don\'t let the model hallucinate citation sources.`
  },
  pmAngle: 'RAG is the most-deployed AI architecture in enterprise software. Understanding it deeply — especially the retrieval quality problem — makes you a more credible technical PM. The failure mode is almost always poor retrieval, not poor generation.',
  resources: [
    { type: 'GUIDE', title: 'Anthropic RAG Guide', url: 'https://docs.anthropic.com/en/docs/build-with-claude/embeddings', note: 'Embeddings and retrieval best practices from Anthropic.' },
    { type: 'DOCS', title: 'LangChain RAG Tutorial', url: 'https://python.langchain.com/docs/tutorials/rag/', note: 'End-to-end RAG implementation walkthrough.' },
    { type: 'PAPER', title: 'RAG Original Paper', url: 'https://arxiv.org/abs/2005.11401', note: 'Facebook AI Research\'s original RAG paper — foundational reading.' },
  ]
},

14: {
  subtitle: 'When to adapt a model vs when to prompt better — the decision that shapes your AI architecture.',
  context: `<p><strong>Fine-tuning</strong> updates a model\'s weights on a curated training dataset to improve performance on a specific task or domain. It\'s appropriate when: you need strong format consistency that\'s hard to achieve through prompting, the task requires domain-specific vocabulary that general models handle poorly, you\'re doing high-volume inference where a smaller fine-tuned model can replace a larger general one, or you have proprietary behavioral patterns that can\'t be exposed in a system prompt. It is not appropriate when: your training data is small (<50 high-quality examples), the problem can be solved with better prompting, or your domain knowledge changes frequently (fine-tuned models are static snapshots).</p>
  <p><strong>Distillation</strong> trains a smaller "student" model to mimic a larger "teacher" model by generating synthetic training data from the teacher\'s outputs. The product use case: you develop prompts on GPT-4o or Claude 3.5 Sonnet, then distill to a smaller, cheaper model for production. This gives you the quality of a large model\'s outputs at the inference cost of a small model. OpenAI explicitly allows distillation into their fine-tuning pipeline using outputs from their models (with limits). Anthropic has similar policies. This is increasingly the recommended path for production deployments.</p>
  <p>The data requirements are a real constraint. For meaningful fine-tuning improvements: 50 examples minimum, 500-1000 for reliable results, 10,000+ for strong domain adaptation. Quality matters enormously more than quantity — 100 perfect examples beat 1,000 mediocre ones. Data collection is usually the hardest part, not the technical fine-tuning process itself. Budget 80% of your time and effort for data quality and 20% for the actual fine-tuning operation.</p>`,
  tasks: [
    { title: 'Fine-tuning decision audit', description: 'Identify 3 AI product features where fine-tuning would clearly outperform prompting. For each: what data would you need, how would you collect it, and what\'s the estimated data collection cost assuming $20/hour for data labelers?', time: '25 min' },
    { title: 'Design a data collection workflow', description: 'You want to fine-tune a model for customer support at a SaaS company. Design the data collection workflow: how do you identify good examples from existing tickets, who reviews them, what quality standards do you apply, and what format do you store them in (JSONL)?', time: '25 min' },
    { title: 'Fine-tune vs prompt comparison', description: 'Take a task where style consistency matters (e.g., writing product changelog entries). Write a system prompt that achieves your desired style. Then design what a fine-tuning dataset for the same task would look like. Which approach gives better results with less ongoing maintenance?', time: '20 min' },
    { title: 'Research successful fine-tuning case studies', description: 'Find 2 published examples of companies that fine-tuned models for specific use cases (search for "OpenAI fine-tuning customer story" or similar). What problem were they solving? What were the results?', time: '10 min' },
  ],
  interview: {
    question: 'A customer wants their AI to always respond in their brand voice. Should you fine-tune or prompt engineer?',
    answer: `This is a classic prompt vs fine-tune decision, and for brand voice specifically, I\'d almost always start with prompting and only fine-tune if prompting fails to achieve the required consistency.<br><br>Arguments for prompting: you can iterate in minutes, you can show the style guide directly in the system prompt, and brand voice changes over time — a fine-tuned model would need retraining. A well-crafted system prompt with 3-5 brand voice examples (few-shot) achieves remarkable consistency for most use cases.<br><br>Arguments for fine-tuning: if the brand voice is very distinctive (unusual tone, technical jargon, specific formatting conventions) and prompt-based approaches consistently produce off-brand outputs after extensive iteration, fine-tuning on 200-500 brand-aligned examples will reliably outperform. Also, fine-tuning lets you remove the style instructions from the system prompt, reducing per-call token cost at high volume.<br><br>My recommendation: do 2 weeks of prompt engineering first. If you can\'t achieve 90% brand consistency with a detailed system prompt and few-shot examples, then invest in fine-tuning data collection.`
  },
  pmAngle: 'The fine-tune vs prompt decision is asked in almost every AI PM interview. Have a clear framework. Most production products are still prompt-engineered — fine-tuning is used less than people expect because prompt engineering is surprisingly effective.',
  resources: [
    { type: 'DOCS', title: 'OpenAI Fine-tuning Guide', url: 'https://platform.openai.com/docs/guides/fine-tuning', note: 'Most comprehensive public guide to model fine-tuning.' },
    { type: 'DOCS', title: 'Anthropic Fine-tuning', url: 'https://www.anthropic.com/news/model-improvements', note: 'Anthropic\'s approach to model customization.' },
    { type: 'PAPER', title: 'Knowledge Distillation Survey', url: 'https://arxiv.org/abs/2006.05525', note: 'Comprehensive survey of distillation techniques.' },
  ]
},

15: {
  subtitle: 'When orchestration adds real value — and when it\'s just complexity.',
  context: `<p><strong>LangChain</strong> is an open-source framework for building LLM applications with composable chains, memory management, and tool integration. Its core abstractions: <strong>LLMChain</strong> (a prompt template + model + output parser), <strong>Sequential chains</strong> (output of one chain becomes input of next), <strong>Agents</strong> (chains that can use tools), and <strong>Memory</strong> (conversation history management). The <strong>LangChain Expression Language (LCEL)</strong> is the modern way to compose chains using pipe syntax: prompt | llm | parser. It\'s more readable and supports streaming and async natively.</p>
  <p>LangChain\'s value is clearest in complex multi-step pipelines where you\'re chaining multiple LLM calls, combining retrieval with generation, and managing complex state. For simple use cases — a single system prompt with conversation history — LangChain adds abstraction without adding value. The framework is sometimes criticized for making simple things complicated and hiding important details (like exact token counts) that matter for cost management. The decision isn\'t "use LangChain or not" — it\'s "use it for the parts where its abstractions help, and use raw API calls for everything else."</p>
  <p><strong>LangSmith</strong> is Anthropic\'s observability sibling product for LangChain — it traces every LLM call, shows the exact prompt sent, tokens used, latency, and output. It\'s indispensable for debugging complex chains where you can\'t tell which step failed. Even if you don\'t use LangChain, the observability model it provides is the right mental model for production AI monitoring: capture inputs, outputs, tokens, latency, and error rates for every LLM call.</p>`,
  tasks: [
    { title: 'Build a simple chain', description: 'Use LangChain (or LangChain\'s Python/JS quickstart) to build: user input → prompt template → Claude/OpenAI → output parser that extracts a specific field as JSON. Time how long it takes to implement vs a direct API call. What did the abstraction give you?', time: '30 min' },
    { title: 'Sequential chain design exercise', description: 'Design (on paper) a 3-step LangChain sequence for: (1) extract key claims from a news article, (2) fact-check each claim against a search API, (3) generate a balanced summary with confidence levels. What could go wrong at each step?', time: '20 min' },
    { title: 'LangSmith trace analysis', description: 'If you have LangSmith access: run a LangChain pipeline and inspect the trace. If not: review LangSmith\'s demo traces at docs.smith.langchain.com. What information does a trace provide that you couldn\'t get from logs alone?', time: '20 min' },
    { title: 'Orchestration framework decision guide', description: 'For 5 different AI product scenarios: decide whether to use LangChain, LlamaIndex, raw API calls, or a custom solution. Write 1-sentence rationale for each choice.', time: '10 min' },
  ],
  interview: {
    question: 'When would you use an orchestration framework like LangChain vs calling the API directly?',
    answer: `I use LangChain when the complexity of the pipeline genuinely benefits from its abstractions — specifically: multi-step chains where I\'m composing 3+ LLM calls with intermediate state, when I need built-in memory management for long conversations, or when I want LCEL\'s composability for a pipeline that I know will evolve significantly.<br><br>I call the API directly when: the use case is a single LLM call with a system prompt and conversation history (the vast majority of production features), when I need precise control over every token in the request (LangChain sometimes adds tokens to prompts without obvious visibility), or when the team is new to AI and I don\'t want the additional abstraction layer obscuring how the API actually works.<br><br>The honest answer is that LangChain\'s value proposition has shifted. For simple use cases, the raw API with a few helper functions is clearer. LangChain is most valuable for RAG pipelines, complex agent workflows, and teams building on top of LlamaIndex integrations. For everything else, I\'d start with the raw API and only add orchestration when the complexity demands it.`
  },
  pmAngle: 'As an AI PM, you don\'t write LangChain code but you make the architectural decisions that determine whether your team uses it. The wrong choice adds tech debt and obscures debugging; the right choice saves weeks of engineering time.',
  resources: [
    { type: 'DOCS', title: 'LangChain Documentation', url: 'https://python.langchain.com/docs/introduction/', note: 'Start with the quickstart and LCEL tutorials.' },
    { type: 'TOOL', title: 'LangSmith', url: 'https://www.langchain.com/langsmith', note: 'Tracing and observability for LangChain applications.' },
    { type: 'DOCS', title: 'LangChain Expression Language', url: 'https://python.langchain.com/docs/expression_language/', note: 'The modern way to compose LangChain chains.' },
  ]
},

16: {
  subtitle: 'The storage layer for AI memory — how products give models access to millions of documents.',
  context: `<p><strong>Embeddings</strong> are dense numerical vector representations of text that capture semantic meaning — similar texts produce similar vectors. They\'re generated by specialized models: OpenAI\'s text-embedding-3-small (1536 dimensions, fast, cheap), text-embedding-3-large (3072 dimensions, higher quality), and Cohere\'s Embed (competitive for multilingual). The key property: cosine similarity between embedding vectors approximates semantic similarity. "The dog ran" and "the canine sprinted" will have high cosine similarity even with no word overlap. This is the foundation of semantic search, RAG, and recommendation systems.</p>
  <p><strong>Vector databases</strong> store embeddings and efficiently retrieve the most similar ones to a query vector. Options: <strong>Pinecone</strong> (managed, easy to start, good at scale), <strong>Weaviate</strong> (open-source, built-in ML capabilities), <strong>Qdrant</strong> (open-source, Rust-based, very fast), and <strong>pgvector</strong> (Postgres extension — best choice if you already use Postgres and don\'t need web-scale throughput). For most early-stage products, pgvector is the right choice: no new infrastructure, SQL integration, easy backups. Only move to a dedicated vector database when query latency at scale becomes a problem.</p>
  <p><strong>Hybrid search</strong> combines semantic (dense) retrieval with keyword (sparse) retrieval using BM25. It consistently outperforms pure semantic search in benchmarks and in practice, particularly for: queries with specific technical terms, product SKUs, or proper nouns that embedding models may not cluster well. The combination strategy: run both retrieval methods, score-normalize the results, and combine with Reciprocal Rank Fusion (RRF). This adds complexity but typically improves recall by 10-20% for domain-specific content.</p>`,
  tasks: [
    { title: 'Embedding similarity exploration', description: 'Generate embeddings for 10 sentences using the OpenAI embeddings API (or test at platform.openai.com/playground). Group them by semantic similarity. Then test: does the embedding model understand your product\'s domain vocabulary correctly? Try 5 industry-specific terms.', time: '25 min' },
    { title: 'Vector database selection decision', description: 'Choose a vector DB for: (a) a startup with 100K documents needing fast prototyping, (b) a company already using Postgres with 1M documents, (c) an enterprise with 100M documents and 10K concurrent users. Write your recommendation and key reasons.', time: '20 min' },
    { title: 'Design the vector schema', description: 'You are building a product that stores user-uploaded documents. Design the schema for your vector database: what metadata fields do you store alongside each embedding? (Document ID, user ID, created_at, chunk index, source URL, etc.) How do you handle filtering?', time: '20 min' },
    { title: 'Latency requirements analysis', description: 'For your vector search to feel "instant" in a chat interface, you need p99 < 200ms. Research: what does that imply for your vector DB choice and index type? What trade-offs between recall and latency exist in approximate nearest neighbor (ANN) algorithms?', time: '15 min' },
  ],
  codeExample: {
    title: 'Cosine similarity and nearest-neighbor search — JavaScript',
    lang: 'js',
    code: `// Vector similarity search simulation
// (Production: use actual embeddings from text-embedding-3-small)

// Mock embeddings for demo (in production: call embeddings API)
const documents = [
  { id: 1, text: "How to cancel my subscription", embedding: [0.8, 0.2, 0.1, 0.5, 0.3] },
  { id: 2, text: "Billing and payment methods", embedding: [0.7, 0.3, 0.2, 0.6, 0.1] },
  { id: 3, text: "How to export my data", embedding: [0.2, 0.8, 0.6, 0.1, 0.4] },
  { id: 4, text: "API rate limits and quotas", embedding: [0.1, 0.2, 0.9, 0.3, 0.7] },
  { id: 5, text: "Integrating with Slack", embedding: [0.3, 0.7, 0.5, 0.2, 0.8] },
  { id: 6, text: "Unsubscribe from emails", embedding: [0.75, 0.25, 0.15, 0.55, 0.25] }, // Similar to doc 1
];

function cosineSim(a, b) {
  const dot = a.reduce((s, ai, i) => s + ai * b[i], 0);
  const normA = Math.sqrt(a.reduce((s, ai) => s + ai * ai, 0));
  const normB = Math.sqrt(b.reduce((s, bi) => s + bi * bi, 0));
  return dot / (normA * normB);
}

function search(query_embedding, topK = 3) {
  return documents
    .map(doc => ({ ...doc, score: cosineSim(query_embedding, doc.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// Simulate query: "How do I stop my subscription?"
const query_embedding = [0.82, 0.18, 0.12, 0.52, 0.28]; // Similar to cancellation docs

console.log('Query: "How do I stop my subscription?"\n');
console.log('Top results:');
console.log('─'.repeat(50));
search(query_embedding).forEach((doc, i) => {
  console.log((i+1) + '. Score: ' + doc.score.toFixed(3) + ' | ' + doc.text);
});

console.log('\nHybrid search would also run BM25 for keyword "subscription"');
console.log('combining both scores with Reciprocal Rank Fusion (RRF)');`
  },
  interview: {
    question: 'Explain how you\'d pick a vector database for a product with 10M documents and 10K users.',
    answer: `At 10M documents with 10K concurrent users, I\'d evaluate three options: pgvector (Postgres), Qdrant, and Pinecone. My decision framework has four dimensions.<br><br>Latency requirements: if I need p99 < 100ms at high concurrency, I\'d lean toward Qdrant (Rust-based, excellent query performance) or Pinecone (fully managed with auto-scaling). pgvector can handle this with the right index (HNSW) and hardware, but requires more tuning.<br><br>Operational overhead: if the team runs Postgres already, pgvector means no new infrastructure, no new backup strategy, no new monitoring setup. That\'s worth a 20-30% latency premium in many cases. Pinecone is fully managed — no ops burden but $400-600/month at this scale.<br><br>Query complexity: if I need hybrid search (combining semantic and keyword), Weaviate and Qdrant have built-in hybrid search. pgvector requires combining with Postgres\'s full-text search, which is doable but more custom.<br><br>My recommendation for most teams: pgvector for prototyping and early production, migrate to Qdrant when query latency at scale becomes a measured problem — not a hypothetical one.`
  },
  pmAngle: 'Vector databases are infrastructure — PMs shouldn\'t manage them, but should understand the cost and performance tradeoffs well enough to challenge architectural decisions and set realistic latency SLAs.',
  resources: [
    { type: 'DOCS', title: 'pgvector Documentation', url: 'https://github.com/pgvector/pgvector', note: 'Best option for most teams already using Postgres.' },
    { type: 'DOCS', title: 'Pinecone Quickstart', url: 'https://docs.pinecone.io/guides/get-started/quickstart', note: 'Fastest path to production vector search.' },
    { type: 'PAPER', title: 'Hybrid Search Paper', url: 'https://arxiv.org/abs/2210.11610', note: 'Why combining dense and sparse retrieval outperforms either alone.' },
  ]
},

17: {
  subtitle: 'LLM inference is expensive at scale — learn the 5 levers that cut costs without cutting quality.',
  context: `<p>AI inference costs can surprise teams that haven\'t done the math before launch. A simple customer support bot sending 1,000 tokens per message at 10,000 messages/day costs approximately $450/month on Claude 3.5 Sonnet — not terrible, but add a 5,000-token system prompt and it\'s $2,250/month. At 100K messages/day it\'s $22,500/month. The first step in cost optimization is accurate cost modeling before you launch, not after you see the bill. Build a cost calculator that takes expected daily requests, average input/output tokens, and model price and gives you a monthly estimate.</p>
  <p><strong>Model routing</strong> is typically the highest-ROI optimization: route simple, repetitive queries to a cheap, fast model (Haiku at $0.25/1M, GPT-4o-mini at $0.15/1M) and only send complex queries to expensive models. A two-level routing strategy — a small classifier model that routes each query — can reduce inference costs by 40-70% with minimal quality degradation if the routing boundary is well-calibrated. The routing classifier itself should be extremely cheap; don\'t use GPT-4o to decide whether to use GPT-4o. <strong>Semantic caching</strong> stores responses to common queries and returns cached results for semantically similar future queries, completely bypassing inference. Cache hit rates of 20-40% are achievable for products with repetitive query patterns.</p>
  <p><strong>Prompt compression</strong> reduces input token count without degrading output quality. Techniques: remove redundant instructions (test which parts of your system prompt are actually needed), use shorter few-shot examples, compress conversation history by summarizing older turns. Anthropic\'s prompt engineering guide shows that more verbose isn\'t always better — a well-structured 500-token system prompt often outperforms a rambling 2,000-token one. The <strong>Batch API</strong> (both Anthropic and OpenAI) processes requests asynchronously at 50% discount for workloads that don\'t need real-time responses.</p>`,
  tasks: [
    { title: 'Build a cost model for your product', description: 'Create a spreadsheet: daily requests × average input tokens × average output tokens × price per million. Calculate monthly cost for 3 scenarios: 1K, 10K, 100K daily requests. At what scale does cost become a problem? What\'s the cost per resolved support ticket?', time: '25 min' },
    { title: 'Prompt compression exercise', description: 'Take a system prompt you\'ve written (or write one for a customer support scenario). It should be 500-1000 tokens. Now cut it by 30% without losing the key behaviors. Run both versions on 5 test inputs and assess quality difference. What can be removed without degrading output?', time: '25 min' },
    { title: 'Design a routing strategy', description: 'Define the routing criteria for your product: what makes a query "simple enough" for Haiku or GPT-4o-mini vs requiring Sonnet? Write the classification logic as pseudocode. What\'s your estimated cost reduction?', time: '20 min' },
    { title: 'Semantic caching feasibility analysis', description: 'For a product you would build: estimate what fraction of queries would be sufficiently similar to benefit from semantic caching. What similarity threshold is appropriate? What are the failure modes (wrong cached answer returned)?', time: '10 min' },
  ],
  codeExample: {
    title: 'Model routing cost calculator — JavaScript',
    lang: 'js',
    code: `// Cost optimizer: route queries to appropriate models based on complexity

const MODELS = {
  'claude-3-haiku':    { inCost: 0.25,  outCost: 1.25,  maxCtx: 200000, latencyMs: 200 },
  'claude-3-5-sonnet': { inCost: 3.00,  outCost: 15.00, maxCtx: 200000, latencyMs: 1500 },
  'claude-3-opus':     { inCost: 15.00, outCost: 75.00, maxCtx: 200000, latencyMs: 3000 },
  'gpt-4o-mini':       { inCost: 0.15,  outCost: 0.60,  maxCtx: 128000, latencyMs: 300 },
  'gpt-4o':            { inCost: 5.00,  outCost: 15.00, maxCtx: 128000, latencyMs: 1200 },
};

function calcMonthlyCost(model, dailyRequests, avgInputTokens, avgOutputTokens) {
  const m = MODELS[model];
  const costPerRequest = (avgInputTokens / 1e6 * m.inCost) + (avgOutputTokens / 1e6 * m.outCost);
  return (costPerRequest * dailyRequests * 30).toFixed(2);
}

// Scenario: customer support product
const scenarios = [
  { name: 'Early stage',   dailyReqs: 1000,   inputTok: 800,  outputTok: 300 },
  { name: 'Growing',       dailyReqs: 10000,  inputTok: 800,  outputTok: 300 },
  { name: 'Scale',         dailyReqs: 100000, inputTok: 800,  outputTok: 300 },
];

console.log('Monthly Cost by Model & Scale');
console.log('─'.repeat(70));
console.log('Scenario'.padEnd(15), ...Object.keys(MODELS).map(m => m.padEnd(22)));

scenarios.forEach(s => {
  const costs = Object.keys(MODELS).map(model => 
    ('$' + calcMonthlyCost(model, s.dailyReqs, s.inputTok, s.outputTok)).padEnd(22)
  );
  console.log(s.name.padEnd(15), ...costs);
});

console.log('\nRouting strategy savings at scale (100K reqs/day):');
const allSonnet = parseFloat(calcMonthlyCost('claude-3-5-sonnet', 100000, 800, 300));
const routed = parseFloat(calcMonthlyCost('claude-3-haiku', 100000 * 0.7, 800, 300)) +
               parseFloat(calcMonthlyCost('claude-3-5-sonnet', 100000 * 0.3, 800, 300));
console.log('All Sonnet:      $' + allSonnet.toFixed(2));
console.log('70/30 routing:   $' + routed.toFixed(2));
console.log('Monthly savings: $' + (allSonnet - routed).toFixed(2), '(' + Math.round((1 - routed/allSonnet)*100) + '% reduction)');`
  },
  interview: {
    question: 'Your AI product is spending $50K/month on LLM inference. Walk me through your cost optimization strategy.',
    answer: `I\'d approach this in four phases, roughly in order of ROI.<br><br>First, instrument everything. Before optimizing, I need to know: average tokens per request broken down by component (system prompt, history, tools, user message), distribution of request complexity, and which request types account for the most spending. Usually 20% of request types drive 80% of cost.<br><br>Second, model routing. If even 50% of requests are simple enough for Haiku or GPT-4o-mini, that\'s a 60-70% cost reduction on those requests. Implement a lightweight classifier, A/B test quality between models on the simple tier, and deploy when quality delta is acceptable. This alone could reduce the $50K by $15-25K.<br><br>Third, prompt compression. Audit the system prompt and remove every instruction that can\'t be linked to a measurable output behavior. Test reduced prompts against a golden set of 100 queries. Most system prompts have 20-30% redundancy that\'s safe to remove.<br><br>Fourth, caching and batching. Implement semantic caching for predictable query types; use the Batch API for any processing that doesn\'t need real-time responses. Target $30K/month — a 40% reduction — as the 90-day goal.`
  },
  pmAngle: 'Cost optimization is a product responsibility, not just an engineering one. The PM who can model costs, understand the levers, and make quality-vs-cost tradeoffs gets real work done. The PM who just says "make it cheaper" without understanding the mechanisms doesn\'t.',
  resources: [
    { type: 'DOCS', title: 'Anthropic Prompt Engineering Guide', url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview', note: 'How to write efficient prompts that don\'t waste tokens.' },
    { type: 'BLOG', title: 'Semantic Caching with GPTCache', url: 'https://github.com/zilliztech/GPTCache', note: 'Open-source semantic caching library for LLM applications.' },
    { type: 'DOCS', title: 'Anthropic Batch API Pricing', url: 'https://docs.anthropic.com/en/docs/build-with-claude/message-batches', note: '50% cost reduction for async workloads.' },
  ]
},

18: {
  subtitle: 'You can\'t improve what you don\'t measure — build the evaluation infrastructure every AI product needs.',
  context: `<p><strong>Evaluations (evals)</strong> are automated tests that measure AI output quality. They\'re the AI equivalent of unit tests: just as you run unit tests before deploying code, you run evals before deploying model changes. Without evals, every model update is a gamble — you don\'t know if quality improved or regressed until customers complain. Public benchmarks (MMLU for general knowledge, HumanEval for code, GPQA for expert reasoning) measure model capability in the abstract. Internal evals measure performance on <em>your specific product tasks</em>, which is the only measure that actually matters for your product.</p>
  <p>Building an internal eval requires: (1) a <strong>golden dataset</strong> — 50-500 representative queries with expected good/bad outputs, curated by humans who understand the domain; (2) an <strong>evaluation function</strong> — how you measure whether an output is good (exact match, reference comparison, LLM-as-judge, human review); and (3) a <strong>regression harness</strong> — running the eval on every model change and alerting when metrics drop. The "LLM-as-judge" pattern — using Claude or GPT-4 to evaluate outputs — scales well and correlates reasonably with human judgments for most quality dimensions, though it has biases (preference for verbose responses, affinity toward own outputs).</p>
  <p>The PM\'s role in evals is under-appreciated. Engineering typically builds the infrastructure, but the PM must define what "good" looks like — the success criteria that become the golden dataset labels and evaluation dimensions. Unclear success criteria produce useless evals. The hardest eval problems are the subjective ones: how do you measure "helpfulness," "brand voice compliance," or "appropriate level of caution"? These require careful rubric design and usually a mix of automated and human evaluation.</p>`,
  tasks: [
    { title: 'Define 5 eval criteria for a support product', description: 'You are the PM for an AI customer support product. Define 5 evaluation dimensions: name, description, measurement method, and what score means "pass." Examples: factual accuracy, tone appropriateness, resolution rate, unnecessary escalation rate, hallucination rate.', time: '25 min' },
    { title: 'Build a golden dataset (20 examples)', description: 'Choose a simple AI task (customer support, document Q&A, or a task you\'d actually build). Write 20 representative input/output pairs that represent high-quality responses. These should be diverse — cover the hard cases, not just the easy ones.', time: '30 min' },
    { title: 'Design a regression testing process', description: 'Your product ships a new Claude model version monthly. Design the process: which evals run automatically? What threshold triggers a rollback? Who reviews marginal cases? How long does the eval cycle take?', time: '15 min' },
    { title: 'Critique LMSYS Chatbot Arena', description: 'Review how LMSYS Chatbot Arena works (lmarena.ai). What are its 3 biggest blind spots as an evaluation method? What would you design differently if you were building an internal eval for an enterprise product?', time: '10 min' },
  ],
  codeExample: {
    title: 'LLM-as-judge eval framework — JavaScript',
    lang: 'js',
    code: `// Evaluation framework: automated quality scoring using LLM-as-judge
// (Conceptual — in production, each eval_call would hit the Anthropic API)

const EVAL_RUBRIC = `
Rate this customer support response on a scale of 1-5 for each dimension:
1. ACCURACY: Is the information correct and complete?
2. TONE: Is it professional, empathetic, and on-brand?
3. ACTIONABILITY: Does it give the user clear next steps?
4. CONCISENESS: Is it appropriately brief (not too long, not too short)?

Respond in JSON: {"accuracy": N, "tone": N, "actionability": N, "conciseness": N, "reasoning": "..."}
`;

// Mock golden dataset
const goldenDataset = [
  {
    id: 'test_001',
    input: "I can't log in and my password reset isn't working",
    expected_min_score: 4.0,
    model_output: "I'm sorry you're having trouble. Please try clearing your browser cache and cookies, then attempt the password reset again. If that doesn't work, I can send a manual reset link to your registered email — which address should I use?"
  },
  {
    id: 'test_002',
    input: "How do I cancel my subscription?",
    expected_min_score: 4.0,
    model_output: "You can cancel your subscription by going to Settings > Billing > Cancel Subscription. Your access continues until the end of your billing period. Is there anything I can help with before you cancel?"
  },
  {
    id: 'test_003',
    input: "Your product is broken and I want a refund NOW",
    expected_min_score: 3.5,
    model_output: "I hear your frustration. Please tell me what's not working and I'll get this resolved immediately or escalate to our billing team for a refund review."
  }
];

// Simulate LLM judge evaluation
function mockEvaluation(output, testCase) {
  // In production: call Claude API with EVAL_RUBRIC + output
  const scores = {
    accuracy: Math.floor(Math.random() * 2 + 4),    // 4 or 5
    tone: Math.floor(Math.random() * 2 + 3),         // 3 or 4
    actionability: Math.floor(Math.random() * 2 + 3),
    conciseness: Math.floor(Math.random() * 2 + 4),
  };
  scores.avg = (Object.values(scores).reduce((a,b) => a+b, 0) / 4).toFixed(1);
  scores.passed = parseFloat(scores.avg) >= testCase.expected_min_score;
  return scores;
}

console.log('Running eval harness on golden dataset...');
console.log('─'.repeat(60));
let passed = 0;
goldenDataset.forEach(tc => {
  const result = mockEvaluation(tc.model_output, tc);
  const status = result.passed ? '✓ PASS' : '✗ FAIL';
  console.log(tc.id + ' | Avg: ' + result.avg + ' | ' + status);
  console.log('  ACC:' + result.accuracy + ' TONE:' + result.tone + ' ACT:' + result.actionability + ' CON:' + result.conciseness);
  if (result.passed) passed++;
});
console.log('\nResults: ' + passed + '/' + goldenDataset.length + ' passed | Threshold: 4.0/5.0');`
  },
  interview: {
    question: 'How would you set up an evaluation framework for an AI feature before launch?',
    answer: `I\'d build it in three stages: definition, implementation, and automation.<br><br>Definition: work with domain experts (customer support leads, lawyers, whoever understands quality) to define 3-5 dimensions that capture "good." For each dimension, write a rubric with explicit criteria for scores 1-5. Then collect a golden dataset: 50-100 queries that represent the real distribution of user inputs, including the hard edge cases. Have 2-3 domain experts independently label each with expected quality scores. Where they disagree, resolve the disagreement — that\'s your most valuable eval data.<br><br>Implementation: build the eval runner (typically: for each test case, call the model, score with LLM-as-judge using your rubric, compare to threshold). Add human review for borderline cases. Run it on the current baseline before any changes, to establish a ground truth score.<br><br>Automation: integrate into CI/CD so evals run on every model change. Set thresholds for automatic pass (ship it), automatic fail (block the change), and human review (marginal). Define who reviews marginal cases and the SLA for that review. This framework means you can ship model changes with confidence and catch regressions before customers see them.`
  },
  pmAngle: 'Evals are the most underinvested capability in most AI product teams. Engineers build products; PMs own the definition of what "good" means. If you don\'t write the rubric and build the golden dataset, no one will, and you\'ll discover your quality problems in production.',
  resources: [
    { type: 'DOCS', title: 'Anthropic Evals Guide', url: 'https://docs.anthropic.com/en/docs/test-and-evaluate/eval-your-prompt', note: 'Anthropic\'s guide to building prompt evaluations.' },
    { type: 'TOOL', title: 'LMSYS Chatbot Arena', url: 'https://lmarena.ai/', note: 'The leading public benchmark for LLM quality — understand its methodology.' },
    { type: 'BLOG', title: 'Hamel Husain: Building LLM Evals', url: 'https://hamel.dev/blog/posts/evals/', note: 'One of the best practical guides to LLM evaluation.' },
  ]
},

19: {
  subtitle: 'Anthropic\'s commitment to slow down before AI becomes dangerous — what it means for products you build.',
  context: `<p>Anthropic\'s <strong>Responsible Scaling Policy (RSP)</strong> is a self-imposed commitment that ties commercial deployment to safety evaluations. It defines <strong>AI Safety Levels (ASL)</strong>: ASL-1 (clearly not dangerous, like a Chess AI), ASL-2 (current models — potentially useful for harm but below meaningful uplift threshold), ASL-3 (models that could provide meaningful assistance to someone attempting mass-casualty attacks with biological, chemical, nuclear, or radiological weapons), and ASL-4 (not yet defined, but implies autonomous replication and self-improvement capabilities). Anthropic commits that if evaluations suggest a model is approaching ASL-3 thresholds, they will implement ASL-3 safeguards before deployment — even if that means slowing down.</p>
  <p>The practical mechanism: before deploying a new model, Anthropic runs a series of <strong>capability evaluations</strong> — tests designed to detect dangerous capabilities like CBRN uplift, autonomous replication, or cyberoffense capabilities that could cause large-scale damage. If a model passes these evaluations (i.e., doesn\'t exhibit the dangerous capabilities at threshold levels), it can be deployed. This is different from standard safety testing — it\'s specifically looking for the capabilities that would require enhanced safeguards, not just refusal behavior. As of early 2025, all deployed Claude models are evaluated as ASL-2.</p>
  <p>For product managers, the RSP has two concrete implications. First, it creates a predictable framework for understanding what Anthropic will and won\'t build: products that would require ASL-3 models face a higher bar, and Anthropic has committed to not deploying them without significant additional safeguards. Second, it creates a reputational moat: enterprise customers who care about AI safety (financial services, healthcare, government) view the RSP as a reason to choose Anthropic over providers without explicit safety commitments. This is a product differentiator as much as a safety document.</p>`,
  tasks: [
    { title: 'Read and summarize the RSP', description: 'Find Anthropic\'s RSP on their website (anthropic.com/responsible-scaling-policy). Read the executive summary. Write 3 bullet points on the biggest implications for someone building a product on Claude. Which ASL level are current Claude models at?', time: '25 min' },
    { title: 'Map your product to the RSP', description: 'Choose a hypothetical AI product (legal AI, medical AI, security research tool, etc.). Identify which features might require RSP review. Which features could be used in ways that create safety concerns? How would you design guardrails?', time: '20 min' },
    { title: 'Write a product safety policy', description: 'Write a 300-word "This AI will never do..." policy for a general-purpose AI assistant. What are your hard limits? What\'s your escalation process for borderline requests? Reference the RSP\'s framework where relevant.', time: '20 min' },
    { title: 'Compare RSP to OpenAI\'s Preparedness Framework', description: 'Both Anthropic\'s RSP and OpenAI\'s Preparedness Framework address dangerous AI capabilities. Find 3 key differences in their approaches. Which framework would make enterprise buyers more confident, and why?', time: '15 min' },
  ],
  interview: {
    question: 'What is Anthropic\'s RSP and how does it affect product decisions?',
    answer: `The RSP — Responsible Scaling Policy — is Anthropic\'s self-imposed framework that links commercial deployment decisions to safety evaluations. It defines capability thresholds (ASL levels 1-4) and commits Anthropic to implementing specific safeguards before deploying models that exceed those thresholds.<br><br>For product decisions, it affects us in three ways. First, feature scope: some product features might be technically possible with advanced models but would fall under ASL-3 evaluation requirements — which means enhanced safeguards, longer review cycles, and potentially delayed launches. As a PM, I need to understand this before committing to a roadmap that depends on capabilities that haven\'t cleared safety evaluation.<br><br>Second, enterprise positioning: the RSP is a competitive differentiator with risk-averse enterprise customers. When selling to a bank, a hospital, or a government agency, the existence of a transparent safety policy with specific commitments is a sales advantage over providers without similar frameworks. I\'d use the RSP actively in positioning conversations.<br><br>Third, product design philosophy: the RSP signals that Anthropic will sometimes say "not yet" to capabilities that are technically possible but not safe to deploy. Building on a platform with that commitment means I can promise my customers that the underlying model provider has similar risk standards to my own product.`
  },
  pmAngle: 'The RSP is not just safety documentation — it\'s a product document. Understanding it lets you position Anthropic\'s products honestly with risk-averse enterprise buyers and design features that align with the safety standards Anthropic has committed to.',
  resources: [
    { type: 'BLOG', title: 'Anthropic Responsible Scaling Policy', url: 'https://www.anthropic.com/responsible-scaling-policy', note: 'The primary document — read the full text, not just summaries.' },
    { type: 'BLOG', title: 'OpenAI Preparedness Framework', url: 'https://cdn.openai.com/openai-preparedness-framework-beta.pdf', note: 'OpenAI\'s equivalent — compare the two approaches directly.' },
    { type: 'BLOG', title: 'Anthropic Safety Research', url: 'https://www.anthropic.com/research', note: 'The safety research that informs the RSP — interpretability, evals, red-teaming.' },
  ]
},

20: {
  subtitle: 'Synthesize Phase 1 — write the strategy document that will define your Phase 2 work.',
  context: `<p>You\'ve spent 19 days building the foundational knowledge that separates a real AI PM from someone with surface-level familiarity. Today\'s capstone asks you to synthesize that knowledge into a written product strategy document — the format you will use in interviews, in product planning, and in design reviews for the rest of your career. The goal is not to produce a perfect document; it\'s to discover where your knowledge is solid and where it\'s still thin, so you know what to review before Phase 2.</p>
  <p>A product strategy document for an AI product should answer: What is the problem worth solving? Who has it, and how severe is it? What does the solution look like, and what makes it technically feasible now (not two years ago)? Which model, architecture (RAG, fine-tune, raw API), and tool-use pattern would you use, and why? What\'s the cost model — can this be a viable business? And how do you know when you\'ve succeeded — what are the evals, the launch metrics, the success criteria? If you can\'t answer all of these coherently in 1,500 words, you\'ve identified your gaps.</p>
  <p>The best strategy documents from strong PM candidates show specificity (not "use an LLM" but "use Claude 3.5 Sonnet with 200K context for full-document ingestion, hybrid RAG for Q&A, and Haiku for high-volume classification"), honest tradeoffs ("I chose Claude over GPT-4o because of the context window, but GPT-4o would be better if the customer is Azure-first"), and a realistic cost model that acknowledges the economics of the approach.</p>`,
  tasks: [
    { title: 'Choose your product concept', description: 'Pick one: (a) AI legal assistant for contract review at SMB law firms, (b) AI code reviewer integrated into GitHub PRs, (c) AI customer support automation for SaaS, (d) AI document Q&A for financial analysts, or (e) something you\'d genuinely build. Write a 2-sentence problem statement: who has the problem and how severe is it?', time: '20 min' },
    { title: 'Write the technical architecture section', description: 'Specify: which Claude model and why, RAG vs fine-tune vs raw API, tool use requirements, expected context window usage, estimated cost per user per month. This should be specific enough for an engineer to start building.', time: '30 min' },
    { title: 'Write the success metrics section', description: 'Define: (a) your primary quality eval metric (what does "good" look like?), (b) your North Star business metric, (c) your guardrail metrics (what would make you roll back?), (d) your launch criteria.', time: '20 min' },
    { title: 'Identify your weakest section', description: 'Re-read your document. Which section is thinnest? What knowledge from Days 1-19 is most relevant to strengthening it? Note this as your top review priority for Phase 2.', time: '10 min' },
  ],
  interview: {
    question: 'Present a 2-minute product strategy for an AI product you\'d build at Anthropic.',
    answer: `Here\'s how a strong answer is structured. Opening (20 seconds): name the specific user problem — "Enterprise legal teams spend 40% of their time on contract review, and existing AI tools hallucinate critical clauses that create liability." Model choice (20 seconds): "I\'d build on Claude 3.5 Sonnet for its 200K context window, which handles full contracts without chunking — a key quality advantage over 128K models." Architecture (30 seconds): "RAG for the firm\'s case law database, structured output JSON for clause extraction, human-in-the-loop for any clause flagged as high-risk. No fine-tuning at MVP." Cost model (20 seconds): "At 500 tokens input, 1,000 tokens output per contract, 100 contracts/user/month, it\'s $0.90/user/month at Sonnet pricing — easily priced at $100/user/month." Success metrics (20 seconds): "Primary eval: extraction accuracy vs lawyer review on 100-document golden set. Launch threshold: 95% accuracy. North Star: billable hours saved per attorney per month." Closing (10 seconds): "I\'d start with a 30-day pilot at 3 law firms before broader launch." This hits all five sections in 2 minutes and demonstrates technical depth, cost awareness, and product rigor.`
  },
  pmAngle: 'The capstone document you produce today is the seed of your portfolio. A PM who can present a coherent AI product strategy — with model selection rationale, architecture, cost model, and evals — in writing and verbally is demonstrably more qualified than one who can only discuss concepts abstractly.',
  resources: [
    { type: 'TEMPLATE', title: 'AI Product Strategy Template', url: 'https://docs.anthropic.com/en/docs/build-with-claude/overview', note: 'Use Anthropic\'s building overview as a structure guide for your strategy doc.' },
    { type: 'BLOG', title: 'Product Spec Writing Guide — Intercom', url: 'https://www.intercom.com/blog/product-spec-template/', note: 'Strong product spec format that transfers well to AI products.' },
    { type: 'BLOG', title: 'How to Write a Product Strategy', url: 'https://www.lennysnewsletter.com/p/product-strategy', note: 'Lenny\'s framework for product strategy — adapt for AI context.' },
  ]
},

});
