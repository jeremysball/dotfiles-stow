# ~/projects/mise-en-system must match the [bootstrap.repos] key in
# .config/mise/config.toml and init.sh's MISE_SYSTEM_DIR -- fish can't read
# either at function-definition time, so the path is a plain literal here.
function mise-sys --description "Run a mise-en-system task (mise -C ~/projects/mise-en-system run ...)"
    if not test -d ~/projects/mise-en-system
        echo "mise-sys: ~/projects/mise-en-system does not exist yet -- run ./init.sh from the dotfiles repo first" >&2
        return 1
    end
    mise -C ~/projects/mise-en-system run $argv
end
