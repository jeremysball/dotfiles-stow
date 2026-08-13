---
name: using-opencode
description: load when using opencode
---

# Using OpenCode

Anything that must run detached (in the background) needs `setsid nohup <cmd> &` — the bash tool has no real backgrounding; timeout just kills the process.
