// api/create-feedback.js
// Creates a GitHub issue from authenticated user feedback and adds it to the project board.
// POST /api/create-feedback
// Body: { title, description, category, priority }
// Requires: Clerk JWT auth

import { verifyClerkToken } from '../lib/clerk.js';

const GITHUB_REPO = 'agentmart/ai-course-platform';
const PROJECT_ID = 1; // https://github.com/orgs/agentmart/projects/1

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Require authentication
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.replace('Bearer ', '');
  let clerkUser;
  try {
    clerkUser = await verifyClerkToken(token);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (!clerkUser) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { title, description, category, priority } = req.body || {};

  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Title, description, and category are required.' });
  }
  if (title.length > 200 || description.length > 5000) {
    return res.status(400).json({ error: 'Input exceeds maximum length.' });
  }
  const validCategories = ['bug', 'feature', 'content'];
  const validPriorities = ['low', 'medium', 'high'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category.' });
  }

  const ghToken = process.env.GH_PAT_TOKEN;
  if (!ghToken) {
    return res.status(500).json({ error: 'Feedback system not configured.' });
  }

  try {
    const labels = [category === 'bug' ? 'bug' : category === 'feature' ? 'feature-request' : 'content-fix'];
    if (validPriorities.includes(priority)) labels.push(`priority:${priority}`);

    const categoryTitle = { bug: 'Bug', feature: 'Feature', content: 'Content Fix' }[category];
    const issueTitle = `[${categoryTitle}] ${title}`;
    const issueBody = [
      `## ${categoryTitle} Report`,
      '',
      `**Submitted by:** ${clerkUser.email || clerkUser.sub}`,
      `**Priority:** ${priority || 'not set'}`,
      `**Source:** In-app feedback form`,
      '',
      '### Description',
      '',
      description,
      '',
      '---',
      '*Auto-created from becomeaipm.com feedback form*',
    ].join('\n');

    // Create the issue
    const issueRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: issueTitle, body: issueBody, labels }),
    });

    if (!issueRes.ok) {
      const errText = await issueRes.text();
      console.error('GitHub issue creation failed:', errText);
      return res.status(500).json({ error: 'Failed to create feedback issue.' });
    }

    const issue = await issueRes.json();

    // Try to add to project board via GraphQL (best-effort)
    try {
      await addToProjectBoard(ghToken, issue.node_id);
    } catch (projErr) {
      console.error('Project board add failed (non-critical):', projErr.message);
    }

    return res.status(200).json({ ok: true, issueUrl: issue.html_url, issueNumber: issue.number });
  } catch (err) {
    console.error('Feedback error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

async function addToProjectBoard(ghToken, issueNodeId) {
  // First, get the project's node ID
  const projectQuery = `query {
    organization(login: "agentmart") {
      projectV2(number: ${PROJECT_ID}) { id }
    }
  }`;

  const projRes = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ghToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: projectQuery }),
  });
  const projData = await projRes.json();
  const projectNodeId = projData?.data?.organization?.projectV2?.id;
  if (!projectNodeId) return;

  // Add the issue to the project
  const addMutation = `mutation {
    addProjectV2ItemById(input: { projectId: "${projectNodeId}", contentId: "${issueNodeId}" }) {
      item { id }
    }
  }`;

  await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ghToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: addMutation }),
  });
}
