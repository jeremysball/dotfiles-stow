# This repo tracks only the fish_plugins manifest next to this file, not the
# function and completion files fisher installs from it. On a machine without
# fisher, bootstrap it and install everything the manifest lists.
#
# This runs once per machine, not once per shell: the `functions -q fisher`
# guard holds only until the first successful install.
#
# On a fresh box the prompt stays plain fish default until this finishes.

if status is-interactive; and not functions -q fisher
    if command -q curl
        echo "fisher not found, bootstrapping plugins from fish_plugins..."
        curl -sL https://raw.githubusercontent.com/jorgebucaran/fisher/main/functions/fisher.fish | source
        and fisher install jorgebucaran/fisher
        and fisher update
    else
        echo "fisher not installed and curl is missing; install curl, then run:"
        echo "  curl -sL https://raw.githubusercontent.com/jorgebucaran/fisher/main/functions/fisher.fish | source && fisher install jorgebucaran/fisher"
    end
end
