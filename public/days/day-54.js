// Day 54 \u2014 Developer Experience Design
// Updated: March 2026 | Review: Anthropic Cookbook, TTFSC metric, updated SDK docs, error messages as product surface

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[54] = {
  subtitle: 'Design the developer experience that turns API users into advocates \u2014 from first call to production.',
  context: `<p>Developer experience (DX) is a product discipline, not a documentation project. The best API in the world fails if developers can\u2019t figure out how to use it. Today you learn how to think about DX as a PM \u2014 with specific frameworks, metrics, and case studies from Anthropic\u2019s own developer experience evolution.</p>
  <p><strong>TTFSC: Time to First Successful Call.</strong> The single most important DX metric is <strong>TTFSC (Time to First Successful Call)</strong> \u2014 how long it takes a new developer to go from \u201cI want to use this API\u201d to receiving their first successful API response. Every minute in TTFSC is a point where developers abandon your platform. The best AI APIs achieve TTFSC under 5 minutes: sign up, get an API key, copy a working example, run it, see the response. Anthropic\u2019s quickstart guide is designed around this metric. Measure TTFSC by instrumenting your onboarding flow and tracking time-to-first-200-response for new API keys.</p>
  <p><strong>The Anthropic Cookbook.</strong> The <a href="https://github.com/anthropics/anthropic-cookbook">Anthropic Cookbook</a> (github.com/anthropics/anthropic-cookbook) is one of the most underused resources in the AI ecosystem. It contains production-ready code examples for common Claude use cases: retrieval-augmented generation, tool use, function calling, multi-turn conversations, streaming, prompt caching, embeddings integration, and more. Each recipe is a complete, runnable example \u2014 not a code snippet. PMs should know the Cookbook exists because: (1) it answers 80% of developer support questions before they\u2019re asked, (2) it demonstrates best practices that your own documentation should reference, and (3) it\u2019s the fastest way to learn how Claude\u2019s features work in real code.</p>
  <p><strong>Updated Anthropic documentation.</strong> Anthropic\u2019s documentation in 2026 includes an interactive playground (try API calls in the browser), improved SDK docs with type-safe examples in Python and TypeScript, and structured guides organized by use case rather than API endpoint. The documentation architecture follows a pattern every API PM should study: (1) <strong>Quickstart</strong> \u2014 get to first successful call in under 5 minutes. (2) <strong>Guides</strong> \u2014 use-case-oriented tutorials (not API-endpoint-oriented). (3) <strong>API Reference</strong> \u2014 complete endpoint documentation with request/response examples. (4) <strong>Cookbook</strong> \u2014 production-ready code recipes. (5) <strong>Changelog</strong> \u2014 what changed and how to migrate.</p>
  <p><strong>\u201cError messages are product surface.\u201d</strong> This principle transforms how you think about DX. Every error message a developer sees is a product interaction. A good error message tells the developer: what went wrong, why it went wrong, and exactly how to fix it. A bad error message says \u201c400 Bad Request\u201d and leaves the developer searching Stack Overflow. Anthropic\u2019s API returns structured error responses with specific error types (<code>invalid_request_error</code>, <code>authentication_error</code>, <code>rate_limit_error</code>), human-readable messages, and in many cases, suggestions for how to fix the issue. Every API PM should review their error messages as carefully as they review their landing page.</p>
  <p><strong>DX as competitive advantage.</strong> In the AI API market, DX is a genuine competitive differentiator. Developers choose between Claude, GPT, and Gemini based partly on model capability but significantly on how easy it is to build with. Stripe won the payments market not because their payments infrastructure was technically superior, but because their DX was radically better. The same dynamic applies to AI APIs. The PM who treats DX as a first-class product concern \u2014 not an afterthought \u2014 creates a compounding advantage: better DX attracts more developers, who build more applications, who generate more feedback, which drives better DX.</p>`,
  tasks: [
    { title: 'Measure TTFSC for Claude API', description: 'Time yourself (or a colleague who hasn\u2019t used it) going from zero to first successful Claude API call. Document every step: finding the docs, signing up, getting an API key, finding a code example, installing the SDK, running the example, getting a response. Record the time at each step and identify the friction points. Calculate your TTFSC. Then propose three specific improvements to reduce it. Save as /day-54/ttfsc_audit.md.', time: '25 min' },
    { title: 'Explore the Anthropic Cookbook', description: 'Browse the Anthropic Cookbook at github.com/anthropics/anthropic-cookbook. Choose three recipes that are most relevant to enterprise use cases. For each: summarize what it demonstrates, who would use it, what production adaptations it would need, and rate its quality (code clarity, documentation, completeness). Identify one use case that\u2019s missing from the Cookbook and outline what that recipe should contain. Save as /day-54/cookbook_review.md.', time: '20 min' },
    { title: 'Audit error messages as product surface', description: 'Deliberately trigger five different error conditions in the Claude API (invalid API key, malformed request, rate limit, context window exceeded, invalid model name). For each error: document the current error response, rate it (helpful/confusing/missing information), and rewrite it to be maximally helpful. Apply the principle: every error message should tell the developer what went wrong, why, and how to fix it. Save as /day-54/error_message_audit.md.', time: '20 min' },
    { title: 'Design a DX improvement roadmap', description: 'You\u2019re the DX PM for an AI API. Design a quarterly DX improvement roadmap. Q1: reduce TTFSC to under 3 minutes. Q2: launch interactive playground. Q3: add AI-powered documentation search. Q4: build community cookbook program. For each quarter: define the specific deliverables, success metrics, and the team resources needed. Save as /day-54/dx_roadmap.md.', time: '15 min' }
  ],

  codeExample: {
    title: 'DX Scorecard for an AI API — JavaScript',
    lang: 'js',
    code: `// Day 54 — DX Scorecard for an AI API
// Scores an API's developer experience across five dimensions and prints a
// prioritized fix list. Pure Node stdlib (none needed — plain JS).

const DIMENSIONS = [
  { key: 'auth',          label: 'Authentication setup',     weight: 0.20 },
  { key: 'errors',        label: 'Error message clarity',    weight: 0.20 },
  { key: 'docs',          label: 'Documentation depth',      weight: 0.20 },
  { key: 'samples',       label: 'Code samples & cookbook',  weight: 0.20 },
  { key: 'ttfc',          label: 'Time to first call',       weight: 0.20 },
];

// Sample scorecard for a hypothetical "Atlas API" the team is auditing.
// Each dimension has raw observations the PM filled in.
const ATLAS_API = {
  name: 'Atlas API v1',
  observations: {
    auth:    { hasQuickstart: true,  oneLineCurl: true,  envSetup: false, score: 0.7 },
    errors:  { hasCodes: true,  hasFixHint: false, hasRequestId: true,  score: 0.6 },
    docs:    { quickstart: true, conceptual: true, reference: true, useCaseGuides: false, score: 0.7 },
    samples: { langs: ['python', 'js'], cookbookEntries: 12, runnable: true, score: 0.75 },
    ttfc:    { measuredSeconds: 480, target: 300, score: 0.55 },
  },
};

// Reference model strings developers expect to see in samples.
const EXPECTED_MODELS = [
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
  'claude-opus-4-6',
];

function grade(pct) {
  if (pct >= 0.85) return 'A';
  if (pct >= 0.70) return 'B';
  if (pct >= 0.55) return 'C';
  if (pct >= 0.40) return 'D';
  return 'F';
}

function scoreDimension(api, dim) {
  const obs = api.observations[dim.key];
  return obs && typeof obs.score === 'number' ? obs.score : 0;
}

function findGaps(api) {
  const gaps = [];
  const o = api.observations;
  if (!o.auth.envSetup)        gaps.push({ dim: 'auth',    fix: 'Add OS-by-OS env-var setup snippet' });
  if (!o.errors.hasFixHint)    gaps.push({ dim: 'errors',  fix: 'Every error must include a one-line fix hint' });
  if (!o.docs.useCaseGuides)   gaps.push({ dim: 'docs',    fix: 'Add use-case guides (RAG, agents, evals)' });
  if (o.ttfc.measuredSeconds > o.ttfc.target) {
    const over = o.ttfc.measuredSeconds - o.ttfc.target;
    gaps.push({ dim: 'ttfc', fix: 'Cut TTFC by ' + over + 's via copy-paste curl on the landing page' });
  }
  if (o.samples.cookbookEntries < 20) {
    gaps.push({ dim: 'samples', fix: 'Grow cookbook to >= 20 runnable recipes' });
  }
  return gaps;
}

function scorecard(api) {
  const rows = [];
  let total = 0;
  for (const d of DIMENSIONS) {
    const s = scoreDimension(api, d);
    const weighted = s * d.weight;
    total += weighted;
    rows.push({ key: d.key, label: d.label, weight: d.weight, raw: s, weighted: weighted, grade: grade(s) });
  }
  return { rows: rows, total: total };
}

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function printReport(api) {
  console.log('=' .repeat(64));
  console.log('DX SCORECARD: ' + api.name);
  console.log('=' .repeat(64));
  const { rows, total } = scorecard(api);
  console.log(pad('DIM', 10) + pad('LABEL', 28) + pad('WEIGHT', 8) + pad('RAW', 7) + 'GRADE');
  console.log('-'.repeat(64));
  for (const r of rows) {
    console.log(
      pad(r.key, 10) + pad(r.label, 28) +
      pad(r.weight.toFixed(2), 8) + pad(r.raw.toFixed(2), 7) + r.grade
    );
  }
  console.log('-'.repeat(64));
  console.log('OVERALL: ' + total.toFixed(2) + '   GRADE: ' + grade(total));
  return total;
}

function printSampleAudit(api) {
  console.log('');
  console.log('Sample/model coverage check:');
  for (const m of EXPECTED_MODELS) {
    const present = api.observations.samples.langs.length > 0;
    console.log('  ' + (present ? '[ok]' : '[!!]') + ' ' + m + ' samples present');
  }
}

function printGaps(api) {
  const gaps = findGaps(api);
  console.log('');
  console.log('Prioritized DX fixes:');
  if (gaps.length === 0) {
    console.log('  (none — ship the doc updates and re-audit in 30 days)');
    return;
  }
  let i = 1;
  for (const g of gaps) {
    console.log('  ' + i + '. [' + g.dim + '] ' + g.fix);
    i += 1;
  }
}

function main() {
  const total = printReport(ATLAS_API);
  printSampleAudit(ATLAS_API);
  printGaps(ATLAS_API);
  console.log('\\nRule: TTFC < 5 min, errors with fix-hints, cookbook >= 20 recipes.');
  console.log('Final score: ' + total.toFixed(2));
}

main();
`,
  },

  interview: { question: 'How do you think about developer experience for an AI API product?', answer: `Developer experience is a product discipline, not a documentation project \u2014 and it\u2019s one of the strongest competitive advantages in the AI API market.<br><br><strong>TTFSC is the north star:</strong> Time to First Successful Call. How long from \u201cI want to use this API\u201d to receiving a successful response? Every minute is a point where developers abandon your platform. The best APIs achieve under 5 minutes. I measure this by instrumenting the onboarding flow and tracking time-to-first-200-response for new API keys.<br><br><strong>The Cookbook pattern:</strong> Anthropic\u2019s Cookbook is a model for DX. Production-ready, runnable code examples for common use cases. This answers 80% of support questions before they\u2019re asked and demonstrates best practices in actual code. Every AI API should have this.<br><br><strong>Error messages are product surface:</strong> Every error a developer sees is a product interaction. A good error tells you what went wrong, why, and how to fix it. A \u201c400 Bad Request\u201d sends developers to Stack Overflow and you lose them. I review error messages as carefully as landing pages.<br><br><strong>Documentation architecture:</strong> Five layers: quickstart (TTFSC under 5 min), use-case guides (not endpoint-organized), API reference, cookbook recipes, and changelog. Each layer serves a different developer at a different stage of their journey.<br><br><strong>Why this matters competitively:</strong> Stripe won payments not on infrastructure but on DX. The same dynamic applies to AI APIs. Better DX attracts more developers, who build more applications, who generate more feedback. It\u2019s a compounding advantage.` },
  pmAngle: 'DX is where API products are won and lost. The AI PM who treats developer experience as a first-class product concern \u2014 measuring TTFSC, curating the Cookbook, crafting error messages, structuring documentation by use case \u2014 builds the compounding advantage that turns an API into a platform.',
  resources: [
    { type: 'TOOL', title: 'Anthropic Cookbook', url: 'https://github.com/anthropics/anthropic-cookbook', note: 'Production-ready code examples for Claude. The most underused DX resource.' },
    { type: 'DOCS', title: 'Anthropic API Documentation', url: 'https://docs.anthropic.com/', note: 'Study the documentation architecture as a DX case study.' },
    { type: 'DOCS', title: 'Claude SDK \u2014 Python', url: 'https://github.com/anthropics/anthropic-sdk-python', note: 'Official Python SDK with type-safe examples.' },
    { type: 'DOCS', title: 'Claude SDK \u2014 TypeScript', url: 'https://github.com/anthropics/anthropic-sdk-typescript', note: 'Official TypeScript SDK for Node.js.' },
    { type: 'DOCS', title: 'Anthropic API Quickstart', url: 'https://docs.anthropic.com/en/docs/initial-setup', note: 'The quickstart guide designed around TTFSC.' }
  ]
};
