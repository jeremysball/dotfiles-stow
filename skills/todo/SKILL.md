---
name: todo
description: Task lists that guide TDD workflow. Each task: write test, make it pass, commit. Test first is the default.
---

# Todo Skill - Test-First Workflow

## Default Approach: Test First

**Every task starts with a test.** This is the default. Deviations need reasons.

```
Write test (Red) → Implement (Green) → Commit → Next task
```

## Todo Format

```markdown
### [Feature/Component]

- [ ] Test: `test_descriptive_name()` - [what to verify]
  - File: `tests/test_module.py`
  
- [ ] Implement: [specific change to make test pass]
  - File: `src/module.py`
  
- [ ] (Optional) Refactor: [cleanup while tests pass]
```

## The Workflow

1. **Pick the next unchecked test task**
2. **Write the test** — Run it, confirm it fails (Red)
3. **Implement** — Minimum code to pass (Green)
4. **Run checks** — `uv run ruff check src/ && uv run mypy src/ && uv run pytest`
5. **Commit** — See [commit skill](/workspace/.pi/skills/commit/SKILL.md)
6. **Repeat**

## Why Test First

| Test First | Implementation First |
|------------|---------------------|
| Know when you're done | Guess if it works |
| Catch regressions immediately | Discover bugs later |
| Design better APIs | Tight coupling to current thinking |
| Confidence to refactor | Fear of breaking unknowns |

## When to Skip Test First

Rare cases:
- **Spike/exploration** — Learning unknown territory (time-boxed)
- **Pure refactoring** — Behavior unchanged, tests already exist
- **Trivial wiring** — Obvious glue code (but consider: is it really trivial?)

**Default assumption:** Write the test first.

## Example Todo Block

```markdown
### Throbber Component

- [ ] Test: `test_throbber_init_starts_at_zero()`
  - Verify initial tick is 0
  
- [ ] Implement: `Throbber.__init__()` with `self._tick = 0`

- [ ] Test: `test_throbber_tick_increments()`
  - Verify tick advances by 1
  
- [ ] Implement: `Throbber.tick()` method

- [ ] Test: `test_throbber_animation_states()`
  - Verify correct characters for states
  
- [ ] Implement: State-based character selection
```

## From Todo to Commit

Each completed implementation task = one commit.

```bash
# After test passes and implementation works
uv run ruff check src/ && uv run mypy src/ && uv run pytest
git add -p src/module.py tests/test_module.py
git commit -m "feat(scope): description"
```

See [commit skill](/workspace/.pi/skills/commit/SKILL.md) for full commit guidelines.

## Granularity

| Too Broad | Just Right |
|-----------|------------|
| "Add throbber" | "Throbber initializes at tick 0" |
| "Fix bugs" | "Handle empty input: return None" |
| "Update tests" | "Test edge case: null input raises ValueError" |

## Recovery

Forgot to write test first? That's okay — commit what you have, then:
1. Write test for existing behavior
2. Verify it passes
3. Commit: `test: verify existing behavior of X`

Then continue with test-first for new work.

## Verification Checklist

Before marking a task complete:
- [ ] Test exists and passes
- [ ] Implementation is minimal (no speculative code)
- [ ] Code quality checks pass
- [ ] Committed with conventional format

## Integration with PRDs

PRD milestones are outcomes. Todos are the test-first path to those outcomes.

```markdown
## Milestone: Core throbber animation

### Implementation Todos
- [ ] Test: Throbber initializes
- [ ] Implement: Throbber.__init__
- [ ] Test: Throbber advances tick
- [ ] Implement: Throbber.tick()
...
```
