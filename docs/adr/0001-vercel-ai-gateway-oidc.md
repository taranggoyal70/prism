# ADR 0001: Use Vercel AI Gateway with OIDC

- Status: Superseded
- Date: 2026-08-23

## Context

PRISM runs as a Vercel-native Next.js application and needs structured model output in both local development and production. Storing a long-lived provider key would add secret rotation and deployment risk.

## Decision

Use the Vercel AI SDK and AI Gateway with the `openai/gpt-5.4` model. Authenticate through the project-scoped `VERCEL_OIDC_TOKEN` that Vercel provisions and refreshes. Keep `PRISM_AI_MODEL` as an environment override.

GitHub evidence is collected before generation. The model receives a bounded context and an allow-list of evidence IDs, and its structured output is rejected if it cites any unknown ID.

## Consequences

- Production does not require a stored OpenAI provider key.
- Gateway observability, budgets, routing, and model overrides stay in Vercel.
- Local development requires a recent `vercel env pull .env.local`.
- The application remains coupled to Vercel Gateway authentication while deployed on Vercel.

## Superseded on 2026-08-23

Vercel AI Gateway required a billing method that was not available during the hackathon. The final judging path instead uses a deterministic typed planner whose nodes are derived only from collected GitHub and Greptile evidence. This removes the paid runtime dependency and keeps arbitrary public pull requests functional during the demo.

Claude-Mem remains an actual runtime integration through a narrow, token-protected, read-only bridge. Codex remains the primary coding agent for the project.
