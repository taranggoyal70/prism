# PRism three-minute demo

## Before the room

- Keep `https://prism-pr.vercel.app` open with the prepared PR prefilled.
- Keep `https://github.com/taranggoyal70/prism/pull/1` open in a second tab.
- Confirm the Claude-Mem worker, protected bridge, and tunnel are running.
- If the network fails, paste `https://github.com/acme/ledger/pull/42` for the offline fallback.

## 0:00 to 0:25 - Problem

"A pull request shows lines, not the system those lines create. Reviewers spend their first ten minutes rebuilding context, and the next reviewer repeats the same work. PRism turns a PR into a living evidence map that remembers why the system changed."

## 0:25 to 0:50 - Live input

Show that the input contains PRism's own public pull request.

"This is not a canned repository. It is the pull request that built this product with Codex. I will explain it live."

Click **Explain this PR**.

## 0:50 to 1:35 - Evidence map

Point to the selected sequence diagram and the evidence markers on every node.

"PRism fetched 46 changed files, recognized that the change crosses application, component, integration, and worker boundaries, and selected a sequence diagram. Every node carries an evidence ID. Click any proof and GitHub opens the exact code range at the immutable head SHA. The system cannot invent an unsupported node because uncollected evidence IDs fail validation."

Point to the GitHub, Greptile, and Claude-Mem provenance strip.

## 1:35 to 2:15 - Memory moment

Scroll to **Claude-Mem timeline**.

"Before mapping the change, PRism warm-booted from Claude-Mem. These are real observations generated while Codex built the project: why we removed paid runtime dependencies, how the protected memory bridge works, and how Greptile findings become first-class evidence. The next session starts with decisions, not rediscovery."

"This gives Claude-Mem's CLI-shaped memory a face and uses recall as a speed play."

## 2:15 to 2:40 - Reliability and artifact

Click **Export evidence brief**.

"The explanation becomes a portable review brief with the summary, immutable links, memory IDs, and Mermaid source. The live path needs no paid model API, and the prepared offline fixture keeps the demo working if every external service fails."

## 2:40 to 3:00 - Close

"PRism turns code review from rediscovery into compounding organizational memory. GitHub proves what changed, Greptile adds repository-aware review evidence, Claude-Mem remembers why, Vercel makes it instantly shareable, and Codex built the complete system."

"Pull requests should not die as diffs. They should become the living map of how software evolved."

## Q&A anchors

### Where is the AI?

Codex was the primary coding agent and produced the system end to end. Claude-Mem's observer turns agent activity into structured, searchable observations. The live diagram planner is deliberately deterministic so judging does not depend on billing or provider availability.

### Is the memory real?

Yes. The displayed observation IDs come from the official local Claude-Mem worker through a token-protected read-only bridge. Stop the tunnel after judging.

### What does Greptile do?

PRism recognizes Greptile-authored review comments and promotes them to distinct evidence. When a PR has no Greptile finding, the interface truthfully displays zero.

### What is technically difficult?

The hard part is trustworthy composition: concurrent GitHub ingestion, immutable line evidence, bounded untrusted patches, diagram-type selection, graph validation, evidence allow-listing, memory recall, secure local-to-cloud bridging, interactive rendering, and deterministic fallback behavior.

### What becomes a company?

PRism can become the memory and explanation layer for every engineering change. Teams can search architecture by behavior, onboard from living change maps, and preserve decisions that are currently scattered across diffs, reviews, chats, and agent sessions.
