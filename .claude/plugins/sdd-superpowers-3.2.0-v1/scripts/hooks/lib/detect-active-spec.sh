#!/usr/bin/env bash
# Shared library: source this file — do not execute directly
# Provides:
#   detect_sdd_project <cwd>  — exits 0 if docs/specs/ exists, non-zero otherwise
#   detect_active_spec <cwd>  — prints active spec dir path to stdout (empty if none found);
#                               always exits 0 regardless of match result

detect_sdd_project() {
  local cwd="${1:-${CWD:-$PWD}}"
  [[ -d "${cwd}/docs/specs" ]]
}

detect_active_spec() {
  local cwd="${1:-${CWD:-$PWD}}"
  local specs_dir="${cwd}/docs/specs"

  [[ -d "$specs_dir" ]] || return 0

  # Primary: match git branch NNN prefix against spec directory names
  local branch
  branch=$(git -C "$cwd" rev-parse --abbrev-ref HEAD 2>/dev/null || true)

  if [[ -n "$branch" ]]; then
    local spec_num
    spec_num="${branch%%[^0-9]*}"
    if [[ -n "$spec_num" ]]; then
      local matched=""
      for d in "${specs_dir}/${spec_num}-"*/; do
        [[ -d "$d" ]] && matched="${d%/}" && break
      done
      if [[ -n "$matched" ]]; then
        echo "$matched"
        return 0
      fi
    fi
  fi

  # Fallback: most recently modified spec directory (by directory mtime)
  local recent="" latest_time=0 mtime d
  while IFS= read -r -d '' d; do
    mtime=$(stat -c %Y "$d" 2>/dev/null || stat -f %m "$d" 2>/dev/null || echo 0)
    if [[ "$mtime" -gt "$latest_time" ]]; then
      latest_time="$mtime"
      recent="${d%/}"
    fi
  done < <(find "$specs_dir" -maxdepth 1 -mindepth 1 -type d -name '[0-9]*' -print0 2>/dev/null)
  echo "$recent"
}
