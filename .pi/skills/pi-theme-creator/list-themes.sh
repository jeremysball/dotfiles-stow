#!/bin/bash
# list-themes.sh - List all installed Pi themes

echo "─────────────────────────────────────"
echo "Installed Pi Themes"
echo "─────────────────────────────────────"
echo ""

# Global themes directory
GLOBAL_DIR="$HOME/.pi/agent/themes"
# Current project themes directory
PROJECT_DIR=".pi/themes"

# Function to list themes in a directory
list_themes() {
  local dir="$1"
  local label="$2"

  if [ -d "$dir" ] && [ -n "$(ls -A "$dir"/*.json 2>/dev/null)" ]; then
    echo "$label:"
    for theme in "$dir"/*.json; do
      if [ -f "$theme" ]; then
        name=$(jq -r '.name // "?"' "$theme" 2>/dev/null)
        filename=$(basename "$theme")
        if [ "$name" = "?" ]; then
          printf "  • %s (invalid)\n" "$filename"
        else
          printf "  • %s (%s)\n" "$name" "$filename"
        fi
      fi
    done
    echo ""
  fi
}

list_themes "$GLOBAL_DIR" "Global (~/.pi/agent/themes)"
list_themes "$PROJECT_DIR" "Project (.pi/themes)"

# Built-in themes
echo "Built-in:"
echo "  • dark"
echo "  • light"
echo ""

# Check if jq is available for validation
if command -v jq &> /dev/null; then
  echo "─────────────────────────────────────"
  echo "Use: ./validate-theme.sh <path> to check a theme"
  echo "Use: ./preview-theme.sh <path> to see color tokens"
  echo "─────────────────────────────────────"
else
  echo "─────────────────────────────────────"
  echo "Install jq for theme validation and preview:"
  echo "  apt-get install jq  # Debian/Ubuntu"
  echo "  brew install jq     # macOS"
  echo "─────────────────────────────────────"
fi
