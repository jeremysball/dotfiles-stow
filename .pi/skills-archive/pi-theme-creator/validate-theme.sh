#!/bin/bash
set -e

# validate-theme.sh - Validate a Pi theme file
# Usage: ./validate-theme.sh <path-to-theme.json>

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

echo "Validating theme: $THEME_FILE"
echo ""

ERRORS=0
WARNINGS=0

# Check if file is valid JSON using Python
python3 -c "
import json
import sys

try:
    with open('$THEME_FILE', 'r') as f:
        theme = json.load(f)
except json.JSONDecodeError as e:
    print('✗ Error: Invalid JSON syntax')
    print(str(e))
    sys.exit(1)
except Exception as e:
    print(f'✗ Error: {e}')
    sys.exit(1)
" 2>&1 || exit 1

# Required top-level fields
REQUIRED_FIELDS = ["name", "colors"]
for field in REQUIRED_FIELDS:
    if field not in theme:
        print(f"✗ Missing required field: {field}")
        ERRORS += 1
    else:
        print(f"✓ {field} present")

# Check name field
THEME_NAME = theme.get("name", "")
if not THEME_NAME:
    print("✗ Theme name is empty")
    ERRORS += 1
else:
    import re
    if not re.match(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$', THEME_NAME):
        print(f"⚠ Warning: Theme name '{THEME_NAME}' should use only lowercase letters, numbers, and hyphens")
        WARNINGS += 1
    print(f"✓ Theme name: {THEME_NAME}")

# Check vars section (optional but recommended)
if "vars" in theme and theme["vars"]:
    print("✓ Vars section defined")
    print(f"  → {len(theme['vars'])} custom variable(s)")
else:
    print("ℹ No vars section defined (optional)")

# Check for all required color tokens
REQUIRED_COLORS = [
  "accent", "border", "borderAccent", "borderMuted", "success", "error", "warning",
  "muted", "dim", "text", "thinkingText",
  "selectedBg", "userMessageBg", "userMessageText", "customMessageBg",
  "customMessageText", "customMessageLabel", "toolPendingBg", "toolSuccessBg",
  "toolErrorBg", "toolTitle", "toolOutput",
  "mdHeading", "mdLink", "mdLinkUrl", "mdCode", "mdCodeBlock", "mdCodeBlockBorder",
  "mdQuote", "mdQuoteBorder", "mdHr", "mdListBullet",
  "toolDiffAdded", "toolDiffRemoved", "toolDiffContext",
  "syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxVariable", "syntaxString",
  "syntaxNumber", "syntaxType", "syntaxOperator", "syntaxPunctuation",
  "thinkingOff", "thinkingMinimal", "thinkingLow", "thinkingMedium", "thinkingHigh", "thinkingXhigh",
  "bashMode"
]

MISSING_COLORS = 0
for color in REQUIRED_COLORS:
    if color not in theme.get("colors", {}):
        print(f"✗ Missing color token: {color}")
        MISSING_COLORS += 1
        ERRORS += 1

if MISSING_COLORS == 0:
    print(f"✓ All 51 required color tokens present (total: {len(theme.get('colors', {}))})")

# Check export section (optional)
if "export" in theme:
    print("✓ Export section defined")
else:
    print("ℹ No export section defined (optional, will use userMessageBg)")

# Validate color values
print()
print("Checking color values...")

# Function to check if a value is a valid color reference
def check_color_value(token, value, vars):
    # Empty string is valid (terminal default)
    if value == "":
        return True

    # 256-color number (0-255)
    if isinstance(value, str) and value.isdigit() and 0 <= int(value) <= 255:
        return True

    # Hex color
    if isinstance(value, str) and value.startswith("#") and len(value) == 7 and all(c in "0123456789abcdefABCDEF" for c in value[1:]):
        return True

    # Variable reference (check if it exists in vars)
    if isinstance(vars, dict) and value in vars:
        return True

    return False

VARS = theme.get("vars", {})

INVALID_COLORS = 0
for color in REQUIRED_COLORS:
    value = theme.get("colors", {}).get(color)
    if value is not None:
        if not check_color_value(color, value, VARS):
            print(f"⚠ Warning: Invalid color value for {color}: {value}")
            INVALID_COLORS += 1
            WARNINGS += 1

if INVALID_COLORS == 0:
    print("✓ All color values valid")

# Check $schema field
SCHEMA = theme.get("$schema", "")
if SCHEMA:
    print(f"✓ Schema reference: {SCHEMA}")
else:
    print("⚠ Warning: Missing \$schema field (recommended for editor autocompletion)")
    WARNINGS += 1

# Summary
print()
print("─────────────────────────────────────")
if ERRORS == 0 and WARNINGS == 0:
    print("✓ Theme is valid!")
elif ERRORS == 0:
    print(f"⚠ Theme is valid with {WARNINGS} warning(s)")
else:
    print(f"✗ Theme validation failed: {ERRORS} error(s), {WARNINGS} warning(s)")
print("─────────────────────────────────────")

if ERRORS > 0:
    exit(1)
