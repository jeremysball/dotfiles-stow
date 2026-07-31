# This repo tracks only the fish_plugins manifest next to this file, not the
# function and completion files fisher installs from it. On a machine that is
# missing any plugin the manifest lists, install them.
#
# Two things about fisher and this manifest, both verified by reading
# functions/fisher.fish rather than assumed:
#
# 1. EVERY fisher subcommand that changes state (install, update, remove,
#    uninstall) rewrites fish_plugins. It writes the set that is actually
#    installed, not the set the file listed. Since stow symlinks the manifest
#    into this repo, that write lands on tracked content.
#
#    So `fisher install <x>` after a failed tide install rewrites the manifest
#    to just <x>, silently dropping tide. That happened. `fisher update` is
#    safe only because it installs the manifest's contents first, making the
#    rewrite a no-op. Do not swap it for `fisher install`.
#
# 2. `fisher remove` of the last remaining plugin runs `rm -f $fish_plugins`,
#    which deletes the stow symlink. The repo file survives; the link does not.
#    Re-stow to repair it.
#
# The guard below checks that every plugin in the manifest is actually
# installed, not merely that fisher exists. Guarding on `functions -q fisher`
# alone leaves a permanent hole: fisher writes its own function to disk before
# installing the rest, so an install that dies partway satisfies the guard
# forever and the remaining plugins never get retried.

function __fisher_bootstrap_needed
    functions -q fisher; or return 0

    set -l manifest $__fish_config_dir/fish_plugins
    test -r $manifest; or return 1

    for plugin in (string trim < $manifest | string match -rv '^\s*(#|$)')
        contains -- (string lower -- $plugin) (string lower -- $_fisher_plugins); or return 0
    end
    return 1
end

# 3. fisher runs in a non-interactive child shell. Plugin install events gate
#    their prompts on `status is-interactive` — tide's _tide_init_install asks
#    "Configure tide prompt? [Y/n]" and launches a multi-step wizard on y OR
#    on empty input (so piping stdin in makes it worse, not better). In a
#    non-interactive child that whole branch is skipped: tide loads its lean
#    defaults silently, and `tide configure` stays available on demand.

if status is-interactive; and __fisher_bootstrap_needed
    if command -q curl
        echo "installing fish plugins from fish_plugins..."
        fish -c 'functions -q fisher
            or curl -fsSL --max-time 15 https://raw.githubusercontent.com/jorgebucaran/fisher/main/functions/fisher.fish | source
            and fisher update'
    else
        echo "fish plugin bootstrap needs curl. Install curl, then restart the shell."
    end
end

functions -e __fisher_bootstrap_needed
