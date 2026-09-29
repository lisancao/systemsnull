#!/bin/bash
# Watch Seven-Public, Glyph-Public, Blog-Public and Site-Public for changes and auto-deploy
set -euo pipefail

WATCH_DIRS=(
  "$HOME/Documents/systemsnull/Seven-Public"
  "$HOME/Documents/systemsnull/Glyph-Public"
  "$HOME/Documents/systemsnull/Blog-Public"
  "$HOME/Documents/systemsnull/Site-Public"
)

for dir in "${WATCH_DIRS[@]}"; do
  mkdir -p "$dir"
done

echo "[systemsnull-watcher] Watching ${WATCH_DIRS[*]} for changes..."

while true; do
  inotifywait -r -q -e modify,create,delete,move "${WATCH_DIRS[@]}"
  sleep 5
  inotifywait -r -q -t 1 -e modify,create,delete,move "${WATCH_DIRS[@]}" 2>/dev/null || true
  "$HOME/systemsnull/deploy.sh"
done
