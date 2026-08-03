# dotfiles-stow

My dotfiles, managed with [GNU stow](https://www.gnu.org/software/stow/).

Each top-level directory is a stow package. Inside it, the layout mirrors
`$HOME`, so `fish/.config/fish/config.fish` ends up symlinked at
`~/.config/fish/config.fish`. Stowing a package creates the symlinks. That is
the whole idea.

## Setting up a fresh machine

```fish
git clone https://github.com/jeremysball/dotfiles-stow ~/src/dotfiles-stow
cd ~/src/dotfiles-stow
stow --no-folding --target="$HOME" fish mise nvim
exec fish
```

Then `mise install` to pull down the tools. `init.sh` runs those two steps for
you.

Two flags matter here and neither is optional.

`--target="$HOME"` is required because stow defaults to the parent of the
current directory. If the repo lives at `/workspace/dotfiles-stow`, plain
`stow fish` writes into `/workspace`, not your home directory.

`--no-folding` forces stow to symlink individual files instead of whole
directories. Without it, `~/.config/fish/functions` becomes a single symlink
pointing into this repo, and then anything that writes into that directory is
writing into git. fish drops `fish_variables` there, and fisher installs its
plugin files there. Neither belongs in the repo.

If a file already exists where stow wants to put a symlink, it refuses and
tells you which files collided. That is a feature. To pull the existing file
into the repo instead, add `--adopt`, but understand what it does first: it
moves the live file INTO the repo, overwriting the repo's copy, then symlinks
back. Your repo content is what is at risk, not the live file. So run it on a
clean tree and look at the diff:

```fish
stow --adopt --no-folding --target="$HOME" fish
git diff                # what the machine had that the repo did not
git checkout -- .       # keep the repo version, symlinks stay in place
```

Simulate anything before you run it with `stow -nv --no-folding --target="$HOME" <package>`.
It prints every link it would make and touches nothing.

## Packages

Current machines:

- `fish` shell config, one package covering every host
- `mise` tool and runtime versions
- `nvim` LazyVim config, including `lazy-lock.json`
- `doom` Doom Emacs config, the three files in `~/.config/doom`
- `bin` scripts that live in `~/.local/bin`
- `fonts`
- `bash` `~/.bashrc`, for the shells that are not fish
- `git` `~/.gitconfig` and the global ignore file
- `gh` GitHub CLI config and the PAT switcher `.bashrc` sources
- `systemd` user units and timers
- `zellij`, `htop`, `superfile`, `himalaya`, `alfred`, `taskferry`, `mcporter`

### What is deliberately not tracked

`hosts.yml` under `gh` holds OAuth tokens and is gitignored. So is
`superfile/theme/`, which superfile ships itself.

`.config/rclone/rclone.conf`, `.config/msmtp/`, and `.config/protonmail/`
hold credentials and stay out entirely. `himalaya` is here only because its
config fetches the bridge password from `pass` at runtime rather than
storing it.

`abs` and `abs.service` are not here either. They belong to the
`always-be-sessioning` repo, which installs them itself.

From an older graphical workstation, kept for whenever I set one back up:

- `i3`, `xorg`, `picom`, `alacritty`, `helix`, `zsh`, `tmux`

Nothing forces you to stow all of them. Stow the packages the machine needs.

## Secrets

Global secrets (`OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`, and the like) don't
live in this repo at all, plaintext or otherwise. `pass` is the source of
truth, holding one entry, `global/env`, in dotenv format. A separate
`secret-management` repo owns the machinery around it and installs itself
straight into `$HOME` rather than through stow:

- `secrets-unlock` runs `pass show global/env` from a real terminal (the one
  interactive pinentry prompt required per boot) and writes the result to
  `$XDG_RUNTIME_DIR/secrets/global.env`, mode 600. That path is tmpfs, so the
  decrypted file never touches persistent disk and is gone on reboot.
- `~/.gnupg/gpg-agent.conf` sets a long cache TTL, which is what makes `pass`
  usable from non-interactive/spawned shells after the first unlock instead of
  failing with `Inappropriate ioctl for device`.
- `~/.config/fish/conf.d/secrets.fish` sources `global.env` unconditionally on
  every new shell, so it no longer matters whether the shell was opened under
  a particular directory.

What this repo does contain is the consumer side: `fish_greeting`
(`fish/.config/fish/functions/fish_greeting.fish`) checks whether
`global.env` exists and nags `secrets are locked! run secrets-unlock` if not,
instead of a fortune. Two narrower cases don't go through `pass show
global/env` at all:

- `himalaya`'s config fetches its bridge password from `pass` directly at
  runtime, which is the only reason that package is stowed here instead of
  excluded like the other credential-holding configs above.
- `gh`'s `hosts.yml` holds OAuth tokens directly, not via `pass`, and stays
  gitignored rather than routed through the global-secrets flow.

## fish

One package covers every machine. Anything a given host might not have is
guarded on the command it needs, so `conf.d/keychain.fish` does nothing on a
box without keychain installed and does not print an error either.

Host-specific setup goes in `conf.d/`, not in `config.fish`. fish sources
every `conf.d/*.fish` before `config.fish` runs, which is why `config.fish`
here is two lines of comment and nothing else.

### Plugins are not tracked here

Only `fish_plugins`, the manifest, is in git. The actual tide and fisher
function files are not. There used to be 85 of them checked in, and stowing
the package installed one machine's prompt onto every other machine as a side
effect.

On a machine missing anything the manifest lists, `conf.d/fisher-bootstrap.fish`
fetches fisher, sources it, and runs `fisher update`. The prompt stays plain
fish default until it finishes.

The guard checks that every plugin in the manifest is installed, not only that
fisher exists. Guarding on fisher alone leaves a hole: fisher writes its own
function to disk before installing the rest, so an install that dies partway
satisfies the guard permanently and the missing plugins never get retried.

### fisher writes to fish_plugins, and stow points that at this repo

Every fisher subcommand that changes state (`install`, `update`, `remove`,
`uninstall`) rewrites `fish_plugins`. It writes **the set that is
installed**, not the set the file listed. That is `functions/fisher.fish` line
221, inside the block shared by all four subcommands.

Since stow symlinks the manifest into this repo, that write lands on tracked
content. Consequences worth knowing:

- Running `fisher install <x>` when tide is broken rewrites the manifest to
  only `<x>` and drops tide. This is why the bootstrap calls `fisher update`
  instead: update installs the manifest's contents first, so the rewrite is a
  no-op. It is not that update avoids writing, because it does not.
- `fisher remove` of the last remaining plugin runs `rm -f $fish_plugins`,
  which deletes the stow symlink. The repo file survives. Re-stow to repair.
- Any `fisher install` you run by hand dirties the repo. That is fine and
  arguably correct, since the manifest should track what you have. Expect
  `git status` to show it.

Also be careful adding files to `functions/`. If tide ships a function by the
same name, its install fails on the collision and you get a broken prompt with
a confusing error. That happened with `fish_mode_prompt.fish`.

## mise

[mise](https://mise.jdx.dev/) manages user-space CLI tools and language
runtimes from `mise/.config/mise/config.toml`. `mise install` reads it and
installs everything listed. It resolves tools through its own registry, then
aqua, then ubi, then asdf plugins, so most things work by bare name, and
anything with a GitHub release binary works via `ubi:owner/repo`.

Some things stay on pacman on purpose, and the config comments say why:

- `fish` is the login shell and has to be in `/etc/shells`
- `grc` ships `/etc/grc.fish`, which `conf.d/grc.fish` sources by absolute path
- `ripgrep` is a hard dependency of the pacman `opencode` package, so the two
  move together or not at all
- `ghc` and `cabal` are left to ghcup, which is already managing six GHC
  versions side by side. mise installs ghcup and stops there.

### Per-project environments

Drop a `mise.toml` in a project to get a virtualenv and `.env` loading on cd:

```toml
[env]
_.python.venv = { path = ".venv", create = true }
_.file = ".env"
```

That creates the venv if it is missing, puts `.venv/bin` on PATH, sets
`VIRTUAL_ENV`, and loads `.env`. You have to run `mise trust` in the directory
once before mise will read the file, since otherwise any repo you clone could
set environment variables on you the moment you cd into it.

## doom

Doom Emacs config: `config.el`, `init.el`, `packages.el`. Doom keeps user
config in `~/.config/doom` and the framework itself in `~/.config/emacs`,
which is a clone of doomemacs and is not tracked here. On a fresh machine,
install Doom first, then stow this package over the top of the config files
its installer generates.
