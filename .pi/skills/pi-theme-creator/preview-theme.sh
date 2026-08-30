#!/bin/bash
set -e

# preview-theme.sh - Show color swatches and token info for a Pi theme
# Usage: ./preview-theme.sh <path-to-theme.json>

if [ -z "$1" ]; then
  echo "Usage: $0 <path-to-theme.json>"
  echo "Example: $0 ~/.pi/agent/themes/my-theme.json"
  exit 1
fi

THEME_FILE="$1"

# Check if file exists
if [ ! -f "$THEME_FILE" ]; then
  echo "✗ Error: Theme file not found: $THEME_FILE"
  exit 1
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
  echo "✗ Error: jq is required for theme preview."
  echo "  Install with: apt-get install jq (Debian/Ubuntu)"
  echo "              or: brew install jq (macOS)"
  exit 1
fi

THEME_NAME=$(jq -r '.name' "$THEME_FILE")
echo "Theme: $THEME_NAME"
echo "File: $THEME_FILE"
echo ""

# Function to resolve color value
resolve_color() {
  local value="$1"
  local vars="$2"

  # Empty string - terminal default
  if [ "$value" = "" ]; then
    echo "default"
    return
  fi

  # 256-color number
  if [[ "$value" =~ ^[0-9]+$ ]]; then
    echo "256-color: $value"
    return
  fi

  # Check if it's a variable reference
  if [ "$vars" != "null" ]; then
    local resolved=$(echo "$vars" | jq -r ".\"${value}\" // empty" 2>/dev/null)
    if [ -n "$resolved" ]; then
      echo "$value → $resolved"
      return
    fi
  fi

  # Direct hex or other value
  echo "$value"
}

# Get vars
VARS=$(jq '.vars // {}' "$THEME_FILE")

# Display vars section if it exists
if [ "$VARS" != "null" ] && [ "$(echo "$VARS" | jq 'length')" -gt 0 ]; then
  echo "─────────────────────────────────────"
  echo "VARS (reusable colors)"
  echo "─────────────────────────────────────"
  echo "$VARS" | jq -r 'to_entries[] | "  \(.key): \(.value)"'
  echo ""
fi

# Color categories and their tokens
declare -A CATEGORIES=(
  ["Core UI"]="accent border borderAccent borderMuted success error warning muted dim text thinkingText"
  ["Backgrounds"]="selectedBg userMessageBg userMessageText customMessageBg customMessageText customMessageLabel toolPendingBg toolSuccessBg toolErrorBg toolTitle toolOutput"
  ["Markdown"]="mdHeading mdLink mdLinkUrl mdCode mdCodeBlock mdCodeBlockBorder mdQuote mdQuoteBorder mdHr mdListBullet"
  ["Tool Diffs"]="toolDiffAdded toolDiffRemoved toolDiffContext"
  ["Syntax"]="syntaxComment syntaxKeyword syntaxFunction syntaxVariable syntaxString syntaxNumber syntaxType syntaxOperator syntaxPunctuation"
  ["Thinking Levels"]="thinkingOff thinkingMinimal thinkingLow thinkingMedium thinkingHigh thinkingXhigh"
  ["Other"]="bashMode"
)

for category in "${!CATEGORIES[@]}"; do
  echo "─────────────────────────────────────"
  echo "$category"
  echo "─────────────────────────────────────"
  for token in ${CATEGORIES[$category]}; do
    value=$(jq -r ".colors.\"${token}\" // empty" "$THEME_FILE")
    if [ -n "$value" ]; then
      resolved=$(resolve_color "$value" "$VARS")
      printf "  %-20s %s\n" "$token:" "$resolved"
    else
      printf "  %-20s %s\n" "$token:" "⚠ MISSING"
    fi
  done
  echo ""
done

# Display export section if it exists
if jq -e '.export' "$THEME_FILE" > /dev/null 2>&1; then
  echo "─────────────────────────────────────"
  echo "EXPORT (HTML output)"
  echo "─────────────────────────────────────"
  jq -r '.export | to_entries[] | "  \(.key): \(.value)"' "$THEME_FILE"
  echo ""
fi

echo "─────────────────────────────────────"
echo "Use these color references when:"
echo "  - Designing color harmonies"
echo "  - Ensuring contrast ratios"
echo "  - Debugging display issues"
echo "─────────────────────────────────────"
