import { describe, expect, it } from "vitest";

import { generateEvidenceDiagram } from "@/lib/generation/diagram";

describe("diagram generation", () => {
  it("builds a semantic grounded plan without sequencing filenames", async () => {
    const diagram = await generateEvidenceDiagram({
      pullRequest: {
        ref: { owner: "openai", repository: "prism", number: 7 },
        title: "Validate webhook delivery",
        description: "Reject replayed events before dispatch.",
        baseSha: "1111111",
        headSha: "2222222",
        url: "https://github.com/openai/prism/pull/7",
        changedFiles: ["src/webhooks.ts", "src/worker.ts", "tests/webhooks.test.ts"],
      },
      evidence: [
        {
          id: "github_file_1",
          source: "github",
          filePath: "src/webhooks.ts",
          description: "Changed in this pull request: +18 / -3 lines.",
        },
        {
          id: "github_file_2",
          source: "github",
          filePath: "src/worker.ts",
          description: "Changed in this pull request: +9 / -1 lines.",
        },
        {
          id: "review_comment_1",
          source: "greptile",
          filePath: "src/webhooks.ts",
          description: "Replay protection should be checked before dispatch.",
        },
      ],
      modelContext: [
        "FILE github_file_1: src/webhooks.ts",
        "@@ -1,3 +1,24 @@",
        "+export async function validateWebhook(event: WebhookEvent) {",
        "+  if (await wasAlreadyDelivered(event.id)) return rejectReplay(event)",
        "+  return dispatchWebhook(event)",
        "+}",
        "",
        "FILE github_file_2: src/worker.ts",
        "@@ -1,2 +1,10 @@",
        "+export async function dispatchWebhook(event: WebhookEvent) {",
        "+  return queue.send(event)",
        "+}",
      ].join("\n"),
      memories: [],
    });

    expect(diagram.title).toContain("Validate webhook delivery");
    expect(diagram.nodes.length).toBeGreaterThanOrEqual(3);
    expect(diagram.nodes.every((node) => node.evidenceIds.length > 0)).toBe(true);
    expect(diagram.nodes.some((node) => node.kind === "decision")).toBe(true);
    expect(diagram.nodes.map((node) => node.label).join(" ")).not.toMatch(/webhooks\.ts|worker\.ts/);
    expect(diagram.edges.some((edge) => /yes|no|valid|replay/i.test(edge.label))).toBe(true);
    expect(diagram.summary).toContain("3 files");
    expect(diagram.summary).toContain("Greptile");
  });

  it("ranks behavior-bearing code ahead of documentation and styles", async () => {
    const diagram = await generateEvidenceDiagram({
      pullRequest: {
        ref: { owner: "acme", repository: "app", number: 11 },
        title: "Validate API requests before generation",
        description: "Invalid requests return guidance. Valid requests generate a grounded result.",
        baseSha: "1111111",
        headSha: "2222222",
        url: "https://github.com/acme/app/pull/11",
        changedFiles: ["README.md", "app/globals.css", "app/api/explain/route.ts", "lib/generation/diagram.ts"],
      },
      evidence: [
        { id: "docs", source: "github", filePath: "README.md", description: "Documentation" },
        { id: "styles", source: "github", filePath: "app/globals.css", description: "Styles" },
        { id: "route", source: "github", filePath: "app/api/explain/route.ts", description: "Request handler" },
        { id: "generator", source: "github", filePath: "lib/generation/diagram.ts", description: "Diagram generator" },
      ],
      modelContext: [
        "FILE docs: README.md",
        "+# Product notes",
        "",
        "FILE styles: app/globals.css",
        "+.panel { color: blue; }",
        "",
        "FILE route: app/api/explain/route.ts",
        "+const parsed = requestSchema.safeParse(payload)",
        "+if (!parsed.success) return invalidRequest()",
        "+return explainPullRequest(parsed.data.prUrl)",
        "",
        "FILE generator: lib/generation/diagram.ts",
        "+export function generateEvidenceDiagram(context: Context) {",
        "+  return buildBehaviorGraph(context)",
        "+}",
      ].join("\n"),
      memories: [],
    });

    const evidenceIds = new Set(diagram.nodes.flatMap((node) => node.evidenceIds));
    expect(evidenceIds).toContain("route");
    expect(evidenceIds).toContain("generator");
    expect(evidenceIds).not.toContain("docs");
    expect(evidenceIds).not.toContain("styles");
  });

  it("uses a sequence diagram when the changed files span system boundaries", async () => {
    const diagram = await generateEvidenceDiagram({
      pullRequest: {
        ref: { owner: "acme", repository: "app", number: 9 },
        title: "Route API jobs to worker",
        description: "The API queues jobs for the worker and supports flowcharts or state machines.",
        baseSha: "1111111",
        headSha: "2222222",
        url: "https://github.com/acme/app/pull/9",
        changedFiles: ["app/api/jobs/route.ts", "workers/process-job.ts"],
      },
      evidence: [
        { id: "e1", source: "github", filePath: "app/api/jobs/route.ts", description: "API route" },
        { id: "e2", source: "github", filePath: "workers/process-job.ts", description: "Worker" },
      ],
      modelContext: "",
      memories: [],
    });

    expect(diagram.diagramType).toBe("sequence");
    expect(diagram.edges).toHaveLength(1);
  });
});
