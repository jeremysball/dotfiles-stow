---
name: commit
description: Make atomic commits with conventional commit format. Commit early and often. Use git add -p only when necessary.
---

# Commit Early, Commit Often

**Commit after each working change.** Small, atomic commits. Never batch features.

## The Cadence

```
Write test → Implement → Run tests → git add -p → Commit → Repeat
```

See [todo skill](/workspace/.pi/skills/todo/SKILL.md) for test-first workflow.

## Rules

1. **One logical change per commit** — Describe it in one line
2. **Every commit passes tests**
3. **Commit immediately** — Do not wait until "done"

## Conventional Commits

```
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
| `chore` | Build/tooling |

Rules: lowercase, under 72 characters, body explains "what" and "why".

## Examples

### Good — Atomic, Specific

```bash
feat(tui): add Throbber class in throbber.py
feat(tui): wire Throbber into StatusLine.__init__
feat(tui): start throbber animation on LLM request start
feat(tui): stop throbber animation on LLM response end
test(tui): verify throbber tick advances state
refactor(tui): extract throbber color to constant
```

### Bad — Too Broad

```bash
# Multiple features
git commit -m "feat: add throbber"

# Multiple files with different purposes
git commit -m "feat: update tui and fix bug"

# Vague
git commit -m "fix stuff"
```

### Case Study: Bad Batch Commit

**What I did wrong:**
```bash
# BAD: Batched three logical changes into one commit
feat(pypitui): enable Rich markdown rendering in AlfredTUI

- Import USE_MARKDOWN_RENDERING constant
- Enable markdown for user messages in _on_submit()
- Enable markdown for assistant messages in _send_message()
```

**Why it's bad:**
- Three separate logical operations in one commit
- Can't easily revert just the user message change
- Harder to review, harder to bisect
- Violates "one logical change per commit"

**What I should have done:**
```bash
# GOOD: Three atomic commits
feat(pypitui): import USE_MARKDOWN_RENDERING constant in tui.py
feat(pypitui): enable markdown rendering for user messages
feat(pypitui): enable markdown rendering for assistant messages
```

## Recovery: git add -p with tmux

Use when you have multiple uncommitted changes to separate.

```bash
# Start tmux session for interactive staging
tmux new-session -s commit

# Stage hunks interactively
git add -p src/file.py          # y = stage, n = skip, s = split, e = edit, ? = help

# Verify staged changes
git diff --cached

# Commit
git commit -m "feat(scope): description"

# Check status, repeat until clean
git status

# Exit tmux
tmux detach                     # or: tmux kill-session -t commit
```

See [tmux skill](/workspace/.pi/skills/tmux/SKILL.md) for full session management.

## Verify

```bash
uv run ruff check src/ && uv run mypy src/ && uv run pytest
```

Fix issues. Then commit.
