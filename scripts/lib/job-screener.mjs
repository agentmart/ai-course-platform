/**
 * scripts/lib/job-screener.mjs
 *
 * 2-node LangGraph that classifies whether a posting is a real AI/ML PM role
 * (vs a generic PM at an AI company, an ML eng role miscategorized as PM,
 * a data PM, etc.). Output is cached on job_postings.screener_verdict.
 *
 *   classify_role  →  decide
 *
 * `classify_role` calls the LLM (Foundry gpt-4o-mini by default, falls back via
 * scripts/lib/llm-node.mjs precedence) with title + truncated JD; expects a
 * strict JSON object back.
 * `decide` is deterministic: forwards iff is_ai_pm && confidence ∈ {high,medium}.
 *
 * Token budget: maxTokens=500 per call, single call per unique job per run.
 */

import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getChatModelNode } from './llm-node.mjs';

const SYSTEM_PROMPT = `You are a strict recruiter screener. Decide if a job posting is genuinely an AI/ML Product Manager role.

A role qualifies as is_ai_pm=true ONLY if the PM/product owner is directly responsible for AI/ML model behavior, LLM features, ML platforms, AI-powered product surfaces, or applied-AI roadmap. The company being an "AI company" is NOT enough.

Disqualify (is_ai_pm=false) when:
- It is an ML engineer / research / data scientist role (not product management).
- It is a generic PM role at an AI company where the PM owns growth, ops, internal tools, or non-AI surfaces.
- The JD only mentions "AI" as buzzword/marketing without AI being the product.
- It is a Data PM where data infra — not models — is the scope, unless model training data is core.
- It is product marketing, program management, or product design.

Respond with ONLY a JSON object, no prose:
{
  "is_ai_pm": boolean,
  "confidence": "high" | "medium" | "low",
  "evidence": "one sentence (≤180 chars) quoting/paraphrasing the strongest JD signal",
  "role_type": "ai_pm" | "pm_at_ai_co" | "ml_eng" | "data_pm" | "other"
}`;

function buildUserPrompt({ title, company, description }) {
  const jd = (description || '').slice(0, 3000); // ~750 tokens cap on input JD
  return [
    `Company: ${company || 'unknown'}`,
    `Title: ${title || 'unknown'}`,
    '',
    'Job description (truncated):',
    jd || '(no description available — classify from title alone, downgrade confidence accordingly)',
  ].join('\n');
}

function parseLooseJson(text) {
  if (!text) throw new Error('empty LLM response');
  let s = String(text).trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const m = s.match(/\{[\s\S]*\}/);
  if (m) s = m[0];
  return JSON.parse(s);
}

function normalizeVerdict(v, modelName) {
  const role_type = ['ai_pm', 'pm_at_ai_co', 'ml_eng', 'data_pm', 'other'].includes(v?.role_type)
    ? v.role_type : 'other';
  const confidence = ['high', 'medium', 'low'].includes(v?.confidence) ? v.confidence : 'low';
  return {
    is_ai_pm: Boolean(v?.is_ai_pm),
    confidence,
    evidence: typeof v?.evidence === 'string' ? v.evidence.slice(0, 240) : '',
    role_type,
    model: modelName,
    screened_at: new Date().toISOString(),
  };
}

const ScreenState = Annotation.Root({
  job:       Annotation(),
  verdict:   Annotation(),
  forward:   Annotation(),
  llmError:  Annotation(),
});

async function buildGraph({ maxTokens = 500 } = {}) {
  const model = await getChatModelNode({ maxTokens, temperature: 0 });
  const modelName = model?.model || model?.modelName || 'unknown';

  async function classify_role(state) {
    const { job } = state;
    try {
      const res = await model.invoke([
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(buildUserPrompt(job)),
      ]);
      const text = typeof res?.content === 'string'
        ? res.content
        : Array.isArray(res?.content) ? res.content.map(p => p.text || '').join('') : '';
      const parsed = parseLooseJson(text);
      return { verdict: normalizeVerdict(parsed, modelName) };
    } catch (e) {
      return {
        llmError: e.message || String(e),
        verdict: {
          is_ai_pm: false,
          confidence: 'low',
          evidence: `screener-error: ${(e.message || '').slice(0, 120)}`,
          role_type: 'other',
          model: modelName,
          screened_at: new Date().toISOString(),
        },
      };
    }
  }

  function decide(state) {
    const v = state.verdict || {};
    const forward = !!(v.is_ai_pm && (v.confidence === 'high' || v.confidence === 'medium'));
    return { forward };
  }

  const graph = new StateGraph(ScreenState)
    .addNode('classify_role', classify_role)
    .addNode('decide', decide)
    .addEdge(START, 'classify_role')
    .addEdge('classify_role', 'decide')
    .addEdge('decide', END)
    .compile();

  return graph;
}

/**
 * Build a screener instance bound to a single LLM model.
 * Returns:
 *   screen(job) → { verdict, forward, llmError? }
 */
export async function buildScreener(opts = {}) {
  const graph = await buildGraph(opts);
  return async function screen(job) {
    const out = await graph.invoke({ job });
    return { verdict: out.verdict, forward: out.forward, llmError: out.llmError };
  };
}
