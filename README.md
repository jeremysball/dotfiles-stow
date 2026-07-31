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

Then `mise install` to pull down the tools.

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
- `bin` scripts that live in `~/.local/bin`
- `fonts`

From an older graphical workstation, kept for whenever I set one back up:

- `i3`, `xorg`, `picom`, `alacritty`, `helix`, `zsh`, `tmux`

Nothing forces you to stow all of them. Stow the packages the machine needs.

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

On a machine without fisher, `conf.d/fisher-bootstrap.fish` fetches fisher,
sources it, and runs `fisher update`, which installs everything the manifest
lists. It guards on `functions -q fisher`, so it runs once per machine rather
than once per shell. The prompt stays plain fish default until it finishes.

Do not change that to `fisher install jorgebucaran/fisher`. That call rewrites
`fish_plugins`, and since the manifest is symlinked into this repo, it
overwrites the tracked file with whatever fisher knows about at that moment. It
already ate `ilancosman/tide@v6` once.

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
