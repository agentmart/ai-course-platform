import type { APIRoute } from 'astro';
import { envFrom, jsonResponse, appCors } from '~/lib/handler';
import { verifyClerkToken, bearerToken } from '~/lib/clerk';

export const prerender = false;

const GITHUB_REPO = 'agentmart/ai-course-platform';
const PROJECT_ID = 1;

export const OPTIONS: APIRoute = ({ locals }) =>
  new Response(null, { status: 204, headers: appCors(envFrom(locals)) });

export const POST: APIRoute = async ({ locals, request }) => {
  const env = envFrom(locals);
  const cors = appCors(env);

  let user;
  try {
    user = await verifyClerkToken(bearerToken(request), env);
  } catch {
    return jsonResponse({ error: 'Invalid token' }, { status: 401, headers: cors });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, string>;
  const { title, description, category, priority } = body;
  if (!title || !description || !category) {
    return jsonResponse(
      { error: 'Title, description, and category are required.' },
      { status: 400, headers: cors }
    );
  }
  if (title.length > 200 || description.length > 5000) {
    return jsonResponse({ error: 'Input exceeds maximum length.' }, { status: 400, headers: cors });
  }
  const validCategories = ['bug', 'feature', 'content'];
  const validPriorities = ['low', 'medium', 'high'];
  if (!validCategories.includes(category)) {
    return jsonResponse({ error: 'Invalid category.' }, { status: 400, headers: cors });
  }

  // @ts-expect-error — GH_PAT_TOKEN may not be in our typed Env
  const ghToken = env.GH_PAT_TOKEN ?? env.GITHUB_TOKEN;
  if (!ghToken) {
    return jsonResponse({ error: 'Feedback system not configured.' }, { status: 500, headers: cors });
  }

  const labels = [category === 'bug' ? 'bug' : category === 'feature' ? 'feature-request' : 'content-fix'];
  if (validPriorities.includes(priority)) labels.push(`priority:${priority}`);

  const categoryTitle = (
    { bug: 'Bug', feature: 'Feature', content: 'Content Fix' } as Record<string, string>
  )[category];
  const issueTitle = `[${categoryTitle}] ${title}`;
  const issueBody = [
    `## ${categoryTitle} Report`,
    '',
    `**Submitted by:** ${user.email ?? user.sub}`,
    `**Priority:** ${priority ?? 'not set'}`,
    `**Source:** In-app feedback form`,
    '',
    '### Description',
    '',
    description,
    '',
    '---',
    '*Auto-created from becomeaipm.com feedback form*',
  ].join('\n');

  const issueRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ghToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: issueTitle, body: issueBody, labels }),
  });
  if (!issueRes.ok) {
    const errText = await issueRes.text();
    console.error('GitHub issue creation failed:', errText);
    return jsonResponse({ error: 'Failed to create feedback issue.' }, { status: 500, headers: cors });
  }
  const issue = (await issueRes.json()) as { html_url: string; number: number; node_id: string };
  try {
    await addToProjectBoard(ghToken, issue.node_id);
  } catch (projErr: any) {
    console.error('Project board add failed (non-critical):', projErr?.message);
  }
  return jsonResponse(
    { ok: true, issueUrl: issue.html_url, issueNumber: issue.number },
    { headers: cors }
  );
};

async function addToProjectBoard(ghToken: string, issueNodeId: string) {
  const projectQuery = `query { organization(login: "agentmart") { projectV2(number: ${PROJECT_ID}) { id } } }`;
  const projRes = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ghToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: projectQuery }),
  });
  const projData = (await projRes.json()) as { data?: { organization?: { projectV2?: { id?: string } } } };
  const projectNodeId = projData?.data?.organization?.projectV2?.id;
  if (!projectNodeId) return;
  const addMutation = `mutation { addProjectV2ItemById(input: { projectId: "${projectNodeId}", contentId: "${issueNodeId}" }) { item { id } } }`;
  await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ghToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: addMutation }),
  });
}
