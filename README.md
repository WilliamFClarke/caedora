# Caedora

[caedora.app](https://caedora.app) — a privacy-first personal markdown vault for notes, records, and life admin. Vault content stays in the user's own local folder or GitHub repository, and the desktop app includes Argus (AI Assistant), a local-first assistant for working with the open vault.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

For the Electron desktop shell:

```bash
npm run desktop:dev
```

Useful checks:

```bash
npm run build
npx tsc --noEmit
npm run test:e2e
```

## License

Caedora is licensed under the Mozilla Public License 2.0 (`MPL-2.0`). See [LICENSE](./LICENSE).
