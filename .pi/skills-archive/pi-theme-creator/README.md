# Pi Theme Creator Skill

A skill for creating, validating, and managing custom themes for the Pi coding agent TUI.

## Quick Start

```bash
# Create a new theme
./create-theme.sh my-theme

# Install a pre-built template
./install-template.sh catppuccin-mocha  # or gruvbox-dark, nord

# Validate a theme
./validate-theme.sh ~/.pi/agent/themes/my-theme.json

# Preview theme colors
./preview-theme.sh ~/.pi/agent/themes/my-theme.json

# List all installed themes
./list-themes.sh

# Extract colors from an image (requires ImageMagick)
./extract-colors.sh wallpaper.png
```

## Requirements

- **jq** (required): `apt-get install jq` or `brew install jq`
- **ImageMagick** (optional, for color extraction)

## Features

- Create complete theme templates with all 51 required color tokens
- Three pre-built themes: Catppuccin Mocha, Gruvbox Dark, Nord
- Validate themes against schema and check for missing tokens
- Preview all color tokens with their values
- Extract color palettes from images

## Theme Structure

```json
{
  "$schema": "...",
  "name": "my-theme",
  "vars": { "primary": "#00aaff" },
  "colors": { "accent": "primary", ... },  // 51 tokens
  "export": { "pageBg": "#11111b", ... }
}
```

## Hot Reload

Edit the active theme while Pi runs—changes reload automatically.

## Activating a Theme

Use `/settings` in Pi or add to `settings.json`:

```json
{ "theme": "my-theme" }
```

## License

MIT
