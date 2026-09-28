#!/bin/bash
# systemsnull auto-deploy — syncs Obsidian content, builds Quartz, pushes to Cloudflare Pages
set -euo pipefail

SITE_DIR="$HOME/systemsnull"
LOG_FILE="$HOME/.local/share/systemsnull/deploy.log"
OBSIDIAN_SEVEN="$HOME/Documents/systemsnull/Seven-Public"
OBSIDIAN_GLYPH="$HOME/Documents/systemsnull/Glyph-Public"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

cd "$SITE_DIR"

log "Syncing Obsidian content..."
rsync -a --delete "$OBSIDIAN_SEVEN/" "$SITE_DIR/content/seven-public/"
HOLD_FILE="$SITE_DIR/deploy-hold.txt"
rsync -a --delete --delete-excluded --exclude-from=<(grep -v '^#' "$HOLD_FILE" | sed '/^$/d') \
  "$OBSIDIAN_GLYPH/" "$SITE_DIR/content/glyph-public/"
# Drop index lines that link to held essays so the published index has no dead links
python3 - "$HOLD_FILE" "$SITE_DIR/content/glyph-public/index.md" <<'PY'
import sys
held = [l.strip() for l in open(sys.argv[1]) if l.strip() and not l.startswith("#")]
idx = sys.argv[2]
lines = open(idx).read().splitlines(keepends=True)
keep = [l for l in lines if not any(f"({h})" in l or f"({h}" in l for h in held)]
open(idx, "w").writelines(keep)
print(f"held back {len(lines) - len(keep)} index entries")
PY
log "Sync complete (held: $(grep -vc '^#' "$HOLD_FILE") entries)."

log "Building Quartz..."
npx quartz build >> "$LOG_FILE" 2>&1
log "Deploying to Cloudflare Pages..."
npx wrangler pages deploy public --project-name systemsnull --branch main --commit-dirty=true >> "$LOG_FILE" 2>&1
log "Deploy complete."
