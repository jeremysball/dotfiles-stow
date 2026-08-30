#!/bin/bash
set -e

# create-theme.sh - Create a new Pi theme with starter colors
# Usage: ./create-theme.sh <theme-name>

if [ -z "$1" ]; then
  echo "Usage: $0 <theme-name>"
  echo "Example: $0 ocean-blue"
  exit 1
fi

THEME_NAME="$1"
THEME_DIR="$HOME/.pi/agent/themes"
THEME_FILE="$THEME_DIR/${THEME_NAME}.json"

# Validate theme name (lowercase a-z, 0-9, hyphens)
if [[ ! "$THEME_NAME" =~ ^[a-z0-9][a-z0-9-]*[a-z0-9]$ ]]; then
  echo "Error: Theme name must contain only lowercase letters, numbers, and hyphens."
  echo "Cannot start or end with a hyphen."
  exit 1
fi

# Check if theme already exists
if [ -f "$THEME_FILE" ]; then
  echo "Error: Theme '$THEME_NAME' already exists at $THEME_FILE"
  exit 1
fi

# Create theme directory if it doesn't exist
mkdir -p "$THEME_DIR"

# Create the theme file
cat > "$THEME_FILE" << 'EOF'
{
  "$schema": "https://raw.githubusercontent.com/badlogic/pi-mono/main/packages/coding-agent/src/modes/interactive/theme/theme-schema.json",
  "name": "THEME_NAME_PLACEHOLDER",
  "vars": {
    "primary": "#00aaff",
    "secondary": "#808080"
  },
  "colors": {
    "accent": "primary",
    "border": "#45475a",
    "borderAccent": "primary",
    "borderMuted": "#313244",
    "success": "#a6e3a1",
    "error": "#f38ba8",
    "warning": "#f9e2af",
    "muted": "secondary",
    "dim": "#6c7086",
    "text": "",
    "thinkingText": "secondary",
    "selectedBg": "#313244",
    "userMessageBg": "#1e1e2e",
    "userMessageText": "",
    "customMessageBg": "#3e3e5e",
    "customMessageText": "",
    "customMessageLabel": "#cba6f7",
    "toolPendingBg": "#181825",
    "toolSuccessBg": "#1e2e1e",
    "toolErrorBg": "#2e1e1e",
    "toolTitle": "primary",
    "toolOutput": "secondary",
    "mdHeading": "#fab387",
    "mdLink": "primary",
    "mdLinkUrl": "secondary",
    "mdCode": "#94e2d5",
    "mdCodeBlock": "",
    "mdCodeBlockBorder": "secondary",
    "mdQuote": "secondary",
    "mdQuoteBorder": "secondary",
    "mdHr": "secondary",
    "mdListBullet": "#94e2d5",
    "toolDiffAdded": "#a6e3a1",
    "toolDiffRemoved": "#f38ba8",
    "toolDiffContext": "secondary",
    "syntaxComment": "#6c7086",
    "syntaxKeyword": "#cba6f7",
    "syntaxFunction": "#89b4fa",
    "syntaxVariable": "#f5e0dc",
    "syntaxString": "#a6e3a1",
    "syntaxNumber": "#fab387",
    "syntaxType": "#89b4fa",
    "syntaxOperator": "#89dceb",
    "syntaxPunctuation": "#9399b2",
    "thinkingOff": "#313244",
    "thinkingMinimal": "#45475a",
    "thinkingLow": "#89b4fa",
    "thinkingMedium": "#94e2d5",
    "thinkingHigh": "#cba6f7",
    "thinkingXhigh": "#f38ba8",
    "bashMode": "#fab387"
  },
  "export": {
    "pageBg": "#11111b",
    "cardBg": "#1e1e2e",
    "infoBg": "#3c3728"
  }
}
EOF

# Replace the theme name placeholder
sed -i "s/\"name\": \"THEME_NAME_PLACEHOLDER\"/\"name\": \"$THEME_NAME\"/" "$THEME_FILE"

echo "✓ Created theme: $THEME_FILE"
echo "✓ Theme name: $THEME_NAME"
echo ""
echo "Next steps:"
echo "  1. Edit the theme with your custom colors:"
echo "     vim $THEME_FILE"
echo "  2. Validate the theme:"
echo "     ./validate-theme.sh $THEME_FILE"
echo "  3. Activate in pi: use /settings and select '$THEME_NAME'"
echo ""
echo "Tip: Edit the theme while pi is running for hot reload!"
