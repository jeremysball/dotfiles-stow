---
name: pi-todo
description: Ad-hoc todo list for quick bug fixes and small changes. NOT for spec-driven development.
---

# Pi Todo Extension - Ad-hoc Task Tracking

**⚠️ IMPORTANT: This is ONLY for informal, ad-hoc situations.**

## When to Use This Extension

Use the `todo` tool when:
- The user says something like "fix this bug and also update that logging"
- The user mentions multiple small changes in one message: "change the color here and add a button there"
- You're doing quick exploration with multiple small tasks
- The user is rapidly finding bugs and requesting fixes without a formal spec

**Don't create a todo for a single action you complete immediately.** If you're doing one thing right now, just do it. Todos track work that spans multiple steps or interactions.

## When NOT to Use This Extension

**DO NOT use for spec-driven development.** Instead use:
- `prd-exec` - For implementing features from PRDs
- `prd-start` / `prd-next` - For structured PRD workflows

The todo tool is for ad-hoc situations where the user is improvising. prd-exec is for following a specification.

## Workflow

1. **Create todos** when the user mentions multiple tasks
2. **Mark complete** as you finish each task
3. **The todo list prints to chat automatically** - no need to manually report progress
4. **Continue** until all todos are done

## Example Conversation

**User:** "Fix the login button color and also add validation to the form"

**Model:**
- Creates todo #1: "Fix login button color"
- Creates todo #2: "Add form validation"
- Completes todo #1 (prints update to chat)
- Completes todo #2 (prints update to chat)

## Available Tool Actions

- `list` - Show all todos
- `add` (text) - Create a new todo
- `complete` (id) - Mark a todo as done
- `uncomplete` (id) - Reopen a completed todo
- `remove` (id) - Delete a todo
- `clear` - Delete all todos
- `prioritize` (ids) - Reorder todos by priority

## Commands (for user)

- `/todos` - Show current todo list
- `/todo-clear` - Clear all todos
