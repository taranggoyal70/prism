import { z } from "zod";

import type { Memory } from "@/lib/schema";

const observationsResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.union([z.number(), z.string()]),
      project: z.string(),
      type: z.string().optional(),
      title: z.string().min(1),
      subtitle: z.string().nullable().optional(),
      narrative: z.string().nullable().optional(),
    }),
  ),
});

type ClaudeMemOptions = {
  baseUrl?: string;
  token?: string;
  signal?: AbortSignal;
};

export async function fetchClaudeMemories(
  project: string,
  options: ClaudeMemOptions = {},
): Promise<Memory[]> {
  const baseUrl = (options.baseUrl ?? process.env.CLAUDE_MEM_BASE_URL ?? "").replace(/\/$/, "");
  if (!baseUrl) return [];

  try {
    const url = new URL("/api/observations", baseUrl);
    const configuredProject = process.env.PRISM_CLAUDE_MEM_PROJECT;
    const scopedProject = configuredProject?.toLowerCase() === project.toLowerCase()
      ? configuredProject
      : project;
    url.searchParams.set("project", scopedProject);
    url.searchParams.set("limit", "4");
    url.searchParams.set("offset", "0");
    const token = options.token ?? process.env.CLAUDE_MEM_BRIDGE_TOKEN;
    const response = await fetch(url, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: options.signal ?? AbortSignal.timeout(3_500),
    });
    if (!response.ok) return [];

    const payload = observationsResponseSchema.parse(await response.json());
    return payload.items.map((item) => ({
      observationId: String(item.id),
      title: item.title,
      relevance: item.subtitle ?? item.narrative ?? `${item.type ?? "Project"} memory from Claude-Mem.`,
    }));
  } catch {
    return [];
  }
}
