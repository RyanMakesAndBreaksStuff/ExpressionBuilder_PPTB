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

## Final suite (Phase 14)

Commit `7ef11f8`, 2026-09-26, with all of Phases 0–13 landed and a clean working tree. Same four commands as the baseline, run once more end to end.

| Check | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | Pass, no problems |
| Typecheck | `npm run typecheck` | Pass |
| Unit tests | `npx vitest run` | `Test Files  52 passed (52)`, `Tests  427 passed (427)` |
| E2E (Chromium via `playwright.local.config.ts`; see "Rendered browser" below for why) | `npx playwright test -c playwright.local.config.ts` | `19 passed` |

All four match the plan's expected numbers exactly. No failure turned up in any file this plan did not touch, so there is nothing to record under D-1 beyond what Phase 0's baseline already covers (the msedge/tsconfig issues, both explained below).

## Build check (FR-074)

`npm run build:web` then `npm run build:pptb`, then the Phase 14 Node check against `apps/pptb/dist`:

```
node -e "const fs=require('fs');const files=fs.readdirSync('apps/pptb/dist/assets');const js=files.filter(f=>f.endsWith('.js'));const src=js.map(f=>fs.readFileSync('apps/pptb/dist/assets/'+f,'utf8')).join('');const html=fs.readFileSync('apps/pptb/dist/index.html','utf8');console.log({jsFiles:js.length,moduleScript:/type=\"module\"/.test(html),dynamicImport:/\bimport\(/.test(src),worker:/new Worker\(/.test(src)})"
```

Result: `{ jsFiles: 1, moduleScript: false, dynamicImport: false, worker: false }` — exactly the expected shape. The PPTB build stays one classic, self-contained `<script>` with no dynamic `import()` and no `Worker`, so it keeps loading through `srcdoc` with no module support (FR-074); `apps/pptb`'s `minAPI` is unchanged at `1.0.17` (FR-075).

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

This container has no PPTB desktop app and no VS Code extension host, so every row above stays "Not run yet." The automated walkthrough below exercises the same steps through a mocked host in a browser, which is not a substitute for the real host's clipboard, theme source and renderer.

**Pending manual checks before release:**

- **PPTB desktop app** (Debug → Load Local Tool, `apps/pptb/dist`): the real-host copy check (AC-6.1), theme following (AC-6.3), and the SC-006 parse/expand timings on the PPTB host's own renderer. Needs the PPTB desktop app, which this container does not have.
- **VS Code extension**: repeat the copy check there (recommended, not required). Needs the VS Code extension host.
- **Live flow (SC-008)**: the 11 checks in the table below. Needs a throwaway Power Automate flow environment.
- **SC-006 timings in Microsoft Edge**: this container only has Chromium preinstalled; `playwright.config.ts`'s `channel: 'msedge'` project cannot run here. Needs a machine with real Microsoft Edge.

## Limits (FR-024)

The three limits stay **provisional**: 1 MiB, 10,000 values, 64 levels, with `OBJECT_PAGE_SIZE` 500. They are not confirmed by this phase.

The Phase 12 Chromium timings (above) cover every SC-006 sample at those limits and are all comfortably under the 1 s budget: size 240 ms, values 118 ms, depth 108 ms, wide 315 ms, and expanding the 9,999-member object at 453 ms. But the spec's confirmation step needs the Edge timings and the PPTB desktop host's timings, and this container has neither Edge nor the PPTB desktop app (see "Pending manual checks" above). Until both are measured, FR-024 stays open per the plan's own rule ("confirmed or changed by the benchmark in SC-006 before release"), so no constant in `packages/builder-ui/src/importExport/jsonPayload.ts` was touched and no spec change was raised.

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

This container has no flow environment, so all 11 rows stay "Not run yet" — see "Pending manual checks before release" above.

## Bundle size (SC-010)

| Build | Before (gzip -9) | After (gzip -9) | Increase |
| --- | --- | --- | --- |
| Web | JS 238,737 B + CSS 5,454 B | JS 244,184 B + CSS 6,804 B | JS +5,447 B, CSS +1,350 B |
| PPTB | JS 244,920 B | JS 251,809 B | +6,889 B |

Measured with the Phase 0 command after `npm run build:web` and `npm run build:pptb`:

```bash
node -e "const fs=require('fs'),z=require('zlib'),p=require('path');for(const d of ['apps/web/dist/assets','apps/pptb/dist/assets'])for(const f of fs.readdirSync(d))console.log(p.join(d,f),z.gzipSync(fs.readFileSync(p.join(d,f)),{level:9}).length)"
```

Every increase (Web JS +5,447 B, Web CSS +1,350 B, PPTB JS +6,889 B) is far under the 25 kB gzipped threshold, so SC-010 needs no written justification.

## Quickstart walkthrough (automated, Chromium)

The plan's "walk every acceptance scenario once by hand in the web build" step is replaced here by a throwaway Playwright script, `quickstart-walk.mjs` (kept outside the repo, in the scratchpad — it is not part of this change and is not committed). It launches the preinstalled Chromium, starts `npm run dev:web` and `npm run dev:pptb` itself, and drives Quickstart Validation steps 3–11 against both: the web build at `http://127.0.0.1:5173/`, and the PPTB build at `http://127.0.0.1:5174/` behind a mocked `toolboxAPI` (the same shape `tests/e2e/json-references.spec.ts` uses, with `copyToClipboard` left out so Copy hits the real off-host failure). This stands in for the by-hand AC walk; a real by-hand walk in the actual PPTB desktop app and Microsoft Edge is still recommended before release, alongside the other pending manual checks above.

All 26 checks passed:

| Step | Build(s) | Result |
| --- | --- | --- |
| 3: opens on Condition builder with a count of 0; Tab then → selects JSON reference | web, pptb | Pass. `aria-label="Condition builder, 0 rules"` before switching; after one Tab and one →, `JSON reference`'s `aria-selected` is `true`. |
| 4: keeps Action and Full output, types the action name | web, pptb | Pass. Both radios were already checked by default; only `Action name` needed filling. |
| 5: parses fixture A1 | web, pptb | Pass. Status text is exactly `Parsed · 25 values` (a middle dot, `·`, not a hyphen or bullet). |
| 6: expands to `body › value › [0] › Requester › Email` | web, pptb | Pass on all four displays: reference `outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']`; breadcrumb `outputs('Get_items') › body › value › [0] › Requester › Email`; header summary `string · "dana@contoso.com"`; note `Fixed position [0]: reads that item only, not each item in a loop.` |
| 7: Copy shows "Expression copied" and the clipboard matches | web | Pass. The status text appears, the clipboard holds the bare reference, and the status reverted after 1,379 ms (the plan's ~1.2 s, plus the poll's own overhead). |
| 8: "Inside text @{…}" then Copy | web | Pass. Clipboard holds `@{outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']}`. |
| 9: switch to Condition builder and back | web | Pass. The Condition builder's mode (`Trigger condition`) and generated expression (`@and()`) were identical before and after visiting JSON reference. The JSON reference selection also survived the round trip — its preview correctly still showed the `@{...}`-wrapped form, because step 8 left `copyFormat` as `inline` and the preview reflects the current copy format, not just the clipboard. |
| 10: PPTB build, off-host Copy | pptb | Pass. Copy reports exactly `Could not copy expression: the host does not provide a clipboard API`, SC-007's honest failure. |
| 11: reload | pptb | Pass. After reload the app reopens on Condition builder (`0 rules`) and the JSON reference pane is empty again (`Sample JSON` and `Action name` both blank, status back to `Nothing parsed yet`). |

Two false failures came up while building the script itself, both fixed in the script rather than the product (no product code changed for this phase): an initial run assumed the reference preview always shows the bare expression, missing that it tracks the selected copy format (step 9, above); and the very first run drove the PPTB build fully off-host (no mocked `toolboxAPI` at all), which left a real onboarding dialog open that a plain `Tab` press landed on differently than on the mocked run — using the mocked host, as the brief asks, removed that dialog and the discrepancy along with it.

## Pull request notes

- **Changed test expectations.** The PPTB off-host copy test (`packages/platform/test/pptbAdapter.test.ts`) now expects `copyToClipboard` to reject with "the host does not provide a clipboard API" instead of resolving; this is the SC-007 behaviour this plan adds (a host without a clipboard API is a caller-visible failure, not a silent no-op). The builder header gained the two builder tabs (Condition builder / JSON reference), but no existing test's assertion of the header's exact contents changed — the new tabs were additive.
- **Phase 0 tsconfig fix.** The four `tsconfig.json` files' project references now name `tsconfig.json` explicitly (e.g. `{ "path": "./packages/engine/tsconfig.json" }` instead of `{ "path": "./packages/engine" }`). Playwright 1.62.0 (pinned in `npm-shrinkwrap.json`) appends `.json` to every project-reference path when loading `playwright.config.ts`'s TypeScript, so the directory-style form resolved to a nonexistent `./packages/engine.json` and no e2e spec could load at all. `tsc -b` accepts either form, so this only unblocks the e2e runner.
- **New dev dependency: `@axe-core/playwright` (`^4.13.0`).** Added so the e2e suite can run an automated accessibility scan (FR-085) over both the Condition builder and the new JSON reference view, in both themes and with and without a selection/errors. It is dev-only, per CON-001, and ships in no built bundle (see the bundle table above).
- **Bundle size (SC-010).** See the "Bundle size" table above: Web JS +5,447 B, Web CSS +1,350 B, PPTB JS +6,889 B (gzip -9), all far under the 25 kB threshold.
- **Evidence.** See "Final suite (Phase 14)" and "Build check (FR-074)" above for the full lint/typecheck/unit/e2e run and the PPTB single-script check; "Rendered browser (Phase 12)" for the SC-006 Chromium timings; "Limits (FR-024)" for why the three limits stay provisional; "PPTB host (manual, Phase 14)" and "Live-flow checklist (SC-008)" for the pending manual checks; and "Quickstart walkthrough (automated, Chromium)" above for the automated stand-in for the by-hand AC walk.
