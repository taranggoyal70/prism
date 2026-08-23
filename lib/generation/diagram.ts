import type { DiagramSpec, Evidence, Memory, PullRequest } from "@/lib/schema";

type GenerationContext = {
  pullRequest: PullRequest;
  evidence: Evidence[];
  modelContext: string;
  memories: Memory[];
};

export type DiagramDraft = Omit<DiagramSpec, "evidence" | "memories">;

const STATE_TERMS = /\b(status|lifecycle|transition|queued|pending|completed?|failed|state transition)\b/i;
const SYSTEM_TERMS = /\b(api|route|worker|queue|job|service|webhook|server|client)\b/i;

export async function generateEvidenceDiagram(
  context: GenerationContext,
): Promise<DiagramDraft> {
  const diagramType = selectDiagramType(context);
  const selectedEvidence = selectEvidence(context.evidence);
  const nodes = selectedEvidence.map((evidence, index) => ({
    id: `step_${index + 1}`,
    label: nodeLabel(evidence, index, selectedEvidence.length),
    kind: nodeKind(diagramType, index, selectedEvidence.length),
    evidenceIds: [evidence.id],
  }));
  const edges = nodes.slice(1).map((node, index) => ({
    source: nodes[index]!.id,
    target: node.id,
    label: edgeLabel(diagramType, index),
  }));
  const greptileCount = context.evidence.filter((item) => item.source === "greptile").length;
  const fileCount = context.pullRequest.changedFiles.length;

  return {
    diagramType,
    title: context.pullRequest.title,
    selectionReason: selectionReason(diagramType),
    summary: `${fileCount} ${fileCount === 1 ? "file" : "files"} changed. ${summarizeIntent(context.pullRequest)}${
      greptileCount
        ? ` Greptile contributed ${greptileCount} review ${greptileCount === 1 ? "finding" : "findings"}.`
        : " Every step is pinned to immutable GitHub evidence."
    }`,
    participants: diagramType === "sequence" ? nodes.map((node) => node.label) : [],
    nodes,
    edges,
  };
}

function selectDiagramType(context: GenerationContext): DiagramDraft["diagramType"] {
  const text = `${context.pullRequest.title} ${context.pullRequest.description}`;
  if (STATE_TERMS.test(text)) return "state_machine";

  const topLevelAreas = new Set(
    context.pullRequest.changedFiles.map((path) => path.split("/")[0]?.toLowerCase()),
  );
  const boundaryText = `${text} ${context.pullRequest.changedFiles.join(" ")}`;
  if (topLevelAreas.size > 1 && SYSTEM_TERMS.test(boundaryText)) return "sequence";
  return "flowchart";
}

function selectEvidence(evidence: Evidence[]): Evidence[] {
  const files = evidence.filter((item) => item.source === "github" && item.filePath).slice(0, 5);
  const greptile = evidence.find((item) => item.source === "greptile");
  const selected = greptile ? [...files, greptile] : files;
  return (selected.length ? selected : evidence).slice(0, 6);
}

function nodeLabel(evidence: Evidence, index: number, total: number): string {
  if (evidence.source === "greptile") {
    return `Greptile review: ${truncate(evidence.description, 54)}`;
  }
  const path = evidence.filePath ?? `Evidence ${index + 1}`;
  const fileName = path.split("/").at(-1) ?? path;
  if (index === 0) return `Change ${fileName}`;
  if (index === total - 1 && /(?:test|spec)/i.test(path)) return `Verify with ${fileName}`;
  return `Update ${fileName}`;
}

function nodeKind(
  diagramType: DiagramDraft["diagramType"],
  index: number,
  total: number,
): DiagramSpec["nodes"][number]["kind"] {
  if (diagramType === "state_machine") return "state";
  if (diagramType === "sequence") return "participant";
  if (index === 0) return "start";
  if (index === total - 1) return "end";
  return "process";
}

function edgeLabel(diagramType: DiagramDraft["diagramType"], index: number): string {
  if (diagramType === "sequence") return index === 0 ? "passes change" : "continues";
  if (diagramType === "state_machine") return "transitions";
  return index === 0 ? "then" : "supports";
}

function selectionReason(diagramType: DiagramDraft["diagramType"]): string {
  if (diagramType === "sequence") {
    return "The changed files cross system boundaries, so ordered interactions are the clearest view.";
  }
  if (diagramType === "state_machine") {
    return "The pull request describes lifecycle states or transitions, so the state changes lead the explanation.";
  }
  return "The pull request is best explained as a grounded path through its changed files.";
}

function summarizeIntent(pullRequest: PullRequest): string {
  const description = pullRequest.description
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim()
    .replace(/\s+/g, " ");
  if (!description) return `The pull request implements “${pullRequest.title}”.`;
  return truncate(description, 320);
}

function truncate(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`;
}
