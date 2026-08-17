# Named 00- so it sorts first. fish sources conf.d/*.fish alphabetically, and
# later files guard on `command -q <tool>` for tools mise provides. If mise
# activated at its natural "m" position, every guard in a file sorting before
# it would fail on a machine where mise owns that tool.
# mise manages user-space CLI tools and runtimes. See ~/.config/mise/config.toml.
# Interactive shells get the full activation (PATH hooks, per-directory env);
# non-interactive shells get shims, which are cheaper and script-safe.

# --- mise binary discovery: fix fresh-machine chicken-and-egg ---
# On a fresh install fish's inherited PATH is the system default
# (/usr/local/sbin:/usr/local/bin:/usr/bin:/bin). It does NOT contain
# ~/.local/bin where `mise` lives (curl https://mise.run | sh), nor does it
# contain ~/.local/share/mise/shims. If we just run `command -q mise` here
# without first ensuring ~/.local/bin is on PATH, the check fails, activation
# never runs, and no mise tool (cowsay, catbow, etc.) is visible when
# fish_greeting fires later. `path.fish` would normally add ~/.local/bin, but
# it sorts *after* this file, so it cannot help here. Make this file
# self-contained.
if not contains -- $HOME/.local/bin $PATH
    fish_add_path --global --prepend $HOME/.local/bin
end
# Linuxbrew is a second common mise location on some hosts; add it if present
# so `command -q mise` can still succeed there.
if test -d /home/linuxbrew/.linuxbrew/bin; and not contains -- /home/linuxbrew/.linuxbrew/bin $PATH
    fish_add_path --global --prepend /home/linuxbrew/.linuxbrew/bin
end

# Resolve mise to a usable binary. Prefer PATH result, fall back to the
# absolute install location so the check is not purely PATH-dependent.
set -l _mise_bin (command -v mise 2>/dev/null)
if test -z "$_mise_bin"; and test -x $HOME/.local/bin/mise
    set _mise_bin $HOME/.local/bin/mise
else if test -z "$_mise_bin"; and test -x /home/linuxbrew/.linuxbrew/bin/mise
    set _mise_bin /home/linuxbrew/.linuxbrew/bin/mise
end

if test -n "$_mise_bin"; and test -x $_mise_bin
    if status is-interactive
        $_mise_bin activate fish | source
    else
        $_mise_bin activate fish --shims | source
    end
end
# Clean up temp var so it does not leak into the session.
set -e _mise_bin
