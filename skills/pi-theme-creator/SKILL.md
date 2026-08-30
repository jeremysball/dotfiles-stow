---
name: pi-theme-creator
description: Create, validate, and manage custom themes for the Pi coding agent TUI. Includes templates, color palette generation, and theme validation tools. Use when building custom themes or modifying existing themes.
---

# Pi Theme Creator

Create beautiful, validated themes for the Pi coding agent's Terminal UI (TUI).

## Quick Start

Create a new theme:

```bash
# From the skill directory
./create-theme.sh my-new-theme
```

This creates `~/.pi/agent/themes/my-new-theme.json` with a complete starter template.

## Understanding Pi Themes

Pi themes are JSON files defining 51 color tokens across 6 categories:

1. **Core UI** (11 colors) - Accent, borders, text, status colors
2. **Backgrounds & Content** (11 colors) - Message backgrounds, tool states
3. **Markdown** (10 colors) - Headings, links, code blocks, quotes
4. **Tool Diffs** (3 colors) - Added, removed, context lines
5. **Syntax Highlighting** (9 colors) - Code syntax tokens
6. **Thinking Levels** (6 colors) - Visual hierarchy for thinking states
7. **Bash Mode** (1 color) - Editor border in bash mode

### Color Value Formats

| Format | Example | Description |
|--------|---------|-------------|
| Hex | `"#ff0000"` | 6-digit hex RGB |
| 256-color | `39` | xterm 256-color palette (0-255) |
| Variable | `"primary"` | Reference to `vars` entry |
| Default | `""` | Terminal's default color |

### 256-Color Reference

- `0-15`: Basic ANSI colors (terminal-dependent)
- `16-231`: 6×6×6 RGB cube (`16 + 36×R + 6×G + B`, R,G,B ∈ 0-5)
- `232-255`: Grayscale ramp

## Available Scripts

### create-theme.sh <name>

Creates a new theme with starter colors.

```bash
./create-theme.sh ocean-blue
./create-theme.sh nord-light
```

### install-template.sh <template-name>

Installs a pre-built theme template to your themes directory.

```bash
./install-template.sh catppuccin-mocha
./install-template.sh gruvbox-dark
./install-template.sh nord
```

Available templates:
- **catppuccin-mocha** - Pastel colors, dark theme with soft blues, pinks, and purples
- **gruvbox-dark** - Warm, retro color scheme with earthy tones
- **nord** - Arctic, bluish color palette with cool muted tones

### validate-theme.sh <path>

Validates a theme against the schema and checks for all required tokens.

```bash
./validate-theme.sh ~/.pi/agent/themes/my-theme.json
./validate-theme.sh themes/custom.json
```

### preview-theme.sh <path>

Shows color swatches and explanations for each token.

```bash
./preview-theme.sh ~/.pi/agent/themes/my-theme.json
```

### extract-colors.sh <image>

Extracts a color palette from an image (requires ImageMagick).

```bash
./extract-colors.sh wallpaper.png
./extract-colors.sh ~/Pictures/theme-inspiration.jpg
```

### list-themes.sh

Lists all installed Pi themes from global and project directories.

```bash
./list-themes.sh
```

## Theme Templates

### Pre-built Templates

Use the `install-template.sh` script to install ready-to-use theme templates:

```bash
# Install Catppuccin Mocha (pastel, dark)
./install-template.sh catppuccin-mocha

# Install Gruvbox Dark (warm, retro)
./install-template.sh gruvbox-dark

# Install Nord (arctic, cool)
./install-template.sh nord
```

These templates are fully functional themes that you can use as-is or customize.

### Manual Dark Theme Template

```json
{
  "$schema": "https://raw.githubusercontent.com/badlogic/pi-mono/main/packages/coding-agent/src/modes/interactive/theme/theme-schema.json",
  "name": "my-dark-theme",
  "vars": {
    "primary": "#00aaff",
    "secondary": "#808080",
    "bgDark": "#1e1e2e",
    "bgDarker": "#181825"
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
    "userMessageBg": "bgDark",
    "userMessageText": "",
    "customMessageBg": "#3e3e5e",
    "customMessageText": "",
    "customMessageLabel": "#cba6f7",
    "toolPendingBg": "bgDarker",
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
```

### Light Theme Template

```json
{
  "$schema": "https://raw.githubusercontent.com/badlogic/pi-mono/main/packages/coding-agent/src/modes/interactive/theme/theme-schema.json",
  "name": "my-light-theme",
  "vars": {
    "primary": "#0066cc",
    "secondary": "#6c6c6c",
    "bgLight": "#f5f5f5",
    "bgLighter": "#ffffff"
  },
  "colors": {
    "accent": "primary",
    "border": "#d0d0d0",
    "borderAccent": "primary",
    "borderMuted": "#e0e0e0",
    "success": "#2e7d32",
    "error": "#c62828",
    "warning": "#f57f17",
    "muted": "secondary",
    "dim": "#9e9e9e",
    "text": "",
    "thinkingText": "secondary",
    "selectedBg": "#e3f2fd",
    "userMessageBg": "bgLight",
    "userMessageText": "",
    "customMessageBg": "#ede7f6",
    "customMessageText": "",
    "customMessageLabel": "#7e57c2",
    "toolPendingBg": "#f5f5f0",
    "toolSuccessBg": "#e8f5e9",
    "toolErrorBg": "#ffebee",
    "toolTitle": "primary",
    "toolOutput": "secondary",
    "mdHeading": "#1565c0",
    "mdLink": "primary",
    "mdLinkUrl": "secondary",
    "mdCode": "#00897b",
    "mdCodeBlock": "",
    "mdCodeBlockBorder": "secondary",
    "mdQuote": "secondary",
    "mdQuoteBorder": "secondary",
    "mdHr": "secondary",
    "mdListBullet": "#00897b",
    "toolDiffAdded": "#2e7d32",
    "toolDiffRemoved": "#c62828",
    "toolDiffContext": "secondary",
    "syntaxComment": "#6a9955",
    "syntaxKeyword": "#0000ff",
    "syntaxFunction": "#795e26",
    "syntaxVariable": "#001080",
    "syntaxString": "#a31515",
    "syntaxNumber": "#098658",
    "syntaxType": "#267f99",
    "syntaxOperator": "#000000",
    "syntaxPunctuation": "#000000",
    "thinkingOff": "#e0e0e0",
    "thinkingMinimal": "#bdbdbd",
    "thinkingLow": "primary",
    "thinkingMedium": "#00897b",
    "thinkingHigh": "#7e57c2",
    "thinkingXhigh": "#c62828",
    "bashMode": "#1565c0"
  },
  "export": {
    "pageBg": "#fafafa",
    "cardBg": "#ffffff",
    "infoBg": "#fff8e1"
  }
}
```

## Color Tokens Reference

### Core UI (11 tokens)

| Token | Purpose | Recommended |
|-------|---------|-------------|
| `accent` | Primary accent, logo, cursor | Your brand color |
| `border` | Normal borders | Medium contrast |
| `borderAccent` | Highlighted borders | Bright accent |
| `borderMuted` | Subtle borders | Low contrast |
| `success` | Success states | Green shade |
| `error` | Error states | Red shade |
| `warning` | Warning states | Yellow/amber |
| `muted` | Secondary text | Gray (light: dark, dark: light) |
| `dim` | Tertiary text | Lower contrast than muted |
| `text` | Default text | Usually `""` for terminal default |
| `thinkingText` | Thinking block text | Same as muted or slightly brighter |

### Backgrounds & Content (11 tokens)

| Token | Purpose |
|-------|---------|
| `selectedBg` | Selected line background |
| `userMessageBg` | User message background |
| `userMessageText` | User message text |
| `customMessageBg` | Extension message background |
| `customMessageText` | Extension message text |
| `customMessageLabel` | Extension message label |
| `toolPendingBg` | Tool box (pending state) |
| `toolSuccessBg` | Tool box (success state) |
| `toolErrorBg` | Tool box (error state) |
| `toolTitle` | Tool title |
| `toolOutput` | Tool output text |

### Markdown (10 tokens)

| Token | Purpose |
|-------|---------|
| `mdHeading` | Headings (`#`, `##`, etc.) |
| `mdLink` | Link text `[text]()` |
| `mdLinkUrl` | Link URL portion |
| `mdCode` | Inline code `` `code` `` |
| `mdCodeBlock` | Code block content |
| `mdCodeBlockBorder` | Code block fences (```` ``` ````) |
| `mdQuote` | Blockquote text |
| `mdQuoteBorder` | Blockquote border (`>`) |
| `mdHr` | Horizontal rule (`---`) |
| `mdListBullet` | List bullets (`-`, `*`, `1.`) |

### Tool Diffs (3 tokens)

| Token | Purpose |
|-------|---------|
| `toolDiffAdded` | Added lines (`+`) |
| `toolDiffRemoved` | Removed lines (`-`) |
| `toolDiffContext` | Context lines |

### Syntax Highlighting (9 tokens)

| Token | Purpose |
|-------|---------|
| `syntaxComment` | Comments (`//`, `/* */`, `#`) |
| `syntaxKeyword` | Keywords (`if`, `for`, `return`) |
| `syntaxFunction` | Function names |
| `syntaxVariable` | Variable names |
| `syntaxString` | String literals |
| `syntaxNumber` | Numeric literals |
| `syntaxType` | Type names |
| `syntaxOperator` | Operators (`+`, `=`, `=>`) |
| `syntaxPunctuation` | Punctuation (`;`, `,`, `{}`) |

### Thinking Levels (6 tokens)

Visual hierarchy from subtle to prominent:

| Token | Purpose |
|-------|---------|
| `thinkingOff` | Thinking disabled |
| `thinkingMinimal` | Minimal thinking |
| `thinkingLow` | Low thinking |
| `thinkingMedium` | Medium thinking |
| `thinkingHigh` | High thinking |
| `thinkingXhigh` | Extra high thinking |

### Bash Mode (1 token)

| Token | Purpose |
|-------|---------|
| `bashMode` | Editor border in bash mode (`!` prefix) |

## Design Guidelines

### Dark Terminal Themes

- Use bright, saturated colors
- Higher contrast for readability
- Backgrounds: `#1a1a2e` to `#2d2d44`
- Accents: `#00aaff`, `#ff6b6b`, `#ffd93d`, `#6bcb77`

### Light Terminal Themes

- Use darker, muted colors
- Lower contrast to avoid eye strain
- Backgrounds: `#f5f5f5` to `#ffffff`
- Accents: `#0066cc`, `#c0392b`, `#d68910`, `#27ae60`

### Color Harmony

Start with a base palette and reference it via `vars`:

```json
"vars": {
  "primary": "#89b4fa",
  "secondary": "#a6adc8",
  "tertiary": "#b4befe",
  "bgDark": "#1e1e2e",
  "bgSurface": "#313244"
}
```

Then use variable references:

```json
"colors": {
  "accent": "primary",
  "border": "bgSurface",
  "muted": "secondary"
}
```

Popular color schemes to consider:
- **Gruvbox** - Warm, retro colors
- **Nord** - Arctic, bluish tones
- **Tokyo Night** - Modern, purple/blue
- **Catppuccin** - Pastel colors
- **Dracula** - High contrast dark
- **Solarized** - Precision-tuned contrast

### Accessibility Tips

1. Ensure text contrast ratio ≥ 4.5:1 for normal text
2. Use color + another indicator for important info
3. Test with different content types (code, markdown, diffs)
4. Consider colorblind-friendly palettes (avoid red-green only distinctions)

## Theme Locations

Pi loads themes from (in order of priority):

1. **Global**: `~/.pi/agent/themes/*.json`
2. **Project**: `.pi/themes/*.json`
3. **Packages**: `themes/` directories
4. **CLI**: `--theme <path>`

Disable theme discovery with `--no-themes`.

## Selecting a Theme

Via `/settings` in interactive mode, or in `settings.json`:

```json
{
  "theme": "my-custom-theme"
}
```

Pi defaults to `dark` or `light` based on terminal background detection on first run.

## Hot Reload

When editing the currently active theme file, Pi reloads it automatically for immediate visual feedback. No restart needed!

## Testing Your Theme

1. **Create the theme**: `./create-theme.sh my-theme`
2. **Validate**: `./validate-theme.sh ~/.pi/agent/themes/my-theme.json`
3. **Activate**: Run pi and use `/settings` to select it
4. **Iterate**: Edit the file while pi is running - hot reload will show changes
5. **Test with content**: Chat with various messages, run tools, view code with syntax highlighting

## Common Issues

### Theme not loading

- Check the file is valid JSON: `jq . ~/.pi/agent/themes/my-theme.json`
- Verify the theme name is unique
- Ensure all 51 color tokens are present

### Colors look wrong

- Verify your terminal supports 24-bit truecolor: `echo $COLORTERM`
- For VS Code terminal, set `"terminal.integrated.minimumContrastRatio": 1`
- Try using hex colors instead of 256-color palette numbers

### Hot reload not working

- Ensure you're editing the active theme file
- Check file permissions
- Verify the file is saved (in some editors)

## Related Resources

- [Theme Documentation](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/themes.md)
- [Theme Schema](https://raw.githubusercontent.com/badlogic/pi-mono/main/packages/coding-agent/src/modes/interactive/theme/theme-schema.json)
- [Pi Skills](https://github.com/badlogic/pi-skills)
- [Agent Skills Spec](https://agentskills.io/specification)

## Example Workflow

```bash
# 1. Create a new theme based on a favorite color scheme
./create-theme.sh catppuccin-mocha

# 2. Extract colors from an image for inspiration
./extract-colors.sh ~/Pictures/inspiration.png

# 3. Edit the theme with your custom colors
vim ~/.pi/agent/themes/catppuccin-mocha.json

# 4. Validate the theme
./validate-theme.sh ~/.pi/agent/themes/catppuccin-mocha.json

# 5. Start pi and activate the theme
pi

# In pi: /settings → select "catppuccin-mocha"

# 6. Edit and see changes live (hot reload)
vim ~/.pi/agent/themes/catppuccin-mocha.json
```
