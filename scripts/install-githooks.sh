#!/usr/bin/env bash
# install-githooks.sh <repo-path>...
#
# Wires a repo's .githooks/ so the global gates in ~/.config/git/hooks run
# even though the repo sets its own core.hooksPath.
#
# The problem this fixes: core.hooksPath is single-valued and repo-local
# config beats global config, with no merging. A repo that sets
# `core.hooksPath = .githooks` for portability (so a contributor's bare
# clone still gets hooks) silently disables every global hook on this
# machine. Measured 2026-09-01: sixteen repos set the local override and
# not one of them carried the global em-dash gate, so that gate had never
# fired on a commit in any of them.
#
# The fix is a shim. .githooks/<hook> becomes a two-step dispatcher:
#   1. run the global hook of the same name, if this machine has one
#   2. run the repo's own hook, moved aside to .githooks/<hook>.local
# A contributor without dotfiles skips step 1 and still gets step 2.
#
# GIT_HOOKS_CHAINED guards against a loop: the global pre-commit chains
# down to .githooks/<hook> itself, and would otherwise re-enter the shim.
#
# Idempotent. Re-running on an already-shimmed repo replaces the shim and
# leaves .local alone.

set -euo pipefail

HOOKS="pre-commit pre-push"
GLOBAL_HOOKS="${XDG_CONFIG_HOME:-$HOME/.config}/git/hooks"

die() { echo "install-githooks: $*" >&2; exit 1; }

SHIM_MARKER="# install-githooks-shim: v1"
is_shim() { [ -f "$1" ] && grep -qxF "$SHIM_MARKER" "$1" 2>/dev/null; }

write_shim() {
  cat > "$1" <<'SHIMEOF'
#!/usr/bin/env bash
# install-githooks-shim: v1
# Managed by `mise run install-githooks`. Do not edit.
# Repo-specific checks belong in the .local file this dispatches to.
set -euo pipefail

hook_name="$(basename "$0")"
repo_root="$(git rev-parse --show-toplevel)"
global_hook="${XDG_CONFIG_HOME:-$HOME/.config}/git/hooks/$hook_name"

# 1. global gates (em dash, worktree budget, ...), when dotfiles are applied.
#    Skipped when the global hook is what invoked us, so we do not loop.
if [ -z "${GIT_HOOKS_CHAINED:-}" ] && [ -x "$global_hook" ]; then
  GIT_HOOKS_CHAINED=1 "$global_hook" "$@"
fi

# 2. this repo's own checks, if it has any.
local_hook="$repo_root/.githooks/$hook_name.local"
alt_hook="$repo_root/hooks/$hook_name"
if [ -x "$local_hook" ]; then
  exec "$local_hook" "$@"
elif [ -f "$local_hook" ]; then
  exec bash "$local_hook" "$@"
elif [ -x "$alt_hook" ]; then
  exec "$alt_hook" "$@"
elif [ -f "$alt_hook" ]; then
  exec bash "$alt_hook" "$@"
fi
SHIMEOF
  chmod +x "$1"
}

install_one() {
  local repo="$1" root primary
  root="$(git -C "$repo" rev-parse --show-toplevel 2>/dev/null)" \
    || die "$repo is not a git repository"

  # core.hooksPath is repo-wide config, not per-worktree: a `git config` run
  # from a linked worktree writes to the shared config every worktree reads.
  # $root is the worktree we are installing shims into, which is the right
  # place for the files but the wrong path to record: writing it would
  # point the primary checkout (and every sibling worktree) at a directory
  # that disappears when this worktree is removed. Record the primary
  # checkout instead. Same value whether this runs from the primary checkout
  # or a worktree of it.
  primary="$(dirname "$(git -C "$repo" rev-parse --path-format=absolute --git-common-dir)")"

  mkdir -p "$root/.githooks"

  local installed=0 kept=0
  for hook in $HOOKS; do
    local target="$root/.githooks/$hook"

    # A pre-existing repo hook that is not already our shim gets moved aside
    # rather than overwritten, so no repo loses its own checks.
    if [ -e "$target" ] && ! is_shim "$target"; then
      if [ -e "$target.local" ]; then
        die "$root/.githooks/$hook.local already exists; resolve by hand"
      fi
      rel="${target#"$root"/}"
      if git -C "$root" ls-files --error-unmatch "$rel" >/dev/null 2>&1; then
        git -C "$root" mv "$rel" "$rel.local"
      else
        mv "$target" "$target.local"
      fi
      chmod +x "$target.local"
      kept=$((kept + 1))
    fi

    # Only install a shim where there is something for it to dispatch to:
    # the repo's own hook, or a global hook of that name.
    if [ -e "$target.local" ] || [ -x "$GLOBAL_HOOKS/$hook" ]; then
      write_shim "$target"
      installed=$((installed + 1))
    fi
  done

  # Always relative, even where the repo previously recorded an absolute
  # path. Git resolves a relative hooksPath per-worktree, so each worktree
  # runs its own .githooks; an absolute one pins every worktree to the
  # primary checkout's files. That difference is not cosmetic here. All work
  # in this setup happens in linked worktrees, so under an absolute path a
  # worktree that has the shim still commits through the primary checkout's
  # unshimmed hook, and the global gates never fire where the commits are
  # actually made. Verified 2026-09-03 on a scratch repo: identical shims,
  # em dash blocked under `.githooks`, committed clean under the absolute
  # form. The value is untracked local config, so rewriting it strands
  # nothing.
  git -C "$primary" config core.hooksPath .githooks

  echo "install-githooks: $root ($installed shim(s), $kept repo hook(s) preserved as .local)"
}

if [ $# -eq 0 ]; then
  install_one "."
else
  for repo in "$@"; do install_one "$repo"; done
fi
