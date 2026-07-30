# ssh-agent via keychain. Desktop-only: the server hosts use gpg-agent instead.
if status is-interactive; and command -q keychain
    if status is-login
        eval (keychain --eval ~/.ssh/id_ed25519)
    else
        eval (keychain --eval ~/.ssh/id_ed25519 --quick --quiet)
    end
end
