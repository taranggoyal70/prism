# PRism visual direction

## Subject and job

PRism is a review-room instrument for engineers explaining a pull request to a team. The page has one job: turn a pasted PR URL into a trustworthy visual story whose claims can be traced to code.

## Direction: review light-table

PRism should feel like an engineering review surface under a cool inspection light. The faint 32-pixel grid is functional: it makes the result feel measured and spatial without becoming a decorative developer dashboard.

## Design system

- **Void** `#07111F` - query console and maximum-contrast text
- **Ice** `#F8FBFD` - primary evidence canvas
- **Fog** `#E9F0F5` - review-room background
- **Evidence beam** `#1648FF` - current code and primary action
- **Memory violet** `#7652DB` - historical context only
- **Signal amber** `#FFB000` - focus, scanning, and inferred state
- **Proof green** `#087F5B` - successfully validated sources

Space Grotesk carries the assertive display voice, Manrope handles long explanations, and IBM Plex Mono marks paths, evidence IDs, and system state. All three are self-hosted by `next/font`.

## Layout

The input is a compact review docket above a wide evidence canvas. Results follow the reading order a reviewer uses: orientation, system behavior, explanation, proof.

```text
PRism / LIVING PR EXPLANATIONS          DEMO READY
-----------------------------------------------------
Turn the diff into a system you can see.
                         [code / memory source legend]

[ GitHub PR URL                        ][Explain PR]

[ repo / PR ]                      [validated source]
-----------------------------------------------------
|                                                 |
|        zoomable Mermaid evidence map            |
|                                                 |
-----------------------------------------------------
Plain-English change | Code evidence + project memory
```

## Signature

Every important diagram node carries an evidence marker. Current code uses beam blue; remembered decisions use violet. The result acts as an evidence rail: map above, pinned proof below, with the same provenance vocabulary throughout.

## Interaction and restraint

One short reveal transitions from input to result. There are no floating glass cards, decorative gradients, or dashboard statistics. Keyboard focus is explicit, motion respects reduced-motion preferences, and the diagram remains the largest object on desktop and mobile. Errors state what failed and how to continue.
