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
