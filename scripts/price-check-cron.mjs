#!/usr/bin/env node
/**
 * scripts/price-check-cron.mjs
 *
 * Daily LLM price refresh — runs directly against Supabase so it does not
 * depend on hitting the public /api/models endpoint (challenged by Cloudflare
 * bot protection for datacenter/CI IPs).
 *
 * Ported from the POST handler of astro-app/src/pages/api/models.ts.
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — required
 *   DRY_RUN=true                              — fetch + log only, no DB writes
 */

import { createClient } from '@supabase/supabase-js';
import {
  fetchLiteLLMPricing,
  FALLBACK_PRICING,
} from '../astro-app/src/lib/models-data.mjs';

const DRY_RUN = process.env.DRY_RUN === 'true';

async function main() {
  const summary = { source: 'litellm', discovered: 0, upserted: 0, errors: 0 };

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    console.log(JSON.stringify(summary));
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const stamp = new Date().toISOString();
  console.log(`\n💲 LLM price check — ${stamp}${DRY_RUN ? ' [DRY RUN]' : ''}`);

  let models;
  let discovered = [];
  try {
    const result = await fetchLiteLLMPricing();
    models = result.results;
    discovered = result.discovered || [];
    console.log(`  fetched ${models.length} models from LiteLLM`);
  } catch (e) {
    console.warn(`  LiteLLM fetch failed (${e?.message}), using fallback`);
    models = FALLBACK_PRICING;
    summary.source = 'fallback';
  }
  summary.discovered = discovered.length;

  for (const m of models) {
    if (DRY_RUN) {
      summary.upserted++;
      continue;
    }
    try {
      const { error } = await supabase.from('llm_models').upsert(
        {
          company: m.company,
          model_id: m.model_id,
          name: m.name,
          model_type: m.model_type,
          input_price_per_1m: m.input,
          output_price_per_1m: m.output,
          context_window: m.ctx,
          best_for: m.best_for,
          status: m.status,
          pricing_url: m.pricing_url,
          last_price_check: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'model_id' }
      );
      if (error) {
        summary.errors++;
        console.error(`  ERROR ${m.model_id}: ${error.message}`);
      } else {
        summary.upserted++;
      }
    } catch (e) {
      summary.errors++;
      console.error(`  EXCEPTION ${m.model_id}: ${e?.message}`);
    }
  }

  console.log(
    `\n✅ done · source=${summary.source} discovered=${summary.discovered} upserted=${summary.upserted} errors=${summary.errors}${DRY_RUN ? ' [dry]' : ''}\n`
  );

  // Fail the job only if nothing was written (total failure), matching the
  // original endpoint's "warn on partial errors" behaviour.
  if (!DRY_RUN && summary.upserted === 0) {
    console.error('::error::Price check upserted 0 models');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('fatal:', e);
  process.exit(1);
});
