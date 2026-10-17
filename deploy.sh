#!/bin/bash
# systemsnull auto-deploy — syncs Obsidian content, builds Quartz, pushes to Cloudflare Pages
set -euo pipefail

SITE_DIR="$HOME/systemsnull"
LOG_FILE="$HOME/.local/share/systemsnull/deploy.log"
OBSIDIAN_SEVEN="$HOME/Documents/systemsnull/Seven-Public"
OBSIDIAN_GLYPH="$HOME/Documents/systemsnull/Glyph-Public"
OBSIDIAN_BLOG="$HOME/Documents/systemsnull/Blog-Public"
OBSIDIAN_SITE="$HOME/Documents/systemsnull/Site-Public"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

cd "$SITE_DIR"

log "Syncing Obsidian content..."
rsync -a --delete "$OBSIDIAN_SEVEN/" "$SITE_DIR/content/seven-public/"
# Lisa's own posts; the vault is the source of truth (content/posts is overwritten)
rsync -a --delete "$OBSIDIAN_BLOG/" "$SITE_DIR/content/posts/"
# Site pages (Home, About, Talks, ...) and their images: mirror only root-level .md files and
# assets/, so the other content folders (posts, agents, emotes) are left alone
rsync -a --delete --include='/*.md' --include='/assets/***' --exclude='*' "$OBSIDIAN_SITE/" "$SITE_DIR/content/"
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
# Emotes: the full set lives privately in the vault; publish only the ones pages actually embed
python3 - "$HOME/Documents/systemsnull/emotes" "$SITE_DIR/content" <<'PY'
import os, re, shutil, sys
src, content = sys.argv[1], sys.argv[2]
out = os.path.join(content, "emotes")
shutil.rmtree(out, ignore_errors=True)
available = {f for f in os.listdir(src) if os.path.isfile(os.path.join(src, f))}
used = set()
for root, _, files in os.walk(content):
    for f in files:
        if f.endswith(".md"):
            text = open(os.path.join(root, f), encoding="utf-8").read()
            for name in re.findall(r"!\[\[([^\]|#]+)", text):
                name = os.path.basename(name.strip())
                if name in available:
                    used.add(name)
if used:
    os.makedirs(out)
    for name in used:
        shutil.copy2(os.path.join(src, name), out)
print(f"emotes published: {len(used)}")
PY
log "Sync complete (held: $(grep -vc '^#' "$HOLD_FILE") entries)."

log "Building Quartz..."
npx quartz build >> "$LOG_FILE" 2>&1
cp "$SITE_DIR/cloudflare/_headers" "$SITE_DIR/public/_headers"
cp "$SITE_DIR/cloudflare/robots.txt" "$SITE_DIR/public/robots.txt"
# IndexNow key file must be served from the site root (Bing/Yandex/Seznam/Naver pick up sitemap pings)
cp "$SITE_DIR"/cloudflare/f91e0345d5bb413cf42125a08cf7edb8.txt "$SITE_DIR/public/"
python3 "$SITE_DIR/scripts/gen-llms.py" "$SITE_DIR" >> "$LOG_FILE" 2>&1
log "Deploying to Cloudflare Pages..."
npx wrangler pages deploy public --project-name systemsnull --branch main --commit-dirty=true >> "$LOG_FILE" 2>&1
log "Deploy complete."
