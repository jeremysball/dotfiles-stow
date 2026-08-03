#
# ~/.bashrc
#

# If not running interactively, don't do anything
[[ $- != *i* ]] && return

alias ls='ls --color=auto'
alias grep='grep --color=auto'
PS1='[\u@\h \W]\$ '
source ~/.config/gh/pat-switcher.sh

export PATH="$HOME/.local/bin:$PATH"

# opencode
export PATH="$HOME/.opencode/bin:$PATH"

# go-installed tools (bumblebee, etc.)
export PATH="$HOME/go/bin:$PATH"

# show pending bumblebee nightly-scan alert, if any
[ -s "${XDG_STATE_HOME:-$HOME/.local/state}/bumblebee/ALERT" ] && cat "${XDG_STATE_HOME:-$HOME/.local/state}/bumblebee/ALERT" || :

# herdr
[ -f ~/.local/share/bash-completion/completions/herdr ] && source ~/.local/share/bash-completion/completions/herdr

# secret-management: load global secrets
[ -f "$HOME/.config/secrets.sh" ] && . "$HOME/.config/secrets.sh"

# mise: per-directory tool version switching (.mise.toml) and hooks (e.g.
# taskferry's worktree node_modules auto-setup on cd)
command -v mise >/dev/null 2>&1 && eval "$(mise activate bash)"
