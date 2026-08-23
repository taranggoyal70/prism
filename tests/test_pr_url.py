import pytest

from prism.models import PullRequestRef


def test_user_can_parse_a_github_pull_request_url() -> None:
    ref = PullRequestRef.from_url("https://github.com/openai/openai-python/pull/123")

    assert ref.owner == "openai"
    assert ref.repository == "openai-python"
    assert ref.number == 123


@pytest.mark.parametrize(
    "url",
    [
        "https://gitlab.com/openai/openai-python/pull/123",
        "https://github.com/openai/openai-python/issues/123",
        "not-a-url",
    ],
)
def test_user_gets_a_clear_error_for_an_invalid_pr_url(url: str) -> None:
    with pytest.raises(ValueError, match="GitHub pull request URL"):
        PullRequestRef.from_url(url)
