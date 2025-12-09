#!/bin/sh
if [ -z "$husky_skip_init" ]; then
  husky_skip_init=1
  debug () {
    [ "$HUSKY_DEBUG" = "1" ] && echo "husky (debug) - $1"
  }
  readonly husky_skip_init
  export husky_skip_init
  debug "starting" "$0"
  if [ "$HUSKY" = "0" ]; then
    debug "HUSKY env variable is set to 0, skipping hook"
    exit 0
  fi
  if [ -f ~/.huskyrc ]; then
    debug "sourcing ~/.huskyrc"
    . ~/.huskyrc
  fi
  export readonly husky_skip_init
fi
