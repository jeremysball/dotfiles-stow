/**
 * Auto-Compact Extension for Pi
 *
 * Automatically triggers compaction when context usage exceeds a configurable threshold.
 * This provides proactive compaction before hitting the context window limit.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

interface AutoCompactSettings {
	enabled?: boolean;
	thresholdPercent?: number;
	minTokens?: number;
	customInstructions?: string;
}

interface AutoCompactState {
	lastCompactTurn?: number;
	totalCompactions: number;
	enabled?: boolean;
	thresholdPercent?: number;
	minTokens?: number;
}

const DEFAULT_SETTINGS: Required<AutoCompactSettings> = {
	enabled: true,
	thresholdPercent: 75,
	minTokens: 50000,
	customInstructions: "",
};

const STATE_KEY = "auto-compact-state";

function loadState(ctx: ExtensionContext): AutoCompactState {
	for (const entry of ctx.sessionManager.getBranch()) {
		if (entry.type === "custom" && "customType" in entry && entry.customType === STATE_KEY) {
			return (entry.data as AutoCompactState) ?? { totalCompactions: 0 };
		}
	}

	return { totalCompactions: 0 };
}

function saveState(pi: ExtensionAPI, state: AutoCompactState): void {
	pi.appendEntry(STATE_KEY, state);
}

function toPositiveInt(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : undefined;
}

function parseSettingsObject(value: unknown): AutoCompactSettings | undefined {
	if (!value || typeof value !== "object") return undefined;
	const record = value as Record<string, unknown>;

	return {
		enabled: typeof record.enabled === "boolean" ? record.enabled : undefined,
		thresholdPercent: toPositiveInt(record.thresholdPercent),
		minTokens: toPositiveInt(record.minTokens),
		customInstructions: typeof record.customInstructions === "string" ? record.customInstructions : undefined,
	};
}

async function readSettingsFile(filePath: string): Promise<AutoCompactSettings | undefined> {
	try {
		const text = await readFile(filePath, "utf8");
		const parsed = JSON.parse(text) as unknown;
		const settings = parseSettingsObject(parsed && typeof parsed === "object" && "autoCompact" in parsed
			? (parsed as Record<string, unknown>).autoCompact
			: parsed);
		return settings;
	} catch {
		return undefined;
	}
}

async function loadSettings(ctx: ExtensionContext, state: AutoCompactState): Promise<Required<AutoCompactSettings>> {
	const home = process.env.HOME ?? "/home/node";
	const globalSettingsPath = join(home, ".pi", "agent", "settings.json");
	const localSettingsPath = join(ctx.cwd, ".pi", "settings.json");

	const [globalSettings, localSettings] = await Promise.all([
		readSettingsFile(globalSettingsPath),
		readSettingsFile(localSettingsPath),
	]);

	const merged = {
		...DEFAULT_SETTINGS,
		...globalSettings,
		...localSettings,
	};

	return {
		enabled: state.enabled ?? merged.enabled ?? DEFAULT_SETTINGS.enabled,
		thresholdPercent: state.thresholdPercent ?? merged.thresholdPercent ?? DEFAULT_SETTINGS.thresholdPercent,
		minTokens: state.minTokens ?? merged.minTokens ?? DEFAULT_SETTINGS.minTokens,
		customInstructions: merged.customInstructions ?? DEFAULT_SETTINGS.customInstructions,
	};
}

function getCompactableUsage(ctx: ExtensionContext): { tokens: number; contextWindow: number } | null {
	const usage = ctx.getContextUsage();
	if (!usage || usage.tokens === null) {
		return null;
	}

	return { tokens: usage.tokens, contextWindow: usage.contextWindow };
}

function shouldCompact(
	usage: { tokens: number; contextWindow: number } | null,
	settings: Required<AutoCompactSettings>,
	state: AutoCompactState,
	currentTurn: number,
): boolean {
	if (!settings.enabled) return false;
	if (state.lastCompactTurn === currentTurn) return false;
	if (!usage) return false;
	if (usage.tokens < settings.minTokens) return false;

	const thresholdTokens = Math.floor((usage.contextWindow * settings.thresholdPercent) / 100);
	return usage.tokens > thresholdTokens;
}

function formatUsageLine(usage: { tokens: number; contextWindow: number } | null): string {
	if (!usage) return "Current usage: unavailable";
	return `Current usage: ${usage.tokens.toLocaleString()} / ${usage.contextWindow.toLocaleString()} tokens`;
}

export default function (pi: ExtensionAPI) {
	let turnCounter = 0;

	pi.on("session_start", async (_event, ctx) => {
		const state = loadState(ctx);
		const settings = await loadSettings(ctx, state);

		if (settings.enabled) {
			const overrideMsg =
				state.enabled !== undefined ||
				state.thresholdPercent !== undefined ||
				state.minTokens !== undefined
					? " (persisted overrides active)"
					: "";
			ctx.ui.notify(
				`Auto-compact: ${settings.thresholdPercent}% threshold (${settings.minTokens.toLocaleString()} min tokens)${overrideMsg}`,
				"info",
			);
		}
	});

	pi.on("turn_start", async () => {
		turnCounter++;
	});

	pi.on("turn_end", async (_event, ctx) => {
		const state = loadState(ctx);
		const settings = await loadSettings(ctx, state);
		const usage = getCompactableUsage(ctx);

		if (!shouldCompact(usage, settings, state, turnCounter)) {
			return;
		}

		const thresholdTokens = Math.floor((usage!.contextWindow * settings.thresholdPercent) / 100);
		ctx.ui.notify(
			`Auto-compacting: ${usage!.tokens.toLocaleString()} tokens > ${thresholdTokens.toLocaleString()} threshold (${settings.thresholdPercent}%)`,
			"warning",
		);

		const triggerTurn = turnCounter;
		await ctx.compact({
			customInstructions: settings.customInstructions || undefined,
			onComplete: () => {
				state.lastCompactTurn = triggerTurn;
				state.totalCompactions++;
				saveState(pi, state);

				const afterUsage = getCompactableUsage(ctx);
				const before = usage!.tokens.toLocaleString();
				const after = afterUsage ? afterUsage.tokens.toLocaleString() : "unknown";
				ctx.ui.notify(`Compaction complete: ${before} → ${after} tokens`, "info");
			},
			onError: (error) => {
				ctx.ui.notify(`Auto-compact failed: ${error.message}`, "error");
			},
		});
	});

	pi.registerCommand("auto-compact-status", {
		description: "Show auto-compact status and settings",
		handler: async (_args, ctx) => {
			const state = loadState(ctx);
			const settings = await loadSettings(ctx, state);
			const usage = getCompactableUsage(ctx);
			const thresholdTokens = usage
				? Math.floor((usage.contextWindow * settings.thresholdPercent) / 100)
				: null;

			const lines = [
				`Enabled: ${settings.enabled}${state.enabled !== undefined ? " (persisted)" : ""}`,
				`Threshold: ${settings.thresholdPercent}%${state.thresholdPercent !== undefined ? " (persisted)" : ""}`,
				`Min tokens: ${settings.minTokens.toLocaleString()}${state.minTokens !== undefined ? " (persisted)" : ""}`,
				`Total compactions: ${state.totalCompactions}`,
				`Current turn: ${turnCounter}`,
				formatUsageLine(usage),
			];

			if (thresholdTokens !== null) {
				lines.push(
					`Threshold at: ${thresholdTokens.toLocaleString()} tokens`,
					`Status: ${usage!.tokens > thresholdTokens ? "Would compact" : "Below threshold"}`,
				);
			}

			ctx.ui.notify(lines.join("\n"), "info");
		},
	});

	pi.registerCommand("auto-compact-trigger", {
		description: "Manually trigger auto-compact check",
		handler: async (_args, ctx) => {
			const state = loadState(ctx);
			const settings = await loadSettings(ctx, state);
			const usage = getCompactableUsage(ctx);

			if (!settings.enabled) {
				ctx.ui.notify("Auto-compact is disabled", "warning");
				return;
			}

			if (!usage) {
				ctx.ui.notify("No context usage available", "error");
				return;
			}

			const thresholdTokens = Math.floor((usage.contextWindow * settings.thresholdPercent) / 100);
			if (usage.tokens <= thresholdTokens || usage.tokens < settings.minTokens) {
				ctx.ui.notify(
					`No compaction needed: ${usage.tokens.toLocaleString()} tokens (threshold: ${thresholdTokens.toLocaleString()})`,
					"info",
				);
				return;
			}

			ctx.ui.notify("Triggering compaction...", "info");
			const triggerTurn = turnCounter;
			await ctx.compact({
				customInstructions: settings.customInstructions || undefined,
				onComplete: () => {
					state.lastCompactTurn = triggerTurn;
					state.totalCompactions++;
					saveState(pi, state);
					const afterUsage = getCompactableUsage(ctx);
					const after = afterUsage ? afterUsage.tokens.toLocaleString() : "unknown";
					ctx.ui.notify(`Compaction complete: ${usage.tokens.toLocaleString()} → ${after} tokens`, "info");
				},
				onError: (error) => {
					ctx.ui.notify(`Compaction failed: ${error.message}`, "error");
				},
			});
		},
	});

	pi.registerCommand("auto-compact-set-threshold", {
		description: "Set auto-compact threshold percentage (1-100)",
		handler: async (args, ctx) => {
			const percent = parseInt(args.trim(), 10);
			if (Number.isNaN(percent) || percent < 1 || percent > 100) {
				ctx.ui.notify("Invalid threshold. Please provide a number between 1 and 100.", "error");
				return;
			}

			const state = loadState(ctx);
			state.thresholdPercent = percent;
			saveState(pi, state);
			ctx.ui.notify(`Auto-compact threshold set to ${percent}% (persisted)`, "info");
		},
	});

	pi.registerCommand("auto-compact-set-min-tokens", {
		description: "Set minimum tokens before auto-compacting",
		handler: async (args, ctx) => {
			const tokens = parseInt(args.trim(), 10);
			if (Number.isNaN(tokens) || tokens < 0) {
				ctx.ui.notify("Invalid token count. Please provide a non-negative number.", "error");
				return;
			}

			const state = loadState(ctx);
			state.minTokens = tokens;
			saveState(pi, state);
			ctx.ui.notify(`Auto-compact minimum tokens set to ${tokens.toLocaleString()} (persisted)`, "info");
		},
	});

	pi.registerCommand("auto-compact-toggle", {
		description: "Enable or disable auto-compact",
		handler: async (args, ctx) => {
			const state = loadState(ctx);
			const currentSettings = await loadSettings(ctx, state);
			const arg = args.trim().toLowerCase();

			if (["on", "true", "yes", "1"].includes(arg)) {
				state.enabled = true;
			} else if (["off", "false", "no", "0"].includes(arg)) {
				state.enabled = false;
			} else {
				state.enabled = !currentSettings.enabled;
			}

			saveState(pi, state);
			ctx.ui.notify(`Auto-compact ${state.enabled ? "enabled" : "disabled"} (persisted)`, state.enabled ? "info" : "warning");
		},
	});

	pi.registerCommand("auto-compact-reset", {
		description: "Reset all settings to settings.json values",
		handler: async (_args, ctx) => {
			const state = loadState(ctx);
			state.enabled = undefined;
			state.thresholdPercent = undefined;
			state.minTokens = undefined;
			saveState(pi, state);
			ctx.ui.notify("Auto-compact settings reset to settings.json defaults", "info");
		},
	});
}
