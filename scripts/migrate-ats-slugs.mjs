#!/usr/bin/env node
/**
 * scripts/migrate-ats-slugs.mjs
 *
 * Two-phase migration:
 *
 * PHASE 1 (always runs): Clean stale companies, update greenhouse_slug/lever_slug.
 *   Works with the existing DB schema (no new columns needed).
 *
 * PHASE 2 (runs if ashby_slug column exists): Populate ashby_slug/workable_slug.
 *   Run this AFTER executing migration-add-ats-columns.sql in Supabase SQL editor.
 *
 * Run: node --env-file=.env scripts/migrate-ats-slugs.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VERIFIED_COMPANIES = [
  { name: 'Anthropic',    greenhouse: 'anthropic' },
  { name: 'OpenAI',       ashby:      'openai' },
  { name: 'Mistral AI',   lever:      'mistral' },
  { name: 'Cohere',       ashby:      'cohere' },
  { name: 'xAI',          greenhouse: 'xai' },
  { name: 'Scale AI',     greenhouse: 'scaleai' },
  { name: 'Together AI',  greenhouse: 'togetherai' },
  { name: 'Hugging Face', workable:   'huggingface' },
  { name: 'CoreWeave',    greenhouse: 'coreweave' },
  { name: 'Runway',       greenhouse: 'runwayml' },
  { name: 'ElevenLabs',   ashby:      'elevenlabs' },
  { name: 'Ideogram',     ashby:      'ideogram' },
  { name: 'LangChain',    ashby:      'langchain' },
  { name: 'Perplexity',   ashby:      'perplexity' },
  { name: 'Glean',        greenhouse: 'gleanwork' },
  { name: 'Cursor',       ashby:      'cursor' },
  { name: 'Cognition',    ashby:      'cognition' },
  { name: 'Sierra AI',    ashby:      'sierra' },
  { name: 'Harvey AI',    ashby:      'harvey' },
  { name: 'Contextual AI',greenhouse: 'contextualai' },
  { name: 'Imbue',        greenhouse: 'imbue' },
  { name: 'Replit',       ashby:      'replit' },
  { name: 'Linear',       ashby:      'linear' },
  { name: 'Descript',     greenhouse: 'descript' },
  { name: 'Airtable',     greenhouse: 'airtable' },
  { name: 'Neuralink',    greenhouse: 'neuralink' },
];

// Companies with no valid ATS — mark is_hiring=false, clear slugs
const STALE_NAMES = [
  'Character AI', 'Inflection AI', 'Luma AI', 'Replicate',
  'Weights & Biases', 'Norm AI', 'Magic AI', 'Hex Security',
  'Beacon Health', 'Code Metal', 'IOMED', 'National Robotics Engineering Center',
  'SemanticBits', 'Holmusk',
];

async function hasAshbyColumn() {
  // Try a dummy update that reads ashby_slug to see if column exists
  const { error } = await supabase
    .from('ai_companies')
    .select('ashby_slug')
    .limit(1);
  return !error;
}

async function main() {
  console.log('🔧 Migrating ATS slugs...\n');

  const ashbyColExists = await hasAshbyColumn();

  if (!ashbyColExists) {
    console.warn('⚠  ashby_slug / workable_slug columns not found.');
    console.warn('   ➜ Run this SQL in your Supabase SQL Editor first:\n');
    console.warn('      ALTER TABLE ai_companies ADD COLUMN IF NOT EXISTS ashby_slug TEXT;');
    console.warn('      ALTER TABLE ai_companies ADD COLUMN IF NOT EXISTS workable_slug TEXT;');
    console.warn('\n   Then re-run: node --env-file=.env scripts/migrate-ats-slugs.mjs\n');
    console.warn('   Proceeding with Phase 1 only (greenhouse/lever slugs + stale cleanup)...\n');
  }

  // ── Phase 1: Update greenhouse_slug / lever_slug + is_hiring ─────────────
  console.log('📦 Phase 1: Updating greenhouse/lever slugs...');
  for (const c of VERIFIED_COMPANIES) {
    const { data: existing } = await supabase
      .from('ai_companies')
      .select('id')
      .ilike('company_name', c.name)
      .maybeSingle();

    const baseUpdate = {
      greenhouse_slug: c.greenhouse || null,
      lever_slug:      c.lever      || null,
      is_hiring:       true,
    };

    const fullUpdate = ashbyColExists
      ? { ...baseUpdate, ashby_slug: c.ashby || null, workable_slug: c.workable || null }
      : baseUpdate;

    if (existing?.id) {
      const { error } = await supabase
        .from('ai_companies')
        .update(fullUpdate)
        .eq('id', existing.id);
      if (error) console.error(`  ⚠  ${c.name}: ${error.message}`);
      else console.log(`  ✅ updated  ${c.name}`);
    } else {
      // Insert new company
      const insertData = {
        company_name:      c.name,
        ...fullUpdate,
        source:            'ATS discovery',
        announcement_date: new Date().toISOString().split('T')[0],
        open_roles:        0,
        founder_names:     [],
        tech_stack:        [],
        investors:         [],
      };
      // If no ashby column, omit those fields
      if (!ashbyColExists) {
        delete insertData.ashby_slug;
        delete insertData.workable_slug;
      }
      const { error } = await supabase.from('ai_companies').insert(insertData);
      if (error) console.error(`  ⚠  insert ${c.name}: ${error.message}`);
      else console.log(`  ✅ inserted ${c.name}`);
    }
  }

  // ── Phase 2: Clear stale companies ────────────────────────────────────────
  console.log('\n🧹 Phase 2: Clearing stale companies (is_hiring=false)...');
  for (const name of STALE_NAMES) {
    const staleUpdate = { is_hiring: false, greenhouse_slug: null, lever_slug: null };
    if (ashbyColExists) {
      staleUpdate.ashby_slug = null;
      staleUpdate.workable_slug = null;
    }
    const { error } = await supabase
      .from('ai_companies')
      .update(staleUpdate)
      .ilike('company_name', name);
    if (error) console.error(`  ⚠  ${name}: ${error.message}`);
    else console.log(`  🗑  cleared ${name}`);
  }

  if (ashbyColExists) {
    console.log('\n✅ Full migration complete (both phases). Run daily-jobs-check.mjs to verify.');
  } else {
    console.log('\n✅ Phase 1 complete. Add DB columns, then re-run for full migration.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
