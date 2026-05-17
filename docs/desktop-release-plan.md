# Desktop release plan

Caedora will publish a public core application under the Mozilla Public License 2.0 (`MPL-2.0`) and may add paid optional services later.

## Product decisions

- Repository license: `MPL-2.0`
- Desktop app: fully offline-capable
- Release hosting: public GitHub Releases from the main repository
- Release trigger: semantic version tags such as `v0.1.0`
- Release gate: no desktop release is published unless all required automated tests pass
- Initial unsigned builds:
  - Windows x64 installer
  - macOS Apple Silicon `.dmg`
  - Linux x64 `.AppImage`

## Workstreams

1. Public repository readiness
   - Add `MPL-2.0` licensing files and contributor guidance.
   - Review the repository for secrets, private URLs, and material that should not become public.

2. Offline desktop packaging
   - Replace the development-only `http://localhost:3000` desktop loading path with a production local-app strategy.
   - Add Electron packaging configuration and build scripts.
   - Produce Windows, macOS Apple Silicon, and Linux AppImage artifacts.

3. Automated verification
   - Keep the existing web Playwright suite.
   - Add packaged desktop smoke coverage for Windows, macOS, and Linux.
   - Require all platform jobs to pass before release publication.

4. Tagged release pipeline
   - Trigger on `v*` tags.
   - Build and test all supported desktop targets.
   - Publish release assets only after the verification matrix succeeds.
   - Upload checksums with each release.

5. Website download experience
   - Replace the placeholder download state with live platform links.
   - Link to the latest GitHub Release assets for Windows, macOS Apple Silicon, and Linux AppImage.
   - Keep the browser fallback available.

## Suggested delivery order

1. Public repository readiness
2. Offline desktop packaging
3. Desktop smoke tests
4. Tagged release automation
5. Download-page wiring

## Initial GitHub tickets

- Public release readiness and licensing
- Make packaged desktop app work fully offline
- Configure Electron packaging for Windows, macOS Apple Silicon, and Linux AppImage
- Add packaged desktop smoke tests across supported OS targets
- Add tag-driven desktop release workflow with test gate
- Wire website download links to GitHub Release assets
