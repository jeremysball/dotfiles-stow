# Playwright MCP Skill

Browser automation and testing using Playwright MCP server via mcporter. Enables screenshot capture, form interaction, page navigation, and visual testing.

## Prerequisites

- Playwright MCP server installed (via npm install -g @playwright/mcp)
- Playwright browsers installed (via npx playwright install chromium firefox webkit)
- mcporter configured and installed

## Setup

### 1. Configure mcporter.json

Add the playwright-mcp server to your mcporter configuration:

**File:** `~/.config/mcporter/config.json` or `/workspace/config/mcporter.json`

```json
{
  "mcpServers": {
    "playwright-mcp": {
      "description": "Playwright MCP Server - Browser automation and testing",
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp"
      ]
    }
  }
}
```

### 2. Verify Installation

```bash
# List configured servers
mcporter list

# Should show: playwright-mcp - Playwright MCP Server (X tools)
```

### 3. Test Connection

```bash
# Call a simple tool to verify it's working
mcporter call playwright-mcp.browser_navigate url=https://example.com
```

## How to Call mcporter

The `mcporter call` command uses the following syntax:

```bash
mcporter call <server-name>.<tool-name> <param1>=<value1> <param2>=<value2> ...
```

### Important: Use `key=value` format for arguments

**✅ CORRECT:**
```bash
mcporter call playwright-mcp.browser_navigate url=https://example.com
mcporter call playwright-mcp.browser_fill selector="#email" value="test@example.com"
mcporter call playwright-mcp.browser_screenshot path=/workspace/screenshots/test.png fullPage=true
```

**❌ INCORRECT:**
```bash
mcporter call playwright-mcp.browser_navigate "https://example.com"          # Wrong - no key=
mcporter call playwright-mcp.browser_navigate --url="https://example.com"    # Wrong - no -- flags
mcporter call playwright-mcp.browser_navigate { "url": "https://example.com" }  # Wrong - no JSON
```

### Parameter Types

| Type | Example | Description |
|------|---------|-------------|
| String | `url=https://example.com` | Plain text, no quotes needed |
| String with spaces | `value=hello world` | Shell will handle spaces |
| Boolean | `fullPage=true` or `fullPage=false` | true/false lowercase |
| Number | `timeout=5000` | Numeric values |
| Paths | `path=/workspace/screenshots/test.png` | Absolute paths recommended |

### Full Examples

```bash
# Navigate to a URL
mcporter call playwright-mcp.browser_navigate url=https://example.com

# Take a full page screenshot
mcporter call playwright-mcp.browser_screenshot path=/workspace/screenshots/homepage.png fullPage=true

# Click a button
mcporter call playwright-mcp.browser_click selector="#submit-button"

# Fill a form field
mcporter call playwright-mcp.browser_fill selector="#email" value="test@example.com"

# Get text from an element
mcporter call playwright-mcp.browser_get_text selector="h1"

# Execute JavaScript
mcporter call playwright-mcp.browser_evaluate expression="document.title"

# Wait for an element with timeout
mcporter call playwright-mcp.browser_wait_for_selector selector=".loaded" timeout=10000
```

### Chaining Commands

For multi-step workflows, run commands sequentially:

```bash
# Step 1: Navigate
mcporter call playwright-mcp.browser_navigate url=http://localhost:3000

# Step 2: Fill form
mcporter call playwright-mcp.browser_fill selector="#email" value="test@example.com"
mcporter call playwright-mcp.browser_fill selector="#password" value="secret123"

# Step 3: Submit
mcporter call playwright-mcp.browser_click selector="button[type='submit']"

# Step 4: Wait and screenshot
mcporter call playwright-mcp.browser_wait_for_selector selector=".dashboard" timeout=5000
mcporter call playwright-mcp.browser_screenshot path=/workspace/screenshots/result.png fullPage=true
```

## Available Tools

### Navigation

| Tool | Description | Parameters |
|------|-------------|------------|
| `browser_navigate` | Navigate to a URL | `url` (string, required) |
| `browser_go_back` | Go back in history | - |
| `browser_go_forward` | Go forward in history | - |
| `browser_reload` | Reload the page | - |

### Screenshots & PDFs

| Tool | Description | Parameters |
|------|-------------|------------|
| `browser_screenshot` | Take a screenshot | `path` (string), `fullPage` (boolean, default: false), `selector` (string, optional) |
| `browser_pdf` | Generate PDF | `path` (string), `format` (string, e.g., "A4") |

### Interaction

| Tool | Description | Parameters |
|------|-------------|------------|
| `browser_click` | Click an element | `selector` (string, required) |
| `browser_fill` | Fill a form field | `selector` (string), `value` (string) |
| `browser_select` | Select dropdown option | `selector` (string), `value` (string) |
| `browser_hover` | Hover over element | `selector` (string) |
| `browser_press` | Press keyboard key | `key` (string, e.g., "Enter", "Escape") |

### Content Extraction

| Tool | Description | Parameters |
|------|-------------|------------|
| `browser_get_text` | Get element text content | `selector` (string) |
| `browser_get_attribute` | Get element attribute | `selector` (string), `attribute` (string) |
| `browser_evaluate` | Execute JavaScript | `expression` (string) |

### Waiting

| Tool | Description | Parameters |
|------|-------------|------------|
| `browser_wait_for_selector` | Wait for element | `selector` (string), `timeout` (number, ms) |
| `browser_wait_for_load` | Wait for page load | `state` (string: "load", "domcontentloaded", "networkidle") |

## Usage Examples

### Basic Screenshot

```bash
# Navigate and take screenshot
mcporter call playwright-mcp.browser_navigate url=https://example.com
mcporter call playwright-mcp.browser_screenshot path=/workspace/screenshots/example.png fullPage=true
```

### Form Testing

```bash
# Navigate to form page
mcporter call playwright-mcp.browser_navigate url=http://localhost:3000/login

# Fill form fields
mcporter call playwright-mcp.browser_fill selector="#email" value="test@example.com"
mcporter call playwright-mcp.browser_fill selector="#password" value="secret123"

# Click submit button
mcporter call playwright-mcp.browser_click selector="button[type='submit']"

# Wait for success message
mcporter call playwright-mcp.browser_wait_for_selector selector=".success-message" timeout=5000

# Get success message text
mcporter call playwright-mcp.browser_get_text selector=".success-message"

# Take screenshot of result
mcporter call playwright-mcp.browser_screenshot path=/workspace/screenshots/login-success.png
```

### Visual Regression Testing

```bash
# Navigate to page
mcporter call playwright-mcp.browser_navigate url=http://localhost:3000/dashboard

# Wait for content to load
mcporter call playwright-mcp.browser_wait_for_load state=networkidle

# Take screenshot
mcporter call playwright-mcp.browser_screenshot path=/workspace/screenshots/dashboard.png fullPage=true

# Compare with baseline (using external tool)
# diff /workspace/screenshots/dashboard-baseline.png /workspace/screenshots/dashboard.png
```

### JavaScript Evaluation

```bash
# Navigate to page
mcporter call playwright-mcp.browser_navigate url=http://localhost:3000/app

# Execute JavaScript and get result
mcporter call playwright-mcp.browser_evaluate expression="document.title"
mcporter call playwright-mcp.browser_evaluate expression="window.innerWidth"
mcporter call playwright-mcp.browser_evaluate expression="document.querySelectorAll('.item').length"
```

### Multi-Browser Testing

```bash
# Test in Chromium (default)
mcporter call playwright-mcp.browser_navigate url=http://localhost:3000 browser=chromium

# Test in Firefox
mcporter call playwright-mcp.browser_navigate url=http://localhost:3000 browser=firefox

# Test in WebKit
mcporter call playwright-mcp.browser_navigate url=http://localhost:3000 browser=webkit
```

## Testing Workflow

### 1. Development Testing

When developing a feature, use Playwright MCP to:

```bash
# 1. Start your development server
# (in another terminal)

# 2. Navigate to the feature
mcporter call playwright-mcp.browser_navigate url=http://localhost:3000/new-feature

# 3. Interact with the feature
mcporter call playwright-mcp.browser_click selector="#new-button"
mcporter call playwright-mcp.browser_screenshot path=/workspace/screenshots/feature-test.png

# 4. Verify behavior
mcporter call playwright-mcp.browser_get_text selector="#result"
```

### 2. Automated Test Script

Create a test script that Pi can execute:

```bash
#!/bin/bash
set -e

echo "🧪 Running visual tests..."

# Test 1: Homepage
mcporter call playwright-mcp.browser_navigate url=http://localhost:3000
mcporter call playwright-mcp.browser_screenshot path=/workspace/screenshots/01-homepage.png fullPage=true

# Test 2: Navigation
mcporter call playwright-mcp.browser_click selector="nav a[href='/about']"
mcporter call playwright-mcp.browser_wait_for_load state=networkidle
mcporter call playwright-mcp.browser_screenshot path=/workspace/screenshots/02-about.png

# Test 3: Form submission
mcporter call playwright-mcp.browser_navigate url=http://localhost:3000/contact
mcporter call playwright-mcp.browser_fill selector="#name" value="Test User"
mcporter call playwright-mcp.browser_fill selector="#message" value="Test message"
mcporter call playwright-mcp.browser_click selector="button[type='submit']"
mcporter call playwright-mcp.browser_wait_for_selector selector=".thank-you" timeout=5000
mcporter call playwright-mcp.browser_screenshot path=/workspace/screenshots/03-form-submitted.png

echo "✅ All tests completed!"
echo "📁 Screenshots saved to /workspace/screenshots/"
```

### 3. Automated Testing

For running tests in automation:

```bash
#!/bin/bash
set -e

echo "🧪 Running automated tests..."

# Run tests
mcporter call playwright-mcp.browser_navigate url=http://localhost:8080
mcporter call playwright-mcp.browser_screenshot path=/workspace/screenshots/test-$(date +%s).png

echo "✅ Tests completed!"
```

## Common Patterns

### Pattern: Screenshot on Error

```bash
#!/bin/bash
set -e

take_screenshot_on_error() {
  if [ $? -ne 0 ]; then
    echo "❌ Test failed, taking screenshot..."
    mcporter call playwright-mcp.browser_screenshot path=/workspace/screenshots/error-$(date +%s).png
    exit 1
  fi
}

trap take_screenshot_on_error EXIT

# Run your tests
mcporter call playwright-mcp.browser_navigate url=http://localhost:3000
mcporter call playwright-mcp.browser_click selector="#risky-button"
```

### Pattern: Wait and Retry

```bash
#!/bin/bash

wait_for_element() {
  local selector=$1
  local max_attempts=5
  local attempt=1

  while [ $attempt -le $max_attempts ]; do
    if mcporter call playwright-mcp.browser_get_text selector="$selector" 2>/dev/null; then
      return 0
    fi
    echo "Attempt $attempt failed, retrying..."
    sleep 2
    ((attempt++))
  done

  return 1
}

mcporter call playwright-mcp.browser_navigate url=http://localhost:3000
wait_for_element ".async-loaded-content"
```

## Troubleshooting

### Connection Issues

```bash
# Check if mcporter can find the server
mcporter list

# Test with verbose output
mcporter call playwright-mcp.browser_navigate url=https://example.com

# Verify @playwright/mcp is installed
npm list -g @playwright/mcp
```

### Screenshot Issues

```bash
# Ensure screenshot directory exists and is writable
mkdir -p /workspace/screenshots
chmod 755 /workspace/screenshots

# Test write permissions
touch /workspace/screenshots/test.txt && rm /workspace/screenshots/test.txt
```

### Browser Timeout

```bash
# Increase timeout for slow-loading pages
mcporter call playwright-mcp.browser_navigate url=https://slow-site.com
mcporter call playwright-mcp.browser_wait_for_load state=networkidle timeout=60000
```

## Best Practices

1. **Always wait** for elements or page load before interacting
2. **Use selectors** that are stable (prefer data-testid over CSS classes)
3. **Clean up** browsers after use (they auto-close but good to verify)
4. **Organize screenshots** by test/feature in subdirectories
5. **Use fullPage screenshots** for visual regression testing
6. **Set appropriate timeouts** based on your app's performance

## Integration with Pi

Pi can use this skill to:

1. **Verify UI changes** - Take screenshots before/after code changes
2. **Test interactions** - Click through workflows and verify results
3. **Debug issues** - Screenshot error states for analysis
4. **Document features** - Generate screenshots for documentation
5. **Validate deployments** - Automated smoke tests post-deployment

When Pi detects a web component or needs to verify visual output, it should:

1. Check if playwright-mcp is configured: `mcporter list`
2. Configure it if missing (guide user to edit mcporter.json)
3. Use the appropriate tool for the task
4. Save artifacts to `/workspace/screenshots/` for review
