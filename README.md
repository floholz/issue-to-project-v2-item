# Create project V2 item for opened Issue

[![GitHub Super-Linter](https://github.com/actions/typescript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/typescript-action/actions/workflows/ci.yml/badge.svg)

## Usage

To include the action in a workflow in another repository, you can use the
`uses` syntax with the `@` symbol to reference a specific branch, tag, or commit
hash.

```yaml
name: Create project V2 item for opened issue

on:
  issues:
    types:
      - opened

jobs:
  issue-to-project:
    name: Create project item from issue
    runs-on: ubuntu-latest
    steps:
      - uses: floholz/issue-to-project-v2-item@RELEASE_VERSION
        with:          
          # Auth token used to fetch the project and add the item to. 
          # The token needs to have at least ['project'] scope.
          github-token: ${{ secrets.ISSUE_TO_PROJECT_PAT }}
          
          # The URL of the project the item should be added to.
          project-url: https://github.com/orgs/<orgName>/projects/<projectNumber>

```

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
