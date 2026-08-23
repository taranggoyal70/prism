from pathlib import Path

from prism.cache import ResultCache
from prism.models import PullRequestData, PullRequestRef


def test_cache_keys_include_repository_pr_number_and_head_sha(tmp_path: Path) -> None:
    cache = ResultCache(tmp_path)
    first = PullRequestData(
        ref=PullRequestRef(owner="acme", repository="ledger", number=42),
        title="First",
        base_sha="base",
        head_sha="head-a",
        url="https://github.com/acme/ledger/pull/42",
    )
    second = first.model_copy(
        update={
            "ref": PullRequestRef(owner="acme", repository="ledger", number=43),
            "head_sha": "head-b",
        }
    )

    assert cache.path_for(first) != cache.path_for(second)
    assert "pr-42" in cache.path_for(first).name
