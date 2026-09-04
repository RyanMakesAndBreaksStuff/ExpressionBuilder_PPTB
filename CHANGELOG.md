# Changelog

All notable changes to this workspace. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file tracks the workspace as a whole (engine, platform, builder-ui, and both hosts). The published Power Platform Toolbox tool is versioned separately — see [apps/pptb/CHANGELOG.md](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/apps/pptb/CHANGELOG.md).

## [Unreleased]

### Added

- Three product screenshots (main view, nested AND/OR groups in dark theme, schema import dialog), captured from the running app and embedded across the README, user manual, and PPTB docs.
- `CHANGELOG.md` at the workspace root and in `apps/pptb` (the latter ships to `dist` on build).

### Changed

- Rewrote `apps/pptb/README.md` as the marketplace-facing README against the [PPTB tool maturity model](https://docs.powerplatformtoolbox.com/tool-development/maturity-model): screenshots, what the tool does, install and run instructions, permissions and external connections, theme/accessibility, and support/maintainer details.
- Documented that the tool declares **no `cspExceptions`** and contacts no external domain — Dataverse access runs through the host adapter and reads metadata only, never records.
- Every link and image across the four docs is now an absolute URL, matching the existing repo convention.
- Corrected the user manual's schema-import step, which pointed at the header **Import** (document import) rather than **Import a schema** (field import).
- Synced doc version headers with their `package.json` versions, which had drifted.

### Fixed

- Lint failure that broke CI on `main`: an unused `MaybePromise` type alias and an unused destructured binding in `pptbAdapter.ts`.

## [1.0.2] — 2026-09-02

### Added

- Per-row wrapper selector — each rule owns its `trim`/`toLower`/`toUpper`/`coalesce` choice through an accessible menu, with wrapper nesting order preserved.
- Keyboard-accessible cross-group move, so reordering no longer requires dragging.
- CI workflow running lint, typecheck, and unit tests on every pull request.

### Changed

- The palette always follows the PPTB host theme, on mount and live. The manual light/dark toggle and its persisted override are gone — host-follow replaces it as the single theme input.
- The platform adapter is typed against `@pptb/types` directly, replacing a hand-declared surface whose dead fallback members let real misses pass silently.
- Retired the global "Apply Wrap" button and the Wrappers tab; explanatory wrapper text moved into the new per-row menu.

### Fixed

- `settings.remove()` was a permanent no-op — it called host methods that do not exist. Reimplemented over the real `getAll`/`setAll` primitives, with orphaned profile-blob keys swept and delete failures surfaced through `notify`.
- Canvas scrolling and cross-group drag-and-drop; the rule list now scrolls instead of overflowing the canvas.
- Duplicate "+ Rule" / "+ Group" accessible names disambiguated per group.

## [1.0.1] and earlier

Initial visual composer, expression engine, diagnostics, Dataverse field discovery, schema import, field profiles, and the two host apps. Not tracked in this file.
