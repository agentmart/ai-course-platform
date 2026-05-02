import type { APIRoute } from 'astro';
import { envFrom, getSupabaseAdmin, jsonResponse, appCors } from '~/lib/handler';
// @ts-expect-error — JS module without types
import { fetchLiteLLMPricing, FALLBACK_PRICING } from '~/lib/models-data.mjs';

export const prerender = false;

export const OPTIONS: APIRoute = ({ locals }) =>
  new Response(null, {
    status: 204,
    headers: {
      ...appCors(envFrom(locals)),
      'access-control-allow-headers': 'Content-Type, Authorization, x-cron-secret',
    },
  });

export const GET: APIRoute = async ({ locals }) => {
  const env = envFrom(locals);
  const supabase = getSupabaseAdmin(env);
  try {
    const { data, error } = await supabase
      .from('llm_models')
      .select(
        'id,company,model_id,name,model_type,input_price_per_1m,output_price_per_1m,context_window,best_for,status,pricing_url,last_price_check'
      )
      .order('company')
      .order('input_price_per_1m', { ascending: false });
    if (error) throw error;
    return jsonResponse(
      { models: data, updatedAt: new Date().toISOString() },
      {
        headers: {
          ...appCors(env),
          'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (e: any) {
    console.error('[models] read error:', e?.message);
    return jsonResponse({ error: 'Failed to load models' }, { status: 500 });
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  const env = envFrom(locals);
  // @ts-expect-error
  const cronSecret = env.CRON_SECRET;
  const provided = request.headers.get('x-cron-secret');
  if (!cronSecret || provided !== cronSecret) {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = getSupabaseAdmin(env);

  let models: any[];
  let discovered: string[] = [];
  let source = 'litellm';
  try {
    const result = await fetchLiteLLMPricing();
    models = result.results;
    discovered = result.discovered;
    console.log(`[models] fetched ${models.length} models from LiteLLM`);
  } catch (e: any) {
    console.warn(`[models] LiteLLM fetch failed (${e?.message}), using fallback`);
    models = FALLBACK_PRICING;
    source = 'fallback';
  }

  let upserted = 0;
  let errors = 0;
  const log: string[] = [];
  for (const m of models) {
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
        errors++;
        log.push(`ERROR ${m.model_id}: ${error.message}`);
      } else {
        upserted++;
        log.push(`OK ${m.model_id}`);
      }
    } catch (e: any) {
      errors++;
      log.push(`EXCEPTION ${m.model_id}: ${e?.message}`);
    }
  }
  console.log(`[models] source=${source} upserted=${upserted} errors=${errors}`);
  return jsonResponse({
    upserted,
    errors,
    source,
    discovered,
    log,
    checkedAt: new Date().toISOString(),
  });
};
