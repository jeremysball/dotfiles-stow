---
name: todo
description: TDD task lists. Format: Test → Implement → Commit. Test first is the default.
---

# Todo Skill - Test First

**Default: Write test first.** Deviations need reasons.

## Workflow

```
Pick test task → Write test (Red) → Implement (Green) → Commit → Repeat
```

## Format

```markdown
### ComponentName

- [ ] Test: `test_descriptive_name()` - what to verify
- [ ] Implement: specific change to make test pass
- [ ] (Refactor): cleanup while green
```

## Rules

1. **One test per task** — Know when you're done
2. **Implement minimally** — Just enough to pass
3. **Commit immediately** — Each green task = one commit (see [commit skill](/workspace/.pi/skills/commit/SKILL.md))

## Exceptions (Rare)

- **Spike** — Time-boxed exploration
- **Pure refactor** — Tests already exist
- **Trivial wiring** — But ask: is it really trivial?

## Example

```markdown
### Throbber

- [ ] Test: `test_init_starts_at_zero()`
- [ ] Implement: `Throbber.__init__` sets `self._tick = 0`
- [ ] Test: `test_tick_increments()`
- [ ] Implement: `Throbber.tick()` increments `self._tick`
- [ ] Test: `test_animation_states()`
- [ ] Implement: State-based character selection
```

## Granularity

| Too Broad | Just Right |
|-----------|------------|
| "Add throbber" | "Throbber initializes at tick 0" |
| "Fix bugs" | "Handle empty input: return None" |

## Recovery

Forgot test first?
1. Write test for existing behavior
2. Verify it passes
3. Commit: `test: verify existing behavior of X`
4. Continue with test-first
