import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { spawn } from "child_process";

/**
 * peon-ping extension for pi coding agent
 * 
 * Plays game character voice notifications when the AI agent needs attention.
 * 
 * Requires peon-ping to be installed:
 *   curl -fsSL https://raw.githubusercontent.com/PeonPing/peon-ping/main/install.sh | bash
 */

// peon-ping script path (peon is a shell alias, so we use the actual script)
const PEON_SCRIPT = `${process.env.HOME || "/home/node"}/.claude/hooks/peon-ping/peon.sh`;

// Configuration
const RELAY_HOST = process.env.PEON_RELAY_HOST || "localhost";
const RELAY_PORT = parseInt(process.env.PEON_RELAY_PORT || "19998");
const RELAY_URL = `http://${RELAY_HOST}:${RELAY_PORT}`;

// State tracking
let sessionStarted = false;
let lastInputTime = 0;
let rapidInputCount = 0;
const SPAM_WINDOW_MS = 10000;
const SPAM_THRESHOLD = 3;

/**
 * Play a sound via peon-ping relay (works for local, SSH, and devcontainers)
 */
function playSound(category: string): void {
	const curl = spawn("curl", [
		"-sf",
		"--max-time", "3",
		`${RELAY_URL}/play?category=${category}`
	], { stdio: "ignore" });
	
	curl.on("error", () => {
		// Relay not running - that's ok, user can start it if they want sounds
	});
}

/**
 * Send desktop notification via relay
 */
function notify(title: string, message: string, color: string = "blue"): void {
	const curl = spawn("curl", [
		"-sf",
		"-X", "POST",
		"-H", "Content-Type: application/json",
		"-d", JSON.stringify({ title, message, color }),
		`${RELAY_URL}/notify`
	], { stdio: "ignore" });
	
	curl.on("error", () => {});
}

/**
 * Check if we're in a remote environment
 */
function isRemoteEnvironment(): boolean {
	return !!(
		process.env.SSH_CONNECTION ||
		process.env.SSH_CLIENT ||
		process.env.REMOTE_CONTAINERS === "true" ||
		process.env.CODESPACES === "true"
	);
}

export default function (pi: ExtensionAPI) {
	// Session start - play greeting
	pi.on("session_start", async (_event, ctx) => {
		if (!sessionStarted) {
			sessionStarted = true;
			playSound("session.start");
			
			if (isRemoteEnvironment()) {
				setTimeout(() => {
					notify("peon-ping", "Remote env - start relay on host: peon relay --daemon", "yellow");
				}, 1000);
			}
		}
	});

	// Agent started working
	pi.on("agent_start", async () => {
		playSound("task.acknowledge");
	});

	// Agent finished
	pi.on("agent_end", async (event, ctx) => {
		const entries = ctx.sessionManager.getEntries();
		const recentEntries = entries.slice(-10);
		
		const hadError = recentEntries.some((entry: any) => {
			if (entry.type === "message" && entry.message.role === "toolResult") {
				return entry.message.isError;
			}
			return false;
		});

		if (hadError) {
			playSound("task.error");
			notify("pi agent", "Task completed with errors", "red");
		} else {
			playSound("task.complete");
			notify("pi agent", "Task complete", "green");
		}
	});

	// Tool error - immediate feedback
	pi.on("tool_execution_end", async (event) => {
		if (event.isError) {
			playSound("task.error");
		}
	});

	// Rapid input detection for spam sound
	pi.on("input", async () => {
		const now = Date.now();
		
		if (now - lastInputTime > SPAM_WINDOW_MS) {
			rapidInputCount = 0;
		}
		
		rapidInputCount++;
		lastInputTime = now;

		if (rapidInputCount >= SPAM_THRESHOLD) {
			playSound("user.spam");
			rapidInputCount = 0;
		}

		return { action: "continue" };
	});

	// Cleanup on shutdown
	pi.on("session_shutdown", async () => {
		sessionStarted = false;
	});

	// ===================================================================
	// Commands
	// ===================================================================

	pi.registerCommand("peon-toggle", {
		description: "Toggle peon-ping sounds on/off",
		handler: async (_args, ctx) => {
			const child = spawn("bash", [PEON_SCRIPT, "toggle"]);
			
			let output = "";
			child.stdout.on("data", (data: Buffer) => { output += data.toString(); });
			child.stderr.on("data", (data: Buffer) => { output += data.toString(); });
			
			child.on("close", (code: number) => {
				ctx.ui.notify(`peon-ping: ${output.trim() || "toggled"}`, code === 0 ? "info" : "error");
			});
		},
	});

	pi.registerCommand("peon-status", {
		description: "Check peon-ping status",
		handler: async (_args, ctx) => {
			const child = spawn("bash", [PEON_SCRIPT, "status"]);
			
			let output = "";
			child.stdout.on("data", (data: Buffer) => { output += data.toString(); });
			child.stderr.on("data", (data: Buffer) => { output += data.toString(); });
			
			child.on("close", () => {
				ctx.ui.notify(output.trim() || "No status", "info");
			});
		},
	});

	pi.registerCommand("peon-pack", {
		description: "Switch sound pack (e.g., /peon-pack glados)",
		handler: async (args, ctx) => {
			const pack = args.trim() || "peon";
			const child = spawn("bash", [PEON_SCRIPT, "packs", "use", pack]);
			
			child.on("close", (code: number) => {
				if (code === 0) {
					ctx.ui.notify(`Switched to ${pack}`, "success");
					setTimeout(() => playSound("session.start"), 500);
				} else {
					ctx.ui.notify(`Failed to switch pack`, "error");
				}
			});
		},
	});

	pi.registerCommand("peon-volume", {
		description: "Set volume 0.0-1.0 (e.g., /peon-volume 0.7)",
		handler: async (args, ctx) => {
			const volume = args.trim() || "0.5";
			const child = spawn("bash", [PEON_SCRIPT, "volume", volume]);
			
			child.on("close", (code: number) => {
				ctx.ui.notify(code === 0 ? `Volume: ${volume}` : "Failed", code === 0 ? "success" : "error");
			});
		},
	});

	pi.registerCommand("peon-test", {
		description: "Test all peon-ping sounds",
		handler: async (_args, ctx) => {
			const categories = [
				"session.start",
				"task.acknowledge",
				"task.complete",
				"task.error",
				"input.required",
				"user.spam"
			];

			ctx.ui.notify("Testing peon-ping...", "info");

			for (let i = 0; i < categories.length; i++) {
				setTimeout(() => playSound(categories[i]), i * 1500);
			}

			setTimeout(() => {
				ctx.ui.notify("Test complete", "success");
			}, categories.length * 1500 + 500);
		},
	});

	pi.registerCommand("peon-relay", {
		description: "Control relay (start|stop|status) for SSH/devcontainers",
		handler: async (args, ctx) => {
			const cmd = args.trim() || "status";
			const child = spawn("bash", [PEON_SCRIPT, "relay", `--${cmd}`]);
			
			let output = "";
			child.stdout.on("data", (data: Buffer) => { output += data.toString(); });
			child.stderr.on("data", (data: Buffer) => { output += data.toString(); });
			
			child.on("close", () => {
				ctx.ui.notify(output.trim() || `relay ${cmd}`, "info");
			});
		},
	});
}
