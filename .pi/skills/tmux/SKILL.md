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

---

## Troubleshooting: "no server running"

### The Problem

If you see:
```
no server running on /tmp/tmux-1000/default
```

Tmux failed to start because **it requires a controlling terminal** (`/dev/tty`).

In non-interactive environments (CI, containers, some IDE terminals):
- `tty` returns "not a tty"
- Tmux cannot open `/dev/tty` → `ENXIO` (No such device)
- Tmux server exits immediately, socket disappears

### The Solution: `script` + `setsid`

Use `script` to create a pseudo-terminal, `setsid` for session isolation:

```bash
# Start tmux with a pseudo-terminal
setsid script -q -c "tmux new-session -d -s name 'uv run alfred'" /dev/null

# Wait for server to start
sleep 2

# Now commands work normally
tmux send-keys -t name "input" Enter
OUTPUT=$(tmux capture-pane -t name -p)
```

**Components:**

| Tool | Purpose |
|------|---------|
| `setsid` | Create new session, detach from parent process group |
| `script` | Allocate pseudo-terminal (pty) for tmux to use |
| `-q` | Quiet mode (no startup messages) |
| `-c "..."` | Run command instead of interactive shell |
| `/dev/null` | Discard typescript output file |

**Alternative using `nohup`:**
```bash
cd /workspace/project && nohup script -q -c "tmux new-session -d -s name 'cmd'" /dev/null > /dev/null 2>&1 &
sleep 2
tmux ls
```

### Why This Works

1. `script` creates a **pseudo-terminal** (software terminal device)
2. Tmux can now open `/dev/tty` through this pty
3. `setsid` ensures the process tree is properly isolated
4. Tmux server starts and keeps the socket alive
