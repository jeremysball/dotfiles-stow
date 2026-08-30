/**
 * Notify Extension
 *
 * Sends notifications via beep and tmux when a job completes that took
 * longer than 30 seconds.
 *
 * Usage:
 * 1. Copy this file to ~/.pi/agent/extensions/ or your project's .pi/extensions/
 * 2. The extension auto-tracks job durations and alerts on long-running tasks
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// Threshold in milliseconds (30 seconds)
const NOTIFICATION_THRESHOLD_MS = 30 * 1000;

// Beep configuration
const BEEP_ENABLED = true;           // Enable/disable bell character

// Bell patterns: array of durations in milliseconds
// Positive = beep (bell character sent)
// Negative = silence (pause)
type BellPattern = number[];

const BELL_PATTERNS: Record<string, BellPattern> = {
	single: [100],                    // One short beep
	double: [100, -150, 100],         // Two short beeps (default)
	triple: [100, -100, 100, -100, 100], // Three rapid beeps (urgent)
	long: [300],                      // One long beep
	pulse: [100, -100, 100, -100, 100, -100, 100, -100, 100], // Rapid pulsing
	morseSOS: [100, -100, 100, -100, 100, -300, 300, -100, 300, -100, 300, -300, 100, -100, 100, -100, 100], // ... --- ...
	success: [100, -50, 300],         // Short then long (ascending)
	warning: [300, -50, 100],         // Long then short (descending)
	heartbeat: [100, -100, 100, -400, 100, -100, 100], // Ba-dum... ba-dum
};

const DEFAULT_BELL_PATTERN = 'double' as const;

/**
 * Play a bell pattern
 * Positive values = beep for that duration (ms)
 * Negative values = silence for that duration (ms)
 */
function playBellPattern(pattern: BellPattern): void {
	for (const duration of pattern) {
		if (duration > 0) {
			// Beep - send bell character and hold
			process.stdout.write('\x07');
		}
		// Sleep for the duration (blocking for simplicity)
		const start = Date.now();
		while (Date.now() - start < Math.abs(duration)) {}
	}
}

/**
 * Get bell pattern based on job duration
 * Longer jobs = more urgent patterns
 */
function getBellPatternForDuration(durationMs: number): BellPattern {
	const seconds = Math.round(durationMs / 1000);
	if (seconds < 30) return BELL_PATTERNS.single;
	if (seconds < 60) return BELL_PATTERNS.double;
	if (seconds < 120) return BELL_PATTERNS.triple;
	if (seconds < 300) return BELL_PATTERNS.warning;
	return BELL_PATTERNS.morseSOS; // 5+ minutes
}

// Tmux configuration
const TMUX_RENAME_WINDOW = true;     // Temporarily rename window on notify
const TMUX_STATUS_MESSAGE = true;    // Show message in tmux status line
const TMUX_RESET_DELAY_MS = 5000;    // How long to keep custom window title

/**
 * Send notification via beep and tmux
 * 
 * Silent operation - no stdout/stderr output
 * 
 * Tmux detection:
 * - Sends bell to highlight window in tmux status bar
 * - Sets window title temporarily to show notification source
 * - Displays message in tmux status line if available
 */
function notify(title: string, body: string): void {
	// Check if running in tmux
	const isTmux = process.env.TMUX !== undefined;
	const tmuxPane = process.env.TMUX_PANE;
	
	// Beep option - plays bell pattern based on urgency
	if (BEEP_ENABLED) {
		// You can use DEFAULT_BELL_PATTERN for fixed pattern, or
		// getBellPatternForDuration(durationMs) for duration-based patterns
		const pattern = BELL_PATTERNS[DEFAULT_BELL_PATTERN];
		playBellPattern(pattern);
	}
	
	// Tmux-specific enhancements
	if (isTmux) {
		const { spawn } = require('child_process');
		
		// Set window title to show notification (visible in status bar)
		if (TMUX_RENAME_WINDOW) {
			spawn('tmux', ['rename-window', `${title}: ${body.slice(0, 20)}...`], { stdio: 'ignore' });
		}
		
		// Display message in tmux status line
		if (TMUX_STATUS_MESSAGE) {
			spawn('tmux', ['display-message', `${title}: ${body}`], { stdio: 'ignore' });
		}
		
		// Reset window title after delay
		if (TMUX_RENAME_WINDOW) {
			setTimeout(() => {
				spawn('tmux', ['rename-window', '-t', tmuxPane || '.', ''], { stdio: 'ignore' });
			}, TMUX_RESET_DELAY_MS);
		}
	}
}

export default function (pi: ExtensionAPI) {
	// Track job start time
	let jobStartTime: number | null = null;

	// Extension loaded silently - no stdout/stderr output

	pi.on("agent_start", async (_event, _ctx) => {
		// Record when the job starts
		jobStartTime = Date.now();
	});

	pi.on("agent_end", async (_event, _ctx) => {
		// Check if we have a start time
		if (jobStartTime === null) {
			return;
		}

		// Calculate duration
		const durationMs = Date.now() - jobStartTime;
		const durationSec = Math.round(durationMs / 1000);

		// Only notify if duration exceeds threshold
		if (durationMs >= NOTIFICATION_THRESHOLD_MS) {
			const title = "Pi Job Complete";
			const body = `Job completed in ${durationSec}s (exceeded 30s threshold)`;
			notify(title, body);
		}

		// Reset start time for next job
		jobStartTime = null;
	});
}
