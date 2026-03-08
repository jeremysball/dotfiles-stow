/**
 * TuringTools Extension for Pi
 * 
 * Execute TypeScript/JavaScript code to generate and chain tool calls.
 * Tools are queued for execution after the code completes.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { Text } from "@mariozechner/pi-tui";

interface ToolCall {
  id: string;
  tool: string;
  arguments: Record<string, unknown>;
}

interface ExecutionResult {
  code: string;
  return_value: unknown;
  tool_calls: ToolCall[];
  stdout: string[];
  stderr: string[];
  error: string | null;
  execution_time: number;
}

const TT_PARAMS = Type.Object({
  code: Type.String({
    description: "TypeScript/JavaScript code to execute. Use call('tool_name', arg=value) to queue tool calls. Available: JSON, Math, Date, RegExp, Array/Object methods. Last expression is returned. Note: tools execute AFTER code completes, not immediately."
  }),
});

// State for tool focus mode
let savedTools: string[] | null = null;
let isFocusMode = false;

export default function (pi: ExtensionAPI) {
  // Register the tt tool
  pi.registerTool({
    name: "tt",
    label: "tt",
    description: "Execute TypeScript code to batch and chain tool calls. Use call('tool_name', arg=value) to queue tool calls. Tools execute AFTER code completes. Use for: batching, conditional logic, generating dynamic call sequences. Available: JSON, Math, Date, RegExp, console.log, Array/Object methods.",
    promptSnippet: "Execute TypeScript to batch tool calls with conditional logic",
    promptGuidelines: [
      "USE FOR: Batching multiple tool calls efficiently",
      "USE FOR: Conditional logic to decide which tools to call",
      "USE FOR: Generating dynamic sequences of tool calls",
      "DON'T USE FOR: Simple shell commands (use 'bash' instead)",
      "DON'T USE FOR: Chaining where you need tool results within the same turn (not supported)",
      "Use call('tool_name', arg=value) to queue a tool call",
      "Tools execute AFTER all code completes, not immediately",
      "Last expression is returned to you",
      "Available: JSON, Math, Date, RegExp, console.log, console.error, Array/Object methods",
    ],
    parameters: TT_PARAMS,

    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const { code } = params as { code: string };
      const startTime = Date.now();

      onUpdate?.({
        content: [{ type: "text", text: "Running tt..." }],
      });

      const toolCalls: ToolCall[] = [];
      const stdout: string[] = [];
      const stderr: string[] = [];
      let callCounter = 0;

      // Create the call function that QUEUES tools (doesn't execute immediately)
      const call = (toolName: string, args: Record<string, unknown> = {}): ToolCall => {
        const callId = `call_${++callCounter}`;
        const tc: ToolCall = {
          id: callId,
          tool: toolName,
          arguments: args
        };
        toolCalls.push(tc);
        return tc;
      };

      // Create console overrides
      const console = {
        log: (...msgs: unknown[]) => {
          stdout.push(msgs.map(m => typeof m === 'object' ? JSON.stringify(m, null, 2) : String(m)).join(' '));
        },
        error: (...msgs: unknown[]) => {
          stderr.push(msgs.map(m => typeof m === 'object' ? JSON.stringify(m, null, 2) : String(m)).join(' '));
        }
      };

      let return_value: unknown = undefined;
      let error: string | null = null;

      try {
        // Create function with access to our call and console
        const fn = new Function('call', 'console', 'JSON', 'Math', 'Date', 'RegExp', code);
        
        // Execute
        return_value = fn(call, console, JSON, Math, Date, RegExp);
      } catch (err) {
        error = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack}` : String(err);
      }

      const execution_time = Date.now() - startTime;

      // Build response
      const lines: string[] = [];
      
      lines.push("**Code:**");
      lines.push("```typescript");
      lines.push(code);
      lines.push("```");

      if (stdout.length > 0) {
        lines.push("**stdout:**");
        lines.push("```");
        lines.push(...stdout);
        lines.push("```");
      }

      if (stderr.length > 0) {
        lines.push("**stderr:**");
        lines.push("```");
        lines.push(...stderr);
        lines.push("```");
      }

      if (toolCalls.length > 0) {
        lines.push(`**Queued Tool Calls (${toolCalls.length}):**`);
        lines.push("```json");
        lines.push(JSON.stringify(toolCalls, null, 2));
        lines.push("```");
      }

      if (error) {
        lines.push("**Error:**");
        lines.push("```");
        lines.push(error);
        lines.push("```");
      }

      lines.push("**Return:**");
      lines.push("```json");
      lines.push(JSON.stringify(return_value, null, 2));
      lines.push("```");

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: {
          code,
          return_value,
          tool_calls: toolCalls,
          stdout,
          stderr,
          error,
          execution_time
        } as ExecutionResult,
        isError: !!error
      };
    },

    renderCall(args, theme) {
      const code = args.code?.slice(0, 40) + (args.code?.length > 40 ? "..." : "") || "<empty>";
      const text = theme.fg("toolTitle", theme.bold("tt ")) +
        theme.fg("dim", code.replace(/\n/g, " "));
      return new Text(text, 0, 0);
    },

    renderResult(result, { expanded, isPartial }, theme) {
      if (isPartial) {
        return new Text(theme.fg("warning", "Running tt..."), 0, 0);
      }

      const details = result.details as ExecutionResult | undefined;

      if (details?.error && !expanded) {
        return new Text(theme.fg("error", `Error: ${details.error.slice(0, 80)}...`), 0, 0);
      }

      const toolCount = details?.tool_calls?.length || 0;
      const execTime = details?.execution_time || 0;
      
      let text = theme.fg("success", "✓ tt");
      text += theme.fg("muted", ` (${execTime}ms`);
      if (toolCount > 0) {
        text += theme.fg("muted", `, ${toolCount} queued`);
      }
      text += theme.fg("muted", ")");

      if (expanded && details) {
        text += "\n";
        
        // Show code preview
        const codePreview = details.code.slice(0, 150).replace(/\n/g, " ");
        text += theme.fg("dim", `Code: ${codePreview}${details.code.length > 150 ? "..." : ""}`);
        text += "\n";
        
        // Show queued tool calls
        if (details.tool_calls.length > 0) {
          for (const tc of details.tool_calls.slice(0, 10)) {
            text += `→ ${tc.tool}\n`;
            const argsStr = JSON.stringify(tc.arguments).slice(0, 80);
            text += theme.fg("dim", `  ${argsStr}${argsStr.length > 80 ? "..." : ""}\n`);
          }
          if (details.tool_calls.length > 10) {
            text += theme.fg("dim", `  ... and ${details.tool_calls.length - 10} more\n`);
          }
        }
        
        // Show return value
        const returnStr = JSON.stringify(details.return_value).slice(0, 100);
        text += theme.fg("dim", `Return: ${returnStr}${returnStr.length > 100 ? "..." : ""}`);
      }

      return new Text(text, 0, 0);
    },
  });

  // Command to test the tool
  pi.registerCommand("tt-test", {
    description: "Test the tt tool with sample code",
    handler: async (_args, ctx) => {
      const testCode = `// Test tt - queue some calls
const files = ['a.py', 'b.py', 'c.py'];
for (const f of files) {
  call("read", { path: f, limit: 50 });
}
console.log(\`Queued \${files.length} reads\`);
return files;`;

      ctx.ui.notify("Sending test code...", "info");

      pi.sendUserMessage(
        `Run this with tt:\n\`\`\`typescript\n${testCode}\n\`\`\``,
        { deliverAs: "followUp" }
      );
    },
  });

  // Command for focus mode
  pi.registerCommand("tt-focus", {
    description: "tt focus mode - usage: /tt-focus [on|off|status]",
    parameters: Type.Object({
      action: Type.String({
        description: "Action: 'on', 'off', or 'status'",
        default: "status"
      })
    }),
    handler: async (args, ctx) => {
      const action = (args.action || "status").toLowerCase();

      if (action === "on") {
        if (isFocusMode) {
          ctx.ui.notify("tt focus already active. Use /tt-focus off", "warning");
          return;
        }
        savedTools = pi.getActiveTools();
        pi.setActiveTools(["tt"]);
        isFocusMode = true;
        ctx.ui.notify("🔧 tt focus mode ON. Only 'tt' tool available.", "info");
      } else if (action === "off") {
        if (!isFocusMode || !savedTools) {
          ctx.ui.notify("tt focus not active.", "warning");
          return;
        }
        pi.setActiveTools(savedTools);
        isFocusMode = false;
        ctx.ui.notify("🔓 tt focus mode OFF. All tools restored.", "success");
      } else if (action === "status") {
        const active = pi.getActiveTools();
        const status = isFocusMode 
          ? `🔧 tt focus ACTIVE. Tools: ${active.join(", ")}`
          : `🔓 tt focus INACTIVE. ${active.length} tools available.`;
        ctx.ui.notify(status, isFocusMode ? "info" : "success");
      } else {
        ctx.ui.notify("Use: /tt-focus on, off, or status", "error");
      }
    },
  });

  // Command to show tutorial
  pi.registerCommand("tt-tut", {
    description: "Show tt tutorial",
    handler: async (_args, ctx) => {
      const guide = `# TuringTools (tt) Guide

## What is tt?

Execute TypeScript to batch and chain tool calls with control flow.

**Key concept:** Tools are QUEUED during execution, then all run AFTER code completes.

## Example

\`\`\`typescript
// Queue multiple reads based on a list
const files = ['src/a.py', 'src/b.py', 'src/c.py'];

for (const f of files) {
  call("read", { path: f });
}

console.log(\`Queued \${files.length} reads\`);

// Conditional calls
if (files.length > 5) {
  call("notify", { message: "Many files!" });
}

return files.length;
\`\`\`

## Available

- **call(tool, args)** - Queue a tool call (returns call info, not result)
- **console.log()** - Print to stdout
- **console.error()** - Print to stderr  
- **JSON, Math, Date, RegExp** - Standard globals

## Limitations

❌ Tools execute AFTER code, not immediately  
❌ Can't use tool results within same tt block  
❌ Can't await tool calls

## When to Use

| Task | Tool |
|------|------|
| Single command | \`bash\` |
| Chain with logic | \`tt\` |
| Need results mid-flow | Separate turns |

## Token Savings

Batch 10 calls in one tt: ~1500 tokens saved vs individual calls.`;

      ctx.ui.notify("tt tutorial displayed", "info");
      await pi.sendMessage({
        customType: "tt-tut",
        content: guide,
        display: true,
      });
    },
  });
}
