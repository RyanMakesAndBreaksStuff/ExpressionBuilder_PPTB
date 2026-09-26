# Implementation Plan: JSON Reference Builder

**Spec:** research/v2 update/spec.md (status: Approved, 2026-09-26)
**Decisions:** the spec's Source reconciliation table (rows 1–20) and this plan's planning decisions below; there is no `docs/adr/` in this repository
**Created:** 2026-09-26

## Global Constraints

Copied from spec.md. Every phase implicitly includes these.

- CON-001: No package gets a new runtime dependency. A dev-only test tool is allowed if the plan justifies it.
- CON-002: The saved-expression format and its version, the two expression modes, field definitions, and the profile and cache formats don't change. No migration is needed.
- CON-003: The engine stays pure. The reference formatter is a deterministic string function that deals with no UI, clipboard or parsing. Existing field-reference and predicate output stays byte-for-byte the same, and the predicate formatter's rule that the root must be boolean is not relaxed.
- CON-004: JSON reference is not an expression mode. The mode switch, the mode context and diagnostics don't change.
- CON-005: The shared UI stays independent of the host. `apps/web` and `apps/pptb` need no feature code. The hosts differ only through the platform adapter.
- CON-006: All clipboard access goes through the platform adapter.
- CON-007: Paths keep their types: a key is a string and an index is a number. Tree rows MUST have collision-free identities, which rules out paths joined with dots.
- CON-008: The feature is built from the idea and from Microsoft's documented grammar. Don't copy the code, CSS, text, branding or assets of the third-party site.
- FR-060: While the feature is in use (pasting, parsing, selecting, expanding, copying, switching builders), the app MUST NOT make network requests, send telemetry or log sample content. It MUST NOT write to host settings, localStorage, sessionStorage, IndexedDB or cookies. The clipboard is written only when the user selects Copy.
- FR-070: The feature MUST behave the same in the PPTB tool and the static web build. The builds differ only in the clipboard route (FR-051) and the theme source (FR-091). The feature has no host-specific flag.
- FR-074: The feature MUST ship inside each build's existing bundle. The PPTB build MUST stay a single self-contained script, with no separately loaded chunks or workers, because PPTB loads tools through `srcdoc` without module support.
- FR-075: The PPTB `minAPI` MUST stay at 1.0.17.
- FR-090: The builder MUST match the handoff's high-fidelity design. It reuses and extends the existing Graphite tokens and `eb-*` classes, uses no hard-coded colours, and does not copy the prototype's inline styles.
- FR-024: The three limits are provisional. They MUST be defined as named constants, and they MUST be confirmed or changed by the benchmark in SC-006 before release. If a limit changes, its message changes with it.
- SC-009: lint, typecheck and the unit tests pass, and so do the existing theme-smoke and short-viewport e2e specs. Existing tests change their expectations only where this spec changes behaviour: the PPTB off-host clipboard test, and any test that asserts the header's exact contents. The pull request lists each such change.
- D-1: The plan must establish the current baseline first. This change must not hide unrelated failures or quietly fix them.

---

## Goal

Both builds gain a **JSON reference** builder, opened from header tabs next to the **Condition builder**. A maker pastes a flow-run output, names its source, selects any value in a keyboard-accessible tree and copies a correctly rooted reference. The builder runs entirely in memory, saves nothing and leaves the condition document byte-identical.

**Planning decisions.** These are the choices the spec's "Handoff to planning" leaves to the plan. The owner confirmed the first two on 2026-09-26.

1. **Tree component (D-3):** a hand-rolled, flat WAI-ARIA tree (Phase 8). The pinned `@fluentui/react-tree` 9.16.3 says it is not production-ready, and its default click and Enter behaviour toggles rows instead of selecting them (FR-034, FR-036).
2. **Accessibility scan (FR-085):** `@axe-core/playwright` as a dev-only dependency (Phase 12), which CON-001 allows. The scan excludes Fluent's `[data-tabster-dummy]` focus sentinels: they are library-owned, `role="none"`, and flagged as `aria-hidden-focus` on today's empty Condition view.
3. **Where JSON reference state lives (FR-008):** inside `JsonReferenceWorkspace` (a `useReducer`). The workspace mounts the first time its tab opens, then stays mounted in a `hidden` tab panel (Phase 10). Nothing is lifted into the shell, and the Condition builder's mount lifecycle is untouched.
4. **Header fit (FR-007, FR-092):** measured in the real shell on 2026-09-26.
   - Today's header is 71px on one row from 960px to 1,440px, but 109px on two rows at 901px.
   - The planned CSS keeps it 71px on one row from 901px to 1,440px in both views. The title truncates first, then Import and Export go icon-only at 901–1,180px.
   - At 900px and below the tabs take their own row. At 480px and below they drop their icons, so the strip fits at 375px (Phase 11).
5. **E2E files (D-2):** add the `.gitignore` exception `!/tests/e2e/json-references.spec.ts` (Phase 12).
6. **Very wide objects (FR-039):** page after 500 members, the same way arrays page after 20. A plain DOM build of 10,000 rows took 1.8 s in Chromium, which misses the 1 s budget, so FR-039's fallback applies. The SC-006 benchmark confirms the constant (Phase 5).
7. **Contrast (FR-085):** today's `.fn` colour (`--accent-2` on `--surface2`) is 4.43:1 in light mode, a serious axe violation. Light mode gets a derived, darker `--code-fn`. The colour changes but the text does not, which FR-046 allows (Phase 11).

**Pre-implementation gates.**
- **Simplicity:** passed. There are three components: the engine formatter, the platform adapters' copy, and the builder-ui workspace. The one new package is dev-only (Phase 12). Object paging is justified in Phase 5.
- **Anti-Abstraction:** one new control, `ChoiceGroup`, justified in Phase 7. The shell keeps a single state owner for each builder (Phase 10).
- **Integration-First:** passed. Contracts and their tests come first (Phase 0).

**Traceability.** `AC-S.N` is user story S, acceptance scenario N, in spec order. For example, AC-4.6 is "a PPTB host without a clipboard API". Appendix A cases 1–22 and 25 are engine unit tests (Phase 0/1); cases 23–24 are state unit tests (Phase 6).

**How tests resolve packages.** Builder-ui tests import `@ryanmakes/eb_engine` from its built `dist`, so run `npm run typecheck` (`tsc -b`) after changing the engine and before running builder-ui tests. The apps' Vite configs alias the packages' `src`, so dev servers need no build.

---

## Phase 0: Baseline, contracts and contract tests

**Implements:** D-1, SC-001 (contract), FR-021–FR-023 (contract), FR-071 and FR-073 (contract), SC-009 (e2e baseline) | **Satisfies:** none yet; the contracts back AC-1.1, AC-1.3, AC-1.4, AC-2.1, AC-2.2, AC-4.1–AC-4.3 and AC-4.6
**Files:** `research/v2 update/verification.md` (new), `tsconfig.json`, `packages/builder-ui/tsconfig.json`, `apps/web/tsconfig.json`, `apps/pptb/tsconfig.json`, `test/workspaceBuildScripts.test.ts`, `packages/engine/test/payloadReferences.test.ts` (new), `packages/builder-ui/test/fixtures/jsonReferenceFixtures.ts` (new), `packages/builder-ui/test/jsonPayload.test.ts` (new), `packages/platform/test/pptbAdapter.test.ts`, `packages/platform/test/webAdapter.test.ts`
**Interfaces:** Consumes: nothing. Produces:
- contract tests for `formatPayloadReference`, `formatPayloadRoot` (Phase 1) and `parsePayload`, `pathKey`, `keyToPath`, `valueAtPath`, `payloadValueType` and the limit constants (Phase 3);
- the adapters' rejecting `copyToClipboard` (Phase 2);
- fixtures `fixtureA1`, `composeSample`, `triggerFullSample`, `triggerBodySample`;
- a working `npm run test:e2e`.

This phase records the baseline before anything changes. It makes the e2e runner loadable again, which was broken before this feature and is recorded rather than quietly fixed. It also writes the tests that fix the three pure contracts.

- [ ] Install exactly what the lockfile pins: `npm ci`

- [ ] Record the baseline (D-1). Run each command and note the result. The expected values below were measured on commit `1c6f354` on 2026-09-26:
  - `npm run lint` → exit 0, no problems
  - `npm run typecheck` → exit 0
  - `npm test` → `Test Files  41 passed (41)` / `Tests  289 passed (289)`. The `manageProfilesDialog.test.tsx` failure that `results.md` recorded on 2026-09-21 no longer occurs.
  - `npm run test:e2e` → fails before any test runs, with `Failed to resolve "references" path "./packages/engine" referenced from …/tsconfig.json`. The lockfile's Playwright 1.62.0 appends `.json` to directory-style project references.
  - `npm run build:web` then `npm run build:pptb` → both exit 0
  - Gzipped sizes (SC-010 baseline):

    ```bash
    node -e "const fs=require('fs'),z=require('zlib'),p=require('path');for(const d of ['apps/web/dist/assets','apps/pptb/dist/assets'])for(const f of fs.readdirSync(d))console.log(p.join(d,f),z.gzipSync(fs.readFileSync(p.join(d,f)),{level:9}).length)"
    ```

    Expected: web JS 238,513 B and CSS 5,482 B; PPTB JS 244,743 B (one file).

- [ ] Create `research/v2 update/verification.md`. Replace any baseline value that differs on your machine with what you observed:

  ```markdown
  # Verification Record: JSON Reference Builder

  Evidence for [spec.md](spec.md), kept by kind as the spec's Verification section asks: unit, rendered browser, PPTB host and live flow. Passing one says nothing about the others.

  ## Baseline before the change (D-1)

  Commit `1c6f354`, 2026-09-26, after `npm ci`.

  | Check | Command | Result |
  | --- | --- | --- |
  | Lint | `npm run lint` | Pass, no problems |
  | Typecheck | `npm run typecheck` | Pass |
  | Unit tests | `npm test` | 41 files, 289 tests passed. The `manageProfilesDialog.test.tsx` failure recorded on 2026-09-21 no longer occurs. |
  | E2E | `npm run test:e2e` | Fails before running any test: Playwright 1.62.0 cannot resolve the directory-style project reference `./packages/engine` in `tsconfig.json`. Fixed explicitly in Phase 0; see below. |
  | Web bundle (gzip -9) | `npm run build:web` | JS 238,513 B, CSS 5,482 B |
  | PPTB bundle (gzip -9) | `npm run build:pptb` | JS 244,743 B, one classic `<script>` |

  ### E2E runner fix

  Playwright 1.62.0 (the version `npm-shrinkwrap.json` pins) appends `.json` to every project-reference path, so `{ "path": "./packages/engine" }` became `./packages/engine.json` and no spec could load. The four tsconfig files now name `tsconfig.json` explicitly. TypeScript accepts either form, and `tsc -b` is unchanged. After the fix, `npm run test:e2e` runs the existing specs: 3 passed.

  ## Rendered browser (Phase 12)

  | Evidence | Result |
  | --- | --- |
  | `npm run test:e2e` | Not run yet |
  | SC-006 parse timings in Edge (size, values, depth, wide) | Not run yet |
  | SC-006 expand timing in Edge (9,999-member object) | Not run yet |

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
  | Web | JS 238,513 B + CSS 5,482 B | Not run yet | Not run yet |
  | PPTB | JS 244,743 B | Not run yet | Not run yet |
  ```

- [ ] Write the failing guard test for the e2e runner. In `test/workspaceBuildScripts.test.ts`, add this test inside `describe('workspace build scripts', …)`, directly before `it('keeps PPTB HTML free of remote font URLs …')`:

  ```ts
    it('references tsconfig files explicitly so Playwright can load the e2e specs', () => {
      for (const config of ['tsconfig.json', 'packages/builder-ui/tsconfig.json', 'apps/web/tsconfig.json', 'apps/pptb/tsconfig.json']) {
        const { references = [] } = JSON.parse(readFileSync(resolve(process.cwd(), config), 'utf8')) as {
          references?: Array<{ path: string }>;
        };
        for (const reference of references) {
          expect(reference.path, config).toMatch(/\/tsconfig\.json$/);
        }
      }
    });
  ```

- [ ] Run: `npx vitest run test/workspaceBuildScripts.test.ts`. Expected: FAIL, 1 failed (`expected './packages/engine' to match /\/tsconfig\.json$/`).

- [ ] Name each referenced tsconfig file.

  `tsconfig.json`:

  ```json
  {
    "files": [],
    "references": [
      { "path": "./packages/engine/tsconfig.json" },
      { "path": "./packages/platform/tsconfig.json" },
      { "path": "./packages/builder-ui/tsconfig.json" },
      { "path": "./apps/web/tsconfig.json" },
      { "path": "./apps/pptb/tsconfig.json" }
    ]
  }
  ```

  `packages/builder-ui/tsconfig.json`:

  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "composite": true,
      "declaration": true,
      "declarationMap": true,
      "emitDeclarationOnly": false,
      "outDir": "dist",
      "rootDir": "src",
      "tsBuildInfoFile": "dist/tsconfig.tsbuildinfo"
    },
    "include": ["src"],
    "references": [
      { "path": "../engine/tsconfig.json" },
      { "path": "../platform/tsconfig.json" }
    ]
  }
  ```

  `apps/web/tsconfig.json` and `apps/pptb/tsconfig.json`: the files are identical, so write this content to both:

  ```json
  {
    "extends": "../tsconfig.shared.json",
    "compilerOptions": {
      "outDir": "dist-types",
      "rootDir": "src",
      "tsBuildInfoFile": "dist-types/tsconfig.tsbuildinfo"
    },
    "include": ["src"],
    "references": [
      { "path": "../../packages/builder-ui/tsconfig.json" },
      { "path": "../../packages/platform/tsconfig.json" }
    ]
  }
  ```

- [ ] Run: `npx vitest run test/workspaceBuildScripts.test.ts`, then `npm run typecheck`, then `npm run test:e2e`. Expected:
  - vitest: PASS;
  - typecheck: exit 0;
  - e2e: `3 passed` (the two theme-smoke tests and short-viewport-canvas).

  Update the E2E row of `verification.md` if your result differs.

- [ ] Commit: `fix(build): name tsconfig files in project references so Playwright 1.62 can load the e2e specs`

- [ ] Write the engine contract test `packages/engine/test/payloadReferences.test.ts`:

  ```ts
  import { describe, expect, it } from 'vitest';
  import { formatFieldReference, formatPayloadReference, formatPayloadRoot } from '../src';
  import type { PayloadReference, PayloadReferenceRoot } from '../src';

  const getItemsFull: PayloadReferenceRoot = { kind: 'outputs', actionName: 'Get items' };
  const getItemsBody: PayloadReferenceRoot = { kind: 'body', actionName: 'Get items' };
  const composeFull: PayloadReferenceRoot = { kind: 'outputs', actionName: 'Compose' };
  const triggerFull: PayloadReferenceRoot = { kind: 'triggerOutputs' };
  const triggerBody: PayloadReferenceRoot = { kind: 'triggerBody' };

  // Spec Appendix A (normative). Case 23 (the inline copy format) and case 24 (a
  // blank action name) are UI behaviour; jsonReferenceState.test.ts covers them.
  const appendixA: Array<[number, PayloadReference, string]> = [
    [1, { root: getItemsFull, path: ['body', 'value', 0, 'Requester', 'Email'] }, "outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']"],
    [2, { root: getItemsBody, path: ['value', 0, 'Title'] }, "body('Get_items')?['value'][0]?['Title']"],
    [3, { root: triggerFull, path: ['body', 'customer', 'name'] }, "triggerOutputs()?['body']?['customer']?['name']"],
    [4, { root: triggerBody, path: ['customer', 'name'] }, "triggerBody()?['customer']?['name']"],
    [5, { root: composeFull, path: ['customer'] }, "outputs('Compose')?['customer']"],
    [6, { root: getItemsBody, path: [] }, "body('Get_items')"],
    [7, { root: triggerFull, path: [] }, 'triggerOutputs()'],
    [8, { root: getItemsFull, path: ['body', '@odata.nextLink'] }, "outputs('Get_items')?['body']?['@odata.nextLink']"],
    [9, { root: triggerBody, path: ["O'Brien"] }, "triggerBody()?['O''Brien']"],
    [10, { root: triggerBody, path: ['a.b'] }, "triggerBody()?['a.b']"],
    [11, { root: triggerBody, path: ['body/value'] }, "triggerBody()?['body/value']"],
    [12, { root: triggerBody, path: ['first name', '[x]'] }, "triggerBody()?['first name']?['[x]']"],
    [13, { root: triggerBody, path: [''] }, "triggerBody()?['']"],
    [14, { root: triggerBody, path: ['0'] }, "triggerBody()?['0']"],
    [15, { root: triggerBody, path: [0, 'id'] }, "triggerBody()[0]?['id']"],
    [16, { root: composeFull, path: ['matrix', 0, 1] }, "outputs('Compose')?['matrix'][0][1]"],
    [17, { root: triggerBody, path: ['__proto__'] }, "triggerBody()?['__proto__']"],
    [18, { root: triggerBody, path: ['naïve 名前'] }, "triggerBody()?['naïve 名前']"],
    [19, { root: { kind: 'outputs', actionName: '  Get   my items ' }, path: [] }, "outputs('Get_my_items')"],
    [20, { root: { kind: 'body', actionName: "Get Bob's items" }, path: [] }, "body('Get_Bob''s_items')"],
    [21, { root: { kind: 'outputs', actionName: 'get Items' }, path: [] }, "outputs('get_Items')"],
    [22, { root: { kind: 'outputs', actionName: 'Get\titems\n2' }, path: [] }, "outputs('Get_items_2')"],
  ];

  describe('formatPayloadReference (spec Appendix A)', () => {
    it.each(appendixA)('case %i', (_case, reference, expected) => {
      expect(formatPayloadReference(reference)).toBe(expected);
    });

    it('writes an index as [n] and a numeric key as a quoted key', () => {
      expect(formatPayloadReference({ root: triggerBody, path: [0] })).toBe('triggerBody()[0]');
      expect(formatPayloadReference({ root: triggerBody, path: ['0'] })).toBe("triggerBody()?['0']");
    });

    it('adds no body segment of its own', () => {
      expect(formatPayloadReference({ root: getItemsBody, path: ['body'] })).toBe("body('Get_items')?['body']");
      expect(formatPayloadReference({ root: getItemsFull, path: [] })).toBe("outputs('Get_items')");
    });
  });

  describe('formatPayloadRoot', () => {
    it.each<[PayloadReferenceRoot, string]>([
      [getItemsFull, "outputs('Get_items')"],
      [getItemsBody, "body('Get_items')"],
      [triggerFull, 'triggerOutputs()'],
      [triggerBody, 'triggerBody()'],
    ])('formats %o', (root, expected) => {
      expect(formatPayloadRoot(root)).toBe(expected);
    });
  });

  describe('existing field references (spec Appendix A case 25)', () => {
    it('formats a trigger-condition field path exactly as before', () => {
      expect(
        formatFieldReference({ id: 'b', label: 'b', type: 'string', path: ['a', 'b'] }, 'triggerCondition'),
      ).toBe("triggerBody()?['a']?['b']");
    });
  });
  ```

- [ ] Write the shared fixtures `packages/builder-ui/test/fixtures/jsonReferenceFixtures.ts`. The e2e spec also imports these.

  ```ts
  /** Spec Appendix A, fixture A1: parsing it must report "Parsed · 25 values". */
  export const fixtureA1 = `{
    "statusCode": 200,
    "headers": { "Content-Type": "application/json; odata.metadata=minimal" },
    "body": {
      "value": [
        { "ID": 14, "Title": "Laptop refresh", "Status": "Approved", "Amount": 5000, "Urgent": false,
          "Requester": { "DisplayName": "Dana O'Brien", "Email": "dana@contoso.com" } },
        { "ID": 15, "Title": "Monitor", "Status": "Pending", "Amount": 320, "Urgent": true,
          "Requester": { "DisplayName": "Lee Park", "Email": "lee@contoso.com" } }
      ],
      "@odata.nextLink": null
    }
  }`;

  /** A Compose output: an object with no body key (user story 1, scenario 4). */
  export const composeSample = `{ "customer": { "name": "Contoso", "tier": "gold" }, "matrix": [[1, 2], [3, 4]] }`;

  /** A trigger's full output (user story 2, scenario 2). */
  export const triggerFullSample = `{
    "headers": { "content-type": "application/json" },
    "body": { "customer": { "name": "Contoso" } }
  }`;

  /** A trigger's request body (user story 2, scenario 1). */
  export const triggerBodySample = `{ "customer": { "name": "Contoso" } }`;
  ```

- [ ] Write the parser contract test `packages/builder-ui/test/jsonPayload.test.ts`:

  ```ts
  import { describe, expect, it } from 'vitest';
  import {
    MAX_NESTING_DEPTH,
    MAX_SAMPLE_BYTES,
    MAX_VALUE_COUNT,
    PARSE_MESSAGES,
    keyToPath,
    parsePayload,
    pathKey,
    payloadValueType,
    valueAtPath,
  } from '../src/importExport/jsonPayload';
  import { fixtureA1 } from './fixtures/jsonReferenceFixtures';

  function parseError(text: string): string {
    const result = parsePayload(text);
    if (result.ok) throw new Error('expected the parse to fail');
    return result.message;
  }

  function builtInParserMessage(text: string): string {
    try {
      JSON.parse(text);
    } catch (error) {
      return (error as Error).message;
    }
    throw new Error('expected JSON.parse to throw');
  }

  const nestedArrays = (depth: number) => '['.repeat(depth) + ']'.repeat(depth);

  describe('parsePayload', () => {
    it('counts fixture A1 as 25 values and keeps the parsed text', () => {
      const result = parsePayload(fixtureA1);

      expect(result).toEqual({ ok: true, payload: { value: JSON.parse(fixtureA1), valueCount: 25, text: fixtureA1 } });
    });

    it('rejects an empty or whitespace-only sample', () => {
      expect(parseError('')).toBe('Paste a sample before parsing.');
      expect(parseError(' \n\t ')).toBe('Paste a sample before parsing.');
    });

    it('measures the size in UTF-8 bytes and allows exactly 1 MiB', () => {
      expect(MAX_SAMPLE_BYTES).toBe(1_048_576);
      expect(parsePayload(JSON.stringify('x'.repeat(MAX_SAMPLE_BYTES - 2))).ok).toBe(true);
      expect(parseError(JSON.stringify('x'.repeat(MAX_SAMPLE_BYTES - 1)))).toBe(
        'Sample is larger than 1 MiB. Trim it to the part you need.',
      );
      // 524,290 UTF-16 code units, but 1,048,578 UTF-8 bytes.
      expect(parseError(`"${'é'.repeat(524_288)}"`)).toBe(PARSE_MESSAGES.tooLarge);
    });

    it('checks the size before the syntax', () => {
      expect(parseError(`{${' '.repeat(MAX_SAMPLE_BYTES)}`)).toBe(PARSE_MESSAGES.tooLarge);
    });

    it("reports the built-in parser's message for invalid JSON", () => {
      for (const text of ['{"a": 1,}', "{'a': 1}", '{"a": 1} // note', '{"a": ']) {
        expect(parseError(text)).toBe(`Not valid JSON: ${builtInParserMessage(text)}`);
      }
    });

    it('allows exactly 10,000 values and rejects 10,001', () => {
      expect(MAX_VALUE_COUNT).toBe(10_000);
      expect(parsePayload(JSON.stringify(new Array(9_999).fill(0)))).toMatchObject({
        ok: true,
        payload: { valueCount: 10_000 },
      });
      expect(parseError(JSON.stringify(new Array(10_000).fill(0)))).toBe(
        'Sample has more than 10,000 values. Trim it to the part you need.',
      );
    });

    it('allows 64 levels of nesting and rejects 65', () => {
      expect(MAX_NESTING_DEPTH).toBe(64);
      expect(parsePayload(nestedArrays(65))).toMatchObject({ ok: true, payload: { valueCount: 65 } });
      expect(parseError(nestedArrays(66))).toBe('Sample is nested deeper than 64 levels.');
    });

    it('checks the value count before the depth, without overflowing the stack', () => {
      expect(parseError(nestedArrays(10_001))).toBe(PARSE_MESSAGES.tooManyValues);
    });

    it('keeps the last value of a repeated key, and JSON inside a string stays a string', () => {
      const result = parsePayload('{"a": 1, "a": 2, "raw": "{\\"b\\": 3}"}');

      expect(result).toMatchObject({ ok: true, payload: { value: { a: 2, raw: '{"b": 3}' }, valueCount: 3 } });
    });

    it("keeps built-in object names as ordinary keys, in the parser's order", () => {
      const result = parsePayload('{"b": 1, "2": 2, "__proto__": 3, "constructor": 4, "hasOwnProperty": 5, "1": 6}');
      if (!result.ok) throw new Error(result.message);

      expect(Object.keys(result.payload.value as object)).toEqual(['1', '2', 'b', '__proto__', 'constructor', 'hasOwnProperty']);
      expect(valueAtPath(result.payload.value, ['__proto__'])).toEqual({ found: true, value: 3 });
    });

    it('accepts a top-level primitive as a single value', () => {
      expect(parsePayload('"text"')).toMatchObject({ ok: true, payload: { value: 'text', valueCount: 1 } });
      expect(parsePayload('null')).toMatchObject({ ok: true, payload: { value: null, valueCount: 1 } });
    });
  });

  describe('payload paths', () => {
    it('gives the key "0" and the index 0 different identities', () => {
      expect(pathKey(['0'])).not.toBe(pathKey([0]));
      expect(pathKey(['a.b'])).not.toBe(pathKey(['a', 'b']));
    });

    it('round-trips a path through its key', () => {
      const path = ['body', 0, "O'Brien", '', '[x]'];

      expect(keyToPath(pathKey(path))).toEqual(path);
    });

    it('follows own members and in-range elements only', () => {
      expect(valueAtPath({}, ['constructor'])).toEqual({ found: false });
      expect(valueAtPath({ '0': 'key' }, [0])).toEqual({ found: false });
      expect(valueAtPath(['element'], ['0'])).toEqual({ found: false });
      expect(valueAtPath(['element'], [1])).toEqual({ found: false });
      expect(valueAtPath({ a: [null] }, ['a', 0])).toEqual({ found: true, value: null });
      expect(valueAtPath('leaf', [])).toEqual({ found: true, value: 'leaf' });
    });

    it('names the six JSON types', () => {
      expect([null, [], {}, 's', 1, true].map(payloadValueType)).toEqual([
        'null',
        'array',
        'object',
        'string',
        'number',
        'boolean',
      ]);
    });
  });
  ```

- [ ] Change the adapter tests so they require a truthful copy (FR-071, FR-073). This is the PPTB off-host test that SC-009 allows to change.
  - In `packages/platform/test/pptbAdapter.test.ts`, replace the whole test `'is a safe no-op off-host (no toolboxAPI at all)'` with the three tests below: the updated off-host test and two new ones. They then sit directly before `'falls back to sample fields notification when no Dataverse connection exists'`.

  ```ts
    it('is a safe no-op off-host (no toolboxAPI at all), except that copying fails', async () => {
      const api: PptbToolboxApi = {};
      const adapter = createPptbAdapter(api);
      const observedTheme = vi.fn();

      await expect(adapter.copyToClipboard('text')).rejects.toThrow('the host does not provide a clipboard API');
      await expect(adapter.notify('Heads up', 'warning')).resolves.toBeUndefined();
      await expect(adapter.getTheme()).resolves.toBe('light');
      const unsubscribe = adapter.onThemeChanged(observedTheme);
      expect(() => unsubscribe()).not.toThrow();
      await expect(adapter.settings.get('missing')).resolves.toBeNull();
      await expect(adapter.settings.set('draft', 'value')).resolves.toBeUndefined();
      await expect(adapter.settings.remove('draft')).resolves.toBeUndefined();
    });

    it('rejects a copy when the host utils namespace has no clipboard API', async () => {
      const api: PptbToolboxApi = { utils: { showNotification: vi.fn().mockResolvedValue(undefined) } };

      await expect(createPptbAdapter(api).copyToClipboard('text')).rejects.toThrow(
        'the host does not provide a clipboard API',
      );
    });

    it('passes a host clipboard rejection through to the caller', async () => {
      const api: PptbToolboxApi = {
        utils: { copyToClipboard: vi.fn().mockRejectedValue(new Error('clipboard is busy')) },
      };

      await expect(createPptbAdapter(api).copyToClipboard('text')).rejects.toThrow('clipboard is busy');
    });
  ```

  - In `packages/platform/test/webAdapter.test.ts`, add these two tests directly before `it('persists settings in localStorage', …)`:

  ```ts
    it('rejects with a readable reason when the browser has no clipboard API', async () => {
      vi.stubGlobal('navigator', {});
      stubLocalStorage();
      stubMatchMedia(false);

      await expect(createWebAdapter().copyToClipboard('text')).rejects.toThrow(
        'the browser clipboard is not available here',
      );
    });

    it('passes a refused clipboard write through to the caller', async () => {
      const writeText = vi.fn().mockRejectedValue(new DOMException('Write permission denied.', 'NotAllowedError'));
      vi.stubGlobal('navigator', { clipboard: { writeText } });
      stubLocalStorage();
      stubMatchMedia(false);

      await expect(createWebAdapter().copyToClipboard('text')).rejects.toThrow('Write permission denied.');
    });
  ```

- [ ] Run: `npx vitest run packages/engine/test/payloadReferences.test.ts packages/builder-ui/test/jsonPayload.test.ts packages/platform/test`. Expected: FAIL.
  - `payloadReferences.test.ts` fails: `formatPayloadReference is not a function`.
  - `jsonPayload.test.ts` fails to import `../src/importExport/jsonPayload`.
  - Three adapter tests fail: the off-host copy, and utils without a clipboard API (both resolve instead of rejecting), and the web test with no clipboard (it throws a TypeError).
  - The two pass-through tests already pass.

- [ ] Commit: `test: add contract tests for payload references, payload parsing and truthful copy`

> **Complexity note** (Integration-First Gate, passed). The contracts are these tests plus the signatures in Phases 1–3, and they come before any implementation. The tsconfig change is a fix outside the feature. It is here because SC-009 and every rendered-browser phase need a working e2e runner, and D-1 requires it to be recorded, not hidden.

---

## Phase 1: Payload reference formatter (engine)

**Implements:** FR-013, FR-040, FR-041, FR-042, CON-003, CON-007 | **Satisfies:** AC-1.1 (expression text), AC-1.3, AC-1.4, AC-2.1, AC-2.2; SC-001 (Appendix A cases 1–22 and 25)
**Files:** `packages/engine/src/fieldReferences.ts`, `packages/engine/src/index.ts`
**Interfaces:** Consumes: the Phase 0 test `packages/engine/test/payloadReferences.test.ts`. Produces, exported from `@ryanmakes/eb_engine`:
- `type PayloadPathSegment = string | number`
- `type PayloadPath = readonly PayloadPathSegment[]`
- `type PayloadReferenceRoot = { kind: 'triggerBody' | 'triggerOutputs' } | { kind: 'body' | 'outputs'; actionName: string }`
- `interface PayloadReference { root: PayloadReferenceRoot; path: PayloadPath }`
- `formatPayloadRoot(root: PayloadReferenceRoot): string`
- `formatPayloadReference(reference: PayloadReference): string`

A pure string formatter, kept in the same module as `formatFieldReference` so that both share `quotePathSegment`. It returns the bare expression; the copy format belongs to the UI (Phase 6).

- [ ] Run: `npx vitest run packages/engine/test/payloadReferences.test.ts`. Expected: FAIL (`formatPayloadReference is not a function`).

- [ ] Replace `packages/engine/src/fieldReferences.ts` with:

  ```ts
  import type { ExpressionMode, FieldDefinition } from './types';

  function quotePathSegment(segment: string): string {
    return segment.replaceAll("'", "''");
  }

  export function formatFieldReference(field: FieldDefinition, mode: ExpressionMode): string {
    const root = mode === 'triggerCondition' ? 'triggerBody()' : 'item()';
    return field.path.reduce((expression, segment) => {
      const accessor = '?';
      return `${expression}${accessor}['${quotePathSegment(segment)}']`;
    }, root);
  }

  /** One step into a pasted payload: an object key (string) or an array index (number). */
  export type PayloadPathSegment = string | number;
  export type PayloadPath = readonly PayloadPathSegment[];

  /** Where the pasted payload came from, which decides the reference's root function. */
  export type PayloadReferenceRoot =
    | { kind: 'triggerBody' | 'triggerOutputs' }
    | { kind: 'body' | 'outputs'; actionName: string };

  export interface PayloadReference {
    root: PayloadReferenceRoot;
    path: PayloadPath;
  }

  /**
   * Trims the name and turns each run of whitespace into one underscore. Case is
   * kept: flow expressions match action names case-sensitively.
   */
  function normalizeActionName(name: string): string {
    return name.trim().replace(/\s+/g, '_');
  }

  export function formatPayloadRoot(root: PayloadReferenceRoot): string {
    if (root.kind === 'body' || root.kind === 'outputs') {
      return `${root.kind}('${quotePathSegment(normalizeActionName(root.actionName))}')`;
    }
    return `${root.kind}()`;
  }

  /**
   * The root expression plus one accessor per path segment, and nothing else: a
   * key becomes ?['key'] with apostrophes doubled, an index becomes [n]. Returns
   * the bare expression; wrapping it for use inside text is the caller's choice.
   */
  export function formatPayloadReference({ root, path }: PayloadReference): string {
    return path.reduce<string>(
      (expression, segment) =>
        typeof segment === 'number'
          ? `${expression}[${segment}]`
          : `${expression}?['${quotePathSegment(segment)}']`,
      formatPayloadRoot(root),
    );
  }
  ```

- [ ] In `packages/engine/src/index.ts`, replace `export { formatFieldReference } from './fieldReferences';` with:

  ```ts
  export type {
    PayloadPath,
    PayloadPathSegment,
    PayloadReference,
    PayloadReferenceRoot,
  } from './fieldReferences';
  export { formatFieldReference, formatPayloadReference, formatPayloadRoot } from './fieldReferences';
  ```

- [ ] Run: `npx vitest run packages/engine`. Expected: PASS, all engine files. `payloadReferences.test.ts` reports 29 passed, and the existing formatter, trigger, filterArray, diagnostics and predicate-root tests are unchanged (CON-003).
- [ ] Run: `npm run typecheck`. Expected: exit 0. This also rebuilds `packages/engine/dist`, which builder-ui tests import.
- [ ] Commit: `feat(engine): format payload references from a source root and a typed path`

---

## Phase 2: Truthful copy in both hosts

**Implements:** FR-051 (the route is unchanged), FR-054 (a readable reason), FR-071, FR-072, FR-073, CON-006 | **Satisfies:** AC-4.6, AC-6.2 (the refusal path); SC-007 (simulated host, unit level)
**Files:** `packages/platform/src/pptbAdapter.ts`, `packages/platform/src/webAdapter.ts`, `packages/builder-ui/src/app/ExpressionBuilderShell.tsx` (`exportDocument` only), `packages/builder-ui/test/copyFailures.test.tsx` (new)
**Interfaces:** Consumes: the Phase 0 adapter tests. Produces:
- `PlatformAdapter.copyToClipboard(text)` now rejects instead of resolving silently:
  - PPTB without `utils.copyToClipboard`: `Error('the host does not provide a clipboard API')`;
  - web without `navigator.clipboard`: `Error('the browser clipboard is not available here')`;
  - a host or browser rejection passes through unchanged.
- Phase 9 shows `error.message` as the reason.

Copying must never report success that did not happen (R-2). The adapters reject, Condition Copy keeps its existing error notification, and Export reports the failure instead of leaving an unhandled rejection.

- [ ] Run: `npx vitest run packages/platform/test`. Expected: FAIL, the three copy tests from Phase 0.

- [ ] In `packages/platform/src/pptbAdapter.ts`, replace the `copyToClipboard` member of `adapter` with:

  ```ts
      async copyToClipboard(text) {
        // Resolving here would let every caller report a copy that never
        // happened, so a host without the clipboard API is a failure.
        if (!api?.utils?.copyToClipboard) {
          throw new Error('the host does not provide a clipboard API');
        }
        await api.utils.copyToClipboard(text);
      },
  ```

- [ ] In `packages/platform/src/webAdapter.ts`, replace the `copyToClipboard` member with:

  ```ts
      async copyToClipboard(text) {
        // Insecure contexts have no navigator.clipboard; name the problem instead
        // of surfacing a TypeError about reading writeText of undefined.
        if (!navigator.clipboard) {
          throw new Error('the browser clipboard is not available here');
        }
        await navigator.clipboard.writeText(text);
      },
  ```

- [ ] Run: `npx vitest run packages/platform/test`. Expected: PASS.

- [ ] Write `packages/builder-ui/test/copyFailures.test.tsx`:

  ```tsx
  // @vitest-environment jsdom
  import '@testing-library/jest-dom/vitest';
  import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
  import { afterEach, describe, expect, it, vi } from 'vitest';
  import { ExpressionBuilderShell } from '../src/app/ExpressionBuilderShell';
  import { sampleDocument } from '../src/app/sampleData';

  afterEach(() => cleanup());

  /** A host whose clipboard write always fails, like PPTB without a clipboard API. */
  function createRefusingAdapter(): PlatformAdapter {
    return {
      copyToClipboard: vi.fn(async () => {
        throw new Error('the host does not provide a clipboard API');
      }),
      notify: vi.fn(async () => undefined),
      getTheme: vi.fn(async () => 'light' as const),
      onThemeChanged: vi.fn(() => () => undefined),
      settings: {
        // Onboarding already seen, so its modal does not take focus mid-test.
        get: vi.fn(async (key: string) => (key === 'eb.onboarding.seen.v1' ? '1' : null)),
        set: vi.fn(async () => undefined),
        remove: vi.fn(async () => undefined),
      },
      getDataverseFields: vi.fn(async () => []),
    };
  }

  describe('copy failures in the Condition builder (FR-072)', () => {
    it('reports an Export the host refused instead of claiming success (FR-072)', async () => {
      const user = userEvent.setup();
      const adapter = createRefusingAdapter();
      render(<ExpressionBuilderShell adapter={adapter} initialDocument={sampleDocument} />);

      await user.click(screen.getByRole('button', { name: 'Export' }));

      await waitFor(() =>
        expect(adapter.notify).toHaveBeenCalledWith(
          'Could not copy expression JSON: the host does not provide a clipboard API',
          'error',
        ),
      );
      expect(adapter.notify).not.toHaveBeenCalledWith('Expression JSON copied to clipboard.', 'success');
    });

    it('keeps the Condition Copy error notification (FR-072)', async () => {
      const user = userEvent.setup();
      const adapter = createRefusingAdapter();
      render(<ExpressionBuilderShell adapter={adapter} initialDocument={sampleDocument} />);

      await user.click(within(screen.getByRole('region', { name: 'Expression Preview' })).getByRole('button', { name: 'Copy' }));

      await waitFor(() =>
        expect(adapter.notify).toHaveBeenCalledWith(
          'Could not copy expression: the host does not provide a clipboard API',
          'error',
        ),
      );
      expect(screen.queryByText('Expression copied')).not.toBeInTheDocument();
    });
  });
  ```

- [ ] Run: `npx vitest run packages/builder-ui/test/copyFailures.test.tsx`. Expected: FAIL. The Export test gets no error notification, and Vitest reports the unhandled rejection from `exportDocument`. The Condition Copy test passes.

- [ ] In `packages/builder-ui/src/app/ExpressionBuilderShell.tsx`, replace `exportDocument` with:

  ```tsx
    /** Copies the current document as saved-expression JSON to the clipboard. */
    const exportDocument = async () => {
      try {
        await adapter.copyToClipboard(serializeSavedExpression(document));
      } catch (err) {
        await adapter.notify(
          `Could not copy expression JSON: ${err instanceof Error ? err.message : 'clipboard unavailable'}`,
          'error',
        );
        return;
      }
      await adapter.notify('Expression JSON copied to clipboard.', 'success');
    };
  ```

- [ ] Run: `npx vitest run packages/builder-ui/test/copyFailures.test.tsx packages/builder-ui/test/sharedBuilderUi.test.tsx`. Expected: PASS, including the existing import/export round trip.
- [ ] Commit: `fix(platform): reject copies the host cannot make, and report failed exports`

---

## Phase 3: Payload parser and limits

**Implements:** FR-021, FR-022, FR-023, FR-024, FR-028, FR-037 (the parser's key order and own keys), CON-007 | **Satisfies:** AC-4.1, AC-4.2 and AC-4.3 (the messages)
**Files:** `packages/builder-ui/src/importExport/jsonPayload.ts` (new)
**Interfaces:** Consumes: `PayloadPath` from `@ryanmakes/eb_engine` (Phase 1, type only). Produces:
- constants: `MAX_SAMPLE_BYTES` (1,048,576), `MAX_VALUE_COUNT` (10,000), `MAX_NESTING_DEPTH` (64), `PARSE_MESSAGES`;
- types:
  - `PayloadValueType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array'`;
  - `ParsedPayload { value: unknown; valueCount: number; text: string }`;
  - `ParsePayloadResult = { ok: true; payload: ParsedPayload } | { ok: false; message: string }`;
  - `PathLookup = { found: true; value: unknown } | { found: false }`;
- functions:
  - `parsePayload(text: string): ParsePayloadResult`;
  - `isJsonObject(value: unknown): value is Record<string, unknown>`;
  - `payloadValueType(value: unknown): PayloadValueType`;
  - `pathKey(path: PayloadPath): string`;
  - `keyToPath(key: string): PayloadPath`;
  - `valueAtPath(root: unknown, path: PayloadPath): PathLookup`.

The checks run in the spec's order and stop at the first failure. The two walks are iterative, so a 10,000-deep sample cannot overflow the stack. Lookups use own properties only, so `constructor` and `__proto__` never resolve through the prototype. No parser dependency is added.

- [ ] Run: `npx vitest run packages/builder-ui/test/jsonPayload.test.ts`. Expected: FAIL (the module does not exist).

- [ ] Create `packages/builder-ui/src/importExport/jsonPayload.ts`:

  ```ts
  import type { PayloadPath } from '@ryanmakes/eb_engine';

  /**
   * Provisional limits (spec FR-024). The SC-006 benchmark confirms or changes
   * them before release; the messages below are built from these values so a
   * change here updates what the user reads.
   */
  export const MAX_SAMPLE_BYTES = 1_048_576;
  export const MAX_VALUE_COUNT = 10_000;
  export const MAX_NESTING_DEPTH = 64;

  export const PARSE_MESSAGES = {
    empty: 'Paste a sample before parsing.',
    tooLarge: `Sample is larger than ${MAX_SAMPLE_BYTES / 1_048_576} MiB. Trim it to the part you need.`,
    invalidPrefix: 'Not valid JSON: ',
    tooManyValues: `Sample has more than ${MAX_VALUE_COUNT.toLocaleString('en-US')} values. Trim it to the part you need.`,
    tooDeep: `Sample is nested deeper than ${MAX_NESTING_DEPTH} levels.`,
  } as const;

  export type PayloadValueType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';

  export interface ParsedPayload {
    /** What JSON.parse returned for `text`. */
    value: unknown;
    /** The root plus every object, array and leaf inside it. */
    valueCount: number;
    /** The exact text that was parsed; the stale-sample status compares against it. */
    text: string;
  }

  export type ParsePayloadResult =
    | { ok: true; payload: ParsedPayload }
    | { ok: false; message: string };

  /**
   * Runs the spec's checks in order and stops at the first failure (FR-021):
   * empty, size, syntax, value count, depth. Parsing is the platform's own
   * JSON.parse, so comments, trailing commas and single quotes are rejected and
   * a repeated key keeps its last value (FR-023).
   */
  export function parsePayload(text: string): ParsePayloadResult {
    if (text.trim() === '') return { ok: false, message: PARSE_MESSAGES.empty };
    if (utf8ByteLength(text) > MAX_SAMPLE_BYTES) return { ok: false, message: PARSE_MESSAGES.tooLarge };

    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return { ok: false, message: `${PARSE_MESSAGES.invalidPrefix}${reason}` };
    }

    const valueCount = countValues(value);
    if (valueCount === null) return { ok: false, message: PARSE_MESSAGES.tooManyValues };
    if (exceedsDepth(value)) return { ok: false, message: PARSE_MESSAGES.tooDeep };

    return { ok: true, payload: { value, valueCount, text } };
  }

  export function isJsonObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  export function payloadValueType(value: unknown): PayloadValueType {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'object';
  }

  /**
   * Collision-free row identity (CON-007): the path keeps its types, so the key
   * "0" and the index 0 produce different identities, and no key can be confused
   * with a separator.
   */
  export function pathKey(path: PayloadPath): string {
    return JSON.stringify(path);
  }

  export function keyToPath(key: string): PayloadPath {
    return JSON.parse(key) as PayloadPath;
  }

  export type PathLookup = { found: true; value: unknown } | { found: false };

  /**
   * Follows own members and in-range array elements only, so a key such as
   * "constructor" never resolves through the prototype.
   */
  export function valueAtPath(root: unknown, path: PayloadPath): PathLookup {
    let current = root;
    for (const segment of path) {
      if (typeof segment === 'number') {
        if (!Array.isArray(current) || !Number.isInteger(segment) || segment < 0 || segment >= current.length) {
          return { found: false };
        }
        current = current[segment];
      } else {
        if (!isJsonObject(current) || !Object.hasOwn(current, segment)) return { found: false };
        current = current[segment];
      }
    }
    return { found: true, value: current };
  }

  function childValues(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (isJsonObject(value)) return Object.values(value);
    return [];
  }

  /** Every UTF-16 code unit needs at least one UTF-8 byte, so long text is rejected unencoded. */
  function utf8ByteLength(text: string): number {
    if (text.length > MAX_SAMPLE_BYTES) return text.length;
    return new TextEncoder().encode(text).length;
  }

  /** Iterative so deep samples cannot overflow the stack; stops once past the limit (FR-022). */
  function countValues(root: unknown): number | null {
    let count = 1;
    const pending: unknown[] = [root];
    while (pending.length > 0) {
      const children = childValues(pending.pop());
      count += children.length;
      if (count > MAX_VALUE_COUNT) return null;
      for (const child of children) pending.push(child);
    }
    return count;
  }

  function exceedsDepth(root: unknown): boolean {
    const pending: Array<[unknown, number]> = [[root, 0]];
    for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
      const [value, depth] = next;
      if (depth > MAX_NESTING_DEPTH) return true;
      for (const child of childValues(value)) pending.push([child, depth + 1]);
    }
    return false;
  }
  ```

- [ ] Run: `npx vitest run packages/builder-ui/test/jsonPayload.test.ts`. Expected: PASS, 15 passed.
- [ ] Commit: `feat(builder-ui): parse pasted payloads with ordered checks and named limits`

---

## Phase 4: Highlighting references

**Implements:** FR-046 | **Satisfies:** AC-1.1 (the displayed text equals what Copy writes)
**Files:** `packages/builder-ui/src/components/ExpressionPreview.tsx`, `packages/builder-ui/test/expressionPreview.test.tsx` (new)
**Interfaces:** Consumes: nothing. Produces: `ExpressionPreview({ expression, label })` with an unchanged signature. It now also treats `outputs`, `body`, `triggerOutputs` and `items` as functions, `'…''…'` as one string, and `[ ] { }` as symbols. Phase 9 uses it with `label="Reference expression"`.

Display only. The tokens always join back into the exact expression, so the Condition builder's preview shows the same text as before and only its colours change.

- [ ] Write `packages/builder-ui/test/expressionPreview.test.tsx`:

  ```tsx
  // @vitest-environment jsdom
  import '@testing-library/jest-dom/vitest';
  import { cleanup, render, screen } from '@testing-library/react';
  import { afterEach, describe, expect, it } from 'vitest';
  import { ExpressionPreview } from '../src/components/ExpressionPreview';

  afterEach(() => cleanup());

  function renderPreview(expression: string) {
    render(<ExpressionPreview expression={expression} label="Preview under test" />);
    const preview = screen.getByLabelText('Preview under test');
    const tokens = (className: string) =>
      [...preview.querySelectorAll(`.${className}`)].map((element) => element.textContent);
    return { preview, tokens };
  }

  describe('ExpressionPreview highlighting (FR-046)', () => {
    it.each([
      "outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']",
      "@{outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']}",
      "triggerBody()?['O''Brien']",
      "triggerBody()?['']",
      "outputs('Compose')?['matrix'][0][1]",
      "body('Get_Bob''s_items')",
      "@and(equals(triggerBody()?['Status'],'Approved'),greater(triggerBody()?['Amount'],5000))",
      "@equals(toLower(item()?['Approver']),toLower('finance'))",
    ])('shows exactly the text it was given: %s', (expression) => {
      expect(renderPreview(expression).preview.textContent).toBe(expression);
    });

    it('colours the payload root functions as functions', () => {
      for (const name of ['outputs', 'body', 'triggerBody', 'triggerOutputs', 'items']) {
        cleanup();
        expect(renderPreview(`${name}()`).tokens('fn')).toEqual([name]);
      }
    });

    it('keeps a string with doubled apostrophes as one string', () => {
      expect(renderPreview("triggerBody()?['O''Brien']").tokens('str')).toEqual(["'O''Brien'"]);
    });

    it('treats brackets, braces and the at sign as symbols, and an index as a number', () => {
      const { tokens } = renderPreview('@{triggerBody()[0]}');

      expect(tokens('sym')).toEqual(['@', '{', '(', ')', '[', ']', '}']);
      expect(tokens('num')).toEqual(['0']);
    });

    it('does not colour a key that happens to be a function name', () => {
      expect(renderPreview("triggerBody()?['body']").tokens('fn')).toEqual(['triggerBody']);
    });
  });
  ```

- [ ] Run: `npx vitest run packages/builder-ui/test/expressionPreview.test.tsx`. Expected: FAIL, 3 failed:
  - the root functions test (`outputs`, `body`, `triggerOutputs` and `items` are not `.fn`);
  - the doubled-apostrophe test (split into `'O'` and `'Brien'`);
  - the symbols test (`[`, `{` and `}` are not `.sym`).

  The eight text-equality cases already pass.

- [ ] Replace `packages/builder-ui/src/components/ExpressionPreview.tsx` with:

  ```tsx
  const FUNCTION_NAMES =
    'equals|greater|less|greaterOrEquals|lessOrEquals|contains|startsWith|endsWith|empty|notEmpty|addDays|utcNow|item|items|triggerBody|triggerOutputs|outputs|body|formatDateTime|toLower|trim|length|coalesce|split|replace|concat|union|intersection';

  const KEYWORD = /^(?:and|or|not)$/;
  const FUNCTION = new RegExp(`^(?:${FUNCTION_NAMES})$`);
  // A doubled apostrophe stays inside its string: 'O''Brien' is one token.
  const STRING = /^'(?:[^']|'')*'$/;
  const NUMBER = /^\d+(?:\.\d+)?$/;
  const SYMBOL = /^[(),@?[\]{}]$/;
  const TOKENS = new RegExp(`(\\b(?:and|or|not|${FUNCTION_NAMES})\\b|'(?:[^']|'')*'|\\d+(?:\\.\\d+)?|[(),@?[\\]{}])`);

  function SyntaxPart({ part }: { part: string }) {
    if (KEYWORD.test(part)) {
      return <span className="kw">{part}</span>;
    }
    if (FUNCTION.test(part)) {
      return <span className="fn">{part}</span>;
    }
    if (STRING.test(part)) {
      return <span className="str">{part}</span>;
    }
    if (NUMBER.test(part)) {
      return <span className="num">{part}</span>;
    }
    if (SYMBOL.test(part)) {
      return <span className="sym">{part}</span>;
    }
    return <span>{part}</span>;
  }

  /** Display only: the tokens always join back into exactly the expression text. */
  function tokenizeExpression(expression: string): string[] {
    return expression.split(TOKENS).filter(Boolean);
  }

  interface ExpressionPreviewProps {
    expression: string;
    label?: string;
  }

  export function ExpressionPreview({ expression, label = 'Generated expression' }: ExpressionPreviewProps) {
    return (
      <pre className="eb-preview" aria-label={label}>
        {tokenizeExpression(expression).map((part, index) => (
          <SyntaxPart key={`${part}-${index}`} part={part} />
        ))}
      </pre>
    );
  }
  ```

- [ ] Run: `npx vitest run packages/builder-ui/test/expressionPreview.test.tsx packages/builder-ui/test/expressionDocumentPanel.test.tsx packages/builder-ui/test/sharedBuilderUi.test.tsx`. Expected: PASS.
- [ ] Commit: `feat(builder-ui): highlight payload roots, doubled apostrophes and brackets in previews`

---

## Phase 5: Payload tree model

**Implements:** FR-031, FR-032, FR-033, FR-035, FR-037, FR-039, FR-043 (the summary text), CON-007 | **Satisfies:** AC-1.1 (card header summary), AC-1.3 (the rows for containers, nulls and the root)
**Files:** `packages/builder-ui/src/workbench/payloadTreeModel.ts` (new), `packages/builder-ui/test/payloadTreeModel.test.ts` (new)
**Interfaces:** Consumes, from Phase 3: `isJsonObject`, `keyToPath`, `pathKey`, `payloadValueType`, `valueAtPath`, `PayloadValueType`. Produces:
- constants: `ARRAY_PAGE_SIZE` (20), `OBJECT_PAGE_SIZE` (500), `ROOT_KEY`;
- types:
  - `PayloadValueRow { kind: 'value'; key; path; parentKey: string | null; level; posInSet; setSize; label; labelKind: 'root' | 'key' | 'index'; type; preview; expandable; expanded }`;
  - `PayloadMoreRow { kind: 'more'; key; parentKey: string; level; posInSet; setSize; hiddenCount }`;
  - `PayloadTreeRow = PayloadValueRow | PayloadMoreRow`;
- functions:
  - `countLabel(count: number, noun: string): string`;
  - `previewValue(value: unknown): string`;
  - `selectionSummary(value: unknown): string`;
  - `segmentLabel(segment: string | number): string`;
  - `buildVisibleRows(root: unknown, expanded: ReadonlySet<string>, showAll: ReadonlySet<string>): PayloadTreeRow[]`;
  - `firstHiddenChildKey(root: unknown, row: PayloadMoreRow): string | null`.

A pure model of the rows that a flat APG tree renders, with ARIA level, position and set size already computed. Row keys come from `pathKey`, so they are collision-free.

- [ ] Write `packages/builder-ui/test/payloadTreeModel.test.ts`:

  ```ts
  import { describe, expect, it } from 'vitest';
  import { pathKey } from '../src/importExport/jsonPayload';
  import {
    ARRAY_PAGE_SIZE,
    OBJECT_PAGE_SIZE,
    ROOT_KEY,
    buildVisibleRows,
    firstHiddenChildKey,
    previewValue,
    selectionSummary,
    type PayloadMoreRow,
  } from '../src/workbench/payloadTreeModel';
  import { fixtureA1 } from './fixtures/jsonReferenceFixtures';

  const a1 = JSON.parse(fixtureA1) as unknown;
  const none = new Set<string>();

  describe('buildVisibleRows', () => {
    it('shows only the root row until the root is expanded', () => {
      const rows = buildVisibleRows(a1, none, none);

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ key: ROOT_KEY, labelKind: 'root', level: 1, posInSet: 1, setSize: 1, expandable: true, expanded: false });
    });

    it('lists members in parser order with level, position and set size', () => {
      const rows = buildVisibleRows(a1, new Set([ROOT_KEY, pathKey(['body'])]), none);

      expect(rows.map((row) => (row.kind === 'value' ? row.label : 'more'))).toEqual([
        '',
        'statusCode',
        'headers',
        'body',
        'value',
        '@odata.nextLink',
      ]);
      expect(rows[3]).toMatchObject({ level: 2, posInSet: 3, setSize: 3, type: 'object', preview: '{2}', expanded: true });
      expect(rows[4]).toMatchObject({ level: 3, posInSet: 1, setSize: 2, type: 'array', preview: '2 items', expanded: false });
      expect(rows[5]).toMatchObject({ type: 'null', preview: 'null', expandable: false });
    });

    it('labels array elements [n] and previews each type (FR-031, FR-032)', () => {
      const expanded = new Set([ROOT_KEY, pathKey(['body']), pathKey(['body', 'value']), pathKey(['body', 'value', 0])]);
      const rows = buildVisibleRows(a1, expanded, none);
      const first = rows.find((row) => row.key === pathKey(['body', 'value', 0]));
      const title = rows.find((row) => row.key === pathKey(['body', 'value', 0, 'Title']));
      const urgent = rows.find((row) => row.key === pathKey(['body', 'value', 0, 'Urgent']));

      expect(first).toMatchObject({ label: '[0]', labelKind: 'index', preview: '{6}' });
      expect(title).toMatchObject({ label: 'Title', type: 'string', preview: '"Laptop refresh"' });
      expect(urgent).toMatchObject({ type: 'boolean', preview: 'false' });
    });

    it('treats empty containers as selectable leaves without a chevron', () => {
      const rows = buildVisibleRows({ list: [], map: {} }, new Set([ROOT_KEY, pathKey(['list']), pathKey(['map'])]), none);

      expect(rows.slice(1)).toMatchObject([
        { label: 'list', preview: '0 items', expandable: false, expanded: false },
        { label: 'map', preview: '{0}', expandable: false, expanded: false },
      ]);
    });

    it('pages an array after 20 elements until "Show N more" is used (FR-035)', () => {
      const list = Array.from({ length: 45 }, (_, index) => index);
      const paged = buildVisibleRows(list, new Set([ROOT_KEY]), none);
      const more = paged.at(-1) as PayloadMoreRow;

      expect(ARRAY_PAGE_SIZE).toBe(20);
      expect(paged).toHaveLength(1 + 20 + 1);
      expect(more).toMatchObject({ kind: 'more', parentKey: ROOT_KEY, hiddenCount: 25, level: 2, posInSet: 21, setSize: 21 });
      expect(firstHiddenChildKey(list, more)).toBe(pathKey([20]));
      expect(buildVisibleRows(list, new Set([ROOT_KEY]), new Set([ROOT_KEY]))).toHaveLength(1 + 45);
    });

    it('pages only very wide objects (FR-039)', () => {
      const wide = Object.fromEntries(Array.from({ length: OBJECT_PAGE_SIZE + 3 }, (_, index) => [`k${index}`, index]));
      const rows = buildVisibleRows(wide, new Set([ROOT_KEY]), none);
      const more = rows.at(-1) as PayloadMoreRow;

      expect(rows).toHaveLength(1 + OBJECT_PAGE_SIZE + 1);
      expect(more.hiddenCount).toBe(3);
      expect(firstHiddenChildKey(wide, more)).toBe(pathKey([`k${OBJECT_PAGE_SIZE}`]));
      expect(buildVisibleRows({ a: 1, b: 2 }, new Set([ROOT_KEY]), none)).toHaveLength(3);
    });

    it('gives a key "0" and an index 0 different rows (CON-007)', () => {
      const rows = buildVisibleRows({ '0': ['zero'] }, new Set([ROOT_KEY, pathKey(['0'])]), none);

      expect(rows.map((row) => row.key)).toEqual([ROOT_KEY, pathKey(['0']), pathKey(['0', 0])]);
    });

    it('shows a top-level primitive as the root row alone', () => {
      expect(buildVisibleRows(42, new Set([ROOT_KEY]), none)).toMatchObject([{ key: ROOT_KEY, type: 'number', preview: '42', expandable: false }]);
    });
  });

  describe('previews and summaries', () => {
    it('previews one item in the singular and cuts long strings', () => {
      expect(previewValue(['a'])).toBe('1 item');
      expect(previewValue('x'.repeat(500))).toHaveLength(120);
      expect(previewValue('x'.repeat(500)).endsWith('…')).toBe(true);
    });

    it('summarises a selection as its type, plus the JSON value for leaves (FR-043)', () => {
      expect(selectionSummary('dana@contoso.com')).toBe('string · "dana@contoso.com"');
      expect(selectionSummary(5000)).toBe('number · 5000');
      expect(selectionSummary(false)).toBe('boolean · false');
      expect(selectionSummary(null)).toBe('null');
      expect(selectionSummary({})).toBe('object');
      expect(selectionSummary([])).toBe('array');
    });
  });
  ```

- [ ] Run: `npx vitest run packages/builder-ui/test/payloadTreeModel.test.ts`. Expected: FAIL (the module does not exist).

- [ ] Create `packages/builder-ui/src/workbench/payloadTreeModel.ts`:

  ```ts
  import type { PayloadPath } from '@ryanmakes/eb_engine';
  import {
    isJsonObject,
    keyToPath,
    pathKey,
    payloadValueType,
    valueAtPath,
    type PayloadValueType,
  } from '../importExport/jsonPayload';

  /** Arrays show this many elements, then a "Show N more" row (FR-035). */
  export const ARRAY_PAGE_SIZE = 20;

  /**
   * Very wide objects page the same way (FR-039). Building 10,000 plain rows took
   * 1.8 s of DOM work in Chromium, far over the 1 s budget for expanding one node;
   * 500 rows stay well inside the 200 ms target. The SC-006 benchmark confirms it.
   */
  export const OBJECT_PAGE_SIZE = 500;

  export const ROOT_KEY = pathKey([]);

  /** Previews longer than this are cut in JS as well as by CSS, so a huge string never reaches the DOM. */
  const PREVIEW_MAX_LENGTH = 120;

  export interface PayloadValueRow {
    kind: 'value';
    key: string;
    path: PayloadPath;
    parentKey: string | null;
    /** aria-level: the root row is level 1. */
    level: number;
    posInSet: number;
    setSize: number;
    /** The object key or `[index]`; empty for the root row, whose label is the live root expression. */
    label: string;
    labelKind: 'root' | 'key' | 'index';
    type: PayloadValueType;
    preview: string;
    expandable: boolean;
    expanded: boolean;
  }

  export interface PayloadMoreRow {
    kind: 'more';
    key: string;
    parentKey: string;
    level: number;
    posInSet: number;
    setSize: number;
    hiddenCount: number;
  }

  export type PayloadTreeRow = PayloadValueRow | PayloadMoreRow;

  export function countLabel(count: number, noun: string): string {
    return `${count} ${noun}${count === 1 ? '' : 's'}`;
  }

  /** One-line preview (FR-032). */
  export function previewValue(value: unknown): string {
    if (Array.isArray(value)) return countLabel(value.length, 'item');
    if (isJsonObject(value)) return `{${Object.keys(value).length}}`;
    if (typeof value === 'string') return truncate(JSON.stringify(value));
    return String(value);
  }

  /** Reference card header: the type, then the JSON value for strings, numbers and booleans (FR-043). */
  export function selectionSummary(value: unknown): string {
    const type = payloadValueType(value);
    if (type === 'string' || type === 'number' || type === 'boolean') {
      return `${type} · ${truncate(JSON.stringify(value))}`;
    }
    return type;
  }

  /** Breadcrumb and tree label for one path segment; the empty key shows as "". */
  export function segmentLabel(segment: string | number): string {
    if (typeof segment === 'number') return `[${segment}]`;
    return segment === '' ? '""' : segment;
  }

  /**
   * The rows a flat APG tree renders: every value whose ancestors are all
   * expanded, in document order, plus one "Show N more" row for each expanded
   * container that still hides children.
   */
  export function buildVisibleRows(
    root: unknown,
    expanded: ReadonlySet<string>,
    showAll: ReadonlySet<string>,
  ): PayloadTreeRow[] {
    const rows: PayloadTreeRow[] = [];

    const visit = (
      value: unknown,
      path: PayloadPath,
      parentKey: string | null,
      level: number,
      posInSet: number,
      setSize: number,
    ): void => {
      const key = pathKey(path);
      const keys = isJsonObject(value) ? Object.keys(value) : null;
      const childCount = Array.isArray(value) ? value.length : (keys?.length ?? 0);
      const isExpanded = childCount > 0 && expanded.has(key);
      const last = path.at(-1);

      rows.push({
        kind: 'value',
        key,
        path,
        parentKey,
        level,
        posInSet,
        setSize,
        label: last === undefined ? '' : segmentLabel(last),
        labelKind: last === undefined ? 'root' : typeof last === 'number' ? 'index' : 'key',
        type: payloadValueType(value),
        preview: previewValue(value),
        expandable: childCount > 0,
        expanded: isExpanded,
      });
      if (!isExpanded) return;

      const pageSize = Array.isArray(value) ? ARRAY_PAGE_SIZE : OBJECT_PAGE_SIZE;
      const shownCount = showAll.has(key) ? childCount : Math.min(childCount, pageSize);
      const hiddenCount = childCount - shownCount;
      const visibleSetSize = shownCount + (hiddenCount > 0 ? 1 : 0);

      for (let index = 0; index < shownCount; index += 1) {
        if (keys === null) {
          visit((value as unknown[])[index], [...path, index], key, level + 1, index + 1, visibleSetSize);
        } else {
          const member = keys[index];
          visit((value as Record<string, unknown>)[member], [...path, member], key, level + 1, index + 1, visibleSetSize);
        }
      }
      if (hiddenCount > 0) {
        rows.push({
          kind: 'more',
          key: `${key}+more`,
          parentKey: key,
          level: level + 1,
          posInSet: visibleSetSize,
          setSize: visibleSetSize,
          hiddenCount,
        });
      }
    };

    visit(root, [], null, 1, 1, 1);
    return rows;
  }

  /** The first child a "Show N more" row reveals, which takes focus after it is activated. */
  export function firstHiddenChildKey(root: unknown, row: PayloadMoreRow): string | null {
    const parentPath = keyToPath(row.parentKey);
    const parent = valueAtPath(root, parentPath);
    if (!parent.found) return null;
    const index = row.posInSet - 1;
    if (Array.isArray(parent.value)) return pathKey([...parentPath, index]);
    if (isJsonObject(parent.value)) {
      const member = Object.keys(parent.value)[index];
      return member === undefined ? null : pathKey([...parentPath, member]);
    }
    return null;
  }

  function truncate(text: string): string {
    return text.length > PREVIEW_MAX_LENGTH ? `${text.slice(0, PREVIEW_MAX_LENGTH - 1)}…` : text;
  }
  ```

- [ ] Run: `npx vitest run packages/builder-ui/test/payloadTreeModel.test.ts`. Expected: PASS, 10 passed.
- [ ] Commit: `feat(builder-ui): model visible payload tree rows with paging`

> **Complexity note.** Gate: Simplicity (building only what the spec requires). Addition: `OBJECT_PAGE_SIZE`, which pages objects with more than 500 members. Justification: FR-039 requires this fallback when wide objects miss the 1 s budget. The raw DOM build of 10,000 rows measured 1.8 s in Chromium, and after this change expanding the 9,999-member benchmark object took 386 ms in the dev build. SC-006 confirms or changes the constant, as it does the FR-024 limits.

---

## Phase 6: JSON reference state

**Implements:** FR-008 (what the state holds), FR-011, FR-012, FR-013 (through the engine), FR-014, FR-015, FR-016, FR-020 (parse only on the parse action), FR-025, FR-026, FR-027, FR-029, FR-044, FR-045, FR-050, FR-052, FR-053 and FR-054 (the status model), FR-055 | **Satisfies:** AC-1.1, AC-1.4, AC-1.5, AC-1.6, AC-2.1, AC-2.3, AC-4.2, AC-4.4, AC-4.5; Appendix A cases 23 and 24
**Files:** `packages/builder-ui/src/workbench/jsonReferenceState.ts` (new), `packages/builder-ui/test/jsonReferenceState.test.ts` (new)
**Interfaces:** Consumes:
- from Phase 1: `formatPayloadReference`, `formatPayloadRoot`, `PayloadPath`, `PayloadReferenceRoot`;
- from Phase 3: `parsePayload`, `isJsonObject`, `keyToPath`, `pathKey`, `valueAtPath`, `ParsedPayload`;
- from Phase 5: `countLabel`.

Produces:
- types:
  - `OutputFrom = 'action' | 'trigger'`;
  - `PayloadShape = 'full' | 'body'`;
  - `CopyFormat = 'bare' | 'inline'`;
  - `CopyStatus = { kind: 'idle' } | { kind: 'copied' } | { kind: 'error'; reason: string }`;
  - `StatusTone = 'muted' | 'good' | 'warn' | 'danger'`;
  - `JsonReferenceState`;
  - `JsonReferenceAction` (`setOutputFrom`, `setShape`, `setActionName`, `setText`, `parse`, `select`, `toggleExpanded`, `showAll`, `setCopyFormat`, `copySucceeded`, `copyFailed`, `resetCopyStatus`);
- `ACTION_NAME_PLACEHOLDER`, `initialJsonReferenceState`, `jsonReferenceReducer(state, action)`;
- selectors, each `(state) => …` except where shown:
  - `isActionNameMissing`, `showActionNameInvalid`;
  - `rootExpression(state, shape?)`, `canCopy`, `copyText`, `expressionPlaceholder`;
  - `parseStatus`, `fixedPositionNote`, `showBodyHint`, `copyStatusView`.

A pure reducer holds everything the user entered or chose. The parse and source rules of FR-016 and FR-025–FR-027 are tested here, without any rendering.

- [ ] Run `npm run typecheck` so `packages/engine/dist` has the Phase 1 exports that this module imports at run time.

- [ ] Write `packages/builder-ui/test/jsonReferenceState.test.ts`:

  ```ts
  import { describe, expect, it } from 'vitest';
  import { pathKey } from '../src/importExport/jsonPayload';
  import {
    canCopy,
    copyStatusView,
    copyText,
    expressionPlaceholder,
    fixedPositionNote,
    initialJsonReferenceState,
    jsonReferenceReducer,
    parseStatus,
    rootExpression,
    showActionNameInvalid,
    showBodyHint,
    type JsonReferenceAction,
    type JsonReferenceState,
  } from '../src/workbench/jsonReferenceState';
  import { composeSample, fixtureA1 } from './fixtures/jsonReferenceFixtures';

  function run(...actions: JsonReferenceAction[]): JsonReferenceState {
    return actions.reduce(jsonReferenceReducer, initialJsonReferenceState);
  }

  const email = ['body', 'value', 0, 'Requester', 'Email'];
  const parsedA1: JsonReferenceAction[] = [
    { type: 'setActionName', value: 'Get items' },
    { type: 'setText', value: fixtureA1 },
    { type: 'parse' },
  ];

  describe('JSON reference state', () => {
    it('starts on Action, Full output, an empty name and the bare format', () => {
      expect(initialJsonReferenceState).toMatchObject({
        outputFrom: 'action',
        shape: 'full',
        actionName: '',
        copyFormat: 'bare',
        copyStatus: { kind: 'idle' },
      });
      expect(parseStatus(initialJsonReferenceState)).toEqual({ text: 'Nothing parsed yet', tone: 'muted' });
      expect(expressionPlaceholder(initialJsonReferenceState)).toBe('Enter an action name');
    });

    it('parses fixture A1, selects the root and expands it (FR-025)', () => {
      const state = run(...parsedA1);

      expect(parseStatus(state)).toEqual({ text: 'Parsed · 25 values', tone: 'good' });
      expect(state.selectedPath).toEqual([]);
      expect(state.expanded).toEqual(new Set([pathKey([])]));
      expect(copyText(state)).toBe("outputs('Get_items')");
    });

    it('builds the spec reference for Email and notes the fixed index (user story 1, scenario 1)', () => {
      const state = run(...parsedA1, { type: 'select', path: email });

      expect(copyText(state)).toBe("outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']");
      expect(fixedPositionNote(state)).toBe('Fixed position [0]: reads that item only, not each item in a loop.');
    });

    it('wraps the reference for the inline format (Appendix A case 23)', () => {
      const state = run(...parsedA1, { type: 'select', path: email }, { type: 'setCopyFormat', value: 'inline' });

      expect(copyText(state)).toBe("@{outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']}");
      expect(copyStatusView(state)).toEqual({ text: 'Inline text: use inside a string', tone: 'muted' });
    });

    it('blocks Copy for a blank name and shows Action_name as the root (Appendix A case 24)', () => {
      const state = run({ type: 'setText', value: fixtureA1 }, { type: 'parse' }, { type: 'setActionName', value: '   ' });

      expect(canCopy(state)).toBe(false);
      expect(copyText(state)).toBeNull();
      expect(expressionPlaceholder(state)).toBe('Enter an action name');
      expect(rootExpression(state)).toBe("outputs('Action_name')");
      expect(rootExpression(state, 'body')).toBe("body('Action_name')");
      expect(showActionNameInvalid(state)).toBe(true);
    });

    it('marks a missing name invalid only after typing or parsing (FR-012)', () => {
      expect(showActionNameInvalid(initialJsonReferenceState)).toBe(false);
      expect(showActionNameInvalid(run({ type: 'parse' }))).toBe(true);
      expect(showActionNameInvalid(run({ type: 'setActionName', value: '' }))).toBe(true);
      expect(showActionNameInvalid(run({ type: 'setOutputFrom', value: 'trigger' }, { type: 'parse' }))).toBe(false);
    });

    it('re-roots without re-parsing when the source changes (FR-016)', () => {
      const selected = run(...parsedA1, { type: 'select', path: email }, { type: 'toggleExpanded', key: pathKey(['body']) });
      const copied = jsonReferenceReducer(selected, { type: 'copySucceeded' });
      const trigger = jsonReferenceReducer(copied, { type: 'setOutputFrom', value: 'trigger' });

      expect(trigger.parsed).toBe(selected.parsed);
      expect(trigger.expanded).toBe(selected.expanded);
      expect(trigger.selectedPath).toBe(selected.selectedPath);
      expect(trigger.copyStatus).toEqual({ kind: 'idle' });
      expect(copyText(trigger)).toBe("triggerOutputs()?['body']?['value'][0]?['Requester']?['Email']");
      expect(copyText(jsonReferenceReducer(trigger, { type: 'setShape', value: 'body' }))).toBe(
        "triggerBody()?['body']?['value'][0]?['Requester']?['Email']",
      );
    });

    it('keeps the action name when switching to Trigger and back (FR-011)', () => {
      const state = run(...parsedA1, { type: 'setOutputFrom', value: 'trigger' }, { type: 'setOutputFrom', value: 'action' });

      expect(state.actionName).toBe('Get items');
      expect(rootExpression(state)).toBe("outputs('Get_items')");
    });

    it('references a Compose output with Action and Full output (user story 1, scenario 4)', () => {
      const state = run(
        { type: 'setActionName', value: 'Compose' },
        { type: 'setText', value: composeSample },
        { type: 'parse' },
        { type: 'select', path: ['customer'] },
      );

      expect(copyText(state)).toBe("outputs('Compose')?['customer']");
    });

    it('hints at a top-level body key under Body only, but never changes the root (FR-015)', () => {
      const body = run(...parsedA1, { type: 'setShape', value: 'body' }, { type: 'select', path: ['body'] });

      expect(showBodyHint(body)).toBe(true);
      expect(copyText(body)).toBe("body('Get_items')?['body']");
      expect(showBodyHint(jsonReferenceReducer(body, { type: 'setShape', value: 'full' }))).toBe(false);
    });

    it('marks the sample stale after an edit and keeps the old tree usable (FR-027)', () => {
      const edited = run(...parsedA1, { type: 'select', path: email }, { type: 'setText', value: `${fixtureA1} ` });

      expect(parseStatus(edited)).toEqual({ text: 'Sample changed. Parse again to update.', tone: 'warn' });
      expect(copyText(edited)).toBe("outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']");
    });

    it('clears the tree and the selection when a parse fails (FR-026)', () => {
      const failed = run(...parsedA1, { type: 'select', path: email }, { type: 'setText', value: '{' }, { type: 'parse' });

      expect(failed.parsed).toBeNull();
      expect(failed.selectedPath).toEqual([]);
      expect(failed.error).toMatch(/^Not valid JSON: /);
      expect(parseStatus(failed)).toEqual({ text: 'Could not parse', tone: 'danger' });
      expect(expressionPlaceholder(failed)).toBe('Parse a sample and select a value');
    });

    it('keeps a selection whose path survives a re-parse, and otherwise selects the root (FR-025)', () => {
      const kept = run(...parsedA1, { type: 'select', path: ['statusCode'] }, { type: 'setText', value: '{"statusCode": 201}' }, { type: 'parse' });
      const reset = run(...parsedA1, { type: 'select', path: email }, { type: 'setText', value: '{"statusCode": 201}' }, { type: 'parse' });

      expect(kept.selectedPath).toEqual(['statusCode']);
      expect(reset.selectedPath).toEqual([]);
    });

    it('keeps surviving expansion, drops the rest and hides revealed elements on re-parse (FR-025)', () => {
      const state = run(
        ...parsedA1,
        { type: 'toggleExpanded', key: pathKey(['body']) },
        { type: 'toggleExpanded', key: pathKey(['headers']) },
        { type: 'showAll', key: pathKey(['body', 'value']) },
        { type: 'setText', value: '{"body": {"value": []}}' },
        { type: 'parse' },
      );

      expect(state.expanded).toEqual(new Set([pathKey([]), pathKey(['body'])]));
      expect(state.showAll.size).toBe(0);
    });

    it('resets the copy status when the selection or the format changes (FR-055)', () => {
      const copied = jsonReferenceReducer(run(...parsedA1), { type: 'copySucceeded' });

      expect(copyStatusView(copied)).toEqual({ text: 'Expression copied', tone: 'good' });
      expect(jsonReferenceReducer(copied, { type: 'select', path: ['statusCode'] }).copyStatus).toEqual({ kind: 'idle' });
      expect(jsonReferenceReducer(copied, { type: 'setCopyFormat', value: 'inline' }).copyStatus).toEqual({ kind: 'idle' });
    });

    it('reports a failed copy with its reason (FR-054)', () => {
      const failed = jsonReferenceReducer(run(...parsedA1), { type: 'copyFailed', reason: 'the host does not provide a clipboard API' });

      expect(copyStatusView(failed)).toEqual({
        text: 'Could not copy expression: the host does not provide a clipboard API',
        tone: 'danger',
      });
    });

    it('lists every index of the path in the fixed-position note', () => {
      const state = run(
        { type: 'setActionName', value: 'Compose' },
        { type: 'setText', value: composeSample },
        { type: 'parse' },
        { type: 'select', path: ['matrix', 0, 1] },
      );

      expect(copyText(state)).toBe("outputs('Compose')?['matrix'][0][1]");
      expect(fixedPositionNote(state)).toBe('Fixed position [0][1]: reads that item only, not each item in a loop.');
    });
  });
  ```

- [ ] Run: `npx vitest run packages/builder-ui/test/jsonReferenceState.test.ts`. Expected: FAIL (the module does not exist).

- [ ] Create `packages/builder-ui/src/workbench/jsonReferenceState.ts`:

  ```ts
  import {
    formatPayloadReference,
    formatPayloadRoot,
    type PayloadPath,
    type PayloadReferenceRoot,
  } from '@ryanmakes/eb_engine';
  import { isJsonObject, keyToPath, parsePayload, pathKey, valueAtPath, type ParsedPayload } from '../importExport/jsonPayload';
  import { countLabel } from './payloadTreeModel';

  export type OutputFrom = 'action' | 'trigger';
  export type PayloadShape = 'full' | 'body';
  export type CopyFormat = 'bare' | 'inline';
  export type CopyStatus = { kind: 'idle' } | { kind: 'copied' } | { kind: 'error'; reason: string };
  export type StatusTone = 'muted' | 'good' | 'warn' | 'danger';

  /**
   * Everything the user entered or chose in JSON reference (FR-008). It lives in
   * memory only: nothing here is ever serialised, stored or sent anywhere.
   */
  export interface JsonReferenceState {
    outputFrom: OutputFrom;
    shape: PayloadShape;
    actionName: string;
    /** Set once the user types a name or selects Parse; a missing name only shows as invalid after that. */
    actionNameTouched: boolean;
    text: string;
    parsed: ParsedPayload | null;
    error: string | null;
    selectedPath: PayloadPath;
    expanded: ReadonlySet<string>;
    showAll: ReadonlySet<string>;
    copyFormat: CopyFormat;
    copyStatus: CopyStatus;
  }

  export type JsonReferenceAction =
    | { type: 'setOutputFrom'; value: OutputFrom }
    | { type: 'setShape'; value: PayloadShape }
    | { type: 'setActionName'; value: string }
    | { type: 'setText'; value: string }
    | { type: 'parse' }
    | { type: 'select'; path: PayloadPath }
    | { type: 'toggleExpanded'; key: string }
    | { type: 'showAll'; key: string }
    | { type: 'setCopyFormat'; value: CopyFormat }
    | { type: 'copySucceeded' }
    | { type: 'copyFailed'; reason: string }
    | { type: 'resetCopyStatus' };

  export const ACTION_NAME_PLACEHOLDER = 'Action_name';

  const IDLE: CopyStatus = { kind: 'idle' };

  export const initialJsonReferenceState: JsonReferenceState = {
    outputFrom: 'action',
    shape: 'full',
    actionName: '',
    actionNameTouched: false,
    text: '',
    parsed: null,
    error: null,
    selectedPath: [],
    expanded: new Set<string>(),
    showAll: new Set<string>(),
    copyFormat: 'bare',
    copyStatus: IDLE,
  };

  export function jsonReferenceReducer(state: JsonReferenceState, action: JsonReferenceAction): JsonReferenceState {
    switch (action.type) {
      // A source change only re-roots the reference (FR-016): no parse, and the
      // tree, its expansion and the selection stay as they are.
      case 'setOutputFrom':
        return { ...state, outputFrom: action.value, copyStatus: IDLE };
      case 'setShape':
        return { ...state, shape: action.value, copyStatus: IDLE };
      case 'setActionName':
        return { ...state, actionName: action.value, actionNameTouched: true, copyStatus: IDLE };
      // Editing keeps the last parsed tree usable; the status turns stale (FR-027).
      case 'setText':
        return { ...state, text: action.value };
      case 'parse':
        return parseSample(state);
      case 'select':
        return { ...state, selectedPath: action.path, copyStatus: IDLE };
      case 'toggleExpanded': {
        const expanded = new Set(state.expanded);
        if (!expanded.delete(action.key)) expanded.add(action.key);
        return { ...state, expanded };
      }
      case 'showAll':
        return { ...state, showAll: new Set(state.showAll).add(action.key) };
      case 'setCopyFormat':
        return { ...state, copyFormat: action.value, copyStatus: IDLE };
      case 'copySucceeded':
        return { ...state, copyStatus: { kind: 'copied' } };
      case 'copyFailed':
        return { ...state, copyStatus: { kind: 'error', reason: action.reason } };
      case 'resetCopyStatus':
        return state.copyStatus.kind === 'idle' ? state : { ...state, copyStatus: IDLE };
    }
  }

  function parseSample(state: JsonReferenceState): JsonReferenceState {
    const result = parsePayload(state.text);
    if (!result.ok) {
      // FR-026: the tree, the value count and the selection go.
      return {
        ...state,
        actionNameTouched: true,
        parsed: null,
        error: result.message,
        selectedPath: [],
        expanded: new Set<string>(),
        showAll: new Set<string>(),
        copyStatus: IDLE,
      };
    }
    // FR-025: keep what still applies to the new sample, expand the root and
    // hide elements that "Show N more" revealed.
    const { value } = result.payload;
    const expanded = new Set([...state.expanded].filter((key) => valueAtPath(value, keyToPath(key)).found));
    expanded.add(pathKey([]));
    return {
      ...state,
      actionNameTouched: true,
      parsed: result.payload,
      error: null,
      selectedPath: valueAtPath(value, state.selectedPath).found ? state.selectedPath : [],
      expanded,
      showAll: new Set<string>(),
      copyStatus: IDLE,
    };
  }

  /** Empty or whitespace-only while Output from is Action (FR-012). */
  export function isActionNameMissing(state: JsonReferenceState): boolean {
    return state.outputFrom === 'action' && state.actionName.trim() === '';
  }

  export function showActionNameInvalid(state: JsonReferenceState): boolean {
    return isActionNameMissing(state) && state.actionNameTouched;
  }

  function referenceRoot(state: JsonReferenceState, shape: PayloadShape, actionName: string): PayloadReferenceRoot {
    if (state.outputFrom === 'trigger') return { kind: shape === 'full' ? 'triggerOutputs' : 'triggerBody' };
    return { kind: shape === 'full' ? 'outputs' : 'body', actionName };
  }

  /** The root to display for a shape; a missing name shows as Action_name (FR-014). */
  export function rootExpression(state: JsonReferenceState, shape: PayloadShape = state.shape): string {
    const actionName = isActionNameMissing(state) ? ACTION_NAME_PLACEHOLDER : state.actionName;
    return formatPayloadRoot(referenceRoot(state, shape, actionName));
  }

  export function canCopy(state: JsonReferenceState): boolean {
    return state.parsed !== null && !isActionNameMissing(state);
  }

  /** Exactly what Copy writes and the expression area shows (FR-046, FR-050, FR-051). */
  export function copyText(state: JsonReferenceState): string | null {
    if (!canCopy(state)) return null;
    const reference = formatPayloadReference({
      root: referenceRoot(state, state.shape, state.actionName),
      path: state.selectedPath,
    });
    return state.copyFormat === 'inline' ? `@{${reference}}` : reference;
  }

  /** FR-044. */
  export function expressionPlaceholder(state: JsonReferenceState): string | null {
    if (canCopy(state)) return null;
    return isActionNameMissing(state) ? 'Enter an action name' : 'Parse a sample and select a value';
  }

  /** FR-029. */
  export function parseStatus(state: JsonReferenceState): { text: string; tone: StatusTone } {
    if (state.error !== null) return { text: 'Could not parse', tone: 'danger' };
    if (state.parsed === null) return { text: 'Nothing parsed yet', tone: 'muted' };
    if (state.text !== state.parsed.text) return { text: 'Sample changed. Parse again to update.', tone: 'warn' };
    return { text: `Parsed · ${countLabel(state.parsed.valueCount, 'value')}`, tone: 'good' };
  }

  /** FR-045. */
  export function fixedPositionNote(state: JsonReferenceState): string | null {
    if (state.parsed === null) return null;
    const indices = state.selectedPath.filter((segment): segment is number => typeof segment === 'number');
    if (indices.length === 0) return null;
    return `Fixed position ${indices.map((index) => `[${index}]`).join('')}: reads that item only, not each item in a loop.`;
  }

  /** FR-015: a hint only; the builder never changes the source on its own. */
  export function showBodyHint(state: JsonReferenceState): boolean {
    return (
      state.shape === 'body' &&
      state.parsed !== null &&
      isJsonObject(state.parsed.value) &&
      Object.hasOwn(state.parsed.value, 'body')
    );
  }

  /** FR-050, FR-053, FR-054. */
  export function copyStatusView(state: JsonReferenceState): { text: string; tone: StatusTone } {
    switch (state.copyStatus.kind) {
      case 'copied':
        return { text: 'Expression copied', tone: 'good' };
      case 'error':
        return { text: `Could not copy expression: ${state.copyStatus.reason}`, tone: 'danger' };
      case 'idle':
        return {
          text: state.copyFormat === 'inline' ? 'Inline text: use inside a string' : 'Paste into the expression editor',
          tone: 'muted',
        };
    }
  }
  ```

- [ ] Run: `npx vitest run packages/builder-ui/test/jsonReferenceState.test.ts`. Expected: PASS, 17 passed.
- [ ] Commit: `feat(builder-ui): add the JSON reference state reducer and selectors`

---

## Phase 7: Radio groups with one tab stop

**Implements:** FR-080 (keyboard), FR-081 | **Satisfies:** AC-5.2
**Files:** `packages/builder-ui/src/workbench/controls/ChoiceGroup.tsx` (new), `packages/builder-ui/test/choiceGroup.test.tsx` (new)
**Interfaces:** Consumes: nothing. Produces:
- `interface ChoiceOption<T extends string> { value: T; label: string; detail?: ReactNode }`;
- `ChoiceGroup<T extends string>(props: { className: string; options: ReadonlyArray<ChoiceOption<T>>; value: T; onChange: (value: T) => void; labelledBy?: string; ariaLabel?: string })`.

Phase 9 renders three variants through `className`: `eb-choice-pill` (Output from), `eb-choice-cards` (The pasted JSON is) and `eb-choice-segmented` (Copy format).

A WAI-ARIA radio group. Only the checked option is tabbable, and an arrow key moves the choice and the focus together, so a screen reader announces the new choice. An option's `detail`, the root on each card, is its description; the name is the label alone.

- [ ] Write `packages/builder-ui/test/choiceGroup.test.tsx`:

  ```tsx
  // @vitest-environment jsdom
  import '@testing-library/jest-dom/vitest';
  import { cleanup, render, screen } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { useState } from 'react';
  import { afterEach, describe, expect, it } from 'vitest';
  import { ChoiceGroup } from '../src/workbench/controls/ChoiceGroup';

  afterEach(() => cleanup());

  function Harness() {
    const [value, setValue] = useState<'action' | 'trigger'>('action');
    return (
      <>
        <button type="button">Before</button>
        <ChoiceGroup
          className="eb-choice-pill"
          ariaLabel="Output from"
          value={value}
          onChange={setValue}
          options={[
            { value: 'action', label: 'Action' },
            { value: 'trigger', label: 'Trigger' },
          ]}
        />
        <button type="button">After</button>
      </>
    );
  }

  describe('ChoiceGroup (FR-081)', () => {
    it('is one tab stop, on the checked option', async () => {
      const user = userEvent.setup();
      render(<Harness />);

      await user.click(screen.getByRole('button', { name: 'Before' }));
      await user.tab();
      expect(screen.getByRole('radio', { name: 'Action' })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    });

    it('moves the choice and the focus with the arrow keys, wrapping around', async () => {
      const user = userEvent.setup();
      render(<Harness />);

      await user.click(screen.getByRole('radio', { name: 'Action' }));
      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('radio', { name: 'Trigger' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Trigger' })).toHaveFocus();
      expect(screen.getByRole('radio', { name: 'Action' })).toHaveAttribute('tabindex', '-1');

      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('radio', { name: 'Action' })).toBeChecked();
      await user.keyboard('{ArrowLeft}');
      expect(screen.getByRole('radio', { name: 'Trigger' })).toBeChecked();
    });

    it('is named by its label', () => {
      render(<Harness />);

      expect(screen.getByRole('radiogroup', { name: 'Output from' })).toBeInTheDocument();
    });
  });
  ```

- [ ] Run: `npx vitest run packages/builder-ui/test/choiceGroup.test.tsx`. Expected: FAIL (the module does not exist).

- [ ] Create `packages/builder-ui/src/workbench/controls/ChoiceGroup.tsx`:

  ```tsx
  import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

  export interface ChoiceOption<T extends string> {
    value: T;
    label: string;
    /** Optional second line, such as the root an option card produces; exposed as the description. */
    detail?: ReactNode;
  }

  interface ChoiceGroupProps<T extends string> {
    className: string;
    options: ReadonlyArray<ChoiceOption<T>>;
    value: T;
    onChange: (value: T) => void;
    /** Id of a visible label; use `ariaLabel` when the group has none. */
    labelledBy?: string;
    ariaLabel?: string;
  }

  const STEP: Partial<Record<string, number>> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

  /**
   * A WAI-ARIA radio group with one tab stop (FR-081): only the checked option
   * is tabbable, and the arrow keys move the choice and the focus together, so
   * screen readers announce the new choice.
   */
  export function ChoiceGroup<T extends string>({
    ariaLabel,
    className,
    labelledBy,
    onChange,
    options,
    value,
  }: ChoiceGroupProps<T>) {
    const id = useId();
    const radios = useRef<Array<HTMLButtonElement | null>>([]);

    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const step = STEP[event.key];
      if (step === undefined) return;
      event.preventDefault();
      const next = (index + step + options.length) % options.length;
      onChange(options[next].value);
      radios.current[next]?.focus();
    };

    return (
      <div className={className} role="radiogroup" aria-labelledby={labelledBy} aria-label={ariaLabel}>
        {options.map((option, index) => {
          const checked = option.value === value;
          const labelId = `${id}-${index}-label`;
          const detailId = `${id}-${index}-detail`;
          return (
            <button
              key={option.value}
              ref={(element) => {
                radios.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-labelledby={option.detail ? labelId : undefined}
              aria-describedby={option.detail ? detailId : undefined}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              <span id={labelId} className="eb-choice-label">
                {option.label}
              </span>
              {option.detail ? (
                <span id={detailId} className="eb-choice-detail">
                  {option.detail}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }
  ```

- [ ] Run: `npx vitest run packages/builder-ui/test/choiceGroup.test.tsx`. Expected: PASS, 3 passed.
- [ ] Commit: `feat(builder-ui): add a one-tab-stop radio group control`

> **Complexity note.** Gate: Anti-Abstraction (use framework features directly). Addition: a small hand-built radio group instead of Fluent `RadioGroup`. Justification:
> - FR-090 requires the existing pill, segmented and card styles, which Fluent's native radio inputs do not render.
> - FR-081 asks for the mode switch's model of one tab stop with arrow keys.
> - Three groups share it.
>
> `ModeSegmentedControl` itself is untouched (CON-004).

---

## Phase 8: Payload tree widget

**Implements:** FR-033, FR-034, FR-035, FR-036, FR-037, FR-038, FR-080, FR-084 (the tree is labelled by the Payload heading) | **Satisfies:** AC-1.3, AC-5.3
**Files:** `packages/builder-ui/src/workbench/PayloadTree.tsx` (new), `packages/builder-ui/test/payloadTree.test.tsx` (new)
**Interfaces:** Consumes:
- from Phase 5: `ROOT_KEY`, `buildVisibleRows`, `firstHiddenChildKey`, `PayloadMoreRow`, `PayloadTreeRow`;
- from Phase 3: `pathKey`;
- the existing `ChevronRightIcon` from `workbench/icons/BuilderIcons.tsx`;
- the Phase 6 reducer, in the test harness only.

Produces: `PayloadTree(props: { labelledBy: string; value: unknown; rootLabel: string; expanded: ReadonlySet<string>; showAll: ReadonlySet<string>; selectedPath: PayloadPath; onSelect: (path: PayloadPath) => void; onToggle: (key: string) => void; onShowAll: (key: string) => void })`.

A flat, hand-rolled WAI-ARIA tree view with single selection (owner decision; D-3):
- one roving tab stop, placed on the selected row or its nearest visible ancestor;
- the chevron toggles without selecting, and the rest of the row selects;
- rows are memoised, so moving focus re-renders two rows, not the tree;
- sample content is only ever rendered as text.

- [ ] Write `packages/builder-ui/test/payloadTree.test.tsx`:

  ```tsx
  // @vitest-environment jsdom
  import '@testing-library/jest-dom/vitest';
  import { cleanup, render, screen } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { useReducer } from 'react';
  import { afterEach, describe, expect, it } from 'vitest';
  import { PayloadTree } from '../src/workbench/PayloadTree';
  import {
    initialJsonReferenceState,
    jsonReferenceReducer,
    type JsonReferenceState,
  } from '../src/workbench/jsonReferenceState';
  import { fixtureA1 } from './fixtures/jsonReferenceFixtures';

  afterEach(() => cleanup());

  function parsedState(text: string): JsonReferenceState {
    return jsonReferenceReducer(
      { ...initialJsonReferenceState, outputFrom: 'trigger', shape: 'body', text },
      { type: 'parse' },
    );
  }

  function TreeHarness({ text }: { text: string }) {
    const [state, dispatch] = useReducer(jsonReferenceReducer, text, parsedState);
    if (!state.parsed) return <p>{state.error}</p>;
    return (
      <>
        <button type="button">Before</button>
        <h2 id="payload-heading">Payload</h2>
        <PayloadTree
          labelledBy="payload-heading"
          value={state.parsed.value}
          rootLabel="triggerBody()"
          expanded={state.expanded}
          showAll={state.showAll}
          selectedPath={state.selectedPath}
          onSelect={(path) => dispatch({ type: 'select', path })}
          onToggle={(key) => dispatch({ type: 'toggleExpanded', key })}
          onShowAll={(key) => dispatch({ type: 'showAll', key })}
        />
        <output aria-label="Selected path">{JSON.stringify(state.selectedPath)}</output>
      </>
    );
  }

  const item = (name: RegExp) => screen.getByRole('treeitem', { name });
  const selectedPath = () => screen.getByLabelText('Selected path').textContent;

  describe('PayloadTree (FR-030 to FR-039)', () => {
    it('is a tree named by the Payload heading, with level, position, size and state on each row', () => {
      render(<TreeHarness text={fixtureA1} />);

      expect(screen.getByRole('tree', { name: 'Payload' })).toBeInTheDocument();
      expect(item(/^triggerBody\(\), object$/)).toHaveAttribute('aria-level', '1');
      expect(item(/^triggerBody\(\), object$/)).toHaveAttribute('aria-expanded', 'true');
      expect(item(/^triggerBody\(\), object$/)).toHaveAttribute('aria-selected', 'true');
      expect(item(/^statusCode, number, 200$/)).toHaveAttribute('aria-level', '2');
      expect(item(/^statusCode, number, 200$/)).toHaveAttribute('aria-posinset', '1');
      expect(item(/^statusCode, number, 200$/)).toHaveAttribute('aria-setsize', '3');
      expect(item(/^statusCode, number, 200$/)).not.toHaveAttribute('aria-expanded');
      expect(item(/^body, object$/)).toHaveAttribute('aria-expanded', 'false');
    });

    it('has one tab stop, on the selected row', async () => {
      const user = userEvent.setup();
      render(<TreeHarness text={fixtureA1} />);

      expect(screen.getAllByRole('treeitem').filter((row) => row.tabIndex === 0)).toEqual([item(/^triggerBody\(\)/)]);
      await user.click(screen.getByRole('button', { name: 'Before' }));
      await user.tab();
      expect(item(/^triggerBody\(\)/)).toHaveFocus();
    });

    it('follows the APG keyboard model', async () => {
      const user = userEvent.setup();
      render(<TreeHarness text={fixtureA1} />);
      await user.click(screen.getByRole('button', { name: 'Before' }));
      await user.tab();

      await user.keyboard('{End}');
      expect(item(/^body, object$/)).toHaveFocus();
      await user.keyboard('{ArrowRight}');
      expect(item(/^body, object$/)).toHaveAttribute('aria-expanded', 'true');
      expect(item(/^body, object$/)).toHaveFocus();
      await user.keyboard('{ArrowRight}');
      expect(item(/^value, array$/)).toHaveFocus();
      await user.keyboard('{ArrowLeft}');
      expect(item(/^body, object$/)).toHaveFocus();
      await user.keyboard('{ArrowLeft}');
      expect(item(/^body, object$/)).toHaveAttribute('aria-expanded', 'false');
      await user.keyboard('{ArrowUp}');
      expect(item(/^headers, object$/)).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(selectedPath()).toBe('["headers"]');
      await user.keyboard('{ArrowUp}{ }');
      expect(selectedPath()).toBe('["statusCode"]');
      await user.keyboard('{Home}');
      expect(item(/^triggerBody\(\)/)).toHaveFocus();
    });

    it('toggles from the chevron without selecting, and selects from the rest of the row (FR-034)', async () => {
      const user = userEvent.setup();
      const { container } = render(<TreeHarness text={fixtureA1} />);
      const bodyChevron = item(/^body, object$/).querySelector('[data-chevron]') as Element;

      await user.click(bodyChevron);
      expect(item(/^body, object$/)).toHaveAttribute('aria-expanded', 'true');
      expect(selectedPath()).toBe('[]');

      await user.click(item(/^value, array$/));
      expect(selectedPath()).toBe('["body","value"]');
      expect(item(/^value, array$/)).toHaveAttribute('aria-selected', 'true');
      expect(container.querySelectorAll('[aria-selected="true"]')).toHaveLength(1);
    });

    it('keeps the selection when an ancestor collapses, and focuses the collapsed row', async () => {
      const user = userEvent.setup();
      render(<TreeHarness text={fixtureA1} />);

      await user.click(item(/^body, object$/).querySelector('[data-chevron]') as Element);
      await user.click(item(/^value, array$/));
      await user.click(item(/^body, object$/).querySelector('[data-chevron]') as Element);

      expect(selectedPath()).toBe('["body","value"]');
      expect(item(/^body, object$/)).toHaveFocus();
      expect(item(/^body, object$/)).toHaveAttribute('tabindex', '0');
    });

    it('pages arrays after 20 elements and reveals the rest from "Show N more" (FR-035)', async () => {
      const user = userEvent.setup();
      render(<TreeHarness text={JSON.stringify(Array.from({ length: 25 }, (_, index) => index))} />);

      expect(screen.getAllByRole('treeitem')).toHaveLength(1 + 20 + 1);
      const more = screen.getByRole('treeitem', { name: 'Show 5 more' });
      expect(more).toHaveAttribute('aria-setsize', '21');

      more.focus();
      await user.keyboard('{Enter}');

      expect(screen.getAllByRole('treeitem')).toHaveLength(1 + 25);
      expect(item(/^\[20\], number, 20$/)).toHaveFocus();
    });

    it('marks every row selectable: root, containers, empty containers and nulls (FR-033)', async () => {
      const user = userEvent.setup();
      render(<TreeHarness text='{"list": [], "map": {}, "none": null}' />);

      for (const [name, path] of [
        [/^list, array, 0 items$/, '["list"]'],
        [/^map, object, \{0\}$/, '["map"]'],
        [/^none, null, null$/, '["none"]'],
        [/^triggerBody\(\), object$/, '[]'],
      ] as const) {
        await user.click(item(name));
        expect(selectedPath()).toBe(path);
      }
    });

    it('renders sample content as text only (FR-038)', () => {
      const { container } = render(
        <TreeHarness text='{"html": "<img src=x onerror=alert(1)>", "link": "https://contoso.com"}' />,
      );

      expect(container.querySelector('img')).toBeNull();
      expect(container.querySelector('a')).toBeNull();
      expect(screen.getByText('"<img src=x onerror=alert(1)>"')).toBeInTheDocument();
    });

    it('lists built-in object names like any other key (FR-037)', () => {
      render(<TreeHarness text='{"__proto__": 1, "constructor": 2, "hasOwnProperty": 3}' />);

      expect(screen.getAllByRole('treeitem').slice(1).map((row) => row.getAttribute('aria-label'))).toEqual([
        '__proto__, number, 1',
        'constructor, number, 2',
        'hasOwnProperty, number, 3',
      ]);
    });
  });
  ```

- [ ] Run: `npx vitest run packages/builder-ui/test/payloadTree.test.tsx`. Expected: FAIL (the module does not exist).

- [ ] Create `packages/builder-ui/src/workbench/PayloadTree.tsx`:

  ```tsx
  import {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
    type MouseEvent,
  } from 'react';
  import type { PayloadPath } from '@ryanmakes/eb_engine';
  import { pathKey } from '../importExport/jsonPayload';
  import {
    ROOT_KEY,
    buildVisibleRows,
    firstHiddenChildKey,
    type PayloadMoreRow,
    type PayloadTreeRow,
  } from './payloadTreeModel';
  import { ChevronRightIcon } from './icons/BuilderIcons';

  interface PayloadTreeProps {
    /** Id of the Payload heading, which names the tree (FR-084). */
    labelledBy: string;
    value: unknown;
    /** The live root expression, shown as the root row's label (FR-031). */
    rootLabel: string;
    expanded: ReadonlySet<string>;
    showAll: ReadonlySet<string>;
    selectedPath: PayloadPath;
    onSelect: (path: PayloadPath) => void;
    onToggle: (key: string) => void;
    onShowAll: (key: string) => void;
  }

  /**
   * A flat WAI-ARIA tree view with single selection (FR-036): one tab stop that
   * roves between rows, the chevron toggles without selecting (FR-034), and
   * sample content is only ever rendered as text (FR-038).
   */
  export function PayloadTree({
    expanded,
    labelledBy,
    onSelect,
    onShowAll,
    onToggle,
    rootLabel,
    selectedPath,
    showAll,
    value,
  }: PayloadTreeProps) {
    const rows = useMemo(() => buildVisibleRows(value, expanded, showAll), [value, expanded, showAll]);
    const indexByKey = useMemo(() => new Map(rows.map((row, index) => [row.key, index])), [rows]);
    const selectedKey = pathKey(selectedPath);
    const [focusedKey, setFocusedKey] = useState<string | null>(null);
    const rowElements = useRef(new Map<string, HTMLDivElement>());
    const focusPending = useRef(false);

    const tabStopKey =
      focusedKey !== null && indexByKey.has(focusedKey) ? focusedKey : nearestVisibleKey(indexByKey, selectedPath);

    useEffect(() => {
      if (!focusPending.current) return;
      focusPending.current = false;
      rowElements.current.get(tabStopKey)?.focus();
    }, [rows, tabStopKey]);

    const registerRow = useCallback((key: string, element: HTMLDivElement | null) => {
      if (element) rowElements.current.set(key, element);
      else rowElements.current.delete(key);
    }, []);

    const moveFocus = (key: string) => {
      focusPending.current = true;
      setFocusedKey(key);
    };

    const revealAll = (row: PayloadMoreRow) => {
      onShowAll(row.parentKey);
      moveFocus(firstHiddenChildKey(value, row) ?? row.parentKey);
    };

    const rowFor = (target: EventTarget): PayloadTreeRow | undefined => {
      const element = (target as Element).closest<HTMLElement>('[data-row-key]');
      const index = element ? indexByKey.get(element.dataset.rowKey ?? '') : undefined;
      return index === undefined ? undefined : rows[index];
    };

    const handleClick = (event: MouseEvent<HTMLDivElement>) => {
      const row = rowFor(event.target);
      if (!row) return;
      if (row.kind === 'more') {
        revealAll(row);
      } else if (row.expandable && (event.target as Element).closest('[data-chevron]')) {
        onToggle(row.key);
        moveFocus(row.key);
      } else {
        setFocusedKey(row.key);
        onSelect(row.path);
      }
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      const row = rowFor(event.target);
      const index = row ? indexByKey.get(row.key) : undefined;
      if (!row || index === undefined) return;

      switch (event.key) {
        case 'ArrowDown':
          moveFocus(rows[Math.min(index + 1, rows.length - 1)].key);
          break;
        case 'ArrowUp':
          moveFocus(rows[Math.max(index - 1, 0)].key);
          break;
        case 'Home':
          moveFocus(rows[0].key);
          break;
        case 'End':
          moveFocus(rows[rows.length - 1].key);
          break;
        case 'ArrowRight':
          if (row.kind === 'value' && row.expandable) {
            if (row.expanded) moveFocus(rows[index + 1].key);
            else onToggle(row.key);
          }
          break;
        case 'ArrowLeft':
          if (row.kind === 'value' && row.expanded) onToggle(row.key);
          else if (row.parentKey !== null) moveFocus(row.parentKey);
          break;
        case 'Enter':
        case ' ':
          if (row.kind === 'more') revealAll(row);
          else onSelect(row.path);
          break;
        default:
          return;
      }
      event.preventDefault();
    };

    return (
      <div
        className="eb-payload-tree"
        role="tree"
        aria-labelledby={labelledBy}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {rows.map((row) => (
          <PayloadTreeRowView
            key={row.key}
            row={row}
            rootLabel={row.kind === 'value' && row.labelKind === 'root' ? rootLabel : undefined}
            selected={row.key === selectedKey}
            tabStop={row.key === tabStopKey}
            register={registerRow}
          />
        ))}
      </div>
    );
  }

  /** The tab stop sits on the selected row, or on its nearest visible ancestor (FR-036). */
  function nearestVisibleKey(indexByKey: ReadonlyMap<string, number>, selectedPath: PayloadPath): string {
    for (let length = selectedPath.length; length > 0; length -= 1) {
      const key = pathKey(selectedPath.slice(0, length));
      if (indexByKey.has(key)) return key;
    }
    return ROOT_KEY;
  }

  interface PayloadTreeRowViewProps {
    row: PayloadTreeRow;
    rootLabel: string | undefined;
    selected: boolean;
    tabStop: boolean;
    register: (key: string, element: HTMLDivElement | null) => void;
  }

  /** Memoised so moving focus or selection re-renders two rows, not the whole tree. */
  const PayloadTreeRowView = memo(function PayloadTreeRowView({
    register,
    rootLabel,
    row,
    selected,
    tabStop,
  }: PayloadTreeRowViewProps) {
    const indent = { '--eb-tree-level': row.level } as CSSProperties;
    const common = {
      ref: (element: HTMLDivElement | null) => register(row.key, element),
      'data-row-key': row.key,
      role: 'treeitem',
      'aria-level': row.level,
      'aria-posinset': row.posInSet,
      'aria-setsize': row.setSize,
      tabIndex: tabStop ? 0 : -1,
      style: indent,
    };

    if (row.kind === 'more') {
      return (
        <div {...common} className="eb-tree-row eb-tree-more">
          <span className="eb-tree-chevron" aria-hidden="true" />
          <span className="eb-tree-label">Show {row.hiddenCount} more</span>
        </div>
      );
    }

    const label = row.labelKind === 'root' ? (rootLabel ?? '') : row.label;
    return (
      <div
        {...common}
        className="eb-tree-row"
        aria-selected={selected}
        aria-expanded={row.expandable ? row.expanded : undefined}
        aria-label={row.expandable ? `${label}, ${row.type}` : `${label}, ${row.type}, ${row.preview}`}
      >
        <span
          className={`eb-tree-chevron${row.expanded ? ' is-expanded' : ''}`}
          data-chevron={row.expandable ? '' : undefined}
          aria-hidden="true"
        >
          {row.expandable ? <ChevronRightIcon /> : null}
        </span>
        <span className={`eb-tree-label is-${row.labelKind}`}>{label}</span>
        <span className={`eb-field-type-badge ${row.type}`}>{row.type}</span>
        <span className="eb-tree-preview">{row.preview}</span>
      </div>
    );
  });
  ```

- [ ] Run: `npx vitest run packages/builder-ui/test/payloadTree.test.tsx`, then `npm run lint`. Expected: PASS with 9 passed; lint exits 0.
- [ ] Commit: `feat(builder-ui): add the keyboard-accessible payload tree`

---

## Phase 9: The JSON reference workspace

**Implements:** FR-010, FR-011, FR-012, FR-014, FR-015, FR-016, FR-020, FR-030, FR-031, FR-043, FR-044, FR-045, FR-050, FR-051, FR-052, FR-053, FR-054, FR-055, FR-062, FR-082, FR-083, FR-084 | **Satisfies:** AC-1.1–AC-1.6, AC-2.1–AC-2.3, AC-4.1–AC-4.6, AC-5.4
**Files:** `packages/builder-ui/src/workbench/JsonSourcePane.tsx` (new), `packages/builder-ui/src/workbench/ReferencePanel.tsx` (new), `packages/builder-ui/src/workbench/JsonReferenceWorkspace.tsx` (new), `packages/builder-ui/test/jsonReferenceWorkspace.test.tsx` (new)
**Interfaces:** Consumes:
- Phase 2's rejecting `adapter.copyToClipboard`;
- Phase 4's `ExpressionPreview`;
- from Phase 6: the reducer, `initialJsonReferenceState` and the selectors;
- from Phase 7: `ChoiceGroup`;
- from Phase 8: `PayloadTree`;
- from Phase 3: `valueAtPath`;
- from Phase 5: `countLabel`, `segmentLabel`, `selectionSummary`;
- existing: `ActionButton`, `CodeIcon`, `CopyIcon`, the `PlatformAdapter` type.

Produces: `JsonReferenceWorkspace(props: { adapter: PlatformAdapter; active: boolean })`. It is internal to builder-ui and not exported from `index.ts`.

This phase composes the Source, Payload and Reference cards and wires Copy through the platform adapter. Status behaviour:
- "Expression copied" shows for 1,200 ms, and a second copy restarts the timer.
- Leaving the builder (`active` turning false) drops the copied status.
- Unmounting clears the timer.

- [ ] Write `packages/builder-ui/test/jsonReferenceWorkspace.test.tsx`:

  ```tsx
  // @vitest-environment jsdom
  import '@testing-library/jest-dom/vitest';
  import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
  import userEvent, { type UserEvent } from '@testing-library/user-event';
  import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
  import { afterEach, describe, expect, it, vi } from 'vitest';
  import { JsonReferenceWorkspace } from '../src/workbench/JsonReferenceWorkspace';
  import { composeSample, fixtureA1, triggerBodySample, triggerFullSample } from './fixtures/jsonReferenceFixtures';

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  function createAdapter(copy: PlatformAdapter['copyToClipboard'] = vi.fn(async () => undefined)): PlatformAdapter {
    return {
      copyToClipboard: vi.fn(copy),
      notify: vi.fn(async () => undefined),
      getTheme: vi.fn(async () => 'light' as const),
      onThemeChanged: vi.fn(() => () => undefined),
      settings: {
        get: vi.fn(async () => null),
        set: vi.fn(async () => undefined),
        remove: vi.fn(async () => undefined),
      },
      getDataverseFields: vi.fn(async () => []),
    };
  }

  const EMAIL_REFERENCE = "outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']";

  const row = (name: RegExp) => screen.getByRole('treeitem', { name });
  const expression = () => screen.getByLabelText('Reference expression');
  const copyStatus = () => screen.getAllByRole('status')[1];

  async function pasteAndParse(user: UserEvent, sample: string, actionName?: string) {
    if (actionName !== undefined) await user.type(screen.getByLabelText('Action name'), actionName);
    await user.click(screen.getByLabelText('Sample JSON'));
    await user.paste(sample);
    await user.click(screen.getByRole('button', { name: 'Parse' }));
  }

  async function expand(user: UserEvent, name: RegExp) {
    await user.click(row(name).querySelector('[data-chevron]') as Element);
  }

  async function selectEmail(user: UserEvent) {
    await expand(user, /^body, object$/);
    await expand(user, /^value, array$/);
    await expand(user, /^\[0\], object$/);
    await expand(user, /^Requester, object$/);
    await user.click(row(/^Email, string/));
  }

  describe('JSON reference workspace', () => {
    it('builds, shows and copies the reference to Email (user story 1, scenarios 1 and 2)', async () => {
      const user = userEvent.setup();
      const adapter = createAdapter();
      render(<JsonReferenceWorkspace adapter={adapter} active />);

      await pasteAndParse(user, fixtureA1, 'Get items');
      expect(screen.getAllByRole('status')[0]).toHaveTextContent('Parsed · 25 values');
      expect(screen.getByText('25 values')).toBeInTheDocument();

      await selectEmail(user);
      expect(expression()).toHaveTextContent(EMAIL_REFERENCE);
      expect(screen.getByRole('navigation', { name: 'Selected path' })).toHaveTextContent(
        "outputs('Get_items')›body›value›[0]›Requester›Email",
      );
      expect(screen.getByText('string · "dana@contoso.com"')).toBeInTheDocument();
      expect(screen.getByText('Fixed position [0]: reads that item only, not each item in a loop.')).toBeInTheDocument();
      expect(copyStatus()).toHaveTextContent('Paste into the expression editor');

      await user.click(screen.getByRole('button', { name: 'Copy' }));
      expect(adapter.copyToClipboard).toHaveBeenCalledWith(EMAIL_REFERENCE);
      expect(copyStatus()).toHaveTextContent('Expression copied');
    });

    it('shows "Expression copied" for 1.2 s and restarts the timer on a second copy (FR-053)', async () => {
      const user = userEvent.setup();
      render(<JsonReferenceWorkspace adapter={createAdapter()} active />);
      await pasteAndParse(user, fixtureA1, 'Get items');
      vi.useFakeTimers();
      const copy = screen.getByRole('button', { name: 'Copy' });

      await act(async () => fireEvent.click(copy));
      await act(async () => vi.advanceTimersByTime(1_000));
      await act(async () => fireEvent.click(copy));
      await act(async () => vi.advanceTimersByTime(1_000));
      expect(copyStatus()).toHaveTextContent('Expression copied');
      await act(async () => vi.advanceTimersByTime(200));
      expect(copyStatus()).toHaveTextContent('Paste into the expression editor');
    });

    it('clears the timer on unmount and drops "Expression copied" when the builder is left (FR-053)', async () => {
      const user = userEvent.setup();
      const adapter = createAdapter();
      const { rerender, unmount } = render(<JsonReferenceWorkspace adapter={adapter} active />);
      await pasteAndParse(user, fixtureA1, 'Get items');
      vi.useFakeTimers();
      const copy = screen.getByRole('button', { name: 'Copy' });

      await act(async () => fireEvent.click(copy));
      rerender(<JsonReferenceWorkspace adapter={adapter} active={false} />);
      rerender(<JsonReferenceWorkspace adapter={adapter} active />);
      expect(copyStatus()).toHaveTextContent('Paste into the expression editor');

      await act(async () => fireEvent.click(copy));
      expect(copyStatus()).toHaveTextContent('Expression copied');
      const pendingTimers = vi.getTimerCount();
      unmount();
      expect(vi.getTimerCount()).toBe(pendingTimers - 1);
    });

    it('references containers, nulls and the root (user story 1, scenario 3)', async () => {
      const user = userEvent.setup();
      const adapter = createAdapter();
      render(<JsonReferenceWorkspace adapter={adapter} active />);
      await pasteAndParse(user, fixtureA1, 'Get items');
      await expand(user, /^body, object$/);

      for (const [name, reference] of [
        [/^value, array$/, "outputs('Get_items')?['body']?['value']"],
        [/^@odata\.nextLink, null, null$/, "outputs('Get_items')?['body']?['@odata.nextLink']"],
        [/^outputs\('Get_items'\), object$/, "outputs('Get_items')"],
      ] as const) {
        await user.click(row(name));
        expect(expression()).toHaveTextContent(reference);
        await user.click(screen.getByRole('button', { name: 'Copy' }));
        expect(adapter.copyToClipboard).toHaveBeenLastCalledWith(reference);
      }
    });

    it('references a Compose output with Action and Full output (user story 1, scenario 4)', async () => {
      const user = userEvent.setup();
      render(<JsonReferenceWorkspace adapter={createAdapter()} active />);
      await pasteAndParse(user, composeSample, 'Compose');

      await user.click(row(/^customer, object$/));
      expect(expression()).toHaveTextContent("outputs('Compose')?['customer']");
    });

    it('copies the inline form (user story 1, scenario 5)', async () => {
      const user = userEvent.setup();
      const adapter = createAdapter();
      render(<JsonReferenceWorkspace adapter={adapter} active />);
      await pasteAndParse(user, fixtureA1, 'Get items');
      await selectEmail(user);

      await user.click(screen.getByRole('radio', { name: 'Inside text @{…}' }));
      expect(copyStatus()).toHaveTextContent('Inline text: use inside a string');
      await user.click(screen.getByRole('button', { name: 'Copy' }));
      expect(adapter.copyToClipboard).toHaveBeenCalledWith(`@{${EMAIL_REFERENCE}}`);
    });

    it('hints at a top-level body key under Body only and still roots at body() (user story 1, scenario 6)', async () => {
      const user = userEvent.setup();
      render(<JsonReferenceWorkspace adapter={createAdapter()} active />);
      await pasteAndParse(user, fixtureA1, 'Get items');

      await user.click(screen.getByRole('radio', { name: /^Body only/ }));
      expect(screen.getByText(/This sample has a top-level/)).toHaveTextContent(
        'This sample has a top-level body key. If you pasted the full output, choose Full output.',
      );
      await user.click(row(/^body, object$/));
      expect(expression()).toHaveTextContent("body('Get_items')?['body']");
    });

    it('references trigger payloads without an action name (user story 2)', async () => {
      const user = userEvent.setup();
      render(<JsonReferenceWorkspace adapter={createAdapter()} active />);

      await user.click(screen.getByRole('radio', { name: 'Trigger' }));
      expect(screen.queryByLabelText('Action name')).not.toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Full output' })).toHaveAccessibleDescription('triggerOutputs()');
      expect(screen.getByRole('radio', { name: 'Body only' })).toHaveAccessibleDescription('triggerBody()');

      await user.click(screen.getByRole('radio', { name: /^Body only/ }));
      await pasteAndParse(user, triggerBodySample);
      await expand(user, /^customer, object$/);
      await user.click(row(/^name, string/));
      expect(expression()).toHaveTextContent("triggerBody()?['customer']?['name']");

      await user.clear(screen.getByLabelText('Sample JSON'));
      await user.click(screen.getByRole('radio', { name: /^Full output/ }));
      await pasteAndParse(user, triggerFullSample);
      await expand(user, /^headers, object$/);
      await user.click(row(/^content-type, string/));
      expect(expression()).toHaveTextContent("triggerOutputs()?['headers']?['content-type']");
      expect(screen.getByRole('button', { name: 'Copy' })).toBeEnabled();
    });

    it('asks for a sample before parsing (user story 4, scenario 1)', async () => {
      const user = userEvent.setup();
      render(<JsonReferenceWorkspace adapter={createAdapter()} active />);

      await user.click(screen.getByRole('button', { name: 'Parse' }));
      expect(screen.getByRole('alert')).toHaveTextContent('Paste a sample before parsing.');
    });

    it('reports invalid JSON and clears the tree (user story 4, scenario 2)', async () => {
      const user = userEvent.setup();
      render(<JsonReferenceWorkspace adapter={createAdapter()} active />);
      await pasteAndParse(user, fixtureA1, 'Get items');

      await user.clear(screen.getByLabelText('Sample JSON'));
      await pasteAndParse(user, '{"a": 1,}');

      expect(screen.getByRole('alert')).toHaveTextContent(/^Not valid JSON: /);
      expect(screen.queryByRole('tree')).not.toBeInTheDocument();
      expect(screen.getByText('No sample yet')).toBeInTheDocument();
      expect(screen.getAllByRole('status')[0]).toHaveTextContent('Could not parse');
      expect(screen.getByLabelText('Sample JSON')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
    });

    it('shows the limit message and no tree (user story 4, scenario 3)', async () => {
      const user = userEvent.setup();
      render(<JsonReferenceWorkspace adapter={createAdapter()} active />);

      await pasteAndParse(user, JSON.stringify(new Array(10_000).fill(0)));
      expect(screen.getByRole('alert')).toHaveTextContent('Sample has more than 10,000 values. Trim it to the part you need.');
      expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    });

    it('keeps the old tree after an edit and says the sample changed (user story 4, scenario 4)', async () => {
      const user = userEvent.setup();
      render(<JsonReferenceWorkspace adapter={createAdapter()} active />);
      await pasteAndParse(user, fixtureA1, 'Get items');

      await user.type(screen.getByLabelText('Sample JSON'), ' ');
      expect(screen.getAllByRole('status')[0]).toHaveTextContent('Sample changed. Parse again to update.');
      expect(screen.getByRole('tree')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy' })).toBeEnabled();
    });

    it('blocks Copy and flags the field when the action name is blank (user story 4, scenario 5)', async () => {
      const user = userEvent.setup();
      render(<JsonReferenceWorkspace adapter={createAdapter()} active />);
      const name = screen.getByLabelText('Action name');

      expect(name).toHaveAccessibleDescription('As shown in the flow designer. Spaces become underscores.');
      expect(name).toHaveAttribute('aria-invalid', 'false');
      await pasteAndParse(user, fixtureA1);

      expect(name).toHaveAttribute('aria-invalid', 'true');
      expect(name).toHaveAccessibleDescription('Enter the action name to build the reference.');
      expect(screen.getByText('Enter an action name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
      expect(row(/^outputs\('Action_name'\), object$/)).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Full output (also Compose)' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Full output (also Compose)' })).toHaveAccessibleDescription(
        "outputs('Action_name')",
      );
    });

    it('never claims a copy the host refused (user story 4, scenario 6)', async () => {
      const user = userEvent.setup();
      render(
        <JsonReferenceWorkspace
          adapter={createAdapter(async () => {
            throw new Error('the host does not provide a clipboard API');
          })}
          active
        />,
      );
      await pasteAndParse(user, fixtureA1, 'Get items');

      await user.click(screen.getByRole('button', { name: 'Copy' }));
      expect(copyStatus()).toHaveTextContent('Could not copy expression: the host does not provide a clipboard API');
      expect(screen.queryByText('Expression copied')).not.toBeInTheDocument();
    });

    it('labels its panels and fields for assistive technology (FR-082, FR-084)', () => {
      render(<JsonReferenceWorkspace adapter={createAdapter()} active />);

      expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
        'Source',
        'Payload',
        'Reference',
      ]);
      expect(screen.getByRole('radiogroup', { name: 'Output from' })).toBeInTheDocument();
      expect(screen.getByRole('radiogroup', { name: 'The pasted JSON is' })).toBeInTheDocument();
      expect(screen.getByRole('radiogroup', { name: 'Copy format' })).toBeInTheDocument();
      expect(within(screen.getByRole('region', { name: 'Payload' })).getByText('No sample yet')).toBeInTheDocument();
    });

    it('turns off spell checking, autocorrect, capitalisation and autocomplete (FR-062)', () => {
      render(<JsonReferenceWorkspace adapter={createAdapter()} active />);

      for (const field of [screen.getByLabelText('Action name'), screen.getByLabelText('Sample JSON')]) {
        expect(field).toHaveAttribute('spellcheck', 'false');
        expect(field).toHaveAttribute('autocorrect', 'off');
        expect(field).toHaveAttribute('autocapitalize', 'off');
        expect(field).toHaveAttribute('autocomplete', 'off');
      }
    });
  });
  ```

- [ ] Run: `npx vitest run packages/builder-ui/test/jsonReferenceWorkspace.test.tsx`. Expected: FAIL (the module does not exist).

- [ ] Create `packages/builder-ui/src/workbench/JsonSourcePane.tsx`:

  ```tsx
  import { useId, type Dispatch } from 'react';
  import { ActionButton } from './controls/ActionButton';
  import { ChoiceGroup } from './controls/ChoiceGroup';
  import {
    parseStatus,
    rootExpression,
    showActionNameInvalid,
    type JsonReferenceAction,
    type JsonReferenceState,
    type OutputFrom,
  } from './jsonReferenceState';

  interface JsonSourcePaneProps {
    state: JsonReferenceState;
    dispatch: Dispatch<JsonReferenceAction>;
  }

  const OUTPUT_FROM_OPTIONS = [
    { value: 'action', label: 'Action' },
    { value: 'trigger', label: 'Trigger' },
  ] as const satisfies ReadonlyArray<{ value: OutputFrom; label: string }>;

  // Off for pasted payloads and names: some browsers send spell-check text to a
  // cloud service (FR-062).
  const NO_TEXT_ASSISTANCE = {
    spellCheck: false,
    autoComplete: 'off',
    autoCorrect: 'off',
    autoCapitalize: 'off',
  } as const;

  export function JsonSourcePane({ dispatch, state }: JsonSourcePaneProps) {
    const id = useId();
    const headingId = `${id}-heading`;
    const outputFromId = `${id}-output-from`;
    const nameId = `${id}-name`;
    const nameHelpId = `${id}-name-help`;
    const shapeId = `${id}-shape`;
    const sampleId = `${id}-sample`;
    const errorId = `${id}-error`;
    const nameInvalid = showActionNameInvalid(state);
    const status = parseStatus(state);

    return (
      <section className="eb-json-card eb-json-source" aria-labelledby={headingId}>
        <div className="eb-json-card-header">
          <h2 id={headingId}>Source</h2>
        </div>
        <div className="eb-json-card-body">
          <div className="eb-json-field">
            <span className="eb-label" id={outputFromId}>
              Output from
            </span>
            <ChoiceGroup
              className="eb-choice-pill"
              labelledBy={outputFromId}
              options={OUTPUT_FROM_OPTIONS}
              value={state.outputFrom}
              onChange={(value) => dispatch({ type: 'setOutputFrom', value })}
            />
          </div>

          {state.outputFrom === 'action' ? (
            <div className="eb-json-field">
              <label className="eb-label" htmlFor={nameId}>
                Action name
              </label>
              <input
                {...NO_TEXT_ASSISTANCE}
                id={nameId}
                className="eb-input"
                value={state.actionName}
                aria-invalid={nameInvalid}
                aria-describedby={nameHelpId}
                onChange={(event) => dispatch({ type: 'setActionName', value: event.target.value })}
              />
              <p id={nameHelpId} className={`eb-json-help${nameInvalid ? ' is-invalid' : ''}`}>
                {nameInvalid
                  ? 'Enter the action name to build the reference.'
                  : 'As shown in the flow designer. Spaces become underscores.'}
              </p>
            </div>
          ) : null}

          <div className="eb-json-field">
            <span className="eb-label" id={shapeId}>
              The pasted JSON is
            </span>
            <ChoiceGroup
              className="eb-choice-cards"
              labelledBy={shapeId}
              value={state.shape}
              onChange={(value) => dispatch({ type: 'setShape', value })}
              options={[
                {
                  value: 'full',
                  label: state.outputFrom === 'action' ? 'Full output (also Compose)' : 'Full output',
                  detail: <code>{rootExpression(state, 'full')}</code>,
                },
                { value: 'body', label: 'Body only', detail: <code>{rootExpression(state, 'body')}</code> },
              ]}
            />
          </div>

          <div className="eb-json-field eb-json-sample">
            <label className="eb-label" htmlFor={sampleId}>
              Sample JSON
            </label>
            <textarea
              {...NO_TEXT_ASSISTANCE}
              id={sampleId}
              className="eb-textarea"
              placeholder="Paste the output from a flow run"
              value={state.text}
              aria-invalid={state.error !== null}
              aria-describedby={state.error !== null ? errorId : undefined}
              onChange={(event) => dispatch({ type: 'setText', value: event.target.value })}
            />
          </div>

          <div className="eb-json-parse-row">
            <ActionButton onClick={() => dispatch({ type: 'parse' })}>Parse</ActionButton>
            <span role="status" className={`eb-json-status is-${status.tone}`}>
              {status.text}
            </span>
          </div>

          {state.error !== null ? (
            <div id={errorId} role="alert" className="eb-json-error">
              {state.error}
            </div>
          ) : null}
        </div>
      </section>
    );
  }
  ```

- [ ] Create `packages/builder-ui/src/workbench/ReferencePanel.tsx`:

  ```tsx
  import { useId, type Dispatch } from 'react';
  import { ExpressionPreview } from '../components/ExpressionPreview';
  import { valueAtPath } from '../importExport/jsonPayload';
  import { ActionButton } from './controls/ActionButton';
  import { ChoiceGroup } from './controls/ChoiceGroup';
  import { CodeIcon, CopyIcon } from './icons/BuilderIcons';
  import {
    copyStatusView,
    copyText,
    expressionPlaceholder,
    fixedPositionNote,
    rootExpression,
    type CopyFormat,
    type JsonReferenceAction,
    type JsonReferenceState,
  } from './jsonReferenceState';
  import { segmentLabel, selectionSummary } from './payloadTreeModel';

  interface ReferencePanelProps {
    state: JsonReferenceState;
    dispatch: Dispatch<JsonReferenceAction>;
    onCopy: () => void;
  }

  const COPY_FORMAT_OPTIONS = [
    { value: 'bare', label: 'Expression editor' },
    { value: 'inline', label: 'Inside text @{…}' },
  ] as const satisfies ReadonlyArray<{ value: CopyFormat; label: string }>;

  export function ReferencePanel({ dispatch, onCopy, state }: ReferencePanelProps) {
    const headingId = useId();
    const text = copyText(state);
    const note = fixedPositionNote(state);
    const status = copyStatusView(state);
    const selection = state.parsed ? valueAtPath(state.parsed.value, state.selectedPath) : null;
    const crumbs = [rootExpression(state), ...state.selectedPath.map(segmentLabel)];

    return (
      <section className="eb-json-card eb-json-reference" aria-labelledby={headingId}>
        <div className="eb-json-card-header">
          <h2 id={headingId}>
            <CodeIcon aria-hidden="true" />
            Reference
          </h2>
          {selection?.found ? <span className="eb-dock-meta eb-json-summary">{selectionSummary(selection.value)}</span> : null}
        </div>
        <div className="eb-json-card-body">
          {state.parsed ? (
            <nav className="eb-json-breadcrumb" aria-label="Selected path">
              <ol>
                {crumbs.map((crumb, index) => (
                  <li key={index}>
                    {index > 0 ? (
                      <span className="eb-json-crumb-separator" aria-hidden="true">
                        ›
                      </span>
                    ) : null}
                    <span className="eb-json-crumb">{crumb}</span>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          {text !== null ? (
            <ExpressionPreview expression={text} label="Reference expression" />
          ) : (
            <p className="eb-preview eb-json-placeholder">{expressionPlaceholder(state)}</p>
          )}

          {note ? <p className="eb-json-note">{note}</p> : null}

          <div className="eb-json-copy-row">
            <ActionButton icon={<CopyIcon />} disabled={text === null} onClick={onCopy}>
              Copy
            </ActionButton>
            <ChoiceGroup
              className="eb-choice-segmented"
              ariaLabel="Copy format"
              options={COPY_FORMAT_OPTIONS}
              value={state.copyFormat}
              onChange={(value) => dispatch({ type: 'setCopyFormat', value })}
            />
            <span role="status" className={`eb-json-copy-status is-${status.tone}`}>
              {status.text}
            </span>
          </div>
        </div>
      </section>
    );
  }
  ```

- [ ] Create `packages/builder-ui/src/workbench/JsonReferenceWorkspace.tsx`:

  ```tsx
  import { useEffect, useId, useReducer, useRef, type Dispatch } from 'react';
  import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
  import { JsonSourcePane } from './JsonSourcePane';
  import { PayloadTree } from './PayloadTree';
  import { ReferencePanel } from './ReferencePanel';
  import {
    copyText,
    initialJsonReferenceState,
    jsonReferenceReducer,
    rootExpression,
    showBodyHint,
    type JsonReferenceAction,
    type JsonReferenceState,
  } from './jsonReferenceState';
  import { countLabel } from './payloadTreeModel';

  const COPIED_STATUS_MS = 1200;

  interface JsonReferenceWorkspaceProps {
    adapter: PlatformAdapter;
    /** False while the Condition builder tab is selected; the workspace stays mounted so its state survives (FR-008). */
    active: boolean;
  }

  export function JsonReferenceWorkspace({ active, adapter }: JsonReferenceWorkspaceProps) {
    const [state, dispatch] = useReducer(jsonReferenceReducer, initialJsonReferenceState);
    const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => () => clearTimeout(copiedTimer.current), []);

    // Leaving the builder drops a showing "Expression copied" (spec edge cases).
    useEffect(() => {
      if (active) return;
      clearTimeout(copiedTimer.current);
      dispatch({ type: 'resetCopyStatus' });
    }, [active]);

    const copy = async () => {
      const text = copyText(state);
      if (text === null) return;
      clearTimeout(copiedTimer.current);
      try {
        await adapter.copyToClipboard(text);
      } catch (error) {
        dispatch({ type: 'copyFailed', reason: error instanceof Error ? error.message : 'clipboard unavailable' });
        return;
      }
      dispatch({ type: 'copySucceeded' });
      copiedTimer.current = setTimeout(() => dispatch({ type: 'resetCopyStatus' }), COPIED_STATUS_MS);
    };

    return (
      <div className="eb-json-workspace">
        <JsonSourcePane state={state} dispatch={dispatch} />
        <div className="eb-json-content">
          <PayloadPanel state={state} dispatch={dispatch} />
          <ReferencePanel state={state} dispatch={dispatch} onCopy={() => void copy()} />
        </div>
      </div>
    );
  }

  interface PayloadPanelProps {
    state: JsonReferenceState;
    dispatch: Dispatch<JsonReferenceAction>;
  }

  function PayloadPanel({ dispatch, state }: PayloadPanelProps) {
    const headingId = useId();
    const { parsed } = state;

    return (
      <section className="eb-json-card eb-json-payload" aria-labelledby={headingId}>
        <div className="eb-json-card-header">
          <h2 id={headingId}>Payload</h2>
          {parsed ? <span className="eb-dock-meta">{countLabel(parsed.valueCount, 'value')}</span> : null}
        </div>
        {showBodyHint(state) ? (
          <p className="eb-json-hint">
            This sample has a top-level <code>body</code> key. If you pasted the full output, choose{' '}
            <strong>Full output</strong>.
          </p>
        ) : null}
        {parsed ? (
          <PayloadTree
            labelledBy={headingId}
            value={parsed.value}
            rootLabel={rootExpression(state)}
            expanded={state.expanded}
            showAll={state.showAll}
            selectedPath={state.selectedPath}
            onSelect={(path) => dispatch({ type: 'select', path })}
            onToggle={(key) => dispatch({ type: 'toggleExpanded', key })}
            onShowAll={(key) => dispatch({ type: 'showAll', key })}
          />
        ) : (
          <div className="eb-json-empty">
            <p className="eb-json-empty-title">No sample yet</p>
            <p>Paste an action or trigger output from a flow run, then select Parse.</p>
          </div>
        )}
      </section>
    );
  }
  ```

- [ ] Run: `npx vitest run packages/builder-ui/test/jsonReferenceWorkspace.test.tsx`, then `npm run lint` and `npm run typecheck`. Expected: PASS with 16 passed; lint and typecheck exit 0.
- [ ] Commit: `feat(builder-ui): compose the JSON reference workspace with source, payload and reference cards`

---

## Phase 10: Builder tabs in the shell

**Implements:** FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-008, FR-009, FR-060 (settings untouched, at unit level), FR-061, FR-070, CON-004, CON-005 | **Satisfies:** AC-3.1, AC-3.2, AC-3.3, AC-3.4, AC-3.5, AC-5.1
**Files:** `packages/builder-ui/src/workbench/types.ts`, `packages/builder-ui/src/workbench/BuilderTabs.tsx` (new), `packages/builder-ui/src/workbench/WorkbenchHeader.tsx`, `packages/builder-ui/src/app/ExpressionBuilderShell.tsx`, `packages/builder-ui/test/builderSwitching.test.tsx` (new)
**Interfaces:** Consumes:
- from Phase 9: `JsonReferenceWorkspace({ adapter, active })`;
- the existing `countRules(node: QueryNode): number` from `packages/builder-ui/src/app/builderState.ts` (rules at every level, groups excluded);
- the existing `BuilderIcon` and `CodeIcon`.

Produces:
- `type BuilderView = 'condition' | 'jsonReference'`;
- `interface BuilderPanelIds { conditionTab; conditionPanel; jsonTab; jsonPanel }`;
- `BuilderTabs(props: { view: BuilderView; ruleCount: number; ids: BuilderPanelIds; onChange: (view: BuilderView) => void })`;
- `WorkbenchHeaderProps` gains `builderView`, `onBuilderViewChange`, `ruleCount` and `panelIds`.

The shell holds `builderView` in React state and never persists it. The JSON panel mounts on first use and then stays mounted while hidden (planning decision 3). One `<main>` wraps both tab panels, so exactly one main landmark is ever exposed. The Condition workspace keeps its `eb-workspace` class and all its children, so its layout, tests and CSS contract are unchanged.

Browser layout for the new elements arrives in Phase 11: `.eb-workspace`'s `display: grid` beats the `hidden` attribute until `.eb-builder-panel[hidden]` exists. So verify this phase with the unit tests, and do not demo it before Phase 11.

- [ ] Write `packages/builder-ui/test/builderSwitching.test.tsx`:

  ```tsx
  // @vitest-environment jsdom
  import '@testing-library/jest-dom/vitest';
  import { cleanup, render, screen, within } from '@testing-library/react';
  import userEvent, { type UserEvent } from '@testing-library/user-event';
  import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
  import { afterEach, describe, expect, it, vi } from 'vitest';
  import { ExpressionBuilderShell } from '../src/app/ExpressionBuilderShell';
  import { sampleDocument } from '../src/app/sampleData';
  import type { QueryDocument } from '../src/composer/querySchema';
  import { fixtureA1 } from './fixtures/jsonReferenceFixtures';

  afterEach(() => cleanup());

  function createAdapter(): PlatformAdapter {
    return {
      copyToClipboard: vi.fn(async () => undefined),
      notify: vi.fn(async () => undefined),
      getTheme: vi.fn(async () => 'light' as const),
      onThemeChanged: vi.fn(() => () => undefined),
      settings: {
        // Onboarding already seen, so its modal does not take focus mid-test.
        get: vi.fn(async (key: string) => (key === 'eb.onboarding.seen.v1' ? '1' : null)),
        set: vi.fn(async () => undefined),
        remove: vi.fn(async () => undefined),
      },
      getDataverseFields: vi.fn(async () => []),
    };
  }

  // Three rules spread across nested groups (user story 3, scenario 5).
  const threeRuleDocument: QueryDocument = {
    ...sampleDocument,
    root: {
      ...sampleDocument.root,
      children: [
        sampleDocument.root.children[0],
        {
          id: 'group-outer',
          kind: 'group',
          conjunction: 'or',
          children: [
            { id: 'rule-a', kind: 'rule', fieldId: 'Approver', operator: 'contains', value: 'finance' },
            {
              id: 'group-inner',
              kind: 'group',
              conjunction: 'and',
              children: [{ id: 'rule-b', kind: 'rule', fieldId: 'Amount', operator: 'greater', value: 10 }],
            },
          ],
        },
      ],
    },
  };

  const conditionTab = () => screen.getByRole('tab', { name: /^Condition builder/ });
  const jsonTab = () => screen.getByRole('tab', { name: 'JSON reference' });

  async function exerciseJsonReference(user: UserEvent) {
    await user.click(jsonTab());
    await user.type(screen.getByLabelText('Action name'), 'Get items');
    await user.click(screen.getByLabelText('Sample JSON'));
    await user.paste(fixtureA1);
    await user.click(screen.getByRole('button', { name: 'Parse' }));
    await user.click(screen.getByRole('treeitem', { name: /^body, object$/ }));
    await user.click(screen.getByRole('radio', { name: 'Inside text @{…}' }));
    await user.click(screen.getByRole('button', { name: 'Copy' }));
  }

  describe('builder switching', () => {
    it('opens on the Condition builder with two tabs after the brand (FR-001, FR-002)', () => {
      render(<ExpressionBuilderShell adapter={createAdapter()} />);

      const tablist = screen.getByRole('tablist', { name: 'Builders' });
      expect(within(tablist).getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
        'Condition builder0',
        'JSON reference',
      ]);
      expect(conditionTab()).toHaveAttribute('aria-selected', 'true');
      expect(jsonTab()).toHaveAttribute('aria-selected', 'false');
      expect(screen.getByRole('heading', { level: 1 }).parentElement?.parentElement?.nextElementSibling).toBe(tablist);
    });

    it('counts rules at every nesting level in the tab and its name (FR-003)', () => {
      render(<ExpressionBuilderShell adapter={createAdapter()} initialDocument={threeRuleDocument} />);

      expect(screen.getByRole('tab', { name: 'Condition builder, 3 rules' })).toHaveTextContent('3');
    });

    it('says "1 rule" for a single rule', () => {
      render(
        <ExpressionBuilderShell
          adapter={createAdapter()}
          initialDocument={{ ...sampleDocument, root: { ...sampleDocument.root, children: [sampleDocument.root.children[0]] } }}
        />,
      );

      expect(screen.getByRole('tab', { name: 'Condition builder, 1 rule' })).toBeInTheDocument();
    });

    it('follows the tabs pattern with automatic activation (FR-004)', async () => {
      const user = userEvent.setup();
      render(<ExpressionBuilderShell adapter={createAdapter()} />);

      for (const tab of [conditionTab(), jsonTab()]) {
        const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '');
        expect(panel).toHaveAttribute('role', 'tabpanel');
        expect(panel).toHaveAttribute('aria-labelledby', tab.id);
      }
      expect(conditionTab()).toHaveAttribute('tabindex', '0');
      expect(jsonTab()).toHaveAttribute('tabindex', '-1');

      conditionTab().focus();
      await user.keyboard('{ArrowRight}');
      expect(jsonTab()).toHaveFocus();
      expect(jsonTab()).toHaveAttribute('aria-selected', 'true');
      await user.keyboard('{ArrowRight}');
      expect(conditionTab()).toHaveAttribute('aria-selected', 'true');
      await user.keyboard('{End}');
      expect(jsonTab()).toHaveAttribute('aria-selected', 'true');
      await user.keyboard('{Home}');
      expect(conditionTab()).toHaveFocus();
      await user.keyboard('{ArrowLeft}');
      expect(jsonTab()).toHaveAttribute('aria-selected', 'true');
    });

    it('shows one panel and exactly one main landmark at a time (FR-005)', async () => {
      const user = userEvent.setup();
      render(<ExpressionBuilderShell adapter={createAdapter()} />);

      expect(screen.getAllByRole('main')).toHaveLength(1);
      expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Condition builder, 0 rules');

      await user.click(jsonTab());
      expect(screen.getAllByRole('main')).toHaveLength(1);
      expect(screen.getByRole('tabpanel')).toHaveAccessibleName('JSON reference');
      expect(screen.queryByRole('heading', { name: /condition builder/i })).not.toBeInTheDocument();
    });

    it('swaps the mode switch, Import and Export for the privacy sentence (FR-006)', async () => {
      const user = userEvent.setup();
      render(<ExpressionBuilderShell adapter={createAdapter()} />);
      const privacy = 'Pasted JSON is processed locally and is not uploaded or saved by this feature.';

      expect(screen.getByRole('radiogroup', { name: 'Expression mode' })).toBeInTheDocument();
      expect(screen.queryByText(privacy)).not.toBeInTheDocument();

      await user.click(jsonTab());
      expect(screen.queryByRole('radiogroup', { name: 'Expression mode' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Import' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument();
      expect(screen.getByText(privacy)).toBeInTheDocument();

      await user.click(conditionTab());
      expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
    });

    it('keeps JSON reference state while switching, but not the copied status (FR-008)', async () => {
      const user = userEvent.setup();
      render(<ExpressionBuilderShell adapter={createAdapter()} />);
      await exerciseJsonReference(user);
      expect(screen.getByText('Expression copied')).toBeInTheDocument();

      await user.click(conditionTab());
      await user.click(jsonTab());

      expect(screen.getByLabelText('Action name')).toHaveValue('Get items');
      expect(screen.getByLabelText('Sample JSON')).toHaveValue(fixtureA1);
      expect(screen.getByRole('treeitem', { name: /^body, object$/ })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('radio', { name: 'Inside text @{…}' })).toBeChecked();
      expect(screen.getByLabelText('Reference expression')).toHaveTextContent("@{outputs('Get_items')?['body']}");
      expect(screen.getByText('Inline text: use inside a string')).toBeInTheDocument();
    });

    it('leaves the document, mode, predicate and Export output unchanged (FR-009, SC-003)', async () => {
      const user = userEvent.setup();
      const adapter = createAdapter();
      render(<ExpressionBuilderShell adapter={adapter} initialDocument={sampleDocument} />);
      const exportJson = async () => {
        await user.click(screen.getByRole('button', { name: 'Export' }));
        return vi.mocked(adapter.copyToClipboard).mock.lastCall?.[0];
      };

      const expressionBefore = screen.getByLabelText('Generated expression').textContent;
      const exportBefore = await exportJson();
      await exerciseJsonReference(user);
      await user.click(conditionTab());

      expect(screen.getByLabelText('Generated expression').textContent).toBe(expressionBefore);
      expect(screen.getByRole('radio', { name: 'Trigger condition' })).toHaveAttribute('aria-checked', 'true');
      expect(await exportJson()).toBe(exportBefore);
      expect(adapter.settings.set).not.toHaveBeenCalled();
      expect(adapter.settings.remove).not.toHaveBeenCalled();
    });

    it('opens on the Condition builder with an empty JSON reference after a reload (user story 3, scenario 3)', async () => {
      const user = userEvent.setup();
      const { unmount } = render(<ExpressionBuilderShell adapter={createAdapter()} />);
      await exerciseJsonReference(user);
      unmount();

      render(<ExpressionBuilderShell adapter={createAdapter()} />);
      expect(conditionTab()).toHaveAttribute('aria-selected', 'true');
      await user.click(jsonTab());
      expect(screen.getByLabelText('Sample JSON')).toHaveValue('');
      expect(screen.getByText('Nothing parsed yet')).toBeInTheDocument();
    });
  });
  ```

- [ ] Run: `npx vitest run packages/builder-ui/test/builderSwitching.test.tsx`. Expected: FAIL, 10 failed; there is no `tablist` named "Builders".

- [ ] In `packages/builder-ui/src/workbench/types.ts`, replace `WorkbenchHeaderProps` with:

  ```ts
  /** Which builder the header tabs show. Not an ExpressionMode: it is never saved (CON-004). */
  export type BuilderView = 'condition' | 'jsonReference';

  export interface BuilderPanelIds {
    conditionTab: string;
    conditionPanel: string;
    jsonTab: string;
    jsonPanel: string;
  }

  export interface WorkbenchHeaderProps {
    mode: ExpressionMode;
    onModeChange: (mode: ExpressionMode) => void;
    onImport: () => void;
    onExport: () => void;
    builderView: BuilderView;
    onBuilderViewChange: (view: BuilderView) => void;
    /** Rules at every nesting level, groups excluded (FR-003). */
    ruleCount: number;
    panelIds: BuilderPanelIds;
  }
  ```

- [ ] Create `packages/builder-ui/src/workbench/BuilderTabs.tsx`:

  ```tsx
  import { useRef, type KeyboardEvent } from 'react';
  import { BuilderIcon, CodeIcon } from './icons/BuilderIcons';
  import type { BuilderPanelIds, BuilderView } from './types';

  interface BuilderTabsProps {
    view: BuilderView;
    ruleCount: number;
    ids: BuilderPanelIds;
    onChange: (view: BuilderView) => void;
  }

  const VIEWS: BuilderView[] = ['condition', 'jsonReference'];

  /**
   * WAI-ARIA tabs with automatic activation (FR-004): only the selected tab is in
   * the Tab order, and moving focus with the arrow keys, Home or End selects.
   */
  export function BuilderTabs({ ids, onChange, ruleCount, view }: BuilderTabsProps) {
    const tabs = useRef<Array<HTMLButtonElement | null>>([]);

    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const targets: Partial<Record<string, number>> = {
        ArrowRight: index + 1,
        ArrowLeft: index - 1,
        Home: 0,
        End: VIEWS.length - 1,
      };
      const target = targets[event.key];
      if (target === undefined) return;
      event.preventDefault();
      const next = (target + VIEWS.length) % VIEWS.length;
      onChange(VIEWS[next]);
      tabs.current[next]?.focus();
    };

    const rules = `${ruleCount} ${ruleCount === 1 ? 'rule' : 'rules'}`;

    return (
      <div className="eb-builder-tabs" role="tablist" aria-label="Builders">
        <button
          ref={(element) => {
            tabs.current[0] = element;
          }}
          id={ids.conditionTab}
          type="button"
          role="tab"
          className="eb-builder-tab"
          aria-selected={view === 'condition'}
          aria-controls={ids.conditionPanel}
          aria-label={`Condition builder, ${rules}`}
          tabIndex={view === 'condition' ? 0 : -1}
          onClick={() => onChange('condition')}
          onKeyDown={(event) => handleKeyDown(event, 0)}
        >
          <BuilderIcon aria-hidden="true" />
          <span>Condition builder</span>
          <span className="eb-builder-tab-count" aria-hidden="true">
            {ruleCount}
          </span>
        </button>
        <button
          ref={(element) => {
            tabs.current[1] = element;
          }}
          id={ids.jsonTab}
          type="button"
          role="tab"
          className="eb-builder-tab"
          aria-selected={view === 'jsonReference'}
          aria-controls={ids.jsonPanel}
          tabIndex={view === 'jsonReference' ? 0 : -1}
          onClick={() => onChange('jsonReference')}
          onKeyDown={(event) => handleKeyDown(event, 1)}
        >
          <CodeIcon aria-hidden="true" />
          <span>JSON reference</span>
        </button>
      </div>
    );
  }
  ```

- [ ] Replace `packages/builder-ui/src/workbench/WorkbenchHeader.tsx` with:

  ```tsx
  import { ModeSegmentedControl } from '../components/ModeSegmentedControl';
  import type { WorkbenchHeaderProps } from './types';
  import { ActionButton } from './controls/ActionButton';
  import { BuilderTabs } from './BuilderTabs';
  import { ExportIcon, ImportIcon } from './icons/BuilderIcons';

  export function WorkbenchHeader({
    builderView,
    mode,
    onBuilderViewChange,
    onExport,
    onImport,
    onModeChange,
    panelIds,
    ruleCount,
  }: WorkbenchHeaderProps) {
    return (
      <header className="eb-workbench-header">
        <div className="eb-header-brand">
          <div className="eb-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 7h12M8 12h8M8 17h6" />
              <path d="M4 7l2-2-2-2M4 17l2 2-2 2" />
            </svg>
          </div>
          <div className="eb-header-titles">
            <h1>Power Automate Expression Builder</h1>
            <p>For Triggers and Filters</p>
          </div>
        </div>

        <BuilderTabs view={builderView} ruleCount={ruleCount} ids={panelIds} onChange={onBuilderViewChange} />

        {builderView === 'condition' ? (
          <>
            <ModeSegmentedControl mode={mode} onChange={onModeChange} />

            <div className="eb-header-actions">
              <ActionButton variant="ghost" onClick={onImport} icon={<ImportIcon />}>
                Import
              </ActionButton>
              <ActionButton variant="primary" onClick={onExport} icon={<ExportIcon />}>
                Export
              </ActionButton>
            </div>
          </>
        ) : (
          <p className="eb-header-privacy">
            Pasted JSON is processed locally and is not uploaded or saved by this feature.
          </p>
        )}
      </header>
    );
  }
  ```

- [ ] Edit `packages/builder-ui/src/app/ExpressionBuilderShell.tsx`:

  1. Replace the React import with `import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';`.

  2. Replace the `./builderState` import with `import { countRules, deriveBuilderState, findFirstRule, findRule, getDefaultValue, getSafeOperator } from './builderState';`.

  3. After `import { BuilderDragDropProvider } from '../workbench/BuilderDragDropProvider';`, add:

     ```tsx
     import { JsonReferenceWorkspace } from '../workbench/JsonReferenceWorkspace';
     import type { BuilderPanelIds, BuilderView } from '../workbench/types';
     ```

  4. Directly after `useEffect(() => () => clearTimeout(copyResetTimer.current), []);`, add:

     ```tsx
       // Which builder is showing. Never persisted: every load opens on the
       // Condition builder (FR-002) and a reload drops JSON reference state
       // (FR-008). The JSON workspace mounts the first time it is opened and then
       // stays mounted while hidden, so its state survives switching.
       const [builderView, setBuilderView] = useState<BuilderView>('condition');
       const [jsonReferenceOpened, setJsonReferenceOpened] = useState(false);
       const builderIdBase = useId();
       const panelIds: BuilderPanelIds = {
         conditionTab: `${builderIdBase}-condition-tab`,
         conditionPanel: `${builderIdBase}-condition-panel`,
         jsonTab: `${builderIdBase}-json-tab`,
         jsonPanel: `${builderIdBase}-json-panel`,
       };
       const changeBuilderView = (view: BuilderView) => {
         setBuilderView(view);
         if (view === 'jsonReference') setJsonReferenceOpened(true);
       };
     ```

  5. After `const derived = useMemo(() => deriveBuilderState(document), [document]);`, add `const ruleCount = useMemo(() => countRules(document.root), [document.root]);`.

  6. Replace the `<WorkbenchHeader … />` element with:

     ```tsx
             <WorkbenchHeader
               mode={document.mode}
               onModeChange={updateMode}
               onExport={() => void exportDocument()}
               onImport={() => setDialog('importExpression')}
               builderView={builderView}
               onBuilderViewChange={changeBuilderView}
               ruleCount={ruleCount}
               panelIds={panelIds}
             />
     ```

  7. Replace the whole `<BuilderDragDropProvider>…</BuilderDragDropProvider>` element with the block below.
     - The old `<main className="eb-workspace">` becomes the Condition tab panel, inside one new `<main>`.
     - Its children are unchanged except for one extra level of indentation.
     - The JSON tab panel follows it.

     ```tsx
             <BuilderDragDropProvider
               fields={document.fields}
               root={document.root}
               onInsertField={insertFieldAtPosition}
               onReorderNode={reorderConditionNode}
               onMoveNode={moveConditionNode}
             >
               {/* One main landmark for both builders (FR-005); each builder is a tab panel inside it. */}
               <main className="eb-builder-main">
                 <div
                   id={panelIds.conditionPanel}
                   role="tabpanel"
                   aria-labelledby={panelIds.conditionTab}
                   hidden={builderView !== 'condition'}
                   className="eb-builder-panel eb-workspace"
                   style={
                     {
                       '--eb-left-dock-width': workbench.leftDockCollapsed ? '68px' : '286px',
                       '--eb-right-dock-width': workbench.rightDockCollapsed ? '68px' : '330px',
                     } as CSSProperties
                   }
                 >
                   <FieldToolboxPane
                     fields={document.fields}
                     source={document.source ?? { kind: 'unknown' }}
                     collapsed={workbench.leftDockCollapsed}
                     onToggleCollapsed={() =>
                       setWorkbench((current) => toggleDock(current, 'left'))
                     }
                     onSwitchTable={() => setDialog('tablePicker')}
                     onImport={() => setDialog('import')}
                     onAddField={() => setDialog('addField')}
                     onLoadSamples={loadSampleFields}
                     canConnectTable={canConnectTable}
                     onManageProfiles={() => setDialog('profiles')}
                     onRefresh={() => {
                       const table = document.source?.tableLogicalName;
                       const label = document.source?.label ?? table ?? 'Dataverse';
                       const includeRelated = document.source?.includeRelated ?? false;
                       void runBusy('Refreshing fields…', () =>
                         table ? connectFieldsCached(table, label, includeRelated, true) : connectFields(),
                       );
                     }}
                     relatedSections={relatedSections}
                     onExpandRelated={handleExpandRelated}
                     onCreateRuleFromField={createRuleFromField}
                   />

                   <div className="eb-center-col">
                     <ConditionCanvas
                       root={document.root}
                       fields={document.fields}
                       mode={document.mode}
                       selectedRuleId={selectedRule?.id}
                       activeGroupId={document.activeGroupId ?? document.root.id}
                       onFocusGroup={(groupId) =>
                         setDocument((current) => focusGroup(current, groupId))
                       }
                       onRequestRemap={(ruleId) => {
                         setDocument((current) => selectRule(current, ruleId));
                         setDialog('remap');
                       }}
                       onSelectRule={(ruleId) => {
                         setDocument((current) => selectRule(current, ruleId));
                         setImportDiagnostics([]);
                       }}
                       onAddRule={(groupId) =>
                         setDocument((current) =>
                           addRule(current, groupId, {
                             fieldId: current.fields[0]?.id ?? '',
                             operator: 'equals',
                             value: getDefaultValue(current.fields[0]),
                           }),
                         )
                       }
                       onAddGroup={(groupId) =>
                         setDocument((current) => addGroup(current, groupId))
                       }
                       onChangeGroupConjunction={(groupId, conjunction) =>
                         setDocument((current) =>
                           changeGroupConjunction(current, groupId, conjunction),
                         )
                       }
                       onUpdateRule={(ruleId, patch) => {
                         setDocument((current) => updateRule(current, ruleId, patch));
                         setImportDiagnostics([]);
                       }}
                       onDuplicateRule={(ruleId) =>
                         setDocument((current) => duplicateRule(current, ruleId))
                       }
                       onDeleteNode={(nodeId) =>
                         setDocument((current) => deleteNode(current, nodeId))
                       }
                       onReorderNode={reorderConditionNode}
                       onMoveNode={(nodeId, targetGroupId) => moveConditionNode(nodeId, targetGroupId)}
                       onClear={() => setDocument((current) => clearDocument(current))}
                     />

                     <ExpressionDocumentPanel
                       expression={derived.expression}
                       collapsed={workbench.previewCollapsed}
                       copyState={workbench.copyState}
                       onToggleCollapsed={() =>
                         setWorkbench((current) => togglePreview(current))
                       }
                       onCopy={() => void copyExpression()}
                     />
                   </div>

                   <SupportPane
                     mode={document.mode}
                     diagnostics={diagnostics}
                     activeTab={workbench.rightTab}
                     collapsed={workbench.rightDockCollapsed}
                     onTabChange={(rightTab) =>
                       setWorkbench((current) => ({ ...current, rightTab }))
                     }
                     onToggleCollapsed={() =>
                       setWorkbench((current) => toggleDock(current, 'right'))
                     }
                   />
                 </div>

                 <div
                   id={panelIds.jsonPanel}
                   role="tabpanel"
                   aria-labelledby={panelIds.jsonTab}
                   hidden={builderView !== 'jsonReference'}
                   className="eb-builder-panel eb-json-panel"
                 >
                   {jsonReferenceOpened ? (
                     <JsonReferenceWorkspace adapter={adapter} active={builderView === 'jsonReference'} />
                   ) : null}
                 </div>
               </main>
             </BuilderDragDropProvider>
     ```

- [ ] Run: `npx vitest run packages/builder-ui/test/builderSwitching.test.tsx`. Expected: PASS, 10 passed.
- [ ] Run the regression set: `npx vitest run packages/builder-ui`, `npm run lint`, then `npm run typecheck`. Expected:
  - vitest: PASS, including the unchanged `sharedBuilderUi.test.tsx` (its header assertions still hold) and `dragDropStyles.test.ts`;
  - lint and typecheck: exit 0.
- [ ] Commit: `feat(builder-ui): switch between the Condition and JSON reference builders from header tabs`

> **Complexity note.** Gate: Simplicity (one canonical state). Decision: the JSON workspace keeps its own reducer and stays mounted, hidden, after first use, instead of lifting its state into the shell. Justification:
> - FR-008 needs every choice kept, including tree expansion and focus, until reload.
> - Keeping it mounted does that without a second copy of the state.
> - The Condition builder's lifecycle stays exactly as today (FR-009).
> - Mounting on first use keeps first load and the existing tests unchanged.

---

## Phase 11: Styles: header fit, workspace layout, theme and contrast

**Implements:** FR-005 (the hidden panel), FR-007, FR-052 (50% opacity), FR-085 (text contrast), FR-090, FR-091, FR-092, FR-093 | **Satisfies:** AC-3.4 (visual), AC-6.3
**Files:** `packages/builder-ui/src/theme/tokens.css`, `packages/builder-ui/test/jsonReferenceStyles.test.ts` (new)
**Interfaces:** Consumes: the class names rendered in Phases 7–10. Produces:
- rules for `.eb-builder-*`, `.eb-header-privacy`, `.eb-json-*`, `.eb-choice-*`, `.eb-payload-tree` and `.eb-tree-*`;
- `.eb-field-type-badge.object`, `.array` and `.null`;
- the theme-derived `--code-fn` variable.

The CSS was measured in Chromium against the real shell:
- The header stays one 71px row from 901px to 1,440px in both views, and the tab strip fits at 375px.
- The workspace keeps the tree scrolling inside its card on wide screens, and the page scrolling as one at 900px and below.

All colours come from Graphite tokens; `themeColorAudit.test.ts` fails on any hex or `rgb()` value. Every new rule is additive, and every new media query is a separate block. The existing `dragDropStyles.test.ts` contract reads only the first block for a query and the base rules, so it is unaffected.

- [ ] Write `packages/builder-ui/test/jsonReferenceStyles.test.ts`:

  ```ts
  import { readFileSync } from 'node:fs';
  import { resolve } from 'node:path';
  import { fileURLToPath } from 'node:url';
  import { describe, expect, it } from 'vitest';

  // CI runs no browser, so these pin the layout rules the e2e spec verifies.
  const css = readFileSync(
    resolve(fileURLToPath(new URL('../src/', import.meta.url)), 'theme/tokens.css'),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '');

  /** Every block for one exact media query, joined. */
  function mediaBlocks(query: string): string {
    const blocks: string[] = [];
    for (let start = css.indexOf(`@media (${query})`); start !== -1; start = css.indexOf(`@media (${query})`, start + 1)) {
      const open = css.indexOf('{', start);
      let depth = 0;
      for (let index = open; index < css.length; index += 1) {
        if (css[index] === '{') depth += 1;
        else if (css[index] === '}' && --depth === 0) {
          blocks.push(css.slice(open + 1, index));
          break;
        }
      }
    }
    if (blocks.length === 0) throw new Error(`Missing media query: ${query}`);
    return blocks.join('\n');
  }

  function rule(source: string, selector: string): string {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`(?:^|[}\\s,])${escaped}\\s*\\{([^}]*)\\}`).exec(source);
    if (!match) throw new Error(`Missing rule: ${selector}`);
    return match[1];
  }

  describe('JSON reference styles', () => {
    it('hides the inactive builder panel even where a display rule applies (FR-005)', () => {
      expect(rule(css, '.eb-builder-panel[hidden]')).toMatch(/display:\s*none;/);
    });

    it('keeps the header one row and 71px tall above 900px (FR-007)', () => {
      expect(rule(css, '.eb-builder-tabs')).toMatch(/min-height:\s*70px;/);
      expect(rule(css, '.eb-builder-tabs')).toMatch(/margin-block:\s*-12px;/);
      const wide = mediaBlocks('min-width: 901px');
      expect(rule(wide, '.eb-header-actions')).toMatch(/flex-wrap:\s*nowrap;/);
      expect(rule(wide, '.eb-header-brand')).toMatch(/flex:\s*0 999 auto;/);
      expect(wide).toMatch(/text-overflow:\s*ellipsis;/);
      expect(mediaBlocks('min-width: 901px) and (max-width: 1180px')).toMatch(/clip:\s*rect\(0, 0, 0, 0\);/);
    });

    it('scrolls the tree inside its card on wide screens and the workspace as one when stacked (FR-092)', () => {
      expect(rule(css, '.eb-payload-tree')).toMatch(/overflow:\s*auto;/);
      expect(rule(css, '.eb-json-workspace')).toMatch(/overflow-y:\s*auto;/);
      const stacked = mediaBlocks('max-width: 900px');
      expect(rule(stacked, '.eb-json-workspace')).toMatch(/flex-direction:\s*column;/);
      expect(rule(stacked, '.eb-payload-tree')).toMatch(/overflow-y:\s*hidden;/);
      expect(rule(stacked, '.eb-builder-tabs')).toMatch(/flex:\s*1 1 100%;/);
    });

    it('meets text contrast for function names and payload roots in light mode (FR-085)', () => {
      expect(rule(css, '.fn')).toMatch(/color:\s*var\(--code-fn\);/);
      expect(rule(css, '.eb-root[data-theme="light"]')).toMatch(
        /--code-fn:\s*color-mix\(in srgb, var\(--accent-2\) 85%, var\(--text\)\);/,
      );
      expect(rule(css, '.eb-root[data-theme="dark"]')).toMatch(/--code-fn:\s*var\(--accent-2\);/);
    });

    it('shows a disabled Copy at 50% opacity (FR-052)', () => {
      expect(rule(css, '.eb-json-copy-row .eb-action-btn:disabled')).toMatch(/opacity:\s*0\.5;/);
    });

    it('animates only through the shared duration token, which reduced motion shortens (FR-093)', () => {
      expect(rule(css, '.eb-tree-chevron')).toMatch(/transition:\s*transform var\(--duration-fast\) ease;/);
    });
  });
  ```

- [ ] Run: `npx vitest run packages/builder-ui/test/jsonReferenceStyles.test.ts`. Expected: FAIL, 6 failed (`Missing rule: .eb-builder-panel[hidden]`, …).

- [ ] Edit `packages/builder-ui/src/theme/tokens.css`:

  1. In the `.eb-root[data-theme="light"] { … }` block, after `--r-card: var(--r-sm);`, add:

     ```css
       /* --accent-2 is 4.4:1 on --surface2 and 4.2:1 on --accent-soft; function names
          and payload roots need 4.5:1, so light mode darkens it towards --text. */
       --code-fn: color-mix(in srgb, var(--accent-2) 85%, var(--text));
     ```

  2. In the `.eb-root[data-theme="dark"] { … }` block, after `--r-card: var(--r-sm);`, add `--code-fn: var(--accent-2);`.

  3. In the `.fn` rule, replace `color: var(--accent-2);` with `color: var(--code-fn);`.

  4. Append at the end of the file, after the `.eb-busy-overlay` rule:

     ```css
     /* Builder tabs (FR-001, FR-004). The strip spans the header's full height so
        the selected tab's accent line sits on the header border. min-height is the
        46px row the mode switch sets plus the 24px of header padding, so the header
        stays 71px in both views, with or without the mode switch (FR-007). */
     .eb-builder-tabs {
       display: flex;
       align-self: stretch;
       flex: 0 0 auto;
       margin-block: -12px;
       min-height: 70px;
       padding-left: 16px;
       border-left: 1px solid var(--border);
     }

     .eb-builder-tab {
       display: inline-flex;
       align-items: center;
       gap: 6px;
       min-height: 44px;
       padding: 0 12px;
       border: 0;
       border-bottom: 3px solid transparent;
       border-radius: 0;
       background: transparent;
       color: var(--text3);
       font-size: 0.85rem;
       font-weight: 700;
       white-space: nowrap;
       cursor: pointer;
       transition: color var(--duration-fast) ease, border-color var(--duration-fast) ease;
     }

     .eb-builder-tab:hover {
       color: var(--text);
     }

     .eb-builder-tab[aria-selected="true"] {
       color: var(--text);
       border-bottom-color: var(--accent);
     }

     .eb-builder-tab svg {
       width: 15px;
       height: 15px;
       flex: 0 0 auto;
     }

     .eb-builder-tab-count {
       min-width: 20px;
       height: 18px;
       padding: 0 6px;
       border-radius: var(--r-circ);
       background: var(--surface3);
       color: var(--text2);
       font-size: 11px;
       display: inline-flex;
       align-items: center;
       justify-content: center;
     }

     .eb-header-privacy {
       margin: 0 0 0 auto;
       flex: 0 1 420px;
       min-width: 0;
       font-size: 12.5px;
       line-height: 1.35;
       color: var(--text3);
     }

     /* Builder panels (FR-005): one main landmark holds both tab panels; the
        hidden one is display:none, which author display rules would otherwise win. */
     .eb-builder-main {
       flex: 1 1 auto;
       min-height: 0;
       display: flex;
       flex-direction: column;
     }

     .eb-builder-panel[hidden] {
       display: none;
     }

     .eb-json-panel {
       flex: 1 1 auto;
       min-height: 0;
       display: flex;
       flex-direction: column;
     }

     /* JSON reference workspace (FR-090, FR-092). Single-line flex on wide screens
        so the stretched content column has a definite height and the tree, not the
        page, scrolls. */
     .eb-json-workspace {
       flex: 1 1 auto;
       min-height: 0;
       display: flex;
       align-items: stretch;
       gap: 18px;
       padding: 18px;
       overflow-x: hidden;
       overflow-y: auto;
     }

     .eb-json-card {
       min-height: 0;
       min-width: 0;
       display: flex;
       flex-direction: column;
       border-radius: var(--r-panel);
       border: 1px solid var(--border);
       background: var(--surface);
       box-shadow: var(--shadow-sm);
       overflow: hidden;
     }

     .eb-json-card-header {
       height: 38px;
       display: flex;
       align-items: center;
       gap: 8px;
       padding: 0 12px;
       border-bottom: 1px solid var(--border);
       background: var(--surface2);
       flex: 0 0 auto;
     }

     .eb-json-card-header h2 {
       margin: 0;
       display: inline-flex;
       align-items: center;
       gap: 6px;
       font-size: 0.7rem;
       font-weight: 800;
       letter-spacing: 0.06em;
       text-transform: uppercase;
       color: var(--text3);
     }

     .eb-json-card-header h2 svg {
       width: 13px;
       height: 13px;
     }

     .eb-json-card-body {
       min-height: 0;
       display: flex;
       flex-direction: column;
       gap: 12px;
       padding: 14px;
     }

     .eb-json-source {
       flex: 1 1 300px;
       min-height: 560px;
     }

     .eb-json-source .eb-json-card-body {
       flex: 1 1 auto;
       gap: 14px;
       overflow-y: auto;
     }

     .eb-json-content {
       flex: 999 1 520px;
       min-width: 0;
       display: flex;
       flex-direction: column;
       gap: 18px;
     }

     .eb-json-payload {
       flex: 1 1 auto;
       min-height: 320px;
     }

     .eb-json-reference {
       flex: 0 0 auto;
     }

     /* Source pane */
     .eb-json-field {
       display: flex;
       flex-direction: column;
       gap: 6px;
       min-width: 0;
     }

     .eb-json-field .eb-label {
       margin-bottom: 0;
     }

     .eb-json-help {
       margin: 0;
       font-size: 12px;
       color: var(--text3);
     }

     .eb-json-help.is-invalid {
       color: var(--danger);
     }

     .eb-input[aria-invalid="true"] {
       border-color: var(--danger);
     }

     .eb-json-sample {
       flex: 1 1 auto;
     }

     .eb-json-sample .eb-textarea {
       flex: 1 1 auto;
       min-height: 180px;
     }

     .eb-json-parse-row,
     .eb-json-copy-row {
       display: flex;
       flex-wrap: wrap;
       align-items: center;
       gap: 10px;
     }

     .eb-json-status,
     .eb-json-copy-status {
       font-size: 12.5px;
       font-weight: 700;
     }

     .eb-json-copy-status {
       margin-left: auto;
     }

     .eb-json-status.is-muted,
     .eb-json-copy-status.is-muted {
       color: var(--text3);
     }

     .eb-json-status.is-good,
     .eb-json-copy-status.is-good {
       color: var(--good);
     }

     .eb-json-status.is-warn {
       color: var(--warn);
     }

     .eb-json-status.is-danger,
     .eb-json-copy-status.is-danger {
       color: var(--danger);
     }

     .eb-json-error,
     .eb-json-hint {
       margin: 0;
       padding: 10px 12px;
       border-radius: var(--r-lg);
       color: var(--text);
       font-size: 0.8rem;
       overflow-wrap: anywhere;
     }

     .eb-json-error {
       border: 1px solid var(--danger);
       background: var(--danger-soft);
     }

     .eb-json-hint {
       margin: 12px 14px 0;
       border: 1px solid var(--warn);
       background: var(--warn-soft);
     }

     .eb-json-hint code {
       font-family: var(--eb-mono);
     }

     /* Radio groups (FR-081): Output from as a pill, The pasted JSON is as cards,
        Copy format as a small segmented control. */
     .eb-choice-pill,
     .eb-choice-segmented {
       display: inline-flex;
       align-self: flex-start;
       border-radius: var(--r-circ);
       border: 1px solid var(--interactive-stroke);
     }

     .eb-choice-pill {
       gap: 4px;
       padding: 4px;
       background: var(--surface3);
     }

     .eb-choice-segmented {
       gap: 2px;
       padding: 2px;
       background: var(--surface2);
     }

     .eb-choice-pill [role="radio"],
     .eb-choice-segmented [role="radio"] {
       border: none;
       border-radius: var(--r-circ);
       background: transparent;
       white-space: nowrap;
       cursor: pointer;
       transition: background var(--duration-fast) ease, color var(--duration-fast) ease;
     }

     .eb-choice-pill [role="radio"] {
       height: 32px;
       padding: 0 14px;
       color: var(--text3);
       font-size: 12.2px;
       font-weight: 800;
     }

     .eb-choice-segmented [role="radio"] {
       height: 24px;
       padding: 0 12px;
       color: var(--text2);
       font-size: 0.78rem;
       font-weight: 700;
     }

     .eb-choice-pill [aria-checked="true"],
     .eb-choice-segmented [aria-checked="true"] {
       background: linear-gradient(135deg, var(--accent), var(--accent-strong));
       color: var(--accent-ink);
     }

     .eb-choice-cards {
       display: flex;
       flex-direction: column;
       gap: 8px;
     }

     .eb-choice-cards [role="radio"] {
       display: flex;
       flex-direction: column;
       align-items: flex-start;
       gap: 4px;
       padding: 10px 12px;
       border: 1px solid var(--border);
       border-radius: var(--r-lg);
       background: var(--surface);
       color: var(--text);
       text-align: left;
       cursor: pointer;
       transition: border-color var(--duration-fast) ease, background var(--duration-fast) ease;
     }

     .eb-choice-cards [role="radio"]:hover {
       border-color: var(--border-strong);
     }

     .eb-choice-cards [aria-checked="true"],
     .eb-choice-cards [aria-checked="true"]:hover {
       border-color: var(--accent);
       background: var(--accent-soft);
     }

     .eb-choice-cards .eb-choice-label {
       font-size: 0.85rem;
       font-weight: 700;
     }

     .eb-choice-cards .eb-choice-detail {
       font-family: var(--eb-mono);
       font-size: 12px;
       color: var(--code-fn);
       overflow-wrap: anywhere;
     }

     .eb-choice-cards code {
       font: inherit;
     }

     /* Payload tree (FR-031 to FR-036) */
     .eb-json-empty {
       flex: 1 1 auto;
       display: flex;
       flex-direction: column;
       align-items: center;
       justify-content: center;
       gap: 6px;
       padding: 24px;
       text-align: center;
       color: var(--text3);
       font-size: 0.85rem;
     }

     .eb-json-empty p {
       margin: 0;
     }

     .eb-json-empty .eb-json-empty-title {
       color: var(--text);
       font-weight: 700;
     }

     .eb-payload-tree {
       flex: 1 1 auto;
       min-height: 0;
       overflow: auto;
       padding: 8px;
       display: flex;
       flex-direction: column;
       gap: 2px;
     }

     .eb-tree-row {
       display: flex;
       align-items: center;
       gap: 8px;
       flex: 0 0 auto;
       min-height: 32px;
       padding: 0 10px 0 calc(10px + (var(--eb-tree-level) - 1) * 18px);
       border: 1px solid transparent;
       border-radius: var(--r-sm);
       color: var(--text);
       font-size: 12.5px;
       white-space: nowrap;
       cursor: pointer;
       transition: border-color var(--duration-fast) ease, background var(--duration-fast) ease;
     }

     .eb-tree-row:hover {
       border-color: var(--border-strong);
     }

     .eb-tree-row[aria-selected="true"] {
       border-color: var(--accent);
       background: var(--accent-soft);
     }

     .eb-tree-row:focus-visible {
       outline: none;
       box-shadow: var(--focus-ring);
     }

     .eb-tree-chevron {
       width: 20px;
       height: 20px;
       flex: 0 0 auto;
       display: inline-flex;
       align-items: center;
       justify-content: center;
       color: var(--text3);
       transition: transform var(--duration-fast) ease;
     }

     .eb-tree-chevron svg {
       width: 14px;
       height: 14px;
     }

     .eb-tree-chevron.is-expanded {
       transform: rotate(90deg);
     }

     .eb-tree-label {
       flex: 0 1 auto;
       min-width: 0;
       overflow: hidden;
       text-overflow: ellipsis;
     }

     .eb-tree-label.is-key {
       font-weight: 700;
     }

     .eb-tree-label.is-root,
     .eb-tree-label.is-index,
     .eb-tree-more .eb-tree-label,
     .eb-tree-preview {
       font-family: var(--eb-mono);
       font-size: 12px;
     }

     .eb-tree-label.is-root {
       color: var(--code-fn);
     }

     .eb-tree-label.is-index,
     .eb-tree-preview {
       color: var(--text3);
     }

     .eb-tree-more .eb-tree-label {
       color: var(--accent);
     }

     .eb-tree-preview {
       flex: 1 1 auto;
       min-width: 0;
       overflow: hidden;
       text-overflow: ellipsis;
     }

     .eb-field-type-badge.object,
     .eb-field-type-badge.array {
       background: var(--accent);
     }

     .eb-field-type-badge.null {
       background: var(--text3);
     }

     /* Reference card (FR-043 to FR-046, FR-050 to FR-054) */
     .eb-json-summary {
       min-width: 0;
       overflow: hidden;
       text-overflow: ellipsis;
       white-space: nowrap;
       font-family: var(--eb-mono);
     }

     .eb-json-breadcrumb ol {
       display: flex;
       flex-wrap: wrap;
       align-items: center;
       gap: 4px;
       margin: 0;
       padding: 0;
       list-style: none;
     }

     .eb-json-breadcrumb li {
       display: inline-flex;
       align-items: center;
       gap: 4px;
       min-width: 0;
     }

     .eb-json-crumb {
       padding: 2px 8px;
       border-radius: var(--r-circ);
       border: 1px solid var(--border);
       background: var(--surface2);
       color: var(--text2);
       font-family: var(--eb-mono);
       font-size: 12px;
       overflow-wrap: anywhere;
     }

     .eb-json-crumb-separator {
       color: var(--text3);
     }

     .eb-json-placeholder {
       color: var(--text3);
       font-family: var(--eb-font);
     }

     .eb-json-note {
       margin: 0;
       color: var(--warn);
       font-size: 12.5px;
       font-weight: 700;
     }

     /* FR-052: not operable, and shown at 50% opacity. */
     .eb-json-copy-row .eb-action-btn:disabled {
       opacity: 0.5;
       cursor: not-allowed;
     }

     /* Header fit above 900px (FR-007): one row, never taller than today. The title
        truncates first (it stays whole for assistive technology), and the brand
        keeps at least its 34px mark plus the 14px gap. */
     @media (min-width: 901px) {
       .eb-header-brand {
         flex: 0 999 auto;
         min-width: 48px;
       }

       .eb-header-titles {
         overflow: hidden;
       }

       .eb-header-titles h1,
       .eb-header-titles p {
         white-space: nowrap;
         overflow: hidden;
         text-overflow: ellipsis;
       }

       .eb-header-actions {
         flex: 0 0 auto;
         flex-wrap: nowrap;
       }
     }

     /* Where truncating the title is not enough, Import and Export go icon-only; the
        clipped label keeps each button's accessible name. */
     @media (min-width: 901px) and (max-width: 1180px) {
       .eb-workbench-header .eb-action-btn > span:not(.eb-action-icon) {
         position: absolute;
         width: 1px;
         height: 1px;
         margin: -1px;
         overflow: hidden;
         clip: rect(0, 0, 0, 0);
         white-space: nowrap;
       }

       .eb-workbench-header .eb-action-btn {
         padding: 0 10px;
       }
     }

     /* Stacked (FR-092): the tabs take their own row under the brand, the JSON
        panes stack with Source first, and the workspace scrolls as one. */
     @media (max-width: 900px) {
       .eb-builder-tabs {
         order: 2;
         flex: 1 1 100%;
         margin-block: 0;
         min-height: 0;
         padding-left: 0;
         border-left: 0;
       }

       .eb-header-privacy {
         order: 3;
         flex: 1 1 100%;
         margin-left: 0;
       }

       .eb-json-workspace {
         flex-direction: column;
       }

       .eb-json-workspace > *,
       .eb-json-content > * {
         flex: 0 0 auto;
       }

       .eb-json-source,
       .eb-json-payload {
         min-height: 0;
       }

       .eb-json-source .eb-json-card-body {
         overflow: visible;
       }

       /* Deep keys can still scroll sideways inside the card, never the page. */
       .eb-payload-tree {
         flex: 0 0 auto;
         overflow-x: auto;
         overflow-y: hidden;
       }
     }

     @media (max-width: 700px) {
       .eb-json-workspace,
       .eb-json-content {
         gap: 12px;
       }

       .eb-json-workspace {
         padding: 12px;
       }
     }

     /* The whole tab strip fits at 375px (FR-092). */
     @media (max-width: 480px) {
       .eb-builder-tab {
         flex: 1 1 auto;
         justify-content: center;
         padding: 0 8px;
       }

       .eb-builder-tab svg {
         display: none;
       }
     }
     ```

- [ ] Run: `npx vitest run packages/builder-ui/test/jsonReferenceStyles.test.ts packages/builder-ui/test/dragDropStyles.test.ts packages/builder-ui/test/themeColorAudit.test.ts packages/builder-ui/test/workbenchTokens.test.ts`. Expected: PASS.
- [ ] Commit: `feat(builder-ui): style the builder tabs and the JSON reference workspace`

> **Complexity note.** Gate: Simplicity (a new token). Addition: the derived variable `--code-fn`. Justification: FR-085 forbids serious axe violations in both views. Today's light-mode `.fn` colour measured 4.43:1 on `--surface2` and fails, and the same teal on `--accent-soft` (selected tree rows, checked cards) is 4.15:1. The mix of 85% `--accent-2` and 15% `--text` measures 5.3:1 and 5.0:1. Dark mode keeps `--accent-2`. FR-046 allows the colour change, and the Graphite palette in `workbenchTokens.ts` is unchanged.

---

## Phase 12: Rendered-browser evidence

**Implements:** FR-060, FR-063, FR-070, FR-074, FR-075, FR-085, CON-001, D-2 | **Satisfies:** AC-1.2, AC-3.1, AC-5.1, AC-5.2, AC-5.3, AC-5.4, AC-6.2, AC-6.3, AC-6.4; SC-002, SC-003, SC-004, SC-005, SC-007 (simulated host), SC-011, and a guard for SC-006
**Files:** `package.json`, `npm-shrinkwrap.json`, `.gitignore`, `test/workspaceBuildScripts.test.ts`, `tests/e2e/json-references.spec.ts` (new), `research/v2 update/verification.md`
**Interfaces:** Consumes:
- everything from Phases 1–11;
- the Phase 0 fixtures;
- the existing `playwright.config.ts`, which starts both dev servers: web on 5173, and PPTB on 5174 with a mocked `toolboxAPI`.

Produces: the rendered-browser evidence and guard tests that CI runs without a browser.

The browser layer that unit tests cannot cover:
- all four roots copied in both builds;
- byte-identical Export;
- zero network requests and storage writes;
- the keyboard-only task;
- an axe scan of both views in both themes;
- the six SC-011 viewports;
- honest copy failures in a PPTB host without a clipboard API;
- a 1 s guard on samples at the limits.

`@axe-core/playwright` is the only new package: a dev-only dependency (CON-001, owner decision).

- [ ] Add to `test/workspaceBuildScripts.test.ts`:
  1. Extend `PackageManifest` to:

     ```ts
     type PackageManifest = {
       scripts?: Record<string, string>;
       dependencies?: Record<string, string>;
       devDependencies?: Record<string, string>;
       description?: string;
       displayName?: string;
       keywords?: string[];
       cspExceptions?: unknown;
       features?: { minAPI?: string };
     };
     ```

  2. Add these tests before `it('keeps PPTB HTML free of remote font URLs …')`:

     ```ts
       it('keeps the PPTB bundle one self-contained classic script for srcdoc loading (FR-074)', () => {
         const viteConfig = readFileSync(resolve(process.cwd(), 'apps/pptb/vite.config.ts'), 'utf8');

         expect(viteConfig).toContain("format: 'iife'");
         expect(viteConfig).toContain('inlineDynamicImports: true');
       });

       it('keeps the PPTB manifest free of CSP exceptions, at minAPI 1.0.17 (FR-063, FR-075)', () => {
         const pptbManifest = readManifest('apps/pptb/package.json');

         expect(pptbManifest.cspExceptions).toBeUndefined();
         expect(pptbManifest.features?.minAPI).toBe('1.0.17');
       });

       it('adds no runtime dependency; the accessibility scanner is dev-only (CON-001)', () => {
         const rootManifest = readManifest('package.json');
         const builderUi = readManifest('packages/builder-ui/package.json');

         expect(Object.keys(rootManifest.dependencies ?? {})).toEqual(['@fluentui/react-components', 'react', 'react-dom']);
         expect(Object.keys(builderUi.dependencies ?? {}).sort()).toEqual([
           '@dnd-kit/collision',
           '@dnd-kit/dom',
           '@dnd-kit/react',
           '@fluentui/react-components',
           '@fluentui/react-icons',
           '@ryanmakes/eb_engine',
           '@ryanmakes/eb_platformadapter',
           'react',
           'react-dom',
         ]);
         expect(rootManifest.devDependencies).toHaveProperty('@axe-core/playwright');
       });

       it('commits the JSON reference e2e spec despite the tests/e2e ignore rule (D-2)', () => {
         const gitignore = readFileSync(resolve(process.cwd(), '.gitignore'), 'utf8');

         expect(gitignore).toContain('!/tests/e2e/json-references.spec.ts');
       });
     ```

- [ ] Run: `npx vitest run test/workspaceBuildScripts.test.ts`. Expected: FAIL, 2 failed: the CON-001 test (no `@axe-core/playwright`) and the D-2 test. The FR-074 and FR-063/FR-075 guards pass; they are regression guards.

- [ ] Install the scanner as a dev dependency: `npm install --save-dev @axe-core/playwright@^4.13.0`. This updates `package.json` and `npm-shrinkwrap.json`: it adds `@axe-core/playwright` and `axe-core` 4.13.0.
- [ ] In `.gitignore`, add `!/tests/e2e/json-references.spec.ts` directly after `!/tests/e2e/short-viewport-canvas.spec.ts`.
- [ ] Run: `npx vitest run test/workspaceBuildScripts.test.ts`. Expected: PASS.

- [ ] Write `tests/e2e/json-references.spec.ts`:

  ```ts
  import AxeBuilder from '@axe-core/playwright';
  import { expect, test, type Page } from 'playwright/test';
  import {
    fixtureA1,
    triggerBodySample,
    triggerFullSample,
  } from '../../packages/builder-ui/test/fixtures/jsonReferenceFixtures';

  type Build = 'web' | 'pptb';
  type Theme = 'light' | 'dark';

  declare global {
    interface Window {
      toolboxAPI?: unknown;
      __copied?: string[];
      __notices?: Array<{ title: string; body: string; type: string }>;
      __audit?: { enabled: boolean; writes: string[] };
    }
  }

  const URLS: Record<Build, string> = { web: 'http://127.0.0.1:5173/', pptb: 'http://127.0.0.1:5174/' };
  const BUILDS: Build[] = ['web', 'pptb'];
  const THEMES: Theme[] = ['light', 'dark'];
  const EMAIL = "outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']";
  const NO_CLIPBOARD = 'the host does not provide a clipboard API';
  // Today's header: the 46px mode switch row plus 24px padding and a 1px border.
  const TODAYS_HEADER_HEIGHT = 71;

  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  /** Loads a build with onboarding dismissed; the PPTB build gets a mocked toolboxAPI. */
  async function open(page: Page, build: Build, options: { theme?: Theme; clipboard?: boolean } = {}) {
    const { theme = 'light', clipboard = true } = options;
    await page.addInitScript(() => localStorage.setItem('eb.onboarding.seen.v1', '1'));
    if (build === 'pptb') {
      await page.addInitScript(
        ({ theme, clipboard }) => {
          window.__copied = [];
          window.__notices = [];
          window.toolboxAPI = {
            utils: {
              ...(clipboard ? { copyToClipboard: async (text: string) => void window.__copied?.push(text) } : {}),
              showNotification: async (notice: { title: string; body: string; type: string }) =>
                void window.__notices?.push(notice),
              getCurrentTheme: async () => theme,
            },
            settings: {
              get: async (key: string) => (key === 'eb.onboarding.seen.v1' ? '1' : undefined),
              set: async () => undefined,
              setAll: async () => undefined,
              getAll: async () => ({}),
            },
            events: { on: () => undefined, off: () => undefined, getHistory: async () => [] },
          };
        },
        { theme, clipboard },
      );
    } else {
      await page.emulateMedia({ colorScheme: theme });
    }
    await page.goto(URLS[build]);
    await expect(page.locator('.eb-root')).toHaveAttribute('data-theme', theme);
  }

  async function clipboardText(page: Page, build: Build): Promise<string | undefined> {
    return build === 'web'
      ? page.evaluate(() => navigator.clipboard.readText())
      : page.evaluate(() => window.__copied?.at(-1));
  }

  // Scoped: the drag-and-drop library adds its own live region, which is the page's first status.
  const parseStatus = (page: Page) => page.getByRole('region', { name: 'Source' }).getByRole('status');

  const treeRow = (page: Page, label: string) =>
    page.getByRole('treeitem', { name: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}, `) });

  async function openJsonReference(page: Page) {
    await page.getByRole('tab', { name: 'JSON reference' }).click();
  }

  async function parseSample(
    page: Page,
    source: { outputFrom: 'Action' | 'Trigger'; name?: string; shape: 'full' | 'body'; sample: string },
  ) {
    await page.getByRole('radio', { name: source.outputFrom }).click();
    if (source.name !== undefined) await page.getByLabel('Action name').fill(source.name);
    await page.getByRole('radio', { name: source.shape === 'full' ? /^Full output/ : 'Body only' }).click();
    await page.getByLabel('Sample JSON').fill(source.sample);
    await page.getByRole('button', { name: 'Parse' }).click();
    await expect(parseStatus(page)).toHaveText(/^Parsed · /);
  }

  /** Expands each ancestor by its chevron, then selects the last label. */
  async function select(page: Page, labels: string[]) {
    for (const label of labels.slice(0, -1)) {
      const row = treeRow(page, label);
      if ((await row.getAttribute('aria-expanded')) === 'false') await row.locator('[data-chevron]').click();
    }
    await treeRow(page, labels[labels.length - 1]).click();
  }

  async function addTwoRules(page: Page) {
    await page.getByRole('button', { name: 'Load sample fields' }).first().click();
    const addRule = page.getByRole('button', { name: 'Add rule to group root' });
    await addRule.click();
    await addRule.click();
  }

  async function loadEmailReference(page: Page) {
    await openJsonReference(page);
    await parseSample(page, { outputFrom: 'Action', name: 'Get items', shape: 'full', sample: fixtureA1 });
    await select(page, ['body', 'value', '[0]', 'Requester', 'Email']);
  }

  for (const build of BUILDS) {
    test.describe(`${build} build`, () => {
      test('copies a correctly rooted reference for each of the four roots (SC-002)', async ({ page }) => {
        await open(page, build);
        await openJsonReference(page);
        const bodyOnly = JSON.stringify(JSON.parse(fixtureA1).body);
        const cases = [
          { source: { outputFrom: 'Action', name: 'Get items', shape: 'full', sample: fixtureA1 }, path: ['body', 'value', '[0]', 'Requester', 'Email'], expected: EMAIL },
          { source: { outputFrom: 'Action', name: 'Get items', shape: 'body', sample: bodyOnly }, path: ['value', '[0]', 'Title'], expected: "body('Get_items')?['value'][0]?['Title']" },
          { source: { outputFrom: 'Trigger', shape: 'full', sample: triggerFullSample }, path: ['body', 'customer', 'name'], expected: "triggerOutputs()?['body']?['customer']?['name']" },
          { source: { outputFrom: 'Trigger', shape: 'body', sample: triggerBodySample }, path: ['customer', 'name'], expected: "triggerBody()?['customer']?['name']" },
        ] as const;

        for (const { source, path, expected } of cases) {
          await parseSample(page, source);
          await select(page, [...path]);
          await expect(page.getByLabel('Reference expression')).toHaveText(expected);
          await page.getByRole('button', { name: 'Copy' }).click();
          await expect(page.getByText('Expression copied')).toBeVisible();
          expect(await clipboardText(page, build)).toBe(expected);
        }
      });

      test('makes no network requests and no storage writes while in use (SC-004)', async ({ page }) => {
        const requests: string[] = [];
        await page.addInitScript(() => {
          const audit = { enabled: false, writes: [] as string[] };
          window.__audit = audit;
          const record = (what: string) => {
            if (audit.enabled) audit.writes.push(what);
          };
          for (const method of ['setItem', 'removeItem', 'clear'] as const) {
            const original = Storage.prototype[method] as (...args: unknown[]) => unknown;
            Storage.prototype[method] = function (this: Storage, ...args: unknown[]) {
              record(`Storage.${method}`);
              return original.apply(this, args);
            } as never;
          }
          const openDatabase = IDBFactory.prototype.open;
          IDBFactory.prototype.open = function (this: IDBFactory, ...args: Parameters<IDBFactory['open']>) {
            record('indexedDB.open');
            return openDatabase.apply(this, args);
          };
          const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
          Object.defineProperty(Document.prototype, 'cookie', {
            configurable: true,
            get() {
              return cookie?.get?.call(this);
            },
            set(value: string) {
              record('document.cookie');
              cookie?.set?.call(this, value);
            },
          });
        });
        await open(page, build);
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => {
          if (window.__audit) window.__audit.enabled = true;
          const api = window.toolboxAPI as { settings?: Record<string, unknown> } | undefined;
          for (const method of ['set', 'setAll'] as const) {
            if (api?.settings) api.settings[method] = async () => void window.__audit?.writes.push(`settings.${method}`);
          }
        });
        page.on('request', (request) => requests.push(request.url()));

        await loadEmailReference(page);
        await page.getByRole('button', { name: 'Copy' }).click();
        await expect(page.getByText('Expression copied')).toBeVisible();
        await page.getByRole('tab', { name: /^Condition builder/ }).click();
        await openJsonReference(page);

        expect(requests).toEqual([]);
        expect(await page.evaluate(() => window.__audit?.writes)).toEqual([]);
      });

      for (const theme of THEMES) {
        test(`both views pass the accessibility scan in the ${theme} theme (FR-085)`, async ({ page }) => {
          await open(page, build, { theme });
          const scan = async (label: string) => {
            const results = await new AxeBuilder({ page })
              // Fluent's tabster focus sentinels: aria-hidden <i tabindex="0"> elements it appends to <body>.
              .exclude('[data-tabster-dummy]')
              .analyze();
            const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
            expect(blocking.map((v) => `${label}: ${v.id} (${v.nodes.length})`)).toEqual([]);
          };

          await scan('empty Condition builder');
          await addTwoRules(page);
          await scan('Condition builder with rules');
          await loadEmailReference(page);
          await scan('JSON reference with a selection');
          await page.getByLabel('Action name').fill('');
          await page.getByLabel('Sample JSON').fill('{"a": 1,}');
          await page.getByRole('button', { name: 'Parse' }).click();
          await expect(page.getByRole('alert')).toBeVisible();
          await scan('JSON reference with errors');
        });
      }
    });
  }

  test('the core task works by keyboard alone, with a visible focus ring (SC-005)', async ({ page }) => {
    await open(page, 'web');
    const focusRing = () => page.evaluate(() => getComputedStyle(document.activeElement as Element).boxShadow);

    await page.keyboard.press('Tab');
    await expect(page.getByRole('tab', { name: /^Condition builder/ })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'JSON reference' })).toHaveAttribute('aria-selected', 'true');
    expect(await focusRing()).not.toBe('none');

    await page.keyboard.press('Tab');
    await expect(page.getByRole('radio', { name: 'Action' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Action name')).toBeFocused();
    await page.keyboard.type('Get items');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('radio', { name: 'Full output (also Compose)' })).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.insertText(fixtureA1);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(parseStatus(page)).toHaveText('Parsed · 25 values');

    await page.keyboard.press('Tab');
    await expect(treeRow(page, "outputs('Get_items')")).toBeFocused();
    // root → body → value → [0] → Requester → Email
    for (const key of ['End', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight']) {
      await page.keyboard.press(key);
    }
    await expect(treeRow(page, 'ID')).toBeFocused();
    for (const key of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'Enter']) {
      await page.keyboard.press(key);
    }
    await expect(treeRow(page, 'Email')).toHaveAttribute('aria-selected', 'true');
    expect(await focusRing()).not.toBe('none');

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Copy' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Expression copied')).toBeVisible();
    expect(await clipboardText(page, 'web')).toBe(EMAIL);
  });

  test('a PPTB host without a clipboard API reports all three copy failures (SC-007)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await open(page, 'pptb', { clipboard: false });
    const notices = () => page.evaluate(() => window.__notices ?? []);

    await addTwoRules(page);
    await page.getByRole('region', { name: 'Expression Preview' }).getByRole('button', { name: 'Copy' }).click();
    await expect.poll(notices).toContainEqual({ title: 'Error', body: `Could not copy expression: ${NO_CLIPBOARD}`, type: 'error' });
    await page.getByRole('button', { name: 'Export' }).click();
    await expect.poll(notices).toContainEqual({ title: 'Error', body: `Could not copy expression JSON: ${NO_CLIPBOARD}`, type: 'error' });

    await loadEmailReference(page);
    await page.getByRole('button', { name: 'Copy' }).click();
    await expect(page.getByText(`Could not copy expression: ${NO_CLIPBOARD}`)).toBeVisible();

    expect((await notices()).map((notice) => notice.type)).not.toContain('success');
    await expect(page.getByText('Expression copied')).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });

  test('switching builders leaves the document and Export byte-identical (SC-003)', async ({ page }) => {
    await open(page, 'web');
    await addTwoRules(page);
    const expression = page.getByLabel('Generated expression');
    const expressionBefore = await expression.textContent();
    await page.getByRole('button', { name: 'Export' }).click();
    const exportBefore = await clipboardText(page, 'web');

    await loadEmailReference(page);
    await page.getByRole('button', { name: 'Copy' }).click();
    await page.getByRole('tab', { name: /^Condition builder/ }).click();

    await expect(expression).toHaveText(expressionBefore ?? '');
    await page.getByRole('button', { name: 'Export' }).click();
    expect(await clipboardText(page, 'web')).toBe(exportBefore);
  });

  test('the JSON reference view follows the host theme (FR-091)', async ({ page }) => {
    await open(page, 'web', { theme: 'light' });
    await openJsonReference(page);
    const card = page.locator('.eb-json-source');
    const lightSurface = await card.evaluate((element) => getComputedStyle(element).backgroundColor);

    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('.eb-root')).toHaveAttribute('data-theme', 'dark');
    await expect.poll(() => card.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(lightSurface);
  });

  const VIEWPORTS = [
    { width: 375, height: 667 },
    { width: 768, height: 1024 },
    { width: 900, height: 700 },
    { width: 1280, height: 420 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
  ];

  for (const theme of THEMES) {
    test(`every viewport keeps both views inside the page width in the ${theme} theme (SC-011, FR-007, FR-092)`, async ({ page }) => {
      await open(page, 'web', { theme });
      await addTwoRules(page);
      await loadEmailReference(page);
      const views = [
        { name: 'Condition builder', tab: page.getByRole('tab', { name: /^Condition builder/ }) },
        { name: 'JSON reference', tab: page.getByRole('tab', { name: 'JSON reference' }) },
      ];

      for (const viewport of VIEWPORTS) {
        await page.setViewportSize(viewport);
        for (const view of views) {
          await view.tab.click();
          const layout = await page.evaluate(() => {
            const visible = (element: Element) => (element as HTMLElement).checkVisibility();
            const controls = [...document.querySelectorAll('button, input, textarea, [role="radio"], [role="tab"]')].filter(visible);
            const header = document.querySelector('.eb-workbench-header') as HTMLElement;
            const headerChildren = [...header.children].filter(visible).map((child) => child.getBoundingClientRect());
            return {
              pageScrollsSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
              controlsCutOff: controls
                .map((control) => control.getBoundingClientRect())
                .filter((box) => box.width > 0 && (box.left < 0 || box.right > window.innerWidth + 0.5)).length,
              headerHeight: header.getBoundingClientRect().height,
              headerRows: new Set(headerChildren.map((box) => Math.round(box.top + box.height / 2))).size,
            };
          });
          const where = `${view.name} at ${viewport.width}x${viewport.height}`;
          expect(layout.pageScrollsSideways, where).toBe(false);
          expect(layout.controlsCutOff, where).toBe(0);
          if (viewport.width > 900) {
            expect(layout.headerRows, where).toBe(1);
            expect(layout.headerHeight, where).toBeLessThanOrEqual(TODAYS_HEADER_HEIGHT);
          }
        }
      }
    });
  }

  test('at 1280x800 the reference and Copy are visible without scrolling; at 1280x420 the workspace scrolls (FR-092)', async ({ page }) => {
    await open(page, 'web');
    await page.setViewportSize({ width: 1280, height: 800 });
    await loadEmailReference(page);

    await expect(page.getByLabel('Reference expression')).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Copy' })).toBeInViewport();
    expect(await page.locator('.eb-json-workspace').evaluate((element) => element.scrollTop)).toBe(0);

    await page.setViewportSize({ width: 1280, height: 420 });
    const workspace = page.locator('.eb-json-workspace');
    expect(await workspace.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
    await page.getByRole('button', { name: 'Copy' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Copy' })).toBeInViewport();
  });

  test('samples at the limits parse and expand within 1 second (FR-039, SC-006 guard)', async ({ page }) => {
    await open(page, 'web');
    await openJsonReference(page);
    await page.getByRole('radio', { name: 'Trigger' }).click();
    const wide = JSON.stringify(Object.fromEntries(Array.from({ length: 9_999 }, (_, index) => [`key${index}`, index])));
    const samples = {
      size: JSON.stringify({ blob: 'x'.repeat(1_048_500) }),
      values: JSON.stringify(Array.from({ length: 9_999 }, (_, index) => index)),
      depth: '['.repeat(65) + ']'.repeat(65),
      wide,
    };

    for (const [name, sample] of Object.entries(samples)) {
      await page.getByLabel('Sample JSON').fill(sample);
      const started = Date.now();
      await page.getByRole('button', { name: 'Parse' }).click();
      await expect(parseStatus(page)).toHaveText(/^Parsed · /);
      await expect(page.getByRole('tree')).toBeVisible();
      const elapsed = Date.now() - started;
      test.info().annotations.push({ type: 'SC-006 parse', description: `${name}: ${elapsed} ms` });
      expect(elapsed, `${name} parse`).toBeLessThan(1_000);
    }

    // The widest node: collapse the root, then time its expansion.
    const root = treeRow(page, 'triggerOutputs()');
    await root.locator('[data-chevron]').click();
    const started = Date.now();
    await root.locator('[data-chevron]').click();
    await expect(page.getByRole('treeitem', { name: 'Show 9499 more' })).toBeVisible();
    const elapsed = Date.now() - started;
    test.info().annotations.push({ type: 'SC-006 expand', description: `9,999-member object: ${elapsed} ms` });
    expect(elapsed).toBeLessThan(1_000);
  });
  ```

- [ ] Run: `npm run test:e2e`. Expected: `19 passed`, which is 16 new and 3 existing. On 2026-09-26 the prototype of this plan measured `19 passed (1.1m)` in Chromium.
  - If an axe scan fails, fix the element it names rather than excluding it. The only permitted exclusion is `[data-tabster-dummy]`.
  - Edge (`channel: 'msedge'`, the repo config) is the SC-006 browser.
- [ ] Read the SC-006 timings with `npx playwright test tests/e2e/json-references.spec.ts -g "limits" --reporter=json` (the `annotations` of that test). Copy them into the "Rendered browser" table of `verification.md`, with `npm run test:e2e`'s pass count.
- [ ] Commit: `test(e2e): cover JSON references in both builds, with an accessibility scan and privacy audit`

---

## Phase 13: Documentation and listing

**Implements:** FR-095, FR-096, FR-097 | **Satisfies:** none directly; this is the product-text requirement
**Files:** `README.md`, `USER_MANUAL.md`, `PPTB_USAGE.md`, `apps/pptb/README.md`, `CHANGELOG.md`, `apps/pptb/public/CHANGELOG.md`, `apps/pptb/package.json`, `test/workspaceBuildScripts.test.ts`
**Interfaces:** Consumes: the shipped behaviour of Phases 1–12. Produces: the manifest listing and user-facing docs.

The same change updates every doc and the PPTB listing. `displayName`, the header brand and the subtitle stay the same. Links stay absolute, which is the repo convention.

- [ ] Add to `test/workspaceBuildScripts.test.ts`, before `it('keeps PPTB HTML free of remote font URLs …')`:

  ```ts
    it('lists JSON references in the PPTB manifest and keeps its display name (FR-096)', () => {
      const pptbManifest = readManifest('apps/pptb/package.json');

      expect(pptbManifest.displayName).toBe('Expression Builder');
      expect(pptbManifest.description).toMatch(/JSON references/);
      expect(pptbManifest.keywords).toContain('json-reference');
    });
  ```

- [ ] Run: `npx vitest run test/workspaceBuildScripts.test.ts`. Expected: FAIL, 1 failed (the description does not mention JSON references).

- [ ] In `apps/pptb/package.json`, make two changes:
  - Set `"description": "Power Automate Trigger And Array Filter Builder, plus JSON references for action and trigger outputs"`.
  - Replace the `keywords` array with:

  ```json
    "keywords": [
      "power-automate",
      "power-platform",
      "power-platform-toolbox",
      "cloud-flows",
      "expressions",
      "json-reference"
    ],
  ```

- [ ] Run: `npx vitest run test/workspaceBuildScripts.test.ts`. Expected: PASS.

- [ ] `USER_MANUAL.md`, four edits:
  1. In "### Key Features" (section 1), after the **Diagnostics** bullet, add:

     ```markdown
     - **JSON references** — Paste an action or trigger output from a flow run, select any value in a tree, and copy a correctly rooted reference such as `outputs('Get_items')?['body']?['value'][0]?['Title']`. Pasted JSON is processed locally and is not uploaded or saved.
     ```

  2. In "### 5.2 The Workbench Layout", insert this line before the layout diagram:

     ```markdown
     The header's **Condition builder** and **JSON reference** tabs switch between the two builders. The layout below is the Condition builder; JSON reference is described in [5.8](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/USER_MANUAL.md#58-json-references).
     ```

  3. After the "#### Reorder Conditions (Drag-and-Drop)" subsection and before the `---` that precedes "## 6. Package Reference", add:

     ```markdown
     ### 5.8 JSON References

     The **JSON reference** tab in the header opens a second builder. Paste a sample output from a flow run, select any value, and copy a correctly rooted reference such as `outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']`. Using it never changes your condition document: when you switch back to **Condition builder**, the rules, mode and Export output are exactly as you left them.

     1. **Output from** — choose **Action** and type the action name as the flow designer shows it, or choose **Trigger**. Spaces in the name become underscores and case is kept, because flow expressions match action names exactly.
     2. **The pasted JSON is** — say what you pasted:
        - **Full output (also Compose)** roots the reference at `outputs('<name>')`, or `triggerOutputs()` for a trigger. Choose it for a run's whole output (`statusCode`, `headers` and `body`), and for Compose and other actions whose output has no `body` wrapper.
        - **Body only** roots it at `body('<name>')`, or `triggerBody()`. Choose it when you pasted only the body. If the sample still has a top-level `body` key, a hint suggests **Full output**; the builder never changes the choice for you.
     3. **Sample JSON** — paste the output and select **Parse**. Samples up to 1 MiB, with up to 10,000 values and 64 levels of nesting, are accepted. If you edit the sample afterwards, the status says so, and the previous tree stays usable until you parse again.
     4. **Select a value** in the Payload tree: a string, number or boolean, or an object, an array, a null or the root itself. The Reference card shows the path and the reference.
     5. **Copy**, in one of two formats:
        - **Expression editor** (the default) copies the bare reference, for the expression editor.
        - **Inside text @{…}** copies `@{<reference>}`, for use inside a text field. An inline expression always produces text.

     **Fixed positions.** An index such as `[0]` reads that one item, not each item in a loop, and the Reference card says so whenever the path contains one. To act on every item, use an Apply to each or a Filter array.

     **Privacy.** Pasted JSON is processed locally and is not uploaded or saved by this feature. The sample is never sent anywhere, written to settings or browser storage, or added to the condition document or its Export, and reloading the app clears it.

     **What a reference does not prove.** A reference is built from the sample you pasted. It does not prove that the action exists in your flow, that it has run, or that its output has this shape at run time. Check the expression in the flow.
     ```

  4. Architecture notes in section 6:
     - In the 6.1 "Key exports" table, after the `formatFieldReference` row, add:

       ```markdown
       | `formatPayloadReference`  | Root + typed path → payload reference, e.g. `outputs('Get_items')?['body']?['value'][0]` |
       | `formatPayloadRoot`       | Root only: `triggerBody()`, `triggerOutputs()`, `body('<name>')`, `outputs('<name>')` |
       ```

     - In the 6.2 table, replace the `copyToClipboard(text)` row with:

       ```markdown
       | `copyToClipboard(text)`           | Copy text to the clipboard. Rejects when the host cannot copy: the PPTB adapter rejects when the host has no clipboard API, and the web adapter when the browser has none or refuses. |
       ```

     - In 6.3, after the paragraph that ends "…see `packages/builder-ui/src/index.ts` for the exact list.", add:

       ```markdown
       The header's builder tabs switch between the condition workspace and **JSON reference**. That second builder is `workbench/JsonReferenceWorkspace.tsx` (Source pane, payload tree and Reference card). Its state reducer is `workbench/jsonReferenceState.ts`, and parsing with its limits is `importExport/jsonPayload.ts`. Its state lives in memory only: it is not part of `QueryDocument`, not exported from the package, and gone after a reload.
       ```

- [ ] `README.md`: in "## Key Features", after the **Diagnostics** bullet, add:

  ```markdown
  - **JSON references** — paste an action or trigger output from a flow run, select any value in a tree, and copy a correctly rooted `outputs()`, `body()`, `triggerOutputs()` or `triggerBody()` reference; see the [user manual](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/USER_MANUAL.md#58-json-references). Pasted JSON is processed locally and is not uploaded or saved.
  ```

- [ ] `PPTB_USAGE.md`, two edits:
  1. At the end of the "## Permissions & External Connections" paragraph, add: ` Pasted JSON in the JSON reference builder is processed locally and is not uploaded or saved by this feature.`
  2. Before "## Shared", add:

     ```markdown
     ## JSON References

     Open the **JSON reference** tab in the header to build a reference into a flow-run output:

     1. Choose **Output from** — **Action** (and type its name as the designer shows it) or **Trigger**.
     2. Choose what you pasted — **Full output (also Compose)** for `outputs('<name>')` / `triggerOutputs()`, or **Body only** for `body('<name>')` / `triggerBody()`.
     3. Paste the sample, select **Parse**, and select a value in the tree.
     4. **Copy** it for the expression editor, or as `@{…}` for use inside text.

     An index such as `[0]` reads one fixed item, not each item in a loop. A generated reference does not prove that the action exists, has run, or has this shape at run time. Switching back to **Condition builder** leaves your conditions exactly as they were. See the [user manual](https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/blob/main/USER_MANUAL.md#58-json-references) for details.
     ```

- [ ] `apps/pptb/README.md`, two edits:
  1. In "## What It Does", after the **Two expression modes** bullet, add:

     ```markdown
     - **JSON reference builder** — paste an action or trigger output from a flow run, select any value in a tree, and copy a correctly rooted reference such as `outputs('Get_items')?['body']?['value'][0]?['Title']`, bare or as `@{…}` for text.
     ```

  2. In "## Permissions & External Connections", after the **Storage** bullet, add:

     ```markdown
     - **Pasted JSON** in the JSON reference builder is processed locally and is not uploaded or saved by this feature. It is never written to the host `settings` API, and it is gone when the tool reloads.
     ```

- [ ] `CHANGELOG.md`: under `## [Unreleased]`, add these bullets at the top of the existing `### Added`, `### Changed` and `### Fixed` lists:

  ```markdown
  ### Added

  - **JSON reference** builder, a second header tab next to **Condition builder**: paste an action or trigger output, select a value, and copy a correctly rooted reference, either bare or inside `@{…}`. It runs locally, saves nothing and never changes the condition document.
  - `tests/e2e/json-references.spec.ts`: both builds, all four roots, a privacy audit and an axe accessibility scan of both builders in both themes (`@axe-core/playwright`, dev-only).

  ### Changed

  - The header gains **Condition builder** and **JSON reference** tabs. Above 900px it stays on one row: the title truncates first, then Import and Export become icon-only at 1,180px and below.
  - Expression previews colour `outputs`, `body`, `triggerOutputs` and `items` as functions and keep strings with doubled apostrophes whole. In light mode, function names use a darker teal that meets 4.5:1 contrast.
  - TypeScript project references name each `tsconfig.json` explicitly, so Playwright 1.62 can load the e2e specs again.

  ### Fixed

  - The PPTB adapter no longer reports a copy as successful when the host has no clipboard API, so Condition Copy, Export and JSON reference Copy now report the failure. Export no longer leaves an unhandled promise rejection when copying fails.
  ```

- [ ] `apps/pptb/public/CHANGELOG.md`: under `## [Unreleased]`, add these bullets at the top of the existing `### Added`, `### Changed` and `### Fixed` lists:

  ```markdown
  ### Added

  - **JSON reference** builder: paste an action or trigger output from a flow run, select any value in a tree, and copy a correctly rooted reference. Pasted JSON is processed locally and is not uploaded or saved.

  ### Changed

  - Header tabs switch between **Condition builder** and **JSON reference**. The marketplace description and keywords mention JSON references.

  ### Fixed

  - Copying in a host without a clipboard API now reports the failure instead of claiming success, for the expression, Export and JSON references.
  ```

- [ ] Check the FR-097 points and FR-095 coverage:

  ```bash
  node -e "const fs=require('fs');const need={'USER_MANUAL.md':['Full output (also Compose)','reads that one item, not each item in a loop','Inside text @{…}','Pasted JSON is processed locally and is not uploaded or saved by this feature.','does not prove'],'README.md':['JSON references'],'PPTB_USAGE.md':['## JSON References'],'apps/pptb/README.md':['JSON reference builder','Pasted JSON'],'CHANGELOG.md':['**JSON reference** builder'],'apps/pptb/public/CHANGELOG.md':['**JSON reference** builder']};let ok=true;for(const [f,ps] of Object.entries(need))for(const p of ps)if(!fs.readFileSync(f,'utf8').includes(p)){ok=false;console.log('missing',f,p)}console.log(ok?'docs ok':'docs incomplete');process.exit(ok?0:1)"
  ```

  Expected: `docs ok`.

- [ ] Commit: `docs: document JSON references and list them in the PPTB manifest`

---

## Phase 14: Integration Verification

**Implements:** All FRs | **Satisfies:** All ACs; SC-001–SC-011
**Files:** `research/v2 update/verification.md`
**Interfaces:** Consumes: everything Phases 0–13 produce, plus both built apps. Produces: the completed verification record and the pull request notes.

This phase gathers the four kinds of evidence the spec keeps separate: unit, rendered browser, PPTB host and live flow. It records each one, then decides whether the feature ships or the spec changes.

- [ ] Run the full suite: `npm run lint`, `npm run typecheck`, `npm test`, then `npm run test:e2e`. Expected, as the prototype of this plan measured on 2026-09-26:
  - lint and typecheck exit 0;
  - `npm test` → `Test Files  52 passed (52)`, `Tests  427 passed (427)`;
  - `npm run test:e2e` → `19 passed`.

  Any other failure in files this plan did not touch is recorded in `verification.md` and reported, not fixed quietly (D-1).

- [ ] Build both apps and check FR-074: run `npm run build:web` and `npm run build:pptb`. Then check the PPTB output:

  ```bash
  node -e "const fs=require('fs');const files=fs.readdirSync('apps/pptb/dist/assets');const js=files.filter(f=>f.endsWith('.js'));const src=js.map(f=>fs.readFileSync('apps/pptb/dist/assets/'+f,'utf8')).join('');const html=fs.readFileSync('apps/pptb/dist/index.html','utf8');console.log({jsFiles:js.length,moduleScript:/type=\"module\"/.test(html),dynamicImport:/\bimport\(/.test(src),worker:/new Worker\(/.test(src)})"
  ```

  Expected: `{ jsFiles: 1, moduleScript: false, dynamicImport: false, worker: false }`.

- [ ] Measure the bundle size (SC-010) with the Phase 0 command. Record "after" and the increase in `verification.md`.
  - The prototype measured web JS 243,981 B and CSS 6,833 B (+6,819 B), and PPTB JS 251,614 B (+6,871 B).
  - Both are far under the 25 kB gzipped threshold, so no written justification is needed.

- [ ] PPTB host, manual (SC-006, SC-007, AC-6.1, AC-6.3). In the PPTB desktop app, choose Debug → Load Local Tool and pick `apps/pptb/dist`. Then:
  - Copy a reference, paste it into a text editor, and confirm it equals the displayed text.
  - Switch the Toolbox theme and confirm the JSON reference view follows.
  - Paste each SC-006 sample from the Phase 12 benchmark: the size, values, depth and wide samples. Confirm each parses and shows its tree within 1 s, and that expanding the 9,999-member object responds within 1 s (target 200 ms).
  - Recommended: repeat the copy check in the VS Code extension.

  Record every result in `verification.md`.

- [ ] Decide the limits (FR-024), using the Edge timings from Phase 12 and the PPTB timings above:
  - If every sample meets 1 s, write "Limits confirmed: 1 MiB, 10,000 values, 64 levels; OBJECT_PAGE_SIZE 500" in `verification.md`.
  - If a limit misses, lower it:
    1. Change its constant in `packages/builder-ui/src/importExport/jsonPayload.ts`; the message follows the constant.
    2. Update the matching numbers in `jsonPayload.test.ts` and `jsonReferenceWorkspace.test.tsx`.
    3. Re-run `npm test`, record the new value, and raise a spec change with `sdd-superpowers:sdd-spec-update`.

- [ ] Live flow (SC-008). In a throwaway flow, run the 11 live-flow checks and fill the "Live-flow checklist" table in `verification.md` with the values the expressions actually return. If any item fails, stop and change the spec with `sdd-superpowers:sdd-spec-update` before shipping.

- [ ] Walk every acceptance scenario once by hand in the web build (`npm run dev:web`), using the coverage table below. Tick each AC as its evidence is confirmed.

- [ ] Prepare the pull request notes (SC-009, SC-010). List:
  - the changed expectations: the PPTB off-host copy test now expects a rejection, and the header gained tabs, though no existing header assertion changed;
  - the tsconfig reference fix and why it was needed (Phase 0);
  - the new dev dependency `@axe-core/playwright` and why;
  - the bundle-size table;
  - the evidence in `verification.md`.

- [ ] Commit: `feat: complete the JSON reference builder`

**Coverage (spec → phase → evidence)**

| Requirement | Phase | Evidence |
| --- | --- | --- |
| FR-001–FR-006, FR-008, FR-009 | 10 | `builderSwitching.test.tsx`; e2e SC-003 |
| FR-007 | 11 | `jsonReferenceStyles.test.ts`; e2e viewports |
| FR-010–FR-016 | 6, 9 | `jsonReferenceState.test.ts`, `jsonReferenceWorkspace.test.tsx` |
| FR-020–FR-029 | 3, 6, 9 | `jsonPayload.test.ts`, `jsonReferenceState.test.ts`, `jsonReferenceWorkspace.test.tsx` |
| FR-030–FR-039 | 5, 8, 9 | `payloadTreeModel.test.ts`, `payloadTree.test.tsx`; e2e SC-006 guard |
| FR-040–FR-042 | 1 | `payloadReferences.test.ts` (Appendix A) |
| FR-043–FR-046 | 4, 5, 6, 9 | `expressionPreview.test.tsx`, `jsonReferenceWorkspace.test.tsx` |
| FR-050–FR-055 | 6, 9 | `jsonReferenceState.test.ts`, `jsonReferenceWorkspace.test.tsx` |
| FR-060–FR-063 | 9, 10, 12 | FR-062 unit test; e2e SC-004; manifest guard |
| FR-070–FR-075 | 2, 12 | adapter tests, `copyFailures.test.tsx`; e2e SC-007; build guards; PPTB host check |
| FR-080–FR-085 | 7, 8, 9, 12 | `choiceGroup.test.tsx`, `payloadTree.test.tsx`; e2e keyboard and axe |
| FR-090–FR-093 | 11 | `jsonReferenceStyles.test.ts`, `themeColorAudit.test.ts`; e2e theme and viewports |
| FR-095–FR-097 | 13 | manifest guard; docs check script |
| AC-1.1–AC-1.6 | 6, 9 | unit; e2e SC-002 |
| AC-2.1–AC-2.3 | 6, 9 | unit; e2e SC-002 |
| AC-3.1–AC-3.5 | 10 | unit; e2e SC-003 |
| AC-4.1–AC-4.6 | 2, 3, 9 | unit; e2e SC-007 |
| AC-5.1–AC-5.4 | 7, 8, 9, 10 | unit; e2e SC-005 and axe |
| AC-6.1–AC-6.4 | 2, 12, 14 | e2e SC-002/SC-004 and theme; PPTB host (manual) |
| SC-001 | 0, 1, 6 | Appendix A unit tests |
| SC-002–SC-005, SC-011 | 12 | `json-references.spec.ts` |
| SC-006 | 5, 12, 14 | e2e guard in Edge; PPTB host (manual) |
| SC-007 | 2, 12, 14 | unit; e2e (simulated); PPTB host (real) |
| SC-008 | 14 | live-flow checklist in `verification.md` |
| SC-009 | 0, 14 | baseline and final suite |
| SC-010 | 0, 14 | bundle table in `verification.md` |

---

## Quickstart Validation

1. `npm ci`, then `npm run typecheck`.
2. `npm run dev:web` and open http://127.0.0.1:5173.
3. The app opens on **Condition builder**. The header shows the **Condition builder** tab with a count of 0, then **JSON reference**. Select **JSON reference**; Tab, then the → key, works too.
4. Keep **Action** and type `Get items`. Keep **Full output (also Compose)**.
5. Paste fixture A1 from `packages/builder-ui/test/fixtures/jsonReferenceFixtures.ts` into **Sample JSON** and select **Parse**. The status reads "Parsed · 25 values".
6. Expand `body › value › [0] › Requester` and select `Email`. You should see:
   - Reference: `outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']`;
   - breadcrumb: `outputs('Get_items') › body › value › [0] › Requester › Email`;
   - header summary: `string · "dana@contoso.com"`;
   - the note "Fixed position [0]: reads that item only, not each item in a loop."
7. Select **Copy**. "Expression copied" shows for 1.2 s, and pasting elsewhere gives the same text.
8. Choose **Inside text @{…}** and copy again; the clipboard holds `@{…}` around the reference.
9. Switch to **Condition builder** and back. Everything you entered is still there, and the Condition builder, its Export and its mode are exactly as before.
10. Run `npm run dev:pptb` and repeat steps 3–7 at http://127.0.0.1:5174. Off-host, Copy reports "Could not copy expression: the host does not provide a clipboard API", which is SC-007's honest failure.
11. Reload. The app opens on **Condition builder** again, and JSON reference is empty.
