import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { pathToRoot, joinSegments } from "../util/path"
import { stardate } from "./lcarsUtil"

export interface LcarsNavItem {
  label: string
  // path relative to site root, no leading slash ("" = home)
  path: string
  code: string
  color: string
  // other sections that should light this button up
  also?: string[]
  // sub-buttons shown under this one (desktop and tablet only)
  children?: { label: string; path: string; color: string }[]
}

interface Options {
  siteName: string
  subtitle: string
  nav: LcarsNavItem[]
}

// The LCARS chrome: elbow, top bar and nav rail. Rendered in the left sidebar,
// which custom.scss sets to `display: contents` so each piece lands in its own
// grid area of #quartz-body.
export default ((opts: Options) => {
  const LcarsFrame: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    const slug = fileData.slug ?? ""
    const root = pathToRoot(fileData.slug!)
    const href = (path: string) => (path === "" ? root : joinSegments(root, path))
    const under = (path: string) => slug === path || slug.startsWith(path + "/")
    const isActive = (item: LcarsNavItem) =>
      item.path === "" ? slug === "index" : [item.path, ...(item.also ?? [])].some(under)

    return (
      <>
        <div class="lcars-elbow" aria-hidden="true">
          <span class="lcars-elbow-code">SN&middot;01</span>
        </div>
        <div class="lcars-topbar">
          <div class="lcars-bar" aria-hidden="true">
            <span class="seg seg-grow c-magenta"></span>
            <span class="seg seg-md c-plum"></span>
            <span class="seg seg-sm c-ice"></span>
            <span class="seg seg-cap c-cyan"></span>
          </div>
          <div class="lcars-titleblock">
            <a class="lcars-sitename" href={root}>
              {opts.siteName}
            </a>
            <span class="lcars-subtitle">{opts.subtitle}</span>
          </div>
        </div>
        <nav class="lcars-rail" aria-label="Primary">
          <div class="lcars-rail-inner">
            {opts.nav.map((item) => (
              <>
                <a
                  href={href(item.path)}
                  class={`lcars-rail-btn c-${item.color}${isActive(item) ? " active" : ""}`}
                  aria-current={slug === item.path + "/index" || (item.path === "" && slug === "index") ? "page" : undefined}
                >
                  <span class="code">{item.code}</span>
                  <span class="label">{item.label}</span>
                </a>
                {item.children?.map((child) => (
                  <a
                    href={href(child.path)}
                    class={`lcars-rail-sub c-${child.color}${under(child.path) ? " active" : ""}`}
                    aria-current={slug === child.path + "/index" ? "page" : undefined}
                  >
                    {child.label}
                  </a>
                ))}
              </>
            ))}
            <div class="lcars-rail-fill c-plum" aria-hidden="true">
              <span class="code">SD {stardate(new Date())}</span>
            </div>
          </div>
        </nav>
      </>
    )
  }

  return LcarsFrame
}) satisfies QuartzComponentConstructor<Options>
