# This file used to hold vendored `zoxide init fish` output, which drifted
# every time zoxide updated. Generate it at shell start instead.
if command -q zoxide
    zoxide init fish | source
end
