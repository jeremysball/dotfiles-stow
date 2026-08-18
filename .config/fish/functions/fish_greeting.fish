# Supersedes the old conf.d/secrets-reminder.fish fish_prompt nag: same
# locked/needs-resource checks, but surfaced once here at shell start
# instead of on every prompt draw. When secrets are fine, show a fortune;
# otherwise swap the fortune text for the relevant status line so the
# cowsay/catbow pipeline still runs either way.
#
# Defensive: cowsay and catbow are mise-managed (and fortune may be missing
# on a minimal container). On a fresh machine where `mise activate` has not
# yet succeeded, or before `mise install` has fetched them, the pipeline
# `fortune | cowsay | catbow` would fail with "Unknown command" and produce
# no greeting at all. Each stage is now guarded with `command -q` and falls
# back to the plain text, but without breaking fish's array handling for
# multiline fortunes (see 92ae323 regression where `set msg (fortune -as)`
# split on newlines and `echo $msg | cowsay` re-joined with spaces, mangling
# the box).
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

    # Direct pipelines with fallbacks — preserves newlines unlike `set msg (fortune)`
    # which splits into an array and `echo $msg` which re-joins with spaces.
    if test -n "$text"
        if command -q cowsay
            if command -q catbow
                printf "%s\n" $text | cowsay -g 2>/dev/null | catbow -freq .2 -spread 2.3 2>/dev/null; or printf "%s\n" $text | cowsay -g 2>/dev/null; or printf "%s\n" $text
            else
                printf "%s\n" $text | cowsay -g 2>/dev/null; or printf "%s\n" $text
            end
        else
            if command -q catbow
                printf "%s\n" $text | catbow -freq .2 -spread 2.3 2>/dev/null; or printf "%s\n" $text
            else
                printf "%s\n" $text
            end
        end
    else
        if command -q fortune
            set -l fortune_out (fortune -as 2>/dev/null | string collect)
            if test -z "$fortune_out"
                set fortune_out "Welcome!"
            end
            if command -q cowsay
                if command -q catbow
                    printf "%s" $fortune_out | cowsay -g 2>/dev/null | catbow -freq .2 -spread 2.3 2>/dev/null; or printf "%s" $fortune_out | cowsay -g 2>/dev/null; or printf "%s" $fortune_out
                else
                    printf "%s" $fortune_out | cowsay -g 2>/dev/null; or printf "%s" $fortune_out
                end
            else
                if command -q catbow
                    printf "%s" $fortune_out | catbow -freq .2 -spread 2.3 2>/dev/null; or printf "%s" $fortune_out
                else
                    printf "%s" $fortune_out
                end
            end
        else
            set -l fallback "Welcome!"
            if command -q cowsay
                if command -q catbow
                    printf "%s\n" $fallback | cowsay -g 2>/dev/null | catbow -freq .2 -spread 2.3 2>/dev/null; or printf "%s\n" $fallback | cowsay -g 2>/dev/null; or printf "%s\n" $fallback
                else
                    printf "%s\n" $fallback | cowsay -g 2>/dev/null; or printf "%s\n" $fallback
                end
            else
                if command -q catbow
                    printf "%s\n" $fallback | catbow -freq .2 -spread 2.3 2>/dev/null; or printf "%s\n" $fallback
                else
                    printf "%s\n" $fallback
                end
            end
        end
    end
end
