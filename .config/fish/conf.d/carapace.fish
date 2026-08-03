# carapace generates fish completions for hundreds of CLIs that don't ship
# their own. Managed by mise; see ~/.config/mise/config.toml.
if command -q carapace
    carapace _carapace fish | source
end
