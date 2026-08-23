# PRism

PRism turns a GitHub pull request into an evidence-backed visual explanation whose claims trace back to the exact reviewed code.

## Vercel application

The product interface is a Vercel-native Next.js App Router application. Its public explanation API validates the request and structured diagram data on the server, while Mermaid rendering and diagram controls stay in a focused client component.

- Next.js 16 and React 19
- TypeScript and Zod
- Live GitHub pull request and review-comment ingestion
- Deterministic diagram planning with no paid runtime dependency
- Claude-Mem warm-boot retrieval through a token-protected bridge
- Greptile review findings promoted to first-class evidence
- Mermaid flowchart, sequence, and state-machine rendering
- Vitest and Testing Library
- Python reference pipeline retained under `prism/`

## Run locally

```bash
npm install
npx vercel link
npx vercel env pull .env.local --yes
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and run the prefilled public pull request. For a network-free fallback, use `https://github.com/acme/ledger/pull/42`.

`GITHUB_TOKEN` is recommended and required for private repositories. No model-provider key is required. Claude-Mem is optional locally and the prepared fixture remains available if any external service is unavailable.

## Live pipeline

1. Validate the GitHub pull request URL.
2. Fetch metadata, up to 100 changed files, patches, and review comments from GitHub.
3. Build immutable evidence links pinned to the PR head SHA.
4. Recognize Greptile-authored review comments as Greptile evidence when present.
5. Recall relevant Claude-Mem observations before mapping the change.
6. Select a flowchart, sequence diagram, or state machine from the change shape.
7. Build a typed diagram whose every node cites collected evidence.
8. Render the explanation, sponsor provenance, memory timeline, and exportable brief.

External content is bounded and treated as untrusted data. The live path has no paid AI dependency, so a judge can paste any public PR even when credits, provider billing, or model APIs are unavailable. Codex is the primary coding agent used to build and verify the product.

## Claude-Mem bridge

The official Claude-Mem worker is local-first. `scripts/claude-mem-bridge.mjs` exposes only the read-only observations endpoint, locks retrieval to one project, and requires a bearer token. A short-lived tunnel can connect the Vercel function to the bridge during the live demo without exposing the worker UI, settings, or mutation endpoints.

## Quality checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

The Python reference tests remain available with `uv run pytest`.

## Deploy to Vercel

The repository is linked to the `prism-pr` project. Deploy from the repository root with:

```bash
npx vercel deploy --prod --yes
```

Vercel detects the Next.js framework automatically; `vercel.json` also pins the framework preset.

## Current scope

The production path includes live GitHub ingestion, Greptile comment discovery, Claude-Mem recall, deterministic grounded diagram planning, interactive rendering, explicit provenance, error handling, an evidence-brief export, Mermaid export, and a deterministic offline fixture.
