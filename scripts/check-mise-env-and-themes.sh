#!/usr/bin/env bash
# check-mise-env-and-themes.sh — guardrail for two recurring dotfiles breakages.
#
# Beliefs enforced (each must hold or this script exits non-zero):
#   1. Every .env file under $XDG_RUNTIME_DIR/secrets/ parses as dotenv.
#      mise auto-loads that directory when [settings] experimental = true
#      (see src/system/secrets.rs in jdx/mise), and one malformed line
#      aborts the whole file with a "failed to parse dotenv file: ..."
#      error before any tool on PATH runs. The current visible breakage
#      is a stray "A" on line 3 of global.env -- a pass-edit typo that
#      has ridden along for at least one full session.
#
#   2. ~/.config/kilo/themes/adhd.json and ~/.config/opencode/themes/adhd.json
#      are resolvable symlinks pointing to valid JSON files with the keys
#      an opencode theme needs ("$schema", "defs"). Kilo and opencode fall
#      back to their built-in theme silently when the file is missing, so
#      the breakage is invisible until the user notices they're back on a
#      default palette.
#
# Exit 0 = both beliefs hold. Exit 1 = at least one belief broken; every
# broken location is printed with path + line/field before exit so the fix
# is unambiguous.
#
# Why this lives in the dotfiles repo and not as a one-off in ~/.local/bin:
#   - It's wired into a `mise run check-mise-env-and-themes` task in
#     .config/mise/config.toml, so it's runnable from any directory
#     without a per-machine install.
#   - It's also wired into a pre-commit hook (`.pre-commit-config.yaml`)
#     in --tracked-only mode so dotfiles changes can't merge if the
#     tracked theme JSON becomes invalid. --tracked-only skips the env
#     check (the env file isn't in the repo) and the runtime symlink
#     check (those don't exist on a fresh CI runner), and only verifies
#     the tracked theme files under .config/{kilo,opencode}/themes/.
#
# Why it alerts instead of auto-repairing:
#   The env file holds live credentials (auto-repair would mean rewriting
#   secrets); the theme symlink target is in a separate skill repo
#   (auto-repair would mean re-fetching from there). Both fixes need a
#   human, and the diagnostic prints exactly what to do.

set -euo pipefail

# --- args ---
VERBOSE=false
TRACKED_ONLY=false
for arg in "$@"; do
    case "$arg" in
        --verbose|-v) VERBOSE=true ;;
        --tracked-only) TRACKED_ONLY=true ;;
        --help|-h)
            sed -n '2,32p' "$0" | sed 's/^# \?//'
            exit 0
            ;;
        *) echo "unknown arg: $arg" >&2; exit 2 ;;
    esac
done

die() { echo "ERROR: $*" >&2; exit 1; }
log() { [ "$VERBOSE" = true ] && echo "  $*" >&2 || true; }

FAILURES=0

# --- locate the dotfiles repo root (for --tracked-only) ---
# When invoked from the mise task, the script lives at
# $DOTFILES_ROOT/scripts/check-mise-env-and-themes.sh and is also reachable
# as a symlink in ~/.local/bin after `mise bootstrap dotfiles apply`. The
# dotfiles root can be inferred from the script's resolved path either way.
DOTFILES_ROOT=""
if [ "$TRACKED_ONLY" = true ]; then
    script_path="$(readlink -f "$0")"
    case "$script_path" in
        */scripts/check-mise-env-and-themes.sh)
            DOTFILES_ROOT="${script_path%/scripts/check-mise-env-and-themes.sh}"
            ;;
        *)
            die "--tracked-only requires the script to live at <dotfiles-root>/scripts/check-mise-env-and-themes.sh; resolved to $script_path"
            ;;
    esac
    log "dotfiles root: $DOTFILES_ROOT"
fi

# --- check 1: secrets/*.env are valid dotenv ---
if [ "$TRACKED_ONLY" = true ]; then
    log "check 1: skipped (--tracked-only; the runtime env file is not in the dotfiles repo)"
else
    SECRETS_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/secrets"
    echo "check 1: $SECRETS_DIR/*.env parses as dotenv"

    if [ ! -d "$SECRETS_DIR" ]; then
        log "  $SECRETS_DIR does not exist; skipping (secrets not unlocked this session)"
    elif ! compgen -G "$SECRETS_DIR/*.env" > /dev/null; then
        log "  no *.env files in $SECRETS_DIR; skipping"
    else
        # mise uses the dotenvy crate (strings in the binary: dotenvy-0.15.7).
        # A line is valid iff it is blank, a comment (`#`), or
        # `^[A-Za-z_][A-Za-z0-9_]*=`. Quoted values, `export FOO=bar`, and
        # inline comments are all allowed. Anything else is what mise
        # rejects with "Error parsing line: 'X', error at line index: N".
        #
        # We don't shell out to dotenvl (cargo install of dotenv-linter)
        # or attempt to re-parse with mise -- both require a working mise
        # (the very thing this check is gating on when the env file is
        # broken) and add latency. The regex below is the same shape mise
        # accepts, modulo a one-line tolerance for `export ` prefix.
        for env_file in "$SECRETS_DIR"/*.env; do
            [ -f "$env_file" ] || continue
            log "  scanning $env_file"

            line_no=0
            while IFS= read -r line || [ -n "$line" ]; do
                line_no=$((line_no + 1))
                # strip leading whitespace for the validity check
                stripped="${line#"${line%%[![:space:]]*}"}"
                # blank
                [ -z "$stripped" ] && continue
                # comment
                [ "${stripped#\#}" != "$stripped" ] && continue
                # optional `export ` prefix (bash, not posix dotenv, but
                # common in hand-written files and tolerated by mise's
                # dotenvy parse)
                if [ "${stripped#export }" != "$stripped" ]; then
                    stripped="${stripped#export }"
                    stripped="${stripped#"${stripped%%[![:space:]]*}"}"
                fi
                if [[ "$stripped" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
                    continue
                fi
                echo "  $env_file:$line_no: not a valid dotenv line: $(printf '%q' "$line")" >&2
                FAILURES=$((FAILURES + 1))
            done < "$env_file"
        done
    fi
fi

# --- check 2: tracked theme files are valid opencode theme JSON ---
# In default mode, this walks the runtime symlinks
# (~/.config/{kilo,opencode}/themes/adhd.json) and validates the target.
# In --tracked-only mode, the symlinks don't exist on a fresh CI runner
# (they're created by `mise bootstrap dotfiles apply` from the dotfiles
# table), so we read the source files in the dotfiles repo directly. Both
# paths validate the same thing: the JSON is valid, and it has the keys
# ($schema, defs) an opencode theme loader expects.
echo "check 2: adhd theme files are valid opencode theme JSON"

if [ "$TRACKED_ONLY" = true ]; then
    theme_paths=(
        "$DOTFILES_ROOT/.config/kilo/themes/adhd.json"
        "$DOTFILES_ROOT/.config/opencode/themes/adhd.json"
    )
else
    theme_paths=(
        "$HOME/.config/kilo/themes/adhd.json"
        "$HOME/.config/opencode/themes/adhd.json"
    )
fi

for theme_path in "${theme_paths[@]}"; do
    if [ "$TRACKED_ONLY" = false ] && [ ! -L "$theme_path" ]; then
        echo "  $theme_path: not a symlink (file missing or replaced with a regular file)" >&2
        FAILURES=$((FAILURES + 1))
        continue
    fi

    if [ ! -f "$theme_path" ]; then
        echo "  $theme_path: file missing" >&2
        FAILURES=$((FAILURES + 1))
        continue
    fi

    if ! jq empty "$theme_path" 2>/dev/null; then
        echo "  $theme_path: not valid JSON" >&2
        echo "    $(jq empty "$theme_path" 2>&1 | head -n 1)" >&2
        FAILURES=$((FAILURES + 1))
        continue
    fi

    # opencode's theme loader reads "$schema" and "defs" (see opencode's
    # theme.json schema); a file with neither is treated as empty. Both
    # kilo and opencode use the same opencode theme format.
    if ! jq -e '."$schema" and .defs' "$theme_path" >/dev/null 2>&1; then
        echo "  $theme_path: missing required keys (\$schema, defs)" >&2
        FAILURES=$((FAILURES + 1))
        continue
    fi

    log "  $theme_path (valid)"
done

# --- summary ---
if [ "$FAILURES" -gt 0 ]; then
    echo "" >&2
    echo "$FAILURES check(s) failed." >&2
    exit 1
fi

echo "all checks passed."
