# Domain docs

PRISM is a single-context product. Before changing domain behavior, read `CONTEXT.md` when it exists and any relevant decisions under `docs/adr/`.

Use the glossary's established terms in code, tests, issues, and architecture notes. If a proposed change conflicts with an ADR, surface the conflict explicitly instead of silently overriding it.

Expected layout:

```text
/
├── CONTEXT.md
├── docs/adr/
└── app, components, lib
```

Missing domain documents are not blockers. They are created only when the project has a durable term or decision worth recording.
