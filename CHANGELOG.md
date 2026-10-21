# Changelog

All notable Caedora release changes should be recorded here before tagging.

## [Unreleased]

- Added portfolio features to dashboards: several values on one chart, reference lines and bands, a target marker on progress bars, `share()`, `change()` and `change_pct()` over a period, `drawdown()`, `rebase: true`, green and red for gains and losses with `highlight` for rows and bars, treemaps, waterfalls and joining two Datasets on a column.
- Descending table and list sorts now keep rows with equal values in file order.
- Dashboards now show how old their data is, such as "Data from 2 hours ago", from the oldest `generated.at` of the Datasets they read, with a warning when a Dataset is past its `stale_after` time.
- Added Dataset tools to caedora-mcp: `read_dataset`, `query_dataset` (using the dashboard expression language), `upsert_rows` and `update_row`, which check values against the schema and change only the cells involved, and `log_entry`. AGENTS.md files are now served as MCP resources and an `agent_instructions` prompt.
- Added `caedora-mcp lint --bundle <path>`, which exits non zero on invalid frontmatter, broken links or Dataset problems, and `caedora-mcp rebuild-indexes --bundle <path>`.
- Fixed a missing blank line between dates when a new day's entry is added to `log.md`.
- Added `edit` to dashboard tables, so a row can set a column such as `status` from the dashboard. Only that cell is rewritten, the row is found by the Dataset's key, and on GitHub each change is its own commit with a message naming the row.
- Fixed saves to GitHub vaults failing when another writer had committed to the same file. Caedora now merges changes to different lines and shows a "Changed on GitHub" banner with Reload and Keep mine when they overlap.
- Open notes and dashboards in GitHub vaults now update by themselves when another writer commits a new version of the note or of a Dataset the dashboard reads.
- Added OKF folder export for browser vaults, alongside the JSON backup.
- Added full text search across note content with a Ctrl/Cmd+K dialog, highlighted snippets and `tag:` and `in:` filters.

## [0.1.0]

- Added optional Clerk-backed accounts while keeping Caedora usable without an account.
- Added account settings as a modal section with Account, GitHub, and Pricing screens.
- Added GitHub vault access from account settings without requiring a Caedora account.
- Added saved GitHub repository connections in account settings.
- Added Windows and Linux desktop download links backed by GitHub Release assets.
- Improved desktop editor toolbar collapse sizing on Windows.
- Initial public desktop release candidate.
