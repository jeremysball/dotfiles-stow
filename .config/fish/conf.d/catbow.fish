# catbow (https://github.com/jeremysball/catbow) installs as `catbow`
# (go install uses the module path), but the README pipeline is
# `fortune | cowsay | cb`. Define a thin function so the README's
# invocation works without renaming the binary.
#
# Using a function (not `alias`) so the lookup is lazy -- the file is
# sourced before mise fully activates PATH on some shells, and fish's
# alias would error on a missing command body at definition time.
function cb
    catbow $argv
end
