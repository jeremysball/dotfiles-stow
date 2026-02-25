---
name: tmux-tape-no-img
description: Control terminal sessions via tmux for E2E testing of TUI applications, CLI interactions, and asyncio apps.
---

# tmux-tape Skill

Run terminal sessions programmatically with tmux (session control).

## Overview

**Why this approach:**
- **tmux** — Controls the session, sends keystrokes, captures text


## Quick Start

**Always use `uv run python script.py` to run scripts.**

### 1. Install Dependencies

- tmux

### 2. Copy tmux_tool.py

Copy the module to your working directory:

```bash
cp .pi/skills/tmux-tape/tmux_tool.py /tmp/pi-tmux/
```

### 3. Write Your Script

```python
#!/usr/bin/env python3
from tmux_tool import TerminalSession

with TerminalSession("test") as s:
    s.send("echo hello")
    s.send_key("Enter")
    s.sleep(1)
    
    result = s.capture()
    print(result)
```

### 4. Run

```bash
cd /tmp/pi-tmux
uv run python script.py
```


## Key Reference

| Key | Description |
|-----|-------------|
| `Enter` | Return/Enter |
| `C-c` | Ctrl+C (interrupt) |
| `C-d` | Ctrl+D (EOF) |
| `C-l` | Clear screen |
| `Escape` | Escape key |
| `Tab` | Tab key |
| `Space` | Space bar |
| `Up` / `Down` / `Left` / `Right` | Arrow keys |

---

## Common Patterns

### Start Alfred (asyncio app)
```python
with TerminalSession("alfred") as s:
    s.send("bash")
    s.send_key("Enter")
    s.sleep(0.3)
    
    s.send("cd /workspace/alfred-prd && export $(grep -v '^#' .env | xargs) && .venv/bin/alfred")
    s.send_key("Enter")
    s.sleep(3)
    
    result = s.capture()
    print(result)
```

### Send Message and Capture Response
```python
s.send("what is 2+2?")
s.send_key("Enter")
s.sleep(12)  # LLM needs time

result = s.capture()
print(result)
```

### Clean Exit
```python
s.send_key("C-c")
s.send("exit")
s.send_key("Enter")
s.sleep(0.5)
```

---

## Workflow

### 1. Create Session Directory
```bash
SESSION_DIR="/tmp/pi-tmux/$(date +%Y-%m-%d_%H-%M-%S)"
mkdir -p "$SESSION_DIR"
cp .pi/skills/tmux-tape/tmux_tool.py "$SESSION_DIR/"
cd "$SESSION_DIR"
```

### 2. Write Script
Create `script.py` using the `write` tool.

### 3. Run
```bash
uv run python script.py
```

### 4. Check Results
- Text output printed to stdout

### 5. Persist USEFUL scripts into .agents folder near other tests (i.e. tests/)
---

## Error Handling

**Retry pattern:**
1. Read error message
2. Check script.py
3. Fix issue (timing, typo, wrong port)
4. Run again
5. Stop after 3 attempts

**Common issues:**

| Error | Cause | Fix |
|-------|-------|-----|
| `tmux: command not found` | tmux not installed | Install tmux |

---

## Output Format

After running, report terminal text output.

Example:

```bash
Session dir: /tmp/pi-tmux/2026-02-22_01-45-00
Script: script.py

Text:
["terminal text output"]
```

## Full Example

```python
#!/usr/bin/env python3
"""Test Alfred CLI."""

from tmux_tool import TerminalSession

def main():
    print("=== Alfred Test ===\n")
    
    with TerminalSession("alfred") as s:
        print("Starting Alfred...")
        s.send("bash")
        s.send_key("Enter")
        s.sleep(0.3)
        s.send_key("Enter")
        s.sleep(3)
        
        result = s.capture()
        print(result)
        
        print("\nSending message...")
        s.send("what is 2+2?")
        s.send_key("Enter")
        s.sleep(12)
        
        result = s.capture()
        print(result)
        
        s.send_key("C-c")
        s.send("exit")
        s.send_key("Enter")
    
    print("\n=== Done ===")


if __name__ == "__main__":
    main()
```

---

## Tips

1. **Use `uv run`** — Always run scripts with `uv run python script.py`
2. **Estimate waits** — LLM responses need 10s+
3. **Use bash** — Avoid fish/shell compatibility issues

