#!/usr/bin/env sh
if [ -z "$husky_skip_init" ]; then
  debug () {
    [ "$HUSKY_DEBUG" = "1" ] && echo "$1"
  }
  readonly hook_name="$(basename "$0")"
  debug "husky:debug $hook_name hook started"
  if [ "$HUSKY" = "0" ]; then
    debug "husky:debug $hook_name hook disabled"
    exit 0
  fi
  if [ -n "$CI" ]; then
    debug "husky:debug CI detected, skipping $hook_name hook"
    exit 0
  fi
  . "$(dirname "$0")/husky.local.sh" >/dev/null 2>&1 || true
  export husky_skip_init=1
  sh -e "$0" "$@"
  exitCode="$?"
  debug "husky:debug $hook_name hook exited with code $exitCode"
  exit "$exitCode"
fi

