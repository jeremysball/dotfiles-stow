---
name: prd-exec
description: Create and manage granular execution plans for PRD implementation. Test-first task breakdown with atomic, verifiable steps.
category: project-management
arguments:
  - name: prdNumber
    description: PRD number to create execution plan for (e.g., 76)
    required: false
---

# PRD Exec - Granular Execution Planning

**Test-first task lists. Atomic steps. Verifiable progress.**

> Example PRD numbers in this skill are placeholders. If a PRD number is provided or clearly established by the current conversation and branch, use that PRD and do not anchor on older examples.

## When to Use

Create an execution plan when:
- Starting a new PRD implementation phase
- A milestone has >3 implementation steps
- Multiple files need modification
- Tests need to be written first
- You need structured, verifiable progress tracking

## Workflow

```
Read PRD milestone → Define success signal + constraints → Break into atomic tasks by boundary → Write execution plan → Self-review plan quality → Execute test-first → Commit each task
```

If the repository includes tracked execution-plan examples, read them and prefer them over generic instincts when the rules feel abstract.

## Format

```markdown
# Execution Plan: PRD #[ID] - [Feature Name]

## Overview
Brief description of this execution phase.

## Current Repo Constraints
- globals, side effects, legacy hooks, ordering assumptions, or external dependencies that make the change risky

## Success Signal
- observable behavior that proves this phase works

## Validation Workflow
- Python / JavaScript / Both
- exact checks for this phase

---

## Phase [N]: [Phase Name]

### [Boundary or Component Name]

- [ ] Test: `test_descriptive_name()` - observable behavior to verify
- [ ] Implement: specific change to make test pass
- [ ] Run: `uv run pytest test_file.py -v` - smallest meaningful validation

### [Another Boundary]

- [ ] Test: `test_another_thing()`
- [ ] Implement: specific code change
- [ ] Run: verify command

---

## Files to Modify

1. `src/module.py` - description of changes
2. `tests/test_module.py` - new tests

## Commit Strategy

Each completed test → implement → run block should map cleanly to one atomic commit following conventional commits:
- `feat(component): add X functionality`
- `test(component): verify Y behavior`
```

## Rules

1. **One test per task** — Know when you're done
2. **Implement minimally** — Just enough to pass
3. **Commit immediately** — Each completed task block = one commit
4. **Atomic tasks** — Each item = single independently verifiable action
5. **Include verification** — Every task ends with a verification step
6. **State the validation workflow** — Say whether the phase needs Python, JavaScript, or both
7. **Prove the milestone** — Include at least one task that demonstrates the PRD outcome, not just the refactor shape

## Planning Quality

When writing an execution plan:

1. **Start from the public seam** — Define the observable behavior that proves the milestone works before choosing files or module shapes.
2. **Write a success signal** — State what someone can observe when this phase is done.
3. **Name current repo constraints** — Call out the globals, side effects, legacy hooks, external scripts, or other existing conditions that make the change risky.
4. **Split refactors by boundary** — Break work along real seams such as HTML shell, bootstrap, app runtime, optional features, storage layer, or API contract.
5. **Prefer behavior-first tests** — Test exports, import order, filenames, or file structure only when those internals are themselves the contract.
6. **Prove the PRD, not just the implementation** — Include tasks that demonstrate the milestone outcome or success criteria, not only the new module shape.
7. **Choose the correct validation workflow** — State whether the phase needs Python, JavaScript, or both based on the files touched.
8. **Use the smallest meaningful validation** — Prefer targeted tests and checks for the touched surface instead of defaulting to broad suites.
9. **Split broad smoke tests** — If one test covers many unrelated surfaces, replace it with smaller boundary-focused tests unless the full slice is the contract.

## Contrastive Examples

Use these examples as a taste guide. Prefer the **better** pattern.

### Example 1: Frontend Bootstrap Refactor

**Bad:**
```markdown
- [ ] Test: `test_bootstrap_module_exports()` - verify `bootstrap.js` exports `initApp()`
- [ ] Implement: create `bootstrap.js` and export `initApp()`
- [ ] Run: `npm run js:check`
```

**Better:**
```markdown
- [ ] Test: `test_page_boots_via_single_runtime_entrypoint()` - verify the page becomes interactive when startup is owned by the bootstrap path
- [ ] Implement: add a thin bootstrap entrypoint that preserves current behavior while moving runtime ordering out of HTML
- [ ] Run: `uv run pytest tests/webui/test_bootstrap.py::test_page_boots_via_single_runtime_entrypoint -v`
```

**Why:** The bad task proves file shape. The better task proves the PRD contract.

### Example 2: Backend Storage Migration

**Bad:**
```markdown
- [ ] Test: `test_summary_store_class_exists()` - verify `SummaryStore` exists
- [ ] Implement: create `src/storage/summary_store.py`
- [ ] Run: `uv run pytest tests/storage/test_summary_store.py -v`
```

**Better:**
```markdown
- [ ] Test: `test_summary_round_trip_through_new_store()` - verify saving and loading a summary preserves content, metadata, and ordering through the new storage boundary
- [ ] Implement: add the minimal adapter needed for existing callers to use the new store
- [ ] Run: `uv run pytest tests/storage/test_summary_store.py::test_summary_round_trip_through_new_store -v`
```

**Why:** The bad task proves a class exists. The better task proves the storage contract still works.

### Example 3: CLI or TUI Lifecycle Fix

**Bad:**
```markdown
- [ ] Test: `test_session_controller_exports_shutdown()` - verify a new `shutdown()` method exists
- [ ] Implement: create `SessionController.shutdown()`
- [ ] Run: `uv run pytest tests/test_cli.py -v`
```

**Better:**
```markdown
- [ ] Test: `test_quit_returns_terminal_to_clean_prompt()` - verify quitting interactive mode restores the terminal and closes background tasks
- [ ] Implement: add the minimum cleanup needed in the actual quit path
- [ ] Run: `uv run pytest tests/tui/test_runtime.py::test_quit_returns_terminal_to_clean_prompt -v`
```

**Why:** Lifecycle bugs should be tested through public behavior, not by checking that a helper method exists.

## Granularity

| Too Broad | Just Right |
|-----------|------------|
| "Add throbber" | "Throbber initializes at tick 0" |
| "Fix bugs" | "Handle empty input: return None" |
| "Implement SQLite storage" | "Create session_summaries table with FK constraint" |
| "Wire up cron job" | "Update system_jobs.py to pass summarizer to job context" |

## Exceptions (Rare)

- **Spike** — Time-boxed exploration
- **Pure refactor** — Tests already exist
- **Trivial wiring** — But ask: is it really trivial?

## Usage

### Creating a New Execution Plan

```
User: /prd-exec 76
Agent: Analyzing PRD #76...
      [Summary of PRD]
      
      Creating execution plan for Phase 2: SQLite Storage Layer...
      
      📄 Generated: prds/execution-plan-76-phase2.md
      
      Run `/prd-exec 76` anytime to view or update this plan.
```

### Viewing Existing Plan

```
User: /prd-exec 76
Agent: 📋 Execution Plan for PRD #76
      
      Current Phase: Phase 2 - SQLite Storage Layer
      Progress: 3/9 tasks complete
      
      Next task:
      - [ ] Test: `test_save_summary_with_embedding()`
      - [ ] Implement: Serialize embedding to JSON before storage
      - [ ] Run: `uv run pytest tests/test_sqlite.py::test_save_summary_with_embedding -v`
      
      Work on this task? (yes/no)
```

## Process

### Step 1: Detect Target PRD

Auto-detect using:
1. **Argument provided** — `prdNumber` parameter
2. **Git branch** — `feature/prd-<id>-*` → PRD <id>
3. **Recent commits** — mentions PRD <id>
4. **Modified files** — `prds/<id>-*.md` modified
5. **User input** — Ask if unclear

### Step 2: Check for Existing Plan

Look for:
- `prds/execution-plan-[prd-id].md`
- `prds/execution-plan-[prd-id]-[phase].md`

**If exists:**
- Parse current progress
- Show next uncompleted task
- Ask if user wants to continue or create new plan

**If not exists:**
- Analyze PRD structure
- Identify current phase/milestone
- Generate execution plan

### Step 3: Generate/Update Plan

**From PRD Analysis:**
Before breaking the work into tasks, identify the observable behavior that proves the milestone works, note the current repo constraints that make the change risky, and decide which validation workflow applies.
1. Read PRD file
2. Identify the current incomplete milestone
3. Define the public seam and success signal for that milestone
4. List the current repo constraints and risks
5. Choose the validation workflow: Python, JavaScript, or both
6. Break the work by boundary or component
7. For each boundary:
   - Define test task (Red)
   - Define implementation task (Green)
   - Define verification command
8. Add docs or prompt/template updates when behavior or explanation changes
9. Write to `prds/execution-plan-[prd-id]-[phase].md`

**From User Input:**
If user provides specific tasks:
- structure them test-first
- add verification steps
- choose the correct validation workflow
- save to execution plan file

### Step 4: Present Next Task

Show:
```markdown
## Next Task: [Component] - [Specific Action]

- [ ] Test: `test_name()` - description
- [ ] Implement: specific change
- [ ] Run: verification command

**Files involved:**
- `src/file.py`
- `tests/test_file.py`

**Ready to start?** (yes to begin implementation)
```

## Execution Plan Self-Review

Before presenting or approving a plan, verify:
- [ ] the plan includes **Current Repo Constraints**, **Success Signal**, and **Validation Workflow**
- [ ] each phase maps to a PRD milestone or to an explicit sub-slice of one milestone
- [ ] at least one task proves each claimed milestone outcome or success criterion
- [ ] no task only checks exports, import order, filenames, or file counts unless those are the actual contract
- [ ] broad smoke tests are split by boundary when smaller tests would isolate failures better
- [ ] the listed validation matches the touched files: Python, JavaScript, or both
- [ ] the plan looks more like the contract-first examples than the structure-first anti-patterns
- [ ] docs and prompts/templates are included when behavior or explanation changes
- [ ] each completed test → implement → run block can become one atomic commit

If the plan fails this review, revise it before execution.

## Recovery

Forgot test first?
1. Write test for existing behavior
2. Verify it passes
3. Commit: `test: verify existing behavior of X`
4. Continue with test-first

Execution plan out of sync?
1. Run `/prd-exec [prd-id]` to regenerate
2. Or manually edit `prds/execution-plan-[prd-id].md`

## File Naming

- Single phase: `prds/execution-plan-[prd-id].md`
- Multiple phases: `prds/execution-plan-[prd-id]-[phase-name].md`
- Examples:
  - `prds/execution-plan-76.md`
  - `prds/execution-plan-76-phase2-storage.md`
  - `prds/execution-plan-m5-memory.md`

## Integration with PRD Workflow

```
/prd-start 76      → Setup branch, validate PRD
/prd-next          → "This milestone needs granular planning. Run /prd-exec 76"
/prd-exec 76       → Create/view execution plan
[Work on tasks test-first]
/prd-update-progress → Commit progress, update PRD checkboxes
```

## Success Criteria

- ✅ Execution plan created with test-first tasks
- ✅ The plan states current repo constraints, success signal, and validation workflow
- ✅ Each task is atomic and independently verifiable
- ✅ Verification command included for each task
- ✅ The plan proves milestone outcomes, not just implementation shape
- ✅ Files to modify clearly listed
- ✅ Progress tracked via checkboxes
- ✅ Integrates with `/prd-next` and `/prd-update-progress`
