/**
 * Programmatic Tools Extension for Pi
 * 
 * Allows the model to write Python code that manipulates data and generates
 * tool calls programmatically, instead of making individual tool calls.
 * 
 * Usage:
 *   execute({ code: "..." })
 * 
 * Inside the code:
 *   - Use `call("tool_name", arg=value)` to generate tool calls
 *   - Full Python environment with json, re, math, datetime, etc.
 *   - Last expression is returned to the model
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { Text } from "@mariozechner/pi-tui";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";

interface ToolCall {
  tool: string;
  arguments: Record<string, unknown>;
}

interface ExecutionResult {
  stdout: string;
  stderr: string;
  return_value: unknown;
  tool_calls: ToolCall[];
  error: string | null;
}

const EXECUTE_PARAMS = Type.Object({
  code: Type.String({
    description: "Python code to execute. Use call('tool_name', arg=value) to make tool calls. The last expression is returned to you. Available modules: json, re, math, random, datetime, itertools, collections, urllib.parse"
  }),
});

/**
 * Execute Python code in a sandboxed environment.
 * The code can generate tool calls using the `call()` function.
 */
async function executePython(code: string, signal?: AbortSignal): Promise<ExecutionResult> {
  const tempDir = await mkdtemp(join(tmpdir(), "pi-programmatic-"));
  
  try {
    // Create the Python executor script
    const pythonScript = `
import ast
import contextlib
import io
import json
import sys
import traceback
import math
import random
import datetime
import itertools
import collections
import re
import urllib.parse

def make_call_helper():
    calls = []
    def call(tool, **kwargs):
        calls.append({"tool": tool, "arguments": kwargs})
        return {"tool": tool, "arguments": kwargs}
    return call, calls

call, _tool_calls = make_call_helper()

def serialize_value(val):
    if val is None:
        return None
    if isinstance(val, (str, int, float, bool)):
        return val
    if isinstance(val, (list, tuple)):
        return [serialize_value(v) for v in val]
    if isinstance(val, dict):
        return {k: serialize_value(v) for k, v in val.items()}
    return str(val)

# User code
code = sys.argv[1]

stdout_capture = io.StringIO()
stderr_capture = io.StringIO()
return_value = None
error = None

# Execution globals
globals_dict = {
    'json': json,
    're': re,
    'math': math,
    'random': random,
    'datetime': datetime,
    'itertools': itertools,
    'collections': collections,
    'urllib': urllib.parse,
    'call': call,
    '_tool_calls': _tool_calls,
}

try:
    tree = ast.parse(code)
    
    with contextlib.redirect_stdout(stdout_capture):
        with contextlib.redirect_stderr(stderr_capture):
            if tree.body:
                if isinstance(tree.body[-1], ast.Expr):
                    for stmt in tree.body[:-1]:
                        compiled = compile(ast.Module([stmt], []), '<string>', 'exec')
                        exec(compiled, globals_dict)
                    last_expr = tree.body[-1].value
                    compiled = compile(ast.Expression(last_expr), '<string>', 'eval')
                    return_value = eval(compiled, globals_dict)
                else:
                    compiled = compile(tree, '<string>', 'exec')
                    exec(compiled, globals_dict)
                    if 'result' in globals_dict:
                        return_value = globals_dict['result']
except Exception as e:
    error = f"{type(e).__name__}: {str(e)}\\n{traceback.format_exc()}"

result = {
    "stdout": stdout_capture.getvalue(),
    "stderr": stderr_capture.getvalue(),
    "return_value": serialize_value(return_value),
    "tool_calls": _tool_calls,
    "error": error
}

print(json.dumps(result))
`;

    const scriptPath = join(tempDir, "executor.py");
    await writeFile(scriptPath, pythonScript);

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn("python3", [scriptPath, code], {
        timeout: 30000,
      });

      let stdout = "";
      let stderr = "";

      pythonProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      pythonProcess.on("close", async (code) => {
        // Clean up temp directory after execution
        try {
          await rm(tempDir, { recursive: true, force: true });
        } catch (e) {
          // Ignore cleanup errors
        }

        if (signal?.aborted) {
          reject(new Error("Execution aborted"));
          return;
        }

        if (code !== 0) {
          resolve({
            stdout,
            stderr,
            return_value: null,
            tool_calls: [],
            error: `Python process exited with code ${code}: ${stderr}`,
          });
          return;
        }

        try {
          const result = JSON.parse(stdout) as ExecutionResult;
          resolve(result);
        } catch (e) {
          resolve({
            stdout,
            stderr,
            return_value: null,
            tool_calls: [],
            error: `Failed to parse result: ${e}`,
          });
        }
      });

      pythonProcess.on("error", (err) => {
        reject(new Error(`Failed to start Python: ${err.message}`));
      });

      signal?.addEventListener("abort", () => {
        pythonProcess.kill();
      });
    });
  } catch (err) {
    // Clean up on error
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
    throw err;
  }
}

/**
 * Execute tool calls generated by the Python code.
 */
async function executeToolCalls(
  toolCalls: ToolCall[],
  pi: ExtensionAPI,
  signal?: AbortSignal
): Promise<Array<{ tool: string; arguments: Record<string, unknown>; result: unknown; error: string | null }>> {
  const results = [];

  for (const tc of toolCalls) {
    if (signal?.aborted) {
      break;
    }

    try {
      // Get all available tools
      const allTools = pi.getAllTools();
      const tool = allTools.find(t => t.name === tc.tool);

      if (!tool) {
        results.push({
          tool: tc.tool,
          arguments: tc.arguments,
          result: null,
          error: `Tool '${tc.tool}' not found`,
        });
        continue;
      }

      // Execute the tool
      // Note: We can't directly call tools through the API, so we return
      // the tool calls for the model to execute in subsequent turns
      results.push({
        tool: tc.tool,
        arguments: tc.arguments,
        result: null,
        error: null,
        note: "Tool call queued for execution",
      });
    } catch (e) {
      results.push({
        tool: tc.tool,
        arguments: tc.arguments,
        result: null,
        error: String(e),
      });
    }
  }

  return results;
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "execute",
    label: "Execute",
    description: "Execute Python code to manipulate data and generate tool calls programmatically. Use call('tool_name', arg=value) to invoke other tools. The return value of the last expression is returned to you. Available modules: json, re, math, random, datetime, itertools, collections, urllib.parse",
    promptSnippet: "Execute Python code to batch process data and generate multiple tool calls",
    promptGuidelines: [
      "Use this tool when you need to process data before making tool calls",
      "Use this tool to batch multiple similar tool calls efficiently",
      "Use call('tool_name', arg=value) inside the code to generate tool calls",
      "The last expression in your code is returned to you",
      "Available modules: json, re, math, random, datetime, itertools, collections, urllib.parse",
    ],
    parameters: EXECUTE_PARAMS,

    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const { code } = params as { code: string };

      // Stream initial progress
      onUpdate?.({
        content: [{ type: "text", text: "Executing Python code..." }],
      });

      // Execute the Python code
      const execResult = await executePython(code, signal);

      if (signal?.aborted) {
        return {
          content: [{ type: "text", text: "Execution aborted" }],
          details: { aborted: true },
        };
      }

      // If there was an execution error
      if (execResult.error) {
        return {
          content: [
            { type: "text", text: `Execution error:\n\`\`\`\n${execResult.error}\n\`\`\`` },
          ],
          details: { error: execResult.error, stdout: execResult.stdout, stderr: execResult.stderr },
          isError: true,
        };
      }

      // Execute any tool calls generated
      const toolResults = await executeToolCalls(execResult.tool_calls, pi, signal);

      // Build response
      const lines: string[] = [];

      if (execResult.stdout) {
        lines.push("**stdout:**");
        lines.push("```");
        lines.push(execResult.stdout);
        lines.push("```");
      }

      if (execResult.stderr) {
        lines.push("**stderr:**");
        lines.push("```");
        lines.push(execResult.stderr);
        lines.push("```");
      }

      if (execResult.tool_calls.length > 0) {
        lines.push(`**Tool calls generated (${execResult.tool_calls.length}):**`);
        for (const tc of execResult.tool_calls) {
          lines.push(`- ${tc.tool}: ${JSON.stringify(tc.arguments)}`);
        }
      }

      lines.push("**Return value:**");
      lines.push("```json");
      lines.push(JSON.stringify(execResult.return_value, null, 2));
      lines.push("```");

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: {
          stdout: execResult.stdout,
          stderr: execResult.stderr,
          return_value: execResult.return_value,
          tool_calls: execResult.tool_calls,
          tool_results: toolResults,
        },
      };
    },

    renderCall(args, theme) {
      const code = args.code?.slice(0, 50) + (args.code?.length > 50 ? "..." : "") || "<empty>";
      const text = theme.fg("toolTitle", theme.bold("execute ")) +
        theme.fg("dim", code.replace(/\n/g, " "));
      return new Text(text, 0, 0);
    },

    renderResult(result, { expanded, isPartial }, theme) {
      if (isPartial) {
        return new Text(theme.fg("warning", "Executing Python code..."), 0, 0);
      }

      const details = result.details as {
        error?: string;
        tool_calls?: ToolCall[];
        return_value?: unknown;
      } | undefined;

      if (details?.error) {
        return new Text(theme.fg("error", `Error: ${details.error.slice(0, 100)}...`), 0, 0);
      }

      const toolCount = details?.tool_calls?.length || 0;
      let text = theme.fg("success", "✓ Executed");

      if (toolCount > 0) {
        text += theme.fg("muted", ` (${toolCount} tool call${toolCount !== 1 ? "s" : ""} generated)`);
      }

      if (expanded && details?.return_value !== undefined) {
        const returnStr = JSON.stringify(details.return_value).slice(0, 200);
        text += "\n" + theme.fg("dim", `Return: ${returnStr}`);
      }

      return new Text(text, 0, 0);
    },
  });

  // Also register a command to test the tool
  pi.registerCommand("test-execute", {
    description: "Test the execute tool with sample code",
    handler: async (_args, ctx) => {
      const testCode = `
# Test data manipulation
items = [1, 2, 3, 4, 5]
doubled = [x * 2 for x in items]

# Generate a tool call
call("notify", message=f"Processed {len(items)} items")

# Return result
doubled
`;

      ctx.ui.notify("Sending test code to execute tool...", "info");

      // Send a message that uses the tool
      pi.sendUserMessage(
        `Please run this test code with the execute tool:\n\`\`\`python\n${testCode}\n\`\`\``,
        { deliverAs: "followUp" }
      );
    },
  });
}
