---
name: prd-architecture-review
description: Review PRDs against architecture documents to identify gaps, mismatches, and implementation risks before coding starts. Use when verifying PRD alignment with architecture, checking for errors, or validating requirements.
---

# PRD/Architecture Review Skill

Review PRDs against architecture documents. Identify gaps, mismatches, and implementation risks before coding starts.

## When to Use

Use this skill when:
- A new PRD is created and needs verification against architecture
- Architecture changes require PRD updates
- Before implementation starts on any PRD
- During PR review of PRD changes

## Pre-Flight Checklist

Before reviewing, you MUST:

1. **Load the PRD** being reviewed
2. **Load the Architecture document** it claims to implement
3. **Load any supporting specs** (API docs, design decisions, etc.)
4. **Confirm completion**: "✅ Review context loaded"

## Review Methodology

Analyze the PRD through six lenses, categorizing findings by severity.

### Review Lenses

#### 1. Architectural Mismatches 🔴
Does the PRD contradict or misinterpret the architecture?

Check for:
- Class hierarchies that don't match the base design
- Lifecycle differences (creation, destruction, state transitions)
- Data flow violations (sync vs async, push vs pull)
- Abstraction leaks (exposing implementation details)

**Example:** Architecture says "Overlay is NOT a Component" but PRD tests verify overlay instances behave like components.

#### 2. Vague Areas 🟡
Are requirements under-specified or ambiguous?

Common indicators:
- Words like "appropriate," "reasonable," "optimal" without metrics
- Missing edge case handling (empty lists, zero dimensions, errors)
- Unclear ordering/sequencing requirements
- Undefined behavior for boundary conditions

**Example:** "Handle scrollback efficiently" without defining what "efficiently" means or when scrollback behavior triggers.

#### 3. Incorrect Translation of Requirements 🟡
Did requirements get lost or distorted between architecture and PRD?

Check for:
- Architecture specifies X, PRD implements Y
- Missing requirements that were in architecture but not PRD
- Added requirements not grounded in architecture
- Scope creep beyond original design

**Example:** Architecture describes full Kitty Keyboard Protocol, PRD only implements basic CSI without noting the limitation.

#### 4. Weak Acceptance Criteria 🟡
Can the criteria be objectively verified?

Red flags:
- Qualitative measures without quantitative thresholds
- Untestable assertions ("should be fast," "user-friendly")
- Missing test infrastructure to support verification
- No error/failure scenarios tested

**Example:** "Efficient rendering" vs "Append-only emits ≤20% of escape sequences vs full redraw (measured via MockTerminal)"

#### 5. Errors 🔴
Are there factual mistakes, impossible requirements, or logical contradictions?

Look for:
- Algorithmic impossibilities (O(1) for inherently O(n) operations)
- API mismatches (calling non-existent methods)
- Protocol violations (terminal capabilities)
- Resource constraints violated (memory, time, bandwidth)

**Example:** PRD requires synchronous DEC 2026 capability detection but specifies async threaded input architecture without resolving the conflict.

#### 6. Footguns 🟡🟢
Will this design lead to common misuse, subtle bugs, or maintenance burden?

Categories:
- **API design**: Easy to call wrong, hard to call right
- **State management**: Implicit state transitions, unclear ownership
- **Resource management**: Leaks, double-frees, use-after-free risks
- **Performance**: Silent O(n²) algorithms, hidden allocations
- **Extensibility**: Sealed designs that block future evolution

**Example:** Manual `invalidate()` calls required on components—easy to forget, leads to stale renders.

### Severity Classification

| Severity | Icon | Definition | Action Required |
|----------|------|------------|-----------------|
| Critical | 🔴 | Will cause implementation failure or serious bugs | Must fix before implementation |
| Moderate | 🟡 | Will cause friction, technical debt, or edge case bugs | Should fix, can defer with justification |
| Minor | 🟢 | Cleanup, consistency, or documentation improvements | Fix if touching related code |

## Review Output Format

Structure findings as:

```markdown
## PRD Review: [Title]

### Summary
[Brief overview of PRD quality and critical issues count]

### 🔴 Critical Issues

#### 1. [Title]
**Category:** [Architectural Mismatch / Error / etc.]
**Location:** [Section/File]

**Issue:** [Description]

**Justification:** [Why this is a problem]

**Fix:** [Specific recommendation]

### 🟡 Moderate Issues
[Same format]

### 🟢 Minor Issues
[Same format]

### Recommendations
[Priority-ordered action items]
```

## Interactive Refinement

After initial review, the user may respond with clarifications. Common patterns:

### User Response Types

1. **"X should be Y"** — Corrective clarification
   - Update PRD with the correction
   - Note the rationale for future reference

2. **"Justify your position"** — Challenges your analysis
   - Provide deeper reasoning with tradeoffs table
   - If convinced, acknowledge and adjust

3. **"Also handle Z"** — Additional requirements
   - Add to PRD with appropriate test criteria
   - Check for conflicts with existing requirements

### Tradeoffs Table Template

When justifying recommendations, use:

| Approach | Pros | Cons |
|----------|------|------|
| Option A | [Benefit] | [Cost] |
| Option B | [Benefit] | [Cost] |

## Backporting Requirements

After PRD is updated, ensure architecture document reflects:

1. **New patterns** introduced in PRD
2. **Refined terminology** (if terms were clarified)
3. **Scope boundaries** (MVP vs post-MVP)
4. **File structure** changes

Keep a "Post-MVP" or "Future Work" section in architecture for deferred features.

## Checklist for Complete Review

- [ ] All critical issues (🔴) addressed or have mitigation plans
- [ ] Acceptance criteria are measurable
- [ ] Edge cases are specified (empty, null, max, error)
- [ ] No undefined behavior at boundaries
- [ ] Architecture and PRD are in sync
- [ ] File structure is consistent between docs
- [ ] Public API is fully specified
- [ ] Error handling strategy is documented
- [ ] Performance criteria have measurement methods
- [ ] No "invisible" requirements (implied but not stated)

## Example Review Structure

See `/home/node/.pi/skills/prd-architecture-review/example-review.md` for a complete example.

## Integration with PRD Workflow

1. **PRD Creation** → Use `prd-create` skill
2. **PRD Review** → Use this skill
3. **PRD Updates** → Use `prd-update-decisions` for changes
4. **Implementation** → Use `prd-exec` for task breakdown

## Key Questions to Ask

For every requirement, verify:

1. **What** — What exactly must be implemented?
2. **When** — When does this trigger? (startup, event, condition)
3. **Where** — Where does this live in the architecture?
4. **How** — How do we verify it's correct? (test criteria)
5. **What if** — What if it fails? (error handling)
6. **What else** — What else changes because of this? (side effects)

## Anti-Patterns to Flag

| Pattern | Why It's Bad | Better Alternative |
|--------|--------------|-------------------|
| "Handle appropriately" | Undefined behavior | Explicit: "Log error and continue" |
| "As needed" | Unmeasurable | "When buffer exceeds 80% capacity" |
| "Efficient/optimized" | No benchmark | "O(n) time, O(1) space" |
| "User-friendly" | Subjective | "Error message includes recovery steps" |
| "Should work with X" | Untested claim | "Tested with X version Y" |
| Magic numbers | Unclear significance | Named constants with justification |
