#!/bin/bash
set -e

# install-template.sh - Copy a theme template to the Pi themes directory
# Usage: ./install-template.sh <template-name>
#
# Available templates: catppuccin-mocha, gruvbox-dark, nord

if [ -z "$1" ]; then
  echo "Usage: $0 <template-name>"
  echo ""
  echo "Available templates:"
  echo "  catppuccin-mocha  - Pastel colors, dark theme"
  echo "  gruvbox-dark      - Warm retro colors"
  echo "  nord              - Arctic, bluish tones"
  echo ""
  echo "Example: $0 catppuccin-mocha"
  exit 1
fi

TEMPLATE_NAME="$1"
TEMPLATE_FILE="$(dirname "$0")/templates/${TEMPLATE_NAME}.json"
THEME_DIR="$HOME/.pi/agent/themes"

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "✗ Error: Template '$TEMPLATE_NAME' not found."
  echo ""
  echo "Available templates:"
  for f in "$(dirname "$0")/templates"/*.json; do
    if [ -f "$f" ]; then
      echo "  - $(basename "$f" .json)"
    fi
  done
  exit 1
fi

# Create theme directory if it doesn't exist
mkdir -p "$THEME_DIR"

# Copy template
cp "$TEMPLATE_FILE" "$THEME_DIR/"

echo "✓ Installed template: $TEMPLATE_NAME"
echo "✓ Location: $THEME_DIR/${TEMPLATE_NAME}.json"
echo ""
echo "Next steps:"
echo "  1. Customize the theme:"
echo "     vim $THEME_DIR/${TEMPLATE_NAME}.json"
echo "  2. Validate the theme:"
echo "     ./validate-theme.sh $THEME_DIR/${TEMPLATE_NAME}.json"
echo "  3. Activate in pi: use /settings and select '$TEMPLATE_NAME'"
echo ""
echo "Tip: Edit the theme while pi is running for hot reload!"
