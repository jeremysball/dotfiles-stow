# Nag once per session if secrets aren't unlocked, or were unlocked in
# another terminal after this shell already sourced conf.d/secrets.fish.
#
# catbow is a personal binary from ~/go/bin, not a distro package, so fall
# back to a plain echo where it is missing. Without the fallback the pipe
# fails and the reminder is swallowed entirely, which defeats the point of a
# reminder.
function __secrets_nag
    if command -q catbow
        echo $argv | catbow
        set_color normal
    else
        echo $argv
    end
end

function __secrets_status_check --on-event fish_prompt
    if status is-interactive; and not set -q __secrets_reminder_shown
        set -l secrets_file (string join '' (set -q XDG_RUNTIME_DIR; and echo $XDG_RUNTIME_DIR; or echo /run/user/(id -u)) /secrets/global.env)

        if not test -f "$secrets_file"
            set -g __secrets_reminder_shown 1
            __secrets_nag "secrets are locked! run secrets-unlock"
        else if not set -q GIT_EMAIL
            set -g __secrets_reminder_shown 1
            __secrets_nag "Remember to source config.fish or restart your shell!"
        end
    end
end
