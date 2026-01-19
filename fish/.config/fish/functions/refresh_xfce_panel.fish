function refresh_xfce_panel
    pkill xfce4-panel
    xfce4-panel & disown
end
