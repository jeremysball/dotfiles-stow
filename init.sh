#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# mise's dotfiles.root setting defaults to ~/.dotfiles. Pointing it at
# REPO_DIR explicitly means this script still works if the repo is cloned
# somewhere else.
export MISE_DOTFILES_ROOT="$REPO_DIR"

if ! command -v mise > /dev/null 2>&1; then
    echo "init.sh: mise is not installed yet; install it first, then re-run this script" >&2
    exit 1
fi

mise bootstrap dotfiles apply --yes

mise install

echo "init.sh: done, run 'exec fish' to switch shells"
