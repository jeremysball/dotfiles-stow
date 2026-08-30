---
name: serper-search
description: Google Search API via Serper.dev for web search, news, images, and knowledge graph results with high-quality structured data
---

# Serper Search Tool

Python CLI for Google Search via Serper.dev API. Get structured search results including organic listings, news, images, videos, and knowledge graph data.

## Setup

### 1. Get an API Key

Sign up at [serper.dev](https://serper.dev/) (free tier: 100 searches/month).

### 2. Set Environment Variable

```bash
export SERPER_API_KEY="your_api_key_here"
```

Or add to `.env` in your project:
```
SERPER_API_KEY=your_api_key_here
```

### 3. Run the Tool

```bash
uv run --directory /workspace/.pi/skills/serper-search serper search "Python async best practices"
```

Or from within the directory:
```bash
cd /workspace/.pi/skills/serper-search
uv run serper search "Python async best practices"
```

## CLI Commands

All commands can be run with:
```bash
uv run --directory /workspace/.pi/skills/serper-search serper <command>
```

Or from within `/workspace/.pi/skills/serper-search`:
```bash
uv run serper <command>
```

### Web Search

```bash
uv run serper search "your query"
uv run serper search "Python tutorials" -n 20
uv run serper search "restaurants" --location "San Francisco, CA"
uv run serper search "docs" --gl uk --hl en
```

Options:
- `-n, --num` - Number of results (default: 10, max: 100)
- `--page` - Page number for pagination
- `--gl` - Country code (us, uk, de, etc.)
- `--hl` - Language code (en, es, fr, etc.)
- `--location` - Location for local search
- `--json` - Output raw JSON

### News Search

```bash
uv run serper news "AI technology"
uv run serper news "stock market" -n 5
```

### Image Search

```bash
uv run serper images "mountain landscape"
uv run serper images "logo design" -n 20
```

### Video Search

```bash
uv run serper videos "Python tutorial"
```

## Using as a Python Library

```python
import sys
sys.path.insert(0, "/workspace/.pi/skills/serper-search/src")

from serper import SerperClient

client = SerperClient()

# Web search
results = client.search("Python async best practices", num=10)
for r in results["organic"]:
    print(f"{r['title']}: {r['link']}")

# News search
news = client.news("artificial intelligence 2025")
for article in news["news"]:
    print(f"{article['title']} - {article['source']}")

# Image search
images = client.images("sunset beach")
for img in images["images"]:
    print(f"{img['title']}: {img['imageUrl']}")
```

## Search Tips

1. **Site-specific**: `"site:github.com python projects"`
2. **File type**: `"python tutorial filetype:pdf"`
3. **Exclude terms**: `"python -snake -monty"`
4. **Exact phrase**: `"\"async await\" best practices"`
5. **Recent results**: Add year to query `"AI news 2025"`

## Output Formats

### Default (Rich Tables)
```bash
uv run --directory /workspace/.pi/skills/serper-search serper search "Python"
```

Displays formatted tables with title, snippet, and link.

### JSON Output
```bash
uv run --directory /workspace/.pi/skills/serper-search serper search "Python" --json
```

Returns full API response as formatted JSON.

## Example Queries

```bash
# Documentation search
uv run --directory /workspace/.pi/skills/serper-search serper search "site:docs.python.org asyncio"

# Latest tech news
uv run --directory /workspace/.pi/skills/serper-search serper news "artificial intelligence" -n 5

# Find images for a project
uv run --directory /workspace/.pi/skills/serper-search serper images "minimalist logo design"

# Local business search
uv run --directory /workspace/.pi/skills/serper-search serper search "coffee shops" --location "Seattle, WA"

# Academic papers
uv run --directory /workspace/.pi/skills/serper-search serper search "machine learning filetype:pdf" -n 20
```

## Error Handling

- **401 Unauthorized**: Check `SERPER_API_KEY` is set correctly
- **429 Rate Limited**: Wait and retry (check dashboard for limits)
- **500 Server Error**: Retry or contact Serper support

## Project Structure

```
serper-search/
├── pyproject.toml      # Project config for uv
├── SKILL.md            # This file
└── src/serper/
    ├── __init__.py     # Package init
    ├── api.py          # SerperClient class
    └── cli.py          # Click CLI commands
```

## Links

- [Serper Documentation](https://serper.dev/docs)
- [API Playground](https://serper.dev/playground)
- [Pricing](https://serper.dev/pricing)
