# Auto-Compact Extension for Pi

Automatically triggers compaction when context usage exceeds a configurable threshold. This provides **proactive** compaction before hitting the context window limit, complementing pi's built-in **reactive** compaction.

## How It Works

Pi has built-in auto-compaction that triggers when:
```
contextTokens > contextWindow - reserveTokens
```

This extension adds **proactive** compaction that triggers when:
```
contextTokens > contextWindow * thresholdPercent
```

For example, with a 200k context window and 75% threshold, compaction triggers at 150k tokens instead of waiting until near the limit.

## Installation

The extension is automatically discovered by pi when placed in:
- `~/.pi/agent/extensions/auto-compact/` (global)
- `.pi/extensions/auto-compact/` (project-local)

## Configuration

Add to your `~/.pi/agent/settings.json` or `.pi/settings.json`:

```json
{
  "autoCompact": {
    "enabled": true,
    "thresholdPercent": 75,
    "minTokens": 50000,
    "customInstructions": "Focus on preserving code structure and recent changes"
  }
}
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `true` | Enable auto-compaction |
| `thresholdPercent` | `75` | Compact when usage exceeds this % of context window (0-100) |
| `minTokens` | `50000` | Minimum tokens before considering compaction (prevents early compaction) |
| `customInstructions` | `""` | Optional custom instructions for the compaction summary |

## Commands

- `/auto-compact-status` - Show current settings and context usage
- `/auto-compact-trigger` - Manually trigger a compaction check

## Why Use This?

1. **Predictable Performance**: Compact at a known threshold instead of waiting for the last minute
2. **Cost Control**: Earlier compaction = fewer tokens sent to the model
3. **Avoid Interruptions**: Prevent mid-turn compaction when context suddenly overflows
4. **Preserve Context**: Choose your own balance between recency and history

## How It Differs from Built-in Compaction

| Feature | Built-in | Auto-Compact Extension |
|---------|----------|------------------------|
| Triggers | Near limit (contextWindow - reserveTokens) | At your threshold % |
| Timing | Reactive (when overflow imminent) | Proactive (after each turn) |
| Config | `compaction.reserveTokens`, `compaction.keepRecentTokens` | `autoCompact.thresholdPercent`, `autoCompact.minTokens` |
| Use Case | Safety net | Controlled, predictable compaction |

Both can work together - this extension compacts proactively, built-in compaction handles emergencies.
