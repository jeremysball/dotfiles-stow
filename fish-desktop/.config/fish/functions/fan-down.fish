function fan-down
    sudo -u root "fish" "-c printf '2' > /sys/devices/platform/hp-wmi/hwmon/hwmon*/pwm1_enable"
end
