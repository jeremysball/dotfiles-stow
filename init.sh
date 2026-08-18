#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

# mise's dotfiles.root setting defaults to ~/.dotfiles. Pointing it at
# REPO_DIR explicitly means dotfile sources resolve correctly even if the
# repo is cloned somewhere else. The `cd` above is separate and just as
# necessary: mise discovers .config/mise/config.toml itself (the [tools]
# and [dotfiles] tables) by walking up from the current directory, not from
# MISE_DOTFILES_ROOT, so running this script from outside the repo without
# the `cd` would silently find no config at all.
export MISE_DOTFILES_ROOT="$REPO_DIR"

# Pretty output helpers — use gum (charmbracelet) when available, otherwise
# plain echo. Helpers re-check `command -v gum` at call time so they work
# even if gum appears mid-run (after we install it FIRST below).
_has_gum() { command -v gum >/dev/null 2>&1; }
_gum_style() {
    if _has_gum; then
        gum style --border rounded --border-foreground 212 --padding "0 1" --margin "0 0 1 0" --bold "$@"
    else
        printf '━━ %s ━━\n' "$*"
    fi
}
_gum_log() {
    # $1 = level (info/error/warn), $2 = message
    if _has_gum; then
        gum log --level "$1" "$2"
    else
        printf 'init.sh: [%s] %s\n' "$1" "$2" >&2
    fi
}
_gum_spin() {
    # $1 = title, remaining = command + args
    local title="$1"; shift
    if _has_gum; then
        gum spin --title "$title" -- "$@"
    else
        printf '→ %s\n' "$title" >&2
        "$@"
    fi
}

# Ensure mise is available even on a truly fresh system where ~/.local/bin
# is not yet on PATH and mise has never been installed. Check the absolute
# location first so a reboot-fresh fish shell with a system-only PATH still
# finds it, then auto-install via the official installer if truly missing.
if ! command -v mise > /dev/null 2>&1; then
    if [ -x "$HOME/.local/bin/mise" ]; then
        export PATH="$HOME/.local/bin:$PATH"
    elif [ -x "/home/linuxbrew/.linuxbrew/bin/mise" ]; then
        export PATH="/home/linuxbrew/.linuxbrew/bin:$PATH"
    fi
fi
if ! command -v mise > /dev/null 2>&1; then
    _gum_log warn "mise not found, installing to ~/.local/bin/mise via https://mise.run ..."
    # Official installer respects MISE_INSTALL_PATH; default is ~/.local/bin/mise
    curl -fsSL https://mise.run | sh
    export PATH="$HOME/.local/bin:$PATH"
fi
if ! command -v mise > /dev/null 2>&1; then
    _gum_log error "mise is still not installed after auto-install; install it manually, then re-run this script"
    exit 1
fi

# Install gum FIRST so even the first real step is pretty. On a fresh
# machine gum is not yet on PATH until after `mise install`, but `gum` is
# tiny (prebuilt binary, <10s) and defined in .config/mise/config.toml, so we
# can pull it alone before the heavy `mise install` of everything else. If
# this fails (no network), we fall back to plain echo for the rest.
if ! _has_gum; then
    printf '→ Installing gum for pretty output…\n' >&2
    mise install gum 2>&1 | tail -n 5 || true
    # mise shims may not be on PATH in this bash yet; add them explicitly
    export PATH="$HOME/.local/share/mise/shims:$HOME/.local/bin:$PATH"
fi

_gum_style "dotfiles bootstrap"

_gum_spin "Initializing submodules…" git submodule update --init --recursive

_gum_spin "Applying dotfiles (mise bootstrap dotfiles)…" mise bootstrap dotfiles apply --yes

_gum_spin "Installing mise tools (this may take a minute)…" mise install

# Install/bootstrap tasks (install-secrets, install-dotclaude,
# install-serper-axi, ...) live in the separate jeremysball/mise-en-system
# repo rather than this repo's own [tasks] table -- see the comment at the
# top of .config/mise/config.toml for why. `mise bootstrap repos apply`
# clones/converges the [bootstrap.repos] entry declared there: it clones
# ~/projects/mise-en-system if missing, pulls it only when the checkout is
# clean and origin matches, and leaves a dirty or diverged checkout alone
# instead of aborting the whole script the way a bare `git pull` would.
MISE_SYSTEM_DIR="$HOME/projects/mise-en-system"

_gum_spin "Syncing system repos (mise-en-system)…" mise bootstrap repos apply

# Install mise-en-system's own [tools] up front rather than letting the
# first task below trigger an on-demand install -- a failed on-demand
# install (no network mid-bootstrap, registry rate-limit) would otherwise
# abort a task partway through instead of failing cleanly here.
_gum_spin "Installing system tools…" mise -C "$MISE_SYSTEM_DIR" install

# `:::` runs the three tasks as one mise invocation instead of three
# separate fork/exec + config-parse cycles; `-j 1` keeps them sequential
# since install-dotclaude and install-serper-axi assume install-secrets
# has already run. Adding a task to mise-en-system's mise.toml means
# adding it here too -- mise has no "run every task" mode this could
# iterate over instead.
_gum_spin "Running bootstrap tasks (secrets/dotclaude/serper-axi)…" mise -C "$MISE_SYSTEM_DIR" run -j 1 install-secrets ::: install-dotclaude ::: install-serper-axi

# Weekly mise auto-upgrade (bump script) — best-effort. On WSL without
# systemd this is a no-op; on a real Arch host it enables the timer that was
# just symlinked via `mise bootstrap dotfiles apply` above.
if systemctl --user list-units >/dev/null 2>&1; then
    _gum_spin "Enabling weekly mise upgrade timer…" bash -c 'systemctl --user daemon-reload && systemctl --user enable --now mise-upgrade.timer'
else
    _gum_log info "systemd user not running (WSL without systemd?) — skipping mise-upgrade.timer enable; enable manually with: systemctl --user enable --now mise-upgrade.timer"
fi

if _has_gum; then
    gum style --foreground 212 --bold "✔ done"
    gum format --type markdown <<'MD'
Run **`secrets-unlock`** (needs a real terminal, one pinentry prompt), then **`exec fish`** to switch shells.
Export `SERPER_API_KEY` before running `serper-axi`.
MD
else
    echo "init.sh: done. Run 'secrets-unlock' (needs a real terminal, one pinentry prompt), then 'exec fish' to switch shells. Export SERPER_API_KEY before running serper-axi."
fi
