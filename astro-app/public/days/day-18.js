// Day 18 — Evals & Benchmarks
// Updated: March 2026
// Review changes:
// - Updated benchmark landscape: MMLU-Pro, GPQA, HLE, SWE-bench Verified
// - Added Braintrust as eval platform alongside LangSmith
// - Added Artificial Analysis as benchmark resource
// - Added automated regression testing with GitHub Actions
// - Added additional LLM-as-judge biases (position, sycophancy)
// - Updated LMSYS Chatbot Arena reference
// - Added GitHub commit task structure
// - Preserved: "PM owns the definition of good" (course strength #5)

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

window.COURSE_DAY_DATA[18] = {
  subtitle: 'You can\u2019t improve what you don\u2019t measure \u2014 build the evaluation infrastructure every AI product needs.',

  context: `<p><strong>Evaluations (evals)</strong> are automated tests measuring AI output quality \u2014 the AI equivalent of unit tests. Without evals, every model update is a gamble. Public benchmarks measure model capability in the abstract: <strong>MMLU-Pro</strong> and <strong>GPQA</strong> for reasoning (Claude models perform well on these), <strong>Humanity\u2019s Last Exam (HLE)</strong> (released January 2025, the hardest public benchmark), <strong>SWE-bench Verified</strong> (the authoritative coding agent benchmark \u2014 Claude Code\u2019s performance here is relevant PM knowledge), and <strong>Chatbot Arena</strong> (LMSYS) for human preference. But the only measure that matters for your product is your <strong>internal evals on your specific tasks</strong>.</p>
  <p>Building internal evals requires three components: (1) A <strong>golden dataset</strong> \u2014 50-500 representative queries with expected outputs, curated by domain experts who understand quality. Diversity matters more than volume: include the hard edge cases, not just the easy ones. (2) An <strong>evaluation function</strong> \u2014 how you score quality. Options: exact match, reference comparison, <strong>LLM-as-judge</strong> (using Claude or GPT-4 to rate outputs), or human review. (3) A <strong>regression harness</strong> \u2014 run evals on every model change and alert when metrics drop.</p>
  <p>The <strong>LLM-as-judge</strong> pattern scales well and correlates reasonably with human judgments. But it has documented biases: preference for verbose responses, affinity toward own model\u2019s outputs, <strong>position bias</strong> (preferring the first response in A/B comparisons), and <strong>sycophancy bias</strong> (preferring responses that agree with the evaluator\u2019s framing). Mitigate by: randomizing presentation order, using a different model as judge than the one being evaluated, and calibrating judge scores against human ratings on a subset.</p>
  <p><strong>Eval platforms</strong> in 2025-2026: <strong>LangSmith</strong> (LangChain\u2019s product \u2014 works beyond LangChain apps), <strong>Braintrust</strong> (strong eval + experimentation platform, growing fast), <strong>Langfuse</strong> (open-source, good for teams not in the LangChain ecosystem), and <strong>Arize Phoenix</strong> (open-source, OpenTelemetry-native). For independent model benchmarking, <strong>Artificial Analysis</strong> (<a href="https://artificialanalysis.ai" target="_blank">artificialanalysis.ai</a>) provides real-time quality, price, and speed comparisons across models.</p>
  <p><strong>The PM\u2019s role</strong> in evals is defining what "good" looks like. Engineering builds the infrastructure, but the PM defines the success criteria that become golden dataset labels and evaluation dimensions. Unclear criteria produce useless evals. The hardest problems are subjective: measuring "helpfulness," "brand voice compliance," or "appropriate caution" requires careful rubric design and a mix of automated and human evaluation. <strong>PMs own the definition of good.</strong></p>`,

  tasks: [
    {
      title: 'Define 5 eval criteria for your product',
      description: 'Choose an AI product (customer support, document Q&A, or one you\u2019d build). Define 5 evaluation dimensions: name, description, measurement method (exact match / LLM-as-judge / human review), scoring rubric (1-5), and what score means "pass." Save as /day-18/eval_criteria_definition.md. This is the most important PM artifact in your eval system.',
      time: '25 min'
    },
    {
      title: 'Build a golden dataset (20 examples)',
      description: 'For your chosen product, write 20 input/output pairs representing high-quality responses. Cover: 5 easy cases, 10 typical cases, and 5 hard edge cases. Format as JSONL with input, expected_output, difficulty, and eval_dimensions. Save as /day-18/golden_dataset_20examples.jsonl.',
      time: '30 min'
    },
    {
      title: 'Design CI/CD eval automation',
      description: 'Your team ships model updates monthly. Design the GitHub Actions workflow: trigger on PR, run eval suite against golden dataset, compare scores to baseline, auto-pass if above threshold, auto-block if below, human review for marginal cases. Write the workflow YAML skeleton. Save as /day-18/eval_ci_cd_design.md (or .github/workflows/eval.yml).',
      time: '15 min'
    },
    {
      title: 'Benchmark research: know the landscape',
      description: 'Research current model benchmarks: MMLU-Pro, HLE, SWE-bench Verified, Chatbot Arena, and Artificial Analysis. Where does Claude Sonnet 4.6 rank on each? Where does it trail? This is competitive intelligence you need for interviews. Save as /day-18/benchmark_landscape.md.',
      time: '10 min'
    }
  ],

  codeExample: {
    title: 'LLM-as-judge eval framework \u2014 JavaScript',
    lang: 'js',
    code: `// Evaluation Framework — LLM-as-judge with bias mitigation
// Production: each evalCall would hit Claude or GPT-4 API

const EVAL_RUBRIC = {
  dimensions: [
    { name: "accuracy", weight: 0.3, description: "Is the information correct and complete?" },
    { name: "tone", weight: 0.2, description: "Professional, empathetic, on-brand?" },
    { name: "actionability", weight: 0.3, description: "Clear next steps for the user?" },
    { name: "conciseness", weight: 0.2, description: "Appropriately brief, not verbose?" },
  ],
  passThreshold: 3.5,
  judgeModel: "claude-sonnet-4-6",
  biasMitigations: [
    "Randomize response order in A/B comparisons",
    "Use different model as judge than model being evaluated",
    "Calibrate judge scores against human ratings on 20% sample",
    "Watch for position bias (judge prefers first response)",
    "Watch for sycophancy bias (judge prefers agreeable responses)"
  ]
};

// Golden dataset (20 examples in production)
const goldenDataset = [
  {
    id: "test_001", difficulty: "easy",
    input: "I can't log in and my password reset isn't working",
    expected_min_score: 4.0,
    model_output: "I'm sorry you're having trouble. Please try clearing your browser cache, then attempt the reset again. If that doesn't work, I'll send a manual reset link to your email."
  },
  {
    id: "test_002", difficulty: "medium",
    input: "How do I cancel? Also I want a refund for this month.",
    expected_min_score: 3.5,
    model_output: "I can help with both. For cancellation: Settings > Billing > Cancel. Your access continues until the billing period ends. For the refund, I've flagged your account — our billing team will review within 24 hours."
  },
  {
    id: "test_003", difficulty: "hard",
    input: "Your product is terrible and I'm going to post negative reviews everywhere",
    expected_min_score: 3.0,
    model_output: "I hear your frustration and I want to help resolve this. Can you tell me specifically what's not working? I'll either fix it directly or escalate to our engineering team immediately."
  }
];

// Simulated eval scoring
function scoreResponse(testCase) {
  const scores = {};
  EVAL_RUBRIC.dimensions.forEach(d => {
    scores[d.name] = 3 + Math.random() * 2; // Simulated 3-5 range
  });
  const weightedAvg = EVAL_RUBRIC.dimensions.reduce((sum, d) => sum + scores[d.name] * d.weight, 0);
  return { scores, weightedAvg: parseFloat(weightedAvg.toFixed(2)), passed: weightedAvg >= testCase.expected_min_score };
}

console.log("EVAL FRAMEWORK — LLM-as-Judge with Bias Mitigation");
console.log("=".repeat(60));
console.log("Judge model: " + EVAL_RUBRIC.judgeModel);
console.log("Pass threshold: " + EVAL_RUBRIC.passThreshold + "/5.0");
console.log("Dimensions: " + EVAL_RUBRIC.dimensions.map(d => d.name + " (" + (d.weight * 100) + "%)").join(", "));

console.log("\\nBias mitigations:");
EVAL_RUBRIC.biasMitigations.forEach(m => console.log("  - " + m));

console.log("\\nRunning eval on golden dataset...");
console.log("-".repeat(60));
let passed = 0;
goldenDataset.forEach(tc => {
  const result = scoreResponse(tc);
  const status = result.passed ? "PASS" : "FAIL";
  console.log(tc.id + " [" + tc.difficulty + "] | Score: " + result.weightedAvg + "/5.0 | " + status);
  if (result.passed) passed++;
});
console.log("\\nResults: " + passed + "/" + goldenDataset.length + " passed");

console.log("\\n" + "=".repeat(60));
console.log("PUBLIC BENCHMARK LANDSCAPE (2026)");
console.log("MMLU-Pro: Advanced reasoning benchmark (supersedes MMLU)");
console.log("GPQA: Expert-level science questions (Claude strong)");
console.log("HLE: Humanity's Last Exam (hardest benchmark, Jan 2025)");
console.log("SWE-bench: Coding agent benchmark (Claude Code tracked)");
console.log("Chatbot Arena: Human preference (LMSYS)");
console.log("Artificial Analysis: Real-time quality/price/speed comparisons");`
  },

  interview: {
    question: 'How would you set up an evaluation framework for an AI feature before launch?',
    answer: `Three stages: definition, implementation, automation.<br><br><strong>Definition:</strong> Work with domain experts to define 3-5 quality dimensions with explicit rubrics (1-5 scoring). Then build a golden dataset: 50-100 queries representing the real input distribution, including 20% hard edge cases. Have 2-3 experts independently label each. Where they disagree, resolve the disagreement \u2014 that\u2019s your most valuable eval data. The PM owns this definition. If the rubric is vague, the eval is useless.<br><br><strong>Implementation:</strong> Build the eval runner: for each test case, call the model, score with LLM-as-judge using your rubric, compare to threshold. Mitigate judge biases: randomize presentation order, use a different model as judge, calibrate against human ratings on a 20% sample. Run the baseline evaluation before any changes to establish ground truth.<br><br><strong>Automation:</strong> Integrate into CI/CD via GitHub Actions. Define three thresholds: auto-pass (ship), auto-fail (block), and human review (marginal). Set a 24-hour SLA for human review of marginal cases. Run on every model version change, every system prompt update, and every data pipeline change.<br><br>Eval platforms: Braintrust for experimentation-focused teams, LangSmith for LangChain-heavy stacks, Langfuse for open-source preference. For competitive benchmarking, track Artificial Analysis leaderboards weekly.`
  },

  pmAngle: 'Evals are the most underinvested capability in most AI teams. Engineers build infrastructure; PMs own "what does good look like." If you don\u2019t write the rubric and curate the golden dataset, no one will, and you\u2019ll discover quality problems in production. The PM who builds eval criteria before launch \u2014 not after complaints \u2014 ships better products.',

  resources: [
    { type: 'DOCS', title: 'Anthropic Evals Guide', url: 'https://docs.anthropic.com/en/docs/test-and-evaluate/eval-your-prompt', note: 'Anthropic\u2019s guide to prompt evaluation. Start here.' },
    { type: 'TOOL', title: 'Artificial Analysis', url: 'https://artificialanalysis.ai/', note: 'Real-time model benchmarking: quality, price, speed. Updated weekly.' },
    { type: 'TOOL', title: 'Braintrust', url: 'https://www.braintrustdata.com/', note: 'Eval + experimentation platform. Strong alternative to LangSmith.' },
    { type: 'TOOL', title: 'Chatbot Arena (LMSYS)', url: 'https://lmarena.ai/', note: 'Human preference benchmark. Understand methodology for interview context.' },
    { type: 'GITHUB', title: 'Anthropic Cookbook \u2014 Evals', url: 'https://github.com/anthropics/anthropic-cookbook', note: 'Production-ready eval examples from Anthropic.' },
    { type: 'BLOG', title: 'Building LLM Evals \u2014 Hamel Husain', url: 'https://hamel.dev/blog/posts/evals/', note: 'Best practical guide to LLM evaluation. Required reading.' }
  ]
};
