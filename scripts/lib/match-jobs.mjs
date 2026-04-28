// scripts/lib/match-jobs.mjs
// Pure scoring function for matching job_postings rows against a user's filters.
// No DB calls — fully testable.
//
// User filter shape (from notification_prefs.job_filters):
//   {
//     roles:       ['ai pm','senior pm']   // matched against title (lowercased substring)
//     locations:   ['sf','remote','nyc']   // matched against location text
//     remote_only: false                    // hard filter
//     seniority:   ['senior','staff','principal','head','vp','director']
//     companies:   ['Anthropic','OpenAI']  // optional allowlist; empty = all companies
//   }
//
// Job row shape (from job_postings):
//   { id, company_name, title, department, location, remote, job_url, last_seen_at, ... }

const SENIORITY_TERMS = {
  junior:    ['junior','associate','apm'],
  mid:       ['product manager','pm '],
  senior:    ['senior','sr.','sr '],
  staff:     ['staff'],
  principal: ['principal'],
  lead:      ['lead','group product'],
  head:      ['head of product','head of'],
  director:  ['director'],
  vp:        ['vp','vice president'],
};

function lc(s) { return (s || '').toString().toLowerCase(); }

function matchesAny(haystack, needles) {
  if (!needles || !needles.length) return null; // null = filter not applied
  const h = lc(haystack);
  return needles.some(n => h.includes(lc(n)));
}

function matchesSeniority(title, seniorityList) {
  if (!seniorityList || !seniorityList.length) return null;
  const t = lc(title);
  return seniorityList.some(level => {
    const terms = SENIORITY_TERMS[lc(level)] || [lc(level)];
    return terms.some(term => t.includes(term));
  });
}

/**
 * Score a single job against a user filter.
 * Returns null if it doesn't pass hard filters; otherwise a number (higher = better match).
 */
export function scoreJob(job, filters) {
  const f = filters || {};

  // Hard filter: remote_only
  if (f.remote_only === true && !job.remote) {
    const loc = lc(job.location);
    if (!loc.includes('remote') && !loc.includes('anywhere')) return null;
  }

  // Hard filter: companies allowlist (if provided)
  if (Array.isArray(f.companies) && f.companies.length) {
    const ok = f.companies.some(c => lc(job.company_name) === lc(c));
    if (!ok) return null;
  }

  let score = 0;
  let signals = 0;

  const roleMatch = matchesAny(job.title, f.roles);
  if (roleMatch !== null) { signals++; if (roleMatch) score += 3; else return null; }

  const locMatch = matchesAny(job.location, f.locations);
  if (locMatch !== null) { signals++; if (locMatch) score += 2; }
  // location is a soft filter — still surface unmatched if other signals are strong

  const senMatch = matchesSeniority(job.title, f.seniority);
  if (senMatch !== null) { signals++; if (senMatch) score += 2; }

  // Recency boost
  if (job.last_seen_at) {
    const age = (Date.now() - new Date(job.last_seen_at).getTime()) / (24 * 3600 * 1000);
    if (age < 1) score += 1;
    else if (age < 3) score += 0.5;
  }

  // If user provided no filters at all, surface everything with neutral score
  if (signals === 0) score = 1;

  return score;
}

/**
 * Match and rank jobs for a single user.
 * @param {Object} user        { job_filters }
 * @param {Array}  jobs        rows from job_postings
 * @param {number} [topN=10]
 * @returns {Array}            top N jobs with .score added, sorted desc
 */
export function matchJobs(user, jobs, topN = 10) {
  const filters = user?.job_filters || {};
  const scored = [];
  for (const j of jobs || []) {
    const s = scoreJob(j, filters);
    if (s !== null && s > 0) scored.push({ ...j, score: s });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}
