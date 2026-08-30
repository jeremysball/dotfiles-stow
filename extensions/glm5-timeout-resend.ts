/**
 * GLM5 Timeout Resend Extension
 *
 * Monitors streaming activity for the GLM5 model. If no activity is detected
 * for 10 seconds during a response, it cancels the current response and
 * resends the last user message to retry.
 *
 * This helps handle cases where GLM5 may hang or timeout mid-response.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

const TIMEOUT_MS = 30_000; // 30 seconds of inactivity before retry
const MAX_RETRIES = 3; // Maximum retry attempts per turn
const BASE_RETRY_DELAY_MS = 500; // Initial delay between retries
const MAX_BACKOFF_MS = 8000; // Maximum backoff delay (cap)
const JITTER_FACTOR = 0.2; // ±20% random jitter to prevent thundering herd

export default function (pi: ExtensionAPI) {
	let lastActivityTime = 0;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let isStreaming = false;
	let retryCount = 0;
	let activeToolCount = 0; // Track number of actively running tools

	function isGlm5Model(ctx: ExtensionContext): boolean {
		if (!ctx.model) return false;
		const modelId = ctx.model.id.toLowerCase();
		return modelId.includes("glm") && modelId.includes("5");
	}

	/**
	 * Calculate exponential backoff delay with jitter.
	 * Formula: baseDelay * 2^retryCount, capped at maxBackoff, with ±jitter
	 */
	function calculateBackoffDelay(retryCount: number): number {
		// Exponential growth: 500ms, 1000ms, 2000ms, etc.
		const exponentialDelay = BASE_RETRY_DELAY_MS * Math.pow(2, retryCount - 1);

		// Cap at maximum backoff
		const cappedDelay = Math.min(exponentialDelay, MAX_BACKOFF_MS);

		// Add random jitter: ±JITTER_FACTOR to prevent synchronized retries
		const jitter = 1 + (Math.random() * 2 - 1) * JITTER_FACTOR;

		return Math.round(cappedDelay * jitter);
	}

	function clearWatchdog() {
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	}

	function setWatchdogStatus(ctx: ExtensionContext, active: boolean) {
		const theme = ctx.ui.theme;
		const w = active ? theme.fg("success", "W") : theme.fg("error", "W");
		ctx.ui.setStatus("glm5-timeout", w);
	}

	function startWatchdog(ctx: ExtensionContext) {
		clearWatchdog();
		lastActivityTime = Date.now();

		timeoutId = setTimeout(async () => {
			if (!isStreaming || !isGlm5Model(ctx)) {
				return;
			}

			// If a tool is actively running, extend the timeout (don't abort mid-command)
			if (activeToolCount > 0) {
				setWatchdogStatus(ctx, true);
				startWatchdog(ctx);
				return;
			}

			const timeSinceActivity = Date.now() - lastActivityTime;
			if (timeSinceActivity < TIMEOUT_MS) {
				// Activity happened, restart watchdog
				startWatchdog(ctx);
				return;
			}

			// No activity for TIMEOUT_MS - abort and retry
			setWatchdogStatus(ctx, false); // Red W for timeout

			if (retryCount >= MAX_RETRIES) {
				ctx.ui.notify(`GLM5: Max retries (${MAX_RETRIES}) reached`, "error");
				ctx.ui.setStatus("glm5-timeout", undefined);
				clearWatchdog();
				isStreaming = false;
				retryCount = 0;
				return;
			}

			retryCount++;
			ctx.ui.notify(`GLM5: Timeout, retrying (${retryCount}/${MAX_RETRIES})`, "warning");

			// Abort current response
			ctx.abort();

			// Resend with simple continuation prompt instead of full message
			const continuePrompts = ["continue", "go", "keep going"];
			const prompt = continuePrompts[Math.floor(Math.random() * continuePrompts.length)];
			const retryDelay = calculateBackoffDelay(retryCount);
			ctx.ui.notify(`GLM5: Retrying in ${retryDelay}ms`, "info");
			setTimeout(() => {
				pi.sendUserMessage(prompt, { deliverAs: "steer" });
			}, retryDelay);
		}, TIMEOUT_MS);
	}

	function recordActivity(ctx: ExtensionContext) {
		lastActivityTime = Date.now();
		// Restart the watchdog if we're streaming
		if (isStreaming && !timeoutId) {
			startWatchdog(ctx);
		}
	}

	// Enable watchdog for GLM5
	pi.on("agent_start", async (_event, ctx) => {
		// Only enable watchdog for GLM5
		if (isGlm5Model(ctx)) {
			isStreaming = true;
			retryCount = 0;
			startWatchdog(ctx);
			setWatchdogStatus(ctx, true);
		}
	});

	// Track streaming activity
	pi.on("message_update", async (_event, ctx) => {
		if (isStreaming && isGlm5Model(ctx)) {
			recordActivity(ctx);
		}
	});

	// Also track tool execution as activity
	pi.on("tool_execution_start", async (_event, ctx) => {
		if (isStreaming && isGlm5Model(ctx)) {
			activeToolCount++;
			setWatchdogStatus(ctx, true);
			recordActivity(ctx);
		}
	});

	pi.on("tool_execution_update", async (_event, ctx) => {
		if (isStreaming && isGlm5Model(ctx)) {
			recordActivity(ctx);
		}
	});

	// Track when tools complete
	pi.on("tool_execution_end", async (_event, ctx) => {
		if (isStreaming && isGlm5Model(ctx)) {
			activeToolCount = Math.max(0, activeToolCount - 1);
			setWatchdogStatus(ctx, true);
			recordActivity(ctx);
		}
	});

	// Stop watchdog when agent finishes
	pi.on("agent_end", async (_event, ctx) => {
		if (isGlm5Model(ctx)) {
			ctx.ui.setStatus("glm5-timeout", undefined);
		}
		clearWatchdog();
		isStreaming = false;
		retryCount = 0;
		activeToolCount = 0;
	});

	// Cleanup on session shutdown
	pi.on("session_shutdown", async () => {
		clearWatchdog();
		isStreaming = false;
		retryCount = 0;
		activeToolCount = 0;
	});

	// Log when model changes to GLM5
	pi.on("model_select", async (event, ctx) => {
		const wasGlm5 = event.previousModel?.id.toLowerCase().includes("glm") &&
			event.previousModel?.id.toLowerCase().includes("5");
		const isNowGlm5 = event.model.id.toLowerCase().includes("glm") &&
			event.model.id.toLowerCase().includes("5");

		if (!wasGlm5 && isNowGlm5) {
			ctx.ui.notify("GLM5 timeout watchdog enabled", "info");
		} else if (wasGlm5 && !isNowGlm5) {
			clearWatchdog();
			isStreaming = false;
			activeToolCount = 0;
			ctx.ui.setStatus("glm5-timeout", undefined);
		}
	});
}
