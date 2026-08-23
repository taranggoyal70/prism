from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class PullRequestRef(BaseModel):
    owner: str = Field(min_length=1)
    repository: str = Field(min_length=1)
    number: int = Field(gt=0)

    @classmethod
    def from_url(cls, url: str) -> PullRequestRef:
        from urllib.parse import urlparse

        parsed = urlparse(url.strip())
        segments = [segment for segment in parsed.path.split("/") if segment]
        if (
            parsed.scheme != "https"
            or parsed.hostname not in {"github.com", "www.github.com"}
            or len(segments) != 4
            or segments[2] != "pull"
            or not segments[3].isdigit()
        ):
            raise ValueError(
                "Enter a full GitHub pull request URL, such as "
                "https://github.com/owner/repo/pull/123"
            )

        return cls(owner=segments[0], repository=segments[1], number=int(segments[3]))

    @field_validator("owner", "repository")
    @classmethod
    def reject_dot_segments(cls, value: str) -> str:
        if value in {".", ".."}:
            raise ValueError("GitHub owner and repository names cannot be dot segments")
        return value


class PullRequestData(BaseModel):
    ref: PullRequestRef
    title: str
    description: str = ""
    base_sha: str
    head_sha: str
    url: str
    changed_files: list[str] = Field(default_factory=list)


class Evidence(BaseModel):
    id: str
    source: Literal["github", "greptile", "claude_mem"]
    description: str
    file_path: str | None = None
    line_start: int | None = Field(default=None, gt=0)
    line_end: int | None = Field(default=None, gt=0)
    url: str | None = None


class Memory(BaseModel):
    observation_id: str
    title: str
    relevance: str


class DiagramNode(BaseModel):
    id: str
    label: str
    kind: Literal["process", "decision", "start", "end", "state", "participant"]
    evidence_ids: list[str] = Field(min_length=1)


class DiagramEdge(BaseModel):
    source: str
    target: str
    label: str = ""


class DiagramSpec(BaseModel):
    diagram_type: Literal["flowchart", "sequence", "state_machine"]
    title: str
    selection_reason: str
    summary: str
    participants: list[str] = Field(default_factory=list)
    nodes: list[DiagramNode] = Field(min_length=1)
    edges: list[DiagramEdge] = Field(default_factory=list)
    evidence: list[Evidence] = Field(min_length=1)
    memories: list[Memory] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_grounding_and_edges(self) -> DiagramSpec:
        node_ids = {node.id for node in self.nodes}
        evidence_ids = {item.id for item in self.evidence}
        unknown_evidence = {
            evidence_id
            for node in self.nodes
            for evidence_id in node.evidence_ids
            if evidence_id not in evidence_ids
        }
        unknown_nodes = {
            endpoint
            for edge in self.edges
            for endpoint in (edge.source, edge.target)
            if endpoint not in node_ids
        }
        if unknown_evidence:
            raise ValueError(f"Nodes reference unknown evidence: {sorted(unknown_evidence)}")
        if unknown_nodes:
            raise ValueError(f"Edges reference unknown nodes: {sorted(unknown_nodes)}")
        return self

    @property
    def evidence_count(self) -> int:
        return len(self.evidence)


class ExplanationResult(BaseModel):
    pull_request: PullRequestData
    diagram: DiagramSpec
    mermaid: str
    source: Literal["live", "cache", "offline fixture"]

    def export_mermaid(self, destination: Path) -> Path:
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(self.mermaid, encoding="utf-8")
        return destination
