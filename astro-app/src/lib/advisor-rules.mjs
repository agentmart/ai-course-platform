// Course Advisor: pure-JS rule engine that maps a profile to a 5-day "spine"
// of priority days from the 60-day curriculum. Deterministic, no LLM.
//
// Quiz answers (canonical keys):
//   background:  'engineer' | 'pm_non_ai' | 'pm_ai' | 'designer' | 'other'
//   yearsExp:    '0_2' | '3_5' | '6_10' | '10_plus'
//   aiLevel:     'chatgpt' | 'prompts' | 'rag' | 'shipped'
//   targetCo:    'frontier' | 'startup' | 'enterprise' | 'non_ai'
//   goal:        'land_role' | 'add_ai' | 'build_product' | 'literacy'
//
// Output: { spine: number[], reasonCodes: string[] }
//
// Rules of thumb for the spines:
//   Day 1  — model landscape map
//   Day 3  — alignment / why models have values
//   Day 5  — OpenAI model strategy
//   Day 8  — frontier lab economics
//   Day 10 — dominant API patterns
//   Day 12 — MCP protocol (tools)
//   Day 15 — when orchestration adds value
//   Day 18 — evaluations
//   Day 22 — multi-agent systems
//   Day 27 — agent communication protocols
//   Day 30 — enterprise AI buying
//   Day 35 — AI product roadmapping
//   Day 41 — Claude safety stack
//   Day 54 — developer experience
//
// We bias toward 5 distinct days, ordered from easiest-foundation → most
// applied. Linear walk through the remaining 55 days resumes after the spine.

const SPINES = {
  // Engineer profiles — skip basics, hit eval/RAG/agents/DX early
  engineer_frontier_land:    [1, 12, 18, 27, 54],
  engineer_frontier_build:   [3, 12, 18, 22, 41],
  engineer_startup_land:     [1, 10, 18, 22, 54],
  engineer_startup_build:    [10, 12, 18, 22, 35],
  engineer_enterprise_addai: [1, 10, 18, 30, 35],
  engineer_default:          [1, 10, 12, 18, 22],

  // PM at AI co — already inside; double down on differentiation + roadmap
  pm_ai_frontier:            [3, 8, 18, 35, 41],
  pm_ai_startup:             [5, 10, 18, 22, 35],
  pm_ai_enterprise:          [18, 22, 30, 35, 41],
  pm_ai_default:             [5, 18, 22, 30, 35],

  // PM at non-AI co — needs foundations + buying signals
  pm_non_ai_addai:           [1, 8, 18, 30, 35],
  pm_non_ai_land:            [1, 5, 10, 18, 30],
  pm_non_ai_default:         [1, 8, 18, 30, 35],

  // Designer / other / literacy goal
  designer_default:          [1, 3, 10, 18, 35],
  literacy_default:          [1, 3, 8, 18, 30],

  // Build-a-personal-product goal
  product_build:             [1, 10, 12, 18, 22],

  // Universal fallback (foundation → applied)
  default:                   [1, 5, 10, 18, 30],
};

export function profileToSpine(answers = {}) {
  const a = {
    background: answers.background || 'other',
    yearsExp:   answers.yearsExp   || '3_5',
    aiLevel:    answers.aiLevel    || 'chatgpt',
    targetCo:   answers.targetCo   || 'enterprise',
    goal:       answers.goal       || 'literacy',
  };
  const reasonCodes = [];

  // Goal-driven shortcut for personal builders
  if (a.goal === 'build_product') {
    reasonCodes.push('goal:build_product');
    return { spine: SPINES.product_build, reasonCodes };
  }

  // Literacy goal: foundation walk, light on tools
  if (a.goal === 'literacy') {
    reasonCodes.push('goal:literacy');
    return { spine: SPINES.literacy_default, reasonCodes };
  }

  // Designer: keep concept-heavy
  if (a.background === 'designer') {
    reasonCodes.push('background:designer');
    return { spine: SPINES.designer_default, reasonCodes };
  }

  // Engineer paths
  if (a.background === 'engineer') {
    reasonCodes.push('background:engineer');
    if (a.targetCo === 'frontier' && a.goal === 'land_role') {
      reasonCodes.push('target:frontier', 'goal:land_role');
      return { spine: SPINES.engineer_frontier_land, reasonCodes };
    }
    if (a.targetCo === 'frontier') {
      return { spine: SPINES.engineer_frontier_build, reasonCodes };
    }
    if (a.targetCo === 'startup' && a.goal === 'land_role') {
      return { spine: SPINES.engineer_startup_land, reasonCodes };
    }
    if (a.targetCo === 'startup') {
      return { spine: SPINES.engineer_startup_build, reasonCodes };
    }
    if (a.targetCo === 'enterprise') {
      return { spine: SPINES.engineer_enterprise_addai, reasonCodes };
    }
    return { spine: SPINES.engineer_default, reasonCodes };
  }

  // PM at AI co
  if (a.background === 'pm_ai') {
    reasonCodes.push('background:pm_ai');
    if (a.targetCo === 'frontier')  return { spine: SPINES.pm_ai_frontier, reasonCodes };
    if (a.targetCo === 'startup')   return { spine: SPINES.pm_ai_startup, reasonCodes };
    if (a.targetCo === 'enterprise')return { spine: SPINES.pm_ai_enterprise, reasonCodes };
    return { spine: SPINES.pm_ai_default, reasonCodes };
  }

  // PM at non-AI co
  if (a.background === 'pm_non_ai') {
    reasonCodes.push('background:pm_non_ai');
    if (a.goal === 'land_role') return { spine: SPINES.pm_non_ai_land, reasonCodes };
    if (a.goal === 'add_ai')    return { spine: SPINES.pm_non_ai_addai, reasonCodes };
    return { spine: SPINES.pm_non_ai_default, reasonCodes };
  }

  // Fallback
  reasonCodes.push('fallback:default');
  return { spine: SPINES.default, reasonCodes };
}

export function buildLearningPath(spine) {
  const set = new Set(spine);
  const tail = [];
  for (let i = 1; i <= 60; i++) if (!set.has(i)) tail.push(i);
  return [...spine, ...tail];
}

export function staticRationale(answers, spine) {
  const goalMap = {
    land_role:     'land an AI PM role',
    add_ai:        'add AI to your current role',
    build_product: 'ship a personal AI product',
    literacy:      'build durable AI literacy',
  };
  const goal = goalMap[answers.goal] || 'grow into AI PM work';
  return `Based on your background, we recommend starting with Days ${spine.join(', ')} ` +
         `before walking the rest in order. This sequence front-loads what matters most for someone trying to ${goal}, ` +
         `so you build momentum on the highest-leverage material first and pick up the foundations alongside.`;
}

// --- Self-test (run: node scripts/lib/advisor-rules.mjs) ---------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const cases = [
    { name: 'engineer → frontier → land role',
      a: { background: 'engineer', yearsExp: '6_10', aiLevel: 'rag',     targetCo: 'frontier',  goal: 'land_role' },
      expect: [1, 12, 18, 27, 54] },
    { name: 'PM at non-AI co → enterprise → add AI',
      a: { background: 'pm_non_ai', yearsExp: '3_5',  aiLevel: 'prompts', targetCo: 'enterprise', goal: 'add_ai' },
      expect: [1, 8, 18, 30, 35] },
    { name: 'designer → general literacy',
      a: { background: 'designer', yearsExp: '0_2', aiLevel: 'chatgpt', targetCo: 'startup', goal: 'literacy' },
      expect: [1, 3, 8, 18, 30] }, // literacy goal wins
    { name: 'PM at AI co → enterprise',
      a: { background: 'pm_ai', yearsExp: '6_10', aiLevel: 'shipped', targetCo: 'enterprise', goal: 'add_ai' },
      expect: [18, 22, 30, 35, 41] },
    { name: 'build personal product',
      a: { background: 'engineer', yearsExp: '3_5', aiLevel: 'rag', targetCo: 'startup', goal: 'build_product' },
      expect: [1, 10, 12, 18, 22] },
    { name: 'empty answers → safe default',
      a: {},
      expect: [1, 3, 8, 18, 30] }, // literacy default kicks in (default goal)
  ];
  let pass = 0, fail = 0;
  for (const c of cases) {
    const { spine } = profileToSpine(c.a);
    const ok = JSON.stringify(spine) === JSON.stringify(c.expect);
    console.log(`${ok ? '✓' : '✗'} ${c.name}  → got [${spine}]${ok ? '' : `  expected [${c.expect}]`}`);
    ok ? pass++ : fail++;
  }
  // path correctness
  const path = buildLearningPath([3, 12, 18, 27, 54]);
  const pathOk = path.length === 60 && path.slice(0, 5).join() === '3,12,18,27,54' && new Set(path).size === 60;
  console.log(`${pathOk ? '✓' : '✗'} buildLearningPath returns 60 unique days, spine first`);
  pathOk ? pass++ : fail++;
  console.log(`\n${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
}
