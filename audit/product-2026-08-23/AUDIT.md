# PRism Product Audit

Audit date: 2026-08-23
Environment: live Vercel deployment at `https://prism-pr.vercel.app`
Browser: the user's connected Google Chrome extension session

## Verdict

PRism has a memorable visual identity and a clean interaction shell, but it is not judge-ready as a trustworthy product. The central result currently visualizes files in API order rather than explaining behavior. That breaks the core promise and makes the polished evidence UI feel more authoritative than the underlying analysis warrants.

## Flow health

| Step | Health | Finding |
| --- | --- | --- |
| Landing and PR entry | At risk | Clear and distinctive, but the primary task starts below the fold on desktop and mobile. |
| Loading | Mixed | Immediate feedback, but the previous state remains visible and there is no meaningful progress model. |
| Behavior map | Critical | The prepared PR becomes a sequence of filenames such as `DEMO.md`, `SUBMISSION.md`, and `globals.css`, not a behavioral system model. |
| Evidence | Critical | Evidence proves file churn, not the semantic claims made by the diagram. Internal IDs leak into the main visualization. |
| Memory | At risk | The timeline is polished, but a global PRism project override can show unrelated PRism memories for other repositories. |
| Error recovery | Healthy | Invalid input receives precise, inline guidance and returns to a usable state. |
| Mobile entry | Mixed | Reflow is clean with no horizontal overflow, but the task is still pushed below the fold. |
| Mobile result | Critical | The diagram is too small to read inside a large empty canvas. |

## What works

- Strong, non-template visual language with excellent contrast and clear section ownership.
- Good semantic structure, labeled input, logical keyboard order, and visible focus treatment on primary controls.
- Fast live response, direct source links, export affordances, and clear inline error handling.
- The evidence-plus-memory concept is differentiated and potentially useful.

## Highest-priority fixes

### P0 - Product truth

1. Rank changed symbols and semantic patch content. Exclude docs, styles, assets, generated files, and lockfiles from primary nodes unless they are behaviorally relevant.
2. Generate nodes from changed behavior, not filenames. Keep raw evidence IDs in the evidence rail rather than the diagram.
3. Scope Claude-Mem retrieval to the analyzed repository and pull request. Hide the memory section when no relevant observations exist.
4. Use a demo PR with three to five meaningful code changes and a real Greptile review, or do not foreground a visible `Greptile 0` count.

### P1 - Comprehension and demo strength

1. Rewrite the summary as two or three structured sentences. Preserve bullets instead of flattening PR body text into a run-on paragraph.
2. Fit the diagram canvas to its content, remove duplicated sequence labels, and use a responsive orientation for narrow screens.
3. Move the PR input and action above the fold by reducing hero height on desktop and mobile.
4. Replace or visibly dim stale results during loading and state the current analysis stage.

### P2 - Polish and accessibility

1. Give memory a balanced full-width section or a layout with meaningful content in both columns.
2. Increase small monospaced metadata text and verify all touch targets at 44 by 44 CSS pixels or larger.
3. Provide an accessible text summary for the diagram so assistive technology does not have to interpret duplicated SVG labels.

## Evidence

- `01-start.png` - fresh desktop landing state
- `02-loading.png` - live analysis state
- `03-result-map.png` - generated behavior map
- `04-proof-memory.png` - summary, evidence, and memory transition
- `05-memory.png` - memory timeline
- `06-error.png` - invalid pull-request recovery
- `07-mobile-start.png` - mobile landing state at 390 by 844
- `08-mobile-result.png` - mobile result at 390 by 844

## Audit limits

This audit covered the live primary flow, prepared demo PR, invalid input recovery, responsive behavior, DOM semantics, and keyboard focus order. It did not include a full screen-reader pass, cross-browser matrix, slow-network simulation, or destructive export testing.
