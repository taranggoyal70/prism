"use client";

import {
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Download,
  ExternalLink,
  FileDown,
  GitPullRequest,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, useState } from "react";

import { EvidenceDiagram } from "@/components/evidence-diagram";
import type { ExplanationResult } from "@/lib/schema";

const EXAMPLE_URL = "https://github.com/taranggoyal70/prism/pull/1";

export function PrismWorkspace() {
  const [prUrl, setPrUrl] = useState(EXAMPLE_URL);
  const [result, setResult] = useState<ExplanationResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  async function explain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startedAt = Date.now();
    setLoading(true);
    setError("");
    setElapsedMs(null);

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prUrl }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof payload === "object" && payload && "error" in payload
            ? String(payload.error)
            : "Could not explain this pull request.";
        throw new Error(message);
      }
      setResult(payload as ExplanationResult);
      setElapsedMs(Date.now() - startedAt);
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Could not explain this pull request.");
    } finally {
      setLoading(false);
    }
  }

  function downloadMermaid() {
    if (!result) return;
    const blob = new Blob([result.mermaid], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${result.pullRequest.ref.repository}-pr-${result.pullRequest.ref.number}.mmd`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadBrief() {
    if (!result) return;
    const evidence = result.diagram.evidence
      .map((item) => `- [${item.filePath ?? item.source}](${item.url ?? result.pullRequest.url}) - ${item.description}`)
      .join("\n");
    const memories = result.diagram.memories.length
      ? result.diagram.memories
          .map((memory) => `- Claude-Mem #${memory.observationId}: **${memory.title}** - ${memory.relevance}`)
          .join("\n")
      : "- No matching project memory was available.";
    const brief = `# ${result.pullRequest.title}\n\n${result.diagram.summary}\n\n## Why this diagram\n\n${result.diagram.selectionReason}\n\n## Evidence\n\n${evidence}\n\n## Project memory\n\n${memories}\n\n## Diagram\n\n\`\`\`mermaid\n${result.mermaid}\n\`\`\`\n`;
    const blob = new Blob([brief], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${result.pullRequest.ref.repository}-pr-${result.pullRequest.ref.number}-brief.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const githubEvidence = result?.diagram.evidence.filter((item) => item.source === "github").length ?? 0;
  const greptileEvidence = result?.diagram.evidence.filter((item) => item.source === "greptile").length ?? 0;

  return (
    <section className="workspace" aria-label="Pull request explanation workspace">
      <div className="query-panel">
        <div className="query-meta">
          <label htmlFor="pr-url">GitHub pull request URL</label>
          <span><CheckCircle2 size={13} aria-hidden="true" /> Codex-built sponsor pipeline</span>
        </div>
        <form className="query-form" onSubmit={explain}>
          <input
            className="url-field"
            id="pr-url"
            name="prUrl"
            type="url"
            value={prUrl}
            onChange={(event) => setPrUrl(event.target.value)}
            placeholder="https://github.com/owner/repository/pull/123"
            autoComplete="url"
            required
          />
          <button className="explain-button" type="submit" disabled={loading}>
            {loading ? (
              <><LoaderCircle className="spinner" size={18} aria-hidden="true" />Tracing evidence</>
            ) : (
              <>Explain this PR <ArrowRight size={18} aria-hidden="true" /></>
            )}
          </button>
        </form>
        {error ? (
          <div className="error-message" role="alert">
            <AlertCircle size={17} aria-hidden="true" />
            {error}
          </div>
        ) : null}
      </div>

      {result ? (
        <div className="result-shell">
          <header className="result-header">
            <div>
              <p className="repo-path">
                {result.pullRequest.ref.owner} / {result.pullRequest.ref.repository} · PR #{result.pullRequest.ref.number}
              </p>
              <h2>{result.pullRequest.title}</h2>
            </div>
            <span className="source-badge">{result.source}</span>
          </header>

          <div className="provenance-strip" aria-label="Explanation provenance">
            <span className="provenance-item github"><ShieldCheck size={15} />GitHub <strong>{githubEvidence}</strong></span>
            <span className="provenance-item greptile"><ShieldCheck size={15} />Greptile <strong>{greptileEvidence}</strong></span>
            <span className="provenance-item memory"><BrainCircuit size={15} />Claude-Mem <strong>{result.diagram.memories.length}</strong></span>
            {elapsedMs !== null ? <span className="provenance-time">Mapped in {(elapsedMs / 1_000).toFixed(1)}s</span> : null}
          </div>

          <div className="diagram-intro">
            <span className="diagram-type">{result.diagram.diagramType.replaceAll("_", " ")}</span>
            <p>{result.diagram.selectionReason}</p>
          </div>

          <EvidenceDiagram source={result.mermaid} title={result.diagram.title} />

          <div className="result-grid">
            <section className="summary-panel">
              <p className="panel-label">Plain-English explanation</p>
              <h3>What changed</h3>
              <p className="summary-copy">{result.diagram.summary}</p>
              <div className="file-strip" aria-label="Changed files">
                {result.pullRequest.changedFiles.slice(0, 10).map((file) => (
                  <span className="file-chip" key={file}>{file}</span>
                ))}
                {result.pullRequest.changedFiles.length > 10 ? (
                  <span className="file-chip file-chip-more">
                    +{result.pullRequest.changedFiles.length - 10} more
                  </span>
                ) : null}
              </div>
              <div className="export-actions">
                <button className="download-button" type="button" onClick={downloadBrief}>
                  <FileDown size={16} aria-hidden="true" /> Export evidence brief
                </button>
                <button className="download-button download-secondary" type="button" onClick={downloadMermaid}>
                  <Download size={16} aria-hidden="true" /> Mermaid
                </button>
              </div>
            </section>

            <section className="evidence-panel">
              <p className="panel-label">Trace every claim</p>
              <h3>{result.diagram.evidence.length} pinned code references</h3>
              <div className="evidence-list">
                {result.diagram.evidence.map((item, index) => (
                  <a
                    className="evidence-card"
                    href={item.url ?? result.pullRequest.url}
                    target="_blank"
                    rel="noreferrer"
                    key={item.id}
                  >
                      <span className={`evidence-index ${item.source}`}>
                        {item.source === "greptile" ? "GR" : `E${index + 1}`}
                      </span>
                    <span className="evidence-copy">
                      <strong>
                        {item.filePath ?? "Repository context"}
                        {item.lineStart ? ` · L${item.lineStart}–${item.lineEnd}` : ""}
                      </strong>
                      <span>{item.description}</span>
                    </span>
                    <ExternalLink size={15} aria-hidden="true" />
                  </a>
                ))}
              </div>

              <div className="memory-divider"><BrainCircuit size={14} />Claude-Mem timeline</div>
              {result.diagram.memories.length ? (
                <div className="memory-stack">
                  <p className="memory-status">
                    Warm boot loaded {result.diagram.memories.length} project {result.diagram.memories.length === 1 ? "observation" : "observations"} before mapping.
                  </p>
                  {result.diagram.memories.map((memory) => (
                    <article className="memory-card" key={memory.observationId}>
                      <strong>#{memory.observationId} · {memory.title}</strong>
                      <span>{memory.relevance}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="memory-empty">No matching Claude-Mem observations were found for this repository.</p>
              )}
            </section>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <GitPullRequest size={28} strokeWidth={1.5} aria-hidden="true" />
          <strong>Ready to trace a real pull request</strong>
          <span>Explain the example or paste any GitHub PR to map behavior back to its evidence.</span>
        </div>
      )}
    </section>
  );
}
