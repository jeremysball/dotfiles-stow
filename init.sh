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

# Install/bootstrap tasks (secrets-install, dotclaude-install,
# serper-axi-install, ...) live in the separate jeremysball/mise-en-system
# repo rather than this repo's own [tasks] table -- see the comment at the
# top of .config/mise/config.toml for why. Clone it first so `mise -C` can
# reach its tasks below.
MISE_SYSTEM_DIR="$HOME/projects/mise-en-system"

mkdir -p "$HOME/projects"

if [ -d "$MISE_SYSTEM_DIR" ]; then
    echo "init.sh: $MISE_SYSTEM_DIR already exists, pulling latest"
    git -C "$MISE_SYSTEM_DIR" pull
else
    git clone https://github.com/jeremysball/mise-en-system.git "$MISE_SYSTEM_DIR"
fi

mise -C "$MISE_SYSTEM_DIR" run secrets-install

mise -C "$MISE_SYSTEM_DIR" run dotclaude-install

mise -C "$MISE_SYSTEM_DIR" run serper-axi-install

echo "init.sh: done. Run 'secrets-unlock' (needs a real terminal, one pinentry prompt), then 'exec fish' to switch shells. Export SERPER_API_KEY before running serper-axi."
