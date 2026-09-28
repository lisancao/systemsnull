import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { formatDate, getDate } from "./Date"
import { resolveRelative, FullSlug } from "../util/path"
import { sectionPages, stardate } from "./lcarsUtil"

export interface LcarsTopic {
  // folder under the section, e.g. "neuropsychology"
  path: string
  label: string
  color: string
}

interface Options {
  section: string
  topics: LcarsTopic[]
  perTopic: number
}

// The Writing page: one LCARS panel per topic folder, newest posts first.
// Blurbs come from each topic folder's index.md so they stay editable in Obsidian.
export default ((opts: Options) => {
  const LcarsTopics: QuartzComponent = ({ cfg, fileData, allFiles }: QuartzComponentProps) => {
    const rel = (slug: string) => resolveRelative(fileData.slug!, slug as FullSlug)

    return (
      <div class="lcars-feed lcars-topics">
        {opts.topics.map((topic, i) => {
          const base = `${opts.section}/${topic.path}`
          const posts = sectionPages(cfg, allFiles, base)
          const index = allFiles.find((f) => f.slug === `${base}/index`)
          return (
            <section class="lcars-panel" id={topic.path}>
              <header class={`lcars-panel-head c-${topic.color}`}>
                <a href={rel(`${base}/index`)}>{topic.label}</a>
                <span class="code">{String(i + 1).padStart(2, "0")}</span>
              </header>
              {index?.description && <p class="lcars-panel-note">{index.description}</p>}
              {posts.length === 0 ? (
                <p class="lcars-empty">No transmissions yet.</p>
              ) : (
                <ol class="lcars-postlist">
                  {posts.slice(0, opts.perTopic).map((p) => {
                    const d = getDate(cfg, p)
                    return (
                      <li>
                        <span class="lcars-postlist-date">
                          {d ? formatDate(d, cfg.locale) : ""}
                          {d && <span class="sd">SD {stardate(d)}</span>}
                        </span>
                        <a class="internal" href={rel(p.slug!)}>
                          {p.frontmatter?.title}
                        </a>
                      </li>
                    )
                  })}
                </ol>
              )}
              {posts.length > opts.perTopic && (
                <a class={`lcars-pill c-${topic.color} lcars-more`} href={rel(`${base}/index`)}>
                  All {topic.label}
                </a>
              )}
            </section>
          )
        })}
      </div>
    )
  }

  return LcarsTopics
}) satisfies QuartzComponentConstructor<Options>
