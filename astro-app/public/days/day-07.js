// Day 07 — Multimodal AI (Vision, Voice, Video)
// Updated: March 2026
// Review changes:
// - Added native PDF support in Claude API (2024)
// - Updated video: "production-ready" not "frontier/emerging"
// - Added structured form extraction as high-value enterprise use case
// - Added computer use as "vision plus action" seed (Day 25 forward reference)
// - Updated audio landscape: added ElevenLabs, expanded ecosystem
// - Updated GPT-4o Realtime API to production status
// - Added practical multimodal task: invoice processing with structured output
// - Added GitHub commit task structure

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

window.COURSE_DAY_DATA[7] = {
  subtitle: 'AI is no longer text-only — learn where vision, voice, and video create the highest-value product opportunities.',

  context: `<p><strong>Vision</strong> capabilities allow models to analyze images, diagrams, screenshots, and documents alongside text. Claude Vision and GPT-4o Vision can read screenshots, parse complex tables from PDFs, identify objects, and understand charts. For product managers, vision unlocks two categories: <strong>document understanding</strong> (process scanned PDFs, handwritten forms, complex layouts that resist text parsing) and <strong>visual analysis</strong> (quality inspection, content moderation, UI testing, accessibility review). The highest-value, highest-deployment multimodal use case in enterprise AI today is <strong>structured form extraction</strong> — W2s, invoices, medical forms, insurance claims. Claude Vision combined with structured JSON output handles this extremely well and is now a core production pattern.</p>
  <p>A critical 2024 addition: <strong>native PDF support</strong> in the Claude API. You can now pass PDF files directly to the API rather than converting them to images first. This significantly simplifies document processing architecture — no more PDF-to-image conversion pipelines, better text extraction quality, and support for complex layouts with tables, charts, and mixed content. For any PM designing a document processing product, this capability removes an entire layer of infrastructure complexity. Source: <a href="https://docs.anthropic.com/en/docs/build-with-claude/pdf-support" target="_blank">Anthropic PDF support docs</a>.</p>
  <p><strong>Voice</strong> has two distinct components: speech-to-text (Whisper, Deepgram, AssemblyAI) and text-to-speech (OpenAI TTS, ElevenLabs, Amazon Polly). The <strong>GPT-4o Realtime API</strong> is now production-available, combining speech understanding and generation with a conversational model in a single low-latency stream for real-time voice conversations. ElevenLabs has become a major player in voice generation with highly realistic voice cloning. The product challenge with voice remains error recovery: voice input is noisier than text, and users are less tolerant of misunderstandings than in chat UX.</p>
  <p><strong>Video</strong> understanding is now <strong>production-ready</strong>, not just a research frontier. Google\u2019s Gemini 2.5 Pro can analyze hour-long videos natively within its 1M+ token context. Claude and GPT-4o process video as sequences of frames. Current production use cases: meeting summarization, manufacturing defect detection, sports analysis, security monitoring, and content moderation at scale. The "frontier" framing from 2024 is now outdated — video AI products are shipping.</p>
  <p><strong>Vision plus action = computer use.</strong> The natural evolution of vision capabilities leads to computer use (covered in depth on Day 25): vision enables an AI to <em>read</em> UIs and screens; computer use enables it to <em>interact</em> with them. This progression — from passive understanding to active interaction — is the trajectory that defines the agentic product landscape. Day 7 builds the foundation; Day 25 adds the action layer.</p>`,

  tasks: [
    {
      title: 'Process an invoice or form with Claude Vision',
      description: 'Upload a real invoice, receipt, or form (redact any personal info) to Claude Vision. Ask it to: (1) extract all text, (2) return structured JSON with specific fields (vendor, amount, date, line items). Test with 3 different document formats. How accurate is the extraction? Where does it fail? What product would this enable? Save results as /day-07/vision_extraction_exercise.md.',
      time: '25 min'
    },
    {
      title: 'Voice interface design',
      description: 'Choose a product you know. Design a voice interface for one of its features. Include: system prompt, happy path conversation flow, misrecognition recovery, out-of-scope handling, and escalation to human. What does error recovery look like in voice vs text? Save as /day-07/voice_interface_spec.md.',
      time: '25 min'
    },
    {
      title: 'Multimodal capability assessment',
      description: 'For a product you would build: rank vision, voice, and video by (a) user value delivered, (b) current technical maturity and reliability, (c) competitive differentiation. Which capability would you ship first and why? Also consider: would native PDF support change your document processing architecture? Save as /day-07/multimodal_capability_ranking.md.',
      time: '15 min'
    },
    {
      title: 'Vision use case research',
      description: 'Find 3 products that have shipped vision-based AI features (not image generation — image understanding). Document each: problem solved, how vision is used, failure modes, and whether native PDF support would improve the architecture. Save as /day-07/vision_product_research.md.',
      time: '15 min'
    }
  ],

  codeExample: {
    title: 'Multimodal request builder & router — JavaScript',
    lang: 'js',
    code: `// Day 07 — Multimodal Request Builder & Use-Case Router
//
// In 2026, "send text to an LLM" is the simplest case. Real product work
// is composing requests that mix text, images, PDFs, and audio, and
// routing the right combination to the right model. This script builds
// strongly-typed request shapes you'd send to the Anthropic Messages API
// (claude-sonnet-4-6 supports native PDF + image input) and routes
// representative enterprise use cases to the cheapest viable model.
//
// No network calls — everything below is a pure data structure builder.

const MODELS = {
  haiku:  { name: 'claude-haiku-4-5-20251001', vision: true,  pdf: true,  audio: false },
  sonnet: { name: 'claude-sonnet-4-6',         vision: true,  pdf: true,  audio: false },
  opus:   { name: 'claude-opus-4-6',           vision: true,  pdf: true,  audio: false },
  gpt4o:  { name: 'gpt-4o',                    vision: true,  pdf: false, audio: true  },
};

// --- Content block constructors -----------------------------------------
const text   = (s)      => ({ type: 'text',     text: s });
const image  = (b64)    => ({ type: 'image',    source: { type: 'base64', media_type: 'image/png', data: b64 } });
const pdf    = (b64)    => ({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } });
const audio  = (b64)    => ({ type: 'input_audio', source: { type: 'base64', media_type: 'audio/wav', data: b64 } });

function buildRequest({ model, system, blocks, maxTokens = 1024 }) {
  return {
    model: model.name,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: blocks }],
  };
}

// --- Use-case router -----------------------------------------------------
// Picks the cheapest model that supports every required modality.
function route(useCase) {
  const need = useCase.modalities;
  const order = [MODELS.haiku, MODELS.sonnet, MODELS.opus, MODELS.gpt4o];
  for (const m of order) {
    const ok = need.every((mod) => m[mod]);
    if (!ok) continue;
    if (useCase.needsHighReasoning && m === MODELS.haiku) continue;
    return m;
  }
  return null;
}

// --- Demo use cases ------------------------------------------------------
const FAKE_B64 = 'AAAA';

const useCases = [
  {
    id: 'invoice-extraction',
    description: 'Extract line items from a vendor PDF invoice.',
    modalities: ['pdf'],
    needsHighReasoning: false,
    blocks: [text('Extract vendor, total, and line items as JSON.'), pdf(FAKE_B64)],
  },
  {
    id: 'safety-photo-triage',
    description: 'Field worker uploads a hazard photo for triage.',
    modalities: ['vision'],
    needsHighReasoning: false,
    blocks: [text('Classify hazard severity (low/med/high) and explain.'), image(FAKE_B64)],
  },
  {
    id: 'voice-call-summary',
    description: 'Summarize a customer support call recording.',
    modalities: ['audio'],
    needsHighReasoning: false,
    blocks: [text('Summarize the call and extract action items.'), audio(FAKE_B64)],
  },
  {
    id: 'm-and-a-diligence',
    description: 'Read a 100-page target deck plus financials PDF.',
    modalities: ['pdf', 'vision'],
    needsHighReasoning: true,
    blocks: [text('Identify revenue concentration risks and red flags.'), pdf(FAKE_B64), image(FAKE_B64)],
  },
];

// --- Run -----------------------------------------------------------------
console.log('Multimodal routing — 2026 lineup\\n');
for (const uc of useCases) {
  const model = route(uc);
  if (!model) {
    console.log(\`SKIP \${uc.id}: no model supports \${uc.modalities.join('+')}\`);
    continue;
  }
  const req = buildRequest({
    model,
    system: 'You are a careful enterprise assistant. Cite the source block when possible.',
    blocks: uc.blocks,
  });
  console.log('use case  :', uc.id);
  console.log('purpose   :', uc.description);
  console.log('routed to :', model.name);
  console.log('blocks    :', req.messages[0].content.map((b) => b.type).join(', '));
  console.log('---');
}

// --- Capability matrix ---------------------------------------------------
console.log('\\nModel capability matrix:');
console.log('model'.padEnd(32), 'vision', 'pdf', 'audio');
for (const m of Object.values(MODELS)) {
  console.log(
    m.name.padEnd(32),
    String(m.vision).padEnd(6),
    String(m.pdf).padEnd(3),
    String(m.audio),
  );
}

console.log('\\nPM takeaway: native PDF on Claude eliminates an entire ' +
  'pre-processing pipeline. For voice, route to a speech-capable model ' +
  '(or a separate STT step) — Claude is text+vision+PDF first.');
`,
  },

  interview: {
    question: 'How would you decide whether to add voice, vision, or text capabilities to an AI product first?',
    answer: `I start with three questions: Where is the user\u2019s primary input modality? What\u2019s the latency tolerance? And what\u2019s the failure recovery cost?<br><br><strong>Vision first</strong> when the existing workflow involves documents or images. If users photograph forms and manually type data, vision-based extraction is high-value and low-risk. Anthropic\u2019s native PDF support (no image conversion needed) simplifies this significantly. Structured form extraction — W2s, invoices, medical forms — is now the highest-deployment enterprise multimodal use case, and Claude Vision plus structured JSON output handles it well. The failure mode is localized: one document fails to parse, fallback to manual entry.<br><br><strong>Voice first</strong> when users are mobile or hands-occupied and the interaction is conversational. The GPT-4o Realtime API makes sub-300ms voice conversations production-viable. But voice has higher failure recovery cost — a misheard command causes real errors, and users are less tolerant of voice errors than text errors.<br><br><strong>Text first</strong> is almost always the right MVP. Cheapest, fastest to iterate, easiest to evaluate. Add vision or voice when you\u2019ve validated the core product and identified a specific workflow where multimodal genuinely unlocks more value than improved text UX.<br><br><strong>Video</strong> is now production-ready for specific use cases (meeting summarization, manufacturing QA, content moderation). It\u2019s no longer "emerging" — the question is whether your specific use case has enough video content to justify the compute cost.`
  },

  pmAngle: 'The most undervalued multimodal capability in enterprise AI is document vision — specifically, structured form extraction from complex PDFs, invoices, and forms. Claude\u2019s native PDF support eliminates the image conversion pipeline entirely. If your target market handles any paper-based or document-heavy workflows, this is your highest-ROI AI feature — and it\u2019s production-ready today.',

  resources: [
    { type: 'DOCS', title: 'Claude Vision Guide', url: 'https://docs.anthropic.com/en/docs/build-with-claude/vision', note: 'Image formats, size limits, and vision prompting best practices.' },
    { type: 'DOCS', title: 'Claude PDF Support', url: 'https://docs.anthropic.com/en/docs/build-with-claude/pdf-support', note: 'Native PDF processing — no image conversion needed. Major architecture simplification.' },
    { type: 'DOCS', title: 'OpenAI Realtime API', url: 'https://platform.openai.com/docs/guides/realtime', note: 'Production-available low-latency voice conversations. The reference for voice AI products.' },
    { type: 'DOCS', title: 'Whisper API', url: 'https://platform.openai.com/docs/guides/speech-to-text', note: 'Best general-purpose speech-to-text API. Also available open-source.' },
    { type: 'TOOL', title: 'ElevenLabs', url: 'https://elevenlabs.io/', note: 'Leading voice generation and cloning. Major player in voice AI since 2024.' },
    { type: 'DOCS', title: 'Gemini 2.5 Pro — Multimodal', url: 'https://ai.google.dev/gemini-api/docs/models', note: '1M+ token context supports hour-long video analysis natively.' }
  ]
};
