---
name: zai-web-search-mcp
description: Comprehensive web search with real-time information retrieval including news, stock prices, weather, and more. Use when you need to search the web, find latest information, or research current topics.
---

# Z.AI Web Search MCP

Provides powerful web search capabilities with real-time information retrieval, keeping you connected to the latest web resources and updates.

This skill uses mcporter to invoke web search tools. Tools are available through the configured web-search-prime server in your mcporter config.

## Tools Available

| Tool | Description |
|------|-------------|
| `webSearchPrime` | Search web information, returning results including page titles, URLs, summaries, site names, site icons, and more |

## Requirements

- mcporter configured with web-search-prime server
- ZAI_API_KEY environment variable set
- Active internet connection

## Usage

Use the webSearchPrime tool with a search query. Results include rich metadata for informed browsing.

### Examples

**Latest technology developments:**
```
Use mcporter to search for the latest AI technology developments in 2026
```

**Best practices research:**
```
Use mcporter to find best practices for Python asynchronous programming
```

**Real-time information:**
```
Use mcporter to check the current stock price for Tesla
```

**News lookup:**
```
Use mcporter to search for recent news about renewable energy
```

**Documentation search:**
```
Use mcporter to find official documentation for React Server Components
```

**Troubleshooting solutions:**
```
Use mcporter to search for solutions to "TypeError: Cannot read property of undefined" in JavaScript
```

**Research and comparison:**
```
Use mcporter to compare PostgreSQL vs MongoDB for large-scale applications
```

**Tutorial search:**
```
Use mcporter to find beginner tutorials for Docker containerization
```

### mcporter Invocation

To invoke the tool directly:
```bash
mcporter call web-search-prime.webSearchPrime search_query="latest AI technology developments 2026"
mcporter call web-search-prime.webSearchPrime search_query="best practices Python async"
```

## Response Structure

The webSearchPrime tool returns a JSON response with:

```json
{
  "results": [
    {
      "title": "Page Title",
      "url": "https://example.com/page",
      "summary": "Brief description of the page content",
      "site_name": "Example Site",
      "site_icon": "https://example.com/icon.png"
    },
    ...
  ]
}
```

## Search Tips

1. **Be specific** - Use detailed queries for better results
2. **Use quotes** - Put exact phrases in quotes for precise matches
3. **Include year** - Add years for time-sensitive searches
4. **Combine terms** - Use multiple keywords to narrow results

## Common Use Cases

1. **Latest Information** - Get real-time news, stock prices, weather
2. **Best Practices** - Find industry standards and recommended approaches
3. **Troubleshooting** - Search for error messages and solutions
4. **Research** - Explore new technologies, frameworks, tools
5. **Documentation** - Find official docs and guides
6. **Tutorials** - Discover learning resources and how-to guides

## Quota

Web Search shares quota with Web Reader:
- Lite: 100 combined web searches and web readers
- Pro: 1,000 combined web searches and web readers
- Max: 4,000 combined web searches and web readers

## Troubleshooting

**Invalid API key:**
- Confirm mcporter is configured with the web-search-prime server
- Confirm ZAI_API_KEY is copied correctly
- Check the API key is activated
- Ensure the key has sufficient balance
- Verify Authorization header format is correct

**Connection timeout:**
- Check network connection
- Verify firewall settings
- Confirm the service URL is correct
- Increase timeout settings in your client
- Test with `mcporter list` to verify server configuration

**Empty search results:**
- Try different search keywords
- Check if the query is too specific
- Confirm network connection is normal
- Broader queries may yield better results

**Server not configured:**
- Ensure mcporter is using the config file with web-search-prime configured
- Run `mcporter list` to see configured servers
- Verify config/mcporter.json contains the web-search-prime configuration

## Related Links

- [Documentation](https://docs.z.ai/)
- [Z.AI Console](https://z.ai/manage-apikey/apikey-list)
