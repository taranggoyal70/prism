import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchGitHubPullRequest } from "@/lib/integrations/github";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GitHub integration", () => {
  it("collects changed-code and Greptile evidence pinned to the PR head", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.endsWith("/repos/openai/prism/pulls/7")) {
          return Response.json({
            title: "Validate webhook delivery",
            body: "Reject replayed webhook events.",
            html_url: "https://github.com/openai/prism/pull/7",
            base: { sha: "1111111111111111111111111111111111111111" },
            head: { sha: "2222222222222222222222222222222222222222" },
          });
        }
        if (url.includes("/repos/openai/prism/pulls/7/files")) {
          return Response.json([
            {
              filename: "src/webhooks.ts",
              additions: 18,
              deletions: 3,
              changes: 21,
              patch: "@@ -1,3 +1,24 @@\n+export function validateWebhook() {}",
            },
          ]);
        }
        if (url.includes("/repos/openai/prism/pulls/7/comments")) {
          return Response.json([
            {
              id: 91,
              body: "Replay protection should be checked before dispatch.",
              path: "src/webhooks.ts",
              line: 12,
              start_line: 9,
              html_url: "https://github.com/openai/prism/pull/7#discussion_r91",
              user: { login: "greptile-apps[bot]" },
            },
          ]);
        }
        return Response.json({ message: "Not found" }, { status: 404 });
      }),
    );

    const context = await fetchGitHubPullRequest(
      { owner: "openai", repository: "prism", number: 7 },
      { token: "test-token" },
    );

    expect(context.pullRequest.changedFiles).toEqual(["src/webhooks.ts"]);
    expect(context.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "github",
          filePath: "src/webhooks.ts",
          url: expect.stringContaining("/blob/2222222222222222222222222222222222222222/"),
          description: expect.stringContaining("validateWebhook"),
          excerpt: expect.stringContaining("export function validateWebhook"),
        }),
        expect.objectContaining({
          source: "greptile",
          url: "https://github.com/openai/prism/pull/7#discussion_r91",
        }),
      ]),
    );
    expect(context.modelContext).toContain("validateWebhook");
  });
});
