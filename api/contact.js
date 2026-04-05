// api/contact.js
// Handles contact form submissions with Cloudflare Turnstile verification.
// Stores submissions in Supabase and optionally creates GitHub issues for bugs.
// POST /api/contact
// Body: { name, email, subject, message, turnstileToken }

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, subject, message, turnstileToken } = req.body || {};

  // Validate required fields
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (message.length > 5000 || name.length > 100 || email.length > 200) {
    return res.status(400).json({ error: 'Input exceeds maximum length.' });
  }
  const validSubjects = ['bug', 'feature', 'content', 'partnership', 'general'];
  if (!validSubjects.includes(subject)) {
    return res.status(400).json({ error: 'Invalid subject.' });
  }

  // Verify Cloudflare Turnstile token
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    if (!turnstileToken) {
      return res.status(400).json({ error: 'Please complete the captcha verification.' });
    }
    try {
      const forwardedFor = req.headers['x-forwarded-for'];
      const clientIp = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : typeof forwardedFor === 'string'
          ? forwardedFor.split(',')[0].trim()
          : req.headers['x-real-ip'] || req.socket?.remoteAddress;
      const formData = new URLSearchParams({
        secret: turnstileSecret,
        response: turnstileToken,
      });
      if (clientIp) {
        formData.append('remoteip', clientIp);
      }
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return res.status(400).json({ error: 'Captcha verification failed. Please try again.' });
      }
    } catch (err) {
      console.error('Turnstile verification error:', err);
      return res.status(500).json({ error: 'Captcha verification service unavailable.' });
    }
  }

  try {
    // Store in Supabase
    const { error: dbError } = await supabase.from('contact_submissions').insert({
      name,
      email,
      subject,
      message,
    });
    if (dbError) {
      console.error('DB insert error:', dbError);
      return res.status(500).json({ error: 'Failed to save message. Please try again.' });
    }

    // Create GitHub issue for bug reports and feature requests
    if ((subject === 'bug' || subject === 'feature' || subject === 'content') && process.env.GITHUB_TOKEN) {
      try {
        await createGitHubIssue({ name, email, subject, message });
      } catch (ghErr) {
        // Don't fail the request if GitHub issue creation fails
        console.error('GitHub issue creation failed:', ghErr.message);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

async function createGitHubIssue({ name, email, subject, message }) {
  const labels = { bug: 'bug', feature: 'feature-request', content: 'content-fix' };
  const subjectTitles = { bug: 'Bug Report', feature: 'Feature Request', content: 'Content Fix' };
  const title = `[${subjectTitles[subject]}] ${message.slice(0, 80)}${message.length > 80 ? '…' : ''}`;
  const body = `## ${subjectTitles[subject]}\n\n**From:** ${name} (${email})\n**Source:** Contact Form\n\n### Description\n\n${message}\n\n---\n*Auto-created from becomeaipm.com contact form*`;

  const response = await fetch('https://api.github.com/repos/agentmart/ai-course-platform/issues', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      body,
      labels: [labels[subject] || 'bug'],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GitHub API ${response.status}: ${errText}`);
  }
}
