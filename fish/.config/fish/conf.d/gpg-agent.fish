# gpg-agent needs the tty wired up for pinentry to work in a headless session.
# Guarded so a host without gnupg installed starts a shell cleanly.
if status is-interactive; and command -q gpg-connect-agent
    set -gx GPG_TTY (tty)
    gpg-connect-agent updatestartuptty /bye >/dev/null
end

# go-installed tools (bumblebee, etc.)
fish_add_path $HOME/go/bin
