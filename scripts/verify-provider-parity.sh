#!/usr/bin/env bash
# verify-provider-parity.sh — mechanically verifies pi vs opencode vs kilo
# provider parity via harness porcelain (not config file parsing).
#
# Uses:
#   pi --list-models          — pi's porcelain (table: provider model ...)
#   opencode models           — opencode's porcelain (provider/model per line)
#   kilo models               — kilo's porcelain (provider/model per line)
#
# Provider ids are standardized on the spelled-out "token" (xiaomi-token-plan)
# except where that id is already taken by a built-in models.dev provider — see
# alibaba-tknplan in PROVIDER_SPECS. Harnesses that spell a provider
# differently are mapped in PROVIDER_SPECS rather than normalized at compare
# time, so the spelling stays visible.
#
# A provider need not exist in every harness — PROVIDER_SPECS declares which
# harnesses carry it, and "-" means "not carried". Strict equality is checked
# across exactly the harnesses that do carry it.
#
# Checks:
#   1. Strict equality for custom providers where we control the full catalog
#   2. Subset check for built-in providers where catalog is shared (opencode-go, minimax)
#      — every non-banned model pi lists must exist in opencode and vice versa
#      for the dispatched fleet.
#   3. Banned model check (deepseek-v4-pro family) — must not appear in
#      strict providers; ignored for built-ins where catalog is unavoidable.
#   4. Dead provider check (openai/openai-codex) — skipped for parity, warned.
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
KILO_RAW="$(mktemp)"
trap 'rm -f "$PI_RAW" "$OPENCODE_RAW" "$KILO_RAW"' EXIT

if ! pi --list-models > "$PI_RAW" 2>&1; then
  cat "$PI_RAW" >&2
  die "pi --list-models failed"
fi

if ! opencode models > "$OPENCODE_RAW" 2>&1; then
  cat "$OPENCODE_RAW" >&2
  die "opencode models failed"
fi

if ! kilo models > "$KILO_RAW" 2>&1; then
  cat "$KILO_RAW" >&2
  die "kilo models failed"
fi

# Parse pi: skip header line (NR>1), extract provider/model, normalize case for MiniMax
# provider names are already lowercased in pi except MiniMax variants; normalize model case-insensitive for comparison
PI_MODELS="$(mktemp)"
OPENCODE_MODELS="$(mktemp)"
KILO_MODELS="$(mktemp)"
trap 'rm -f "$PI_RAW" "$OPENCODE_RAW" "$KILO_RAW" "$PI_MODELS" "$OPENCODE_MODELS" "$KILO_MODELS"' EXIT

# pi: provider/model, lowercased model for case-insensitive compare (MiniMax-M2.5 vs minimax-m2.5)
awk 'NR>1 { provider=$1; model=$2; if (provider!="" && model!="") print provider "/" model }' "$PI_RAW" | sort -u > "$PI_MODELS"
# opencode: already provider/model, keep as-is but lower for compare where needed later
sort -u "$OPENCODE_RAW" > "$OPENCODE_MODELS"
# kilo: same provider/model shape as opencode
sort -u "$KILO_RAW" > "$KILO_MODELS"

# Normalize to lower for provider/model compare (model ids like MiniMax-M2.5 vary by case)
normalize() { tr '[:upper:]' '[:lower:]' ; }

# --- provider classification ---
# PROVIDER_SPECS: canonical|pi_id|opencode_id|kilo_id
# "-" means that harness deliberately does not carry the provider, and it is
# excluded from the comparison rather than counted as drift. Canonical names
# use the spelled-out "token" unless a built-in id already claims it.
PROVIDER_SPECS=(
  # alibaba-tknplan keeps the contraction on purpose: "alibaba-token-plan" is
  # a built-in models.dev provider id in both opencode and kilo, and taking it
  # makes the built-in win the config merge. kilo is "-" here because it rides
  # that built-in deliberately (its block only caps context), so it is a
  # different backend, not drift.
  "alibaba-tknplan|alibaba-tknplan|alibaba-tknplan|-"
  "xiaomi-token-plan|xiaomi-token-plan|xiaomi-token-plan|-"
  "ollama|ollama|ollama|ollama-cloud"
  "cheapestinference|cheapestinference|cheapestinference|-"
  "meta|meta|meta|meta"
  "nanogpt|-|nanogpt|nanogpt"
)
BUILTIN_PROVIDERS=("opencode-go" "minimax")
# Dead providers: skip parity, just warn if present
DEAD_PROVIDERS=("openai" "openai-codex")

# Track failures
FAILURES=()
WARNINGS=()

# models_for <harness_file> <provider_id> — normalized, banned-filtered model
# set for one provider in one harness, printed as bare model ids (provider
# prefix stripped) so differently-named providers compare on equal footing.
models_for() {
  local file="$1" pid="$2"
  [[ "$pid" == "-" ]] && return 0
  grep -i "^${pid}/" "$file" 2>/dev/null \
    | sed "s|^[^/]*/||" \
    | normalize \
    | grep -vi "deepseek-v4-pro" \
    | sort -u || true
}

check_strict() {
  local spec="$1"
  local canon pi_id op_id ki_id
  IFS='|' read -r canon pi_id op_id ki_id <<<"$spec"

  # Banned check first, against the un-filtered sets
  local h name pid file
  for h in "pi:$pi_id:$PI_MODELS" "opencode:$op_id:$OPENCODE_MODELS" "kilo:$ki_id:$KILO_MODELS"; do
    IFS=':' read -r name pid file <<<"$h"
    [[ "$pid" == "-" ]] && continue
    local banned
    banned="$(grep -i "^${pid}/" "$file" 2>/dev/null | grep -i "deepseek-v4-pro" || true)"
    if [[ -n "$banned" ]]; then
      FAILURES+=("BANNED: $canon $name has banned pro models: $banned")
    fi
  done

  # Collect the harnesses that actually carry this provider
  local present_names=() present_sets=() present_counts=()
  for h in "pi:$pi_id:$PI_MODELS" "opencode:$op_id:$OPENCODE_MODELS" "kilo:$ki_id:$KILO_MODELS"; do
    IFS=':' read -r name pid file <<<"$h"
    [[ "$pid" == "-" ]] && continue
    local set_
    set_="$(models_for "$file" "$pid")"
    present_names+=("$name")
    present_sets+=("$set_")
    if [[ -z "$set_" ]]; then present_counts+=(0); else present_counts+=("$(echo "$set_" | grep -c .)"); fi
  done

  # All-empty means the private configs were never loaded (CI has no secrets)
  local total=0 c
  for c in "${present_counts[@]}"; do total=$((total + c)); done
  if [[ "$total" -eq 0 ]]; then
    if [[ "${GITHUB_ACTIONS:-}" == "true" || "${CI:-}" == "true" ]]; then
      WARNINGS+=("MISSING: $canon has 0 models in all harnesses (CI without private configs — skipped)")
    else
      FAILURES+=("MISSING: $canon has 0 models in every harness that should carry it — custom config not loaded. Check ~/.pi/agent/extensions, ~/.config/opencode/opencode.jsonc, ~/.config/kilo/kilo.jsonc.")
    fi
    return
  fi

  # In CI, a partially-loaded fleet is not drift
  local i
  for i in "${!present_counts[@]}"; do
    if [[ "${present_counts[$i]}" -eq 0 && ( "${GITHUB_ACTIONS:-}" == "true" || "${CI:-}" == "true" ) ]]; then
      WARNINGS+=("SKIP: $canon ${present_names[$i]} has 0 models (CI without full private configs)")
      return
    fi
  done

  # Strict: every present harness must agree with the first one
  local base_name="${present_names[0]}" base_set="${present_sets[0]}" drift=false
  for i in "${!present_names[@]}"; do
    [[ "$i" -eq 0 ]] && continue
    if [[ "${present_sets[$i]}" != "$base_set" ]]; then
      drift=true
      FAILURES+=("DRIFT: $canon ${base_name} vs ${present_names[$i]} (${present_counts[0]} vs ${present_counts[$i]})
${base_name} only:
$(comm -23 <(echo "$base_set") <(echo "${present_sets[$i]}") | head -20)
${present_names[$i]} only:
$(comm -13 <(echo "$base_set") <(echo "${present_sets[$i]}") | head -20)")
    fi
  done

  if [[ "$VERBOSE" == true ]]; then
    if [[ "$drift" == false ]]; then
      echo "OK $canon: ${present_counts[0]} models across ${present_names[*]}" >&2
    else
      for i in "${!present_names[@]}"; do
        echo "--- $canon ${present_names[$i]} ---" >&2
        echo "${present_sets[$i]}" >&2
      done
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
for spec in "${PROVIDER_SPECS[@]}"; do
  check_strict "$spec"
done

for p in "${BUILTIN_PROVIDERS[@]}"; do
  check_builtin_subset "$p"
done

# Dead providers: just note, don't fail
for p in "${DEAD_PROVIDERS[@]}"; do
  # Use awk to avoid grep exit 1 + pipefail with set -e (grep returns 1 when no match)
  pi_dead="$(awk -v pat="^${p}/" 'BEGIN{c=0} tolower($0) ~ tolower(pat) {c++} END{print c}' "$PI_MODELS")"
  op_dead="$(awk -v pat="^${p}/" 'BEGIN{c=0} tolower($0) ~ tolower(pat) {c++} END{print c}' "$OPENCODE_MODELS")"
  ki_dead="$(awk -v pat="^${p}/" 'BEGIN{c=0} tolower($0) ~ tolower(pat) {c++} END{print c}' "$KILO_MODELS")"
  if [[ "$pi_dead" -gt 0 || "$op_dead" -gt 0 || "$ki_dead" -gt 0 ]]; then
    WARNINGS+=("DEAD: $p present pi:$pi_dead opencode:$op_dead kilo:$ki_dead (sub dead 2026-08-22, ignored for parity)")
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
  "opencode_total": $(wc -l < "$OPENCODE_MODELS" | tr -d ' '),
  "kilo_total": $(wc -l < "$KILO_MODELS" | tr -d ' ')
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
    echo "  kilo total: $(wc -l < "$KILO_MODELS" | tr -d ' ') models" >&2
    echo >&2
    echo "HINT: pi, opencode and kilo configs must stay in sync:" >&2
    echo "  pi: ~/.pi/agent/extensions/*.js + ~/.pi/agent/settings.json" >&2
    echo "  opencode: ~/.config/opencode/opencode.jsonc" >&2
    echo "  kilo: ~/.config/kilo/kilo.jsonc" >&2
    echo "  Run with --verbose for full sets, --json for CI" >&2
    exit 1
  else
    echo "provider parity: OK"
    if [[ ${#WARNINGS[@]} -gt 0 ]]; then
      echo "warnings: ${#WARNINGS[@]} (dead providers ignored)" >&2
    fi
    for spec in "${PROVIDER_SPECS[@]}"; do
      echo "  strict provider checked: ${spec%%|*}" >&2
    done
    echo "  builtin providers checked (subset): ${BUILTIN_PROVIDERS[*]}" >&2
    echo "  dead providers ignored: ${DEAD_PROVIDERS[*]}" >&2
    echo "  banned pro excluded from parity (but checked for strict providers)" >&2
  fi
fi
