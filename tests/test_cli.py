from typer.testing import CliRunner

from prism.cli import app


def test_user_can_explain_the_demo_pr_from_the_cli() -> None:
    result = CliRunner().invoke(
        app,
        ["explain", "https://github.com/acme/ledger/pull/42", "--offline"],
    )

    assert result.exit_code == 0
    assert "Prevent duplicate ledger entries" in result.stdout
    assert "flowchart" in result.stdout
    assert "3 code references" in result.stdout
