from __future__ import annotations

import hashlib
from pathlib import Path

from prism.models import ExplanationResult, PullRequestData


class ResultCache:
    def __init__(self, directory: Path) -> None:
        self.directory = directory

    def path_for(self, pull_request: PullRequestData) -> Path:
        raw_key = (
            f"{pull_request.ref.owner}/{pull_request.ref.repository}/"
            f"{pull_request.ref.number}/{pull_request.head_sha}"
        )
        digest = hashlib.sha256(raw_key.encode()).hexdigest()[:16]
        filename = (
            f"{pull_request.ref.owner}-{pull_request.ref.repository}-"
            f"pr-{pull_request.ref.number}-{digest}.json"
        )
        return self.directory / filename

    def put(self, result: ExplanationResult) -> Path:
        path = self.path_for(result.pull_request)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(result.model_dump_json(indent=2), encoding="utf-8")
        return path

    def get(self, pull_request: PullRequestData) -> ExplanationResult | None:
        path = self.path_for(pull_request)
        if not path.exists():
            return None
        cached = ExplanationResult.model_validate_json(path.read_text(encoding="utf-8"))
        return cached.model_copy(update={"source": "cache"})
