#!/bin/bash
# Switch GitHub CLI auth between repos
# Usage: source pat-switcher.sh <repo>

pat_switch() {
    case "$1" in
        pypitui)
            export GH_TOKEN="$PYPITUI_REPO_PAT"
            echo "Switched to pypitui PAT"
            ;;
        alfred)
            export GH_TOKEN="$ALFRED_REPO_PAT"
            echo "Switched to alfred PAT"
            ;;
        default|clear)
            unset GH_TOKEN
            echo "Cleared GH_TOKEN (using default)"
            ;;
        *)
            echo "Usage: pat_switch [pypitui|alfred|clear]"
            echo "Current: ${GH_TOKEN:+GH_TOKEN set (${#GH_TOKEN} chars)}${GH_TOKEN:-GH_TOKEN not set}"
            ;;
    esac
}

# Auto-switch based on current directory
pat_auto() {
    if [[ "$PWD" == *"pypitui"* ]]; then
        pat_switch pypitui
    elif [[ "$PWD" == *"alfred"* ]]; then
        pat_switch alfred
    else
        pat_switch clear
    fi
}
