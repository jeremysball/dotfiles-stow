if status is-interactive; and command -q fzf
    set -gx FZF_DEFAULT_OPTS "--height 40% --layout=reverse --border --info=inline --cycle"

    # Ctrl-T: preview the first lines of the selected file
    set -gx FZF_CTRL_T_OPTS "--preview 'head -200 {}' --preview-window 'right,60%,border-left,wrap'"

    # Alt-C: preview the target directory as a tree
    set -gx FZF_ALT_C_OPTS "--preview 'eza --tree --level=2 --color=always --icons=always {}' --preview-window 'right,50%,border-left'"

    fzf --fish | source
end
