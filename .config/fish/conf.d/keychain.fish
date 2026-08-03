# ssh-agent via keychain. Guarded because only the graphical hosts install it.
# To add new SSH key, use:
# set --universal --append SSH_KEYS_TO_AUTOLOAD ~/.ssh/id<keyname>
# To remove a key, remove it from the list using its index:
# set --universal --erase SSH_KEYS_TO_AUTOLOAD[index_of_key]
if status is-interactive; and command -q keychain; and set -q SSH_KEYS_TO_AUTOLOAD
    if status is-login
        keychain --eval $SSH_KEYS_TO_AUTOLOAD | source
    else
        keychain --eval $SSH_KEYS_TO_AUTOLOAD --quick --quiet | source
    end
end
