# OSC 777 Notify Extension

A pi extension that sends terminal notifications via **OSC 777** when jobs complete that lasted longer than 30 seconds.

## What is OSC 777?

OSC 777 is an operating system command escape sequence used by terminal emulators to display notifications. The format is:

```
ESC ] 777 ; notify ; title ; body BEL
```

Where:
- `ESC ]` is the OSC introducer (`\x1b]`)
- `777` is the notification command
- `notify` is the subcommand
- `title` is the notification title
- `body` is the notification message
- `BEL` is the bell character (`\x07`) used as terminator

## Terminal Support

OSC 777 is supported by:
- **Ghostty**
- **iTerm2**
- **WezTerm**
- **rxvt-unicode**

## Features

- Automatically tracks job duration using pi's `agent_start` and `agent_end` events
- Sends notification only when jobs exceed 30 seconds
- Includes the actual duration in the notification message
- Lightweight with no external dependencies

## Installation

### Project-local (recommended)
Copy `osc777-notify.ts` to your project's `.pi/extensions/` directory:

```bash
mkdir -p .pi/extensions
cp osc777-notify.ts .pi/extensions/
```

### Global
Copy to your global pi extensions directory:

```bash
mkdir -p ~/.pi/agent/extensions
cp osc777-notify.ts ~/.pi/agent/extensions/
```

## Usage

Once installed, the extension works automatically:

1. Start pi normally
2. Run a task that takes longer than 30 seconds
3. When the job completes, you'll receive an OSC 777 notification

Example notification:
- **Title**: "Pi Job Complete"
- **Body**: "Job completed in 45s (exceeded 30s threshold)"

## Customization

To change the 30-second threshold, edit this line in the extension:

```typescript
const NOTIFICATION_THRESHOLD_MS = 30 * 1000; // Change 30 to your preferred seconds
```

To customize the notification message, modify the `title` and `body` variables in the `agent_end` handler.
