# Verification Record: JSON Reference Builder

Evidence for [spec.md](spec.md), kept by kind as the spec's Verification section asks: unit, rendered browser, PPTB host and live flow. Passing one says nothing about the others.

## Baseline before the change (D-1)

Commit `e14bf10`, 2026-09-26, after `npm ci`. (The plan's baseline was measured on `1c6f354`; `e14bf10` only adds the plan document on top of it, so the baseline is unchanged.)

| Check | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | Pass, no problems |
| Typecheck | `npm run typecheck` | Pass |
| Unit tests | `npm test` | 41 files, 289 tests passed. The `manageProfilesDialog.test.tsx` failure recorded on 2026-09-21 no longer occurs. |
| E2E | `npm run test:e2e` | Fails before running any test: Playwright 1.62.0 cannot resolve the directory-style project reference `./packages/engine` in `tsconfig.json`. Fixed explicitly in Phase 0; see below. |
| Web bundle (gzip -9) | `npm run build:web` | JS 238,737 B, CSS 5,454 B |
| PPTB bundle (gzip -9) | `npm run build:pptb` | JS 244,920 B, one classic `<script>` |

### E2E runner fix

Playwright 1.62.0 (the version `npm-shrinkwrap.json` pins) appends `.json` to every project-reference path, so `{ "path": "./packages/engine" }` became `./packages/engine.json` and no spec could load. The four tsconfig files now name `tsconfig.json` explicitly. TypeScript accepts either form, and `tsc -b` is unchanged.

After the fix, `npm run test:e2e` no longer fails to load the config; the original `Failed to resolve "references" path` error is gone and all three specs are discovered and attempt to run. In this sandbox they then fail for an unrelated, pre-existing reason: `playwright.config.ts`'s single project uses `channel: 'msedge'`, and this container only has Chromium preinstalled at `/opt/pw-browsers` (`Error: browserType.launch: Chromium distribution 'msedge' is not found at /opt/microsoft/msedge/msedge`). Per the working instructions, `playwright install` is never run here, so this is recorded as a pending manual check (real Microsoft Edge) rather than fixed. The tsconfig fix itself is confirmed correct: it is the config-loading failure, not the browser-availability one, that Phase 0 targets.

## Rendered browser (Phase 12)

This container has no Microsoft Edge (`playwright.config.ts` uses `channel: 'msedge'`, not installed here; `playwright install` is never run in this container). The suite below ran instead through an uncommitted, git-excluded local config (`playwright.local.config.ts`) that swaps in the preinstalled Chromium and is otherwise identical (same `testDir`, `webServer`, specs). All results below are Chromium measurements, not Edge.

| Evidence | Result |
| --- | --- |
| `npm run test:e2e`-equivalent (`npx playwright test -c playwright.local.config.ts`), on Chromium because this container has no Edge | 19 passed (1.6m): 16 new specs in `tests/e2e/json-references.spec.ts` + 3 existing (`short-viewport-canvas.spec.ts`, `theme-smoke.spec.ts` ×2) |
| SC-006 parse timing, Chromium — size (1,048,576-byte string value) | 240 ms |
| SC-006 parse timing, Chromium — values (9,999-element array) | 118 ms |
| SC-006 parse timing, Chromium — depth (65 levels) | 108 ms |
| SC-006 parse timing, Chromium — wide (9,999-key object) | 315 ms |
| SC-006 expand timing, Chromium — 9,999-member object | 453 ms |
| SC-006 parse timings in Edge (size, values, depth, wide) | Not run yet: needs Edge; Chromium result above |
| SC-006 expand timing in Edge (9,999-member object) | Not run yet: needs Edge; Chromium result above |

## PPTB host (manual, Phase 14)

Load the built tool in the desktop app with Debug → Load Local Tool (`apps/pptb/dist`).

| Check | Result |
| --- | --- |
| Copy writes the displayed text to the host clipboard (AC-6.1) | Not run yet |
| JSON reference follows the host theme (AC-6.3) | Not run yet |
| SC-006: each limit sample parses and shows its tree within 1 s | Not run yet |
| SC-006: expanding any node responds within 1 s (target 200 ms) | Not run yet |
| VS Code extension: copy works (recommended) | Not run yet |

## Live-flow checklist (SC-008)

Run in a throwaway flow. Record the values the expressions return, not just whether the flow saved.

| # | Check | Returned value | Result |
| --- | --- | --- | --- |
| 1 | HTTP: `outputs('HTTP')?['body']…`, `outputs('HTTP')?['statusCode']`, `body('HTTP')…` | Not run yet | Not run yet |
| 2 | List action: `body('Get_items')?['value'][0]?['Title']` | Not run yet | Not run yet |
| 3 | Compose: `outputs('Compose')?['customer']?['name']`; what `body('Compose')` returns | Not run yet | Not run yet |
| 4 | Triggers: `triggerBody()?['x']`, `triggerOutputs()?['body']?['x']`, `triggerOutputs()?['headers']?['content-type']` | Not run yet | Not run yet |
| 5 | Keys: apostrophe, dot, slash, space, brackets, empty key, Unicode, `"0"` | Not run yet | Not run yet |
| 6 | Action names: spaces, different case (fails), renamed, `Compose 2` → `Compose_2`, apostrophe | Not run yet | Not run yet |
| 7 | Index bounds: `[0]` on an empty array, `[5]` on two items; how `?[n]` behaves | Not run yet | Not run yet |
| 8 | Pasting: bare form for string, number, boolean, object, array, null; `@{…}` form gives text | Not run yet | Not run yet |
| 9 | Nested arrays: `[0][1]` | Not run yet | Not run yet |
| 10 | Trigger `splitOn`: how the trigger outputs change per item | Not run yet | Not run yet |
| 11 | Where run history shows the full output and the body; docs match | Not run yet | Not run yet |

## Bundle size (SC-010)

| Build | Before (gzip -9) | After (gzip -9) | Increase |
| --- | --- | --- | --- |
| Web | JS 238,737 B + CSS 5,454 B | Not run yet | Not run yet |
| PPTB | JS 244,920 B | Not run yet | Not run yet |
