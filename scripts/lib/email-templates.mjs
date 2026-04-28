// scripts/lib/email-templates.mjs
// HTML + text email templates for notification agents.
// Visual identity: dark headings, beige bg, amber accents. Matches site styling.

import { unsubscribeUrl } from '../../lib/email.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

const FOOTER_STYLE = 'border-top:1px solid #ede8df;padding-top:18px;margin-top:24px;font-size:12px;color:#8c7f74;line-height:1.6;';
const SHELL_OPEN = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f0e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1512;"><div style="max-width:600px;margin:0 auto;padding:32px 20px;"><div style="text-align:center;margin-bottom:24px;"><span style="font-family:'Courier New',monospace;font-size:13px;letter-spacing:.15em;color:#c8590a;font-weight:700;">becomeaipm</span></div><div style="background:#ffffff;border:1px solid #d4cdc4;border-radius:8px;padding:32px 28px;">`;
const SHELL_CLOSE_TEMPLATE = (footerHtml) => `</div>${footerHtml}</div></body></html>`;

function footerHtml(unsubToken, kind) {
  const unsubLink = unsubscribeUrl(unsubToken, kind);
  const unsubAll = unsubscribeUrl(unsubToken, 'all');
  return `<div style="${FOOTER_STYLE}">
    <p style="margin:0 0 6px;">You're getting this because you opted in on <a href="https://becomeaipm.com/settings.html" style="color:#c8590a;">becomeaipm.com</a>.</p>
    <p style="margin:0;"><a href="${unsubLink}" style="color:#8c7f74;">Unsubscribe from these emails</a> · <a href="${unsubAll}" style="color:#8c7f74;">Unsubscribe from all</a> · <a href="https://becomeaipm.com/settings.html" style="color:#8c7f74;">Manage preferences</a></p>
  </div>`;
}

// ─── Job alert ────────────────────────────────────────────────────
function jobRowHtml(j) {
  const company = escapeHtml(j.company_name || 'Company');
  const title = escapeHtml(j.title || 'Role');
  const loc = j.location ? escapeHtml(j.location) : (j.remote ? 'Remote' : '—');
  const url = j.job_url || '#';
  return `<tr><td style="padding:14px 0;border-bottom:1px solid #ede8df;">
    <div style="font-size:15px;font-weight:600;color:#1a1512;margin:0 0 4px;"><a href="${escapeHtml(url)}" style="color:#1a1512;text-decoration:none;">${title}</a></div>
    <div style="font-size:13px;color:#8c7f74;">${company} · ${loc}</div>
  </td></tr>`;
}

export function renderJobAlert({ user, jobs, weekLabel }) {
  const count = jobs.length;
  const subject = count === 1
    ? `1 new AI PM role this week`
    : `${count} new AI PM roles this week`;

  const intro = `Here ${count === 1 ? 'is the role' : 'are the roles'} that matched your filters from the past 7 days. Most postings stay active for 2–4 weeks, so move quickly on the ones that fit.`;
  const rows = jobs.map(jobRowHtml).join('');

  const html = SHELL_OPEN + `
    <h1 style="font-size:20px;margin:0 0 8px;">${count} ${count === 1 ? 'role' : 'roles'} matched this week</h1>
    <p style="font-size:13px;color:#8c7f74;margin:0 0 18px;">${escapeHtml(weekLabel)}</p>
    <p style="font-size:14px;color:#3d3530;line-height:1.6;margin:0 0 18px;">${intro}</p>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <div style="text-align:center;margin:24px 0 4px;">
      <a href="https://becomeaipm.com/companies.html" style="display:inline-block;padding:10px 22px;background:#1a1512;color:#fff;text-decoration:none;border-radius:4px;font-size:13px;font-weight:600;">Browse all 240+ companies →</a>
    </div>
  ` + SHELL_CLOSE_TEMPLATE(footerHtml(user.unsubscribe_token, 'job_alert'));

  const text = [
    `${subject} (${weekLabel})`,
    '',
    intro,
    '',
    ...jobs.map(j => `• ${j.title} — ${j.company_name} (${j.location || (j.remote ? 'Remote' : '—')})\n  ${j.job_url || ''}`),
    '',
    'Browse all companies: https://becomeaipm.com/companies.html',
    '',
    `Unsubscribe: ${unsubscribeUrl(user.unsubscribe_token, 'job_alert')}`,
    `Manage preferences: https://becomeaipm.com/settings.html`,
  ].join('\n');

  return { subject, html, text };
}

// ─── Interview prep ───────────────────────────────────────────────
function questionHtml(q, idx) {
  return `<div style="background:#fbf8f2;border-left:3px solid #c8590a;padding:16px 18px;margin:0 0 16px;">
    <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:.1em;color:#c8590a;margin:0 0 6px;">QUESTION ${idx + 1}</div>
    <div style="font-size:15px;font-weight:600;color:#1a1512;line-height:1.5;margin:0 0 10px;">${escapeHtml(q.question)}</div>
    <div style="font-size:13px;color:#3d3530;line-height:1.65;"><strong style="color:#1a1512;">How to answer:</strong> ${escapeHtml(q.answer)}</div>
  </div>`;
}

export function renderInterviewPrep({ user, questions, weekLabel, headlines }) {
  const subject = `This week's 3 AI PM interview questions`;

  const headlinesHtml = headlines && headlines.length
    ? `<p style="font-size:13px;color:#8c7f74;line-height:1.6;margin:0 0 18px;">Generated from this week's AI news: ${
        headlines.slice(0, 3).map(h => escapeHtml(h)).join(' · ')
      }</p>`
    : '';

  const html = SHELL_OPEN + `
    <h1 style="font-size:20px;margin:0 0 8px;">3 fresh AI PM interview questions</h1>
    <p style="font-size:13px;color:#8c7f74;margin:0 0 18px;">${escapeHtml(weekLabel)}</p>
    ${headlinesHtml}
    <p style="font-size:14px;color:#3d3530;line-height:1.6;margin:0 0 20px;">These are based on real announcements and shifts from the past week. Practice each out loud — interviewers can tell when an answer is rehearsed vs. internalised.</p>
    ${questions.map(questionHtml).join('')}
    <div style="text-align:center;margin:20px 0 4px;">
      <a href="https://becomeaipm.com/course.html" style="display:inline-block;padding:10px 22px;background:#1a1512;color:#fff;text-decoration:none;border-radius:4px;font-size:13px;font-weight:600;">Continue the course →</a>
    </div>
  ` + SHELL_CLOSE_TEMPLATE(footerHtml(user.unsubscribe_token, 'interview_prep'));

  const text = [
    `${subject} (${weekLabel})`,
    '',
    'These are based on real announcements from the past week.',
    '',
    ...questions.map((q, i) => `Q${i + 1}: ${q.question}\n\nHow to answer: ${q.answer}\n`),
    `Continue the course: https://becomeaipm.com/course.html`,
    '',
    `Unsubscribe: ${unsubscribeUrl(user.unsubscribe_token, 'interview_prep')}`,
    `Manage preferences: https://becomeaipm.com/settings.html`,
  ].join('\n');

  return { subject, html, text };
}
