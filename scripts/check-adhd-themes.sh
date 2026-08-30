#!/usr/bin/env bash
# check-adhd-themes.sh — guardrail for the recurring kilo/opencode theme
# breakage (the adhd theme keeps falling back to the default palette).
#
# Beliefs enforced (each must hold or this script exits non-zero):
#   1. The adhd theme file exists for BOTH kilo and opencode and is a valid
#      opencode theme JSON (has "$schema", "defs", "theme"). Kilo and
#      opencode silently fall back to their built-in palette when the file
#      is missing or invalid, so the breakage is invisible until the user
#      notices they're not on adhd anymore.
#   2. The TUI config for BOTH tools selects adhd:
#      ~/.config/{kilo,opencode}/tui.json has "theme": "adhd". A valid
#      theme file that isn't selected does nothing — this is the second
#      half of the breakage (e.g. tui.json pointing at "one-light", or
#      kilo's tui.json missing entirely so kilo uses the default).
#
# Exit 0 = both beliefs hold for both tools. Exit 1 = at least one broken;
# every broken location is printed with path + reason before exit.
#
# --tracked-only mode (used by the global pre-commit hook and CI):
#   reads the source files in the dotfiles repo
#   (.config/{kilo,opencode}/{themes/adhd.json,tui.json}) instead of the
#   runtime symlinks, so a change to the tracked theme/tui config is caught
#   before it can be committed and propagated to other machines.
#
# Runtime mode (used by `mise run check-adhd-themes`):
#   reads the live ~/.config/{kilo,opencode}/ paths, catching a symlink
#   that dropped, a tui.json that got overwritten, or a theme file that
#   went invalid on this machine.
#
# Why alert instead of auto-repair: re-selecting the theme is a one-line
# fix the diagnostic prints; silently rewriting user config from a hook is
# worse than telling the user. The [dotfiles] table (mise bootstrap dotfiles
# apply) is the auto-repair path for the symlinks themselves.

set -euo pipefail

# --- args ---
VERBOSE=false
TRACKED_ONLY=false
for arg in "$@"; do
    case "$arg" in
        --verbose|-v) VERBOSE=true ;;
        --tracked-only) TRACKED_ONLY=true ;;
        --help|-h)
            sed -n '2,40p' "$0" | sed 's/^# \?//'
            exit 0
            ;;
        *) echo "unknown arg: $arg" >&2; exit 2 ;;
    esac
done

die() { echo "ERROR: $*" >&2; exit 1; }
log() { [ "$VERBOSE" = true ] && echo "  $*" >&2 || true; }

FAILURES=0

# --- locate the dotfiles repo root (for --tracked-only) ---
DOTFILES_ROOT=""
if [ "$TRACKED_ONLY" = true ]; then
    script_path="$(readlink -f "$0")"
    case "$script_path" in
        */scripts/check-adhd-themes.sh)
            DOTFILES_ROOT="${script_path%/scripts/check-adhd-themes.sh}"
            ;;
        *)
            die "--tracked-only requires the script to live at <dotfiles-root>/scripts/check-adhd-themes.sh; resolved to $script_path"
            ;;
    esac
    log "dotfiles root: $DOTFILES_ROOT"
fi

# --- resolve paths for each tool ---
# In tracked mode, read the repo's copies (source of truth for what ships).
# In runtime mode, read the live ~/.config paths (what kilo/opencode see).
for tool in kilo opencode; do
    if [ "$TRACKED_ONLY" = true ]; then
        theme_path="$DOTFILES_ROOT/.config/$tool/themes/adhd.json"
        tui_path="$DOTFILES_ROOT/.config/$tool/tui.json"
    else
        theme_path="$HOME/.config/$tool/themes/adhd.json"
        tui_path="$HOME/.config/$tool/tui.json"
    fi

    echo "check: $tool adhd theme file + tui selection"

    # --- belief 1: theme file exists and is valid opencode theme JSON ---
    if [ ! -e "$theme_path" ]; then
        echo "  $theme_path: file missing (adhd theme not deployed; run \`mise bootstrap dotfiles apply\`)" >&2
        FAILURES=$((FAILURES + 1))
    else
        if [ "$TRACKED_ONLY" = false ] && [ ! -L "$theme_path" ]; then
            echo "  $theme_path: not a symlink (replaced with a regular file; \`mise bootstrap dotfiles apply\` should restore it)" >&2
            FAILURES=$((FAILURES + 1))
        fi
        if ! jq empty "$theme_path" 2>/dev/null; then
            echo "  $theme_path: not valid JSON: $(jq empty "$theme_path" 2>&1 | head -n 1)" >&2
            FAILURES=$((FAILURES + 1))
        elif ! jq -e '."$schema" and .defs and .theme' "$theme_path" >/dev/null 2>&1; then
            echo "  $theme_path: missing required keys (\$schema, defs, theme)" >&2
            FAILURES=$((FAILURES + 1))
        else
            log "  $theme_path (valid)"
        fi
    fi

    # --- belief 2: tui.json selects adhd ---
    if [ ! -f "$tui_path" ]; then
        echo "  $tui_path: file missing (no TUI config; add one with \"theme\": \"adhd\")" >&2
        FAILURES=$((FAILURES + 1))
    elif ! jq -e '.theme == "adhd"' "$tui_path" >/dev/null 2>&1; then
        current="$(jq -r '.theme // "unset"' "$tui_path" 2>/dev/null || echo "unset")"
        echo "  $tui_path: theme is \"$current\", expected \"adhd\" (edit to {\"theme\":\"adhd\"})" >&2
        FAILURES=$((FAILURES + 1))
    else
        log "  $tui_path (selects adhd)"
    fi
done

# --- summary ---
if [ "$FAILURES" -gt 0 ]; then
    echo "" >&2
    echo "$FAILURES check(s) failed." >&2
    exit 1
fi

echo "all checks passed."