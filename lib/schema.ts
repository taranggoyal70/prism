import { z } from "zod";

const pullRequestRefSchema = z.object({
  owner: z.string().min(1),
  repository: z.string().min(1),
  number: z.number().int().positive(),
});

const evidenceSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  source: z.enum(["github", "greptile", "claude_mem"]),
  file_path: z.string().nullable().optional(),
  line_start: z.number().int().positive().nullable().optional(),
  line_end: z.number().int().positive().nullable().optional(),
  url: z.url().nullable().optional(),
  description: z.string().min(1),
});

const memorySchema = z.object({
  observation_id: z.string().min(1),
  title: z.string().min(1),
  relevance: z.string().min(1),
});

const diagramNodeSchema = z.object({
  id: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/),
  label: z.string().min(1),
  kind: z.enum(["process", "decision", "start", "end", "state", "participant"]),
  evidence_ids: z.array(z.string()).min(1),
});

const diagramEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string().default(""),
});

const diagramSchema = z
  .object({
    diagram_type: z.enum(["flowchart", "sequence", "state_machine"]),
    title: z.string().min(1),
    selection_reason: z.string().min(1),
    summary: z.string().min(1),
    participants: z.array(z.string()).default([]),
    nodes: z.array(diagramNodeSchema).min(1),
    edges: z.array(diagramEdgeSchema).default([]),
    evidence: z.array(evidenceSchema).min(1),
    memories: z.array(memorySchema).default([]),
  })
  .superRefine((diagram, context) => {
    const nodeIds = new Set(diagram.nodes.map((node) => node.id));
    const evidenceIds = new Set(diagram.evidence.map((item) => item.id));

    for (const node of diagram.nodes) {
      for (const evidenceId of node.evidence_ids) {
        if (!evidenceIds.has(evidenceId)) {
          context.addIssue({
            code: "custom",
            message: `Node ${node.id} references unknown evidence ${evidenceId}`,
            path: ["nodes", node.id, "evidence_ids"],
          });
        }
      }
    }

    for (const edge of diagram.edges) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        context.addIssue({
          code: "custom",
          message: `Edge ${edge.source} -> ${edge.target} references an unknown node`,
          path: ["edges"],
        });
      }
    }
  });

export const fixtureSchema = z.object({
  pull_request: z.object({
    ref: pullRequestRefSchema,
    title: z.string().min(1),
    description: z.string(),
    base_sha: z.string().min(7),
    head_sha: z.string().min(7),
    url: z.url(),
    changed_files: z.array(z.string()),
  }),
  diagram: diagramSchema,
});

export type Fixture = z.infer<typeof fixtureSchema>;

export type PullRequestRef = {
  owner: string;
  repository: string;
  number: number;
};

export type PullRequest = {
  ref: PullRequestRef;
  title: string;
  description: string;
  baseSha: string;
  headSha: string;
  url: string;
  changedFiles: string[];
};

export type Evidence = {
  id: string;
  source: "github" | "greptile" | "claude_mem";
  filePath?: string | null;
  lineStart?: number | null;
  lineEnd?: number | null;
  url?: string | null;
  description: string;
};

export type Memory = {
  observationId: string;
  title: string;
  relevance: string;
};

export type DiagramNode = {
  id: string;
  label: string;
  kind: "process" | "decision" | "start" | "end" | "state" | "participant";
  evidenceIds: string[];
};

export type DiagramSpec = {
  diagramType: "flowchart" | "sequence" | "state_machine";
  title: string;
  selectionReason: string;
  summary: string;
  participants: string[];
  nodes: DiagramNode[];
  edges: Array<{ source: string; target: string; label: string }>;
  evidence: Evidence[];
  memories: Memory[];
};

export type ExplanationResult = {
  pullRequest: PullRequest;
  diagram: DiagramSpec;
  mermaid: string;
  source: "live" | "cache" | "offline fixture";
};
