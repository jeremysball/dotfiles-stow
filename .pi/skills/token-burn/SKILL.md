---
name: token-burn
description: Calculate total token usage from pi and OpenClaw session JSONL files with beautiful emoji tables. Use when analyzing conversation history, tracking API costs, or auditing token consumption across multiple sessions. Supports OpenClaw's model_change and thinking_level_change events. Integrates with search skills for cost estimation.
---

# 🔥 Token Burn

Calculate token usage from pi and **OpenClaw** session JSONL files with beautiful visual output. Extracts actual token counts including cached tokens (cacheRead, cacheWrite) from message metadata.

**Now with enhanced OpenClaw support:** Handles `model_change`, `thinking_level_change`, and `model-snapshot` events for complete session tracking.

![Token Burn Demo](assets/demo.png)

## ✨ Features

| Feature | Status | Emoji |
|---------|--------|-------|
| Beautiful emoji-enhanced tables | ✅ | 📊 |
| Stream large JSONL files | ✅ | 🌊 |
| Extract cached tokens | ✅ | 💾 |
| Model detection with icons | ✅ | 🤖 |
| Recursive directory processing | ✅ | 📁 |
| JSON output format | ✅ | 📋 |
| Cost estimation guidance | ✅ | 💰 |
| **OpenClaw session support** | ✅ | 🐾 |
| **OpenClaw model_change events** | ✅ | 🔄 |
| **OpenClaw thinking_level tracking** | ✅ | 🧠 |

## 🚀 Quick Start

```bash
cd /workspace/.pi/skills/token-burn

# 🔥 Run with default path (~/.pi/agent/sessions)
python3 src/token_burn.py

# 📄 Process specific session file
python3 src/token_burn.py ~/.pi/agent/sessions/--workspace--/2026-02-18.jsonl

# 📁 Process all sessions recursively
python3 src/token_burn.py ~/.pi/agent/sessions --recursive

# 📋 Output as JSON
python3 src/token_burn.py --json
```

## 🐾 OpenClaw Session Support

Token Burn has enhanced support for **OpenClaw** session files:

### OpenClaw-Specific Events

| Event Type | Description | Handled |
|------------|-------------|---------|
| `session` | Session metadata (version, id, timestamp) | ✅ Skipped |
| `model_change` | Model switching events | ✅ Tracked |
| `thinking_level_change` | Thinking/reasoning level changes | ✅ Tracked |
| `model-snapshot` | Custom model snapshot events | ✅ Tracked |
| `message` | Messages with token usage | ✅ Processed |

### Processing OpenClaw Sessions

```bash
# Process OpenClaw sessions from a specific directory
python3 src/token_burn.py /workspace/openclaw-sessions --recursive

# Process a single OpenClaw session file
python3 src/token_burn.py /path/to/session-id.jsonl

# Export OpenClaw session data as JSON for further analysis
python3 src/token_burn.py /workspace/openclaw-sessions --recursive --json > openclaw_report.json
```

### OpenClaw Session File Format

OpenClaw session files (`.jsonl`) contain newline-delimited JSON events:

```jsonl
{"type":"session","version":3,"id":"...","timestamp":"..."}
{"type":"model_change","id":"...","timestamp":"...","provider":"zai","modelId":"glm-5"}
{"type":"message","id":"...","timestamp":"...","message":{"role":"assistant","content":[...],"usage":{"input":391,"output":140,"cacheRead":18624,"cacheWrite":0,"totalTokens":19155}}}
```

Token Burn extracts model information from `model_change` events and token usage from `message` events, giving you complete visibility into your OpenClaw token consumption.

## 📖 Usage Examples

### Default Session Analysis
```bash
# Analyzes ~/.pi/agent/sessions by default
python3 src/token_burn.py
```

**Output:**
```
🔥════════════════════════════════════════════════════════════════════🔥
║                    💰 TOKEN BURN REPORT 💰                         ║
🔥════════════════════════════════════════════════════════════════════🔥

╔════════════════════════════════════════════════════════════════════╗
║📊  Session Summary                                                 ║
╠════════════════════════════════════════════════════════════════════╣
║  📁 Files Processed              84                                ║
║  📄 Total Lines              11,561                                ║
║  💬 Messages w/ Usage         4,899                                ║
╚════════════════════════════════════════════════════════════════════╝

📊════════════════════════════════════════════════════════════════════📊
║              🤖 TOKEN USAGE BY MODEL 🤖                            ║
📊════════════════════════════════════════════════════════════════════📊

┌────────────────────────────────────────────────────────────────────┐
│ #1  🌙  kimi-coding/k2p5                                           │
├────────────────────────────────────────────────────────────────────┤
│  📥  Input:             11,065,261  (11.07M)    44.5%              │
│  📤  Output:             1,082,103  (1.08M)      4.4%              │
│  💾  Cache Read:       239,416,576  (239.42M)   95.1%              │
│  💿  Cache Write:               0  (0)           0.0%              │
├────────────────────────────────────────────────────────────────────┤
│  🔥  TOTAL:            251,563,940  (251.56M)                      │
└────────────────────────────────────────────────────────────────────┘

💰════════════════════════════════════════════════════════════════════💰
║                    🏆 GRAND TOTALS 🏆                              ║
💰════════════════════════════════════════════════════════════════════💰
│  📥  TOTAL INPUT          16,191,416  (16.19M)                     │
│  📤  TOTAL OUTPUT          1,334,843  (1.33M)                      │
│  💾  TOTAL CACHE READ    270,346,440  (270.35M)                    │
├────────────────────────────────────────────────────────────────────┤
│  🔥  GRAND TOTAL         287,872,699  (287.87M)                    │
└────────────────────────────────────────────────────────────────────┘

💡────────────────────────────────────────────────────────────────────💡
│  💰 Cost Estimation Tip:                                           │
│     Use serper-search or web-search to find current pricing:       │
│     'Anthropic Claude API pricing per token 2025'                  │
│     'OpenAI GPT-4 pricing per token 2025'                          │
│     Then multiply: tokens × price_per_token = estimated cost       │
💡────────────────────────────────────────────────────────────────────💡
```

### JSON Output for Automation
```bash
python3 src/token_burn.py --json > token_report.json
```

## 💰 Cost Estimation with Search Skills

Token Burn integrates beautifully with search skills to estimate actual costs:

### Step 1: Get Token Counts
```bash
python3 src/token_burn.py
# Note the model names and token counts (e.g., kimi-coding/k2p5: 251M tokens)
```

### Step 2: Search for Current Pricing

Use **serper-search** (or any web search skill) to find current pricing:

```bash
# For Claude/Anthropic models
serper-search "Anthropic Claude API pricing per token 2025"

# For OpenAI models  
serper-search "OpenAI GPT-4o API pricing per million tokens 2025"

# For Kimi models
serper-search "Moonshot AI Kimi API pricing per token 2025"

# For GLM/Zhipu models
serper-search "Zhipu AI GLM-4 API pricing per token 2025"
```

### Step 3: Calculate Estimated Cost

Example calculation:
```
Model: kimi-coding/k2p5
Input tokens:  11,065,261
Output tokens: 1,082,103

Pricing (hypothetical):
- Input:  $0.50 per 1M tokens
- Output: $1.50 per 1M tokens

Cost = (11.07M × $0.50) + (1.08M × $1.50)
     = $5.54 + $1.62
     = $7.16
```

### 🔍 Quick Cost Lookup Commands

Add these to your workflow:

```bash
# Claude pricing
alias claude-pricing='serper-search "Anthropic Claude 3.5 Sonnet API pricing 2025"'

# OpenAI pricing  
alias openai-pricing='serper-search "OpenAI GPT-4o mini API pricing per million tokens"'

# Kimi pricing
alias kimi-pricing='serper-search "Moonshot AI Kimi k2 API pricing 2025"'
```

## 📊 Output Format Details

### Model Emojis

| Provider | Emoji | Example Models |
|----------|-------|----------------|
| Kimi | 🌙 | kimi-coding/k2p5, kimi-k2-thinking |
| Claude | 🧠 | claude-3.5-sonnet, claude-3-opus |
| OpenAI | 🤖 | gpt-4o, gpt-4o-mini, gpt-3.5-turbo |
| Gemini | 💎 | gemini-1.5-pro, gemini-1.5-flash |
| Zhipu/GLM | ⚡ | zai/glm-4, zai/glm-5 |
| Llama | 🦙 | llama-3.1-70b, llama-3.1-8b |
| DeepSeek | 🔮 | deepseek-chat, deepseek-coder |
| Unknown | 🤖 | fallback for unrecognized models |

### Token Format

| Range | Display | Example |
|-------|---------|---------|
| < 1,000 | exact | `842` |
| 1K - 1M | K suffix | `12.5K` |
| ≥ 1M | M suffix | `251.56M` |

## 🔧 Advanced Usage

### Process Specific Workspace
```bash
python3 src/token_burn.py ~/.pi/agent/sessions/--workspace-alfred-- --recursive
```

### Filter by Date Range (with find)
```bash
# Only sessions from today
find ~/.pi/agent/sessions -name "2026-02-18*.jsonl" -exec \
  python3 src/token_burn.py {} \;
```

### Compare Sessions
```bash
# Yesterday vs today
python3 src/token_burn.py ~/.pi/agent/sessions/--workspace--/2026-02-17*.jsonl --json > yesterday.json
python3 src/token_burn.py ~/.pi/agent/sessions/--workspace--/2026-02-18*.jsonl --json > today.json
```

## 📁 JSON Output Structure

```json
{
  "files_processed": 84,
  "total_lines": 11561,
  "total_messages": 4899,
  "tokens_by_model": {
    "kimi-coding/k2p5": {
      "input": 11065261,
      "output": 1082103,
      "cache_read": 239416576,
      "cache_write": 0,
      "total": 251563940
    }
  },
  "total_input": 16191416,
  "total_output": 1334843,
  "total_cache_read": 270346440,
  "total_cache_write": 0,
  "total_tokens": 287872699
}
```

## 🎯 Cached Token Support

| Token Type | Emoji | Description |
|------------|-------|-------------|
| `input` | 📥 | Standard input tokens sent to API |
| `output` | 📤 | Generated output tokens from model |
| `cacheRead` | 💾 | Tokens read from cache (cheaper) |
| `cacheWrite` | 💿 | Tokens written to cache (one-time cost) |

## 🛠️ How It Works

1. **🌊 Streaming**: Reads JSONL files line-by-line without loading into memory
2. **🔍 Model Detection**: Extracts provider/model from message metadata, including OpenClaw's `model_change` and `model-snapshot` events
3. **📊 Token Extraction**: Extracts `input`, `output`, `cacheRead`, `cacheWrite` from message usage data
4. **🧮 Aggregation**: Sums tokens by model and calculates grand totals
5. **🎨 Beautiful Output**: Renders emoji-enhanced tables with smart formatting

### OpenClaw-Specific Processing

For OpenClaw session files, Token Burn:
- Skips `session` metadata headers
- Tracks `model_change` events to follow model switches
- Handles `thinking_level_change` events (tracked but no tokens)
- Extracts model info from `model-snapshot` custom events
- Processes `message` events for actual token usage

## 🔗 Integration with Other Skills

| Skill | Use Case | Command Example |
|-------|----------|-----------------|
| serper-search | Find current API pricing | `serper-search "Claude API pricing 2025"` |
| zai-web-search | Alternative pricing lookup | `zai-web-search "OpenAI GPT-4o pricing"` |
| writing-clearly | Document findings | Use for cost reports |

## 🐾 OpenClaw Integration

Token Burn is fully compatible with OpenClaw session files:

| Feature | Description | Example |
|---------|-------------|---------|
| Session Analysis | Process all OpenClaw sessions | `token_burn.py /workspace/openclaw-sessions --recursive` |
| Single Session | Analyze one session file | `token_burn.py /path/to/session.jsonl` |
| Export to JSON | For programmatic analysis | `token_burn.py /workspace/openclaw-sessions --json` |
| Cost Estimation | Calculate API costs | Automatic with built-in pricing |

### OpenClaw Event Support

Token Burn recognizes and properly handles all OpenClaw event types:

```
✅ session              → Session metadata (skipped)
✅ model_change         → Model switching (tracked)
✅ thinking_level_change → Thinking mode changes (tracked)
✅ model-snapshot       → Model state snapshots (tracked)
✅ message              → Token usage extracted
```

## 📝 License

MIT © 2025 Token Burn Project
