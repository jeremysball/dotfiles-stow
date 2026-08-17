# 00-path — runs before 01-mise by design. fish sources conf.d/*.fish
# alphabetically, so PATH must be set before 01-mise checks `command -q mise`.
# On a fresh machine fish inherits system PATH only
# (/usr/local/sbin:/usr/local/bin:/usr/bin:/bin) with no ~/.local/bin where
# `mise` lives (curl https://mise.run | sh). Without this file first, activation
# never runs and no mise tool (cowsay, catbow, etc.) is visible at fish_greeting.
# fish_add_path dedupes, so PATH doesn't grow across nested shells.

# mise binary — must be on PATH for 01-mise even in non-interactive shells
if not contains -- $HOME/.local/bin $PATH
    fish_add_path --global --prepend $HOME/.local/bin
end
if test -d /home/linuxbrew/.linuxbrew/bin; and not contains -- /home/linuxbrew/.linuxbrew/bin $PATH
    fish_add_path --global --prepend /home/linuxbrew/.linuxbrew/bin
end

# go-installed tools (bumblebee, catbow fallback, etc.) — only needed interactively
if status is-interactive
    fish_add_path --global --append --path $HOME/go/bin
end
