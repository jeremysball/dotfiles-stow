if status is-interactive
    # Commands to run in interactive sessions can go here
    if status is-login
        eval $(keychain --eval ~/.ssh/id_ed25519)
    else
        eval $(keychain --eval ~/.ssh/id_ed25519 --quick --quiet)
    end
    source /etc/grc.fish
    alias ls='eza --git --color=auto --icons'
end
