#!/usr/bin/env python3
"""Write public/llms.txt (https://llmstxt.org) from the built site.

Slugs and titles come from Quartz's contentIndex.json so URLs match the site exactly;
descriptions come from each page's frontmatter. Run after `quartz build`.
"""
import json, os, sys
import yaml

SITE = "https://systemsnull.net"
root = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
content_dir = os.path.join(root, "content")
index = json.load(open(os.path.join(root, "public/static/contentIndex.json")))

TOPICS = [("data-engineering-ai", "Data Engineering / AI"), ("neuropsychology", "NeuroPsychology"),
          ("human-things", "Human Things")]
PAGES = ["about", "talks", "projects", "podcast"]


def frontmatter(path):
    try:
        text = open(os.path.join(content_dir, path), encoding="utf-8").read()
    except OSError:
        return {}
    if not text.startswith("---"):
        return {}
    try:
        return yaml.safe_load(text.split("---", 2)[1]) or {}
    except yaml.YAMLError:
        return {}


def line(slug, entry, fallback=""):
    url = f"{SITE}/{slug.removesuffix('/index').removesuffix('index')}".rstrip("/")
    desc = frontmatter(entry["filePath"].removeprefix("content/")).get("description") or fallback
    return f"- [{entry['title'].strip()}]({url})" + (f": {' '.join(str(desc).split())}" if desc else "")


def section_items(prefix):
    items = [(s, e) for s, e in index.items() if s.startswith(prefix + "/") and not s.endswith("index")]
    return sorted(items, key=lambda x: x[1]["title"].lower())


home = frontmatter("index.md")
bio = " ".join(open(os.path.join(content_dir, "index.md"), encoding="utf-8").read().split("---", 2)[2].split())
out = ["# systemsnull", "", "> Personal blog of Lisa N. Cao (developer relations, open source): data engineering "
       "and AI, neuropsychology, and the human side of technology.", "", bio, ""]

out.append("## Pages")
for p in PAGES:
    if p in index:
        out.append(line(p, index[p]))
out.append("")

for folder, label in TOPICS:
    items = section_items(f"posts/{folder}")
    if items:
        out.append(f"## Blog: {label}")
        out += [line(s, e) for s, e in items]
        out.append("")

out.append("## Optional")
for slug, label in [("seven-public/index", "Seven's notebook (an AI agent's essays)"),
                    ("glyph-public/index", "Glyph's notebook (an AI agent's essays)")]:
    if slug in index:
        out.append(f"- [{label}]({SITE}/{slug.removesuffix('/index')})")
out.append(f"- [RSS feed]({SITE}/index.xml)")
out.append(f"- [Sitemap]({SITE}/sitemap.xml)")

open(os.path.join(root, "public/llms.txt"), "w", encoding="utf-8").write("\n".join(out).rstrip() + "\n")
print(f"llms.txt: {sum(1 for l in out if l.startswith('- '))} links")
