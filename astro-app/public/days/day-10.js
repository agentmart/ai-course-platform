// Day 10 — OpenAI API Deep Dive
// Updated: March 2026
// Review changes:
// - Added OpenAI Responses API (2025) as middle ground
// - Updated Assistants API to v2 context
// - Elevated Structured Outputs as recommended approach over JSON mode
// - Added GPT-4.5 mention
// - Updated fine-tuning threshold framing to task-dependent caveat
// - Replaced batch size hardcoding with "verify at docs"
// - Added comparison table task: Chat Completions / Responses / Assistants
// - Added GitHub commit task structure

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

window.COURSE_DAY_DATA[10] = {
  subtitle: 'The dominant API in the ecosystem — understand it deeply to compare, compete, and build.',

  context: `<p>The <strong>Chat Completions API</strong> is OpenAI\u2019s core endpoint and the most widely used LLM API in the world. Its format — a messages array with role/content pairs, plus parameters like temperature and max_tokens — became the de facto standard that most LLM providers (including Anthropic\u2019s SDK) closely mirror. Understanding it well means you can evaluate any LLM API quickly. The most important evolution: <strong>Structured Outputs</strong> with JSON Schema, which forces the model to return valid JSON matching a specified schema. This is now the recommended approach for all production extraction pipelines — not just "when available" but the default. The earlier JSON mode (which only guarantees valid JSON, not schema compliance) is now the legacy fallback.</p>
  <p>The <strong>Assistants API v2</strong> adds persistence and state: Threads (conversation histories stored by OpenAI), Files (uploaded documents), and built-in Tools (code interpreter, file search). The tradeoff vs Chat Completions: Assistants is more feature-complete but more opaque — you don\u2019t control exact retrieval behavior or context management. In 2025, OpenAI introduced the <strong>Responses API</strong> as a more flexible middle ground: it integrates features from both Chat Completions and Assistants (web search, file search, computer use) without requiring the full Assistants threading model. A PM needs to know all three and when to use each.</p>
  <p>The model landscape to know: <strong>GPT-4o</strong> (128K context, multimodal, the workhorse), <strong>GPT-4o-mini</strong> (high-volume cheap tier), <strong>GPT-4.5</strong> (released 2025, positions between 4o and o-series in capability and cost), and the <strong>o-series</strong> (o3, o4-mini for reasoning tasks). The <strong>Batch API</strong> processes requests asynchronously at 50% of standard pricing — verify current batch size limits at OpenAI documentation rather than relying on hardcoded numbers that change.</p>
  <p><strong>Fine-tuning</strong> is available for GPT-4o and GPT-4o-mini via JSONL training data upload. Effectiveness depends heavily on task complexity and data quality — there are no universal minimum example counts. Benchmark on your specific task rather than following generic "50-500 examples" guidance. OpenAI explicitly supports <strong>distillation</strong>: using GPT-4o outputs to fine-tune GPT-4o-mini, giving you large-model quality at small-model inference cost.</p>`,

  tasks: [
    {
      title: 'Implement structured JSON output with schema',
      description: 'Call the Chat Completions API with Structured Outputs: response_format with type "json_schema" and a full JSON Schema definition. Extract structured data from unstructured text (e.g., extract name, role, company, email from a bio paragraph). Test with 5 different inputs. What is the failure rate? Compare to basic JSON mode. Save as /day-10/structured_json_extraction.js.',
      time: '25 min'
    },
    {
      title: 'Build the API comparison table',
      description: 'Create a 3-column comparison: Chat Completions vs Responses API vs Assistants API v2. Rows: state management, context control, tool use, file handling, streaming, debugging transparency, cost attribution, web search, computer use. For each cell, write one sentence on the capability. This is production-useful reference material. Save as /day-10/api_comparison_table.md.',
      time: '25 min'
    },
    {
      title: 'Test the Responses API',
      description: 'If you have API access: make a Responses API call with web search or file search enabled. Compare the developer experience to Chat Completions. If no access: read the documentation and write a 200-word assessment of when the Responses API is the right choice vs Chat Completions. Save as /day-10/responses_api_assessment.md.',
      time: '20 min'
    },
    {
      title: 'API changelog review',
      description: 'Review OpenAI\u2019s API changelog for the last 3 months. List the 3 most significant additions. For each: what use case does it unlock? Does it change architecture choices vs the Anthropic API? Save as /day-10/api_changelog_analysis.md.',
      time: '10 min'
    }
  ],

  codeExample: {
    title: 'Structured Outputs with JSON Schema — JavaScript',
    lang: 'js',
    code: `// OpenAI Structured Outputs — the recommended way to get reliable JSON
// This is now the DEFAULT for production extraction, not JSON mode

// Example: Extract structured contact info from unstructured text
const EXTRACTION_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "contact_extraction",
    strict: true,
    schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full name of the person" },
        role: { type: "string", description: "Job title or role" },
        company: { type: "string", description: "Company or organization name" },
        email: { type: ["string", "null"], description: "Email if mentioned, null otherwise" },
        confidence: {
          type: "string",
          enum: ["high", "medium", "low"],
          description: "Confidence in extraction accuracy"
        }
      },
      required: ["name", "role", "company", "email", "confidence"],
      additionalProperties: false
    }
  }
};

// Simulated API call structure
const apiCallStructure = {
  model: "gpt-4o",
  messages: [
    {
      role: "system",
      content: "Extract contact information from the provided text. Return structured JSON."
    },
    {
      role: "user",
      content: "Met Sarah Chen at the AI summit — she runs product at Anthropic and mentioned their Claude enterprise push. Didn't get her email but she's on LinkedIn."
    }
  ],
  response_format: EXTRACTION_SCHEMA
};

// Expected output (guaranteed to match schema)
const expectedOutput = {
  name: "Sarah Chen",
  role: "Head of Product",
  company: "Anthropic",
  email: null,
  confidence: "medium"
};

console.log("STRUCTURED OUTPUTS — Production Extraction Pattern");
console.log("=".repeat(55));
console.log("\\nAPI call uses response_format with json_schema:");
console.log("  strict: true — guarantees schema compliance");
console.log("  All fields defined with types and descriptions");
console.log("  additionalProperties: false — no unexpected fields");
console.log("\\nExpected output:");
console.log(JSON.stringify(expectedOutput, null, 2));

// API comparison framework
console.log("\\n" + "=".repeat(55));
console.log("OPENAI API DECISION FRAMEWORK (2026)");
console.log("=".repeat(55));

const decisions = [
  { api: "Chat Completions", when: "Full control, stateless, any LLM", tradeoff: "You manage state" },
  { api: "Responses API",    when: "Web search, file search, tools, no thread mgmt", tradeoff: "Newer, less documented" },
  { api: "Assistants v2",    when: "Persistent threads, code interpreter, managed files", tradeoff: "Opaque, harder to debug" },
];

decisions.forEach(d => {
  console.log("\\n" + d.api);
  console.log("  Use when: " + d.when);
  console.log("  Tradeoff: " + d.tradeoff);
});

console.log("\\nStructured Outputs: USE BY DEFAULT for extraction.");
console.log("JSON mode: legacy fallback only.");`
  },

  interview: {
    question: 'What\u2019s the difference between Chat Completions, Responses API, and Assistants API? When would you use each?',
    answer: `OpenAI now has three API surfaces, each suited to different product needs.<br><br><strong>Chat Completions</strong> is stateless — you send the full conversation each time and own state management. Best for: single-turn extraction, simple chatbots where you control history, and any workload that might need to port to another LLM (Claude, Gemini). It\u2019s the industry standard format. Use Structured Outputs (JSON Schema, not basic JSON mode) for all extraction.<br><br><strong>Responses API</strong> (2025) integrates features from both: web search, file search, and tool use without requiring Assistants\u2019 thread management. Best for: agentic tasks requiring web search or document retrieval, products that need tool calling beyond basic function definitions, and teams that want more features than Chat Completions without the opacity of Assistants.<br><br><strong>Assistants v2</strong> provides full persistence: threads, files, code interpreter. Best for: long-running conversations where OpenAI managing state reduces engineering burden, products using code interpreter for data analysis, and internal tools where debugging opacity is acceptable.<br><br>My default: Chat Completions for production (maximum control, portability), Responses API when I need web search or agentic features, Assistants only for internal tools where code interpreter is the killer feature. For sensitive data or auditability requirements, Chat Completions is the right answer because you see exactly what context was used.`
  },

  pmAngle: 'OpenAI\u2019s API design choices set industry conventions. When evaluating any new LLM API, compare it to Chat Completions — compatibility and deviation tell you about the provider\u2019s priorities. Structured Outputs is now the standard for production extraction; if your team is still using basic JSON mode, they\u2019re using the legacy approach.',

  resources: [
    { type: 'DOCS', title: 'OpenAI Chat Completions API', url: 'https://platform.openai.com/docs/api-reference/chat', note: 'The industry standard API format. Know it cold.' },
    { type: 'DOCS', title: 'OpenAI Responses API', url: 'https://platform.openai.com/docs/api-reference/responses', note: 'New in 2025. Web search, file search, tools without thread management.' },
    { type: 'DOCS', title: 'OpenAI Assistants API v2', url: 'https://platform.openai.com/docs/assistants/overview', note: 'Persistent threads and code interpreter. Best for internal tools.' },
    { type: 'DOCS', title: 'Structured Outputs', url: 'https://platform.openai.com/docs/guides/structured-outputs', note: 'JSON Schema-constrained output. The default for production extraction — not JSON mode.' },
    { type: 'DOCS', title: 'OpenAI Fine-tuning', url: 'https://platform.openai.com/docs/guides/fine-tuning', note: 'Fine-tuning + distillation workflow for GPT-4o → GPT-4o-mini.' },
    { type: 'DOCS', title: 'OpenAI Batch API', url: 'https://platform.openai.com/docs/guides/batch', note: '50% cost reduction for async workloads. Verify current limits at docs.' }
  ]
};
