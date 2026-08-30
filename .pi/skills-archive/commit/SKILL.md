---
name: commit
description: Make small, atomic commits with conventional commit format. Commit at clear validated checkpoints. Use git add -p only when needed.
---

# Commit Small, Validated Checkpoints

Commit when a change reaches a clean, reviewable boundary. A good commit contains one logical change, passes the relevant validation, and can be reverted without dragging unrelated work with it.

## When to Commit

Commit when:
- one logical change is complete and validated
- an approved workflow reaches a natural checkpoint, such as a completed PRD task block
- the code, tests, docs, and prompt or template updates for the same behavior change are ready together

Do not commit when:
- the diff mixes unrelated changes
- the touched surface has not been validated
- the user explicitly asked you not to commit

**Do not push unless the user explicitly asks.**

## Default Cadence

```text
Review the worktree
Bucket files into logical slices
Write or update test
Implement the minimum change
Run relevant validation
Stage only the intended diff
Review the staged diff
Commit
```

Use `git add -p` only when you need to separate unrelated hunks. If the change is already clean and atomic, plain `git add <files>` is fine.

## Mixed Worktree Playbook

When the worktree is already dirty:

1. list modified and untracked files
2. group them by logical change, not by directory alone
3. name each commit in one line before staging
4. validate each slice on the smallest meaningful surface
5. stage only that slice
6. review `git diff --cached` before committing
7. commit each slice separately

If one file contains unrelated hunks, use `git add -p`.
If the tree mixes concurrent PRDs, bug fixes, and docs, do **not** collapse them into one commit just because they happened at the same time.

## If the User Says "Commit Everything"

First determine whether "everything" is actually one logical change or several.

- If it is one slice, commit it.
- If it is several slices, propose the split and get confirmation.
- If the user still wants one giant commit, note that it is not the preferred practice and follow the user's explicit direction.

## Rules

1. **One logical change per commit.** Describe it in one line.
2. **Commit the smallest working checkpoint.** Do not wait for a giant batch.
3. **Stage intentionally.** Review `git diff --cached` before you commit.
4. **Run relevant validation first.** Validate the touched surface, not the whole repo by default.
5. **Use conventional commits.**
6. **Keep aligned changes together.** If code, tests, docs, PRD updates, or prompts belong to the same completed slice, commit them together.
7. **Follow the observable seam.** Prefer boundaries that match shipped behavior, public contracts, or one docs-only planning slice.
8. **Do not batch unrelated fixes.**

## Conventional Commits

```text
<type>[scope]: <description>
```

| Type | Use When |
|------|----------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting |
| `refactor` | Restructure |
| `perf` | Performance |
| `test` | Tests |
| `chore` | Build, tooling, or maintenance |

Message rules:
- use lowercase type and scope
- use an imperative description
- keep the summary under 72 characters
- make it specific
- add a body when it helps explain what changed and why

## Good Commit Boundaries

```bash
feat(memory): add support profile scope contract
feat(memory): define relational registry values
docs(prd): record support registry value sets
test(memory): cover scoped support profile validation
refactor(tui): extract throbber color constant
```

## Bad Commit Boundaries

```bash
feat: update memory stuff
fix: several issues
chore: work in progress
feat: add support profile and clean up web ui
```

## Before You Commit

- the staged diff is one logical change
- the relevant checks passed
- the staged files match your intent
- the message is specific
- no unrelated files are included
- if you plan to push, the user explicitly asked

## Validation

Run the smallest checks that prove the changed surface works.

Examples:

```bash
# Python example
uv run ruff check <paths>
uv run mypy --strict <paths>
uv run pytest <targeted tests>

# JavaScript example
npm run js:check
```

Broaden validation only when the change crosses boundaries or the failure mode is unclear.
