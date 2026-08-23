import { timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

const port = Number(process.env.PRISM_MEMORY_BRIDGE_PORT ?? 37800);
const token = process.env.PRISM_MEMORY_BRIDGE_TOKEN;
const workerBaseUrl = process.env.CLAUDE_MEM_WORKER_URL ?? "http://127.0.0.1:37702";
const project = process.env.PRISM_MEMORY_PROJECT ?? "prism";

if (!token) {
  throw new Error("PRISM_MEMORY_BRIDGE_TOKEN is required.");
}

function authorized(header) {
  const supplied = header?.replace(/^Bearer\s+/i, "") ?? "";
  const actual = Buffer.from(token);
  const candidate = Buffer.from(supplied);
  return actual.length === candidate.length && timingSafeEqual(actual, candidate);
}

const server = createServer(async (request, response) => {
  response.setHeader("content-type", "application/json; charset=utf-8");
  if (request.url === "/health") {
    response.end(JSON.stringify({ status: "ok", service: "prism-claude-mem-bridge" }));
    return;
  }
  if (!authorized(request.headers.authorization)) {
    response.statusCode = 401;
    response.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }
  const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
  if (request.method !== "GET" || requestUrl.pathname !== "/api/observations") {
    response.statusCode = 404;
    response.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  try {
    const workerUrl = new URL("/api/observations", workerBaseUrl);
    workerUrl.searchParams.set("project", project);
    workerUrl.searchParams.set("limit", "4");
    workerUrl.searchParams.set("offset", "0");
    const workerResponse = await fetch(workerUrl, { signal: AbortSignal.timeout(2_500) });
    const body = await workerResponse.text();
    response.statusCode = workerResponse.status;
    response.end(body);
  } catch {
    response.statusCode = 503;
    response.end(JSON.stringify({ error: "Claude-Mem worker unavailable" }));
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`PRism Claude-Mem bridge listening on http://127.0.0.1:${port}\n`);
});
