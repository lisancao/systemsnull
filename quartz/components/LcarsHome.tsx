import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { formatDate, getDate } from "./Date"
import { resolveRelative, FullSlug, pathToRoot, joinSegments } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { bannerSrc, sectionPages, stardate } from "./lcarsUtil"

interface HeroOptions {
  name: string
  role: string
  // path relative to site root, e.g. "assets/lisa-cao.jpg"
  photo?: string
  photoAlt?: string
  // the photo is a cut-out sprite: drop the photo frame
  photoSprite?: boolean
}

// Top of the homepage: name, role, and portrait. The bio paragraph is content/index.md
// itself, so it stays editable in Obsidian.
export const LcarsHomeHero = ((opts: HeroOptions) => {
  const Hero: QuartzComponent = ({ fileData }: QuartzComponentProps) => (
    <div class="lcars-hero">
      <div class="lcars-hero-text">
        <div class="lcars-hero-label">
          <span class="lcars-pill c-magenta">Personnel file</span>
          <span class="lcars-readout">Access: public</span>
        </div>
        <h1 class="lcars-hero-name">{opts.name}</h1>
        <p class="lcars-hero-role">{opts.role}</p>
      </div>
      {opts.photo && (
        <figure class={opts.photoSprite ? "lcars-portrait is-sprite" : "lcars-portrait"}>
          <img
            class={opts.photoSprite ? "sprite" : undefined}
            src={joinSegments(pathToRoot(fileData.slug!), opts.photo)}
            alt={opts.photoAlt ?? opts.name}
            width={opts.photoSprite ? undefined : "560"}
            height={opts.photoSprite ? undefined : "560"}
          />
        </figure>
      )}
    </div>
  )
  return Hero
}) satisfies QuartzComponentConstructor<HeroOptions>

interface AgentLog {
  name: string
  path: string
  blurb: string
  // sprite path relative to site root
  icon?: string
}

interface PodcastPanel {
  title: string
  blurb: string
  // Spotify show embed URL; the player lists the latest episodes itself
  embed: string
  // sprite beside the player, path relative to site root
  sprite?: string
}

interface FeedOptions {
  postsPath: string
  latestCount: number
  podcast?: PodcastPanel
  agents: AgentLog[]
  elsewhere: { label: string; href: string }[]
  // shown on post cards without a banner, paths relative to site root
  fallbackArt: string[]
}

export const LcarsHomeFeed = ((opts: FeedOptions) => {
  const Feed: QuartzComponent = ({ cfg, fileData, allFiles }: QuartzComponentProps) => {
    const posts = sectionPages(cfg, allFiles, opts.postsPath)
    const featured = posts.find((p) => p.frontmatter?.featured) ?? posts[0]
    const latest = posts.filter((p) => p !== featured).slice(0, opts.latestCount)
    const link = (p: QuartzPluginData) => resolveRelative(fileData.slug!, p.slug!)
    const dateOf = (p: QuartzPluginData) => getDate(cfg, p)
    const asset = (path: string) => joinSegments(pathToRoot(fileData.slug!), path)
    // under `max` characters, cut at a word boundary
    const clip = (text: string, max: number) => {
      if (text.length < max) return text
      const cut = text.slice(0, max - 1)
      return cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:.]+$/, "") + "…"
    }
    // posts without a banner take the stand-in art in turn, so neighbours never match
    const standIn = new Map<string, string>()
    for (const p of latest) {
      if (!bannerSrc(fileData.slug, p)) {
        standIn.set(p.slug!, asset(opts.fallbackArt[standIn.size % opts.fallbackArt.length]))
      }
    }
    // banner image, or badge art on a gradient when the post has none
    const cover = (p: QuartzPluginData, cls: string) => {
      const banner = bannerSrc(fileData.slug, p)
      return banner ? (
        <span class={`${cls} has-banner`}>
          <img src={banner} alt="" loading="lazy" />
        </span>
      ) : (
        <span class={`${cls} is-fallback`}>
          <img src={standIn.get(p.slug!)} alt="" loading="lazy" />
        </span>
      )
    }

    return (
      <div class="lcars-feed">
        {featured && (
          <section class="lcars-panel lcars-featured">
            <header class="lcars-panel-head c-magenta">
              <span>Featured</span>
              <span class="code">01</span>
            </header>
            <a class="lcars-featured-link internal" href={link(featured)}>
              <h2>{featured.frontmatter?.title}</h2>
              {featured.description && <p>{featured.description}</p>}
              <span class="lcars-readout">
                {dateOf(featured) && formatDate(dateOf(featured)!, cfg.locale)} &middot; Read the
                post
              </span>
            </a>
          </section>
        )}

        {latest.length > 0 && (
          <section class="lcars-panel">
            <header class="lcars-panel-head c-ice">
              <span>Latest posts</span>
              <span class="code">02</span>
            </header>
            <ol class="lcars-cards">
              {latest.map((p) => {
                const d = dateOf(p)
                // frontmatter `summary:` is a short card blurb; descriptions are written for
                // search and run long, so they get cut to the card's length instead
                const blurb = clip(String(p.frontmatter?.summary ?? p.description ?? ""), 200)
                return (
                  <li>
                    <a class="lcars-card internal" href={link(p)}>
                      {cover(p, "lcars-cover")}
                      <span class="lcars-card-date">
                        {d ? formatDate(d, cfg.locale) : ""}
                        {d && <span class="sd">SD {stardate(d)}</span>}
                      </span>
                      <span class="lcars-card-title">{p.frontmatter?.title}</span>
                      {blurb && <span class="lcars-card-desc">{blurb}</span>}
                    </a>
                  </li>
                )
              })}
            </ol>
            <a
              class="lcars-pill c-ice lcars-more"
              href={resolveRelative(fileData.slug!, `${opts.postsPath}/index` as FullSlug)}
            >
              All posts
            </a>
          </section>
        )}

        {opts.podcast && (
          <section class="lcars-panel">
            <header class="lcars-panel-head c-cyan">
              <span>On air</span>
              <span class="code">03</span>
            </header>
            <p class="lcars-panel-note">
              <a class="internal" href={resolveRelative(fileData.slug!, "podcast" as FullSlug)}>
                {opts.podcast.title}
              </a>
              . {opts.podcast.blurb}
            </p>
            <div class="lcars-onair">
            <div class="lcars-embed">
              <iframe
                title={`${opts.podcast.title} on Spotify`}
                src={opts.podcast.embed}
                width="100%"
                height="152"
                frameborder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              ></iframe>
            </div>
            {opts.podcast.sprite && (
              <div class="lcars-onair-art">
                <img class="sprite" src={asset(opts.podcast.sprite)} alt="Pixel-art Lisa at a microphone, under an On Air sign" />
              </div>
            )}
            </div>
          </section>
        )}

        <section class="lcars-panel">
          <header class="lcars-panel-head c-orchid">
            <span>Agent logs</span>
            <span class="code">04</span>
          </header>
          <p class="lcars-panel-note">
            Two AI agents I run keep public notebooks here. Their words, lightly supervised.
          </p>
          <div class="lcars-agents">
            {opts.agents.map((agent) => {
              const entries = sectionPages(cfg, allFiles, agent.path)
              return (
                <a
                  class="lcars-agent internal"
                  href={resolveRelative(fileData.slug!, `${agent.path}/index` as FullSlug)}
                >
                  {agent.icon && <img class="lcars-agent-icon sprite" src={asset(agent.icon)} alt="" />}
                  <span class="lcars-agent-name">{agent.name}</span>
                  <span class="lcars-agent-blurb">{agent.blurb}</span>
                  <span class="lcars-readout">{entries.length} entries</span>
                </a>
              )
            })}
          </div>
        </section>

        {opts.elsewhere.length > 0 && (
          <section class="lcars-elsewhere" aria-label="Elsewhere">
            {opts.elsewhere.map((e) => (
              <a class="lcars-pill c-violet" href={e.href}>
                {e.label}
              </a>
            ))}
          </section>
        )}
      </div>
    )
  }
  return Feed
}) satisfies QuartzComponentConstructor<FeedOptions>
