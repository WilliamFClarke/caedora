# caedora-mcp

An MCP server for reading, searching, validating, and maintaining Open Knowledge
Format bundles. It exposes structured concept metadata, cross-links, backlinks,
source ingestion, progressive indexes, and bundle logs to MCP-aware agents.

## Run

```bash
npx caedora-mcp --bundle /path/to/knowledge-bundle
```

The legacy `--vault` flag remains an alias for `--bundle`.

For GitHub-hosted bundles:

```bash
GITHUB_TOKEN=github_pat_xxx npx caedora-mcp --github owner/repository
```

Add `--read-only` to disable all write tools.

## Commands for scripts and CI

The same binary runs one off checks without starting the server:

```bash
npx caedora-mcp lint --bundle /path/to/vault            # exit 1 on problems
npx caedora-mcp lint --bundle /path/to/vault --json     # the full report
npx caedora-mcp rebuild-indexes --bundle /path/to/vault
```

`lint` exits with code 1 when any concept has invalid frontmatter, a link
points at a file that does not exist, or a Dataset's table does not match its
schema. Other warnings, such as a source without a `resource`, are printed but
do not fail it. Both commands also take `--github owner/repo`.

## Connect an MCP client

The server speaks stdio, so any MCP-aware client uses the same config block:

```json
{
  "mcpServers": {
    "caedora": {
      "command": "npx",
      "args": ["-y", "caedora-mcp", "--bundle", "/absolute/path/to/your-vault"]
    }
  }
}
```

Config file locations:

- **Claude Desktop** — `~/Library/Application Support/Claude/claude_desktop_config.json`
  (macOS) / `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
- **Cursor** — `~/.cursor/mcp.json`
- **Gemini CLI** — `~/.gemini/settings.json`
- **Claude Code** — already has file tools; run `claude` from the vault folder, and
  optionally add this server for indexed search, graph traversal, and conformant writes.

## Read tools

- `list_concepts(folder?, type?)`
- `read_concept(path)`
- `search_concepts(query, tag?, type?, limit?)`
- `grep_concepts(regex, flags?, limit?)`
- `list_tags()`
- `list_types()`
- `concepts_by_tag(tag)`
- `concept_graph(path?)`
- `lint_bundle(recordLint?)`
- `read_dataset(path)` returns a Dataset's key, columns, `generated` stamp and
  typed rows.
- `query_dataset(path, where?, value?, group_by?)` filters and aggregates with
  the expressions Caedora dashboards use, such as
  `where: "status = 'proposed'"`, `value: "sum(value)"` and `group_by: "sector"`.

## Write tools

- `create_concept(...)`
- `update_concept(...)`
- `rename_concept(from, to)`
- `delete_concept(path)`
- `ingest_source(...)`
- `rebuild_indexes()`
- `record_query(summary, conceptPaths?)`
- `upsert_rows(path, rows)` updates rows whose key already exists, in the cells
  given, and adds the rest to the end of the table.
- `update_row(path, key, fields)` sets fields of the one row whose key matches.
- `log_entry(kind, text, scope?)` adds a line to `log.md` under today's date,
  as `* **kind**: text`.

Dataset writes check every value against the `dataset` schema before anything
is written, refuse a Dataset with no `key` or a key that matches more than one
row, and change only the cells involved, so the table keeps its spacing and the
diff shows just those rows. They stamp `generated` and leave the rest of the
file alone.

## Agent instructions

Each `AGENTS.md` in the vault is a resource at `caedora://agents/<path>`, such
as `caedora://agents/strategy/AGENTS.md`. The `agent_instructions` prompt takes
an optional `path` and returns the root `AGENTS.md` followed by every folder
`AGENTS.md` above that path, so an agent can load the rules that apply before
it edits.

Every mutation preserves producer-defined YAML fields, records OKF v0.2
`generated: { by, at }` provenance (pass `generatedBy` to name the agent),
regenerates hierarchical indexes, and records significant operations in
`log.md`. Reserved `index.md` and `log.md` documents are protected.
