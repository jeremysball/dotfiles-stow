# Wraps the binary by absolute path so the function does not call itself.
function claude --wraps=claude --description 'run claude from ~/.local/bin'
    $HOME/.local/bin/claude $argv
end
