// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PrismWorkspace } from "@/components/prism-workspace";
import { explainPullRequest } from "@/lib/prism";

vi.mock("@/components/evidence-diagram", () => ({
  EvidenceDiagram: ({ title }: { title: string }) => <div aria-label={`${title} diagram`} />,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PRism workspace", () => {
  it("runs the prepared explanation from the primary action", async () => {
    const result = await explainPullRequest("https://github.com/acme/ledger/pull/42");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(result), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const user = userEvent.setup();
    render(<PrismWorkspace />);

    await user.click(screen.getByRole("button", { name: "Explain this PR" }));

    expect(await screen.findByRole("heading", { name: result.pullRequest.title })).toBeVisible();
    expect(screen.getByText("3 pinned code references")).toBeVisible();
    expect(screen.getByText(/Claude-Mem timeline/)).toBeVisible();
    expect(screen.getByText(/Warm boot loaded 1 project observation/)).toBeVisible();
  });
});
