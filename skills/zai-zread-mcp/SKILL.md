---
name: zai-zread-mcp
description: GitHub repository documentation search, code reading, and repository structure access powered by zread.ai. Use when you need to explore, understand, or analyze open source repositories.
---

# Z.AI Zread MCP

Deep access to GitHub repositories with intelligent documentation search, code reading, and repository structure analysis for open source projects.

This skill uses mcporter to invoke zread tools. Tools are available through the configured zread server in your mcporter config.

## Tools Available

| Tool | Description |
|------|-------------|
| `search_doc` | Search documentation, code, and comments in GitHub repositories for quick understanding |
| `get_repo_structure` | Get directory structure and file list of GitHub repositories to understand project layout |
| `read_file` | Read complete code content of specified files in GitHub repositories for deep analysis |

## Requirements

- mcporter configured with zread server
- ZAI_API_KEY environment variable set
- Active internet connection
- Target repository must be public/open source

## Repository Format

All tools expect repositories in the format: `owner/repo`

Examples:
- `facebook/react`
- `vercel/next.js`
- `openai/openai-python`

## Usage

### search_doc

Search across documentation, code, comments, issues, PRs, and contributors.

**Examples:**
```
Use mcporter to search for authentication documentation in next.js repository
```
```
Use mcporter to find information about state management in facebook/react
```
```
Use mcporter to check what are the recent issues in vercel/next.js
```
```
Use mcporter to find who are the main contributors to openai/openai-python
```

### get_repo_structure

Get the complete directory structure and file list.

**Examples:**
```
Use mcporter to show me the structure of the next.js repository
```
```
Use mcporter to show what's the directory layout for facebook/react
```
```
Use mcporter to list all files in the src directory of vercel/next.js
```

### read_file

Read the complete content of specific files.

**Examples:**
```
Use mcporter to read the README from facebook/react
```
```
Use mcporter to show me the package.json from next.js
```
```
Use mcporter to read the src/app.js file from openai/openai-python
```
```
Use mcporter to show what's in the lib/utils.ts file of vercel/next.js
```

### mcporter Invocation

To invoke the tools directly:
```bash
mcporter call zread.search_doc owner:facebook repo:react query:authentication
mcporter call zread.get_repo_structure owner:vercel repo:next.js
mcporter call zread.read_file owner:vercel repo:next.js path:src/app/page.tsx
```

## Common Use Cases

### Quick Start with Open Source Libraries
Understand core concepts, installation steps, and code organization:

```
Help me get started with the Next.js framework. Search the repository for setup instructions and show me the project structure.
```

### Issue Troubleshooting and History
Find solutions or fix records for similar problems:

```
I'm having a routing issue with Next.js. Search the repository for similar issues and recent commits related to routing.
```

### Deep Source Code Analysis
Analyze implementation logic for secondary development:

```
Read the main Router implementation from Next.js and explain how it handles dynamic routes.
```

### Dependency Library Research
Evaluate activity, code quality, and maintenance status:

```
Evaluate this library for my project: owner/repo. Show me the repository structure and search for recent activity.
```

## Response Structures

### search_doc
Returns documentation, code snippets, comments, issues, and PRs matching the query.

### get_repo_structure
Returns the complete directory tree with file and folder names.

### read_file
Returns the full content of the requested file.

## Best Practices

1. **Start with search_doc** - Get an overview before diving into specific files
2. **Use get_repo_structure** - Understand the project organization first
3. **Be specific** - When reading files, specify the full path
4. **Combine tools** - Search for topics, then read relevant files
5. **Check repository status** - Ensure the repo is public and active

## Troubleshooting

**Invalid access token:**
- Verify mcporter is configured with the zread server
- Verify ZAI_API_KEY is set correctly
- Check the API key is activated
- Ensure the key has sufficient balance
- Confirm Authorization header format is correct

**Connection timeout:**
- Check network connection
- Verify firewall settings
- Ensure the server URL is correct
- Increase client timeout settings
- Test with `mcporter list` to verify server configuration

**Repository access failed:**
- Confirm mcporter is configured with the zread server
- Confirm the repository exists and is public/open source
- Check the repository name format (owner/repo)
- Verify the repo name is spelled correctly
- Visit [zread.ai](https://zread.ai) to check if the repository is supported

**Server not configured:**
- Ensure mcporter is using the config file with zread configured
- Run `mcporter list` to see configured servers
- Verify config/mcporter.json contains the zread configuration

## Quota

Zread shares quota with Web Search and Web Reader:
- Lite: 100 combined web searches, web readers, and Zread MCP calls
- Pro: 1,000 combined web searches, web readers, and Zread MCP calls
- Max: 4,000 combined web searches, web readers, and Zread MCP calls

## Related Links

- [zread.ai](https://zread.ai)
- [Documentation](https://docs.z.ai/)
- [Z.AI Console](https://z.ai/manage-apikey/apikey-list)
