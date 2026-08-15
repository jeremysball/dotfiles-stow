# Supersedes the old conf.d/secrets-reminder.fish fish_prompt nag: same
# locked/needs-resource checks, but surfaced once here at shell start
# instead of on every prompt draw. When secrets are fine, show a fortune;
# otherwise swap the fortune text for the relevant status line so the
# cowsay/catbow pipeline still runs either way.
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

    if test -n "$text"
        echo $text | cowsay -g
    else
        fortune -as | cowsay -g
    end | catbow -freq .2 -spread 2.3
end
