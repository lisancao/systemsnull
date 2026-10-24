import { QuartzTransformerPlugin } from "../types"
import { visit } from "unist-util-visit"
import { toString } from "hast-util-to-string"
import { Element } from "hast"

// Talks page: each `<span class="talk-type">` gets a small pixel-art icon for its kind.
// The first matching word wins, so "webinar (panel guest)" reads as on air, not a panel.
const icons: [RegExp, string, string][] = [
  [/workshop/i, "handheld", "workshop"],
  [/podcast|interview|video|webinar/i, "tricorder", "on air"],
  [/panel/i, "circuit", "panel"],
  [/meetup/i, "chip", "meetup"],
  [/talk|keynote/i, "screens", "talk"],
]

export const TalkIcons: QuartzTransformerPlugin = () => ({
  name: "TalkIcons",
  htmlPlugins() {
    return [
      () => (tree) => {
        visit(tree, "element", (node: Element) => {
          const cls = node.properties?.className
          if (node.tagName !== "span" || !(Array.isArray(cls) && cls.includes("talk-type"))) return
          const text = toString(node)
          const hit = icons.find(([re]) => re.test(text))
          if (!hit) return
          const [, icon, kind] = hit
          node.properties["data-kind"] = kind
          node.children.unshift({
            type: "element",
            tagName: "img",
            properties: {
              src: `/static/sprites/icons/${icon}.webp`,
              alt: "",
              className: ["talk-icon", "sprite"],
            },
            children: [],
          })
        })
      },
    ]
  },
})
