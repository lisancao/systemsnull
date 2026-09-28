import { GlobalConfiguration } from "../cfg"
import { QuartzPluginData } from "../plugins/vfile"
import { getDate } from "./Date"

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
