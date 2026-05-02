#!/usr/bin/env node
/**
 * Codemod: public/days/day-NN.js -> astro-app/src/content/days/day-NN.mdx
 *
 * Strategy:
 * 1. Read each day-NN.js, sandbox-execute to capture window.COURSE_DAY_DATA[N]
 * 2. Emit MDX with YAML frontmatter (day, subtitle, tasks, codeExample, interview, pmAngle, resources, track)
 * 3. Body of the MDX is the `context` HTML rendered as MDX (HTML inside MDX is fine)
 *
 * Day 26 is missing per repo memory — we skip it gracefully.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DAYS_DIR = path.join(REPO_ROOT, 'public', 'days');
const OUT_DIR = path.join(REPO_ROOT, 'astro-app', 'src', 'content', 'days');

const yamlEscape = (s) => {
  if (s == null) return '""';
  return JSON.stringify(String(s));
};

const yamlBlock = (key, str, indent = 0) => {
  // Always JSON-encode (flow scalar) — YAML accepts this and it's robust against
  // indentation, leading +/-/?/:, embedded quotes, and trailing whitespace.
  const pad = ' '.repeat(indent);
  return `${pad}${key}: ${JSON.stringify(String(str ?? ''))}`;
};

const renderResource = (r) => {
  const note = r.note ? `\n      note: ${yamlEscape(r.note)}` : '';
  return `    - type: ${yamlEscape(r.type)}\n      title: ${yamlEscape(r.title)}\n      url: ${yamlEscape(r.url)}${note}`;
};

const renderTask = (t) => {
  return `    - title: ${yamlEscape(t.title)}\n      time: ${Number(t.time) || 25}\n${yamlBlock('description', t.description, 6)}`;
};

const buildFrontmatter = (n, data) => {
  const parts = [];
  parts.push(`day: ${n}`);
  parts.push(`subtitle: ${yamlEscape(data.subtitle ?? '')}`);
  parts.push(`track: full`);
  parts.push(`tasks:`);
  for (const t of data.tasks ?? []) parts.push(renderTask(t));
  parts.push(`codeExample:`);
  parts.push(`  title: ${yamlEscape(data.codeExample?.title ?? '')}`);
  parts.push(`  lang: ${yamlEscape(data.codeExample?.lang ?? 'python')}`);
  parts.push(yamlBlock('code', data.codeExample?.code ?? '', 2));
  parts.push(`interview:`);
  parts.push(yamlBlock('question', data.interview?.question ?? '', 2));
  parts.push(yamlBlock('answer', data.interview?.answer ?? '', 2));
  parts.push(yamlBlock('pmAngle', data.pmAngle ?? '', 0));
  parts.push(yamlBlock('context', data.context ?? '', 0));
  parts.push(`resources:`);
  for (const r of data.resources ?? []) parts.push(renderResource(r));
  return parts.join('\n');
};

/** Make raw HTML body MDX-safe: self-close void elements, escape JSX expression braces in text. */
function mdxSafeHtml(html) {
  let out = html;
  // Self-close common void elements (br, hr, img, input)
  out = out.replace(/<br\s*>/gi, '<br/>');
  out = out.replace(/<hr\s*>/gi, '<hr/>');
  out = out.replace(/<img\b([^>]*?)(?<!\/)>/gi, '<img$1/>');
  out = out.replace(/<input\b([^>]*?)(?<!\/)>/gi, '<input$1/>');
  // Escape stray `{` and `}` in text nodes (MDX 3 reads them as JSX expressions)
  // Walk char by char tracking whether we're inside a tag.
  let buf = '';
  let inTag = false;
  for (let i = 0; i < out.length; i++) {
    const ch = out[i];
    if (!inTag && ch === '<') {
      inTag = true;
      buf += ch;
    } else if (inTag && ch === '>') {
      inTag = false;
      buf += ch;
    } else if (!inTag && (ch === '{' || ch === '}')) {
      buf += '\\' + ch;
    } else {
      buf += ch;
    }
  }
  return buf;
}

async function processDay(n) {
  const file = path.join(DAYS_DIR, `day-${String(n).padStart(2, '0')}.js`);
  let src;
  try {
    src = await fs.readFile(file, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.log(`⊘ day-${n}: missing source (expected for day 26)`);
      return false;
    }
    throw e;
  }
  const sandbox = { window: { COURSE_DAY_DATA: {} } };
  vm.createContext(sandbox);
  try {
    vm.runInContext(src, sandbox, { filename: file, timeout: 5000 });
  } catch (e) {
    console.error(`✗ day-${n}: sandbox execution failed:`, e.message);
    return false;
  }
  const data = sandbox.window.COURSE_DAY_DATA[n];
  if (!data) {
    console.error(`✗ day-${n}: COURSE_DAY_DATA[${n}] not set after execution`);
    return false;
  }
  const frontmatter = buildFrontmatter(n, data);
  // Migrated days: keep legacy HTML in frontmatter (rendered via set:html).
  // New days authored from scratch can use the MDX body instead.
  const body = '';
  const mdx = `---\n${frontmatter}\n---\n${body}\n`;
  const out = path.join(OUT_DIR, `day-${String(n).padStart(2, '0')}.mdx`);
  await fs.writeFile(out, mdx, 'utf8');
  console.log(`✓ day-${n} -> ${path.relative(REPO_ROOT, out)}`);
  return true;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  let ok = 0;
  let skip = 0;
  for (let n = 1; n <= 60; n++) {
    const r = await processDay(n);
    if (r) ok++;
    else skip++;
  }
  console.log(`\nDone. ${ok} migrated, ${skip} skipped/missing.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
