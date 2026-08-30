"""CLI interface for Serper search tool."""

import json
import sys

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.syntax import Syntax

from serper.api import SerperClient

console = Console()


def format_organic_results(data: dict) -> None:
    """Display organic search results."""
    if "organic" not in data:
        console.print("[yellow]No organic results found[/yellow]")
        return

    table = Table(title="Search Results", show_lines=True, expand=True)
    table.add_column("#", style="dim", width=3)
    table.add_column("Title", style="cyan bold")
    table.add_column("Snippet", style="white")
    table.add_column("Link", style="blue underline")

    for i, result in enumerate(data["organic"], 1):
        title = result.get("title", "No title")
        snippet = result.get("snippet", "")[:100] + ("..." if len(result.get("snippet", "")) > 100 else "")
        link = result.get("link", "")
        table.add_row(str(i), title, snippet, link)

    console.print(table)

    # Show knowledge graph if present
    if "knowledgeGraph" in data:
        kg = data["knowledgeGraph"]
        console.print()
        console.print(Panel(
            f"[bold]{kg.get('title', '')}[/bold]\n{kg.get('type', '')}\n\n{kg.get('description', '')}",
            title="Knowledge Graph",
            border_style="green",
        ))

    # Show related searches
    if "relatedSearches" in data:
        console.print()
        related = " • ".join([rs.get("query", rs) if isinstance(rs, dict) else rs for rs in data["relatedSearches"][:5]])
        console.print(f"[dim]Related:[/dim] {related}")


def format_news_results(data: dict) -> None:
    """Display news search results."""
    if "news" not in data:
        console.print("[yellow]No news results found[/yellow]")
        return

    table = Table(title="News Results", show_lines=True, expand=True)
    table.add_column("#", style="dim", width=3)
    table.add_column("Title", style="cyan bold")
    table.add_column("Source", style="green")
    table.add_column("Date", style="yellow")
    table.add_column("Link", style="blue underline")

    for i, article in enumerate(data["news"], 1):
        title = article.get("title", "No title")
        source = article.get("source", "")
        date = article.get("date", "")
        link = article.get("link", "")
        table.add_row(str(i), title[:50], source, date, link)

    console.print(table)


def format_image_results(data: dict) -> None:
    """Display image search results."""
    if "images" not in data:
        console.print("[yellow]No image results found[/yellow]")
        return

    table = Table(title="Image Results", show_lines=True, expand=True)
    table.add_column("#", style="dim", width=3)
    table.add_column("Title", style="cyan")
    table.add_column("Source", style="green")
    table.add_column("Image URL", style="blue underline")

    for i, img in enumerate(data["images"], 1):
        title = img.get("title", "No title")[:40]
        source = img.get("source", "")[:20]
        image_url = img.get("imageUrl", "")[:60]
        table.add_row(str(i), title, source, image_url)

    console.print(table)


@click.group()
@click.version_option()
def main() -> None:
    """Google Search via Serper.dev API."""
    pass


@main.command()
@click.argument("query", required=True)
@click.option("-n", "--num", default=10, help="Number of results")
@click.option("--page", default=1, help="Page number")
@click.option("--gl", default="us", help="Country code (us, uk, de, etc.)")
@click.option("--hl", default="en", help="Language code (en, es, fr, etc.)")
@click.option("--location", default=None, help="Location for local search")
@click.option("--json", "output_json", is_flag=True, help="Output raw JSON")
def search(query: str, num: int, page: int, gl: str, hl: str, location: str | None, output_json: bool) -> None:
    """Perform a web search."""
    try:
        client = SerperClient()
        results = client.search(query, num=num, page=page, gl=gl, hl=hl, location=location)

        if output_json:
            syntax = Syntax(json.dumps(results, indent=2), "json", theme="monokai")
            console.print(syntax)
        else:
            format_organic_results(results)
    except ValueError as e:
        console.print(f"[red]Error: {e}[/red]")
        sys.exit(1)
    except Exception as e:
        console.print(f"[red]API Error: {e}[/red]")
        sys.exit(1)


@main.command()
@click.argument("query", required=True)
@click.option("-n", "--num", default=10, help="Number of results")
@click.option("--gl", default="us", help="Country code")
@click.option("--hl", default="en", help="Language code")
@click.option("--json", "output_json", is_flag=True, help="Output raw JSON")
def news(query: str, num: int, gl: str, hl: str, output_json: bool) -> None:
    """Search for news articles."""
    try:
        client = SerperClient()
        results = client.news(query, num=num, gl=gl, hl=hl)

        if output_json:
            syntax = Syntax(json.dumps(results, indent=2), "json", theme="monokai")
            console.print(syntax)
        else:
            format_news_results(results)
    except ValueError as e:
        console.print(f"[red]Error: {e}[/red]")
        sys.exit(1)
    except Exception as e:
        console.print(f"[red]API Error: {e}[/red]")
        sys.exit(1)


@main.command()
@click.argument("query", required=True)
@click.option("-n", "--num", default=10, help="Number of results")
@click.option("--gl", default="us", help="Country code")
@click.option("--hl", default="en", help="Language code")
@click.option("--json", "output_json", is_flag=True, help="Output raw JSON")
def images(query: str, num: int, gl: str, hl: str, output_json: bool) -> None:
    """Search for images."""
    try:
        client = SerperClient()
        results = client.images(query, num=num, gl=gl, hl=hl)

        if output_json:
            syntax = Syntax(json.dumps(results, indent=2), "json", theme="monokai")
            console.print(syntax)
        else:
            format_image_results(results)
    except ValueError as e:
        console.print(f"[red]Error: {e}[/red]")
        sys.exit(1)
    except Exception as e:
        console.print(f"[red]API Error: {e}[/red]")
        sys.exit(1)


@main.command()
@click.argument("query", required=True)
@click.option("-n", "--num", default=10, help="Number of results")
@click.option("--gl", default="us", help="Country code")
@click.option("--hl", default="en", help="Language code")
@click.option("--json", "output_json", is_flag=True, help="Output raw JSON")
def videos(query: str, num: int, gl: str, hl: str, output_json: bool) -> None:
    """Search for videos."""
    try:
        client = SerperClient()
        results = client.videos(query, num=num, gl=gl, hl=hl)

        if output_json:
            syntax = Syntax(json.dumps(results, indent=2), "json", theme="monokai")
            console.print(syntax)
        else:
            console.print_json(results)
    except ValueError as e:
        console.print(f"[red]Error: {e}[/red]")
        sys.exit(1)
    except Exception as e:
        console.print(f"[red]API Error: {e}[/red]")
        sys.exit(1)


if __name__ == "__main__":
    main()
