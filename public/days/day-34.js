// Day 34 — Stakeholder Communication for AI
// Updated: March 2026 | Review: system prompt as artifact, AI incident comms, AI feature spec template

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[34] = {
  subtitle: 'How to talk about AI to executives, engineers, and skeptics.',
  context: `<p>Communicating about AI products requires different vocabularies for different audiences. <strong>Executives</strong> care about business metrics, competitive positioning, and risk. Lead with: \u201cThis reduces support costs by 40%\u201d not \u201cWe fine-tuned a transformer.\u201d <strong>Engineers</strong> care about architecture, reliability, and technical debt. Lead with: system design, latency requirements, and evaluation methodology. <strong>Skeptics</strong> (internal and external) care about what goes wrong. Lead with: failure modes you\u2019ve anticipated, human oversight mechanisms, and your rollback plan.</p>
  <p><strong>The system prompt is now a product artifact.</strong> In 2024\u20132025, the system prompt evolved from an afterthought to a critical product document. Best practice in 2026: version it in Git alongside your code, maintain environment-specific variants (dev/staging/production), A/B test prompt versions with the same rigor as UI changes, and include it in your release review process. The system prompt defines product behavior more than most code changes \u2014 a poorly worded system prompt can cause more user-facing issues than a code bug. Treat prompt engineering as product specification, not as a developer task.</p>
  <p><strong>AI incident communication</strong> is a PM skill that didn\u2019t exist two years ago. When your AI product produces harmful, embarrassing, or incorrect output at scale, you need a playbook. Public AI failures from major companies (ChatGPT hallucinating legal cases, Google Gemini image generation issues, Copilot generating insecure code) show that the communication response matters as much as the technical fix. Your incident communication plan should include: immediate acknowledgment (within hours, not days), clear explanation of what happened (without technical jargon), what you\u2019re doing to fix it, and what safeguards you\u2019re adding to prevent recurrence.</p>
  <p><strong>The AI feature spec template</strong> is an evolved PRD for AI features. Structure: <strong>Problem statement</strong> (what user problem does this solve?), <strong>Model requirements</strong> (which model, what capabilities, latency/cost constraints), <strong>System prompt specification</strong> (versioned, with test cases), <strong>Evaluation criteria</strong> (how do we measure quality before and after launch?), <strong>Failure modes</strong> (what can go wrong and how do we handle it?), <strong>Human-in-the-loop design</strong> (when does a human intervene?), <strong>Safety review</strong> (red-teaming plan, content policy), and <strong>Rollback plan</strong> (how do we revert if quality degrades?). This template should be used for every AI feature, not just major launches.</p>
  <p><strong>Communicating uncertainty</strong> is uniquely important for AI products. Traditional software is deterministic \u2014 you can promise a specific behavior. AI products are probabilistic \u2014 you can promise a quality level, not a specific output. Translate this for stakeholders: \u201cThe system will correctly classify 94% of tickets\u201d rather than \u201cThe system will correctly classify every ticket.\u201d Set expectations for the 6% failure rate upfront, including what happens to those cases (human review queue).</p>`,
  tasks: [
    { title: 'Write three versions of an AI feature announcement', description: 'Your team just shipped an AI-powered document summarization feature. Write three versions of the announcement: (1) Executive email (3 sentences, business impact focus), (2) Engineering Slack post (architecture and metrics), (3) Customer-facing blog post (benefits and limitations). Save as /day-34/feature_announcement_3versions.md.', time: '25 min' },
    { title: 'Create an AI incident communication playbook', description: 'Your AI chatbot hallucinated medical advice and a screenshot went viral on social media. Write the communication playbook: immediate response (first 2 hours), technical investigation summary (24 hours), customer communication (48 hours), and prevention plan (1 week). Include templates for each stage. Save as /day-34/incident_communication_playbook.md.', time: '25 min' },
    { title: 'Write an AI feature spec', description: 'Using the AI feature spec template (problem, model requirements, system prompt spec, eval criteria, failure modes, HITL design, safety review, rollback plan), write a complete spec for an AI email draft assistant. The system prompt should be versioned and include test cases. Save as /day-34/ai_feature_spec.md.', time: '20 min' },
    { title: 'System prompt as product artifact', description: 'For an AI customer support bot: write the production system prompt, the staging variant (with debug logging), document the A/B test plan for a prompt change, and describe the Git workflow for prompt version management. Include the PR review checklist for prompt changes. Save as /day-34/system_prompt_management.md.', time: '10 min' }
  ],

  codeExample: {
    title: 'Audience-tailored AI explanations — JavaScript',
    lang: 'js',
    code: `// Day 34 — Audience-tailored AI feature explanation generator
// Pedagogical goal: same feature, three audiences. The PM who pre-writes the
// exec, eng, and skeptic versions ships announcements that don't get rewritten.

var feature = {
  name: 'Smart Reply for Support Tickets',
  problem: 'Support agents spend 40% of their day drafting routine reply emails.',
  solution: 'Suggests a draft reply per ticket, grounded in our help-center corpus.',
  model: 'claude-sonnet-4-6',
  acceptance: 0.46,
  hallucinationRate: 0.006,
  p95LatencyMs: 980,
  costPerAccepted: 0.07,
  rolloutPct: 25,
  humanInLoop: true,
  redTeamPassed: true,
  killSwitch: true,
};

function fmtPct(x) { return (x * 100).toFixed(1) + '%'; }
function fmtMoney(x) { return '$' + x.toFixed(3); }

function execVersion(f) {
  return [
    'Title: ' + f.name + ' — saving support agents 16 minutes per ticket',
    '',
    'Why it matters: ' + f.problem,
    'What it does: ' + f.solution,
    'Outcome metric: agent acceptance rate ' + fmtPct(f.acceptance) +
      '; cost per accepted reply ' + fmtMoney(f.costPerAccepted) + '.',
    'Risk posture: hallucination rate ' + fmtPct(f.hallucinationRate) +
      ', red team passed, kill switch in place.',
    'Ask: approve broader rollout from ' + f.rolloutPct + '% to 100%.',
  ].join('\\n');
}

function engVersion(f) {
  return [
    'Title: ' + f.name + ' — engineering note',
    '',
    'Model: ' + f.model + ' via internal gateway; fallback claude-haiku-4-5-20251001.',
    'Retrieval: hybrid BM25 + embeddings over help-center corpus (~38k docs).',
    'Latency: p95 ' + f.p95LatencyMs + 'ms (budget 1200ms).',
    'Eval: 1,400-example labeled set; nightly regression run.',
    'Guardrails: PII redaction pre-prompt, JSON-schema response, refusal fallback.',
    'Observability: per-ticket trace_id, accepted/rejected logged to warehouse.',
    'Rollout: ' + f.rolloutPct + '% with hash-based bucketing; kill switch on a flag.',
  ].join('\\n');
}

function skepticVersion(f) {
  var concerns = [
    {
      ask: 'Will it hallucinate policy?',
      answer: 'Hallucination rate measured at ' + fmtPct(f.hallucinationRate) +
              ' on a 1.4k labeled set; ' +
              (f.humanInLoop ? 'a human always reviews before send' :
                               'no human review yet — concern flagged') + '.',
    },
    {
      ask: 'What if the model regresses?',
      answer: 'Nightly eval gates new model versions; ' +
              (f.killSwitch ? 'kill switch returns to manual replies in <60s.' :
                              'no kill switch yet.'),
    },
    {
      ask: 'Will it leak PII?',
      answer: 'PII redaction happens before any prompt leaves our VPC; ' +
              'logs are scrubbed and retained 30 days.',
    },
    {
      ask: 'What does it cost vs the value?',
      answer: 'Cost per accepted reply ' + fmtMoney(f.costPerAccepted) +
              '; value from time saved is roughly $4.20 per accepted reply.',
    },
  ];
  var lines = ['Title: ' + f.name + ' — concerns + responses', ''];
  concerns.forEach(function (c, i) {
    lines.push('Q' + (i + 1) + '. ' + c.ask);
    lines.push('     ' + c.answer);
  });
  return lines.join('\\n');
}

console.log('=== EXEC VERSION ===');
console.log(execVersion(feature));
console.log('\\n=== ENG VERSION ===');
console.log(engVersion(feature));
console.log('\\n=== SKEPTIC VERSION ===');
console.log(skepticVersion(feature));

// Treat the system prompt as a versioned product artifact.
var systemPromptArtifact = {
  id: 'sp.smart_reply.v7',
  owner: 'pm:rachel',
  reviewers: ['eng:matt', 'safety:ari'],
  version: 7,
  changeLog: [
    { v: 5, change: 'Add refusal for billing topics' },
    { v: 6, change: 'Tighten tone-of-voice rules; cite help-center URL' },
    { v: 7, change: 'Add escalation phrase for upset customers' },
  ],
  abTest: { variant: 'sp.smart_reply.v7', control: 'sp.smart_reply.v6', n: 4200 },
};

console.log('\\n=== SYSTEM PROMPT AS PRODUCT ARTIFACT ===');
console.log(JSON.stringify(systemPromptArtifact, null, 2));

// Pre-written incident playbook, one entry per severity.
var incidentPlaybook = [
  { sev: 'SEV1', sla: '15 min', who: 'PM + Eng lead + Comms',
    say: 'We have paused Smart Reply. Manual replies are unaffected. ETA on update: 1 hour.' },
  { sev: 'SEV2', sla: '1 hour', who: 'PM + Eng on-call',
    say: 'Smart Reply quality regressed in some ticket types; rolled back to v6 prompt.' },
  { sev: 'SEV3', sla: '1 day', who: 'PM',
    say: 'Minor wording issue in suggested reply; fixed in next prompt update.' },
];

console.log('\\n=== INCIDENT PLAYBOOK (pre-written) ===');
incidentPlaybook.forEach(function (row) {
  console.log('  ' + row.sev + '  SLA=' + row.sla + '  who=' + row.who);
  console.log('         say: "' + row.say + '"');
});

console.log('\\nPM takeaway: write the exec, eng, skeptic, and incident copy');
console.log('BEFORE the meeting. Crisis is not a good time to draft.');
`,
  },

  interview: { question: 'How would you communicate an AI product failure to different stakeholders?', answer: `I\u2019d communicate with four audiences simultaneously, each needing different framing.<br><br><strong>Customers (immediate, within hours):</strong> Acknowledge the issue, explain the impact in plain language, and describe what you\u2019re doing about it. \u201cWe identified an issue where our AI assistant occasionally provided inaccurate information about [topic]. We\u2019ve temporarily added additional safeguards while we investigate. No action is needed from you.\u201d Never minimize or blame the user.<br><br><strong>Executives (same day):</strong> Business impact framing. How many users were affected? What\u2019s the revenue/reputation risk? What\u2019s the timeline to resolution? What safeguards are we adding? Executives need to know if this is a PR crisis or a contained incident. Give them the talking points they need if asked by board members or press.<br><br><strong>Engineering team (immediate):</strong> Technical root cause, affected systems, and the fix plan. Was it a prompt issue, a model regression, a data pipeline problem, or a missing guardrail? Share the traces and logs. This is where you shift from communication mode to debugging mode.<br><br><strong>The broader organization (within 48 hours):</strong> Post-mortem that balances transparency with confidence. Yes, AI products will occasionally fail. Here\u2019s our framework for catching issues faster, our evaluation pipeline improvements, and our updated incident response process. The goal is organizational learning, not blame.` },
  pmAngle: 'The AI PM who treats the system prompt as a product artifact \u2014 versioned, tested, reviewed, and A/B tested \u2014 ships better products than the one who treats it as a developer implementation detail. Similarly, the PM who has an AI incident communication playbook before the first incident earns stakeholder trust that\u2019s impossible to build after a crisis.',
  resources: [
    { type: 'DOCS', title: 'Anthropic: System Prompts', url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/system-prompts', note: 'Best practices for system prompt design and management.' },
    { type: 'DOCS', title: 'Anthropic: Prompt Engineering Guide', url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering', note: 'Comprehensive prompt engineering for product specifications.' },
    { type: 'BLOG', title: 'Google: People + AI Guidebook', url: 'https://pair.withgoogle.com/guidebook', note: 'Communicating AI capabilities and limitations to users.' },
    { type: 'BLOG', title: 'Microsoft: Responsible AI', url: 'https://www.microsoft.com/en-us/ai/responsible-ai', note: 'Framework for transparent AI communication.' },
    { type: 'BLOG', title: 'Lenny\u2019s Newsletter: AI Product Specs', url: 'https://www.lennysnewsletter.com/', note: 'How top PMs write specs for AI features.' }
  ]
};
