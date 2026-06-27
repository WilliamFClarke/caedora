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

## Write tools

- `create_concept(...)`
- `update_concept(...)`
- `rename_concept(from, to)`
- `delete_concept(path)`
- `ingest_source(...)`
- `rebuild_indexes()`
- `record_query(summary, conceptPaths?)`

Every mutation preserves producer-defined YAML fields, maintains timestamps,
regenerates hierarchical indexes, and records significant operations in
`log.md`. Reserved `index.md` and `log.md` documents are protected.
