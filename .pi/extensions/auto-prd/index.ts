import type { ExtensionAPI, SessionEntry } from "@mariozechner/pi-coding-agent";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";

type CommandName =
	| "prds-get"
	| "prd-start"
	| "prd-next"
	| "prd-exec"
	| "prd-update-progress"
	| "prd-update-decisions"
	| "prd-done"
	| "prd-close";

type RouteDecision =
	| "yes"
	| "noop"
	| "prds-get"
	| "prd-start"
	| "prd-next"
	| "prd-exec"
	| "prd-update-progress"
	| "prd-update-decisions"
	| "prd-done";

type CycleState =
	| "needs-list"
	| "needs-selection"
	| "started"
	| "needs-exec"
	| "exec-pending"
	| "waiting-work"
	| "ready-progress"
	| "after-progress"
	| "ready-decisions"
	| "after-decisions"
	| "ready-done"
	| "ready-close"
	| "finished"
	| "closed";

type Signal =
	| { kind: "prds-get" }
	| { kind: "prd-start"; issueId?: string }
	| { kind: "prd-next" }
	| { kind: "prd-exec" }
	| { kind: "prd-update-progress" }
	| { kind: "prd-update-decisions" }
	| { kind: "prd-done" }
	| { kind: "prd-close" }
	| { kind: "exec-confirmed" }
	| { kind: "ready-progress" }
	| { kind: "ready-decisions" }
	| { kind: "ready-done" }
	| { kind: "ready-close" };

type ExecutionPlanSummary = {
	file: string;
	issueId: string;
	pendingTasks: number;
	completedTasks: number;
	totalTasks: number;
	nextTask?: string;
	mtimeMs: number;
	planFileCount: number;
};

type PrdMilestoneSummary = {
	file: string;
	declaredMilestones: number;
	highestMilestone: number;
	planFileCount: number;
	hasUnplannedMilestones: boolean;
	mtimeMs: number;
};

type StateVisitMap = Record<CycleState, number>;

type WorkflowSnapshot = {
	state: CycleState;
	issueId?: string;
	plan?: ExecutionPlanSummary | null;
	prdMilestones?: PrdMilestoneSummary | null;
	signals: Signal[];
	stateVisits: StateVisitMap;
};

type RegisteredCommand = {
	name: string;
	source?: "extension" | "prompt" | "skill";
	path?: string;
};

const CYCLE_STATE_ORDER: CycleState[] = [
	"needs-list",
	"needs-selection",
	"started",
	"needs-exec",
	"exec-pending",
	"waiting-work",
	"ready-progress",
	"after-progress",
	"ready-decisions",
	"after-decisions",
	"ready-done",
	"ready-close",
	"finished",
	"closed",
];

function createStateVisitMap(): StateVisitMap {
	return Object.fromEntries(CYCLE_STATE_ORDER.map((state) => [state, 0])) as StateVisitMap;
}

function recordStateVisit(stateVisits: StateVisitMap, state: CycleState): void {
	stateVisits[state] += 1;
}

function formatStateVisitTable(stateVisits: StateVisitMap): string {
	const rows = CYCLE_STATE_ORDER.filter((state) => stateVisits[state] > 0);
	if (rows.length === 0) {
		return "";
	}

	const totalVisits = rows.reduce((sum, state) => sum + stateVisits[state], 0);
	const lines = [
		"### Workflow state visits",
		"",
		"| State | Visits |",
		"| --- | ---: |",
		...rows.map((state) => `| \`${state}\` | ${stateVisits[state]} |`),
		`| Total | ${totalVisits} |`,
	];

	return lines.join("\n");
}

function appendWorkflowStats(message: string, stateVisits: StateVisitMap): string {
	const table = formatStateVisitTable(stateVisits);
	return table ? `${message}\n\n${table}` : message;
}

let cycleAutomationArmed = false;

function isTerminalWorkflow(workflow: WorkflowSnapshot): boolean {
	return (workflow.state === "finished" || workflow.state === "closed") && (!workflow.plan || workflow.plan.pendingTasks === 0);
}

const COMMAND_PATTERNS: Array<{ name: CommandName; regex: RegExp }> = [
	{ name: "prds-get", regex: /\/(?:skill:)?prds-get\b/i },
	{ name: "prd-start", regex: /\/(?:skill:)?prd-start\b(?:\s+(\d+))?/i },
	{ name: "prd-next", regex: /\/(?:skill:)?prd-next\b/i },
	{ name: "prd-exec", regex: /\/(?:skill:)?prd-exec\b(?:\s+(\d+))?/i },
	{ name: "prd-update-progress", regex: /\/(?:skill:)?prd-update-progress\b/i },
	{ name: "prd-update-decisions", regex: /\/(?:skill:)?prd-update-decisions\b/i },
	{ name: "prd-done", regex: /\/(?:skill:)?prd-done\b/i },
	{ name: "prd-close", regex: /\/(?:skill:)?prd-close\b/i },
];

const READINESS_PATTERNS: Array<{ regex: RegExp; signal: Signal }> = [
	{
		regex: /\b(?:PRD(?:\s*#)?\s*\d+\s+is(?:\s+already)?\s+complete|no next task(?: remains| to recommend)?|no execution plan(?: remains| left)(?:\s+to\s+create\s+or\s+update)?|fully checked off|(?:run|use)\s+\/prd-done|finalize and close)\b/i,
		signal: { kind: "ready-done" },
	},
	{
		regex: /\b(?:task implementation complete|implementation complete|finished implementing|completed the task|work is complete|ready to update progress)\b/i,
		signal: { kind: "ready-progress" },
	},
	{
		regex: /\b(?:design decision|architecture decision|decision made|made the decision|ready to update decisions)\b/i,
		signal: { kind: "ready-decisions" },
	},
	{
		regex: /\b(?:all tasks complete|everything is complete|all requirements implemented|ready to finish|ready to merge)\b/i,
		signal: { kind: "ready-done" },
	},
	{
		regex: /\b(?:duplicate|out of scope|no longer needed|abandoned)\b/i,
		signal: { kind: "ready-close" },
	},
	{
		regex: /^\s*yes(?:[\s,]+continue)?\s*$/i,
		signal: { kind: "exec-confirmed" },
	},
];

const SKILL_DOC_RE = /^<skill\s+name=|^---\nname:\s+/i;
const BRANCH_PRD_RE = /(?:feature\/)?prd-(\d+)/i;
const ISSUE_RE = /\b(?:PRD\s*#?|issue\s*#?|#)(\d+)\b/i;
const EXEC_PLAN_FILE_RE = /^execution-plan-(\d+)(?:-[^.]+)?\.md$/i;
const CHECKBOX_RE = /^\s*[-*]\s*\[([ xX])\]\s*(.+)$/;
const USING_PRDS_SKILL_PATH = join(process.env.HOME ?? "/home/node", ".pi", "skills", "using-prds", "SKILL.md");

let cachedUsingPrdsSkillContext: string | null | undefined;

function loadUsingPrdsSkillContext(): string | null {
	if (cachedUsingPrdsSkillContext !== undefined) return cachedUsingPrdsSkillContext;

	try {
		const content = readFileSync(USING_PRDS_SKILL_PATH, "utf8");
		cachedUsingPrdsSkillContext = stripFrontmatter(content).trim();
	} catch {
		cachedUsingPrdsSkillContext = null;
	}

	return cachedUsingPrdsSkillContext;
}

function extractAssistantPromptText(messages: unknown): string {
	if (!Array.isArray(messages)) return "";

	for (let index = messages.length - 1; index >= 0; index--) {
		const message = messages[index];
		if (!message || typeof message !== "object") continue;

		const record = message as Record<string, unknown>;
		if (record.role === "assistant") {
			return toText(record.content ?? record.message ?? "");
		}
	}

	return "";
}

const DECISION_ALREADY_CAPTURED_RE = /\b(?:already (?:recorded|updated|captured|includes?|contains?|captures?)|no new (?:PRD )?(?:decision|change) to record|nothing new to record|the PRD now records|the current decision log says)\b/i;
const PROGRESS_ALREADY_CAPTURED_RE = /\b(?:already (?:updated|recorded|captured|reflected)|no new progress to record|nothing new to update|progress already(?: been)? (?:updated|recorded|captured)|progress is already up to date)\b/i;
const EXECUTION_HANDOFF_PROMPT_PATTERNS: RegExp[] = [
	/\bnext task recommendation\b/i,
	/\brecommended task\b/i,
	/\bnext task\b/i,
	/\bdo you want to work on this task\?\s*$/i,
	/\bwork on this task\?\s*(?:\(yes\/no\))?\s*$/i,
	/\bready to start\?\s*(?:\(yes to begin implementation\))?\s*$/i,
	/\bready to implement\?\s*$/i,
	/\bstart with step\s+\d+\?\s*(?:\([^)]*\))?\s*$/i,
];
const CONFIRMATION_PROMPT_PATTERNS: RegExp[] = [
	/\bdo you want to work on this task\?\s*$/i,
	/\bwork on this task\?\s*(?:\(yes\/no\))?\s*$/i,
	/\bready to start\?\s*(?:\(yes to begin implementation\))?\s*$/i,
	/\bready to implement\?\s*$/i,
	/\bstart with step\s+\d+\?\s*(?:\([^)]*\))?\s*$/i,
	/\bwould you like to continue\?\s*$/i,
	/\bshould we continue\?\s*$/i,
];

function assistantSignalsRedundantUpdate(text: string): boolean {
	return DECISION_ALREADY_CAPTURED_RE.test(text) || PROGRESS_ALREADY_CAPTURED_RE.test(text);
}

function normalizePromptText(text: string): string {
	return text.replace(/[\*_`]/g, "").replace(/\s+/g, " ").trim();
}

function assistantRequestsTaskExecution(workflow: WorkflowSnapshot, text: string): boolean {
	// Task-handoff prompts should become prd-exec before the generic yes/no path.
	// The same wording can later reappear during exec-pending, where the confirmation helper handles it.
	if (workflow.state === "exec-pending" || assistantSignalsExplicitCompletion(text)) {
		return false;
	}

	if (workflow.state === "needs-exec") {
		return true;
	}

	const normalized = normalizePromptText(text);
	return EXECUTION_HANDOFF_PROMPT_PATTERNS.some((regex) => regex.test(normalized));
}

function assistantAsksForConfirmation(text: string): boolean {
	const normalized = normalizePromptText(text);
	return CONFIRMATION_PROMPT_PATTERNS.some((regex) => regex.test(normalized));
}

const EXPLICIT_COMPLETION_PATTERN = /\b(?:PRD(?:\s*#)?\s*\d+\s+is(?:\s+already)?\s+complete|no next task(?: remains| to recommend)?|no execution plan(?: remains| left)(?:\s+to\s+create\s+or\s+update)?|fully checked off|(?:run|use)\s+\/prd-done|finalize and close)\b/i;

function assistantSignalsExplicitCompletion(text: string): boolean {
	const normalized = normalizePromptText(text);
	return EXPLICIT_COMPLETION_PATTERN.test(normalized);
}

const ROUTE_DECISION_SYSTEM_PROMPT = [
	"You are the routing brain for auto-prd.",
	"You are running autonomously inside an explicit /prd-cycle session.",
	"Use your best judgment and the PRD guidance to choose the action that best advances the work.",
	"Use only the visible assistant text; ignore hidden reasoning or prompt text.",
	"When the visible assistant text is a design question or asks for a recommendation, choose the PRD action that records or advances that decision.",
	"If the visible assistant text says the decision or progress is already recorded or there is nothing new to record, choose prd-next instead of repeating an update command.",
	"If the visible assistant text says the PRD is complete, there is no next task, or it tells you to run /prd-done, output prd-done.",
	"Use prd-exec only when the workflow state is needs-exec or the visible assistant text is selecting the next task to begin.",
	"Use yes only after prd-exec has already been issued and the assistant is confirming that execution should begin.",
	"Use prd-next after a completion report when the current milestone is complete but the PRD may still have more work.",
	"Use prd-done only when the visible assistant text explicitly says the entire PRD is fully complete.",
	"Use noop only when there is truly no PRD action to take.",
	"Do not use noop as a safe default for design questions, confirmation prompts, or next-step requests.",
	"Never output prd-close.",
	"Return only the token, no explanation.",
].join(" ");

function buildRouteDecisionPrompt(workflow: WorkflowSnapshot, assistantText: string): string {
	const planLines = workflow.plan
		? [
			`- plan file: ${workflow.plan.file}`,
			`- open tasks: ${workflow.plan.pendingTasks}`,
			`- completed tasks: ${workflow.plan.completedTasks}`,
			`- total tasks: ${workflow.plan.totalTasks}`,
			workflow.plan.nextTask ? `- next task: ${workflow.plan.nextTask}` : "- next task: none",
		]
		: ["- plan file: unavailable"];

	if (workflow.prdMilestones) {
		planLines.push(
			`- PRD milestone headings: ${workflow.prdMilestones.declaredMilestones}`,
			`- execution plan files discovered: ${workflow.prdMilestones.planFileCount}`,
			`- unplanned milestones remain: ${workflow.prdMilestones.hasUnplannedMilestones ? "yes" : "no"}`,
		);
	}
	const promptLines = [
		"Auto-prd routing decision request.",
		"Choose the next PRD action or reply.",
		"Use only the visible assistant text; ignore hidden reasoning or prompt text.",
		"If the assistant is selecting the next task or asking to start it, output prd-exec.",
		"If the visible assistant text is asking for a bare confirmation after prd-exec has already been sent, output yes.",
		"Examples of confirmation prompts include 'Ready to Implement?' and 'Start with Step 1?'.",
		"If the visible assistant text is asking for a design recommendation or decision, choose the PRD action that records or advances that decision.",
		"If the visible assistant text says the decision or progress is already recorded or there is nothing new to record, choose prd-next instead of repeating an update command.",
		"If the visible assistant text says the PRD is complete, there is no next task, or it tells you to run /prd-done, output prd-done.",
		"If the assistant just finished work on a milestone, output prd-next unless the text explicitly says the entire PRD is complete.",
		"Only output noop when the assistant text truly does not require a PRD action.",
		"Do not use noop as a default answer for uncertain prompts.",
		"Never output prd-close.",
	];
	const usingPrdsSkillContext = loadUsingPrdsSkillContext();
	const workflowStateNotes: string[] = [];

	if (workflow.state === "needs-exec") {
		workflowStateNotes.push("State note: send prd-exec now; do not answer the next-task handoff with yes.");
	}

	if (workflow.state === "exec-pending") {
		workflowStateNotes.push("State note: the execution command is already pending; answer the confirmation with yes.");
	}

	if (usingPrdsSkillContext) {
		promptLines.push("", "Injected using-prds skill context:", usingPrdsSkillContext);
	}

	promptLines.push(
		"",
		`Workflow state: ${workflow.state}`,
		...workflowStateNotes,
		`Issue: ${workflow.issueId ?? "unknown"}`,
		...planLines,
		"",
		"Latest assistant text:",
		assistantText.trim() || "<empty>",
	);

	return promptLines.join("\n");
}

function parseRouteDecision(text: string): RouteDecision | null {
	const match = text.match(/\b(yes|noop|prds-get|prd-start|prd-next|prd-exec|prd-update-progress|prd-update-decisions|prd-done)\b/i);
	if (!match) return null;
	return match[1].toLowerCase() as RouteDecision;
}

function routeForwardForIncompleteWorkflow(workflow: WorkflowSnapshot): Exclude<CommandName, "prd-close"> | null {
	if (workflow.plan && workflow.plan.pendingTasks > 0) {
		return workflow.issueId ? "prd-exec" : "prds-get";
	}

	if (workflow.prdMilestones?.hasUnplannedMilestones) {
		return "prd-next";
	}

	return null;
}

function fallbackRouteDecision(workflow: WorkflowSnapshot): RouteDecision | null {
	switch (workflow.state) {
		case "needs-list":
			return "prds-get";
		case "needs-selection":
			return workflow.issueId ? "prd-start" : "prds-get";
		case "needs-exec":
			return workflow.issueId ? "prd-exec" : "prds-get";
		case "exec-pending":
			return "yes";
		case "started":
			return workflow.plan && workflow.plan.pendingTasks > 0 ? "prd-exec" : "prd-next";
		case "waiting-work":
			return routeForwardForIncompleteWorkflow(workflow) ?? "prd-next";
		case "ready-progress":
			return "prd-update-progress";
		case "after-progress":
			return workflow.plan && workflow.plan.pendingTasks > 0 ? "prd-exec" : "prd-next";
		case "ready-decisions":
			return "prd-update-decisions";
		case "after-decisions":
			return "prd-next";
		case "ready-done":
		case "ready-close": {
			const continueDecision = routeForwardForIncompleteWorkflow(workflow);
			return continueDecision ?? "prd-done";
		}
		case "finished":
		case "closed": {
			const continueDecision = routeForwardForIncompleteWorkflow(workflow);
			return continueDecision ?? null;
		}
		default:
			return null;
	}
}

async function decideRouteWithPi(workflow: WorkflowSnapshot, assistantText: string, cwd: string, ctx: WorkflowCommandContext): Promise<RouteDecision | null> {
	const assistantExplicitCompletion = assistantSignalsExplicitCompletion(assistantText);
	const assistantHasRedundantUpdateSignal = assistantSignalsRedundantUpdate(assistantText);
	const assistantRequestsExecution = assistantRequestsTaskExecution(workflow, assistantText);

	if (assistantExplicitCompletion) {
		return workflow.state === "finished" || workflow.state === "closed" ? null : "prd-done";
	}

	// Task-selection handoffs should skip the generic yes/no path and go straight to execution.
	if (assistantRequestsExecution) {
		return workflow.issueId ? "prd-exec" : "prds-get";
	}

	// Confirmation prompts should never go through the LLM; they always map to yes.
	if (assistantAsksForConfirmation(assistantText)) {
		// Short-circuiting confirmation prompt to yes (debug info removed)
		return "yes";
	}

	if (assistantHasRedundantUpdateSignal) {
		// Short-circuiting redundant update prompt to prd-next (debug info removed)
		return "prd-next";
	}

	const workingMessage = "shelling out to LLM for routing decision";
	ctx.ui.notify(workingMessage, "info");
	ctx.ui.setWorkingMessage?.(workingMessage);

	try {
		const modelArgs = ctx.model ? ["--provider", ctx.model.provider, "--model", ctx.model.id] : [];
		const result = await new Promise<{ stdout: string; stderr: string; code: number | null; signal: string | null; error?: Error }>((resolve) => {
			const child = spawn(
				"pi",
				[
					"-p",
					...modelArgs,
					"--no-session",
					"--no-extensions",
					"--no-skills",
					"--no-prompt-templates",
					"--no-themes",
					"--no-tools",
					"--thinking",
					"off",
					"--system-prompt",
					ROUTE_DECISION_SYSTEM_PROMPT,
				],
				{
					cwd,
					env: process.env,
					stdio: ["pipe", "pipe", "pipe"],
				},
			);

			let stdout = "";
			let stderr = "";
			child.stdout.on("data", (chunk: Buffer) => {
				stdout += chunk.toString("utf8");
			});
			child.stderr.on("data", (chunk: Buffer) => {
				stderr += chunk.toString("utf8");
			});
			child.on("error", (error) => {
				resolve({ stdout, stderr, code: null, signal: null, error: error instanceof Error ? error : new Error(String(error)) });
			});
			child.on("close", (code, signal) => {
				resolve({ stdout, stderr, code, signal });
			});
			child.stdin.end(buildRouteDecisionPrompt(workflow, assistantText), "utf8");
		});

		if (result.error) {
			ctx.ui.notify("Route decision failed: " + result.error, "error");
			return null;
		}

		if (result.code !== 0) {
			ctx.ui.notify("Route decision failed (exit " + result.code + "): " + result.stderr, "error");
			return null;
		}

		const decision = parseRouteDecision(result.stdout.trim()) ?? parseRouteDecision(result.stderr.trim());

		if (assistantHasRedundantUpdateSignal && (decision === "prd-update-decisions" || decision === "prd-update-progress")) {
			// Skipping redundant update command (already in prd-update-progress state)
			return "prd-next";
		}

		if (decision && decision !== "noop") {
			return decision;
		}

		const fallbackDecision = assistantHasRedundantUpdateSignal ? "prd-next" : fallbackRouteDecision(workflow);
		if (fallbackDecision) {
			ctx.ui.notify("Falling back to " + fallbackDecision + " (workflow state: " + workflow.state + ")", "info");
			return fallbackDecision;
		}

		if (!decision) {
			ctx.ui.notify("Could not parse LLM output for route decision", "error");
			return null;
		}
		return null;
	} finally {
		ctx.ui.setWorkingMessage?.();
	}
}

function emitVisibleRouteMessage(pi: ExtensionAPI, commandText: string, source: "skill" | "command"): void {
	try {
		pi.sendMessage(
			{
				customType: "auto-prd-route",
				content: commandText,
				display: true,
				details: { commandText, source },
			},
			{ triggerTurn: false },
		);
	} catch {
		// Best-effort only; route dispatch still continues below.
	}
}

function applyRouteDecision(
	pi: ExtensionAPI,
	decision: RouteDecision,
	workflow: WorkflowSnapshot,
	ctx: WorkflowCommandContext,
	issueId?: string,
	wasIdle?: boolean,
	terminalCompletion = false,
): boolean {
	const delivery = wasIdle ?? ctx.isIdle() ? undefined : { deliverAs: "steer" as const };
	const dispatchCommand = (canonical: CommandName, extraArgs: string[] = []): boolean => {
		ctx.ui.notify(`Dispatching ${canonical}...`, "info");
		const registered = resolveRegisteredCommand(pi, canonical);
		if (!registered) {
			ctx.ui.notify(`Could not find /${canonical}. Make sure PRD skills are loaded and skill commands are enabled.`, "error");
			return false;
		}

		const commandText = buildSlashCommand(registered.name, extraArgs);
		ctx.ui.notify(`Resolved to: ${commandText} (source: ${registered.source})`, "info");
		if (registered.source === "skill" || registered.name.startsWith("skill:")) {
			try {
				emitVisibleRouteMessage(pi, commandText, "skill");
				ctx.ui.notify("Expanding skill command...", "info");
				const expandedText = expandSkillCommand(registered, extraArgs);
				ctx.ui.notify(`Sending expanded skill (${expandedText.length} chars)`, "info");
				pi.sendUserMessage(expandedText, delivery);
				ctx.ui.notify("Skill command sent successfully", "info");
				return true;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.ui.notify(`Failed to expand ${commandText}: ${message}`, "error");
				return false;
			}
		}

		ctx.ui.notify(`Sending simple command: ${commandText}`, "info");
		pi.sendUserMessage(commandText, delivery);
		ctx.ui.notify("Simple command sent successfully", "info");
		return true;
	};

	const notifyRoute = (commandText: string) => {
		ctx.ui.notify(`Auto-prd routed to ${commandText}.`, "info");
	};

	if (terminalCompletion && decision !== "prd-done" && decision !== "noop") {
		ctx.ui.notify(`Explicit completion detected; routing to /prd-done instead of /${decision}.`, "warning");
		return dispatchCommand("prd-done") ? (notifyRoute("/prd-done"), true) : false;
	}

	switch (decision) {
		case "noop":
			return false;
		case "yes":
			pi.sendUserMessage("yes", delivery);
			notifyRoute("yes");
			return true;
		case "prds-get":
			return dispatchCommand("prds-get") ? (notifyRoute("/prds-get"), true) : false;
		case "prd-start": {
			const startIssueId = issueId ?? workflow.issueId;
			if (!startIssueId) {
				ctx.ui.notify("LLM chose /prd-start but no PRD issue id is available.", "warning");
				return false;
			}
			return dispatchCommand("prd-start", [startIssueId]) ? (notifyRoute(buildSlashCommand("prd-start", [startIssueId])), true) : false;
		}
		case "prd-next":
			return dispatchCommand("prd-next") ? (notifyRoute("/prd-next"), true) : false;
		case "prd-exec": {
			const execIssueId = issueId ?? workflow.issueId;
			if (!execIssueId) {
				ctx.ui.notify("LLM chose /prd-exec but no PRD issue id is available.", "warning");
				return false;
			}
			return dispatchCommand("prd-exec", [execIssueId]) ? (notifyRoute(buildSlashCommand("prd-exec", [execIssueId])), true) : false;
		}
		case "prd-update-progress":
			return dispatchCommand("prd-update-progress") ? (notifyRoute("/prd-update-progress"), true) : false;
		case "prd-update-decisions":
			return dispatchCommand("prd-update-decisions") ? (notifyRoute("/prd-update-decisions"), true) : false;
		case "prd-done": {
			if (!terminalCompletion) {
				const continueDecision = routeForwardForIncompleteWorkflow(workflow);
				if (continueDecision) {
					const extraArgs = continueDecision === "prd-exec" ? [issueId ?? workflow.issueId ?? ""].filter(Boolean) : [];
					const continuationText = buildSlashCommand(continueDecision, extraArgs);
					const reason = workflow.plan && workflow.plan.pendingTasks > 0
						? `${workflow.plan.pendingTasks} open task${workflow.plan.pendingTasks === 1 ? " remains" : "s remain"}`
						: workflow.prdMilestones?.hasUnplannedMilestones
							? "the PRD still has unplanned milestones"
							: "the workflow is not final yet";
					ctx.ui.notify(`LLM chose /prd-done but ${reason}. Routing to ${continuationText} instead.`, "warning");
					return dispatchCommand(continueDecision, extraArgs) ? (notifyRoute(continuationText), true) : false;
				}
			}

			return dispatchCommand("prd-done") ? (notifyRoute("/prd-done"), true) : false;
		}
	}
}

function toText(value: unknown): string {
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	if (Array.isArray(value)) {
		return value.map((item) => toText(item)).filter(Boolean).join("\n");
	}
	if (value && typeof value === "object") {
		const record = value as unknown as Record<string, unknown>;
		if (typeof record.text === "string") return record.text;
		if ("content" in record) return toText(record.content);
		if ("message" in record) return toText(record.message);
	}
	return "";
}

function entryText(entry: SessionEntry): string {
	if (entry.type !== "message") return "";
	const message = entry.message as unknown as Record<string, unknown>;
	if (typeof message.role !== "string") return "";

	if (message.role === "user" || message.role === "assistant" || message.role === "custom") {
		return toText(message.content ?? "");
	}

	if (message.role === "toolResult") {
		return toText(message.content ?? "");
	}

	return "";
}

function looksLikeSkillDoc(text: string): boolean {
	return SKILL_DOC_RE.test(text.trim()) || (text.includes("When to use:") && text.includes("Common Workflows"));
}

const SKILL_COMMAND_RE = /^<skill\s+name=["']([^"']+)["']/i;

function extractSkillDispatchSignal(text: string): Signal | null {
	const skillMatch = text.trim().match(SKILL_COMMAND_RE);
	const skillName = skillMatch?.[1];
	if (!skillName) return null;

	switch (skillName) {
		case "prds-get":
			return { kind: "prds-get" };
		case "prd-start":
			return { kind: "prd-start", issueId: extractIssueId(text) };
		case "prd-next":
		case "prd-exec":
		case "prd-update-progress":
		case "prd-update-decisions":
		case "prd-done":
		case "prd-close":
			return { kind: skillName } as Signal;
		default:
			return null;
	}
}

function extractIssueId(text: string): string | undefined {
	const branchMatch = text.match(BRANCH_PRD_RE);
	if (branchMatch?.[1]) return branchMatch[1];

	const issueMatch = text.match(ISSUE_RE);
	if (issueMatch?.[1]) return issueMatch[1];

	return undefined;
}

function globalRegex(regex: RegExp): RegExp {
	return new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`);
}

function extractSignals(text: string): Signal[] {
	const signals: Array<{ index: number; signal: Signal }> = [];

	for (const pattern of COMMAND_PATTERNS) {
		for (const match of text.matchAll(globalRegex(pattern.regex))) {
			const index = match.index ?? 0;
			if (pattern.name === "prds-get") {
				signals.push({ index, signal: { kind: "prds-get" } });
				continue;
			}

			if (pattern.name === "prd-start") {
				signals.push({ index, signal: { kind: "prd-start", issueId: match[1] ?? extractIssueId(text) } });
				continue;
			}

			signals.push({ index, signal: { kind: pattern.name } as Signal });
		}
	}

	for (const pattern of READINESS_PATTERNS) {
		for (const match of text.matchAll(globalRegex(pattern.regex))) {
			signals.push({ index: match.index ?? 0, signal: pattern.signal });
		}
	}

	signals.sort((left, right) => left.index - right.index);
	return signals.map((item) => item.signal);
}

const FSM_TRANSITIONS: Record<CycleState, Partial<Record<Signal["kind"], CycleState>>> = {
	"needs-list": {
		"prds-get": "needs-selection",
		"prd-start": "started",
	},
	"needs-selection": {
		"prds-get": "needs-selection",
		"prd-start": "started",
	},
	started: {
		"prd-next": "waiting-work",
		"prd-exec": "exec-pending",
		"exec-confirmed": "waiting-work",
		"ready-progress": "ready-progress",
		"ready-decisions": "ready-decisions",
		"ready-done": "ready-done",
		"ready-close": "ready-close",
	},
	"needs-exec": {
		"prd-exec": "exec-pending",
		"exec-confirmed": "waiting-work",
		"prd-next": "waiting-work",
	},
	"exec-pending": {
		"exec-confirmed": "waiting-work",
		"prd-next": "waiting-work",
	},
	"waiting-work": {
		"ready-progress": "ready-progress",
		"ready-decisions": "ready-decisions",
		"ready-done": "ready-done",
		"ready-close": "ready-close",
		"prd-update-progress": "after-progress",
		"prd-update-decisions": "after-decisions",
		"prd-done": "finished",
		"prd-close": "closed",
	},
	"ready-progress": {
		"prd-update-progress": "after-progress",
		"ready-decisions": "ready-decisions",
		"ready-done": "ready-done",
		"ready-close": "ready-close",
	},
	"after-progress": {
		"prd-next": "waiting-work",
		"prd-exec": "exec-pending",
	},
	"ready-decisions": {
		"prd-update-decisions": "after-decisions",
		"prd-next": "waiting-work",
	},
	"after-decisions": {
		"prd-next": "waiting-work",
	},
	"ready-done": {
		"prd-done": "finished",
	},
	"ready-close": {
		"prd-close": "closed",
	},
	finished: {},
	closed: {},
};

function advanceState(current: CycleState, signal: Signal): CycleState {
	return FSM_TRANSITIONS[current][signal.kind] ?? current;
}

function inferSessionSnapshot(entries: SessionEntry[], branchIssueId?: string): {
	state: CycleState;
	issueId?: string;
	signals: Signal[];
	stateVisits: StateVisitMap;
} {
	let state: CycleState = branchIssueId ? "started" : "needs-list";
	let issueId = branchIssueId;
	const signals: Signal[] = [];
	const stateVisits = createStateVisitMap();
	recordStateVisit(stateVisits, state);

	for (const entry of entries) {
		const text = entryText(entry);
		if (!text) continue;

		if (looksLikeSkillDoc(text)) {
			const skillSignal = extractSkillDispatchSignal(text);
			if (skillSignal) {
				signals.push(skillSignal);
				if (!branchIssueId && skillSignal.kind === "prd-start" && skillSignal.issueId) {
					issueId = skillSignal.issueId;
				}

				const nextState = advanceState(state, skillSignal);
				if (nextState !== state) {
					state = nextState;
					recordStateVisit(stateVisits, state);
				}
			}
			continue;
		}

		for (const signal of extractSignals(text)) {
			signals.push(signal);
			if (!branchIssueId && signal.kind === "prd-start" && signal.issueId) {
				issueId = signal.issueId;
			}

			const nextState = advanceState(state, signal);
			if (nextState !== state) {
				state = nextState;
				recordStateVisit(stateVisits, state);
			}
		}
	}

	if (state === "needs-list" && issueId) {
		state = "started";
		recordStateVisit(stateVisits, state);
	}

	return { state, issueId, signals, stateVisits };
}

function parseExecutionPlan(text: string): { pendingTasks: number; completedTasks: number; totalTasks: number; nextTask?: string } {
	let pendingTasks = 0;
	let completedTasks = 0;
	let totalTasks = 0;
	let nextTask: string | undefined;

	for (const line of text.split(/\r?\n/)) {
		const match = line.match(CHECKBOX_RE);
		if (!match) continue;
		totalTasks++;
		const checked = match[1].toLowerCase() === "x";
		if (checked) {
			completedTasks++;
			continue;
		}
		pendingTasks++;
		if (!nextTask) {
			nextTask = match[2].trim();
		}
	}

	return { pendingTasks, completedTasks, totalTasks, nextTask };
}

async function readExecutionPlanSummary(cwd: string, issueId?: string): Promise<ExecutionPlanSummary | null> {
	const prdsDir = join(cwd, "prds");
	let dirents;
	try {
		dirents = await readdir(prdsDir, { withFileTypes: true });
	} catch {
		return null;
	}

	const matches = dirents
		.filter((dirent) => dirent.isFile())
		.map((dirent) => dirent.name)
		.filter((name) => {
			const match = name.match(EXEC_PLAN_FILE_RE);
			return Boolean(match && (!issueId || match[1] === issueId));
		});

	if (matches.length === 0) {
		return null;
	}

	const summaries: ExecutionPlanSummary[] = [];
	for (const file of matches) {
		const fullPath = join(prdsDir, file);
		const fileStat = await stat(fullPath);
		const match = file.match(EXEC_PLAN_FILE_RE);
		if (!match) continue;

		const text = await readFile(fullPath, "utf8");
		const parsed = parseExecutionPlan(text);
		summaries.push({
			file,
			issueId: match[1],
			pendingTasks: parsed.pendingTasks,
			completedTasks: parsed.completedTasks,
			totalTasks: parsed.totalTasks,
			nextTask: parsed.nextTask,
			mtimeMs: fileStat.mtimeMs,
			planFileCount: matches.length,
		});
	}

	if (summaries.length === 0) {
		return null;
	}

	summaries.sort((left, right) => right.mtimeMs - left.mtimeMs);
	const combined = summaries.reduce(
		(acc, item) => ({
			pendingTasks: acc.pendingTasks + item.pendingTasks,
			completedTasks: acc.completedTasks + item.completedTasks,
			totalTasks: acc.totalTasks + item.totalTasks,
		}),
		{ pendingTasks: 0, completedTasks: 0, totalTasks: 0 },
	);
	const primary = summaries.find((item) => item.pendingTasks > 0) ?? summaries[0];

	return {
		file: primary.file,
		issueId: primary.issueId,
		pendingTasks: combined.pendingTasks,
		completedTasks: combined.completedTasks,
		totalTasks: combined.totalTasks,
		nextTask: primary.nextTask,
		mtimeMs: primary.mtimeMs,
		planFileCount: summaries.length,
	};
}

function parsePrdMilestones(text: string): number[] {
	const milestoneNumbers = new Set<number>();
	for (const match of text.matchAll(/^###\s+Milestone\s+(\d+)\b.*$/gim)) {
		milestoneNumbers.add(Number(match[1]));
	}
	return [...milestoneNumbers].sort((left, right) => left - right);
}

async function readPrdMilestoneSummary(cwd: string, issueId?: string, planFileCount = 0): Promise<PrdMilestoneSummary | null> {
	if (!issueId) return null;

	const prdsDir = join(cwd, "prds");
	let dirents;
	try {
		dirents = await readdir(prdsDir, { withFileTypes: true });
	} catch {
		return null;
	}

	const matches = dirents
		.filter((dirent) => dirent.isFile())
		.map((dirent) => dirent.name)
		.filter((name) => name.endsWith(".md") && !name.startsWith("execution-plan-") && name.startsWith(`${issueId}-`));

	if (matches.length === 0) {
		return null;
	}

	const summaries: PrdMilestoneSummary[] = [];
	for (const file of matches) {
		const fullPath = join(prdsDir, file);
		const fileStat = await stat(fullPath);
		const text = await readFile(fullPath, "utf8");
		const milestoneNumbers = parsePrdMilestones(text);
		if (milestoneNumbers.length === 0) {
			continue;
		}

		const highestMilestone = milestoneNumbers[milestoneNumbers.length - 1];
		summaries.push({
			file,
			declaredMilestones: milestoneNumbers.length,
			highestMilestone,
			planFileCount,
			hasUnplannedMilestones: highestMilestone > planFileCount,
			mtimeMs: fileStat.mtimeMs,
		});
	}

	if (summaries.length === 0) {
		return null;
	}

	summaries.sort((left, right) => right.mtimeMs - left.mtimeMs);
	return summaries[0];
}

async function inferWorkflowSnapshot(cwd: string, entries: SessionEntry[], branchIssueId?: string): Promise<WorkflowSnapshot> {
	const session = inferSessionSnapshot(entries, branchIssueId);
	const plan = await readExecutionPlanSummary(cwd, session.issueId);
	const issueId = session.issueId ?? plan?.issueId;
	const prdMilestones = await readPrdMilestoneSummary(cwd, issueId, plan?.planFileCount ?? 0);
	let state = session.state;
	const stateVisits = session.stateVisits;
	const setState = (nextState: CycleState): void => {
		if (state !== nextState) {
			state = nextState;
			recordStateVisit(stateVisits, state);
		}
	};

	if (plan && !session.issueId && state === "needs-list") {
		setState(plan.pendingTasks > 0 ? "needs-exec" : "started");
	}

	if (plan && plan.pendingTasks > 0 && ["started", "waiting-work", "ready-close", "ready-done", "finished", "closed"].includes(state)) {
		let latestExecCommand = -1;
		let latestExecConfirmed = -1;

		session.signals.forEach((signal, index) => {
			if (signal.kind === "prd-exec") {
				latestExecCommand = index;
			}
			if (signal.kind === "exec-confirmed") {
				latestExecConfirmed = index;
			}
		});

		if (latestExecConfirmed > latestExecCommand) {
			setState("waiting-work");
		} else if (latestExecCommand > latestExecConfirmed) {
			setState("exec-pending");
		} else {
			setState("needs-exec");
		}
	}

	return { state, issueId, plan, prdMilestones, signals: session.signals, stateVisits };
}

function resolveRegisteredCommand(pi: ExtensionAPI, canonical: CommandName): RegisteredCommand | null {
	const commands = pi.getCommands() as RegisteredCommand[];
	const candidates = new Set<string>([canonical, `skill:${canonical}`]);

	for (const candidate of candidates) {
		const command = commands.find((item) => item.name === candidate);
		if (command) return command;
	}

	const suffixMatch = commands.find(
		(item) => item.name === canonical || item.name.endsWith(`:${canonical}`) || item.name.endsWith(`/${canonical}`),
	);
	return suffixMatch ?? null;
}

function stripFrontmatter(text: string): string {
	const match = text.match(/^---\s*\n[\s\S]*?\n---\s*\n?/);
	return match ? text.slice(match[0].length) : text;
}

function expandSkillCommand(command: RegisteredCommand, args: string[]): string {
	if (!command.path) {
		throw new Error(`Skill command "${command.name}" is missing a file path.`);
	}

	const content = readFileSync(command.path, "utf8");
	const body = stripFrontmatter(content).trim();
	const skillName = command.name.startsWith("skill:") ? command.name.slice(6) : command.name;
	const baseDir = dirname(command.path);
	const skillBlock = `<skill name="${skillName}" location="${command.path}">\nReferences are relative to ${baseDir}.\n\n${body}\n</skill>`;
	return args.length > 0 ? `${skillBlock}\n\n${args.join(" ")}` : skillBlock;
}

function quoteArg(arg: string): string {
	return /\s/.test(arg) ? JSON.stringify(arg) : arg;
}

function buildSlashCommand(commandName: string, args: string[] = []): string {
	const payload = [commandName, ...args.map(quoteArg)].filter(Boolean).join(" ");
	return `/${payload}`;
}

function parseArgs(argsText: string): { mode?: string; issueId?: string; reason?: string } {
	const trimmed = argsText.trim();
	if (!trimmed) return {};

	const parts = trimmed.match(/"[^"]*"|'[^']*'|\S+/g)?.map((part) => part.replace(/^(["'])(.*)\1$/, "$2")) ?? [];
	const [first, second, ...rest] = parts;

	if (/^\d+$/.test(first ?? "")) {
		return { issueId: first, reason: [second, ...rest].filter(Boolean).join(" ") || undefined };
	}

	return {
		mode: first,
		issueId: /^\d+$/.test(second ?? "") ? second : undefined,
		reason: [/^\d+$/.test(second ?? "") ? undefined : second, ...rest].filter(Boolean).join(" ") || undefined,
	};
}

type WorkflowCommandContext = {
	cwd: string;
	sessionManager: { getBranch(): SessionEntry[] };
	ui: {
		notify(message: string, level: "info" | "warning" | "error"): void;
		setWorkingMessage?: (message?: string) => void;
	};
	isIdle(): boolean;
	model?: {
		provider: string;
		id: string;
	};
};

async function getCurrentWorkflow(pi: ExtensionAPI, ctx: WorkflowCommandContext): Promise<WorkflowSnapshot> {
	const branchResult = await pi.exec("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
	const branchName = branchResult.stdout.trim();
	const branchIssueId = branchName.match(BRANCH_PRD_RE)?.[1];
	return inferWorkflowSnapshot(ctx.cwd, ctx.sessionManager.getBranch(), branchIssueId);
}

async function runResetCommand(pi: ExtensionAPI, ctx: WorkflowCommandContext, args: string): Promise<void> {
	const workflow = await getCurrentWorkflow(pi, ctx);
	const parsedArgs = parseArgs(args);
	const issueId = parsedArgs.issueId ?? workflow.issueId;
	const targetIssueId = issueId ?? workflow.issueId;
	const targetPlan =
		targetIssueId && targetIssueId !== workflow.issueId
			? await readExecutionPlanSummary(ctx.cwd, targetIssueId)
			: workflow.plan;
	const resetWorkflow =
		targetIssueId && targetIssueId !== workflow.issueId
			? { ...workflow, issueId: targetIssueId, plan: targetPlan }
			: workflow;
	const branchMessages = ctx.sessionManager
		.getBranch()
		.filter((entry): entry is SessionEntry & { type: "message" } => entry.type === "message")
		.map((entry) => entry.message);
	const assistantText = extractAssistantPromptText(branchMessages);
	const terminalCompletion = assistantSignalsExplicitCompletion(assistantText);
	const routeDecision = await decideRouteWithPi(resetWorkflow, assistantText, ctx.cwd, ctx);
	if (routeDecision && routeDecision !== "noop") {
		applyRouteDecision(pi, routeDecision, resetWorkflow, ctx, targetIssueId, undefined, terminalCompletion);
		return;
	}

	const planInfo = resetWorkflow.plan
		? `, plan ${resetWorkflow.plan.file} (${resetWorkflow.plan.pendingTasks}/${resetWorkflow.plan.totalTasks} open)`
		: "";
	const resetMessage = `Reset complete. PRD cycle state: ${resetWorkflow.state}${resetWorkflow.issueId ? ` (issue ${resetWorkflow.issueId})` : ""}${planInfo}`;
	ctx.ui.notify(appendWorkflowStats(resetMessage, resetWorkflow.stateVisits), "info");
}

async function runStatsCommand(pi: ExtensionAPI, ctx: WorkflowCommandContext): Promise<void> {
	const workflow = await getCurrentWorkflow(pi, ctx);
	const planInfo = workflow.plan
		? `, plan ${workflow.plan.file} (${workflow.plan.pendingTasks}/${workflow.plan.totalTasks} open)`
		: "";
	const statsMessage = `auto-prd workflow stats: ${workflow.state}${workflow.issueId ? ` (issue ${workflow.issueId})` : ""}${planInfo}`;
	ctx.ui.notify(appendWorkflowStats(statsMessage, workflow.stateVisits), "info");
}

export default function autoPrdExtension(pi: ExtensionAPI) {
	pi.registerCommand("prd-cycle-reset", {
		description: "Reset the PRD workflow and replay the latest completion report when needed",
		handler: async (args, ctx) => {
			await runResetCommand(pi, ctx, args);
		},
	});

	pi.registerCommand("prd-cycle-stats", {
		description: "Show workflow state-visit stats for the current PRD",
		handler: async (_args, ctx) => {
			await runStatsCommand(pi, ctx);
		},
	});

	pi.registerCommand("prd-cycle", {
		description: "Advance the PRD workflow after validating the current state",
		handler: async (args, ctx) => {
			const branchResult = await pi.exec("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
			const branchName = branchResult.stdout.trim();
			const branchIssueId = branchName.match(BRANCH_PRD_RE)?.[1];
			const workflow = await inferWorkflowSnapshot(ctx.cwd, ctx.sessionManager.getBranch(), branchIssueId);
			const parsedArgs = parseArgs(args);
			const issueId = parsedArgs.issueId ?? workflow.issueId;
			const mode = parsedArgs.mode?.toLowerCase();
			const reason = parsedArgs.reason;
			const shouldArmAutomation = mode === "exec" || mode === "reset" || (!mode && !isTerminalWorkflow(workflow));
			if (shouldArmAutomation) {
				cycleAutomationArmed = true;
			}

			const announce = (message: string, level: "info" | "warning" | "error" = "info") => {
				ctx.ui.notify(message, level);
			};

			const dispatch = (canonical: CommandName, extraArgs: string[] = []) => {
				const registered = resolveRegisteredCommand(pi, canonical);
				if (!registered) {
					announce(`Could not find /${canonical}. Make sure PRD skills are loaded and skill commands are enabled.`, "error");
					return false;
				}

				const commandText = buildSlashCommand(registered.name, extraArgs);
				const delivery = ctx.isIdle() ? undefined : { deliverAs: "steer" as const };

				if (registered.source === "skill" || registered.name.startsWith("skill:")) {
					try {
						const expandedText = expandSkillCommand(registered, extraArgs);
						announce(`Dispatching ${commandText} (expanded skill context)`, "info");
						pi.sendUserMessage(expandedText, delivery);
						return true;
					} catch (error) {
						const message = error instanceof Error ? error.message : String(error);
						announce(`Failed to expand ${commandText}: ${message}`, "error");
						return false;
					}
				}

				announce(`Dispatching ${commandText}`, "info");
				pi.sendUserMessage(commandText, delivery);
				return true;
			};

			const dispatchExec = (issue: string) => {
				if (!dispatch("prd-exec", [issue])) {
					return;
				}

				announce("Waiting for execution-plan confirmation prompt.", "info");
			};

			if (mode === "reset") {
				await runResetCommand(pi, ctx, args);
				return;
			}

			if (mode === "status") {
				const planInfo = workflow.plan
					? `, plan ${workflow.plan.file} (${workflow.plan.pendingTasks}/${workflow.plan.totalTasks} open)`
					: "";
				announce(`PRD cycle state: ${workflow.state}${issueId ? ` (issue ${issueId})` : ""}${planInfo}`, "info");
				return;
			}

			if (mode === "stats") {
				await runStatsCommand(pi, ctx);
				return;
			}

			if (mode === "exec") {
				if (!issueId) {
					announce("No PRD issue detected yet. Pass an issue number: /prd-cycle exec 136", "warning");
					return;
				}
				dispatchExec(issueId);
				return;
			}

			if (mode === "close") {
				if (!issueId) {
					announce("No PRD issue detected yet. Pass an issue number: /prd-cycle close 136 \"Already implemented\"", "warning");
					return;
				}
				dispatch("prd-close", [issueId, reason ?? "Auto-detected closure by auto-prd"]);
				return;
			}

			const branchMessages = ctx.sessionManager
				.getBranch()
				.filter((entry): entry is SessionEntry & { type: "message" } => entry.type === "message")
				.map((entry) => entry.message);
			const latestAssistantText = extractAssistantPromptText(branchMessages);
			const terminalCompletion = assistantSignalsExplicitCompletion(latestAssistantText);
			const routeDecision = await decideRouteWithPi(workflow, latestAssistantText, ctx.cwd, ctx);
			if (routeDecision) {
				applyRouteDecision(pi, routeDecision, workflow, ctx, issueId, undefined, terminalCompletion);
				return;
			}

			if (workflow.state === "finished" || workflow.state === "closed") {
				const terminalMessage = `PRD workflow is already ${workflow.state}. Run /prd-cycle reset to replay the latest completion report, or /prd-cycle <issue> to start a different PRD.`;
				announce(appendWorkflowStats(terminalMessage, workflow.stateVisits), "info");
				return;
			}

			announce(`LLM route decision was unavailable for PRD state: ${workflow.state}`, "error");
		},
	});

	pi.registerCommand("prd-cycle-status", {
		description: "Show the FSM state detected by auto-prd",
		handler: async (_args, ctx) => {
			const branchResult = await pi.exec("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
			const branchName = branchResult.stdout.trim();
			const branchIssueId = branchName.match(BRANCH_PRD_RE)?.[1];
			const workflow = await inferWorkflowSnapshot(ctx.cwd, ctx.sessionManager.getBranch(), branchIssueId);
			const planInfo = workflow.plan
				? `, plan ${workflow.plan.file} (${workflow.plan.pendingTasks}/${workflow.plan.totalTasks} open${workflow.plan.nextTask ? `, next: ${workflow.plan.nextTask}` : ""})`
				: "";
			ctx.ui.notify(`auto-prd state: ${workflow.state}${workflow.issueId ? ` (issue ${workflow.issueId})` : ""}${planInfo}`, "info");
		},
	});

	pi.on("agent_end", async (event, ctx) => {
		try {
			if (!cycleAutomationArmed) {
				return;
			}

			const assistantText = extractAssistantPromptText((event as { messages?: unknown }).messages);
			if (!assistantText) {
				return;
			}
			const terminalCompletion = assistantSignalsExplicitCompletion(assistantText);

			// Capture idle state BEFORE any async operations
			const wasIdle = ctx.isIdle();

			const branchResult = await pi.exec("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
			const branchName = branchResult.stdout.trim();
			const branchIssueId = branchName.match(BRANCH_PRD_RE)?.[1];
			const workflow = await inferWorkflowSnapshot(ctx.cwd, ctx.sessionManager.getBranch(), branchIssueId);

			if (isTerminalWorkflow(workflow)) {
				cycleAutomationArmed = false;
				return;
			}

			const routeDecision = await decideRouteWithPi(workflow, assistantText, ctx.cwd, ctx);
			ctx.ui.notify(`Route decision: ${routeDecision}`, "info");
			if (routeDecision && routeDecision !== "noop") {
				ctx.ui.notify(`Executing ${routeDecision}...`, "info");
				try {
					// Keep automation armed so the PRD cycle can continue on the next turn.
					// Force no steer - we're starting a new cycle after agent_end.
					applyRouteDecision(pi, routeDecision, workflow, ctx, workflow.issueId, true, terminalCompletion);
				} catch (err) {
					ctx.ui.notify("Auto-prd route failed: " + err, "error");
				}
			}
		} catch (error) {
			ctx.ui.notify("Confirmation handler failed: " + error, "error");
		}
	});
}
