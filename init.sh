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
    echo "init.sh: mise not found, installing to ~/.local/bin/mise via https://mise.run ..." >&2
    # Official installer respects MISE_INSTALL_PATH; default is ~/.local/bin/mise
    curl -fsSL https://mise.run | sh
    export PATH="$HOME/.local/bin:$PATH"
fi
if ! command -v mise > /dev/null 2>&1; then
    echo "init.sh: mise is still not installed after auto-install; install it manually, then re-run this script" >&2
    exit 1
fi

git submodule update --init --recursive

mise bootstrap dotfiles apply --yes

mise install

# Install/bootstrap tasks (secrets-install, dotclaude-install,
# serper-axi-install, ...) live in the separate jeremysball/mise-en-system
# repo rather than this repo's own [tasks] table -- see the comment at the
# top of .config/mise/config.toml for why. `mise bootstrap repos apply`
# clones/converges the [bootstrap.repos] entry declared there: it clones
# ~/projects/mise-en-system if missing, pulls it only when the checkout is
# clean and origin matches, and leaves a dirty or diverged checkout alone
# instead of aborting the whole script the way a bare `git pull` would.
MISE_SYSTEM_DIR="$HOME/projects/mise-en-system"

mise bootstrap repos apply

# Install mise-en-system's own [tools] up front rather than letting the
# first task below trigger an on-demand install -- a failed on-demand
# install (no network mid-bootstrap, registry rate-limit) would otherwise
# abort a task partway through instead of failing cleanly here.
mise -C "$MISE_SYSTEM_DIR" install

# `:::` runs the three tasks as one mise invocation instead of three
# separate fork/exec + config-parse cycles; `-j 1` keeps them sequential
# since dotclaude-install and serper-axi-install assume secrets-install
# has already run. Adding a task to mise-en-system's mise.toml means
# adding it here too -- mise has no "run every task" mode this could
# iterate over instead.
mise -C "$MISE_SYSTEM_DIR" run -j 1 secrets-install ::: dotclaude-install ::: serper-axi-install

echo "init.sh: done. Run 'secrets-unlock' (needs a real terminal, one pinentry prompt), then 'exec fish' to switch shells. Export SERPER_API_KEY before running serper-axi."
