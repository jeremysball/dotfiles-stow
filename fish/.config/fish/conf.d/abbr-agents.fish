# Agent tooling abbreviations. Harmless on a host without the agents installed,
# since an abbreviation only expands when you type it.

abbr -a -- man 'TERM=xterm man'
abbr -a -- claude 'claude --dangerously-skip-permissions'
abbr -a -- opencode 'opencode --auto'
abbr -a -- qwen "CLAUDE_CONFIG_DIR=$HOME/.claude-qwen claude --dangerously-skip-permissions"
