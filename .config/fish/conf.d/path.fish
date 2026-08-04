# User bin dirs, appended so system packages keep precedence over them.
# fish_add_path dedupes, so PATH doesn't grow across nested shells the way
# a bare `set PATH "$PATH:..."` would.
if status is-interactive
    fish_add_path --append --path $HOME/.local/bin $HOME/go/bin
end
