# Releasing Caedora Desktop

Desktop releases are published by GitHub Actions when a `v*` tag is pushed.

## Before tagging

1. Update `CHANGELOG.md`.
2. Move relevant entries from `## [Unreleased]` into a section matching the tag without the `v` prefix, for example `## [0.1.0]`.
3. Verify locally:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run test:e2e
```

4. On Windows, optionally verify the local desktop distribution build:

```powershell
$env:ELECTRON_CACHE = "$PWD\.electron-cache"
$env:ELECTRON_BUILDER_CACHE = "$PWD\.electron-cache\builder"
npm run desktop:dist
$env:CAEDORA_DESKTOP_EXECUTABLE = (Resolve-Path ".\dist\win-unpacked\Caedora.exe").Path
npm run test:desktop
```

## Create the release

```bash
git tag v0.1.0
git push origin v0.1.0
```

The `Desktop Release` workflow will:

- run web validation and Playwright UI smoke tests,
- build Windows, macOS, and Linux desktop artifacts,
- smoke-test the packaged desktop app,
- upload release assets,
- create `checksums.txt`,
- publish a GitHub Release using the matching `CHANGELOG.md` section.

## Release asset names

- `Caedora-Windows-x64-Setup.exe`
- `Caedora-macOS-arm64.dmg`
- `Caedora-Linux-x64.AppImage`
- matching `.blockmap` files
- `checksums.txt`

Windows releases are unsigned for now, so Windows SmartScreen may warn users.
