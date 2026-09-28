import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

interface Options {
  owner: string
  disclaimer?: string
  links: Record<string, string>
}

export default ((opts: Options) => {
  const LcarsFooter: QuartzComponent = (_props: QuartzComponentProps) => (
    <footer class="lcars-footer">
      <div class="lcars-bar" aria-hidden="true">
        <span class="seg seg-sm c-violet"></span>
        <span class="seg seg-grow c-magenta"></span>
        <span class="seg seg-cap c-ice"></span>
      </div>
      <div class="lcars-footer-row">
        <span>
          &copy; {new Date().getFullYear()} {opts.owner}
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
