import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { pathToRoot } from "../util/path"

interface Tab {
  name: string
  path: string
}

interface Options {
  tabs: Tab[]
}

export default ((opts?: Options) => {
  const tabs = opts?.tabs ?? [{ name: "seven-public", path: "/seven-public" }]

  const TmuxTabs: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    const baseDir = pathToRoot(fileData.slug!)
    const currentPath = "/" + (fileData.slug ?? "")

    return (
      <div class="tmux-bar">
        <div class="tmux-tabs">
          <a
            href={baseDir}
            class={`tmux-tab ${currentPath === "/" || currentPath === "/index" ? "active" : ""}`}
          >
            <span class="tab-icon">~</span>
            <span class="tab-name">home</span>
          </a>
          {tabs.map((tab) => {
            const isActive = currentPath.startsWith(tab.path)
            return (
              <a href={tab.path} class={`tmux-tab ${isActive ? "active" : ""}`}>
                <span class="tab-icon">▸</span>
                <span class="tab-name">{tab.name}</span>
              </a>
            )
          })}
        </div>
        <div class="tmux-status">
          <span class="tmux-session">systemsnull</span>
          <span class="tmux-sep">│</span>
          <span class="tmux-host">λ</span>
        </div>
      </div>
    )
  }

  TmuxTabs.css = `
.tmux-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #11111b;
  border-bottom: 1px solid #45475a;
  padding: 0;
  font-family: var(--codeFont);
  font-size: 0.85rem;
  position: sticky;
  top: 0;
  z-index: 999;
  width: 100vw;
  margin-left: calc(-50vw + 50%);
}

.tmux-tabs {
  display: flex;
  gap: 0;
}

.tmux-tab {
  padding: 0.5rem 1rem;
  color: #6c7086;
  text-decoration: none;
  border-right: 1px solid #313244;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.tmux-tab:hover {
  color: #cdd6f4;
  background: #181825;
}

.tmux-tab.active {
  color: #a6e3a1;
  background: #1e1e2e;
  border-bottom: 2px solid #a6e3a1;
}

.tmux-tab .tab-icon {
  color: #f38ba8;
}

.tmux-tab.active .tab-icon {
  color: #a6e3a1;
}

.tmux-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  color: #585b70;
  font-size: 0.8rem;
}

.tmux-session {
  color: #89b4fa;
}

.tmux-sep {
  color: #45475a;
}

.tmux-host {
  color: #f38ba8;
}

@media (max-width: 768px) {
  .tmux-bar {
    flex-wrap: wrap;
  }
  .tmux-status {
    display: none;
  }
  .tmux-tab {
    padding: 0.4rem 0.7rem;
    font-size: 0.8rem;
  }
}
`

  return TmuxTabs
}) satisfies QuartzComponentConstructor
