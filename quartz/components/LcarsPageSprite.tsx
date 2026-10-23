import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { joinSegments, pathToRoot } from "../util/path"

interface Options {
  // page slug -> pixel sprite (path relative to site root) and its alt text
  sprites: Record<string, { src: string; alt: string }>
}

// A pixel sprite beside the title of a site page (Talks, Projects, ...). The pages
// themselves live in the vault, so the art is attached here by slug instead.
export default ((opts: Options) => {
  const PageSprite: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    const sprite = opts.sprites[fileData.slug ?? ""]
    if (!sprite) return null
    return (
      <img
        class="lcars-page-sprite sprite"
        src={joinSegments(pathToRoot(fileData.slug!), sprite.src)}
        alt={sprite.alt}
      />
    )
  }
  return PageSprite
}) satisfies QuartzComponentConstructor<Options>
