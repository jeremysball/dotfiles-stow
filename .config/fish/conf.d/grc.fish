# grc ships /etc/grc.fish from the distro package, so it stays on pacman
# rather than mise. Guarded because not every machine has it installed.
if status is-interactive; and test -f /etc/grc.fish
    source /etc/grc.fish
end
