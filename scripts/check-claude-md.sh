#!/usr/bin/env bash
# check-claude-md.sh: enforces the "Maintaining this file" budget on a
# CLAUDE.md: at most 50 `##` rules, at most 600 lines total.
#
# Belief enforced: attention is the scarce resource. Past 50 rules or 600
# lines the file stops being read and starts being skimmed, and the rules
# that get skipped are the load-bearing ones. The file says so itself:
# "Ladder, best first: mechanical check, rule here, nothing."
#
# Usage: check-claude-md.sh [path]  (default: ~/.claude/CLAUDE.md)
# Exit 0 = within budget. Exit 1 = over budget, with the offending numbers.
# Also prints the five longest sections so the next cut has a starting point.
#
# This is the gate that holds while the Tier 1 mechanization shrinks the
# file: every new rule must fit the budget or displace something else.

set -euo pipefail

TARGET="${1:-$HOME/.claude/CLAUDE.md}"
MAX_RULES=50
MAX_LINES=600

[ -f "$TARGET" ] || { echo "check-claude-md: $TARGET not found" >&2; exit 1; }

total="$(wc -l < "$TARGET")"
rules="$(grep -c '^## ' "$TARGET" || true)"

fail=0
if [ "$rules" -gt "$MAX_RULES" ]; then
    echo "check-claude-md: FAIL $TARGET has $rules ## rules (budget $MAX_RULES)" >&2
    fail=1
fi
if [ "$total" -gt "$MAX_LINES" ]; then
    echo "check-claude-md: FAIL $TARGET has $total lines (budget $MAX_LINES)" >&2
    fail=1
fi

echo "check-claude-md: $TARGET: $rules rules, $total lines"
echo "check-claude-md: five longest sections:"
awk '/^## /{if (name!="") print count" "name; name=$0; count=0; next} {count++} END{print count" "name}' "$TARGET" \
    | sort -rn | head -n 5 | while read -r count name; do
    echo "check-claude-md:   $count lines: $name"
done

exit "$fail"
