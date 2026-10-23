import { i18n } from "../../i18n"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

const NotFound: QuartzComponent = ({ cfg }: QuartzComponentProps) => {
  // If baseUrl contains a pathname after the domain, use this as the home link
  const url = new URL(`https://${cfg.baseUrl ?? "example.com"}`)
  const baseDir = url.pathname

  return (
    <article class="popover-hint">
      <img
        class="lcars-404-scene sprite"
        src={`${baseDir}static/sprites/server-meltdown.webp`}
        alt="Pixel-art Lisa, head in hands, next to a sparking server rack"
      />
      <h1 class="article-title">404: Unable to comply</h1>
      <p>
        That page isn't in the database.{" "}
        <img class="lcars-emote" src={`${baseDir}static/emotes/picardpalm.png`} alt="" aria-hidden="true" />
      </p>
      <a class="lcars-pill c-magenta" href={baseDir}>
        {i18n(cfg.locale).pages.error.home}
      </a>
    </article>
  )
}

export default (() => NotFound) satisfies QuartzComponentConstructor
