function what_is_my_ip
    printf "$(curl ifconfig.me 2>/dev/null)\n"
end
