// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PrismWorkspace } from "@/components/prism-workspace";
import { explainPullRequest } from "@/lib/prism";

vi.mock("@/components/evidence-diagram", () => ({
  EvidenceDiagram: ({ diagram }: { diagram: { title: string } }) => <div aria-label={`${diagram.title} behavior graph`} />,
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

    await user.click(screen.getByRole("button", { name: "Analyze" }));

    expect(await screen.findByRole("heading", { name: result.pullRequest.title })).toBeVisible();
    expect(screen.getByLabelText("Behavioral claims")).toBeVisible();
    expect(screen.getByLabelText(`${result.diagram.title} behavior graph`)).toBeVisible();
    expect(screen.getByText("Memory that changed the decision")).toBeVisible();
    expect(screen.getByText("Repository-scoped observations only.")).toBeVisible();
  });
});
