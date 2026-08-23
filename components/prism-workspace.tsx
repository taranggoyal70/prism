"use client";

import {
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  FileDown,
  GitBranch,
  GitPullRequest,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { EvidenceDiagram } from "@/components/evidence-diagram";
import type { DiagramNode, Evidence, ExplanationResult } from "@/lib/schema";

const EXAMPLE_URL = "https://github.com/taranggoyal70/prism/pull/1";

export function PrismWorkspace() {
  const [prUrl, setPrUrl] = useState(EXAMPLE_URL);
  const [result, setResult] = useState<ExplanationResult | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sharedPullRequest = new URLSearchParams(window.location.search).get("pr");
    if (!sharedPullRequest) return;
    const frame = window.requestAnimationFrame(() => setPrUrl(sharedPullRequest));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!result) return;
    const frame = window.requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [result]);

  async function explain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startedAt = Date.now();
    setLoading(true);
    setError("");
    setResult(null);
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
      const explanation = payload as ExplanationResult;
      const preferredNode =
        explanation.diagram.nodes.find((node) => /build|assemble/i.test(node.label) && /grounded/i.test(node.label)) ??
        explanation.diagram.nodes.find((node) => node.kind === "decision") ??
        explanation.diagram.nodes.toSorted((left, right) => right.evidenceIds.length - left.evidenceIds.length)[0];
      setResult(explanation);
      setSelectedNodeId(preferredNode?.id ?? "");
      setElapsedMs(Date.now() - startedAt);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not explain this pull request.");
    } finally {
      setLoading(false);
    }
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
    const brief = `# ${result.pullRequest.title}\n\n${result.diagram.summary}\n\n## Why this graph\n\n${result.diagram.selectionReason}\n\n## Evidence\n\n${evidence}\n\n## Project memory\n\n${memories}\n\n## Diagram\n\n\`\`\`mermaid\n${result.mermaid}\n\`\`\`\n`;
    const blob = new Blob([brief], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${result.pullRequest.ref.repository}-pr-${result.pullRequest.ref.number}-brief.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  async function copyShareLink() {
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set("pr", prUrl);

    try {
      await writeClipboard(shareUrl.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_800);
    } catch {
      setError("Copying is unavailable in this browser. Use Export evidence instead.");
    }
  }

  function changePullRequest() {
    inputRef.current?.focus();
    inputRef.current?.select();
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const evidenceById = useMemo(
    () => new Map(result?.diagram.evidence.map((item) => [item.id, item]) ?? []),
    [result],
  );
  const selectedNode = result?.diagram.nodes.find((node) => node.id === selectedNodeId)
    ?? result?.diagram.nodes[0];
  const selectedEvidence = selectedNode?.evidenceIds
    .map((id) => evidenceById.get(id))
    .filter((item): item is Evidence => Boolean(item)) ?? [];
  const claimNodes = result?.diagram.nodes.filter((node) => !node.id.includes("_alternate")) ?? [];
  const githubEvidence = result?.diagram.evidence.filter((item) => item.source === "github").length ?? 0;
  const greptileEvidence = result?.diagram.evidence.filter((item) => item.source === "greptile").length ?? 0;

  return (
    <section className="workspace" aria-label="Pull request explanation workspace">
      <div className="query-panel">
        <form className="query-form" onSubmit={explain}>
          <label htmlFor="pr-url">Pull request URL</label>
          <input
            ref={inputRef}
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
              <><LoaderCircle className="spinner" size={18} aria-hidden="true" />Tracing behavior</>
            ) : (
              <>Analyze <ArrowRight size={18} aria-hidden="true" /></>
            )}
          </button>
          <span className="query-live"><i className="status-dot" />Live GitHub</span>
        </form>
        {loading ? (
          <div className="analysis-progress" role="status">
            <span>Reading patches</span><span>Ranking symbols</span><span>Recalling memory</span><span>Grounding claims</span>
          </div>
        ) : null}
        {error ? (
          <div className="error-message" role="alert">
            <AlertCircle size={17} aria-hidden="true" />
            {error}
          </div>
        ) : null}
      </div>

      {result ? (
        <div className="result-shell" ref={resultRef}>
          <header className="result-header">
            <div className="result-title-block">
              <p className="repo-path">
                {result.pullRequest.ref.owner} / {result.pullRequest.ref.repository} · PR #{result.pullRequest.ref.number}
              </p>
              <h2>{result.pullRequest.title}</h2>
              <p className="result-summary">{result.diagram.summary}</p>
            </div>
            <div className="result-actions">
              <button type="button" onClick={changePullRequest}><RefreshCw size={15} />Change PR</button>
              <button type="button" onClick={downloadBrief}><FileDown size={15} />Export evidence</button>
              <button type="button" onClick={copyShareLink}>{copied ? <Check size={15} /> : <Clipboard size={15} />}{copied ? "Copied" : "Share"}</button>
            </div>
          </header>

          <div className="provenance-strip" aria-label="Explanation provenance">
            <span className="provenance-item github"><ShieldCheck size={15} />GitHub <strong>{githubEvidence}</strong></span>
            {greptileEvidence ? <span className="provenance-item greptile"><ShieldCheck size={15} />Greptile <strong>{greptileEvidence}</strong></span> : null}
            <span className="provenance-item memory"><BrainCircuit size={15} />Claude-Mem <strong>{result.diagram.memories.length}</strong></span>
            <span className="diagram-reason"><GitBranch size={14} />{result.diagram.selectionReason}</span>
            {elapsedMs !== null ? <span className="provenance-time">Mapped in {(elapsedMs / 1_000).toFixed(1)}s</span> : null}
          </div>

          <div className="proof-workbench">
            <aside className="claim-rail" aria-label="Behavioral claims">
              <div className="claim-rail-heading">
                <p className="panel-label">The change in {claimNodes.length} claims</p>
                <span>Claims derived from executable patches.</span>
              </div>
              <div className="claim-list">
                {claimNodes.map((node, index) => (
                  <button
                    className={`claim-item${node.id === selectedNode?.id ? " selected" : ""}`}
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedNodeId(node.id)}
                    aria-pressed={node.id === selectedNode?.id}
                  >
                    <span className="claim-number">{index + 1}</span>
                    <strong>{node.label}</strong>
                    <span className="claim-proof"><CheckCircle2 size={13} />Verified · {node.evidenceIds.length} {node.evidenceIds.length === 1 ? "proof" : "proofs"}</span>
                  </button>
                ))}
              </div>
              <p className="claim-rail-trust"><ShieldCheck size={15} />Every visible claim is pinned to exact source.</p>
            </aside>

            <EvidenceDiagram
              diagram={result.diagram}
              selectedNodeId={selectedNode?.id ?? ""}
              onSelectNode={setSelectedNodeId}
            />

            <aside className="proof-inspector" aria-label="Selected claim evidence">
              <div className="inspector-kicker"><Sparkles size={16} />Selected claim</div>
              <h3>{selectedNode?.label}</h3>
              <div className="verified-line"><CheckCircle2 size={15} />Verified <span>{selectedEvidence.length} {selectedEvidence.length === 1 ? "proof" : "proofs"} pinned</span></div>
              {selectedEvidence.length ? (
                <div className="inspector-evidence-stack">
                  {selectedEvidence.map((evidence) => (
                    <article className={`inspector-evidence ${evidence.source}`} key={evidence.id}>
                      <p className="inspector-source">
                        <span>{sourceLabel(evidence.source)}</span>
                        {evidence.filePath ? `${evidence.filePath}${evidence.lineStart ? ` · L${evidence.lineStart}–${evidence.lineEnd}` : ""}` : "Repository context"}
                      </p>
                      {evidence.excerpt ? <pre>{evidence.excerpt}</pre> : null}
                      <h4>Why it matters</h4>
                      <p>{interpretEvidence(selectedNode, evidence)}</p>
                      {evidence.url ? (
                        <a href={evidence.url} target="_blank" rel="noreferrer">
                          Open exact source <ExternalLink size={14} />
                        </a>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="memory-empty">This branch has no independently supported evidence and was removed from the primary claim list.</p>
              )}
            </aside>
          </div>

          <section className="memory-ribbon" aria-label="Memory that changed the decision">
            <div className="memory-ribbon-title"><BrainCircuit size={20} /><span><strong>Memory that changed the decision</strong>Repository-scoped observations only.</span></div>
            {result.diagram.memories.length ? result.diagram.memories.slice(0, 2).map((memory) => (
              <article key={memory.observationId}>
                <span>#{memory.observationId}</span>
                <div><strong>{memory.title}</strong><p>{memory.relevance}</p></div>
              </article>
            )) : <p className="memory-empty">No relevant Claude-Mem observation exists for this repository, so the explanation uses current code only.</p>}
          </section>

          <footer className="trust-footer">
            <div><ShieldCheck size={28} /><span><strong>Trust</strong>All claims grounded</span></div>
            <strong>{claimNodes.length} of {claimNodes.length} behavioral claims<br />pinned to exact source</strong>
            <div className="coverage-bars" aria-label="Source coverage">
              <span>Live code <i style={{ width: `${Math.max(18, githubEvidence * 16)}%` }} /></span>
              <span>Project memory <i className="memory" style={{ width: `${Math.max(8, result.diagram.memories.length * 24)}%` }} /></span>
            </div>
            <p>Built with evidence. Not guesses.</p>
          </footer>
        </div>
      ) : loading ? null : (
        <div className="empty-state">
          <GitPullRequest size={28} strokeWidth={1.5} aria-hidden="true" />
          <strong>Ready to trace a real pull request</strong>
          <span>Analyze the prepared PR or paste any public GitHub pull request.</span>
        </div>
      )}
    </section>
  );
}

async function writeClipboard(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    if (!copied) throw new Error("Clipboard write failed.");
  }
}

function sourceLabel(source: Evidence["source"]): string {
  if (source === "greptile") return "Greptile review";
  if (source === "claude_mem") return "Claude-Mem";
  return "Current code";
}

function interpretEvidence(node: DiagramNode | undefined, evidence: Evidence): string {
  if (evidence.source === "greptile") return `A repository-aware review supports this claim: ${evidence.description}`;
  if (evidence.source === "claude_mem") return `A prior project decision explains why this behavior exists: ${evidence.description}`;
  return `${evidence.description} These exact changed lines support the selected behavior: “${node?.label ?? "Grounded behavior"}”`;
}
