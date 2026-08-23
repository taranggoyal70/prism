import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchClaudeMemories } from "@/lib/integrations/claude-mem";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Claude-Mem integration", () => {
  it("maps real worker observations into visible project memory", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          items: [
            {
              id: 3,
              project: "prism",
              type: "decision",
              title: "Keep the live path independent of paid APIs",
              subtitle: "Ground every diagram node in immutable evidence.",
              narrative: "PRism remains reliable when model billing is unavailable.",
            },
          ],
          hasMore: false,
          offset: 0,
          limit: 5,
        }),
      ),
    );

    await expect(
      fetchClaudeMemories("prism", {
        baseUrl: "http://127.0.0.1:37702",
        token: "bridge-secret",
      }),
    ).resolves.toEqual([
      {
        observationId: "3",
        title: "Keep the live path independent of paid APIs",
        relevance: "Ground every diagram node in immutable evidence.",
      },
    ]);
    expect(fetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        cache: "no-store",
        headers: { Authorization: "Bearer bridge-secret" },
      }),
    );
  });

  it("degrades safely when no Claude-Mem bridge is configured", async () => {
    await expect(fetchClaudeMemories("prism", { baseUrl: "" })).resolves.toEqual([]);
  });

  it("never leaks an environment project override into another repository", async () => {
    vi.stubEnv("PRISM_CLAUDE_MEM_PROJECT", "prism");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ items: [] })));

    await fetchClaudeMemories("another-repository", {
      baseUrl: "http://127.0.0.1:37702",
    });

    const requestedUrl = vi.mocked(fetch).mock.calls[0]?.[0];
    expect(requestedUrl).toBeInstanceOf(URL);
    expect((requestedUrl as URL).searchParams.get("project")).toBe("another-repository");
  });
});
