# gpg-agent needs the tty wired up for pinentry to work in a headless session.
if status is-interactive
    set -gx GPG_TTY (tty)
    gpg-connect-agent updatestartuptty /bye >/dev/null
end

# go-installed tools (bumblebee, etc.)
fish_add_path $HOME/go/bin
