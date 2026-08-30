# Pi Coding Agent Config

This directory holds the pi coding agent's config, extensions, skills, and
prds. It was absorbed from the standalone `jeremysball/pi-mono` repo into
dotfiles on 2026-08-30; the old repo is retired.

The live `~/.pi` is populated from here by mise dotfiles
(`"~/.pi" = { mode = "symlink-each" }` in `.config/mise/config.toml`), which
symlinks each file individually. Runtime state pi writes into `~/.pi`
(sessions, auth, model caches, settings) is gitignored and stays local.

## Quick Start

```bash
# Install dependencies (requires pnpm)
pnpm install

# Run a script across all packages
pnpm -r run build

# Add a dependency to a specific package
pnpm --filter @pi/extension-auto-prd add <package>
```

## Structure

```
.
├── extensions/          # Pi extensions
│   ├── auto-compact/    # Auto context compaction
│   ├── auto-prd/        # GitHub PRD workflows
│   ├── osc777-notify/   # Notifications
│   └── pi-todo/         # TDD task lists
├── skills/              # Pi skills
│   └── token-burn/      # Token usage analysis
└── package.json         # Root workspace config
```

## Package Management

This project uses **pnpm workspaces**. The npm workspaces had issues, so pnpm is required.

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm -r run <script>` | Run script in all packages |
| `pnpm --filter <pkg> <cmd>` | Run command in specific package |
| `pnpm add -D -w <pkg>` | Add dev dependency to root |

## Versioning

Uses [changesets](https://github.com/changesets/changesets) for versioning:

```bash
# Create a changeset
pnpm changeset

# Version packages
pnpm version-packages

# Publish
pnpm release
```

## Extensions

### [@pi/extension-auto-compact](./extensions/auto-compact/)
Automatically triggers context compaction when usage exceeds configurable thresholds.

### [@pi/extension-auto-prd](./extensions/auto-prd/)
GitHub PRD workflow automation - create, start, and manage PRDs from pi.

### [@pi/extension-pi-todo](./extensions/pi-todo/)
TDD-style task lists with test-first development workflow.

### [@pi/extension-osc777-notify](./extensions/osc777-notify/)
Desktop notifications for long-running jobs.

## License

MIT
