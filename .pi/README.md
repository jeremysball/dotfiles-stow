# Pi Coding Agent Monorepo

Extensions and skills for the [Pi coding agent](https://github.com/mariozechner/pi-coding-agent), absorbed into dotfiles under `.pi/` on 2026-08-30.

## Structure

```
.pi/
├── agent/                  # Pi runtime config (tracked)
│   ├── settings.json       # user settings + provider modelOverrides
│   ├── models.json         # provider catalog
│   ├── APPEND_SYSTEM.md_   # appended system prompt (trailing _ is intentional)
│   └── extensions/         # provider + hook extensions (registerProvider)
├── extensions/             # pnpm-workspace extension packages
│   ├── auto-prd/           # GitHub PRD workflows (archived)
│   ├── osc777-notify/      # desktop notifications
│   ├── pi-todo/            # TDD task lists
│   └── *.ts                # loose extension sources (glm5-timeout-resend,
│                           #   peon-ping, turingtools-disabled, tsconfig.base)
├── skills/                 # active skills (30)
├── skills-archive/         # retired skills (36), flattened, history dropped
├── disabled/               # extensions archived in place
├── prds/                   # PRD markdown
├── package.json            # pnpm workspace root
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
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
pnpm changeset          # create a changeset
pnpm version-packages   # version packages
pnpm release            # publish
```

## Runtime state (not tracked)

`.pi/.gitignore` excludes machine-local runtime state: `auth.json`,
`models-store.json`, `sessions/`, `node_modules/`, and `*.bak.*` backups.
`agent/settings.json` and `agent/models.json` are tracked — they are live
config, not runtime state.

## License

MIT
