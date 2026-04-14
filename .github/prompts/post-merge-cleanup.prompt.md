---
description: "Clean up after a merge: delete merged branches and optionally tag a release. Use when: post merge cleanup, delete branch, tag release, clean branches, after merge."
argument-hint: "Optional: version tag like v1.2.3, or leave blank to skip tagging"
agent: "agent"
tools: ["run_terminal_command", "mcp_github_list_branches", "mcp_github_list_pull_requests"]
---

# Post-Merge Cleanup

Delete merged branches and optionally tag a release after a PR has been merged to `main`.

## Step 1: Identify Merged Branches

1. Run `git fetch origin --prune`.
2. List branches already merged into `origin/main`:
   ```
   git branch -r --merged origin/main | grep -v 'main\|HEAD'
   ```
3. Exclude `origin/stage` — never delete stage.
4. Present the list to the user and ask which branches to delete. Default: delete all merged branches except `stage`.

## Step 2: Delete Branches

For each confirmed branch:
1. Delete the remote branch: `git push origin --delete <branch-name>`.
2. Delete the local tracking branch if it exists: `git branch -d <local-name>`.
3. Report each deletion.

If deletion fails (e.g., branch has open PRs), report the error and skip it.

## Step 3: Tag Release (Optional)

If the user provided a version tag argument:
1. Validate it looks like a semver tag (e.g., `v1.0.0`, `v2.3.1`).
2. Checkout `origin/main` and create an annotated tag:
   ```
   git tag -a <version> -m "Release <version>"
   ```
3. Push the tag: `git push origin <version>`.
4. Report the tag URL.

If no version was provided, skip this step.

## Step 4: Sync Local

1. Run `git checkout main && git pull origin main` to sync local main.
2. Run `git checkout stage && git pull origin stage` to sync local stage.

## Step 5: Report

```
Cleanup complete:
  Deleted branches: <list or "none">
  Skipped branches: <list or "none">
  Tagged release: <version or "skipped">
  Local branches synced: main, stage
```

## Rules

- Never delete `main` or `stage`.
- Always confirm branch deletions with the user before executing.
- If no merged branches are found, just say so and move on.
