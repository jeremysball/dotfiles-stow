# Agent tooling abbreviations. Host-specific: only useful where the coding
# agents are installed. Shared abbrs live in fish/conf.d/aliases.fish.

abbr -a -- man 'TERM=xterm man'
abbr -a -- claude 'claude --dangerously-skip-permissions'
abbr -a -- opencode 'opencode --auto'
abbr -a -- qwen "CLAUDE_CONFIG_DIR=$HOME/.claude-qwen claude --dangerously-skip-permissions"
