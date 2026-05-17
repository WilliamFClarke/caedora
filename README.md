# Caedora

[caedora.app](https://caedora.app) is a privacy-first personal markdown vault for notes, records, and life admin. Your vault lives in storage you control: either a local folder opened through the File System Access API or a GitHub repository accessed with your own personal access token. Caedora does not store vault content on its servers.

The desktop app includes **Argus**, a local-first assistant for working with the open vault, and [`packages/caedora-mcp`](./packages/caedora-mcp) exposes vault data to MCP-aware AI clients.

## Features

- Markdown-first notes with a rich TipTap editor.
- Local-folder and GitHub-backed vault providers behind one storage interface.
- Automatic vault indexing, templates, pinned notes, and git-backed history.
- Desktop app for offline-capable local vault work.
- Optional MCP server for AI clients that need vault-aware read/write tools.

## Privacy model

- Vault content stays in the user's own folder or GitHub repository.
- Local folder handles and GitHub credentials are persisted in IndexedDB, not on Caedora servers.
- Desktop cloud-AI API keys are stored with OS-backed secure storage.
- Any future feature that requires server-side storage of user content is out of scope for the core product.

## Run locally

Requirements:

- Node.js 20+
- npm

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For the Electron desktop shell:

```bash
npm run desktop:dev
```

To build a packaged desktop app locally:

```bash
npm run desktop:dist
```

## Checks

```bash
npx tsc --noEmit
npm run lint
npm run test:e2e
```

Desktop smoke tests are run separately against packaged binaries with:

```bash
npm run test:desktop
```

## Repository layout

- `app/` - Next.js routes and product pages.
- `components/` - UI, editor, assistant, and vault components.
- `lib/storage/` - vault provider implementations.
- `electron/` - desktop shell and preload bridge.
- `packages/caedora-mcp/` - MCP server package.

## License

Caedora is licensed under the Mozilla Public License 2.0 (`MPL-2.0`). See [LICENSE](./LICENSE).

The `Caedora` name and logo are project trademarks. See [TRADEMARKS.md](./TRADEMARKS.md).
