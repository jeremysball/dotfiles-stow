# ~/.pi Monorepo Layout

This is a pnpm workspaces monorepo containing Pi extensions and skills,
absorbed into dotfiles under `.pi/` on 2026-08-30.

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
│   └── *.ts                # loose extension sources
├── skills/                 # active skills (30)
├── skills-archive/         # retired skills (36), flattened, history dropped
├── disabled/               # extensions archived in place
├── prds/                   # PRD markdown
├── package.json            # pnpm workspace root
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

## Package Management

This monorepo uses **pnpm** with workspaces. Do not use npm.

```bash
pnpm install                          # install all dependencies
pnpm -r run build                     # run a script in all packages
pnpm -r run lint
pnpm --filter @pi/extension-auto-prd run build   # run in a specific package
pnpm add -D -w <package>              # add a dependency to the root
pnpm --filter @pi/extension-auto-prd add <package>  # add to a specific package
```

## Versioning

Uses changesets for versioning and publishing:

```bash
pnpm changeset          # create a changeset
pnpm version-packages   # version packages
pnpm release            # publish (after building)
```

## Legacy Notes

- Each extension/skill previously lived in its own git repository.
- The old structure was `skills/<skill-name>/` and `extensions/<extension-name>/`.
- `skills-archive/` and `extensions/auto-prd/` were flattened into this repo
  (nested `.git` dirs removed, history dropped) and marked archived.
- Disabled extension stubs remain at the top level of `extensions/` and in
  `disabled/`.
