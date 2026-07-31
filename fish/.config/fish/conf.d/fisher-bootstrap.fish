# This repo tracks only the fish_plugins manifest next to this file, not the
# function and completion files fisher installs from it. On a machine without
# fisher, load fisher into memory and let `fisher update` install everything
# the manifest lists.
#
# Do not call `fisher install jorgebucaran/fisher` here. That rewrites
# fish_plugins, and since the manifest is a symlink into this repo, it
# overwrites the tracked file with whatever fisher happens to know about.
# `fisher update` reads the manifest instead of rewriting it.
#
# This runs once per machine, not once per shell: the `functions -q fisher`
# guard holds only until the first successful install.
#
# On a fresh box the prompt stays plain fish default until this finishes.

if status is-interactive; and not functions -q fisher
    if command -q curl
        echo "fisher not found, installing plugins from fish_plugins..."
        curl -fsSL --max-time 15 https://raw.githubusercontent.com/jorgebucaran/fisher/main/functions/fisher.fish | source
        and fisher update
    else
        echo "fisher bootstrap needs curl. Install curl, then restart the shell."
    end
end
