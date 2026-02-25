#!/usr/bin/env bash

# Get the IDs of your keyboard and trackpad
# Run 'xinput list' to find these names
KBD_NAME="AT Translated Set 2 keyboard"
TPAD_NAME="Elan Touchpad"

# Determine current state (this depends on your specific hardware)
# Many Chromebooks use 'tablet_mode' in sysfs
STATE=$(cat /sys/class/chromeos/tablet_mode) 

if [ "$STATE" -eq "1" ]; then
    # Tablet Mode: Disable inputs & Start OSK
    xinput disable "$KBD_NAME"
    xinput disable "$TPAD_NAME"
    onboard & 
else
    # Laptop Mode: Enable inputs & Kill OSK
    xinput enable "$KBD_NAME"
    xinput enable "$TPAD_NAME"
    pkill onboard
fi
