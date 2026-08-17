# 01-mise — runs after 00-path, so `command -q mise` is reliable even on a
# fresh machine. See 00-path.fish for why ordering matters.
# mise manages user-space CLI tools and runtimes. See ~/.config/mise/config.toml.
# Interactive shells get full activation (PATH hooks, per-directory env);
# non-interactive shells get shims, which are cheaper and script-safe.
if command -q mise
    if status is-interactive
        mise activate fish | source
    else
        mise activate fish --shims | source
    end
end
