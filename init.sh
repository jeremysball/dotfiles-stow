#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

stow --no-folding --target="$HOME" --dir="$REPO_DIR" fish mise nvim

if command -v mise > /dev/null 2>&1; then
    mise install
else
    echo "init.sh: mise not installed yet, run 'mise install' after installing it" >&2
fi

echo "init.sh: done, run 'exec fish' to switch shells"
