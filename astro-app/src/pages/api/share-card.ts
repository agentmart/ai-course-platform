// Sprint 5 — server-rendered SVG share cards.
// Used for:
//   - milestone shares (badge earned, streak hit) from /course
//   - OG image on /pledge/[token].astro (pledge embed in social shares)
//
// Routes:
//   GET /api/share-card?type=streak&name=Stavan&n=14
//   GET /api/share-card?type=badge&name=Stavan&n=7
//   GET /api/share-card?type=pledge&name=Stavan&date=2026-05-28&text=Demo+a+RAG+app
//
// SVG only (cheaper than image generation; renders perfectly in social previews
// for Twitter/X via summary_large_image and LinkedIn via og:image). Cached 1h
// at the edge.

import type { APIRoute } from 'astro';

export const prerender = false;

const W = 1200;
const H = 630;

function escape(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clip(s: string, max: number): string {
  if (!s) return '';
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

function shell(inner: string, accent = '#f59e0b'): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1a1a"/>
      <stop offset="100%" stop-color="#0a0a0a"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="8" fill="${accent}"/>
  <text x="60" y="80" font-family="ui-sans-serif, -apple-system, system-ui, sans-serif" font-size="28" font-weight="600" fill="#a3a3a3">becomeaipm.com · 60-Day AI PM Course</text>
  ${inner}
  <text x="60" y="${H - 40}" font-family="ui-sans-serif, -apple-system, system-ui, sans-serif" font-size="22" fill="#737373">becomeaipm.com</text>
</svg>`;
}

function streakCard(name: string, n: number) {
  const flame = n >= 7 ? '🔥🔥' : '🔥';
  return shell(`
    <text x="60" y="220" font-family="ui-sans-serif, system-ui, sans-serif" font-size="56" font-weight="700" fill="#f5f5f4">${escape(clip(name, 32))}</text>
    <text x="60" y="380" font-family="ui-sans-serif, system-ui, sans-serif" font-size="180" font-weight="800" fill="#f59e0b">${n}</text>
    <text x="60" y="440" font-family="ui-sans-serif, system-ui, sans-serif" font-size="44" font-weight="600" fill="#fafaf9">day streak ${flame}</text>
    <text x="60" y="500" font-family="ui-sans-serif, system-ui, sans-serif" font-size="28" fill="#a3a3a3">Learning to ship AI products, one day at a time.</text>
  `);
}

function badgeCard(name: string, n: number) {
  const label =
    n >= 60 ? 'Course Complete' :
    n >= 30 ? '30-Day Veteran' :
    n >= 28 ? 'Sprint Capstone' :
    n >= 14 ? '2-Week Builder' :
    n >= 7  ? 'First Week Done' : `Day ${n}`;
  return shell(`
    <circle cx="220" cy="320" r="120" fill="#f59e0b" opacity="0.18"/>
    <circle cx="220" cy="320" r="80" fill="#f59e0b"/>
    <text x="220" y="340" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="64" font-weight="800" fill="#0a0a0a">${n}</text>
    <text x="380" y="270" font-family="ui-sans-serif, system-ui, sans-serif" font-size="36" font-weight="500" fill="#a3a3a3">Earned by</text>
    <text x="380" y="330" font-family="ui-sans-serif, system-ui, sans-serif" font-size="56" font-weight="700" fill="#f5f5f4">${escape(clip(name, 24))}</text>
    <text x="380" y="400" font-family="ui-sans-serif, system-ui, sans-serif" font-size="44" font-weight="600" fill="#f59e0b">${escape(label)}</text>
    <text x="380" y="460" font-family="ui-sans-serif, system-ui, sans-serif" font-size="26" fill="#a3a3a3">becomeaipm.com</text>
  `);
}

function pledgeCard(name: string, date: string, text: string) {
  // wrap pledge text (very rough): split into 2 lines max at ~38 chars
  const safe = clip(text, 76);
  const line1 = safe.length <= 38 ? safe : safe.slice(0, 38).split(' ').slice(0, -1).join(' ');
  const line2 = safe.length <= 38 ? '' : safe.slice(line1.length).trim();
  return shell(`
    <text x="60" y="200" font-family="ui-sans-serif, system-ui, sans-serif" font-size="32" font-weight="500" fill="#a3a3a3">Public AI PM pledge by</text>
    <text x="60" y="270" font-family="ui-sans-serif, system-ui, sans-serif" font-size="60" font-weight="700" fill="#f5f5f4">${escape(clip(name, 28))}</text>
    <text x="60" y="370" font-family="ui-sans-serif, system-ui, sans-serif" font-size="44" font-weight="600" fill="#fafaf9">${escape(line1)}</text>
    ${line2 ? `<text x="60" y="425" font-family="ui-sans-serif, system-ui, sans-serif" font-size="44" font-weight="600" fill="#fafaf9">${escape(line2)}</text>` : ''}
    <text x="60" y="510" font-family="ui-sans-serif, system-ui, sans-serif" font-size="32" fill="#f59e0b">Demo date: ${escape(date)}</text>
  `);
}

export const GET: APIRoute = ({ url }) => {
  const type = (url.searchParams.get('type') ?? 'streak').toLowerCase();
  const name = url.searchParams.get('name') ?? 'Future AI PM';
  const n = Number(url.searchParams.get('n') ?? '0') | 0;

  let svg: string;
  if (type === 'badge') svg = badgeCard(name, n);
  else if (type === 'pledge') {
    svg = pledgeCard(
      name,
      url.searchParams.get('date') ?? '',
      url.searchParams.get('text') ?? ''
    );
  } else svg = streakCard(name, n);

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
      'access-control-allow-origin': '*',
    },
  });
};
