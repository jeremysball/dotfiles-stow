# peon-ping Extension for pi

Game character voice notifications for the pi coding agent. Hear "Work complete!" and other iconic lines when your AI agent needs attention.

## Requirements

1. **peon-ping** must be installed:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/PeonPing/peon-ping/main/install.sh | bash
   ```

2. **pi coding agent** with extension support

## Installation

1. Copy or symlink this extension to your pi extensions directory:
   ```bash
   # Global (all projects)
   mkdir -p ~/.pi/agent/extensions
   cp /workspace/.pi/extensions/peon-ping.ts ~/.pi/agent/extensions/

   # Or project-local (this project only)
   mkdir -p .pi/extensions
   cp /workspace/.pi/extensions/peon-ping.ts .pi/extensions/
   ```

2. Reload pi or start a new session:
   ```bash
   pi
   # Or in pi: /reload
   ```

## Commands

| Command | Description |
|---------|-------------|
| `/peon-toggle` | Toggle sounds on/off |
| `/peon-status` | Check if peon-ping is active |
| `/peon-pack <name>` | Switch sound pack (peon, glados, sc_kerrigan, etc.) |
| `/peon-volume <0.0-1.0>` | Set volume |
| `/peon-test` | Test all sound categories |
| `/peon-relay <start|stop|status>` | Control audio relay for SSH/devcontainers |

## Events

The extension plays sounds for these pi events:

| pi Event | peon-ping Category | Sound Example |
|----------|-------------------|---------------|
| `session_start` | `session.start` | "Ready to work?" |
| `agent_start` | `task.acknowledge` | "On it." |
| `agent_end` (success) | `task.complete` | "Work, work." |
| `agent_end` (error) | `task.error` | "I can't do that." |
| `tool_execution_end` (error) | `task.error` | "Son of a bitch!" |
| Rapid inputs (3+ in 10s) | `user.spam` | "Me busy, leave me alone!" |

## SSH / Devcontainer Setup

For remote development, start the relay on your local machine:

```bash
# On your LOCAL machine
peon relay --daemon

# SSH with port forwarding
ssh -R 19998:localhost:19998 your-server

# Or for devcontainers - relay auto-detects via host.docker.internal
```

The extension auto-detects remote environments and notifies you if the relay may be needed.

## Moshi iOS Terminal

If using [Moshi](https://apps.apple.com) on iOS:
- peon-ping support is **built into Moshi**
- No relay setup needed
- Just SSH through Moshi and sounds play on your iPhone/iPad

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PEON_RELAY_HOST` | `localhost` | Relay host for remote audio |
| `PEON_RELAY_PORT` | `19998` | Relay port |

## Troubleshooting

**No sounds playing?**
1. Check peon-ping is installed: `peon status`
2. Check volume: `peon volume`
3. Test a sound: `peon preview session.start`
4. For SSH: ensure relay is running on local machine

**"peon: command not found"?**
- peon-ping installs to `~/.claude/hooks/peon-ping/`
- The installer adds aliases to `.bashrc`/`.zshrc`
- Reload your shell or run: `source ~/.bashrc`

**Sounds cut off?**
- peon-ping plays sounds asynchronously
- Some terminals may have issues with rapid successive sounds
- Use `/peon-test` to verify all categories work

## Available Sound Packs

Default installed packs:
- `peon` - Warcraft III Orc Peon (default)
- `peasant` - Warcraft III Human Peasant  
- `sc_kerrigan` - StarCraft Sarah Kerrigan
- `sc_battlecruiser` - StarCraft Battlecruiser
- `glados` - Portal GLaDOS

Install more:
```bash
peon packs list --registry    # See all available
peon packs install <name>      # Install a pack
peon packs install --all       # Install all 165+ packs
```

## License

MIT - See peon-ping repository for full license
