---
name: zai-vision-mcp
description: Image analysis, video understanding, OCR, UI screenshot analysis, error diagnosis, diagram interpretation, and data visualization analysis using Z.AI GLM-4.6V vision capabilities. Use when working with images, screenshots, diagrams, or videos.
---

# Z.AI Vision MCP

Provides powerful computer vision capabilities for analyzing images, videos, and visual content through the Z.AI GLM-4.6V model.

This skill uses mcporter to invoke vision tools. Tools are available through the configured zai-mcp-server in your mcporter config.

## Tools Available

| Tool | Description |
|------|-------------|
| `ui_to_artifact` | Turn UI screenshots into code, prompts, specs, or descriptions |
| `extract_text_from_screenshot` | OCR screenshots for code, terminals, docs, and general text |
| `diagnose_error_screenshot` | Analyze error snapshots and propose actionable fixes |
| `understand_technical_diagram` | Interpret architecture, flow, UML, ER, and system diagrams |
| `analyze_data_visualization` | Read charts and dashboards to surface insights and trends |
| `ui_diff_check` | Compare two UI shots to flag visual or implementation drift |
| `image_analysis` | General-purpose image understanding when other tools don't fit |
| `video_analysis` | Inspect videos (local/remote ≤8MB; MP4/MOV/M4V) to describe scenes |

## Requirements

- mcporter configured with zai-mcp-server
- ZAI_API_KEY environment variable set

## Supported Formats

- **Images:** PNG, JPG, JPEG, GIF, WebP
- **Videos:** MP4, MOV, M4V (max 8MB)

## Usage

The MCP server is automatically available. Reference images or videos by their local file path. Tools are invoked through mcporter.

### Examples

**Analyze an image:**
```
Use mcporter to analyze this image: screenshot.png
```

**Extract text from screenshot:**
```
Use mcporter to extract code from this terminal screenshot: terminal-screenshot.png
```

**Diagnose error:**
```
Use mcporter to diagnose this error: error-screenshot.png
```

**Understand a diagram:**
```
Use mcporter to explain this architecture: architecture-diagram.png
```

**Analyze data visualization:**
```
Use mcporter to find insights in this chart: dashboard-chart.png
```

**Compare UI designs:**
```
Use mcporter to compare these two UI screenshots: design-v1.png design-v2.png
```

**Analyze video:**
```
Use mcporter to describe what happens in this video: demo.mp4
```

### mcporter Invocation

To invoke specific tools directly:
```bash
mcporter call zai-mcp-server.ui_to_artifact file_path:screenshot.png
mcporter call zai-mcp-server.extract_text_from_screenshot file_path:terminal-screenshot.png
mcporter call zai-mcp-server.diagnose_error_screenshot file_path:error-screenshot.png
```

## Best Practices

1. Place images in your current working directory for easy reference
2. Use specific tools when possible (e.g., `diagnose_error_screenshot` for errors)
3. For general image analysis, use `image_analysis`
4. Videos must be under 8MB in size

## Quota

The Vision MCP shares quota with other Z.AI services:
- Lite: 5-hour prompt resource pool
- Pro: 5-hour prompt resource pool
- Max: 5-hour prompt resource pool

## Troubleshooting

**Connection issues:**
- Ensure mcporter is properly configured with the zai-mcp-server in config/mcporter.json
- Verify ZAI_API_KEY environment variable is set
- Run `mcporter list` to verify the server is configured
- Run `mcporter call zai-mcp-server.image_analysis file_path:test.png` to test

**Invalid API Key:**
- Check the API key is correct and activated
- Ensure the key has sufficient balance
- Verify Z_AI_MODE is set to "ZAI" in mcporter config

**Tool not found:**
- Use `mcporter list --schema` to see available tools
- Ensure mcporter config is loaded with the correct config file
- Check that the zai-mcp-server is properly configured

## Related Links

- [Documentation](https://docs.z.ai/guides/vlm/glm-4.6v)
- [NPM Package](https://www.npmjs.com/package/@z_ai/mcp-server)
- [Z.AI Console](https://z.ai/manage-apikey/apikey-list)
