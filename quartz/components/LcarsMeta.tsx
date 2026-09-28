import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { formatDate, getDate } from "./Date"
import { resolveRelative, FullSlug } from "../util/path"
import readingTime from "reading-time"
import { stardate } from "./lcarsUtil"

interface Options {
  // topic folders, e.g. { prefix: "posts/neuropsychology", label: "NeuroPsychology", color: "violet" }
  topics?: { prefix: string; label: string; color: string }[]
}

// Post metadata as an LCARS readout: topic, date, stardate, reading time, tags.
export default ((opts?: Options) => {
  const LcarsMeta: QuartzComponent = ({ cfg, fileData }: QuartzComponentProps) => {
    if (!fileData.text) return null
    const date = fileData.dates ? getDate(cfg, fileData) : undefined
    const minutes = Math.max(1, Math.ceil(readingTime(fileData.text).minutes))
    const tags = (fileData.frontmatter?.tags ?? []) as string[]
    const topic = opts?.topics?.find((t) => (fileData.slug ?? "").startsWith(t.prefix + "/"))

    return (
      <div class="lcars-meta">
        {topic && (
          <a
            class={`lcars-pill c-${topic.color}`}
            href={resolveRelative(fileData.slug!, `${topic.prefix}/index` as FullSlug)}
          >
            {topic.label}
          </a>
        )}
        {date && (
          <span class="lcars-pill c-ice">
            <time datetime={date.toISOString()}>{formatDate(date, cfg.locale)}</time>
          </span>
        )}
        {date && <span class="lcars-readout">SD {stardate(date)}</span>}
        <span class="lcars-readout">{minutes} min read</span>
        {tags.length > 0 && (
          <ul class="lcars-tags">
            {tags.map((tag) => (
              <li>
                <a
                  class="internal tag-link"
                  href={resolveRelative(fileData.slug!, `tags/${tag}` as FullSlug)}
                >
                  {tag}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return LcarsMeta
}) satisfies QuartzComponentConstructor<Options | undefined>
