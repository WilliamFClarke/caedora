# Changelog

All notable Caedora release changes should be recorded here before tagging.

## [Unreleased]

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
