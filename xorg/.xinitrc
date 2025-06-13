#!/bin/sh

# Load X resources and keymaps
[[ -f ~/.Xresources ]] && xrdb -merge ~/.Xresources
[[ -f ~/.Xmodmap ]] && xmodmap ~/.Xmodmap

# Load scripts from xinitrc.d
if [ -d /etc/X11/xinit/xinitrc.d ] ; then
    for f in /etc/X11/xinit/xinitrc.d/?*.sh ; do
        [ -x "$f" ] && . "$f"
    done
    unset f
fi

export QT_SCALE_FACTOR=1.75
# setxkbmap -option caps:ctrl_modifier
# i3
