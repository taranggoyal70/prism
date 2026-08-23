import { PrismWorkspace } from "@/components/prism-workspace";

export default function HomePage() {
  return (
    <div className="site-shell">
      <header className="masthead">
        <a className="wordmark" href="#top" aria-label="PRism home">
          <span className="wordmark-mark" aria-hidden="true" />
          PRism
        </a>
        <div className="masthead-meta">
          <span>Living pull request explanations</span>
          <span><i className="status-dot" />Live pipeline</span>
        </div>
      </header>
      <main className="page-main" id="top">
        <section className="hero">
          <div>
            <p className="eyebrow">Evidence, assembled</p>
            <h1>Turn the diff into a system you can <span>see.</span></h1>
          </div>
          <aside className="hero-aside">
            <p>
              Paste a pull request. PRism maps how it works, explains why it changed, and pins
              every important claim to the code that proves it.
            </p>
            <div className="proof-legend" aria-label="Evidence legend">
              <span className="legend-item code"><i className="legend-swatch" />Current code</span>
              <span className="legend-item memory"><i className="legend-swatch" />Project memory</span>
            </div>
          </aside>
        </section>
        <PrismWorkspace />
      </main>
    </div>
  );
}
