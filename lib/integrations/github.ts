import { z } from "zod";

import { fetchClaudeMemories } from "@/lib/integrations/claude-mem";
import type { Evidence, Memory, PullRequest, PullRequestRef } from "@/lib/schema";

const GITHUB_API_VERSION = "2026-03-10";
const MAX_EVIDENCE_FILES = 20;
const MAX_PATCH_LENGTH = 6_000;
const MAX_MODEL_CONTEXT_LENGTH = 60_000;

const pullRequestResponseSchema = z.object({
  title: z.string(),
  body: z.string().nullable(),
  html_url: z.url(),
  base: z.object({ sha: z.string().min(7) }),
  head: z.object({ sha: z.string().min(7) }),
});

const changedFileSchema = z.object({
  filename: z.string().min(1),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  changes: z.number().int().nonnegative(),
  patch: z.string().optional(),
});

const reviewCommentSchema = z.object({
  id: z.number().int().positive(),
  body: z.string(),
  path: z.string().nullable().optional(),
  line: z.number().int().positive().nullable().optional(),
  start_line: z.number().int().positive().nullable().optional(),
  html_url: z.url(),
  user: z.object({ login: z.string() }).nullable(),
});

export class GitHubIntegrationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GitHubIntegrationError";
  }
}

type GitHubOptions = {
  token?: string;
  signal?: AbortSignal;
};

export type GitHubPullRequestContext = {
  pullRequest: PullRequest;
  evidence: Evidence[];
  modelContext: string;
  memories: Memory[];
};

export async function fetchGitHubPullRequest(
  ref: PullRequestRef,
  options: GitHubOptions = {},
): Promise<GitHubPullRequestContext> {
  const repositoryPath = `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repository)}`;
  const token = options.token ?? process.env.GITHUB_TOKEN;
  const requestOptions = { token, signal: options.signal };

  const [pullPayload, filesPayload, commentsPayload, memories] = await Promise.all([
    githubJson(`${repositoryPath}/pulls/${ref.number}`, requestOptions),
    githubJson(`${repositoryPath}/pulls/${ref.number}/files?per_page=100`, requestOptions),
    githubJson(`${repositoryPath}/pulls/${ref.number}/comments?per_page=100`, requestOptions),
    fetchClaudeMemories(ref.repository),
  ]);

  const pull = pullRequestResponseSchema.parse(pullPayload);
  const files = z.array(changedFileSchema).parse(filesPayload);
  const comments = z.array(reviewCommentSchema).parse(commentsPayload);
  const pullRequest: PullRequest = {
    ref,
    title: pull.title,
    description: pull.body ?? "",
    baseSha: pull.base.sha,
    headSha: pull.head.sha,
    url: pull.html_url,
    changedFiles: files.map((file) => file.filename),
  };

  const fileEvidence = files.slice(0, MAX_EVIDENCE_FILES).map((file, index) => {
    const range = parseNewLineRange(file.patch);
    return {
      id: `github_file_${index + 1}`,
      source: "github" as const,
      filePath: file.filename,
      lineStart: range?.start,
      lineEnd: range?.end,
      url: pinnedBlobUrl(ref, pull.head.sha, file.filename, range),
      description: `Changed in this pull request: +${file.additions} / -${file.deletions} lines.`,
    } satisfies Evidence;
  });

  const commentEvidence = comments.slice(0, 20).map((comment, index) => ({
    id: `review_comment_${index + 1}`,
    source: isGreptileLogin(comment.user?.login) ? "greptile" as const : "github" as const,
    filePath: comment.path,
    lineStart: comment.start_line ?? comment.line,
    lineEnd: comment.line,
    url: comment.html_url,
    description: truncate(comment.body, 500),
  } satisfies Evidence));

  const evidence = [...fileEvidence, ...commentEvidence];
  if (evidence.length === 0) {
    throw new GitHubIntegrationError("This pull request does not expose any changed-file evidence.", 422);
  }

  const modelContext = buildModelContext(pullRequest, files, comments, evidence);
  return { pullRequest, evidence, modelContext, memories };
}

async function githubJson(
  path: string,
  options: { token?: string; signal?: AbortSignal },
): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": "prism-pr-vercel",
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const response = await fetch(`https://api.github.com${path}`, {
    headers,
    signal: options.signal ?? AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { message?: unknown } | null;
    const githubMessage = typeof detail?.message === "string" ? detail.message : "GitHub request failed";
    if (response.status === 404) {
      throw new GitHubIntegrationError(
        "Pull request not found. Check the URL and repository access.",
        404,
      );
    }
    if (response.status === 403 || response.status === 429) {
      throw new GitHubIntegrationError(
        "GitHub rate-limited this request. Try again shortly.",
        503,
      );
    }
    throw new GitHubIntegrationError(`GitHub could not load this pull request: ${githubMessage}.`, 502);
  }
  return response.json();
}

function parseNewLineRange(patch?: string): { start: number; end: number } | undefined {
  const match = patch?.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/m);
  if (!match) return undefined;
  const start = Number(match[1]);
  const count = Number(match[2] ?? 1);
  return { start, end: Math.max(start, start + count - 1) };
}

function pinnedBlobUrl(
  ref: PullRequestRef,
  headSha: string,
  filePath: string,
  range?: { start: number; end: number },
): string {
  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
  const lineFragment = range
    ? `#L${range.start}${range.end === range.start ? "" : `-L${range.end}`}`
    : "";
  return `https://github.com/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repository)}/blob/${headSha}/${encodedPath}${lineFragment}`;
}

function buildModelContext(
  pullRequest: PullRequest,
  files: z.infer<typeof changedFileSchema>[],
  comments: z.infer<typeof reviewCommentSchema>[],
  evidence: Evidence[],
): string {
  const sections = [
    `PULL REQUEST\nTitle: ${pullRequest.title}\nDescription: ${pullRequest.description || "No description provided."}`,
    `ALLOWED EVIDENCE IDS\n${evidence.map((item) => `${item.id}: ${item.filePath ?? "review context"} - ${item.description}`).join("\n")}`,
    ...files.slice(0, MAX_EVIDENCE_FILES).map((file, index) =>
      `FILE github_file_${index + 1}: ${file.filename}\n${truncate(file.patch ?? "Patch unavailable.", MAX_PATCH_LENGTH)}`,
    ),
    ...comments.slice(0, 20).map((comment, index) =>
      `REVIEW review_comment_${index + 1} by ${comment.user?.login ?? "unknown"}: ${truncate(comment.body, 1_000)}`,
    ),
  ];
  return truncate(sections.join("\n\n"), MAX_MODEL_CONTEXT_LENGTH);
}

function isGreptileLogin(login?: string): boolean {
  return login?.toLowerCase().includes("greptile") ?? false;
}

function truncate(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`;
}
