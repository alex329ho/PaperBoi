#!/bin/sh
# husky

if [ -z "$husky_skip_init" ]; then
  debug () {
    [ "$HUSKY_DEBUG" = "1" ] && echo "husky (debug) - $1"
  }

  readonly hook_name="$(basename "$0")"
  debug "starting $hook_name..."

  readonly husky_skip_init=1
  export husky_skip_init

  sh -e "$(dirname "$0")/../husky.sh" "$@"
  exitCode=$?

  if [ $exitCode != 0 ]; then
    debug "$hook_name hook exited with code $exitCode"
  fi

  exit $exitCode
fi
