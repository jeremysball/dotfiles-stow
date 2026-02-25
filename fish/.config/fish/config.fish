if status is-interactive
    # Commands to run in interactive sessions can go here
    if status is-login
      and status is-interactive
        # To add new SSH key, use:
        # set --universal --append SSH_KEYS_TO_AUTOLOAD ~/.ssh/id<keyname>
        # To remove a key, remove it from the list using its index:
        # set --universal --erase SSH_KEYS_TO_AUTOLOAD[index_of_key]
        keychain --eval $SSH_KEYS_TO_AUTOLOAD | source
    end
    source /etc/grc.fish
    alias ls='eza --git --color=auto --icons'
    set PATH "$PATH:$HOME/.local/bin:$HOME/go/bin"
    bind ctrl-backspace backward-kill-bigword
end
