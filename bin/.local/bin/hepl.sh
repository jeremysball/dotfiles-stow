#!/usr/bin/env bash

# from https://gist.github.com/RobinJadoul/aab9ea148dbd2a81cc1e896120638cf1

function tmux_or_die() {
  if [ -z "$TMUX" ]; then
    echo >/dev/stderr Please run me in tmux...;
    exit 1;
  fi
}

function spawn_pane() {
  tmux_or_die
  tmux split-window -d jupyter console --kernel="$1" -f="/tmp/hepl-$PPID.json" --ZMQTerminalInteractiveShell.include_other_output=True --ZMQTerminalInteractiveShell.other_output_prefix=''
}

function send() {
  python3 -c 'import sys, textwrap; sys.stdout.write(textwrap.dedent(sys.stdin.read()))' | jupyter run --existing="/tmp/hepl-$PPID.json"
}

case "$1" in
  spawn) spawn_pane "$2" >/dev/null ;;
  send) send >/dev/null 2>&1 ;;
  *) exit 1 ;;
esac
