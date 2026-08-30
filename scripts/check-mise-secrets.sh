#!/usr/bin/env bash
# check-mise-secrets.sh — verifies the mise auto-loaded secrets env files
# parse as dotenv.
#
# Belief enforced: every .env under $XDG_RUNTIME_DIR/secrets/ parses as
# dotenv. When [settings] experimental = true, mise auto-loads that whole
# directory (src/system/secrets.rs in jdx/mise), and ONE malformed line
# aborts the file with "failed to parse dotenv file: ..." before any tool
# on PATH runs. The visible breakage that motivated this: a stray "A" on
# line 3 of global.env, a pass-edit typo that crashed every mise command.
#
# Exit 0 = all *.env parse. Exit 1 = at least one bad line; each broken
# file:line is printed before exit. Missing secrets dir / no *.env is a
# pass (secrets simply not unlocked this session), not a failure.
#
# This is runtime-only (the secrets dir isn't in the dotfiles repo), so it
# has no --tracked-only mode. The real prevention for the pass-edit typo
# lives in secrets-unlock (validate before writing the runtime file); this
# script is the standing backstop for anything that slips past it.

set -euo pipefail

VERBOSE=false
for arg in "$@"; do
    case "$arg" in
        --verbose|-v) VERBOSE=true ;;
        --help|-h)
            sed -n '2,22p' "$0" | sed 's/^# \?//'
            exit 0
            ;;
        *) echo "unknown arg: $arg" >&2; exit 2 ;;
    esac
done

die() { echo "ERROR: $*" >&2; exit 1; }
log() { [ "$VERBOSE" = true ] && echo "  $*" >&2 || true; }

SECRETS_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/secrets"
echo "check: $SECRETS_DIR/*.env parses as dotenv"

if [ ! -d "$SECRETS_DIR" ]; then
    log "  $SECRETS_DIR does not exist; skipping (secrets not unlocked this session)"
    echo "all checks passed."
    exit 0
fi
if ! compgen -G "$SECRETS_DIR/*.env" > /dev/null; then
    log "  no *.env files in $SECRETS_DIR; skipping"
    echo "all checks passed."
    exit 0
fi

# mise uses the dotenvy crate (strings in the binary: dotenvy-0.15.7). A
# line is valid iff it is blank, a comment (`#`), or `^[A-Za-z_][A-Za-z0-9_]*=`.
# Quoted values, `export FOO=bar`, and inline comments are allowed; anything
# else is what mise rejects. We don't shell out to a dotenv linter or try to
# re-parse with mise (both need the very thing this check gates on when the
# env file is broken); the regex is the same shape mise accepts.
FAILURES=0
for env_file in "$SECRETS_DIR"/*.env; do
    [ -f "$env_file" ] || continue
    log "  scanning $env_file"

    line_no=0
    while IFS= read -r line || [ -n "$line" ]; do
        line_no=$((line_no + 1))
        stripped="${line#"${line%%[![:space:]]*}"}"
        [ -z "$stripped" ] && continue
        [ "${stripped#\#}" != "$stripped" ] && continue
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

if [ "$FAILURES" -gt 0 ]; then
    echo "" >&2
    echo "$FAILURES line(s) failed. Fix the source (pass edit <entry>), then re-run secrets-unlock." >&2
    exit 1
fi

echo "all checks passed."