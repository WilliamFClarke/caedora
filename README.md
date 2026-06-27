# Caedora

[caedora.app](https://caedora.app) is a privacy-first editor and agent workspace
for Open Knowledge Format (OKF) bundles. A bundle is a portable directory of
typed, interlinked Markdown concepts with YAML metadata, progressive-disclosure
indexes, and chronological logs.

Bundle content stays in storage the user controls: a local folder or the user's
own GitHub repository. Caedora does not store bundle content on its servers.

## OKF support

- OKF v0.1 concept metadata: `type`, `title`, `description`, `resource`, `tags`,
  and `timestamp`.
- Arbitrary producer-defined YAML fields preserved during round trips.
- Path-based concept IDs and bundle-relative Markdown links.
- Automatic hierarchical `index.md` generation.
- Managed `log.md` history for structural, ingest, query, and lint operations.
- Live conformance checks, metadata search, link graph, and backlinks.
- Invalid external edits remain readable, are flagged in the editor, and
  cannot be saved from Caedora until repaired.
- Source-first ingest guidance based on the LLM Wiki pattern.
- Concept-aware Argus desktop tools and [`caedora-mcp`](./packages/caedora-mcp).

The implementation and design mapping are documented in
[`docs/open-knowledge-format.md`](./docs/open-knowledge-format.md).

## Privacy model

- Bundle content remains in the user's local folder or GitHub repository.
- Local handles and GitHub credentials are persisted in IndexedDB, not on
  Caedora servers.
- Desktop cloud-AI API keys use OS-backed secure storage.
- The core product does not require server-side storage of user content.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For the Electron desktop shell:

```bash
npm run desktop:dev
```

## MCP server

The [`caedora-mcp`](./packages/caedora-mcp) workspace shares the root install — run
`npm install` at the repo root first, or both its build and the Next build fail with
`Cannot find module 'yaml'`.

```bash
npm run build --workspace packages/caedora-mcp   # compile to dist/
npm run test:unit                                # workspace unit tests
npm publish --workspace packages/caedora-mcp     # publish to npm (maintainers)
```

## Checks

```bash
npm run test:unit
npx tsc --noEmit
npm run lint
npm run build
npm run test:e2e
```

## License

Caedora is licensed under the Mozilla Public License 2.0 (`MPL-2.0`). See
[LICENSE](./LICENSE). The `Caedora` name and logo are project trademarks; see
[TRADEMARKS.md](./TRADEMARKS.md).
