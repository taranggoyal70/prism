import { z } from "zod";

import { GitHubIntegrationError } from "@/lib/integrations/github";
import { explainPullRequest } from "@/lib/prism";

const requestSchema = z.object({
  prUrl: z.string().min(1),
});

export async function POST(request: Request): Promise<Response> {
  const payload: unknown = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: "Enter a GitHub pull request URL to continue." },
      { status: 400 },
    );
  }

  try {
    return Response.json(await explainPullRequest(parsed.data.prUrl), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not explain this pull request.";
    const status = error instanceof GitHubIntegrationError ? error.status : 400;
    return Response.json({ error: message }, { status });
  }
}
