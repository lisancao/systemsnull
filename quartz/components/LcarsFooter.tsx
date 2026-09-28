import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { emoteSrc } from "./lcarsUtil"

interface Options {
  owner: string
  disclaimer?: string
  links: Record<string, string>
}

export default ((opts: Options) => {
  const LcarsFooter: QuartzComponent = ({ fileData }: QuartzComponentProps) => (
    <footer class="lcars-footer">
      <div class="lcars-bar" aria-hidden="true">
        <span class="seg seg-sm c-violet"></span>
        <span class="seg seg-grow c-magenta"></span>
        <span class="seg seg-cap c-ice"></span>
      </div>
      <div class="lcars-footer-row">
        <span>
          &copy; {new Date().getFullYear()} {opts.owner}{" "}
          <img
            class="lcars-emote"
            src={emoteSrc(fileData.slug, "janewayCoffee.png")}
            alt=""
            aria-hidden="true"
          />
        </span>
        <ul>
          {Object.entries(opts.links).map(([text, link]) => (
            <li>
              <a href={link}>{text}</a>
            </li>
          ))}
        </ul>
      </div>
      {opts.disclaimer && <p class="lcars-disclaimer">{opts.disclaimer}</p>}
    </footer>
  )
  return LcarsFooter
}) satisfies QuartzComponentConstructor<Options>
