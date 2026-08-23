# PRism submission copy

## One-line description

PRism turns pull requests into evidence-backed living diagrams that remember how and why software evolved.

## Project description

Pull requests are optimized for inspecting lines, not understanding systems. A reviewer must reconstruct behavior across files, comments, earlier decisions, and agent sessions, then the next reviewer repeats the same work.

PRism turns any public GitHub pull request into a projector-ready visual explanation. It fetches live PR metadata, patches, and review comments; pins evidence to the pull request's immutable head SHA; promotes Greptile findings to first-class review evidence; recalls relevant Claude-Mem observations; selects a flowchart, sequence diagram, or state machine; and renders a validated evidence map whose nodes all trace back to collected proof.

The live judging path has no paid model dependency. A typed deterministic planner keeps arbitrary public PRs functional during billing or provider outages, while an offline fixture provides a final network-free fallback. Reviewers can export a portable evidence brief containing the explanation, code links, memory IDs, and Mermaid source.

OpenAI Codex was the primary coding agent for architecture, implementation, tests, debugging, deployment, and documentation.

## Sponsor integrations

- **OpenAI Codex:** Primary coding agent used throughout the build.
- **Claude-Mem:** Official worker stores structured observations from the Codex build and warm-boots the visual explanation through a token-protected read-only bridge.
- **Greptile:** Greptile-authored GitHub review comments become distinctly labeled evidence rather than unverified prose.
- **Vercel:** Hosts the Next.js application, server API, deployment environment, and public demo.

## Links

- Live project: https://prism-pr.vercel.app
- Public repository: https://github.com/taranggoyal70/prism
- Prepared live pull request: https://github.com/taranggoyal70/prism/pull/1

## Technical highlights

- Next.js 16, React 19, TypeScript, Zod, and Mermaid
- Concurrent GitHub metadata, file, comment, and memory retrieval
- Immutable code links pinned to the PR head SHA
- Bounded handling of untrusted patches and review text
- Flowchart, sequence, and state-machine selection
- Graph and evidence-reference validation
- Token-protected read-only Claude-Mem bridge
- Evidence brief and Mermaid exports
- 15 web tests, 8 Python tests, strict typechecking, zero-warning lint, and production build verification

## Claude-Mem prize fit

PRism combines three sponsor directions:

1. **Warm boot:** explanations start with prior architecture decisions.
2. **Give the skills a face:** memory appears as a navigable timeline beside the code evidence it explains.
3. **Memory as a speed play:** reviewers receive relevant decisions before mapping instead of spending initial turns rediscovering context.

## Testing instructions

1. Open the live project.
2. Leave the prepared public PR URL in the input.
3. Click **Explain this PR**.
4. Inspect the sequence diagram, five pinned GitHub references, and Claude-Mem timeline.
5. Click **Export evidence brief** to download the review artifact.
6. For the network-free fallback, use `https://github.com/acme/ledger/pull/42`.
