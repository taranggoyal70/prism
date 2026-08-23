# Issue tracker: GitHub

Issues and PRDs for this repository live as GitHub issues. Use the `gh` CLI for all operations after the repository has a GitHub remote.

## Conventions

- Create: `gh issue create --title "..." --body "..."`
- Read: `gh issue view <number> --comments`
- List: `gh issue list --state open`
- Comment: `gh issue comment <number> --body "..."`
- Label: `gh issue edit <number> --add-label "..."`
- Close: `gh issue close <number> --comment "..."`

Infer the repository from `git remote -v`. If no remote exists, do not publish issues until the repository is connected.

## Skill mappings

When a skill says to publish to the issue tracker, create a GitHub issue. When it says to fetch a ticket, use `gh issue view <number> --comments`.
