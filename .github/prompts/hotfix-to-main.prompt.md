---
description: "Push an urgent hotfix directly to main, skipping stage. Use when: hotfix, urgent fix, production bug, critical patch, emergency deploy, skip stage."
argument-hint: "Describe the production issue to fix"
agent: "agent"
tools: ["run_terminal_command", "read", "edit", "search", "mcp_github_create_pull_request", "mcp_github_pull_request_read", "mcp_github_merge_pull_request", "mcp_github_create_branch"]
---

# Hotfix → Main Workflow

Apply an urgent fix directly to `main` via a short-lived hotfix branch, bypassing `stage`.

## Step 1: Create Hotfix Branch

1. Run `git fetch origin && git checkout origin/main` to start from latest main.
2. Create a branch: `git checkout -b hotfix/<short-slug>` where `<short-slug>` is derived from the user's description (e.g., `hotfix/fix-cors-header`).
3. Confirm the branch name with the user before proceeding.

## Step 2: Implement the Fix

1. Investigate the issue described by the user — search the codebase, read relevant files.
2. Make the **minimal** change required to fix the issue. No refactors, no improvements, no cleanups.
3. If the fix touches more than 3 files or 50 lines, pause and confirm scope with the user.
4. Stage and commit with a message: `hotfix: <concise description>`.

## Step 3: Push and Create PR

1. Push the hotfix branch: `git push origin hotfix/<short-slug>`.
2. Create a PR targeting `main` with:
   - Title: `🚨 hotfix: <description>`
   - Body including: what broke, root cause, what was changed, and any followup needed
   - Label it as urgent if labels are available
3. Report the PR URL to the user.

## Step 4: Backport Reminder

After the PR is created, remind the user:

```
⚠️  Backport required: After merging this hotfix to main, cherry-pick
the commit(s) onto stage to keep branches in sync:

  git checkout stage
  git cherry-pick <commit-hash>
  git push origin stage
```

## Rules

- Never commit directly to `main` — always use a hotfix branch + PR.
- Keep changes minimal. This is a surgical fix, not a feature.
- Never merge the PR automatically — the user decides when to merge.
- Do not delete the hotfix branch — the cleanup prompt handles that.
