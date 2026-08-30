---
name: prd-pr-review
description: Iterative GitHub PR review via PR URL, using the active pi model in a tmux-backed interactive session. Use when a PR is ready for review, especially after /prd-done, and you want back-and-forth follow-up on the same PR context.
category: project-management
arguments:
  - name: prRef
    description: GitHub PR URL, number, or branch.
    required: false
---

# PRD PR Review

Use this skill to review a GitHub pull request by URL, fetch its metadata, diff, and comments, and launch `pi` with the active model from the current session inside a detached tmux pane. It is meant for the review loop right after `/prd-done`, when you want an initial pass, user follow-up, and another pass if needed.

## Use when
- A PR has been created and you want a review before merge
- You want to keep reviewing the same PR after a follow-up question
- You need the review to use the same pi model the current session is already using

## Workflow
1. Confirm or infer the PR ref.
2. Run `scripts/review-pr.py <pr-ref>`.
3. The script locates the most recent local pi session for this working directory, reuses its current model and thinking level if it can, and gathers PR metadata, diff, and review comments with `gh`.
4. It launches a detached tmux session running `pi` interactively with the PR context preloaded, then prints the attach command so the review can continue back and forth in the same pane.
5. If you only want a one-shot pass, use `--print` to fall back to `pi -p --no-session`.
6. If the review raises a question or the user wants a deeper pass, keep using the same tmux session or rerun the script with `--focus`.

## Output expectations
Ask pi to return:
- Summary
- Critical / Important / Minor findings
- Questions for the author
- Recommended next action

## Rules
- Prefer the current session model; fall back to pi's configured default if the session cannot be identified.
- Use `gh` for PR data. Do not scrape the browser unless `gh` fails.
- Present every finding, including nitpicks, so the user can decide what to fix.
- Prefer the tmux-backed interactive mode for back-and-forth review. Use `--print` only when you need a one-shot pass.
- If `gh` is missing, stop and tell the user GitHub CLI is required: https://cli.github.com/

## Usage
```bash
python3 scripts/review-pr.py <pr-ref>
python3 scripts/review-pr.py <pr-ref> --focus "double-check tests and docs"
python3 scripts/review-pr.py <pr-ref> --print
python3 scripts/review-pr.py <pr-ref> --tmux-session-name pr-review-123
```

After launch, attach to the tmux session with:
```bash
tmux attach -t <session-name>
```

If you rerun the script for the same PR, it will point you at the existing tmux session unless you override the session name.

See `scripts/review-pr.py` for the launcher.

## Posting Review Comments

Use `gh` commands to add comments directly to the PR from the terminal:

### General PR comments (not tied to code)
```bash
gh pr comment <pr-number> --body "Your comment here"
```

### Review comments on specific lines
Create a review with comments on specific files and lines:
```bash
# Start a review with a comment on a specific file/line
gh pr review <pr-number> --comment -b "Overall feedback" \
  --comment-body "Issue here" \
  --path "src/file.py" \
  --line 42
```

### Submit a review verdict
```bash
# Approve
gh pr review <pr-number> --approve -b "LGTM!"

# Request changes
gh pr review <pr-number> --request-changes -b "Needs fixes..."

# Comment only (no verdict)
gh pr review <pr-number> --comment -b "Some thoughts..."
```

### Reply to existing comments
```bash
gh pr comment <pr-number> --reply <comment-id> --body "Good point, fixed."
```

**Tip:** Run `gh pr view <pr-number> --comments` to see existing comments and their IDs for replies.
