---
name: arch-create
description: Create or update first-class architecture docs for system design, boundaries, contracts, and major refactors
category: project-management
---

# Architecture Doc Creation Slash Command

## Instructions

You are helping create or update an architecture doc for a system design change. Architecture docs and PRDs are separate first-class artifacts:

- **architecture doc** = system shape, boundaries, contracts, constraints, tradeoffs, and integration seams
- **PRD** = product intent, user-visible behavior, scope, milestones, and success criteria

Use this skill when the main artifact is a new or changed design, not just a feature delivery plan.

Default output path:
- `docs/architecture/[slug].md`

Before drafting a new architecture doc:
- review relevant existing docs, especially `docs/ARCHITECTURE.md` and `docs/architecture/`
- prefer updating an existing architecture doc when it already owns the boundary or contract
- create a new architecture doc when the design deserves its own durable source of truth
- identify any PRDs that should link to this architecture doc

Architecture docs should make the design legible enough that downstream PRDs and execution plans can reference them instead of re-explaining the system every time.

## When to Use This Skill

Use `arch-create` when the user says things like:
- "Let's write an architecture doc"
- "We need a design doc for this"
- "This parent PRD is really architecture"
- "Design the system first"
- "Let's define the boundary or contract"
- "We need an ADR-style doc"
- "Create a first-class architecture document"

Use `prd-create` instead when the main need is a feature-level product spec.
Use both when the work needs a design doc first and a PRD second.

## Process

### Step 1: Understand the Design Scope
Ask the user to describe the proposed system change and determine:
- what boundary, contract, or runtime seam is changing
- whether an existing architecture doc should be updated or a new one created
- whether one or more downstream PRDs should be created from this design

### Step 2: Review Existing Architecture Context
Read the relevant docs before writing:
- `docs/ARCHITECTURE.md`
- related files in `docs/architecture/`
- any PRDs that depend on or conflict with this design

### Step 3: Choose the Canonical Doc Path
Default to:
- `docs/architecture/[slug].md`

Use a short, stable slug based on the system boundary or design topic.
Examples:
- `docs/architecture/support-runtime-adjudication.md`
- `docs/architecture/webui-bootstrap-boundary.md`
- `docs/architecture/support-learning-v2.md`

### Step 4: Draft the Architecture Doc
Work through the design section by section. Favor concrete boundaries, explicit tradeoffs, and clear contracts over vague aspirations.

### Step 5: Link Downstream Work
When relevant:
- link PRDs that implement this design
- note which existing PRDs must be updated to reference this architecture doc
- identify whether implementation should start with `prd-create` or with an update to an existing PRD

## Architecture Doc Template

Use a structure like this and adapt it to the topic:

```markdown
# [Title]

## Status
- Proposed | Accepted | Superseded

## Why this doc exists
- What design problem or confusion this doc resolves

## Related docs
- `docs/ARCHITECTURE.md`
- related architecture docs
- linked PRDs

## Problem
- What is broken, unclear, duplicated, or constrained today

## Goals
- The design outcomes this doc is trying to achieve

## Non-goals
- What this doc intentionally does not solve

## Current constraints
- Current repo realities, globals, side effects, ordering assumptions, legacy seams

## Options considered
- Option A
- Option B
- Why they were rejected or accepted

## Chosen design
- The new system shape
- Ownership boundaries
- Main contracts and invariants

## Boundary and contract details
- Public seams
- Inputs and outputs
- Failure handling
- Validation rules

## Data / control flow
- How information moves through the system
- What stays deterministic vs model-judged

## Migration / rollout
- How to move from current state to target state safely

## Validation strategy
- What tests, checks, or observable behaviors prove the design works

## Risks and open questions
- Known uncertainties, deferred decisions, follow-ups
```

## Discussion Questions

1. **Design Problem**: "What system problem or ambiguity is this architecture doc resolving?"
2. **Boundary**: "Which boundary, contract, or subsystem is actually changing?"
3. **Current Constraints**: "What repo constraints or legacy seams must the design respect?"
4. **Alternatives**: "What other designs did we consider and why not use them?"
5. **Source of Truth**: "What should become the canonical owner of this behavior after the change?"
6. **Contracts**: "What inputs, outputs, invariants, and failure modes matter here?"
7. **Integration**: "What adjacent systems or docs need to stay aligned?"
8. **Migration**: "How do we get from current state to the target design incrementally?"
9. **Validation**: "What observable checks prove this design is working once implemented?"
10. **PRD Handoff**: "Which PRD or PRDs should implement this design, and what should they link back to?"

## Writing Guidance

- Prefer one clear source of truth per boundary
- Name the current constraints explicitly
- Keep architecture docs product-agnostic where possible and feature-specific where necessary
- Avoid turning the doc into a task list; implementation milestones belong in PRDs
- Avoid stuffing architecture rationale into a parent PRD when the design should stand on its own
- Keep the doc update-friendly; future PRDs should be able to reference it directly

## Workflow

1. Discuss the design problem and scope
2. Review existing architecture context
3. Decide whether to update an existing architecture doc or create a new one
4. Choose the canonical path under `docs/architecture/`
5. Draft the architecture doc section by section
6. Link any downstream PRDs or note that a new PRD should be created next
7. Review for clarity, boundaries, and alignment with existing docs

## Next Steps After Architecture Doc Creation

After completing the architecture doc, present the user with numbered options:

```text
✅ Architecture doc created successfully!

**Architecture Doc**: docs/architecture/[slug].md

What would you like to do next?

**1. Create or update a PRD from this architecture doc**
   Use the design as the technical source of truth for product planning

**2. Commit and push the architecture doc for later**
   Save the architecture work now and create PRDs later

Please enter 1 or 2:
```

### Option 1: Create or Update a PRD Now

If the user chooses option 1:
- identify whether an existing PRD should be updated or a new PRD should be created
- use `prd-create` for new PRDs
- ensure the PRD links back to `docs/architecture/[slug].md`

### Option 2: Commit and Push for Later

If the user chooses option 2:

```bash
# Stage the architecture doc and any aligned doc updates
git add docs/architecture/[slug].md

# Commit with skip CI flag to avoid unnecessary CI runs
git commit -m "docs(architecture): add [slug] design [skip ci]"

# Pull latest and push to main
git pull --rebase origin main && git push origin main
```

**Confirmation Message:**
```text
✅ Architecture doc committed and pushed to main

To create a PRD from this design later, use:
prd-create
```

## Important Notes

- Do not create a GitHub issue by default unless the user explicitly wants architecture work tracked that way
- Docs-only architecture changes do not need code validation unless behavior changed as part of the same work
- If the design changes an existing runtime or user-visible contract, the relevant PRDs, docs, and prompts should be kept aligned
