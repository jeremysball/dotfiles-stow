# UV Auto-venv Activator for Fish
# Simple, fast, works with zoxide
# Auto-activates uv-created (or any) virtualenvs when entering directories

# Configuration
set -g UV_VENV_NAMES .venv venv env .env  # Directories to look for
set -g UV_VENV_ACTIVATE ./bin/activate.fish  # Path relative to venv root

# Store the currently activated venv to prevent redundant re-sourcing
set -g __uv_current_venv ""

# Function to find and activate venv
function __uv_auto_activate --on-variable PWD --description "Auto-activate uv venv on directory change"
    # Search for venv in current and parent directories
    set -l check_dir $PWD
    set -l found_venv ""
    
    while true
        for venv_name in $UV_VENV_NAMES
            set -l venv_path "$check_dir/$venv_name"
            if test -f "$venv_path/bin/activate.fish" -o -f "$venv_path/bin/activate"
                set found_venv "$venv_path"
                break
            end
        end
        
        if test -n "$found_venv"
            break
        end
        
        # Stop at root or home
        if test "$check_dir" = "/" -o "$check_dir" = "$HOME"
            break
        end
        
        set -l next_dir (path dirname -- "$check_dir")
        if test -z "$next_dir" -o "$next_dir" = "$check_dir"
            break
        end
        set check_dir "$next_dir"
    end
    
    # Deactivate if leaving venv
    if test -n "$__uv_current_venv" -a "$found_venv" != "$__uv_current_venv"
        if functions -q deactivate
            echo "🐍 Deactivating venv"
            deactivate
        end
        set -g __uv_current_venv ""
    end
    
    # Activate new venv
    if test -n "$found_venv" -a "$found_venv" != "$__uv_current_venv"
        set -g __uv_current_venv "$found_venv"
        echo "🐍 Activating venv: $found_venv"
        source "$found_venv/bin/activate.fish"
    end
end

# Optional: Add 'va' command for manual venv activation
function va --description "Activate venv in current or parent directories"
    __uv_auto_activate
end

# Optional: Add 'vd' command for deactivation
function vd --description "Deactivate current venv"
    if functions -q deactivate
        deactivate
        set -g __uv_current_venv ""
    end
end

# Run once on startup
__uv_auto_activate
