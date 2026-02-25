---
name: zai-web-reader-mcp
description: Fetches complete webpage content including text, structured data, titles, metadata, and links. Use when you need to read, analyze, or extract information from web pages.
---

# Z.AI Web Reader MCP

Extracts and structures content from any webpage, enabling detailed analysis of documentation, articles, and web-based resources.

This skill uses mcporter to invoke web reader tools. Tools are available through the configured web-reader server in your mcporter config.

## Tools Available

| Tool | Description |
|------|-------------|
| `webReader` | Fetch webpage content for a specified URL. Returns title, main content, metadata, links, and more |

## Requirements

- mcporter configured with web-reader server
- ZAI_API_KEY environment variable set
- Active internet connection

## Usage

Use the webReader tool by providing a URL. The tool returns structured data including:

- **Title** - Page title
- **Main Content** - Primary body content
- **Metadata** - Page metadata (description, keywords, etc.)
- **Links** - List of all links found on the page

### Examples

**Read API documentation:**
```
Use mcporter to read and summarize the API documentation at https://example.com/docs
```

**Parse project README:**
```
Use mcporter to extract the installation instructions from https://github.com/owner/repo
```

**Get technical article steps:**
```
Use mcporter to extract the step-by-step instructions from this tutorial URL: https://blog.example.com/tutorial
```

**Analyze documentation for troubleshooting:**
```
Use mcporter to read the official documentation at https://docs.example.com/troubleshooting and help resolve this issue
```

**Build knowledge base:**
```
Use mcporter to extract all content from https://example.com/docs for our knowledge base
```

### mcporter Invocation

To invoke the tool directly:
```bash
mcporter call web-reader.webReader url:https://example.com/docs
```

## Response Structure

The webReader tool returns a JSON response with:

```json
{
  "title": "Page Title",
  "content": "Main body content...",
  "metadata": {
    "description": "...",
    "keywords": "...",
    ...
  },
  "links": [
    {"url": "...", "text": "..."},
    ...
  ]
}
```

## Common Use Cases

1. **API Documentation Reading** - Fetch and parse official docs to accelerate integration
2. **Open Source Project Pages** - Parse READMEs and project pages to understand libraries
3. **Technical Article Understanding** - Extract steps, commands, and caveats from tutorials
4. **Bug Resolution** - Read documentation to find solutions for specific issues
5. **Knowledge Base Construction** - Convert web pages to structured data

## Quota

Web Reader shares quota with Web Search:
- Lite: 100 combined web searches and web readers
- Pro: 1,000 combined web searches and web readers
- Max: 4,000 combined web searches and web readers

## Troubleshooting

**Invalid access token:**
- Verify mcporter is configured with the web-reader server
- Verify ZAI_API_KEY is set correctly
- Check the API key is activated
- Ensure the key has sufficient balance

**Connection timeout:**
- Check network connection
- Verify firewall settings
- Ensure the URL is accessible
- Test with `mcporter list` to verify server configuration

**Webpage fetch failed:**
- Confirm the URL is correct and accessible
- Some sites may block automated scraping
- Try alternative URLs if available

**Server not configured:**
- Ensure mcporter is using the config file with web-reader configured
- Run `mcporter list` to see configured servers
- Verify config/mcporter.json contains the web-reader configuration

## Related Links

- [Documentation](https://docs.z.ai/)
- [Z.AI Console](https://z.ai/manage-apikey/apikey-list)
