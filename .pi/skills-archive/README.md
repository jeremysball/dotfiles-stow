# Z.AI MCP Skills

A collection of AgentSkills for integrating Z.AI's powerful MCP (Model Context Protocol) servers with pi. These skills provide vision, web access, and GitHub repository capabilities to your AI agent.

## Skills

### [zai-vision-mcp](./zai-vision-mcp/SKILL.md)
**Image & Video Analysis using Z.AI GLM-4.6V**

- Analyze images and screenshots
- Extract text from screenshots (OCR)
- Diagnose errors from screenshots
- Understand technical diagrams (UML, architecture, etc.)
- Analyze data visualizations and charts
- Compare UI designs
- Analyze videos (MP4, MOV, M4V up to 8MB)

**Command:** `/skill:zai-vision-mcp`

---

### [zai-web-reader-mcp](./zai-web-reader-mcp/SKILL.md)
**Webpage Content Extraction**

- Fetch complete webpage content
- Extract structured data (title, body, metadata, links)
- Parse documentation and articles
- Build knowledge bases from web content

**Command:** `/skill:zai-web-reader-mcp`

---

### [zai-web-search-mcp](./zai-web-search-mcp/SKILL.md)
**Real-time Web Search**

- Search the web for latest information
- Get real-time news, stock prices, weather
- Find documentation and tutorials
- Research best practices and solutions

**Command:** `/skill:zai-web-search-mcp`

---

### [zai-zread-mcp](./zai-zread-mcp/SKILL.md)
**GitHub Repository Access**

- Search documentation in GitHub repositories
- Get repository structure and file lists
- Read complete file contents
- Explore open source projects deeply

**Command:** `/skill:zai-zread-mcp`

---

## Requirements

- **Node.js** >= v22.0.0 (for Vision MCP)
- **Z.AI API Key** - Get one from [Z.AI Console](https://z.ai/manage-apikey/apikey-list)

### Setting up the API Key

Set the `ZAI_API_KEY` environment variable:

```bash
export ZAI_API_KEY="your_api_key_here"
```

Add to your `~/.bashrc` or `~/.zshrc` to persist:

```bash
echo 'export ZAI_API_KEY="your_api_key_here"' >> ~/.bashrc
source ~/.bashrc
```

## Installation with Mcporter

The MCP servers are configured in `../config/mcporter.json`. To verify they're installed:

```bash
mcporter list
```

Expected output:
```
- zread — Zread MCP Server (3 tools)
- web-search-prime — Web Search MCP Server (1 tool)
- web-reader — Web Reader MCP Server (1 tool)
- zai-mcp-server — Vision MCP Server (8 tools)
```

## Usage

### Using Skills Directly

Load a skill with its command:

```bash
/skill:zai-web-search-mcp search for Python async best practices
/skill:zai-vision-mcp analyze this screenshot: error.png
/skill:zai-zread-mcp show me the structure of facebook/react
/skill:zai-web-reader-mcp read the docs at https://example.com/docs
```

### Using MCP Tools via Mcporter

```bash
# Web search
mcporter call web-search-prime.webSearchPrime search_query="your query"

# Web reader
mcporter call web-reader.webReader url="https://example.com"

# Zread - search docs
mcporter call zread.search_doc repo="owner/repo" query="authentication"

# Zread - get repo structure
mcporter call zread.get_repo_structure repo="owner/repo"

# Zread - read file
mcporter call zread.read_file repo="owner/repo" file_path="README.md"

# Vision tools (with images in current directory)
mcporter call zai-mcp-server.image_analysis image_path="screenshot.png"
mcporter call zai-mcp-server.extract_text_from_screenshot image_path="code.png"
```

## Troubleshooting

### Connection Issues

- Ensure Node.js >= 22.0.0 is installed (for Vision MCP)
- Verify `ZAI_API_KEY` environment variable is set
- Check internet connection

### Invalid API Key

- Verify the API key is correctly copied
- Check the key is activated in [Z.AI Console](https://z.ai/manage-apikey/apikey-list)
- Ensure the key has sufficient balance

### Mcporter Server Status

Check if all servers are healthy:

```bash
mcporter list
```

If a server shows as offline, verify its configuration in `config/mcporter.json`.

## Documentation

- [Z.AI Documentation](https://docs.z.ai/)
- [Vision MCP](https://docs.z.ai/guides/vlm/glm-4.6v)
- [Zread.ai](https://zread.ai)
- [Agent Skills Specification](https://agentskills.io/specification)
- [Pi Skills Documentation](https://github.com/badlogic/pi-skills)

## License

These skills follow the Agent Skills specification. Check individual skill frontmatter for license information.

## Contributing

To add or modify skills:

1. Create a new directory in `.pi/skills/`
2. Add a `SKILL.md` file with proper frontmatter
3. Follow the [Agent Skills specification](https://agentskills.io/specification)
4. Test with `mcporter list` and `/skill:name` commands

## Related Links

- [Z.AI Open Platform](https://z.ai/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Mcporter CLI](https://github.com/block/mcporter)
- [Pi Coding Agent](https://github.com/badlogic/pi-coding-agent)
