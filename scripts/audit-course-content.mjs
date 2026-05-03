#!/usr/bin/env node
// Course validation audit — runs every day's codeExample end-to-end.
// Outputs JSON summary to stdout and /tmp/course-audit.json.

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASTRO_DIR = path.join(REPO_ROOT, 'astro-app/public/days');
const LEGACY_DIR = path.join(REPO_ROOT, 'public/days');
const EXTRACT_TIMEOUT_MS = 2000;

const STOPWORDS = new Set([
  'the','a','an','of','to','for','in','on','and','or','with','is','are','be','as',
  'by','from','that','this','these','those','it','at','into','your','you','we','our',
  'how','what','why','when','will','can','should','do','does','have','has','if','but',
  'they','their','them','also','more','most','than','then','use','using','used','make','makes'
]);

function tokenize(text) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .replace(/<[^>]*>/g, ' ')
      .split(/[^a-z0-9_-]+/)
      .filter(w => w.length >= 4 && !STOPWORDS.has(w))
  );
}

function extractDay(file, n) {
  const src = fs.readFileSync(file, 'utf8');
  // Sandbox: no fs/process/require — only a fake `window`. vm.Script with
  // a 2s timeout prevents a malicious or accidentally-infinite-loop day file
  // from hanging CI.
  const sandbox = { window: { COURSE_DAY_DATA: {} } };
  const ctx = vm.createContext(sandbox, { name: `day-${n}` });
  const script = new vm.Script(src, { filename: file });
  script.runInContext(ctx, { timeout: EXTRACT_TIMEOUT_MS });
  return sandbox.window.COURSE_DAY_DATA[n];
}

function execWithTimeout(cmd, args, code, timeoutMs = 10000) {
  // Spawn with stdin since some examples may use input(); but ours don't.
  const tmpFile = `/tmp/audit-${process.pid}.${cmd === 'python3' ? 'py' : 'js'}`;
  fs.writeFileSync(tmpFile, code);
  try {
    const out = execSync(`${cmd} ${tmpFile}`, {
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
    return { ok: true, stdout: out, stderr: '' };
  } catch (e) {
    if (e.killed && e.signal === 'SIGTERM') {
      return { ok: false, stdout: e.stdout?.toString() || '', stderr: 'TIMEOUT' };
    }
    return {
      ok: false,
      stdout: e.stdout?.toString() || '',
      stderr: (e.stderr?.toString() || e.message || '').slice(0, 400),
    };
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

const report = { days: [], summary: {} };
let okCount = 0, failCount = 0, missingCount = 0, mismatchCount = 0, lowOverlap = 0;

for (let n = 1; n <= 60; n++) {
  const NN = String(n).padStart(2, '0');
  const astroPath = `${ASTRO_DIR}/day-${NN}.js`;
  const legacyPath = `${LEGACY_DIR}/day-${NN}.js`;

  const entry = { n, lang: null, mirror: null, parse: null, syntax: null, exec: null, logs: 0, lines: 0, overlap: 0, overlapWords: [], notes: [] };

  if (!fs.existsSync(astroPath)) {
    entry.notes.push('astro file missing');
    failCount++;
    report.days.push(entry);
    continue;
  }

  // Mirror check
  if (fs.existsSync(legacyPath)) {
    const a = fs.readFileSync(astroPath, 'utf8');
    const l = fs.readFileSync(legacyPath, 'utf8');
    entry.mirror = a === l ? 'ok' : 'mismatch';
    if (a !== l) mismatchCount++;
  } else {
    entry.mirror = 'missing-legacy';
  }

  let day;
  try {
    day = extractDay(astroPath, n);
    entry.parse = 'ok';
  } catch (e) {
    entry.parse = 'fail';
    entry.notes.push(`parse: ${e.message.slice(0, 120)}`);
    failCount++;
    report.days.push(entry);
    continue;
  }

  const ex = day && day.codeExample;
  if (!ex || !ex.code) {
    entry.notes.push('no codeExample');
    missingCount++;
    report.days.push(entry);
    continue;
  }

  entry.lang = ex.lang;
  entry.lines = ex.code.split('\n').length;
  const logRe = ex.lang === 'python' ? /print\s*\(/g : /console\.\w+\s*\(/g;
  entry.logs = (ex.code.match(logRe) || []).length;

  // Syntax check
  const ext = ex.lang === 'python' ? 'py' : 'js';
  const synFile = `/tmp/audit-syn-${n}.${ext}`;
  fs.writeFileSync(synFile, ex.code);
  try {
    if (ex.lang === 'python') execSync(`python3 -m py_compile ${synFile}`, { stdio: 'pipe' });
    else execSync(`node --check ${synFile}`, { stdio: 'pipe' });
    entry.syntax = 'ok';
  } catch (e) {
    entry.syntax = 'fail';
    entry.notes.push(`syntax: ${(e.stderr?.toString() || e.message).slice(0, 200)}`);
  } finally {
    try { fs.unlinkSync(synFile); } catch {}
  }

  // Execute
  if (entry.syntax === 'ok') {
    const cmd = ex.lang === 'python' ? 'python3' : 'node';
    const res = execWithTimeout(cmd, [], ex.code, 10000);
    if (res.ok) {
      const outLines = res.stdout.split('\n').filter(Boolean).length;
      entry.exec = 'ok';
      entry.outLines = outLines;
      if (outLines < 10) entry.notes.push(`only ${outLines} output lines`);
    } else {
      entry.exec = 'fail';
      entry.notes.push(`exec: ${res.stderr.slice(0, 250)}`);
    }
  }

  // Topic-fit overlap
  const subjectText = (day.subtitle || '') + ' ' + (day.pmAngle || '') + ' ' + (ex.title || '');
  const topicWords = tokenize(subjectText);
  const codeWords = tokenize(ex.code.replace(/[#/*]+/g, ' '));
  const intersection = [...topicWords].filter(w => codeWords.has(w));
  entry.overlap = intersection.length;
  entry.overlapWords = intersection.slice(0, 8);
  if (intersection.length < 2) lowOverlap++;

  if (entry.parse === 'ok' && entry.syntax === 'ok' && entry.exec === 'ok' && entry.mirror !== 'mismatch') okCount++;
  else if (entry.exec === 'fail' || entry.syntax === 'fail') failCount++;

  report.days.push(entry);
}

report.summary = {
  total: 60,
  ok: okCount,
  fail: failCount,
  missingCodeExample: missingCount,
  mirrorMismatch: mismatchCount,
  lowTopicOverlap: lowOverlap,
};

fs.writeFileSync('/tmp/course-audit.json', JSON.stringify(report, null, 2));
console.log('=== Course Validation Audit ===');
console.log(JSON.stringify(report.summary, null, 2));
console.log('\n--- Per-day issues ---');
for (const d of report.days) {
  if (d.notes.length || d.mirror === 'mismatch' || d.exec === 'fail' || d.syntax === 'fail' || d.overlap < 2) {
    console.log(`day-${String(d.n).padStart(2,'0')} lang=${d.lang} mirror=${d.mirror} syntax=${d.syntax} exec=${d.exec} logs=${d.logs} overlap=${d.overlap}${d.overlapWords?.length?' ['+d.overlapWords.join(',')+']':''}`);
    for (const note of d.notes) console.log(`   ⚠  ${note}`);
  }
}
console.log('\nFull report: /tmp/course-audit.json');
