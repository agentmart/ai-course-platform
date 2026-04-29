import type { APIRoute } from 'astro';
import { envFrom, getSupabaseAdmin, jsonResponse, appCors } from '~/lib/handler';

export const prerender = false;

export const OPTIONS: APIRoute = ({ locals }) =>
  new Response(null, { status: 204, headers: appCors(envFrom(locals)) });

export const POST: APIRoute = async ({ locals, request }) => {
  const env = envFrom(locals);
  const cors = appCors(env);
  const body = (await request.json().catch(() => ({}))) as Record<string, string>;
  const { name, email, subject, message, turnstileToken } = body;

  if (!name || !email || !subject || !message) {
    return jsonResponse({ error: 'All fields are required.' }, { status: 400, headers: cors });
  }
  if (message.length > 5000 || name.length > 100 || email.length > 200) {
    return jsonResponse({ error: 'Input exceeds maximum length.' }, { status: 400, headers: cors });
  }
  const validSubjects = ['bug', 'feature', 'content', 'partnership', 'general'];
  if (!validSubjects.includes(subject)) {
    return jsonResponse({ error: 'Invalid subject.' }, { status: 400, headers: cors });
  }

  if (env.TURNSTILE_SECRET_KEY) {
    if (!turnstileToken) {
      return jsonResponse({ error: 'Please complete the captcha verification.' }, { status: 400, headers: cors });
    }
    try {
      const forwardedFor = request.headers.get('x-forwarded-for');
      const clientIp = forwardedFor?.split(',')[0].trim();
      const formData = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: turnstileToken });
      if (clientIp) formData.append('remoteip', clientIp);
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });
      const verifyData = (await verifyRes.json()) as { success?: boolean };
      if (!verifyData.success) {
        return jsonResponse({ error: 'Captcha verification failed. Please try again.' }, { status: 400, headers: cors });
      }
    } catch (err) {
      console.error('Turnstile verification error:', err);
      return jsonResponse({ error: 'Captcha verification service unavailable.' }, { status: 500, headers: cors });
    }
  }

  const supabase = getSupabaseAdmin(env);
  const { error: dbError } = await supabase.from('contact_submissions').insert({ name, email, subject, message });
  if (dbError) {
    console.error('DB insert error:', dbError);
    return jsonResponse({ error: 'Failed to save message. Please try again.' }, { status: 500, headers: cors });
  }

  if ((subject === 'bug' || subject === 'feature' || subject === 'content') && env.GITHUB_TOKEN) {
    try {
      await createGitHubIssue({ name, email, subject, message }, env.GITHUB_TOKEN);
    } catch (ghErr: any) {
      console.error('GitHub issue creation failed:', ghErr?.message);
    }
  }

  return jsonResponse({ ok: true }, { headers: cors });
};

async function createGitHubIssue(
  { name, email, subject, message }: { name: string; email: string; subject: string; message: string },
  token: string
) {
  const labels: Record<string, string> = { bug: 'bug', feature: 'feature-request', content: 'content-fix' };
  const subjectTitles: Record<string, string> = { bug: 'Bug Report', feature: 'Feature Request', content: 'Content Fix' };
  const title = `[${subjectTitles[subject]}] ${message.slice(0, 80)}${message.length > 80 ? '…' : ''}`;
  const issueBody = `## ${subjectTitles[subject]}\n\n**From:** ${name} (${email})\n**Source:** Contact Form\n\n### Description\n\n${message}\n\n---\n*Auto-created from becomeaipm.com contact form*`;
  const response = await fetch('https://api.github.com/repos/agentmart/ai-course-platform/issues', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, body: issueBody, labels: [labels[subject] ?? 'bug'] }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GitHub API ${response.status}: ${errText}`);
  }
}
