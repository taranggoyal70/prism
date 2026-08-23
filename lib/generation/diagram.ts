import type { DiagramSpec, Evidence, Memory, PullRequest } from "@/lib/schema";

type GenerationContext = {
  pullRequest: PullRequest;
  evidence: Evidence[];
  modelContext: string;
  memories: Memory[];
};

type PatchRecord = {
  evidenceId: string;
  path: string;
  patch: string;
};

type Decision = {
  label: string;
  positiveLabel: string;
  negativeLabel: string;
  fallbackLabel: string;
  fallbackEndsFlow: boolean;
};

export type DiagramDraft = Omit<DiagramSpec, "evidence" | "memories">;

const STATE_TERMS = /\b(status|lifecycle|transition|queued|pending|completed?|failed|state transition)\b/i;
const SYSTEM_TERMS = /\b(api|route|worker|queue|job|service|webhook|server|client)\b/i;
const CODE_FILE = /\.(?:[cm]?[jt]sx?|py|rb|go|rs|java|kt|swift|php|cs)$/i;
const LOW_SIGNAL_FILE = /(^|\/)(?:docs?|examples?|fixtures?|public|assets?)\/|(?:^|\/)(?:readme|changelog|license)(?:\.|$)|\.(?:css|scss|sass|less|mdx?|txt|svg|png|jpe?g|gif|webp|ico|lock)$/i;
const TEST_FILE = /(?:^|\/)(?:tests?|__tests__)\/|\.(?:test|spec)\.[cm]?[jt]sx?$/i;

export async function generateEvidenceDiagram(
  context: GenerationContext,
): Promise<DiagramDraft> {
  const patches = parsePatchRecords(context.modelContext);
  const diagramType = selectDiagramType(context, patches);
  const selectedEvidence = selectEvidence(context.evidence, patches);
  const semanticSteps = selectedEvidence
    .filter((item) => item.source !== "greptile")
    .map((evidence, index) => buildSemanticStep(evidence, patches.get(evidence.id), index));

  if (!semanticSteps.length) {
    const fallback = selectedEvidence[0] ?? context.evidence[0];
    if (!fallback) throw new Error("No grounded evidence was available to build the behavior graph.");
    semanticSteps.push({
      id: "understand_change",
      label: "Understand the changed behavior",
      kind: "process",
      evidenceIds: [fallback.id],
      decision: undefined,
    });
  }

  const greptile = selectedEvidence.find((item) => item.source === "greptile");
  if (greptile) {
    const decisionStep = semanticSteps.find((step) => step.kind === "decision");
    const reviewTarget = decisionStep ?? semanticSteps.at(-1)!;
    reviewTarget.evidenceIds = [...new Set([...reviewTarget.evidenceIds, greptile.id])];
  }

  const nodes: DiagramDraft["nodes"] = semanticSteps.map((step) => ({
    id: step.id,
    label: step.label,
    kind: step.kind,
    evidenceIds: step.evidenceIds,
  }));
  const edges: DiagramDraft["edges"] = [];

  for (let index = 0; index < semanticSteps.length - 1; index += 1) {
    const current = semanticSteps[index]!;
    const next = semanticSteps[index + 1]!;
    const decision = current.decision;
    if (!decision) {
      edges.push({ source: current.id, target: next.id, label: edgeLabel(current.label, next.label) });
      continue;
    }

    const fallbackId = uniqueNodeId(`${current.id}_alternate`, nodes);
    nodes.push({
      id: fallbackId,
      label: decision.fallbackLabel,
      kind: decision.fallbackEndsFlow ? "end" : "process",
      evidenceIds: current.evidenceIds,
    });
    edges.push(
      { source: current.id, target: next.id, label: decision.positiveLabel },
      { source: current.id, target: fallbackId, label: decision.negativeLabel },
    );
    if (!decision.fallbackEndsFlow) {
      edges.push({ source: fallbackId, target: next.id, label: "continue with grounded code" });
    }
  }

  if (nodes.length === 1) {
    nodes[0] = { ...nodes[0]!, kind: "process" };
  } else {
    const first = nodes[0]!;
    if (first.kind !== "decision") nodes[0] = { ...first, kind: "start" };
    const lastBaseNode = nodes.findLast((node) => !node.id.endsWith("_alternate"));
    if (lastBaseNode && lastBaseNode.kind !== "decision") lastBaseNode.kind = "end";
  }

  const fileCount = context.pullRequest.changedFiles.length;
  const greptileCount = context.evidence.filter((item) => item.source === "greptile").length;
  const decisionCount = nodes.filter((node) => node.kind === "decision").length;
  const claimCount = semanticSteps.length;

  return {
    diagramType,
    title: context.pullRequest.title,
    selectionReason: selectionReason(diagramType, decisionCount),
    summary: `${fileCount} ${fileCount === 1 ? "file" : "files"} changed. PRism traced ${claimCount} grounded behavioral ${claimCount === 1 ? "claim" : "claims"}${decisionCount ? ` and ${decisionCount} real decision ${decisionCount === 1 ? "branch" : "branches"}` : ""}. ${summarizeIntent(context.pullRequest)}${greptileCount ? ` Greptile added ${greptileCount} review ${greptileCount === 1 ? "finding" : "findings"}.` : ""}`,
    participants: diagramType === "sequence" ? semanticSteps.map((node) => node.label) : [],
    nodes,
    edges,
  };
}

function parsePatchRecords(modelContext: string): Map<string, PatchRecord> {
  const records = new Map<string, PatchRecord>();
  const pattern = /(?:^|\n)FILE ([a-zA-Z0-9_-]+): ([^\n]+)\n([\s\S]*?)(?=\n\n(?:FILE|REVIEW) |\n(?:FILE|REVIEW) |$)/g;
  for (const match of modelContext.matchAll(pattern)) {
    const evidenceId = match[1];
    const path = match[2];
    if (!evidenceId || !path) continue;
    records.set(evidenceId, { evidenceId, path, patch: match[3]?.trim() ?? "" });
  }
  return records;
}

function selectDiagramType(
  context: GenerationContext,
  patches: Map<string, PatchRecord>,
): DiagramDraft["diagramType"] {
  const patchText = [...patches.values()].map((item) => item.patch).join("\n");
  if (detectDecision(patchText)) return "flowchart";

  const text = `${context.pullRequest.title} ${context.pullRequest.description}`;
  if (STATE_TERMS.test(text)) return "state_machine";

  const topLevelAreas = new Set(
    context.pullRequest.changedFiles.map((path) => path.split("/")[0]?.toLowerCase()),
  );
  const boundaryText = `${text} ${context.pullRequest.changedFiles.join(" ")}`;
  if (topLevelAreas.size > 1 && SYSTEM_TERMS.test(boundaryText)) return "sequence";
  return "flowchart";
}

function selectEvidence(evidence: Evidence[], patches: Map<string, PatchRecord>): Evidence[] {
  const codeEvidence = evidence
    .filter((item) => item.source === "github" && item.filePath)
    .map((item, index) => ({ item, score: evidenceScore(item, patches.get(item.id), index) }))
    .filter(({ score }) => score > -50)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map(({ item }) => item)
    .sort((left, right) => behaviorPhase(left.filePath ?? "") - behaviorPhase(right.filePath ?? ""));
  const greptile = evidence.find((item) => item.source === "greptile");
  const selected = greptile ? [...codeEvidence, greptile] : codeEvidence;
  if (selected.length) return selected;
  return evidence.slice(0, 5);
}

function behaviorPhase(path: string): number {
  const normalized = path.toLowerCase();
  if (/\/api\/|route\.[cm]?[jt]s$/.test(normalized)) return 0;
  if (/github|pull-request|pull_request/.test(normalized)) return 1;
  if (/\/integrations?\//.test(normalized) && !/claude[-_]?mem/.test(normalized)) return 2;
  if (/claude[-_]?mem|memory|memories/.test(normalized)) return 3;
  if (/\/generation\/|\/core\//.test(normalized)) return 4;
  if (/render|present|workspace|evidence-diagram|prism\.[cm]?[jt]s$/.test(normalized)) return 5;
  if (TEST_FILE.test(path)) return 7;
  return 6;
}

function evidenceScore(evidence: Evidence, record: PatchRecord | undefined, index: number): number {
  const path = evidence.filePath ?? record?.path ?? "";
  if (LOW_SIGNAL_FILE.test(path)) return -100;
  let score = CODE_FILE.test(path) ? 40 : 0;
  if (TEST_FILE.test(path)) score -= 15;
  if (/\/api\/|\/routes?\/|route\.[cm]?[jt]s$/i.test(path)) score += 28;
  if (/\/integrations?\/|\/services?\/|\/workers?\//i.test(path)) score += 24;
  if (/\/generation\/|\/core\/|\/lib\//i.test(path)) score += 20;
  if (/\b(?:export\s+)?(?:async\s+)?function\b|\bclass\s+\w+|=>/m.test(record?.patch ?? "")) score += 18;
  if (detectDecision(record?.patch ?? "")) score += 16;
  return score - index * 0.25;
}

function buildSemanticStep(evidence: Evidence, record: PatchRecord | undefined, index: number) {
  const path = evidence.filePath ?? record?.path ?? "";
  const patch = record?.patch ?? "";
  const normalizedPath = path.toLowerCase();
  const knownRole = semanticLabel(path, patch, index);
  const decision = /\/api\/|route\.[cm]?[jt]s$/.test(normalizedPath)
    ? detectDecision(patch)
    : /claude[-_]?mem|memory|memories/.test(normalizedPath)
      ? memoryDecision(patch)
      : isKnownSemanticPath(normalizedPath)
        ? undefined
        : detectDecision(patch);
  const label = decision?.label ?? knownRole;
  return {
    id: uniqueIdentifier(label, index),
    label,
    kind: decision ? "decision" as const : "process" as const,
    evidenceIds: [evidence.id],
    decision,
  };
}

function isKnownSemanticPath(path: string): boolean {
  return /github|pull-request|pull_request|generation|diagram|planner|render|present|workspace|prism\.[cm]?[jt]s$/.test(path);
}

function memoryDecision(patch: string): Decision | undefined {
  if (!/\bif\s*\(|\.length|\.items|baseUrl/i.test(addedCode(patch))) return undefined;
  return {
    label: "Relevant repository memory available?",
    positiveLabel: "relevant memory found",
    negativeLabel: "no relevant memory",
    fallbackLabel: "Continue with grounded code only",
    fallbackEndsFlow: false,
  };
}

function semanticLabel(path: string, patch: string, index: number): string {
  const normalizedPath = path.toLowerCase();
  if (/\/api\/|route\.[cm]?[jt]s$/.test(normalizedPath)) return "Receive the pull request request";
  if (/github|pull-request|pull_request/.test(normalizedPath)) return "Collect patches and review evidence";
  if (/claude[-_]?mem|memory|memories/.test(normalizedPath)) return "Recall repository decisions";
  if (/evidence-diagram|render/.test(normalizedPath)) return "Render the living proof graph";
  if (/workspace|present/.test(normalizedPath)) return "Present the evidence-backed explanation";
  if (/prism\.[cm]?[jt]s$/.test(normalizedPath)) return "Assemble the grounded result";
  if (/generation|diagram|planner/.test(normalizedPath)) return "Build the grounded behavior graph";
  if (TEST_FILE.test(path)) return "Verify the changed behavior";

  const functionName = extractFunctionName(patch);
  if (functionName) return humanizeIdentifier(functionName);
  return index === 0 ? "Understand the incoming change" : "Apply the changed behavior";
}

function extractFunctionName(patch: string): string | undefined {
  const added = addedCode(patch);
  const match = added.match(/\b(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)|\b(?:export\s+)?const\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s*)?\(/);
  return match?.[1] ?? match?.[2];
}

function humanizeIdentifier(identifier: string): string {
  const words = identifier
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return words ? `${words.charAt(0).toUpperCase()}${words.slice(1)}` : "Apply the changed behavior";
}

function detectDecision(patch: string): Decision | undefined {
  const added = addedCode(patch);
  if (!/\bif\s*\(|\bswitch\s*\(|\.safeParse\(|\?\s*[^:]+\s*:/m.test(added)) return undefined;

  if (/safeParse|parsed\.success|valid(?:ate|ation)?/i.test(added)) {
    return {
      label: "Pull request input valid?",
      positiveLabel: "valid input",
      negativeLabel: "invalid input",
      fallbackLabel: "Return actionable URL guidance",
      fallbackEndsFlow: true,
    };
  }
  if (/replay|already(?:Delivered|Processed)|duplicate/i.test(added)) {
    return {
      label: "Request already processed?",
      positiveLabel: "new request",
      negativeLabel: "duplicate detected",
      fallbackLabel: "Reject the duplicate safely",
      fallbackEndsFlow: true,
    };
  }
  if (/memor(?:y|ies)|observation/i.test(added)) {
    return {
      label: "Relevant memory found?",
      positiveLabel: "memory found",
      negativeLabel: "no relevant memory",
      fallbackLabel: "Continue with grounded code only",
      fallbackEndsFlow: false,
    };
  }
  if (/auth|token|session|permission/i.test(added)) {
    return {
      label: "Request authorized?",
      positiveLabel: "authorized",
      negativeLabel: "not authorized",
      fallbackLabel: "Return a safe access error",
      fallbackEndsFlow: true,
    };
  }
  return {
    label: "Condition satisfied?",
    positiveLabel: "yes",
    negativeLabel: "no",
    fallbackLabel: "Follow the alternate behavior",
    fallbackEndsFlow: false,
  };
}

function addedCode(patch: string): string {
  return patch
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1))
    .join("\n");
}

function edgeLabel(source: string, target: string): string {
  if (/receive|collect|fetch/i.test(source)) return "collect context";
  if (/recall|memory/i.test(target)) return "add historical intent";
  if (/build|generate|grounded/i.test(target)) return "assemble grounded claims";
  if (/return|render|verify/i.test(target)) return "pin every claim";
  return "then";
}

function uniqueIdentifier(label: string, index: number): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 42) || `step_${index + 1}`;
  return `${base}_${index + 1}`;
}

function uniqueNodeId(base: string, nodes: DiagramDraft["nodes"]): string {
  const ids = new Set(nodes.map((node) => node.id));
  if (!ids.has(base)) return base;
  let suffix = 2;
  while (ids.has(`${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
}

function selectionReason(diagramType: DiagramDraft["diagramType"], decisionCount: number): string {
  if (decisionCount) {
    return `The patch contains ${decisionCount} executable ${decisionCount === 1 ? "condition" : "conditions"}, so PRism shows the real branch outcomes.`;
  }
  if (diagramType === "sequence") {
    return "The changed behavior crosses system boundaries, so ordered interactions are the clearest view.";
  }
  if (diagramType === "state_machine") {
    return "The pull request changes named lifecycle states, so state transitions lead the explanation.";
  }
  return "The patch is best explained as a grounded path through its changed behavior.";
}

function summarizeIntent(pullRequest: PullRequest): string {
  const originalDescription = pullRequest.description;
  const description = originalDescription
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim()
    .replace(/\s+/g, " ");
  const firstSentence = description.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
  const structuredDescription = /(^|\n)\s*(?:[-*+]\s|#{1,6}\s)/m.test(originalDescription);
  if (firstSentence && !structuredDescription && firstSentence.length <= 180) return firstSentence;
  if (description && description.length <= 180 && !structuredDescription) {
    return `${description}${/[.!?]$/.test(description) ? "" : "."}`;
  }
  if (pullRequest.title) return `The change implements “${pullRequest.title}”.`;
  return `The pull request implements “${pullRequest.title}”.`;
}
