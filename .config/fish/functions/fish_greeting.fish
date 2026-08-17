# Supersedes the old conf.d/secrets-reminder.fish fish_prompt nag: same
# locked/needs-resource checks, but surfaced once here at shell start
# instead of on every prompt draw. When secrets are fine, show a fortune;
# otherwise swap the fortune text for the relevant status line.
#
# Defensive: cowsay and catbow are mise-managed (and fortune may be missing
# on a minimal container). On a fresh machine where `mise activate` has not
# yet succeeded, or before `mise install` has fetched them, the pipeline
# `fortune | cowsay | catbow` would fail with "Unknown command" and produce
# no greeting at all. Each layer is now guarded with `command -q` and falls
# back to the plain text.
function fish_greeting
    if set -q INSIDE_EMACS
        return
    end
    set -l text
    set -l secrets_file (string join '' (set -q XDG_RUNTIME_DIR; and echo $XDG_RUNTIME_DIR; or echo /run/user/(id -u)) /secrets/global.env)

    if not test -f "$secrets_file"
        set text "secrets are locked! run secrets-unlock"
    else if not set -q GIT_EMAIL
        set text "Remember to source config.fish or restart your shell!"
    end

    # Base message: status text or fortune (or static fallback).
    set -l msg
    if test -n "$text"
        set msg $text
    else
        if command -q fortune
            set msg (fortune -as 2>/dev/null)
            if test -z "$msg"
                set msg "Welcome!"
            end
        else
            set msg "Welcome!"
        end
    end

    # cowsay layer (mise: npm:cowsay). If missing or failing, keep plain msg.
    if command -q cowsay
        set -l _cowsay_out (echo $msg | cowsay -g 2>/dev/null)
        if test $status -eq 0; and test -n "$_cowsay_out"
            set msg $_cowsay_out
        end
    end

    # catbow layer (mise: github:jeremysball/catbow, fallback go/bin). Same guard.
    if command -q catbow
        echo $msg | catbow -freq .2 -spread 2.3 2>/dev/null; or echo $msg
    else
        echo $msg
    end
end
