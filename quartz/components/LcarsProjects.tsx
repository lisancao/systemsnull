import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { joinSegments, pathToRoot } from "../util/path"

interface Project {
  title: string
  description?: string
  // site path (/assets/...) or absolute URL
  image?: string
  links?: { label: string; href: string }[]
}

interface Options {
  // stand-in art for projects without an image, paths relative to site root
  fallbackArt: string[]
}

// The Projects page as cards. The list lives in projects.md's frontmatter (`projects:`),
// so it stays editable in Obsidian; the page body is free for an intro.
export default ((opts: Options) => {
  const Projects: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    const projects = fileData.frontmatter?.projects as Project[] | undefined
    if (!Array.isArray(projects) || projects.length === 0) return null
    const root = pathToRoot(fileData.slug!)
    const src = (path: string) =>
      /^https?:\/\//.test(path) ? path : joinSegments(root, path.replace(/^\//, ""))
    let standIns = 0

    return (
      <ol class="lcars-cards lcars-projects">
        {projects.map((p) => {
          const href = p.links?.[0]?.href
          const image = p.image
            ? src(p.image)
            : src(opts.fallbackArt[standIns++ % opts.fallbackArt.length])
          return (
            <li class="lcars-card lcars-project">
              <a class="lcars-project-cover-link" href={href}>
                <span class={p.image ? "lcars-cover has-banner" : "lcars-cover is-fallback"}>
                  <img src={image} alt="" loading="lazy" />
                </span>
              </a>
              <h2 class="lcars-card-title">
                {href ? <a href={href}>{p.title}</a> : p.title}
              </h2>
              {p.description && <p class="lcars-card-desc">{p.description}</p>}
              {p.links && p.links.length > 0 && (
                <p class="lcars-project-links">
                  {p.links.map((l, i) => (
                    <>
                      {i > 0 && " · "}
                      <a href={l.href}>{l.label}</a>
                    </>
                  ))}
                </p>
              )}
            </li>
          )
        })}
      </ol>
    )
  }
  return Projects
}) satisfies QuartzComponentConstructor<Options>
