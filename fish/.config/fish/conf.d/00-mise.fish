# Named 00- so it sorts first. fish sources conf.d/*.fish alphabetically, and
# later files guard on `command -q <tool>` for tools mise provides. If mise
# activated at its natural "m" position, every guard in a file sorting before
# it would fail on a machine where mise owns that tool.
# mise manages user-space CLI tools and runtimes. See ~/.config/mise/config.toml.
# Interactive shells get the full activation (PATH hooks, per-directory env);
# non-interactive shells get shims, which are cheaper and script-safe.
if command -q mise
    if status is-interactive
        mise activate fish | source
    else
        mise activate fish --shims | source
    end
end
