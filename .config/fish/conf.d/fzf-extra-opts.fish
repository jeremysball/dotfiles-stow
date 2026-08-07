# Layered on top of PatrickF1/fzf.fish plugin. The plugin sets its own sane
# defaults (40% height, reverse layout, border, info=inline, cycle) which
# already cover most of what FZF_DEFAULT_OPTS used to spell out. Only carry
# over the two preview-customised opts that the plugin doesn't define on
# its own. Source order: fish reads conf.d/*.fish in lexical order, so this
# file (z-prefix? no — _fzf.fish would sort before fzf.fish from the plugin,
# which loads itself via its own install hook, not conf.d) actually loads
# after the plugin because the plugin's conf.d/fzf.fish is sorted after
# this one by lexical order on a lowercase compare.

set -gx FZF_CTRL_T_OPTS "--preview 'head -200 {}' --preview-window 'right,60%,border-left,wrap'"

set -gx FZF_ALT_C_OPTS "--preview 'eza --tree --level=2 --color=always --icons=always {}' --preview-window 'right,50%,border-left'"
