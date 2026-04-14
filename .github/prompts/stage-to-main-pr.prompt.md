---
description: "Create a PR from stage to main, review Copilot review comments, and fix critical issues. Use when: stage to main, create PR, review PR comments, fix Copilot feedback, merge to main."
argument-hint: "Optional: describe what changed on stage, or leave blank for auto-detection"
agent: "agent"
tools: ["run_terminal_command", "read", "edit", "search", "mcp_github_create_pull_request", "mcp_github_pull_request_read", "mcp_github_list_pull_requests", "mcp_github_list_commits", "mcp_github_add_reply_to_pull_request_comment"]
---

# Stage → Main PR Workflow

Create a pull request from `stage` to `main`, review any Copilot review comments, and fix **critical** issues.

## Step 0: Push Local Changes to Stage

1. Run `git branch --show-current` to confirm you are on `stage`. If not, run `git checkout stage`.
2. Run `git status` to check for uncommitted changes.
   - If there are staged or unstaged changes, ask the user for a commit message, then run `git add -A && git commit -m "<message>"`.
   - If the working tree is clean, skip to sub-step 3.
3. Run `git fetch origin` and then `git log --oneline origin/main..stage` to check if stage needs a rebase.
   - If stage has diverged from main, run `git rebase origin/main` and resolve any conflicts interactively with the user.
4. Run `git push origin stage` to push local commits to the remote.
   - If the push is rejected (e.g., after rebase), ask the user before running `git push --force-with-lease origin stage`.

## Step 1: Prepare

1. Run `git fetch origin` to ensure remote refs are fresh.
2. Run `git log --oneline origin/main..origin/stage` to list commits being merged.
3. If no commits differ, stop and tell the user "stage is already up to date with main."

## Step 2: Create the PR

1. Build a clear PR title from the commit subjects (e.g., "feat: AI calculator rename + dynamic LLM pricing").
2. Build a PR body with:
   - A **Summary** section (2-3 sentences of what changed)
   - A **Changes** bullet list derived from the commit messages
   - A **Testing** section noting what was verified
3. Use the GitHub MCP tool to create the PR (`head: stage`, `base: main`).
4. Report the PR number and URL to the user.

## Step 3: Wait for Copilot Review

1. Wait ~60 seconds, then fetch review comments using `get_review_comments` on the PR.
2. If no review comments yet, wait another 60 seconds and retry (max 6 attempts, ~6 minutes total).
3. If still no comments after all retries, tell the user "No Copilot review comments found — PR may be too large or review is still pending. You can re-run this prompt later."
4. Present all review comments to the user grouped by file, showing:
   - File path and line number
   - Comment body
   - Whether it's resolved or unresolved

## Step 4: Triage and Fix

For each **unresolved** review comment, classify it:

- **MUST FIX** — Security vulnerabilities, data loss risks, crashes, broken functionality, secrets exposure
- **SHOULD FIX** — Bugs that won't crash but produce wrong results, missing error handling at system boundaries
- **SKIP** — Style preferences, optional refactors, suggestions that don't affect correctness or security

**Only fix MUST FIX and SHOULD FIX items.** For SKIP items, reply to the comment thread explaining why it was skipped.

For each fix:
1. Make the code change
2. Stage and commit with a message referencing the review (e.g., "fix: address Copilot review — sanitize user input")
3. Push to `stage`

## Step 5: Report

After all fixes are applied (or if there were no issues), provide a summary:

```
PR #<number>: <title>
URL: <url>

Review comments: <total>
  - Fixed: <count> (list each briefly)
  - Skipped: <count> (list each with reason)
  - Already resolved: <count>

Status: Ready for manual review / Needs attention
```

## Rules

- Never force-push to stage. Use regular commits.
- Never merge the PR automatically — the user decides when to merge.
- If a fix is complex (>20 lines changed), describe the proposed fix and ask the user before applying.
- Keep the PR focused — don't add unrelated improvements.
