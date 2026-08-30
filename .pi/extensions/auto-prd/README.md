# auto-prd

An opinionated Pi extension that automates the PRD lifecycle with a tiny finite-state machine and an LLM routing helper.

## What it does

- Parses the current session with regexes
- Inspects `prds/execution-plan-*.md` files for open checkboxes
- Infers the current PRD workflow state
- Validates that the snapshot is sane before asking the model what to do next
- Shells out to `pi -p` for every routing decision instead of hardcoding the branch
- Injects the `using-prds` skill context and autonomous best-judgment guidance into every routing prompt
- Stays dormant until you explicitly run `/prd-cycle`, then dispatches the chosen PRD action automatically
- Treats already-recorded progress or decision confirmations as move-on signals instead of re-running update commands
- Short-circuits visible next-task handoffs to `/prd-exec`, while explicit completion reports like `PRD #165 is complete` or `no execution plan remains` take priority and route to `/prd-done` instead of looping
- Reads only the visible assistant text; hidden reasoning is ignored so prompt leakage cannot trigger routing
- Falls back to the inferred workflow snapshot if the LLM returns `noop` on an active PRD prompt, including stale `finished`/`closed` states that still have open tasks or unfinished milestones

## Commands

- `/prd-cycle` - ask the LLM to choose the next PRD action and run it
- `/prd-cycle-status` - print the detected FSM state
- `/prd-cycle-stats` - print the workflow state-visit table on demand
- `/prd-cycle-reset` - replay the latest assistant text through the LLM and route its chosen action back into chat
- `/prd-cycle 136` - start PRD #136 when no PRD issue is known yet
- `/prd-cycle exec 136` - force the execution-plan step; the assistant prompt will be routed through the LLM and answered with `yes`
- `/prd-cycle close 136 "Duplicate"` - explicit manual close override with a reason

Compatibility aliases `/prd-cycle status`, `/prd-cycle stats`, and `/prd-cycle reset` still work.

## Workflow snapshot

The extension infers these coarse states as context for the LLM. The model decides which action to take; the snapshot is not the routing engine.

The snapshot currently recognizes these labels:

- `needs-list` → `/prds-get`
- `needs-selection` → `/prd-start <issue>`
- `started` → `/prd-exec <issue>` when an execution plan exists, otherwise `/prd-next`
- `needs-exec` → `/prd-exec <issue>`
- `exec-pending` → the model should choose `yes` for the confirmation that follows `/prd-exec`
- `ready-progress` → `/prd-update-progress`
- `after-progress` → `/prd-next` or `/prd-exec <issue>` if a plan is still pending
- `ready-decisions` → `/prd-update-decisions`
- `after-decisions` → `/prd-next`
- `ready-done` → `/prd-done` only when the PRD itself is explicitly finished; explicit completion text wins over stale plan metadata; otherwise `/prd-next` or `/prd-exec <issue>` if work remains
- `ready-close` → `/prd-done` only when the PRD is truly final; explicit closure text wins over stale plan metadata; otherwise `/prd-next` or `/prd-exec <issue>` if work remains
- `reset` → replay the latest assistant text through the LLM and let it choose yes/noop/the next PRD action

Auto-prd never dispatches `/prd-close` automatically; the close command is only for explicit manual overrides.

The FSM only advances when the expected state is detected via regex signals such as:

- `task implementation complete`
- `all PRD milestones complete`
- `design decision`
- `yes`
- `duplicate`
- `out of scope`
- `no longer needed`
- `abandoned`

## Prompt examples the model should handle

When an execution plan still has open tasks, the routing LLM is shown assistant prompts like:

- `Next Task Recommendation: ...` → `/prd-exec`
- `Work on this task? (yes/no)` → `/prd-exec` on the task handoff, `yes` once `/prd-exec` is already pending
- `Do you want to work on this task?` → `/prd-exec` on the task handoff, `yes` once `/prd-exec` is already pending
- `Ready to start? (yes to begin implementation)` → `/prd-exec`
- `PRD #165 is complete` → `/prd-done`
- `No execution plan remains` → `/prd-done`
- `Would you like to continue?` → `yes`
- `Should we continue?` → `yes`

The model is expected to return `yes` only for the follow-up confirmation prompt so the PRD cycle does not stall.

Completion reports can be recognized in multiple formats, including headings like:

- `changed`
- `what changed`
- `summary`
- `summary of changes`
- `summary of the bug and fix`
- `results`
- `batch analysis results`
- `what was fixed`
- `what was created`
- `files created`
- `files modified`
- `files touched`
- `next steps`
- `test`
- `tests`
- `test results`
- `validation`
- `verification`
- `changes`
- `implementation`
- `implementation details`
- `solution`
- `fix`
- `problem`
- `key changes`
- `takeaways`
- `impact`
- `notes`
- `files changed`
- `what i changed`

When the assistant finishes a task and emits a completion report with those sections, auto-prd shells out to `pi -p`, prints `shelling out to LLM for routing decision`, shows a working-message throbber, and then feeds the chosen action back into the chat.

Open execution plans take precedence over stale terminal history. If the plan still has pending tasks or the PRD still has later milestones, auto-prd will recover from `finished`/`closed` states instead of treating them as final.

When the workflow really is terminal, auto-prd prints a markdown table of workflow state visits so you can see how the cycle progressed. Use `/prd-cycle-stats` any time to print the same table on demand.

If a cycle looks closed because of stale session history, `/prd-cycle-reset` will replay the latest completion report and continue from it when possible.

## Installation

This directory is already in Pi's auto-discovery path if it lives under `~/.pi/extensions/`.

If you move it elsewhere, copy it into one of Pi's extension locations and run `/reload`.

## Notes

The extension resolves either standard command names or skill-prefixed names like `skill:prd-next`, so it works whether PRD steps are registered as skills or commands.

Because `pi.sendUserMessage()` does not expand `/skill:...` text on extension-originated messages, auto-prd reads the skill file directly and injects the expanded `<skill>...</skill>` block into the user message before dispatching it.

When auto-prd needs to choose the next PRD action, it shells out to `pi` and injects the `using-prds` skill context plus autonomous best-judgment guidance so the model makes the decision instead of hardcoding that branch.
