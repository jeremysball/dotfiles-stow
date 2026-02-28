---
name: tmux
description: USE THIS SKILL for terminal automation. Required for any interactive CLI testing or TUI automation.
---

# tmux — USE THIS SKILL

**REQUIRED for:** Any CLI automation, TUI testing, or interactive command capture.

## Automation Only

```bash
# Start detached (ALWAYS use -d for automation)
tmux new-session -d -s name "cmd"

# Send commands (NEVER use echo | tmux)
tmux send-keys -t name "cmd" Enter
tmux send-keys -t name C-c

# Capture output
tmux capture-pane -t name -p
tmux capture-pane -t name -p -S -100    # Last 100 lines

# Cleanup
tmux kill-session -t name
```

## Full Pattern

```bash
tmux new-session -d -s test "uv run app"
sleep 2
tmux send-keys -t test "input" Enter
OUTPUT=$(tmux capture-pane -t test -p)
tmux kill-session -t test
```

**Never:** `echo "cmd" | tmux` — runs in new shell, not the session.
