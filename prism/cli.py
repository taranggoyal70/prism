from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer
from rich.console import Console
from rich.panel import Panel

from prism.config import get_settings
from prism.pipeline import explain_pull_request

app = typer.Typer(no_args_is_help=True, help="Explain GitHub pull requests with grounded diagrams.")
console = Console()


@app.callback()
def main() -> None:
    """PRism command line interface."""


@app.command()
def explain(
    pr_url: Annotated[str, typer.Argument(help="Full GitHub pull request URL")],
    offline: Annotated[
        bool,
        typer.Option("--offline", help="Use the bundled, network-free demo fixture."),
    ] = False,
    output: Annotated[
        Path | None,
        typer.Option("--output", "-o", help="Write Mermaid source to this path."),
    ] = None,
) -> None:
    """Explain one pull request."""
    settings = get_settings()
    try:
        result = explain_pull_request(
            pr_url,
            offline=offline,
            cache_dir=settings.prism_cache_dir,
        )
    except (ValueError, RuntimeError) as error:
        console.print(f"[bold red]Could not explain this PR:[/bold red] {error}")
        raise typer.Exit(code=1) from error

    diagram = result.diagram
    console.print(
        Panel.fit(
            f"[bold]{result.pull_request.title}[/bold]\n"
            f"{diagram.summary}\n\n"
            f"[blue]{diagram.diagram_type}[/blue] · {diagram.evidence_count} code references · "
            f"{len(diagram.memories)} memory",
            title=f"{result.pull_request.ref.owner}/{result.pull_request.ref.repository} "
            f"#{result.pull_request.ref.number}",
            subtitle=result.source,
        )
    )
    console.print(diagram.selection_reason)

    if output:
        result.export_mermaid(output)
        console.print(f"Mermaid exported to [bold]{output}[/bold]")


if __name__ == "__main__":
    app()
