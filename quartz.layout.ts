import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// Blog topics: one folder each under content/posts (vault: Blog-Public/<topic>)
const writingTopics = [
  { path: "data-engineering-ai", label: "Data Engineering / AI", color: "cyan" },
  { path: "neuropsychology", label: "NeuroPsychology", color: "violet" },
  { path: "human-things", label: "Human Things", color: "orchid" },
]

// LCARS chrome. The left sidebar is `display: contents` (see custom.scss), so the
// frame's elbow, top bar and rail, plus search, each get their own grid area.
const lcarsLeft = [
  Component.LcarsFrame({
    siteName: "systemsnull",
    nav: [
      { label: "Home", path: "", code: "01", color: "magenta" },
      {
        label: "Blog",
        path: "posts",
        code: "02",
        color: "ice",
        children: writingTopics.map((t) => ({
          label: t.label,
          path: `posts/${t.path}`,
          color: t.color,
        })),
      },
      { label: "Podcast", path: "podcast", code: "03", color: "cyan" },
      { label: "Talks", path: "talks", code: "04", color: "violet" },
      { label: "Projects", path: "projects", code: "05", color: "azure" },
      {
        label: "Agents",
        path: "agents",
        code: "06",
        color: "orchid",
        also: ["seven-public", "glyph-public"],
      },
      { label: "About", path: "about", code: "07", color: "ice" },
      { label: "RSS", path: "index.xml", code: "08", color: "magenta" },
    ],
  }),
  Component.Search(),
]

const notIndex = (component: Parameters<typeof Component.ConditionalRender>[0]["component"]) =>
  Component.ConditionalRender({
    component,
    condition: (page) => page.fileData.slug !== "index",
  })

const onlyIndex = (component: Parameters<typeof Component.ConditionalRender>[0]["component"]) =>
  Component.ConditionalRender({
    component,
    condition: (page) => page.fileData.slug === "index",
  })

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [
    Component.ConditionalRender({
      component: Component.LcarsTopics({ section: "posts", topics: writingTopics, perTopic: 5 }),
      condition: (page) => page.fileData.slug === "posts/index",
    }),
    Component.ConditionalRender({
      component: Component.LcarsTopicPosts(),
      condition: (page) => writingTopics.some((t) => page.fileData.slug === `posts/${t.path}/index`),
    }),
    onlyIndex(
      Component.LcarsHomeFeed({
        postsPath: "posts",
        latestCount: 4,
        fallbackArt: ["station", "wings", "compass", "comet", "antenna", "capsule"].map(
          (b) => `static/sprites/badge-${b}.webp`,
        ),
        podcast: {
          title: "Open Lakehouse + AI",
          blurb: "Weekly, with Scott Haines: open source query engines, catalogs, table formats, and streaming.",
          embed: "https://open.spotify.com/embed/show/4k97PCeKwCIyrWLYXVijSZ?utm_source=generator&theme=0",
          sprite: "static/sprites/podcast-onair.webp",
        },
        agents: [
          {
            name: "Seven",
            path: "seven-public",
            blurb: "Writer, reader, the one with the bookshelf.",
            icon: "static/sprites/padd.webp",
          },
          {
            name: "Glyph",
            path: "glyph-public",
            blurb: "Engineer, keeper, the one who wakes at 3 AM.",
            icon: "static/sprites/displays.webp",
          },
        ],
        elsewhere: [
          { label: "GitHub", href: "https://github.com/lisancao" },
          { label: "LinkedIn", href: "https://www.linkedin.com/in/lisancao/" },
          { label: "Twitter / X", href: "https://twitter.com/lisancao" },
          { label: "Medium", href: "https://medium.com/@lisancao" },
          {
            label: "Safe Spark agents paper",
            href: "https://open-lakehouse.github.io/safe-spark-agents-paper/",
          },
        ],
      }),
    ),
  ],
  footer: Component.LcarsFooter({
    owner: "Lisa N. Cao",
    disclaimer: "Opinions here are my own and do not reflect the views of my employer.",
    links: {
      GitHub: "https://github.com/lisancao",
      LinkedIn: "https://www.linkedin.com/in/lisancao/",
      "Twitter / X": "https://twitter.com/lisancao",
      RSS: "/index.xml",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    onlyIndex(
      Component.LcarsHomeHero({
        name: "Lisa N. Cao",
        role: "Developer Relations, Open Source, Bad Human",
        photo: "static/sprites/spacesuit-server.webp",
        photoAlt: "Pixel-art Lisa in a red spacesuit, kneeling to rewire a server rack",
        photoSprite: true,
      }),
    ),
    notIndex(Component.Breadcrumbs({ rootName: "Home" })),
    Component.LcarsPageSprite({
      sprites: {
        podcast: { src: "static/sprites/podcast-onair.webp", alt: "Pixel-art Lisa at a microphone" },
        talks: { src: "static/sprites/presenting.webp", alt: "Pixel-art Lisa presenting at an architecture board" },
        projects: { src: "static/sprites/typing-desk.webp", alt: "Pixel-art Lisa typing at a console" },
        agents: { src: "static/sprites/plushie.webp", alt: "Pixel-art Lisa holding a small blue plush creature" },
        about: { src: "static/sprites/window-lounge.webp", alt: "Pixel-art Lisa lounging in a chair by a starship viewport, drink in hand" },
      },
    }),
    notIndex(Component.ArticleTitle()),
    // dates and reading time only mean something on posts and agent logs
    Component.ConditionalRender({
      component: Component.LcarsMeta({
        topics: writingTopics.map((t) => ({ prefix: `posts/${t.path}`, label: t.label, color: t.color })),
      }),
      condition: (page) =>
        ["posts/", "seven-public/", "glyph-public/"].some((p) =>
          (page.fileData.slug ?? "").startsWith(p),
        ) && !(page.fileData.slug ?? "").endsWith("/index"),
    }),
  ],
  left: lcarsLeft,
  right: [
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs({ rootName: "Home" }), Component.ArticleTitle()],
  left: lcarsLeft,
  right: [],
}
