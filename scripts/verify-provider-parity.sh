#!/usr/bin/env bash
# verify-provider-parity.sh — mechanically verifies pi vs opencode provider parity
# via harness porcelain (not config file parsing).
#
# Uses:
#   pi --list-models          — pi's porcelain (table: provider model ...)
#   opencode models           — opencode's porcelain (provider/model per line)
#
# Checks:
#   1. Strict equality for custom providers where we control the full catalog
#      (ollama, cheapestinference, xiaomi-tknplan, meta)
#   2. Banned model check (deepseek-v4-pro family) — must not appear in
#      strict providers; ignored for built-ins where catalog is unavoidable.
#   3. Dead provider check (openai/openai-codex, alibaba-tknplan, opencode-go,
#      minimax) — skipped for parity, warned.
#
# Exit 0 on parity, 1 on drift. Human-readable diff on failure.
# Designed to run in CI (GitHub Actions) and locally.
#
# Usage:
#   scripts/verify-provider-parity.sh
#   scripts/verify-provider-parity.sh --verbose   # show full sets
#   scripts/verify-provider-parity.sh --json      # JSON output for CI

set -euo pipefail

VERBOSE=false
JSON=false
for arg in "$@"; do
  case "$arg" in
    --verbose) VERBOSE=true ;;
    --json) JSON=true ;;
    --help|-h)
      echo "Usage: $0 [--verbose] [--json]"
      echo "  Verifies pi vs opencode provider parity via harness porcelain."
      exit 0
      ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

# --- helpers ---
die() { echo "ERROR: $*" >&2; exit 1; }

# Banned pattern: any model id containing deepseek-v4-pro (pro is dog, per 2026-08-21)
is_banned() {
  local model="$1"
  [[ "$model" == *"deepseek-v4-pro"* ]]
}

# --- collect pi models via porcelain ---
# pi --list-models outputs header + table; provider is $1, model is $2
PI_RAW="$(mktemp)"
OPENCODE_RAW="$(mktemp)"
trap 'rm -f "$PI_RAW" "$OPENCODE_RAW"' EXIT

if ! pi --list-models > "$PI_RAW" 2>&1; then
  cat "$PI_RAW" >&2
  die "pi --list-models failed"
fi

if ! opencode models > "$OPENCODE_RAW" 2>&1; then
  cat "$OPENCODE_RAW" >&2
  die "opencode models failed"
fi

# Parse pi: skip header line (NR>1), extract provider/model, normalize case for MiniMax
# provider names are already lowercased in pi except MiniMax variants; normalize model case-insensitive for comparison
PI_MODELS="$(mktemp)"
OPENCODE_MODELS="$(mktemp)"
trap 'rm -f "$PI_RAW" "$OPENCODE_RAW" "$PI_MODELS" "$OPENCODE_MODELS"' EXIT

# pi: provider/model, lowercased model for case-insensitive compare (MiniMax-M2.5 vs minimax-m2.5)
awk 'NR>1 { provider=$1; model=$2; if (provider!="" && model!="") print provider "/" model }' "$PI_RAW" | sort -u > "$PI_MODELS"
# opencode: already provider/model, keep as-is but lower for compare where needed later
sort -u "$OPENCODE_RAW" > "$OPENCODE_MODELS"

# Normalize to lower for provider/model compare (model ids like MiniMax-M2.5 vary by case)
normalize() { tr '[:upper:]' '[:lower:]' ; }

# --- provider classification ---
STRICT_PROVIDERS=("ollama" "cheapestinference" "xiaomi-tknplan" "meta")
BUILTIN_PROVIDERS=()
# Dead providers: skip parity, just warn if present
DEAD_PROVIDERS=("openai" "openai-codex" "alibaba-tknplan" "opencode-go" "minimax")

# Track failures
FAILURES=()
WARNINGS=()

check_strict() {
  local provider="$1"
  # Extract models for this provider from both harnesses, normalize, exclude banned for strict check
  local pi_set op_set
  pi_set="$(grep -i "^${provider}/" "$PI_MODELS" | normalize | sort -u || true)"
  op_set="$(grep -i "^${provider}/" "$OPENCODE_MODELS" | normalize | sort -u || true)"

  # Filter banned for strict providers: they must not appear at all
  local pi_banned op_banned
  pi_banned="$(echo "$pi_set" | grep -i "deepseek-v4-pro" || true)"
  op_banned="$(echo "$op_set" | grep -i "deepseek-v4-pro" || true)"
  if [[ -n "$pi_banned" ]]; then
    FAILURES+=("BANNED: $provider pi has banned pro models: $pi_banned")
  fi
  if [[ -n "$op_banned" ]]; then
    FAILURES+=("BANNED: $provider opencode has banned pro models: $op_banned")
  fi
  # For parity, exclude banned from comparison (so strict providers after removing banned should be equal)
  pi_set="$(echo "$pi_set" | grep -vi "deepseek-v4-pro" || true)"
  op_set="$(echo "$op_set" | grep -vi "deepseek-v4-pro" || true)"

  # Strict providers must have at least 1 model (ensures custom config was loaded, not just default catalog)
  local pi_count op_count
  pi_count="$(echo "$pi_set" | grep -c . || true)"
  op_count="$(echo "$op_set" | grep -c . || true)"
  # Handle empty string case: grep -c on empty still outputs 0 but we need to handle
  if [[ -z "$pi_set" ]]; then pi_count=0; fi
  if [[ -z "$op_set" ]]; then op_count=0; fi
  if [[ "$pi_count" -eq 0 && "$op_count" -eq 0 ]]; then
    # In CI the runner has no private configs/auth — don't fail, just warn
    if [[ "${GITHUB_ACTIONS:-}" == "true" || "${CI:-}" == "true" ]]; then
      WARNINGS+=("MISSING: $provider has 0 models in both harnesses (CI without private configs — skipped strict check)")
    else
      FAILURES+=("MISSING: $provider has 0 models in both harnesses — custom config not loaded (expected at least 1). Check ~/.pi/agent/extensions and ~/.config/opencode/opencode.jsonc are installed.")
    fi
    return
  elif [[ "${GITHUB_ACTIONS:-}" == "true" && "$pi_count" -eq 0 ]] || [[ "${GITHUB_ACTIONS:-}" == "true" && "$op_count" -eq 0 ]]; then
    WARNINGS+=("SKIP: $provider pi:$pi_count opencode:$op_count (CI without full private configs — strict parity skipped)")
    return
  elif [[ "$pi_set" != "$op_set" ]]; then
    local diff_out
    diff_out="$(diff -u <(echo "$pi_set") <(echo "$op_set") || true)"
    FAILURES+=("DRIFT: $provider strict parity failed (pi $pi_count vs opencode $op_count)
pi only:
$(comm -23 <(echo "$pi_set") <(echo "$op_set") | head -20)
opencode only:
$(comm -13 <(echo "$pi_set") <(echo "$op_set") | head -20)")
    if [[ "$VERBOSE" == true ]]; then
      echo "--- $provider pi ---" >&2
      echo "$pi_set" >&2
      echo "--- $provider opencode ---" >&2
      echo "$op_set" >&2
      echo "--- diff ---" >&2
      echo "$diff_out" >&2
    fi
  else
    if [[ "$VERBOSE" == true ]]; then
      echo "OK $provider: $pi_count models, parity" >&2
    fi
  fi
}

check_builtin_subset() {
  local provider="$1"
  local pi_set op_set
  pi_set="$(grep -i "^${provider}/" "$PI_MODELS" | normalize | grep -vi "deepseek-v4-pro" | sort -u || true)"
  op_set="$(grep -i "^${provider}/" "$OPENCODE_MODELS" | normalize | grep -vi "deepseek-v4-pro" | sort -u || true)"

  if [[ -z "$pi_set" ]]; then
    WARNINGS+=("WARN: $provider pi has no models listed (may be catalog sync issue)")
    return
  fi
  if [[ -z "$op_set" ]]; then
    WARNINGS+=("WARN: $provider opencode has no models listed")
    return
  fi

  # For built-in, require that every pi model exists in opencode (fleet subset)
  local missing_in_opencode
  missing_in_opencode="$(comm -23 <(echo "$pi_set") <(echo "$op_set") || true)"
  # Remove expected superset extras that are built-in but not in pi fleet - we only care about missing_in_opencode
  # But also check if opencode's fleet models missing in pi (maybe pi missing something we dispatch)
  local missing_in_pi
  missing_in_pi=""
  # For opencode-go, define dispatched fleet as pi's set; for minimax, pi's 3 should be subset
  # We only flag missing_in_pi if it's part of our explicit dispatched fleet (hard to know exact fleet)
  # Simplify: for builtin, just ensure pi subset present in opencode; extra opencode models are OK (superset)
  if [[ -n "$missing_in_opencode" ]]; then
    FAILURES+=("DRIFT: $provider builtin subset failed — pi models missing in opencode:
$missing_in_opencode")
  else
    if [[ "$VERBOSE" == true ]]; then
      echo "OK $provider: pi $(echo "$pi_set" | wc -l | tr -d ' ') models subset of opencode $(echo "$op_set" | wc -l | tr -d ' ') (superset allowed)" >&2
    fi
  fi
}

# --- run checks ---
for p in "${STRICT_PROVIDERS[@]}"; do
  check_strict "$p"
done

for p in "${BUILTIN_PROVIDERS[@]}"; do
  check_builtin_subset "$p"
done

# Dead providers: just note, don't fail
for p in "${DEAD_PROVIDERS[@]}"; do
  # Use awk to avoid grep exit 1 + pipefail with set -e (grep returns 1 when no match)
  pi_dead="$(awk -v pat="^${p}/" 'BEGIN{c=0} tolower($0) ~ tolower(pat) {c++} END{print c}' "$PI_MODELS")"
  op_dead="$(awk -v pat="^${p}/" 'BEGIN{c=0} tolower($0) ~ tolower(pat) {c++} END{print c}' "$OPENCODE_MODELS")"
  if [[ "$pi_dead" -gt 0 || "$op_dead" -gt 0 ]]; then
    WARNINGS+=("DEAD: $p present pi:$pi_dead opencode:$op_dead (sub dead 2026-08-22, ignored for parity)")
  fi
done

# --- output ---
if [[ "$JSON" == true ]]; then
  # Minimal JSON for CI consumption
  cat <<EOF
{
  "failures": $(printf '%s\n' "${FAILURES[@]}" | jq -R . | jq -s . 2>/dev/null || echo '[]'),
  "warnings": $(printf '%s\n' "${WARNINGS[@]}" | jq -R . | jq -s . 2>/dev/null || echo '[]'),
  "pi_total": $(wc -l < "$PI_MODELS" | tr -d ' '),
  "opencode_total": $(wc -l < "$OPENCODE_MODELS" | tr -d ' ')
}
EOF
else
  if [[ ${#WARNINGS[@]} -gt 0 ]]; then
    echo "Warnings:" >&2
    for w in "${WARNINGS[@]}"; do echo "  - $w" >&2; done
  fi
  if [[ ${#FAILURES[@]} -gt 0 ]]; then
    echo "Failures:" >&2
    for f in "${FAILURES[@]}"; do echo "  - $f" >&2; echo >&2; done
    echo "Provider counts:" >&2
    echo "  pi total: $(wc -l < "$PI_MODELS" | tr -d ' ') models" >&2
    echo "  opencode total: $(wc -l < "$OPENCODE_MODELS" | tr -d ' ') models" >&2
    echo >&2
    echo "HINT: pi and opencode configs must stay in sync:" >&2
    echo "  pi: ~/.pi/agent/extensions/*.js + ~/.pi/agent/settings.json" >&2
    echo "  opencode: ~/.config/opencode/opencode.jsonc" >&2
    echo "  Run with --verbose for full sets, --json for CI" >&2
    exit 1
  else
    echo "provider parity: OK"
    if [[ ${#WARNINGS[@]} -gt 0 ]]; then
      echo "warnings: ${#WARNINGS[@]} (dead providers ignored)" >&2
    fi
    echo "  strict providers checked: ${STRICT_PROVIDERS[*]}" >&2
    echo "  builtin providers checked (subset): ${BUILTIN_PROVIDERS[*]}" >&2
    echo "  dead providers ignored: ${DEAD_PROVIDERS[*]}" >&2
    echo "  banned pro excluded from parity (but checked for strict providers)" >&2
  fi
fi
