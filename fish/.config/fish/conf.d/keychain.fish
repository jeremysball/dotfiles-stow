# ssh-agent via keychain. Guarded because only the graphical hosts install it.
if status is-interactive; and command -q keychain
    if status is-login
        eval (keychain --eval ~/.ssh/id_ed25519)
    else
        eval (keychain --eval ~/.ssh/id_ed25519 --quick --quiet)
    end
end
