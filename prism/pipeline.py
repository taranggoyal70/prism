from __future__ import annotations

import json
from pathlib import Path

from prism.cache import ResultCache
from prism.models import DiagramSpec, ExplanationResult, PullRequestData, PullRequestRef
from prism.rendering.mermaid import render_mermaid

DEMO_FIXTURE = Path(__file__).parent.parent / "fixtures" / "demo" / "acme-ledger-pr-42.json"


def explain_pull_request(
    pr_url: str,
    *,
    offline: bool = False,
    cache_dir: Path = Path(".cache/prism"),
) -> ExplanationResult:
    ref = PullRequestRef.from_url(pr_url)
    if not offline:
        raise RuntimeError(
            "Live mode requires configured GitHub, Greptile, Claude-Mem, and OpenAI adapters. "
            "Run with offline=True for the bundled demo."
        )

    payload = json.loads(DEMO_FIXTURE.read_text(encoding="utf-8"))
    pull_request = PullRequestData.model_validate(payload["pull_request"])
    if pull_request.ref != ref:
        raise ValueError(
            "The bundled offline fixture is for https://github.com/acme/ledger/pull/42."
        )

    diagram = DiagramSpec.model_validate(payload["diagram"])
    result = ExplanationResult(
        pull_request=pull_request,
        diagram=diagram,
        mermaid=render_mermaid(diagram),
        source="offline fixture",
    )
    ResultCache(cache_dir).put(result)
    return result
