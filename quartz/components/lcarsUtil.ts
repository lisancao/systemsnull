import { GlobalConfiguration } from "../cfg"
import { QuartzPluginData } from "../plugins/vfile"
import { getDate } from "./Date"
import { FullSlug, joinSegments, pathToRoot } from "../util/path"

// Chrome emotes live in quartz/static/emotes (post emotes come from the vault instead)
export function emoteSrc(slug: string | undefined, file: string): string {
  return joinSegments(pathToRoot((slug ?? "index") as FullSlug), "static/emotes", file)
}

// Year plus day-of-year, e.g. 2026.271. Honest about being a date, still reads as a stardate.
export function stardate(d: Date): string {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0)
  const doy = Math.floor((d.getTime() - start) / 86_400_000)
  return `${d.getUTCFullYear()}.${String(doy).padStart(3, "0")}`
}

export function isPost(f: QuartzPluginData, section: string): boolean {
  const slug = f.slug ?? ""
  return slug.startsWith(section + "/") && !slug.endsWith("/index") && slug !== section
}

export function sectionPages(
  cfg: GlobalConfiguration,
  allFiles: QuartzPluginData[],
  section: string,
): QuartzPluginData[] {
  return allFiles
    .filter((f) => isPost(f, section))
    .sort((a, b) => (getDate(cfg, b)?.getTime() ?? 0) - (getDate(cfg, a)?.getTime() ?? 0))
}

// A post's banner: frontmatter socialImage (an absolute URL on this site, see Head.tsx),
// made relative so it also works on preview builds. Undefined when the post has none.
export function bannerSrc(slug: string | undefined, p: QuartzPluginData): string | undefined {
  const img = p.frontmatter?.socialImage
  if (typeof img !== "string" || img === "") return undefined
  const local = img.replace(/^https?:\/\/(www\.)?systemsnull\.net\//, "")
  if (local === img) return img
  return joinSegments(pathToRoot((slug ?? "index") as FullSlug), local)
}
