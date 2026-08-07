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

if ! command -v mise > /dev/null 2>&1; then
    echo "init.sh: mise is not installed yet; install it first, then re-run this script" >&2
    exit 1
fi

git submodule update --init --recursive

mise bootstrap dotfiles apply --yes

mise install

mise run secrets-install

echo "init.sh: done. Run 'secrets-unlock' (needs a real terminal, one pinentry prompt), then 'exec fish' to switch shells."
