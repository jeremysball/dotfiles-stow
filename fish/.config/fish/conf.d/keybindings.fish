# Ctrl-Backspace kills one bigword backward (kitty sends a proper sequence).
if status is-interactive
    bind ctrl-backspace backward-kill-bigword
end
