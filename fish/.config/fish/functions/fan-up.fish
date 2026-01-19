function fan-up
    sudo -u root "fish" "-c printf "0" > /sys/devices/platform/hp-wmi/hwmon/hwmon*/pwm1_enable"
end
