#!/bin/bash
set -e

# extract-colors.sh - Extract a color palette from an image
# Usage: ./extract-colors.sh <image-path>
#
# Requires: ImageMagick (convert command)

if [ -z "$1" ]; then
  echo "Usage: $0 <image-path>"
  echo "Example: $0 ~/Pictures/wallpaper.png"
  exit 1
fi

IMAGE_PATH="$1"

# Check if file exists
if [ ! -f "$IMAGE_PATH" ]; then
  echo "✗ Error: Image file not found: $IMAGE_PATH"
  exit 1
fi

# Check if ImageMagick is available
if ! command -v convert &> /dev/null; then
  echo "✗ Error: ImageMagick is required for color extraction."
  echo "  Install with: apt-get install imagemagick (Debian/Ubuntu)"
  echo "              or: brew install imagemagick (macOS)"
  exit 1
fi

echo "Extracting colors from: $IMAGE_PATH"
echo ""

# Create a temporary directory for processing
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Extract dominant colors using ImageMagick
echo "Dominant colors:"
echo "─────────────────────────────────────"

# Get 8 dominant colors
convert "$IMAGE_PATH" +dither -colors 8 -define histogram:unique-colors=true -format "%c" histogram:info: | \
  awk '{gsub(/.*\(|\).*/,""); print}' | \
  sort | uniq -c | sort -rn | \
  head -8 | \
  while read count color; do
    printf "  %-12s (used %3s times)\n" "$color" "$count"
  done

echo ""
echo "Color palette suggestions:"
echo "─────────────────────────────────────"

# Extract specific color types for theme use
echo ""
echo "Primary accent (most saturated):"
convert "$IMAGE_PATH" +dither -colors 32 -unique-colors histogram:info: | \
  grep -o '#[0-9A-Fa-f]\{6\}' | \
  head -1 | \
  while read color; do
    printf "  %s\n" "$color"
  done

echo ""
echo "Background (darkest dominant color):"
convert "$IMAGE_PATH" +dither -colors 16 -unique-colors histogram:info: | \
  awk '{print $3}' | \
  grep -o '#[0-9A-Fa-f]\{6\}' | \
  head -1 | \
  while read color; do
    printf "  %s\n" "$color"
  done

echo ""
echo "Success color (green-ish):"
convert "$IMAGE_PATH" +dither -colors 16 -unique-colors histogram:info: | \
  grep -i '#[0-9a-f]*[0-9a-f][a-f]0[a-f0-9][0-9a-f]' | \
  grep -o '#[0-9A-Fa-f]\{6\}' | \
  head -1 | \
  while read color; do
    printf "  %s\n" "$color"
  done || echo "  (no green-ish color found)"

echo ""
echo "Error color (red-ish):"
convert "$IMAGE_PATH" +dither -colors 16 -unique-colors histogram:info: | \
  grep -i '#[0-9a-f]*[f-f][0-9a-f]0[a-f0-9][0-9a-f]' | \
  grep -o '#[0-9A-Fa-f]\{6\}' | \
  head -1 | \
  while read color; do
    printf "  %s\n" "$color"
  done || echo "  (no red-ish color found)"

echo ""
echo "Warning color (yellow-ish):"
convert "$IMAGE_PATH" +dither -colors 16 -unique-colors histogram:info: | \
  grep -i '#[f-f][f-f][0-9a-f][0-9a-f][0-6][0-9a-f]' | \
  grep -o '#[0-9A-Fa-f]\{6\}' | \
  head -1 | \
  while read color; do
    printf "  %s\n" "$color"
  done || echo "  (no yellow-ish color found)"

echo ""
echo "─────────────────────────────────────"
echo "Ready to create a theme?"
echo "  ./create-theme.sh my-theme-name"
echo ""
echo "Then edit the theme and use these colors in the 'vars' section."
echo "─────────────────────────────────────"

# Create a small palette image for reference
PALETTE_IMG="$TMPDIR/palette.png"
convert "$IMAGE_PATH" -resize 200x1! -scale 10x400 "$PALETTE_IMG" 2>/dev/null && echo ""
echo "Palette preview saved to: $PALETTE_IMG"
echo "(You can view this to see the color distribution)"
