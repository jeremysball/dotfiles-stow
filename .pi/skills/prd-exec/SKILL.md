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

## When to Use

Create an execution plan when:
- Starting a new PRD implementation phase
- A milestone has >3 implementation steps
- Multiple files need modification
- Tests need to be written first
- You need structured, verifiable progress tracking

## Workflow

```
Read PRD milestone → Break into atomic tasks → Write execution plan → Execute test-first → Commit each task
```

## Format

```markdown
# Execution Plan: PRD #[ID] - [Feature Name]

## Overview
Brief description of this execution phase.

---

## Phase [N]: [Phase Name]

### [ComponentName]

- [ ] Test: `test_descriptive_name()` - what to verify
- [ ] Implement: specific change to make test pass
- [ ] Run: `uv run pytest test_file.py -v` - verify tests pass

### [AnotherComponent]

- [ ] Test: `test_another_thing()`
- [ ] Implement: specific code change
- [ ] Run: verify command

---

## Files to Modify

1. `src/module.py` - description of changes
2. `tests/test_module.py` - new tests

## Commit Strategy

Each checkbox = one atomic commit following conventional commits:
- `feat(component): add X functionality`
- `test(component): verify Y behavior`
```

## Rules

1. **One test per task** — Know when you're done
2. **Implement minimally** — Just enough to pass
3. **Commit immediately** — Each green task = one commit
4. **Atomic tasks** — Each item = single independently verifiable action
5. **Include verification** — Every task ends with a verification step

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
2. **Git branch** — `feature/prd-12-*` → PRD 12
3. **Recent commits** — "feat: PRD 76 session storage"
4. **Modified files** — `prds/76-*.md` modified
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
1. Read PRD file
2. Identify current incomplete milestone
3. Break into components
4. For each component:
   - Define test task (Red)
   - Define implementation task (Green)
   - Define verification command
5. Write to `prds/execution-plan-[prd-id]-[phase].md`

**From User Input:**
If user provides specific tasks:
- Structure them test-first
- Add verification steps
- Save to execution plan file

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
- ✅ Each task is atomic and independently verifiable
- ✅ Verification command included for each task
- ✅ Files to modify clearly listed
- ✅ Progress tracked via checkboxes
- ✅ Integrates with `/prd-next` and `/prd-update-progress`
