# caedora-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server for
[Caedora](https://github.com/WilliamFClarke/caedora) vaults. Gives
any MCP-aware AI (Claude Code, Claude Desktop, Cursor, etc.) **vault-aware**
search and write tools that preserve the app's conventions — H1 ↔ filename,
YAML frontmatter round-trip, tag normalisation.

## Quick start

```bash
# Against a local folder
npx caedora-mcp --vault /path/to/my-vault

# Against a GitHub repo
GITHUB_TOKEN=ghp_xxx npx caedora-mcp --github you/your-vault
```

Add it to your MCP client config (Claude Desktop shown):

```json
{
  "mcpServers": {
    "caedora": {
      "command": "npx",
      "args": ["-y", "caedora-mcp", "--vault", "/path/to/your-vault"]
    }
  }
}
```

## Tools

**Read**
- `list_notes(folder?)` — every `.md` under the vault (optionally scoped).
- `read_note(path)` — returns `{ path, frontmatter, body }`.
- `search_notes(query, tag?, limit?)` — ranked full-text hits with snippets.
- `grep_notes(regex, flags?, limit?)` — raw regex matches with line numbers.
- `list_tags()` — all tags with usage counts.
- `notes_by_tag(tag)` — notes carrying a specific tag (exact, normalised).

**Write** (disabled when run with `--read-only`)
- `create_note(path, body, tags?)` — auto-prepends an H1 from the filename;
  writes frontmatter; fails if the path exists.
- `update_note(path, body?, tags?, mergeTags?)` — round-trips unknown
  frontmatter keys; replaces or merges tags.
- `rename_note(from, to, syncH1?)` — moves the file; optionally rewrites the
  H1 to match the new filename.
- `delete_note(path)` — removes a note or folder.

## License

MIT.
