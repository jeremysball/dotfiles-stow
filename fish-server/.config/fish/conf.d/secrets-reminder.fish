# Nag once per session if secrets aren't unlocked, or were unlocked in
# another terminal after this shell already sourced conf.d/secrets.fish.
function __secrets_status_check --on-event fish_prompt
    if status is-interactive; and not set -q __secrets_reminder_shown
        set -l secrets_file (string join '' (set -q XDG_RUNTIME_DIR; and echo $XDG_RUNTIME_DIR; or echo /run/user/(id -u)) /secrets/global.env)

        if not test -f "$secrets_file"
            set -g __secrets_reminder_shown 1
            echo "secrets are locked! run secrets-unlock" | catbow; set_color normal
        else if not set -q GIT_EMAIL
            set -g __secrets_reminder_shown 1
            echo "Remember to source config.fish or restart your shell!" | catbow; set_color normal
        end
    end
end
