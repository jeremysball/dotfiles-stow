#!/usr/bin/env bash
# refresh-state.sh — regenerate state.md from the on-disk plugin cache.
#
# Self-locates: state.md is written next to this script, regardless of cwd.
# Run from anywhere: `bash ~/.pi/agent/skills/finding-managed-cc-skills/refresh-state.sh`
#
# The procedure:
#   1. Find every SKILL.md under ~/.claude/plugins/cache/*/*/skills/*/SKILL.md
#   2. Extract name + description from the YAML frontmatter
#   3. For each (plugin, skill-name), pick the newest version by SKILL.md mtime
#   4. Write the resulting map to state.md (auto-generated; do not hand-edit)
#
# Idempotent. Cheap to run repeatedly.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STATE="$SCRIPT_DIR/state.md"
CACHE="${HOME}/.claude/plugins/cache"

{
  echo "# Managed CC Skills — state"
  echo
  echo "_Auto-generated. Do not hand-edit. Regenerate via refresh-state.sh in SKILL.md._"
  echo
  echo "_Refreshed: $(date -u +%Y-%m-%dT%H:%MZ)_"
  echo
  echo "| Skill | Description | Plugin | Version | Path | Resolved |"
  echo "|-------|-------------|--------|---------|------|----------|"

  tmp="$(mktemp)"
  # shellcheck disable=SC2044
  for path in $(find "$CACHE" -mindepth 5 -maxdepth 7 -path '*/skills/*/SKILL.md' 2>/dev/null); do
    name="$(awk '/^name:/{print $2; exit}' "$path")"
    desc="$(awk '/^description:/{$1=""; sub(/^[ \t]+/, ""); print; exit}' "$path")"
    rel="${path#$CACHE/}"
    plugin="$(echo "$rel" | cut -d/ -f1)"
    version="$(echo "$rel" | cut -d/ -f2)"
    mtime="$(stat -c %Y "$path")"
    esc_desc="$(printf '%s' "$desc" | sed 's/|/\\|/g')"
    printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
      "$mtime" "$name" "$esc_desc" "$plugin" "$version" "$path" >> "$tmp"
  done

  # Newest mtime wins per skill name. Sort by skill name asc, then mtime desc;
  # awk emits the first row per skill (the newest).
  sort -t'	' -k2,2 -k1,1nr "$tmp" \
    | awk -F'	' '!seen[$2]++' \
    | while IFS='	' read -r mtime name desc plugin version path; do
        ts="$(date -u -d "@$mtime" +%Y-%m-%dT%H:%MZ)"
        printf '| %s | %s | %s | %s | %s | %s |\n' \
          "$name" "$desc" "$plugin" "$version" "$path" "$ts"
      done

  rm -f "$tmp"
} > "$STATE.tmp" && mv "$STATE.tmp" "$STATE"

echo "Wrote $STATE ($(grep -c '^| ' "$STATE") rows)"