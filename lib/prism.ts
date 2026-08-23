import demoFixture from "@/fixtures/demo/acme-ledger-pr-42.json";
import { generateEvidenceDiagram } from "@/lib/generation/diagram";
import { fetchGitHubPullRequest } from "@/lib/integrations/github";
import {
  type DiagramSpec,
  type Evidence,
  type ExplanationResult,
  type Fixture,
  type Memory,
  type PullRequest,
  type PullRequestRef,
  fixtureSchema,
} from "@/lib/schema";

const parsedFixture = fixtureSchema.parse(demoFixture);

export function parsePullRequestUrl(value: string): PullRequestRef {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(
      "Enter a full GitHub pull request URL, such as https://github.com/owner/repo/pull/123.",
    );
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const number = Number(segments[3]);
  if (
    url.protocol !== "https:" ||
    !["github.com", "www.github.com"].includes(url.hostname) ||
    segments.length !== 4 ||
    segments[2] !== "pull" ||
    !Number.isSafeInteger(number) ||
    number <= 0
  ) {
    throw new Error(
      "Enter a full GitHub pull request URL, such as https://github.com/owner/repo/pull/123.",
    );
  }

  return { owner: segments[0], repository: segments[1], number };
}

type PullRequestContext = {
  pullRequest: PullRequest;
  evidence: Evidence[];
  modelContext: string;
  memories: Memory[];
};

type DiagramDraft = Omit<DiagramSpec, "evidence" | "memories">;

export type PrismDependencies = {
  fetchContext: (ref: PullRequestRef) => Promise<PullRequestContext>;
  generateDiagram: (context: PullRequestContext) => Promise<DiagramDraft>;
};

export async function explainPullRequest(
  prUrl: string,
  dependencies?: PrismDependencies,
): Promise<ExplanationResult> {
  const ref = parsePullRequestUrl(prUrl);
  const fixtureRef = parsedFixture.pull_request.ref;
  const isPreparedDemo =
    ref.owner === fixtureRef.owner &&
    ref.repository === fixtureRef.repository &&
    ref.number === fixtureRef.number;

  if (isPreparedDemo) {
    const pullRequest = normalizePullRequest(parsedFixture);
    const diagram = normalizeDiagram(parsedFixture);
    return {
      pullRequest,
      diagram,
      mermaid: renderMermaid(diagram),
      source: "offline fixture",
    };
  }

  const activeDependencies = dependencies ?? {
    fetchContext: fetchGitHubPullRequest,
    generateDiagram: generateEvidenceDiagram,
  };

  const context = await activeDependencies.fetchContext(ref);
  const draft = await activeDependencies.generateDiagram(context);
  const diagram: DiagramSpec = {
    ...draft,
    evidence: context.evidence,
    memories: context.memories,
  };
  validateGrounding(diagram);

  return {
    pullRequest: context.pullRequest,
    diagram,
    mermaid: renderMermaid(diagram),
    source: "live",
  };
}

function validateGrounding(diagram: DiagramSpec): void {
  const evidenceIds = new Set(diagram.evidence.map((item) => item.id));
  for (const node of diagram.nodes) {
    for (const evidenceId of node.evidenceIds) {
      if (!evidenceIds.has(evidenceId)) {
        throw new Error(`Diagram node ${node.id} references unknown evidence ${evidenceId}.`);
      }
    }
  }
}

function normalizePullRequest(fixture: Fixture): ExplanationResult["pullRequest"] {
  const pullRequest = fixture.pull_request;
  return {
    ref: pullRequest.ref,
    title: pullRequest.title,
    description: pullRequest.description,
    baseSha: pullRequest.base_sha,
    headSha: pullRequest.head_sha,
    url: pullRequest.url,
    changedFiles: pullRequest.changed_files,
  };
}

function normalizeDiagram(fixture: Fixture): DiagramSpec {
  const diagram = fixture.diagram;
  return {
    diagramType: diagram.diagram_type,
    title: diagram.title,
    selectionReason: diagram.selection_reason,
    summary: diagram.summary,
    participants: diagram.participants,
    nodes: diagram.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      kind: node.kind,
      evidenceIds: node.evidence_ids,
    })),
    edges: diagram.edges,
    evidence: diagram.evidence.map((item) => ({
      id: item.id,
      source: item.source,
      filePath: item.file_path,
      lineStart: item.line_start,
      lineEnd: item.line_end,
      url: item.url,
      description: item.description,
    })),
    memories: diagram.memories.map((memory) => ({
      observationId: memory.observation_id,
      title: memory.title,
      relevance: memory.relevance,
    })),
  };
}

function escapeLabel(label: string): string {
  return label.replaceAll('"', "'").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function renderMermaid(diagram: DiagramSpec): string {
  if (diagram.diagramType === "sequence") {
    const lines = ["sequenceDiagram", `    title ${escapeLabel(diagram.title)}`];
    for (const node of diagram.nodes) {
      lines.push(
        `    participant ${node.id} as ${escapeLabel(`${node.label} · ${node.evidenceIds.join(", ")}`)}`,
      );
    }
    for (const edge of diagram.edges) {
      lines.push(
        `    ${edge.source}->>${edge.target}: ${escapeLabel(edge.label || "continues")}`,
      );
    }
    return lines.join("\n");
  }

  if (diagram.diagramType === "state_machine") {
    const lines = ["stateDiagram-v2", "    direction LR"];
    for (const node of diagram.nodes) {
      lines.push(
        `    state "${escapeLabel(`${node.label} · ${node.evidenceIds.join(", ")}`)}" as ${node.id}`,
      );
    }
    for (const edge of diagram.edges) {
      const label = edge.label ? `: ${escapeLabel(edge.label)}` : "";
      lines.push(`    ${edge.source} --> ${edge.target}${label}`);
    }
    return lines.join("\n");
  }

  if (diagram.diagramType !== "flowchart") {
    throw new Error(`The Vercel preview does not render ${diagram.diagramType} diagrams yet.`);
  }

  const lines = ["flowchart LR"];
  for (const node of diagram.nodes) {
    const label = escapeLabel(`${node.label} · ${node.evidenceIds.join(", ")}`);
    const shape = node.kind === "decision" ? `{\"${label}\"}` : `[\"${label}\"]`;
    lines.push(`    ${node.id}${shape}`);
  }
  for (const edge of diagram.edges) {
    const label = edge.label ? `|${escapeLabel(edge.label)}|` : "";
    lines.push(`    ${edge.source} -->${label} ${edge.target}`);
  }
  lines.push(
    "    classDef evidence fill:#DCE6FF,stroke:#1648FF,color:#07111F,stroke-width:2px",
    `    class ${diagram.nodes.map((node) => node.id).join(",")} evidence`,
  );
  return lines.join("\n");
}
