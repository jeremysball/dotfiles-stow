/**
 * Pi Todo Extension - Ad-hoc Task Tracking
 *
 * IMPORTANT: This extension is ONLY for ad-hoc situations where you're quickly
 * finding bugs or making small changes WITHOUT a formal spec. For spec-driven
 * development, use the prd-exec system instead.
 */

import type { ExtensionAPI, ExtensionContext, Theme } from "@mariozechner/pi-coding-agent";
import { truncateToWidth } from "@mariozechner/pi-tui";

interface Todo {
	id: number;
	text: string;
	done: boolean;
}

interface TodoDetails {
	action: "list" | "add" | "complete" | "uncomplete" | "remove" | "clear" | "prioritize";
	todos: Todo[];
	nextId: number;
	targetIds?: number[];
	error?: string;
}

type TodoAction = TodoDetails["action"];

interface TodoParamsInput {
	action: TodoAction;
	text?: string;
	id?: number;
	ids?: number[];
}

const TodoParams: any = {
	type: "object",
	properties: {
		action: { type: "string", enum: ["list", "add", "complete", "uncomplete", "remove", "clear", "prioritize"] },
		text: { type: "string", description: "Todo text (for add)" },
		id: { type: "number", description: "Todo ID (for complete/uncomplete/remove)" },
		ids: { type: "array", items: { type: "number" }, description: "Todo IDs in priority order (for prioritize)" },
	},
	required: ["action"],
	additionalProperties: false,
};

// In-memory state (reconstructed from session on load)
let todos: Todo[] = [];
let nextId = 1;

/**
 * Reconstruct state from session entries.
 * Scans tool results for this tool and applies them in order.
 */
const reconstructState = (ctx: ExtensionContext) => {
	todos = [];

	for (const entry of ctx.sessionManager.getBranch()) {
		if (entry.type !== "message") continue;
		const msg = entry.message;
		if (msg.role !== "toolResult" || msg.toolName !== "todo") continue;

		const details = msg.details as TodoDetails | undefined;
		if (details) {
			todos = details.todos;
		}
	}

	nextId = todos.length > 0 ? Math.max(...todos.map((t) => t.id)) + 1 : 1;
};

function createComponent(text: string) {
	return {
		render: (width: number) => text.split("\n").map((line) => truncateToWidth(line, width)),
		invalidate: () => undefined,
	};
}

function renderTodoList(theme: Theme, todoList: Todo[], expanded: boolean): ReturnType<typeof createComponent> {
	if (todoList.length === 0) {
		return createComponent(theme.fg("dim", "No todos"));
	}

	const done = todoList.filter((t) => t.done).length;
	let listText = theme.fg("muted", `${done}/${todoList.length} todos:`);
	const display = expanded ? todoList : todoList.slice(0, 5);
	for (const t of display) {
		const check = t.done ? theme.fg("success", "✓") : theme.fg("dim", "○");
		const itemText = t.done ? theme.fg("dim", t.text) : theme.fg("muted", t.text);
		listText += `\n${check} ${theme.fg("accent", `#${t.id}`)} ${itemText}`;
	}
	if (!expanded && todoList.length > 5) {
		listText += `\n${theme.fg("dim", `... ${todoList.length - 5} more`)}`;
	}
	return createComponent(listText);
}

export default function (pi: ExtensionAPI) {
	// Reconstruct state on session events
	pi.on("session_start", async (_event, ctx) => reconstructState(ctx));
	pi.on("session_switch", async (_event, ctx) => reconstructState(ctx));
	pi.on("session_fork", async (_event, ctx) => reconstructState(ctx));
	pi.on("session_tree", async (_event, ctx) => reconstructState(ctx));

	// Register the todo tool for the LLM
	pi.registerTool<any, TodoDetails>({
		name: "todo",
		label: "Todo",
		description:
			"Manage an ad-hoc todo list for quick bug fixes and small changes. " +
			"ONLY use this for informal task tracking - NOT for spec-driven development (use prd-exec instead). " +
			"Actions: list (show all), add (text), complete (id), uncomplete (id), remove (id), clear (all), prioritize (ids in order).",
		promptSnippet: "Manage the ad-hoc todo list for quick fixes and changes",
		promptGuidelines: [
			"Use todo tool when the user mentions multiple quick fixes or changes in one message",
			"Create todos for each distinct bug fix or small change requested",
			"Mark todos complete as you finish each task",
			"The todo list prints to chat automatically when items are completed",
			"For spec-driven development with PRDs, use prd-exec instead of this tool",
		],
		parameters: TodoParams,

		async execute(_toolCallId, params: TodoParamsInput, _signal, _onUpdate, ctx) {
			// Reconstruct state at the start of each call to handle parallel tool calls correctly
			reconstructState(ctx);

			switch (params.action) {
				case "list": {
					const listText = todos.length
						? todos.map((t) => `[${t.done ? "x" : " "}] #${t.id}: ${t.text}`).join("\n")
						: "No todos";
					return {
						content: [{ type: "text", text: listText }],
						details: { action: "list", todos: [...todos], nextId } as TodoDetails,
					};
				}

				case "add": {
					if (!params.text) {
						return {
							content: [{ type: "text", text: "Error: text required for add" }],
							details: { action: "add", todos: [...todos], nextId, error: "text required" } as TodoDetails,
						};
					}
					const newTodo: Todo = { id: nextId++, text: params.text, done: false };
					todos.push(newTodo);
					return {
						content: [{ type: "text", text: `Added todo #${newTodo.id}: ${newTodo.text}` }],
						details: { action: "add", todos: [...todos], nextId } as TodoDetails,
					};
				}

				case "complete": {
					if (params.id === undefined) {
						return {
							content: [{ type: "text", text: "Error: id required for complete" }],
							details: {
								action: "complete",
								todos: [...todos],
								nextId,
								error: "id required",
							} as TodoDetails,
						};
					}
					const todo = todos.find((t) => t.id === params.id);
					if (!todo) {
						return {
							content: [{ type: "text", text: `Todo #${params.id} not found` }],
							details: {
								action: "complete",
								todos: [...todos],
								nextId,
								error: `#${params.id} not found`,
							} as TodoDetails,
						};
					}
					todo.done = true;
					return {
						content: [{ type: "text", text: `Completed todo #${todo.id}: ${todo.text}` }],
						details: { action: "complete", todos: [...todos], nextId, targetIds: [todo.id] } as TodoDetails,
					};
				}

				case "uncomplete": {
					if (params.id === undefined) {
						return {
							content: [{ type: "text", text: "Error: id required for uncomplete" }],
							details: {
								action: "uncomplete",
								todos: [...todos],
								nextId,
								error: "id required",
							} as TodoDetails,
						};
					}
					const todo = todos.find((t) => t.id === params.id);
					if (!todo) {
						return {
							content: [{ type: "text", text: `Todo #${params.id} not found` }],
							details: {
								action: "uncomplete",
								todos: [...todos],
								nextId,
								error: `#${params.id} not found`,
							} as TodoDetails,
						};
					}
					todo.done = false;
					return {
						content: [{ type: "text", text: `Reopened todo #${todo.id}: ${todo.text}` }],
						details: { action: "uncomplete", todos: [...todos], nextId, targetIds: [todo.id] } as TodoDetails,
					};
				}

				case "remove": {
					if (params.id === undefined) {
						return {
							content: [{ type: "text", text: "Error: id required for remove" }],
							details: {
								action: "remove",
								todos: [...todos],
								nextId,
								error: "id required",
							} as TodoDetails,
						};
					}
					const todoIndex = todos.findIndex((t) => t.id === params.id);
					if (todoIndex === -1) {
						return {
							content: [{ type: "text", text: `Todo #${params.id} not found` }],
							details: {
								action: "remove",
								todos: [...todos],
								nextId,
								error: `#${params.id} not found`,
							} as TodoDetails,
						};
					}
					const removedTodo = todos[todoIndex];
					todos.splice(todoIndex, 1);
					return {
						content: [{ type: "text", text: `Removed todo #${removedTodo.id}: ${removedTodo.text}` }],
						details: {
							action: "remove",
							todos: [...todos],
							nextId,
							targetIds: [removedTodo.id],
						} as TodoDetails,
					};
				}

				case "prioritize": {
					const ids = params.ids ?? [];
					if (ids.length === 0) {
						return {
							content: [{ type: "text", text: "Error: ids array required for prioritize" }],
							details: {
								action: "prioritize",
								todos: [...todos],
								nextId,
								error: "ids array required",
							} as TodoDetails,
						};
					}

					const notFound = ids.filter((id) => !todos.find((t) => t.id === id));
					if (notFound.length > 0) {
						return {
							content: [{ type: "text", text: `Todo IDs not found: ${notFound.join(", ")}` }],
							details: {
								action: "prioritize",
								todos: [...todos],
								nextId,
								error: `IDs not found: ${notFound.join(", ")}`,
							} as TodoDetails,
						};
					}

					const todoMap = new Map(todos.map((t) => [t.id, t] as const));
					const prioritizedTodos: Todo[] = ids.map((id) => todoMap.get(id)!);
					const remainingTodos = todos.filter((t) => !ids.includes(t.id));
					todos = [...prioritizedTodos, ...remainingTodos];

					return {
						content: [{ type: "text", text: `Reordered ${ids.length} todos by priority` }],
						details: { action: "prioritize", todos: [...todos], nextId, targetIds: ids } as TodoDetails,
					};
				}

				case "clear": {
					const count = todos.length;
					todos = [];
					nextId = 1;
					return {
						content: [{ type: "text", text: `Cleared all ${count} todos` }],
						details: { action: "clear", todos: [], nextId: 1 } as TodoDetails,
					};
				}

				default:
					return {
						content: [{ type: "text", text: `Unknown action: ${params.action}` }],
						details: {
							action: "list",
							todos: [...todos],
							nextId,
							error: `unknown action: ${params.action}`,
						} as TodoDetails,
					};
			}
		},

		renderCall(args: TodoParamsInput, theme) {
			let text = theme.fg("toolTitle", theme.bold("todo ")) + theme.fg("muted", args.action);
			if (args.text) text += ` ${theme.fg("dim", `"${args.text}"`)}`;
			if (args.id !== undefined) text += ` ${theme.fg("accent", `#${args.id}`)}`;
			if (args.ids) text += ` ${theme.fg("accent", args.ids.map((id) => `#${id}`).join(", "))}`;
			return createComponent(text);
		},

		renderResult(result, { expanded }, theme) {
			const details = result.details as TodoDetails | undefined;
			if (!details) {
				const text = result.content[0];
				return createComponent(text?.type === "text" ? text.text : "");
			}

			if (details.error) {
				return createComponent(theme.fg("error", `Error: ${details.error}`));
			}

			const todoList = details.todos;

			switch (details.action) {
				case "list":
					return renderTodoList(theme, todoList, expanded);

				case "add": {
					const added = todoList[todoList.length - 1];
					return createComponent(
						theme.fg("success", "Added ") + theme.fg("accent", `#${added.id}`) + " " + theme.fg("muted", added.text),
					);
				}

				case "complete": {
					const completedId = details.targetIds?.[0];
					const completedTodo = todoList.find((t) => t.id === completedId);
					if (completedTodo) {
						return createComponent(
							theme.fg("success", "Completed ") +
								theme.fg("accent", `#${completedTodo.id}`) +
								" " +
								theme.fg("muted", completedTodo.text),
						);
					}
					return createComponent(theme.fg("success", "Completed"));
				}

				case "uncomplete":
					return createComponent(theme.fg("warning", "Reopened todo"));

				case "remove":
					return createComponent(theme.fg("warning", "Removed todo"));

				case "prioritize": {
					const count = details.targetIds?.length ?? 0;
					return createComponent(theme.fg("accent", `Reordered ${count} todos`));
				}

				case "clear":
					return createComponent(theme.fg("success", "Cleared all todos"));
			}
		},
	});

	// Register the /todos command for users
	pi.registerCommand("todos", {
		description: "Show all active todos (for ad-hoc tasks only - use prd-exec for spec-driven work)",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				console.log(todos.length ? todos.map((t) => `[${t.done ? "x" : " "}] #${t.id}: ${t.text}`).join("\n") : "No todos");
				return;
			}

			const listText = todos.length
				? todos.map((t) => `[${t.done ? "x" : " "}] #${t.id}: ${t.text}`).join("\n")
				: "No todos";
			ctx.ui.notify(listText, "info");
		},
	});

	pi.registerCommand("todo-clear", {
		description: "Clear all todos",
		handler: async (_args, ctx) => {
			const count = todos.length;
			todos = [];
			nextId = 1;
			ctx.ui.notify(`Cleared ${count} todos`, "info");
		},
	});
}
