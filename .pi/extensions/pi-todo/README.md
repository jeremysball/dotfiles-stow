# Pi Todo Extension - Ad-hoc Task Tracking

Manage an ad-hoc todo list for quick bug fixes and small changes.

## Use Cases

- "Fix this bug and also update that logging"
- "Change the color here and add a button there"
- Quick exploration with multiple small tasks

## NOT For

- Implementing full features from PRDs
- Structured development workflows
- Complex multi-step specifications

For spec-driven development, use the `prd-exec` system instead.

## Usage

The LLM can use the `todo` tool to manage tasks:

- `list` - Show all todos
- `add` - Add a new todo
- `complete` - Mark a todo as done
- `uncomplete` - Reopen a completed todo
- `remove` - Remove a todo
- `clear` - Clear all todos
- `prioritize` - Reorder todos by priority

## Commands

- `/todos` - Show all active todos
- `/todo-clear` - Clear all todos

The todo list prints into chat as items are completed, keeping you informed of progress without switching contexts.
