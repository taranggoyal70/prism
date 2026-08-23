import { describe, expect, it } from "vitest";

import { generateEvidenceDiagram } from "@/lib/generation/diagram";

describe("diagram generation", () => {
  it("builds a useful grounded plan without a paid model dependency", async () => {
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
      modelContext: "FILE github_file_1: src/webhooks.ts\n+validate event before dispatch",
      memories: [],
    });

    expect(diagram.title).toContain("Validate webhook delivery");
    expect(diagram.nodes).toHaveLength(3);
    expect(diagram.nodes.every((node) => node.evidenceIds.length > 0)).toBe(true);
    expect(diagram.summary).toContain("3 files");
    expect(diagram.summary).toContain("Greptile");
  });

  it("uses a sequence diagram when the changed files span system boundaries", async () => {
    const diagram = await generateEvidenceDiagram({
      pullRequest: {
        ref: { owner: "acme", repository: "app", number: 9 },
        title: "Route API jobs to worker",
        description: "The API queues jobs for the worker.",
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
