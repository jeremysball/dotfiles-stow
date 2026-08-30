# ~/.pi Layout

This directory lives inside the dotfiles repo (absorbed from
`jeremysball/pi-mono` 2026-08-30) and is applied to the live `~/.pi` by mise
dotfiles as per-file symlinks. It is a pnpm workspaces monorepo containing
Pi extensions and skills.

## Structure

```
.pi/                         # repo copy; live ~/.pi is symlinked from here
├── agent/                   # pi agent config
│   ├── extensions/          # provider/model extensions (js/ts)
│   └── skills/              # agent skills
├── package.json             # Root monorepo configuration
├── pnpm-workspace.yaml      # pnpm workspaces definition
├── extensions/              # Pi extensions
│   ├── auto-compact/        # Auto-compaction extension
│   ├── auto-prd/            # PRD workflow automation
│   ├── pi-todo/             # TDD task lists
│   └── osc777-notify/       # Notifications
├── skills/                  # Pi skills
│   └── token-burn/          # Token usage analysis
├── skills-archive/          # Retired skills, kept for reference
├── prds/                    # Pi PRDs (open and done)
├── disabled/                # Disabled extensions
└── .changeset/              # Changeset configuration
```

Runtime state (sessions, auth, model caches, settings) is gitignored and
never tracked; see `.pi/.gitignore`.

## Package Management

This monorepo uses **pnpm** with workspaces. Do not use npm.

```bash
# Install all dependencies
pnpm install

# Run a script in all packages
pnpm -r run build
pnpm -r run lint

# Run a script in a specific package
pnpm --filter @pi/extension-auto-prd run build

# Add a dependency to the root
pnpm add -D -w <package>

# Add a dependency to a specific package
pnpm --filter @pi/extension-auto-prd add <package>
```

## Versioning

Uses changesets for versioning and publishing:

```bash
# Create a changeset
pnpm changeset

# Version packages
pnpm version-packages

# Publish (after building)
pnpm release
```

## Legacy Notes

- Each extension/skill previously lived in its own git repository
- The old structure was: `skills/<skill-name>/` and `extensions/<extension-name>/`
- Disabled extension stubs remain at the top level of `extensions/` for now
