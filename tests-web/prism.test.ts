import { describe, expect, it } from "vitest";

import { explainPullRequest, parsePullRequestUrl, renderMermaid } from "@/lib/prism";
import type { DiagramSpec } from "@/lib/schema";

describe("PR explanation pipeline", () => {
  it("parses a complete GitHub pull request URL", () => {
    expect(parsePullRequestUrl("https://github.com/acme/ledger/pull/42")).toEqual({
      owner: "acme",
      repository: "ledger",
      number: 42,
    });
  });

  it("returns a validated, evidence-grounded diagram for the prepared demo", async () => {
    const result = await explainPullRequest("https://github.com/acme/ledger/pull/42");

    expect(result.pullRequest.title).toBe("Prevent duplicate ledger entries");
    expect(result.diagram.evidence).toHaveLength(3);
    expect(result.diagram.nodes.every((node) => node.evidenceIds.length > 0)).toBe(true);
    expect(result.mermaid).toContain("flowchart LR");
  });

  it("turns a live pull request into a diagram grounded in collected evidence", async () => {
    const result = await explainPullRequest("https://github.com/openai/prism/pull/7", {
      fetchContext: async () => ({
        pullRequest: {
          ref: { owner: "openai", repository: "prism", number: 7 },
          title: "Validate webhook delivery",
          description: "Reject replayed webhook events.",
          baseSha: "1111111",
          headSha: "2222222",
          url: "https://github.com/openai/prism/pull/7",
          changedFiles: ["src/webhooks.ts"],
        },
        evidence: [
          {
            id: "github_file_1",
            source: "github" as const,
            filePath: "src/webhooks.ts",
            lineStart: 1,
            lineEnd: 24,
            url: "https://github.com/openai/prism/blob/2222222/src/webhooks.ts",
            description: "Changed in this pull request: +18 / -3 lines.",
          },
        ],
        modelContext: "src/webhooks.ts\n+ reject replayed events",
        memories: [],
      }),
      generateDiagram: async () => ({
        diagramType: "flowchart" as const,
        title: "Webhook validation",
        selectionReason: "The change adds a validation branch.",
        summary: "The handler rejects webhook events that have already been processed.",
        participants: [],
        nodes: [
          {
            id: "validate_event",
            label: "Validate event identifier",
            kind: "decision" as const,
            evidenceIds: ["github_file_1"],
          },
        ],
        edges: [],
      }),
    });

    expect(result.source).toBe("live");
    expect(result.diagram.nodes[0]?.evidenceIds).toEqual(["github_file_1"]);
    expect(result.diagram.evidence[0]?.url).toContain(result.pullRequest.headSha);
  });

  it("rejects unsupported URLs with actionable guidance", () => {
    expect(() => parsePullRequestUrl("https://github.com/acme/ledger/issues/42")).toThrow(
      "full GitHub pull request URL",
    );
  });

  it("renders cross-system explanations as sequence diagrams", () => {
    const diagram: DiagramSpec = {
      diagramType: "sequence",
      title: "Webhook delivery",
      selectionReason: "The change crosses an API and worker.",
      summary: "The API hands validated work to the worker.",
      participants: [],
      nodes: [
        { id: "api", label: "API", kind: "participant", evidenceIds: ["e1"] },
        { id: "worker", label: "Worker", kind: "participant", evidenceIds: ["e2"] },
      ],
      edges: [{ source: "api", target: "worker", label: "dispatch job" }],
      evidence: [
        { id: "e1", source: "github", description: "API change" },
        { id: "e2", source: "github", description: "Worker change" },
      ],
      memories: [],
    };

    expect(renderMermaid(diagram)).toContain("sequenceDiagram");
    expect(renderMermaid(diagram)).toContain("api->>worker: dispatch job");
  });

  it("renders lifecycle explanations as state machines", () => {
    const diagram: DiagramSpec = {
      diagramType: "state_machine",
      title: "Delivery lifecycle",
      selectionReason: "The entity moves between named states.",
      summary: "A queued delivery becomes complete after processing.",
      participants: [],
      nodes: [
        { id: "queued", label: "Queued", kind: "state", evidenceIds: ["e1"] },
        { id: "complete", label: "Complete", kind: "state", evidenceIds: ["e2"] },
      ],
      edges: [{ source: "queued", target: "complete", label: "processed" }],
      evidence: [
        { id: "e1", source: "github", description: "Queue state" },
        { id: "e2", source: "github", description: "Completion state" },
      ],
      memories: [],
    };

    expect(renderMermaid(diagram)).toContain("stateDiagram-v2");
    expect(renderMermaid(diagram)).toContain("queued --> complete: processed");
  });
});
