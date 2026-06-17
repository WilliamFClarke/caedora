# Product Screenshots

The homepage images in `public/landing/` are generated from deterministic demo
states at `/product-screenshots`.

Run:

```bash
npm run screenshots
```

This starts a local Next.js dev server on `127.0.0.1:3200`, captures each demo
state with Playwright, and overwrites:

- `public/landing/hero.png`
- `public/landing/editor.png`
- `public/landing/templates.png`
- `public/landing/argus.png`
- `public/landing/connected.png`

Useful options:

```bash
SCREENSHOT_PORT=3300 npm run screenshots
SCREENSHOT_BASE_URL=http://127.0.0.1:3000 npm run screenshots -- --reuse-server
PLAYWRIGHT_CHANNEL=chrome npm run screenshots
```

Keep screenshot demo content realistic and OKF-specific: YAML metadata,
generated indexes, backlinks, and the visual link map should stay visible so
the product page reflects the current product.
