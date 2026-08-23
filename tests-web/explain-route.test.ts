import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/explain/route";
import { generateEvidenceDiagram } from "@/lib/generation/diagram";
import { fetchGitHubPullRequest } from "@/lib/integrations/github";

vi.mock("@/lib/integrations/github", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/integrations/github")>()),
  fetchGitHubPullRequest: vi.fn(),
}));

vi.mock("@/lib/generation/diagram", () => ({
  generateEvidenceDiagram: vi.fn(),
}));

describe("POST /api/explain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the prepared explanation through the public HTTP interface", async () => {
    const response = await POST(
      new Request("http://localhost/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prUrl: "https://github.com/acme/ledger/pull/42" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      pullRequest: { title: "Prevent duplicate ledger entries" },
      source: "offline fixture",
    });
  });

  it("returns actionable validation errors", async () => {
    const response = await POST(
      new Request("http://localhost/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prUrl: "not-a-url" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        "Enter a full GitHub pull request URL, such as https://github.com/owner/repo/pull/123.",
    });
  });

  it("runs the live GitHub and AI pipeline for an arbitrary pull request", async () => {
    vi.mocked(fetchGitHubPullRequest).mockResolvedValue({
      pullRequest: {
        ref: { owner: "openai", repository: "prism", number: 7 },
        title: "Validate webhook delivery",
        description: "Reject replayed events.",
        baseSha: "1111111",
        headSha: "2222222",
        url: "https://github.com/openai/prism/pull/7",
        changedFiles: ["src/webhooks.ts"],
      },
      evidence: [
        {
          id: "github_file_1",
          source: "github",
          filePath: "src/webhooks.ts",
          url: "https://github.com/openai/prism/blob/2222222/src/webhooks.ts",
          description: "Changed in this pull request.",
        },
      ],
      modelContext: "FILE github_file_1: src/webhooks.ts",
      memories: [],
    });
    vi.mocked(generateEvidenceDiagram).mockResolvedValue({
      diagramType: "flowchart",
      title: "Webhook validation",
      selectionReason: "The change introduces a validation branch.",
      summary: "Replay attempts are rejected before dispatch.",
      participants: [],
      nodes: [
        {
          id: "validate_event",
          label: "Validate event identifier",
          kind: "decision",
          evidenceIds: ["github_file_1"],
        },
      ],
      edges: [],
    });

    const response = await POST(
      new Request("http://localhost/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prUrl: "https://github.com/openai/prism/pull/7" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      pullRequest: { title: "Validate webhook delivery" },
      source: "live",
    });
  });
});
