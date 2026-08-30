---
name: skill-index
description: Quick reference index of all available skills with trigger conditions. Use this to determine which skill to load based on user intent.
triggers:
  - When user asks about available skills or tools
  - When user asks "what skills are there?" or similar
  - When user describes a task but you need to find the right skill
---

# Skill Index — Skill Router

**Use this file to determine which skill to load based on what the user needs.**

## How to Use This Index

When a user describes a task or asks for help:
1. **Scan the triggers below** for matching intent
2. **Read the corresponding SKILL.md file** to load the skill
3. **Follow the loaded skill's instructions**

---

## PRD Workflow Skills

### `arch-create` — Create or update an architecture doc
**Read:** `/home/node/.pi/skills/arch-create/SKILL.md`

**Triggers — read this skill when user says things like:**
- "Let's write an architecture doc"
- "We need a design doc for this"
- "This parent PRD is really architecture"
- "Design the system first"
- "Let's define the boundary or contract"
- "Create a first-class architecture document"
- Mentions architecture docs, design docs, ADRs, system boundaries, or runtime contracts as the main artifact

**Examples:**
- "Let's create an architecture doc for support adjudication" → Read `arch-create`
- "This needs a design doc before the PRD" → Read `arch-create`
- "Define the Web UI bootstrap boundary first" → Read `arch-create`

---

### `prd-create` — Create a new PRD
**Read:** `/home/node/.pi/skills/prd-create/SKILL.md`

**Triggers — read this skill when user says things like:**
- "I want to add [feature]"
- "I have an idea for..."
- "Let's create a PRD for..."
- "Document this feature idea"
- "New feature proposal"
- "We need to build..."
- Mentions creating requirements, specs, or planning a feature

**Examples:**
- "I want to add a notification system" → Read `prd-create`
- "Let's build a search feature" → Read `prd-create`
- "Document this API change" → Read `prd-create`

---

### `prd-start` — Begin working on a PRD
**Read:** `/home/node/.pi/skills/prd-start/SKILL.md`

**Triggers — read this skill when user says things like:**
- "Start working on PRD #123"
- "Ready to implement [feature]"
- "Let's begin coding"
- "Start the PRD"
- "Begin implementation"
- Mentions starting work on an existing PRD

**Examples:**
- "Start working on PRD #12" → Read `prd-start`
- "Ready to work on the auth feature" → Read `prd-start`
- "Begin implementing the PRD" → Read `prd-start`

---

### `prd-next` — Get next task from PRD
**Read:** `/home/node/.pi/skills/prd-next/SKILL.md`

**Triggers — read this skill when user says things like:**
- "What should I work on next?"
- "What's the next task?"
- "What do I do now?"
- "Next steps?"
- "What's priority?"
- Asking for guidance on what to implement next

**Examples:**
- "What should I work on?" → Read `prd-next`
- "What's next?" → Read `prd-next`
- "Guide me through this PRD" → Read `prd-next`

---

### `prd-update-progress` — Record completed work
**Read:** `/home/node/.pi/skills/prd-update-progress/SKILL.md`

**Triggers — read this skill when user says things like:**
- "Update the PRD"
- "I finished the API"
- "Mark this as done"
- "Record my progress"
- "Sync the PRD"
- "Just completed..."
- After implementing something and wanting to document it

**Examples:**
- "I just finished the tests" → Read `prd-update-progress`
- "Update PRD with my changes" → Read `prd-update-progress`
- "Mark the auth task complete" → Read `prd-update-progress`

---

### `prd-done` — Complete and merge PRD
**Read:** `/home/node/.pi/skills/prd-done/SKILL.md`

**Triggers — read this skill when user says things like:**
- "This is done"
- "Complete the PRD"
- "Finish and merge"
- "Create a PR"
- "Close the issue"
- "All tasks are complete"
- Feature is implemented and ready to merge

**Examples:**
- "This is done, let's merge" → Read `prd-done`
- "Complete PRD #12" → Read `prd-done`
- "All done, create the PR" → Read `prd-done`

---

### `prd-pr-review` — Review a GitHub PR iteratively
**Read:** `/home/node/.pi/skills/prd-pr-review/SKILL.md`

**Triggers — read this skill when user says things like:**
- "Review this PR"
- "Take a look at PR #123"
- "I want to review a PR URL"
- "Let's go back and forth on the pull request"
- "Before merge, check the PR"

**Examples:**
- "Review this PR URL" → Read `prd-pr-review`
- "Can you take another pass on the pull request?" → Read `prd-pr-review`

---

### `prds-get` — List all PRDs
**Read:** `/home/node/.pi/skills/prds-get/SKILL.md`

**Triggers — read this skill when user says things like:**
- "What PRDs do we have?"
- "List all PRDs"
- "Show me the backlog"
- "What features are planned?"
- "Any open PRDs?"

**Examples:**
- "What PRDs exist?" → Read `prds-get`
- "Show me all features" → Read `prds-get`

---

## Development & Code Skills

### `serper-search` — Web search via Google
**Read:** `/home/node/.pi/skills/serper-search/SKILL.md`

**Triggers — read this skill when user says things like:**
- "Search the web for..."
- "Look up..."
- "Find documentation for..."
- "Google this..."
- "What does the docs say about..."
- "Latest version of..."
- "Search for examples"
- "Find best practices for..."
- "Research..."

**Examples:**
- "Search for Python async best practices" → Read `serper-search`
- "Look up the latest React docs" → Read `serper-search`
- "Find examples of asyncio usage" → Read `serper-search`
- "What version of Django is latest?" → Read `serper-search`

---

### `context7` — Library documentation search
**Read:** `/home/node/.pi/skills/context7/SKILL.md`

**Triggers — read this skill when user says things like:**
- "Get docs for [library]"
- "Show me examples of [library]"
- "How do I use [library]?"
- "Latest API for [library]"
- "Documentation for [function/class]"
- "Code examples for..."

**Examples:**
- "Get docs for FastAPI" → Read `context7`
- "Show me Pydantic examples" → Read `context7`
- "How does SQLAlchemy 2.0 work?" → Read `context7`

---

### `tmux` — Terminal/TUI automation
**Read:** `/home/node/.pi/skills/tmux/SKILL.md`

**Triggers — read this skill when user says things like:**
- "Test the TUI"
- "Automate the CLI"
- "Run this interactively"
- "Capture terminal output"
- "Test the interactive mode"
- "Debug the terminal app"
- "Send keys to..."
- Any mention of testing interactive CLI/TUI applications

**Examples:**
- "Test the alfred TUI" → Read `tmux`
- "Automate this CLI command" → Read `tmux`
- "Capture the terminal output" → Read `tmux`
- "Test interactive mode" → Read `tmux`

---

### `ast-grep` — Code search/replace
**Read:** `/home/node/.pi/skills/ast-grep/SKILL.md`

**Triggers — read this skill when user says things like:**
- "Search the codebase for..."
- "Find all functions that..."
- "Replace X with Y across files"
- "Refactor..."
- "Find patterns in code"
- "Transform code"
- Any structured code search or transformation task

**Examples:**
- "Find all async functions" → Read `ast-grep`
- "Replace all print with logging" → Read `ast-grep`
- "Search for function calls to X" → Read `ast-grep`

---

### `commit` — Git commit helper
**Read:** `/home/node/.pi/skills/commit/SKILL.md`

**Triggers — read this skill when user says things like:**
- "Commit this"
- "Make a commit"
- "How should I commit?"
- "Commit message for..."
- "Atomic commit"
- "Conventional commit"

**Examples:**
- "Commit these changes" → Read `commit`
- "How should I write this commit?" → Read `commit`
- "Make an atomic commit" → Read `commit`

---

### `todo` — Test-driven task lists
**Read:** `/home/node/.pi/skills/todo/SKILL.md`

**Triggers — read this skill when user says things like:**
- "Create a todo list"
- "TDD approach"
- "Test first"
- "Task breakdown"
- "What tests should I write?"
- "Plan the implementation"

**Examples:**
- "Create a todo for this feature" → Read `todo`
- "TDD this functionality" → Read `todo`
- "What tests should I write first?" → Read `todo`

---

## DevOps Skills

### `generate-dockerfile` — Create Dockerfile
**Read:** `/home/node/.pi/skills/generate-dockerfile/SKILL.md`

**Triggers — read this skill when user says things like:**
- "Create a Dockerfile"
- "Dockerize this"
- "Container setup"
- "Build Docker image"
- "Need a Dockerfile for..."

**Examples:**
- "Create a Dockerfile for this app" → Read `generate-dockerfile`
- "Dockerize the project" → Read `generate-dockerfile`

---

### `generate-cicd` — Create CI/CD workflow
**Read:** `/home/node/.pi/skills/generate-cicd/SKILL.md`

**Triggers — read this skill when user says things like:**
- "Create CI/CD"
- "GitHub Actions workflow"
- "Setup automated testing"
- "Pipeline for..."
- "Automate deployment"

**Examples:**
- "Create a CI pipeline" → Read `generate-cicd`
- "Setup GitHub Actions" → Read `generate-cicd`

---

## Documentation Skills

### `crafting-effective-readmes` — Write README files
**Read:** `/home/node/.pi/skills/crafting-effective-readmes/SKILL.md`

**Triggers — read this skill when user says things like:**
- "Write a README"
- "Improve the README"
- "Documentation for this project"
- "Project description"
- "Setup instructions"

**Examples:**
- "Write a README for this" → Read `crafting-effective-readmes`
- "Improve the project docs" → Read `crafting-effective-readmes`

---

### `writing-clearly-and-concisely` — Better writing
**Read:** `/home/node/.pi/skills/writing-clearly-and-concisely/SKILL.md`

**Triggers — read this skill when user says things like:**
- "Improve this text"
- "Make this clearer"
- "Better writing"
- "Edit this prose"
- "Documentation style"

**Examples:**
- "Make this clearer" → Read `writing-clearly-and-concisely`
- "Improve this documentation" → Read `writing-clearly-and-concisely`

---

### `boxer` — Create centered box art
**Read:** `/home/node/.pi/skills/boxer/SKILL.md`

**Triggers — read this skill when user says things like:**
- "Make a box around this"
- "Center this text"
- "Box art"
- "Ascii art border"
- "Format this in a box"

**Examples:**
- "Put this in a box" → Read `boxer`
- "Make this look nice with borders" → Read `boxer`

---

## Content Generation Skills

### `fal-ai` — Generate images
**Read:** `/home/node/.pi/skills/fal-ai/SKILL.md`

**Triggers — read this skill when user says things like:**
- "Generate an image"
- "Create a logo"
- "Make art for..."
- "AI image"
- "Draw..."

**Examples:**
- "Generate a logo" → Read `fal-ai`
- "Create an image of..." → Read `fal-ai`

---

### `strudel` — Generate live coding patterns
**Read:** `/home/node/.pi/skills/strudel/SKILL.md`

**Triggers — read this skill when user says things like:**
- "Strudel pattern"
- "Live coding music"
- "Generate tidal cycles code"
- "Music pattern"

**Examples:**
- "Make a Strudel pattern" → Read `strudel`
- "Generate live coding music" → Read `strudel`

---

## Utility Skills

### `plan-mode` — Planning without coding
**Read:** `/home/node/.pi/skills/plan-mode/SKILL.md`

**Triggers — read this skill when user says things like:**
- "Plan this out"
- "Let's think through..."
- "Design this feature"
- "Architecture discussion"
- "Explore options"
- "What are the tradeoffs?"
- "How should we approach..."

**Examples:**
- "Plan this feature first" → Read `plan-mode`
- "Let's discuss the design" → Read `plan-mode`
- "What are the options?" → Read `plan-mode`

---

## Default Skill Loading Rules

**ALWAYS load these skills at conversation start:**
1. `/home/node/.pi/skills/skill-index/SKILL.md` (this file)
2. Any project-specific skill referenced in the project context

**When in doubt about which skill to use:**
1. Check the triggers above for matching keywords
2. If multiple skills match, pick the most specific one
3. When completely unsure, ask the user which skill they want

**Common workflow patterns:**
- New system design → `arch-create` → `prd-create` → `prd-start` → `prd-next` → [work] → `prd-update-progress` → `prd-done`
- New feature idea without architecture changes → `prd-create` → `prd-start` → `prd-next` → [work] → `prd-update-progress` → `prd-done`
- Need info → `serper-search` or `context7`
- Testing CLI → `tmux`
- Refactoring → `ast-grep`
- Committing → `commit`
