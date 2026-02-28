---
name: tmux
description: Terminal multiplexer for persistent sessions and automation.
---

# tmux

## Start

```bash
tmux new-session -d -s name "cmd"       # Detached
tmux new-session -s name                # Attached
```

## Send Input

```bash
tmux send-keys -t name "cmd" Enter      # Send command
tmux send-keys -t name C-c              # Ctrl+C
```

**Never:** `echo "cmd" | tmux` — runs in new shell, not the session.

## Capture Output

```bash
tmux capture-pane -t name -p            # To stdout
tmux capture-pane -t name -p -S -100    # Last 100 lines
```

## Manage

```bash
tmux ls
tmux attach -t name
tmux kill-session -t name
tmux kill-server
```

## Automation

```bash
tmux new-session -d -s test "uv run app"
sleep 2
tmux send-keys -t test "input" Enter
OUTPUT=$(tmux capture-pane -t test -p)
tmux kill-session -t test
```

**Interactive:** `Ctrl+b d` to detach, `Ctrl+b [` to scroll.
