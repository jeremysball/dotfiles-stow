---
title: The pre-push worktree budget should count drainable worktrees, not all of them
status: proposed
date: 2026-08-31
---

# The pre-push worktree budget should count drainable worktrees

## The problem, measured

The hook on `feat/pre-push-worktree-budget` counts every worktree that is
neither the primary checkout nor the one being pushed from, and refuses the
push when that number exceeds the cap. The default cap is 3.

Real counts on this machine, taken today:

| repo | non-primary worktrees | default cap | result |
|---|---|---|---|
| `jeremysball/dotfiles` | 9 | 3 | every push blocked |
| `jeremysball/dotclaude` | 10 | 3 | every push blocked |

So the hook bricks both repos the day it deploys. That is not a tuning
problem. A six-way SDD fan-out legitimately creates six worktrees plus the
shared base, and every one of them is live work. Counting them as debt
punishes the workflow the rest of the tooling exists to support.

> [!NOTE]
> A separate claim I made on the PR was wrong and has been corrected there:
> ferries do not push. They use taskferry's changeset model, leaving
> uncommitted work in their own worktree for `taskferry accept` to land. The
> hook therefore only ever fires on my own pushes, never mid-dispatch.

## What the rule actually says

The CLAUDE.md rule the hook is enforcing is that a finished branch gives its
directory back. The quantity that matters is **finished directories not yet
returned**, not directories. A worktree holding live work is not debt, it is
the work.

So the budget should count drainable worktrees.

## Why ancestry alone cannot answer that

PRs here are squash merged. A squash merge writes a new commit with a new
tree, so the branch is never a literal ancestor of `origin/main` afterward.
`git merge-base --is-ancestor` returns false for a branch whose work shipped
weeks ago.

`git cherry` and patch-id matching only partly close this. They catch a
single-commit branch, because squashing one commit preserves its patch-id.
They miss every multi-commit branch, which is most of them.

## Reuse: `auditing-worktrees` already solved this

`~/.claude/skills/auditing-worktrees/bin/coverage-score` is a standalone CLI
with a documented three-state contract, written explicitly so non-Bash
consumers can call it:

```
coverage-score <repo> <base> <branch>
  SCORED <0-100>   percent of the branch's net text lines already in base
  UNSCORED <why>   binary or mode-only rows, empty patch, nothing to score
  UNKNOWN <why>    criss-cross history, merge conflict, merge-tree error
```

The verdict is on stdout and every one of the three exits 0. It works by
simulating the merge with `git merge-tree --write-tree` and measuring the
residual diff, which is why it survives squash and rebase merges where
ancestry does not.

Buy versus build lands on reuse without much argument. The alternative is
re-deriving squash-aware merge detection inside a git hook, which is the
hard part of `auditing-worktrees` and the part with the subtle bugs already
fixed in it (negative residual inflating a score past 100, an empty
merge-tree failing open to `SCORED 100`).

## Proposed counting rule

A worktree counts toward the budget only when all three pass:

1. **Merged.** Either `git merge-base --is-ancestor <branch> origin/HEAD`,
   or `coverage-score` returns `SCORED n` with `n >= threshold`.
2. **Idle.** `max(last commit time, newest touched-file mtime)` older than
   the in-flight threshold. `auditing-worktrees` uses 2h and documents why
   neither signal works alone.
3. **Clean.** No uncommitted changes. Uncommitted files are in no commit, so
   base cannot have them regardless of what the branch scored.

`UNKNOWN` and `UNSCORED` never count. That is fail-closed toward "this is
live," which is the same stance as the fail-fast rule: an ambiguous signal
reports unknown rather than guessing a plausible wrong answer. The cost of a
wrong "drainable" is a hook that nags about live work until you stop reading
it.

## What that changes today, measured

Both tables below are a real run of `coverage-score` against every worktree,
not an estimate.

### dotfiles: 9 counted now, 4 under the proposal

| worktree | ancestor | coverage | age | verdict |
|---|---|---|---|---|
| `absorb-pi-mono` | yes | n/a | 26h | drainable |
| `context-limit-pass` | yes | n/a | 26h | dirty, needs triage |
| `retire-dead-providers` | yes | n/a | 32h | drainable |
| `sync-fleet-skills` | **no** | **SCORED 100** | 22h | drainable |
| `emdash-gate-evasions` | no | SCORED 0 | 0h | live |
| `pre-push-worktree-budget` | no | SCORED 0 | 1h | live |
| `verification-tooling` | no | SCORED 0 | 239h | unmerged, stale |
| `env-and-theme-guardrails` | no | UNKNOWN conflict | 24h | unknown |
| `openai-auto-compaction` | no | UNKNOWN conflict | 34h | unknown |

`sync-fleet-skills` is the whole argument in one row. Ancestry says
unmerged, coverage says 100% of its work is already in `origin/main`. That
is the squash merge, and it is the case a naive fix would have missed.

### dotclaude: 10 counted now, 0 under the proposal

Nothing in `~/.claude` is provably finished. No literal ancestors, no branch
scoring above 0. Under the proposal the hook goes silent on the repo holding
the most worktrees.

> [!WARNING]
> Worth stating plainly rather than hiding: two of those ten
> (`extract-ferrying-skills`, `migrate-prose-skills-to-submodules`) score
> `UNSCORED no-text-rows` because their only change is a submodule gitlink,
> which `git diff --numstat` reports as a binary row with no line counts.
> Coverage scoring is structurally blind to submodule-pointer-only branches,
> and dotclaude is a repo made almost entirely of submodule pointers. The
> classifier does not degrade there, it abstains.

## Open decisions

1. **The cap changes meaning, so its default should change too.** Under the
   proposal, cap 3 reads as "at most three finished directories lying
   around." Finished-and-unreturned is pure debt, so I would drop the default
   to 2 rather than keep 3.

2. **Threshold source.** `auditing-worktrees` reads
   `WORKTREE_AUDIT_CONTENT_MERGE_THRESHOLD`, default 95. I would have the
   hook read that same variable so one number governs both tools, then layer
   the usual flag, env var, config-key triplet on top for the hook's own
   override.

3. **Cost.** `coverage-score` runs `merge-tree` per worktree. That is real
   work on every push. Ancestry is nearly free, so run it as a prefilter and
   only pay for coverage on non-ancestors. If a ten-worktree repo still costs
   more than about a second, cache by `(branch sha, base sha)` under
   `XDG_CACHE_HOME`.

4. **Cross-repo dependency.** The hook ships from dotfiles. The classifier
   lives in the `auditing-worktrees` skill repo, submoduled into dotclaude.
   A dotfiles hook reaching into `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills/`
   is a dependency across two repos that version independently. It has to
   degrade when the path is absent: fall back to ancestry only, and say so in
   the failure message rather than silently under-counting.

## Recommendation

Proceed with reuse. Ancestry as a prefilter, `coverage-score` for the
non-ancestors, fail closed on `UNKNOWN` and `UNSCORED`, graceful degradation
to ancestry-only when the classifier is not on disk, default cap 2.

No code changes yet. The PR still holds the count-everything version.
