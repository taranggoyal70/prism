from pathlib import Path

from prism.pipeline import explain_pull_request


def test_user_can_explain_a_pr_end_to_end_from_the_offline_fixture(tmp_path: Path) -> None:
    result = explain_pull_request(
        "https://github.com/acme/ledger/pull/42",
        offline=True,
        cache_dir=tmp_path,
    )

    assert result.pull_request.title == "Prevent duplicate ledger entries"
    assert result.diagram.diagram_type == "flowchart"
    assert result.diagram.evidence_count >= 3
    assert result.diagram.memories
    assert "flowchart TD" in result.mermaid
    assert result.source == "offline fixture"


def test_offline_explanation_can_be_exported_as_mermaid(tmp_path: Path) -> None:
    result = explain_pull_request(
        "https://github.com/acme/ledger/pull/42",
        offline=True,
        cache_dir=tmp_path,
    )

    artifact = result.export_mermaid(tmp_path / "ledger-pr-42.mmd")

    assert artifact.read_text() == result.mermaid
