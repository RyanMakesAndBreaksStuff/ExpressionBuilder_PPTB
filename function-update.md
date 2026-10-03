# Implementation Plan: Functions screen and 11a pill header

**Spec:** `docs/specs/001-functions-screen/spec.md` (Approved 2026-09-30)
**Decisions:** none (no ADR; D1–D9 live in the spec)
**Created:** 2026-09-30
**Updated:** 2026-10-01 — reconciled with the in-progress items() loop-name plan; added the suites the header change breaks (T19, T20); added the FR-26 stacked layout (T5, T6, T18); closed three review gaps (T2, T9, T10, T11, T14): picking a function after an input lost focus now selects instead of wrapping, focus returns to the filled input after an insert or wrap, and String/Collection `chunk` share one signature

## Context

**User-directed integration repairs:** responsive layout at everyviewport, Functions nav independentoverflow, and visiblycorrect theme tokens. Dedicated codeforegrounds added in both palettes (31083ff): contrasttest2red beforeimplementation, 11token/auditchecks/types/scopedlintgreen after (bc9008f3c47c1fd2,706564644571b3f8). ResponsiveCSS integration repair remains pending actualbrowser evidence.

**Execution checkpoint (2026-10-01): T1–T17, T19 and T20 complete; T18 and responsive integration repair active.** T19 8b4f5d5 (16unchangedchecks), T20 bd8e8e4 (25unit+2e2e), codeforeground31083ff (11token/auditchecks/types/lint); reviewed/committed. T18 repairs stale root/parse/copy locators to actual unchanged JSONbody and verifies responsive sweep, without weakening assertions. ResponsiveCSS owner verifies nav independentoverflow and token-consumer typography. T21 final fullchecks/Quickstart pending. Coordinator serialfallback used forT19/T20 afterthreadlimit failures; everydelegate GPT-6-Luna/high. Themecontrolsappswebonly; package/lock/researchpreserved.

Expression Builder today has two screens (Trigger / Filter, JSON reference) switched by a WAI-ARIA tab strip inside a full-width header. The approved 11a design replaces that header on every screen with a 48px pill carrying a **mode chip** menu, and adds a third screen — **Functions** — where a user picks a Workflow Definition Language function, fills its arguments, and copies the resulting expression.

Two things were cut during specification: there is no host "insert into flow" API, so Export stays the pill's primary button (D1); and sample-result evaluation is dropped entirely in favour of a **Parsed Value** nav group that inserts reference expressions from the JSON reference sample (D3). Nothing new is persisted.

**Outcome:** three screens behind one pill header, a 79-entry function catalog, live argument validation, and copy — with Trigger / Filter and JSON reference bodies untouched.

---

## Prerequisite: the items() loop-name plan

[`docs/plans/10-01-2026-items-loop-name.md`](docs/plans/10-01-2026-items-loop-name.md) is being implemented on `function-formatter` now (baseline `1a6da08`). This plan builds on its three commits:

| Its change | What this plan does with it |
|---|---|
| `JsonReferenceState` gains `loopName` + `setLoopName`; `items()` roots at the loop name, not the source action | T15 hoists the reducer, so `loopName` survives screen switches like every other JSON reference field (FR-4). T3's `currentReferenceRoot` returns the **source** root only — Parsed Value never emits `items()` (FR-21) — and T3 adds a test pinning that split. |
| `NO_TEXT_ASSISTANCE` becomes a shared export of `jsonReferenceState.ts` | T11 spreads it on argument inputs instead of redefining it. |
| `ReferencePanel` takes `onLoopNameChange`, wired in `JsonReferenceWorkspace` through `dispatch` | T15 keeps that wiring when `dispatch` becomes a prop. |
| `PayloadReferenceRoot` widens to `item` / `items`; `buildPathSuffix` is deleted; `formatPayloadReference` formats every reference | T3 already formats through `formatPayloadReference`, so it needs no change. T8 adds an `items('Apply_to_each')?[…]` case so text copied from the new items() block parses as a reference. |
| `jsonReferenceWorkspace.test.tsx` gains a loop-name case and still renders the workspace standalone | T19 moves every render in that suite, the new case included, onto a reducer harness after T15 hoists the state. |

**Gate.** T3, T11, T15 and T19 start only once the loop plan's Task 3 commit (`Format item()/items() references through formatPayloadReference`) is on the branch. They edit or import from `jsonReferenceState.ts` / `JsonReferenceWorkspace.tsx`, which that plan is editing now. T1, T2, T4, T5, T6 and T7 share no file with it and can start immediately.

---

## Execution model

**Hard rule: one task per agent.** Each phase below is exactly one agent's whole assignment. An agent owns every file on its `Files:` line and touches nothing else. No two phases in the same wave share a file, so a wave runs fully parallel with zero merge risk.

**Parallelism comes first.** Phases are drawn along file boundaries rather than feature boundaries wherever the spec allows it, and a phase is only pushed to a later wave when it *imports* something a earlier phase produces. Three consequences worth naming:

1. **CSS parallelises immediately.** `shell.css` and `functions.css` reference token and class *names*, which this plan fixes up front. They need no compiled artifact, so they start in wave 1 beside the tokens they will consume.
2. **The Functions screen is four phases, not one.** The handoff describes four regions (nav, arguments, cards, dock); each becomes its own component, test and agent. This also matches the existing `JsonReferenceWorkspace` + `JsonSourcePane` + `PayloadTree` + `ReferencePanel` split, so it is the established pattern here rather than new structure.
3. **Suite repair fans out.** Seven suites assert the old header, the tab strip, or a self-owned JSON reference reducer. Five agents repair them at once; T20 holds three files because they carry the same two-line Import change.

| Wave | Phases (all parallel) | Agents | Each blocked by |
|------|----------------------|:------:|-----------------|
| **1** | **T1** tokens · **T2** catalog · **T3** parsed-value model · **T4** screen contract test · **T5** `shell.css` · **T6** `functions.css` · **T7** pill header | **7** | — (T3 also the loop plan) |
| **2** | **T8** argument parser | 1 | T2 |
| **3** | **T9** functions state | 1 | T2, T8 |
| **4** | **T10** nav · **T11** arguments panel · **T12** status cards · **T13** dock | **4** | T9 (T10 also T3; T11 also the loop plan) |
| **5** | **T14** FunctionsWorkspace | 1 | T10–T13 |
| **6** | **T15** shell wiring, old header retired | 1 | T7, T14, the loop plan |
| **7** | **T16** `builderSwitching` · **T17** dead CSS + its assertions · **T18** e2e chip switching · **T19** JSON reference workspace harness · **T20** Import via overflow | **5** | T15 |
| **8** | **T21** integration verification | 1 | T16–T20 |

21 tasks, 8 waves, peak concurrency 7. Critical path: T2 → T8 → T9 → T11 → T14 → T15 → T17 → T21. T3 waits on the loop plan but has slack until wave 4, so the gate costs no wall-clock time unless the loop plan is still open when T9 finishes.

> **Red between wave 6 and wave 7, by design.** T15 lands the new DOM and the hoisted JSON reference state. These suites still assert the old ones until wave 7 repoints them in parallel: `builderSwitching.test.tsx` (T16); `tests/e2e/json-references.spec.ts` (T18); `jsonReferenceWorkspace.test.tsx` (T19); `sharedBuilderUi.test.tsx`, `tests/e2e/web-smoke.spec.ts` and `tests/e2e/condition-move-to-group.spec.ts` (T20). `jsonReferenceStyles.test.ts` stays green until T17 removes rules and assertions together. Do not repair any of these inside T15 — that collapses five agents into one.

### File ownership — no file appears twice in a wave

| Phase | Owns, exclusively |
|-------|-------------------|
| T1 | `builder-ui/src/theme/workbenchTokens.ts`, `builder-ui/test/workbenchTokens.test.ts` |
| T2 | `engine/src/functionCatalog.ts`, `engine/test/functionCatalog.test.ts`, `engine/src/index.ts` |
| T3 | `builder-ui/src/workbench/parsedValueModel.ts`, `builder-ui/test/parsedValueModel.test.ts`, `builder-ui/src/workbench/jsonReferenceState.ts` (one added export) |
| T4 | `builder-ui/test/screenContract.test.tsx` |
| T5 | `builder-ui/src/theme/shell.css`, `builder-ui/test/shellStyles.test.ts` |
| T6 | `builder-ui/src/theme/functions.css`, `builder-ui/test/functionsStyles.test.ts` |
| T7 | `builder-ui/src/workbench/ShellHeader.tsx`, `builder-ui/src/workbench/screens.ts`, `builder-ui/test/shellHeader.test.tsx` |
| T8 | `engine/src/argumentParser.ts`, `engine/test/argumentParser.test.ts`, `engine/src/index.ts` |
| T9 | `builder-ui/src/workbench/functionsState.ts`, `builder-ui/test/functionsState.test.ts` |
| T10 | `builder-ui/src/workbench/FunctionsNav.tsx`, `builder-ui/test/functionsNav.test.tsx` |
| T11 | `builder-ui/src/workbench/ArgumentsPanel.tsx`, `builder-ui/test/argumentsPanel.test.tsx` |
| T12 | `builder-ui/src/workbench/FunctionsStatusCards.tsx`, `builder-ui/test/functionsStatusCards.test.tsx` |
| T13 | `builder-ui/src/workbench/FunctionsDock.tsx`, `builder-ui/test/functionsDock.test.tsx` |
| T14 | `builder-ui/src/workbench/FunctionsWorkspace.tsx`, `builder-ui/test/functionsWorkspace.test.tsx` |
| T15 | `builder-ui/src/app/ExpressionBuilderShell.tsx`, `builder-ui/src/workbench/types.ts`, `builder-ui/src/workbench/JsonReferenceWorkspace.tsx`, deletes `WorkbenchHeader.tsx` + `BuilderTabs.tsx` |
| T16 | `builder-ui/test/builderSwitching.test.tsx` |
| T17 | `builder-ui/src/theme/tokens.css`, `builder-ui/test/jsonReferenceStyles.test.ts` |
| T18 | `tests/e2e/json-references.spec.ts` |
| T19 | `builder-ui/test/jsonReferenceWorkspace.test.tsx` |
| T20 | `builder-ui/test/sharedBuilderUi.test.tsx`, `tests/e2e/web-smoke.spec.ts`, `tests/e2e/condition-move-to-group.spec.ts` |
| *loop plan* | `jsonReferenceState.ts`, `JsonReferenceWorkspace.tsx`, `ReferencePanel.tsx`, `JsonSourcePane.tsx`, `engine/src/fieldReferences.ts`, their tests, `USER_MANUAL.md` — outside this plan, in progress. T3, T15 and T19 touch three of these only after it lands. |

`engine/src/index.ts` is held by T2 and T8, which sit in different waves — sequential, never concurrent. T17 pairs the `tokens.css` deletions with the assertions about them deliberately: split across two agents they would race.

---

## Global Constraints

Copied from the spec; every phase is bound by these.

- No raw color literal (`#hex`, `rgba(`) in any `.css/.ts/.tsx` under `packages/builder-ui/src` except `theme/workbenchTokens.ts`. `test/themeColorAudit.test.ts` enforces this and must stay green in every wave.
- No new runtime dependency. Fluent UI v9 (9.74.1) and React 19 are present; the chip menu follows the existing `Menu`/`MenuTrigger`/`MenuPopover`/`MenuList` pattern at `packages/builder-ui/src/workbench/SourceChip.tsx:106`.
- `PlatformAdapter` gains no methods. Copy uses the existing `adapter.copyToClipboard` / `adapter.notify`.
- No body change to `ConditionCanvas`, `FieldToolboxPane`, `SupportPane`, `ExpressionDocumentPanel`, `PayloadTree`, `JsonSourcePane`, `ReferencePanel`. `JsonReferenceWorkspace` changes only to accept `state`/`dispatch` as props (T15); its markup and behaviour are untouched.
- `controls/TabStrip.tsx` is **kept** — `SupportPane` uses it for the diagnostics / mode-context tabs, which are out of scope. Only `BuilderTabs.tsx` and `WorkbenchHeader.tsx` are deleted.
- New CSS lives in `theme/shell.css` and `theme/functions.css`, never `theme/tokens.css` (3,013 lines; one owner per file is what keeps the waves conflict-free). Both are imported **after** `tokens.css`, because `shell.css` re-declares `.eb-root` at equal specificity and wins only on cascade order.
- Row descriptions use `aria-describedby` onto a visually hidden `<span>`, never `aria-description` — the latter is ARIA 1.3 and resolves inconsistently under jsdom.
- Commands: unit `npm test`, one file `npx vitest run <path>`, types `npm run typecheck`, lint `npm run lint`, e2e `npm run test:e2e`.
- **The baseline has one known failure.** `workspaceBuildScripts.test.ts` (CON-001) fails on the uncommitted `"node": "^22.23.3"` dependency in root `package.json`. Every "expect: PASS" for a full `npm test` / `npx vitest run` in this plan means *only CON-001 fails*. Once the loop plan lands, the full run reads `Tests  1 failed | 433 passed (434)`.
- **Stage by path.** Each commit stages exactly its phase's owned files with `git add <file> …`, never `git add -A` or `git add .`. Never stage `package.json` or `npm-shrinkwrap.json`.
- **Component files export components and types only.** `reactRefresh.configs.vite` turns on `react-refresh/only-export-components`, which rejects array and object exports from `.tsx` files. That is why the loop plan moved `NO_TEXT_ASSISTANCE` into `jsonReferenceState.ts`. Constants live in `.ts` modules (`screens.ts`, `parsedValueModel.ts`, `functionsState.ts`).
- **Tests are not type-checked.** Both packages' `tsconfig.json` include `src` only, so `npm run typecheck` never sees a test file. Vitest is the signal for tests, and each phase lints its own files with `npx eslint <owned files>`.
- **No text assistance on flow-data inputs (FR-062).** Argument inputs hold action and field references, so they spread the shared `NO_TEXT_ASSISTANCE` from `workbench/jsonReferenceState.ts`, as the Action name and Loop name inputs do. Never redefine it.

### Fixed names every agent codes against

These exist so wave-1 CSS and wave-4 markup agree without talking to each other.

**Tokens (T1 defines, T5/T6 consume):** `--code`, `--header-glass`, `--panel-glass`, `--glow-1`, `--glow-2`, `--panel-shadow`, `--dock-shadow`, `--seg-track`, `--seg-selected`.

**Header classes (T5 ↔ T7):** `eb-pill-header`, `eb-pill-title`, `eb-pill-sep`, `eb-pill-spacer`, `eb-mode-chip`, `eb-pill-overflow`, `eb-pill-privacy`.

**Functions classes (T6 ↔ T10–T14):** `eb-fn-workspace`, `eb-fn-nav`, `eb-fn-search`, `eb-fn-group`, `eb-fn-group-row`, `eb-fn-row`, `eb-fn-grid`, `eb-fn-panel`, `eb-fn-arg`, `eb-fn-input`, `eb-fn-card`, `eb-fn-dock`, `eb-fn-dock-code`, `eb-fn-dock-side`, `eb-fn-crumb`, `eb-pv-row`, `eb-visually-hidden`.

**Argument input attribute (T11 ↔ T10, T14):** each argument `<input>` carries `data-arg={slot.name}`. The nav reads it from `document.activeElement` to tell a wrap from a select (FR-15). The workspace queries it to put focus back after an insert or wrap (FR-15, FR-22).

---

## Goal

A third screen, Functions, reachable from a pill-header mode chip that also switches the two existing screens: pick a function from a searchable five-group catalog, fill its arguments by typing or by inserting a path from the JSON reference sample, see the expression and its validity, and copy it bare or wrapped.

---

## Pre-implementation gates

**Simplicity Gate — pass.** Three components: engine data/parsing (T2, T8), pill header (T7), Functions screen (T9–T14). T15 is wiring. No new dependency.

**Anti-Abstraction Gate — pass.** Fluent's `Menu` is used directly, not wrapped. One representation per concept: `CatalogFunction`, `ParsedArgument`, `FunctionsState`. `ExpressionPreview` and `ActionButton` are reused, not reimplemented.

**Integration-First Gate — pass.** T4 writes the cross-screen contract before any implementation exists. Every phase's `Interfaces:` line states its exact produced signatures, because an implementer agent sees only its own phase text.

> **Complexity note (T2).** Gate: Anti-Abstraction. Violation: a 7-line `parseArgs` string-spec reader instead of 79 hand-written argument arrays. Justification: FR-9/AC-9.1 need all 79 entries; literals run ~900 lines against ~90, and the data is perfectly uniform. Carries a `ponytail:` comment naming the upgrade path.

> **Complexity note (T10–T13).** Gate: Simplicity. Violation: four component files where one would compile. Justification: the user requires one task per agent with parallelism prioritised, and the four regions are the handoff's own structure plus the codebase's existing `JsonReferenceWorkspace` split.

---

# Wave 1 — seven agents, no dependencies on each other (T3 waits on the loop plan)

## T1: Palette tokens

**Implements:** FR-7 | **Satisfies:** AC-7.1, AC-1.1
**Files:** `packages/builder-ui/src/theme/workbenchTokens.ts`, `packages/builder-ui/test/workbenchTokens.test.ts`
**Interfaces:** Consumes: nothing. Produces: the nine CSS variables above in both `graphiteTokens.graphiteLight.cssVariables` and `graphiteTokens.graphiteDark.cssVariables`. T5/T6 consume them by name only, so they do not wait on this phase.

The nine values 11a needs that the palette lacks. They must live here: `themeColorAudit.test.ts` bans color literals everywhere else.

- [x] Append to `packages/builder-ui/test/workbenchTokens.test.ts`:

```ts
describe('11a shell tokens (FR-7)', () => {
  it('defines every new variable in both palettes (AC-7.1)', () => {
    const names = [
      '--code', '--header-glass', '--panel-glass', '--glow-1', '--glow-2',
      '--panel-shadow', '--dock-shadow', '--seg-track', '--seg-selected',
    ] as const;
    for (const paletteId of ['graphiteLight', 'graphiteDark'] satisfies PaletteId[]) {
      for (const name of names) {
        expect(graphiteTokens[paletteId].cssVariables[name], `${paletteId} ${name}`).toBeTruthy();
      }
    }
  });

  it('uses the handoff values', () => {
    expect(graphiteTokens.graphiteDark.cssVariables).toMatchObject({
      '--code': '#0E1216',
      '--header-glass': 'rgba(35, 45, 53, 0.92)',
      '--panel-glass': 'rgba(27, 34, 40, 0.85)',
      '--glow-1': 'rgba(119, 167, 255, 0.2)',
      '--glow-2': 'rgba(85, 197, 187, 0.16)',
    });
    expect(graphiteTokens.graphiteLight.cssVariables).toMatchObject({
      '--code': '#111820',
      '--header-glass': 'rgba(238, 242, 245, 0.92)',
      '--panel-glass': 'rgba(253, 254, 255, 0.85)',
      '--glow-1': 'rgba(21, 94, 239, 0.14)',
      '--glow-2': 'rgba(8, 125, 120, 0.12)',
    });
  });
});
```

- [x] Run: `npx vitest run packages/builder-ui/test/workbenchTokens.test.ts` — expect: FAIL (observed: 2 failed / 6 passed)
- [x] Add to `graphiteLight.cssVariables`, after `--shadow-md`:

```ts
      '--code': '#111820',
      '--header-glass': 'rgba(238, 242, 245, 0.92)',
      '--panel-glass': 'rgba(253, 254, 255, 0.85)',
      '--glow-1': 'rgba(21, 94, 239, 0.14)',
      '--glow-2': 'rgba(8, 125, 120, 0.12)',
      '--panel-shadow': '0 4px 16px rgba(0, 0, 0, 0.14)',
      '--dock-shadow': '0 4px 16px rgba(0, 0, 0, 0.18)',
      '--seg-track': 'rgba(24, 33, 43, 0.06)',
      '--seg-selected': 'rgba(24, 33, 43, 0.12)',
```

- [x] Add to `graphiteDark.cssVariables`, after `--shadow-md`:

```ts
      '--code': '#0E1216',
      '--header-glass': 'rgba(35, 45, 53, 0.92)',
      '--panel-glass': 'rgba(27, 34, 40, 0.85)',
      '--glow-1': 'rgba(119, 167, 255, 0.2)',
      '--glow-2': 'rgba(85, 197, 187, 0.16)',
      '--panel-shadow': '0 4px 16px rgba(0, 0, 0, 0.3)',
      '--dock-shadow': '0 4px 16px rgba(0, 0, 0, 0.35)',
      '--seg-track': 'rgba(237, 243, 247, 0.08)',
      '--seg-selected': 'rgba(237, 243, 247, 0.16)',
```

- [x] Run: `npx vitest run packages/builder-ui/test/workbenchTokens.test.ts packages/builder-ui/test/themeColorAudit.test.ts` — expect: PASS (observed: 2 files / 9 tests; scoped ESLint passed)
- [x] Commit: `feat(theme): add 11a shell tokens to both palettes` — `d9beac0`

---

## T2: Function catalog

**Implements:** FR-9 | **Satisfies:** AC-9.1, AC-12.1
**Files:** `packages/engine/src/functionCatalog.ts`, `packages/engine/src/index.ts`, `packages/engine/test/functionCatalog.test.ts`
**Interfaces:** Consumes: nothing. Produces, exported from `@ryanmakes/eb_engine`: types `ArgType`, `FunctionGroup`, `CatalogArg`, `CatalogFunction`; values `FUNCTION_CATALOG: CatalogFunction[]`, `FUNCTION_GROUPS: readonly FunctionGroup[]`, `findFunction(name: string): CatalogFunction | undefined`.

All 79 entries Microsoft Learn lists across the five categories, as typed data.

- [x] Write `packages/engine/test/functionCatalog.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FUNCTION_CATALOG, FUNCTION_GROUPS, findFunction } from '../src/functionCatalog';

describe('function catalog', () => {
  it('covers every Microsoft Learn category (FR-9)', () => {
    expect(FUNCTION_GROUPS).toEqual(['String', 'Collection', 'Logical', 'Math', 'Date and time']);
    const counts = Object.fromEntries(
      FUNCTION_GROUPS.map((group) => [group, FUNCTION_CATALOG.filter((fn) => fn.group === group).length]),
    );
    expect(counts).toEqual({ String: 20, Collection: 14, Logical: 12, Math: 10, 'Date and time': 23 });
  });

  it('gives every entry unique argument names and a description (AC-9.1)', () => {
    for (const fn of FUNCTION_CATALOG) {
      expect(fn.description, fn.name).not.toBe('');
      expect(new Set(fn.args.map((arg) => arg.name)).size, fn.name).toBe(fn.args.length);
      const firstOptional = fn.args.findIndex((arg) => !arg.required);
      if (firstOptional !== -1) {
        expect(fn.args.slice(firstOptional).every((arg) => !arg.required), fn.name).toBe(true);
      }
    }
  });

  it('models the signatures the UI depends on (AC-12.1)', () => {
    expect(findFunction('substring')?.args).toEqual([
      { name: 'text', type: 'string', required: true, variadic: false },
      { name: 'startIndex', type: 'integer', required: true, variadic: false },
      { name: 'length', type: 'integer', required: false, variadic: false },
    ]);
    expect(findFunction('concat')?.args).toEqual([
      { name: 'text1', type: 'string', required: true, variadic: false },
      { name: 'text2', type: 'string', required: true, variadic: false },
      { name: 'text3', type: 'string', required: false, variadic: true },
    ]);
    expect(findFunction('item')?.args).toEqual([]);
    expect(findFunction('nope')).toBeUndefined();
  });

  it('returns the first group for a name Learn lists twice', () => {
    expect(findFunction('length')?.group).toBe('String');
    expect(FUNCTION_CATALOG.filter((fn) => fn.name === 'length')).toHaveLength(2);
  });

  // findFunction resolves by name, so a twin with its own signature would hand
  // the Collection row the String row's arguments.
  it('gives a name Learn lists twice one signature, since it is one function', () => {
    for (const fn of FUNCTION_CATALOG) {
      const first = findFunction(fn.name);
      expect({ args: fn.args, returns: fn.returns }, `${fn.group} ${fn.name}`)
        .toEqual({ args: first?.args, returns: first?.returns });
    }
    expect(findFunction('chunk')?.args.map((arg) => arg.name)).toEqual(['collection', 'length']);
  });
});
```

- [x] Run: `npx vitest run packages/engine/test/functionCatalog.test.ts` — expect: FAIL (observed: missing catalog import)
- [x] Write `packages/engine/src/functionCatalog.ts`:

```ts
export type ArgType =
  | 'string' | 'number' | 'integer' | 'boolean' | 'any'
  | 'collection' | 'object' | 'timestamp';

export type FunctionGroup = 'String' | 'Collection' | 'Logical' | 'Math' | 'Date and time';

export const FUNCTION_GROUPS: readonly FunctionGroup[] = [
  'String', 'Collection', 'Logical', 'Math', 'Date and time',
];

export interface CatalogArg {
  name: string;
  type: ArgType;
  required: boolean;
  /** Repeats: the UI offers one more empty slot once this one is filled (D9). */
  variadic: boolean;
}

export interface CatalogFunction {
  name: string;
  group: FunctionGroup;
  description: string;
  args: CatalogArg[];
  returns: ArgType;
}

/**
 * Argument spec: space-separated `name:type`, `?` for optional, `*` for
 * variadic — `'text:string length:integer?'`.
 * ponytail: a 7-line reader keeps 79 uniform signatures at one line each
 * instead of ~900 lines of object literals. If an argument ever needs more
 * than name/type/required/variadic, drop the spec and write the objects out.
 */
function parseArgs(spec: string): CatalogArg[] {
  if (spec === '') return [];
  return spec.split(' ').map((token) => {
    const variadic = token.endsWith('*');
    const withoutStar = variadic ? token.slice(0, -1) : token;
    const required = !withoutStar.endsWith('?');
    const [name, type] = (required ? withoutStar : withoutStar.slice(0, -1)).split(':');
    return { name, type: type as ArgType, required, variadic };
  });
}

function entry(
  group: FunctionGroup,
  name: string,
  spec: string,
  returns: ArgType,
  description: string,
): CatalogFunction {
  return { name, group, description, args: parseArgs(spec), returns };
}

export const FUNCTION_CATALOG: CatalogFunction[] = [
  // ---- String (20) ----
  entry('String', 'chunk', 'collection:any length:integer', 'collection', 'Split a string or array into chunks of equal length.'),
  entry('String', 'concat', 'text1:string text2:string text3:string?*', 'string', 'Join two or more strings.'),
  entry('String', 'endsWith', 'text:string searchText:string', 'boolean', 'True when the text ends with the substring.'),
  entry('String', 'formatNumber', 'number:number format:string locale:string?', 'string', 'Format a number as a string.'),
  entry('String', 'guid', 'format:string?', 'string', 'Generate a globally unique identifier.'),
  entry('String', 'indexOf', 'text:string searchText:string', 'integer', 'Position of the first occurrence, or -1.'),
  entry('String', 'isFloat', 'value:string locale:string?', 'boolean', 'True when the string is a floating-point number.'),
  entry('String', 'isInt', 'value:string', 'boolean', 'True when the string is an integer.'),
  entry('String', 'lastIndexOf', 'text:string searchText:string', 'integer', 'Position of the last occurrence, or -1.'),
  entry('String', 'length', 'value:any', 'integer', 'Number of characters in a string or items in a collection.'),
  entry('String', 'nthIndexOf', 'text:string searchText:string occurrence:integer', 'integer', 'Position of the nth occurrence.'),
  entry('String', 'replace', 'text:string oldText:string newText:string', 'string', 'Replace every occurrence of a substring.'),
  entry('String', 'slice', 'text:string startIndex:integer endIndex:integer?', 'string', 'Substring between two positions.'),
  entry('String', 'split', 'text:string delimiter:string', 'collection', 'Split text on a delimiter into an array.'),
  entry('String', 'startsWith', 'text:string searchText:string', 'boolean', 'True when the text starts with the substring.'),
  entry('String', 'substring', 'text:string startIndex:integer length:integer?', 'string', 'Characters from a position for a length.'),
  entry('String', 'toLower', 'text:string', 'string', 'Lower-case the text.'),
  entry('String', 'toUpper', 'text:string', 'string', 'Upper-case the text.'),
  entry('String', 'trim', 'text:string', 'string', 'Remove leading and trailing whitespace.'),
  entry('String', 'trimByteOrderMark', 'text:string', 'string', 'Remove a leading byte-order mark.'),

  // ---- Collection (14) ----
  entry('Collection', 'chunk', 'collection:any length:integer', 'collection', 'Split a string or array into chunks of equal length.'),
  entry('Collection', 'contains', 'collection:any value:any', 'boolean', 'True when the collection holds the value.'),
  entry('Collection', 'empty', 'collection:any', 'boolean', 'True when the collection is empty.'),
  entry('Collection', 'first', 'collection:collection', 'any', 'First item in the collection.'),
  entry('Collection', 'intersection', 'collection1:collection collection2:collection*', 'collection', 'Items common to every collection.'),
  entry('Collection', 'item', '', 'any', 'Current item of the enclosing repeating action.'),
  entry('Collection', 'join', 'collection:collection delimiter:string', 'string', 'Join items into one delimited string.'),
  entry('Collection', 'last', 'collection:collection', 'any', 'Last item in the collection.'),
  entry('Collection', 'length', 'value:any', 'integer', 'Number of items in a collection or characters in a string.'),
  entry('Collection', 'reverse', 'collection:collection', 'collection', 'Reverse the item order.'),
  entry('Collection', 'skip', 'collection:collection count:integer', 'collection', 'Drop items from the front.'),
  entry('Collection', 'sort', 'collection:collection sortBy:string?', 'collection', 'Sort items, optionally by a key.'),
  entry('Collection', 'take', 'collection:collection count:integer', 'collection', 'Keep items from the front.'),
  entry('Collection', 'union', 'collection1:collection collection2:collection*', 'collection', 'All items from every collection, deduplicated.'),

  // ---- Logical (12) ----
  entry('Logical', 'and', 'expression1:boolean expression2:boolean*', 'boolean', 'True when every expression is true.'),
  entry('Logical', 'equals', 'object1:any object2:any', 'boolean', 'True when both values are equivalent.'),
  entry('Logical', 'greater', 'value:any compareTo:any', 'boolean', 'True when the first value is greater.'),
  entry('Logical', 'greaterOrEquals', 'value:any compareTo:any', 'boolean', 'True when the first value is greater or equal.'),
  entry('Logical', 'if', 'expression:boolean valueIfTrue:any valueIfFalse:any', 'any', 'Pick a value on a condition.'),
  entry('Logical', 'isFloat', 'value:string locale:string?', 'boolean', 'True when the string is a floating-point number.'),
  entry('Logical', 'isInt', 'value:string', 'boolean', 'True when the string is an integer.'),
  entry('Logical', 'less', 'value:any compareTo:any', 'boolean', 'True when the first value is less.'),
  entry('Logical', 'lessOrEquals', 'value:any compareTo:any', 'boolean', 'True when the first value is less or equal.'),
  entry('Logical', 'not', 'expression:boolean', 'boolean', 'Invert a boolean.'),
  entry('Logical', 'or', 'expression1:boolean expression2:boolean*', 'boolean', 'True when any expression is true.'),
  entry('Logical', 'strongEquals', 'object1:any object2:any', 'boolean', 'True when both values match without type coercion.'),

  // ---- Math (10) ----
  entry('Math', 'add', 'summand1:number summand2:number', 'number', 'Add two numbers.'),
  entry('Math', 'div', 'dividend:number divisor:number', 'number', 'Divide the first number by the second.'),
  entry('Math', 'max', 'number1:number number2:number*', 'number', 'Largest value.'),
  entry('Math', 'min', 'number1:number number2:number*', 'number', 'Smallest value.'),
  entry('Math', 'mod', 'dividend:number divisor:number', 'number', 'Remainder of a division.'),
  entry('Math', 'mul', 'multiplicand1:number multiplicand2:number', 'number', 'Multiply two numbers.'),
  entry('Math', 'pow', 'base:number exponent:number', 'number', 'Raise a number to a power.'),
  entry('Math', 'rand', 'minValue:integer maxValue:integer', 'integer', 'Random integer in a range.'),
  entry('Math', 'range', 'startIndex:integer count:integer', 'collection', 'Array of integers starting at a number.'),
  entry('Math', 'sub', 'minuend:number subtrahend:number', 'number', 'Subtract the second number from the first.'),

  // ---- Date and time (23) ----
  entry('Date and time', 'addDays', 'timestamp:timestamp days:integer format:string?', 'string', 'Add days to a timestamp.'),
  entry('Date and time', 'addHours', 'timestamp:timestamp hours:integer format:string?', 'string', 'Add hours to a timestamp.'),
  entry('Date and time', 'addMinutes', 'timestamp:timestamp minutes:integer format:string?', 'string', 'Add minutes to a timestamp.'),
  entry('Date and time', 'addSeconds', 'timestamp:timestamp seconds:integer format:string?', 'string', 'Add seconds to a timestamp.'),
  entry('Date and time', 'addToTime', 'timestamp:timestamp interval:integer timeUnit:string format:string?', 'string', 'Add a number of time units to a timestamp.'),
  entry('Date and time', 'convertFromUtc', 'timestamp:timestamp destinationTimeZone:string format:string?', 'string', 'Convert a timestamp from UTC to a time zone.'),
  entry('Date and time', 'convertTimeZone', 'timestamp:timestamp sourceTimeZone:string destinationTimeZone:string format:string?', 'string', 'Convert a timestamp between time zones.'),
  entry('Date and time', 'convertToUtc', 'timestamp:timestamp sourceTimeZone:string format:string?', 'string', 'Convert a timestamp from a time zone to UTC.'),
  entry('Date and time', 'dateDifference', 'startDate:timestamp endDate:timestamp', 'string', 'Difference between two timestamps.'),
  entry('Date and time', 'dayOfMonth', 'timestamp:timestamp', 'integer', 'Day of the month.'),
  entry('Date and time', 'dayOfWeek', 'timestamp:timestamp', 'integer', 'Day of the week, Sunday is 0.'),
  entry('Date and time', 'dayOfYear', 'timestamp:timestamp', 'integer', 'Day of the year.'),
  entry('Date and time', 'formatDateTime', 'timestamp:timestamp format:string? locale:string?', 'string', 'Format a timestamp.'),
  entry('Date and time', 'formatTimeSpan', 'timespan:string format:string? locale:string?', 'string', 'Format a time span.'),
  entry('Date and time', 'getFutureTime', 'interval:integer timeUnit:string format:string?', 'string', 'Current timestamp plus an interval.'),
  entry('Date and time', 'getPastTime', 'interval:integer timeUnit:string format:string?', 'string', 'Current timestamp minus an interval.'),
  entry('Date and time', 'parseDateTime', 'timestamp:string locale:string? format:string?', 'string', 'Parse a timestamp from a string.'),
  entry('Date and time', 'startOfDay', 'timestamp:timestamp format:string?', 'string', 'Start of the day for a timestamp.'),
  entry('Date and time', 'startOfHour', 'timestamp:timestamp format:string?', 'string', 'Start of the hour for a timestamp.'),
  entry('Date and time', 'startOfMonth', 'timestamp:timestamp format:string?', 'string', 'Start of the month for a timestamp.'),
  entry('Date and time', 'subtractFromTime', 'timestamp:timestamp interval:integer timeUnit:string format:string?', 'string', 'Subtract a number of time units from a timestamp.'),
  entry('Date and time', 'ticks', 'timestamp:timestamp', 'number', 'Number of 100-nanosecond ticks since 0001-01-01.'),
  entry('Date and time', 'utcNow', 'format:string?', 'string', 'Current timestamp in UTC.'),
];

/**
 * First match wins. Learn lists chunk, length, isFloat and isInt in two
 * categories, but each is one function with one signature (a test pins that),
 * so either entry gives the same answer.
 */
export function findFunction(name: string): CatalogFunction | undefined {
  return FUNCTION_CATALOG.find((fn) => fn.name === name);
}
```

- [x] Append to `packages/engine/src/index.ts`:

```ts
export type { ArgType, CatalogArg, CatalogFunction, FunctionGroup } from './functionCatalog';
export { FUNCTION_CATALOG, FUNCTION_GROUPS, findFunction } from './functionCatalog';
```

- [x] Run: `npx vitest run packages/engine/test/functionCatalog.test.ts && npm run typecheck` — expect: PASS (observed: 5 tests; TypeScript and scoped ESLint passed)
- [x] Commit: `feat(engine): add the WDL function catalog` — `0f94a88`

---

## T3: Parsed-value model

**Implements:** FR-21 | **Satisfies:** AC-21.1, AC-21.2, AC-21.3
**Files:** `packages/builder-ui/src/workbench/parsedValueModel.ts`, `packages/builder-ui/test/parsedValueModel.test.ts`, `packages/builder-ui/src/workbench/jsonReferenceState.ts` (one added export)
**Interfaces:** Consumes: `formatPayloadReference`, `PayloadPath`, `PayloadReferenceRoot` from `@ryanmakes/eb_engine` (all already exported); `isJsonObject` from `../importExport/jsonPayload`. Produces: `ParsedValueRow { label, expression, path }`, `ParsedValueList { rows, hiddenCount, emptyMessage }`, `MAX_PARSED_VALUE_ROWS = 200`, `buildParsedValueList(sample, root, search)`, and `currentReferenceRoot(state): PayloadReferenceRoot | null` from `jsonReferenceState`.

Turn the JSON reference sample into insertable rows. Reference text comes from the existing canonical `formatPayloadReference`, so the two screens can never disagree about syntax.

**Gate:** starts after the loop plan lands. `PayloadReferenceRoot` then also admits `item` / `items`; this phase only ever builds source roots, and its last test pins that.

- [x] Write `packages/builder-ui/test/parsedValueModel.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  currentReferenceRoot,
  initialJsonReferenceState,
  jsonReferenceReducer,
  type JsonReferenceAction,
} from '../src/workbench/jsonReferenceState';
import { buildParsedValueList, MAX_PARSED_VALUE_ROWS } from '../src/workbench/parsedValueModel';

const triggerBody = { kind: 'triggerBody' } as const;

describe('parsed value model', () => {
  it('lists every leaf with its reference expression (FR-21, AC-21.1)', () => {
    const list = buildParsedValueList({ Name: 'Ada Lovelace', tags: ['a'] }, triggerBody, '');
    expect(list.rows).toEqual([
      { label: 'Name', expression: "triggerBody()?['Name']", path: ['Name'] },
      { label: 'tags[0]', expression: "triggerBody()?['tags'][0]", path: ['tags', 0] },
    ]);
    expect(list.emptyMessage).toBeNull();
    expect(list.hiddenCount).toBe(0);
  });

  it('treats an empty object or array as a leaf and nests deeply', () => {
    const list = buildParsedValueList({ a: { b: { c: 1 } }, empty: {}, none: [] }, triggerBody, '');
    expect(list.rows.map((row) => row.label)).toEqual(['a.b.c', 'empty', 'none']);
  });

  it('explains an absent sample or root (AC-21.2)', () => {
    expect(buildParsedValueList(null, triggerBody, '').emptyMessage)
      .toBe('Parse a sample in JSON reference');
    expect(buildParsedValueList({ a: 1 }, null, '').emptyMessage)
      .toBe('Set an action name in JSON reference');
  });

  it('filters by label, case-insensitively', () => {
    const list = buildParsedValueList({ Name: 1, other: 2 }, triggerBody, 'NAM');
    expect(list.rows.map((row) => row.label)).toEqual(['Name']);
  });

  it('caps the rows and counts the rest (AC-21.3)', () => {
    const sample = Object.fromEntries(Array.from({ length: 250 }, (_, i) => [`key${i}`, i]));
    const list = buildParsedValueList(sample, triggerBody, '');
    expect(list.rows).toHaveLength(MAX_PARSED_VALUE_ROWS);
    expect(list.hiddenCount).toBe(50);
  });

  it('says so when a filter matches nothing', () => {
    expect(buildParsedValueList({ a: 1 }, triggerBody, 'zzz').emptyMessage)
      .toBe('No paths match this search');
  });

  // HIGH-001 (loop plan): the source action and the Apply to each are different names.
  it('roots Parsed Value at the source action, never the loop name', () => {
    const actions: JsonReferenceAction[] = [
      { type: 'setActionName', value: 'Get items' },
      { type: 'setLoopName', value: 'Apply to each' },
    ];
    const state = actions.reduce(jsonReferenceReducer, initialJsonReferenceState);
    expect(currentReferenceRoot(state)).toEqual({ kind: 'outputs', actionName: 'Get items' });
    expect(currentReferenceRoot(initialJsonReferenceState)).toBeNull();
  });
});
```

- [x] Run: `npx vitest run packages/builder-ui/test/parsedValueModel.test.ts` — expect: FAIL (observed: missing model import)
- [x] Write `packages/builder-ui/src/workbench/parsedValueModel.ts`:

```ts
import {
  formatPayloadReference,
  type PayloadPath,
  type PayloadReferenceRoot,
} from '@ryanmakes/eb_engine';
import { isJsonObject } from '../importExport/jsonPayload';

export interface ParsedValueRow {
  /** Dotted/bracketed path, e.g. `Name`, `tags[0]`, `a.b.c`. */
  label: string;
  /** Bare reference expression, identical to what JSON reference copies. */
  expression: string;
  path: PayloadPath;
}

export interface ParsedValueList {
  rows: ParsedValueRow[];
  /** Matching leaves past the cap. */
  hiddenCount: number;
  /** Set when `rows` is empty, explaining why. */
  emptyMessage: string | null;
}

export const MAX_PARSED_VALUE_ROWS = 200;

/**
 * A sample is capped at 10,000 values upstream (MAX_VALUE_COUNT), so a full
 * walk is cheap; the row cap is about how many are useful to show, not about
 * the cost of finding them.
 */
function walk(
  value: unknown,
  path: PayloadPath,
  label: string,
  root: PayloadReferenceRoot,
  out: ParsedValueRow[],
): void {
  const leaf = () => {
    out.push({ label, expression: formatPayloadReference({ root, path }), path });
  };

  if (isJsonObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) return leaf();
    for (const key of keys) {
      walk(value[key], [...path, key], label === '' ? key : `${label}.${key}`, root, out);
    }
    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return leaf();
    value.forEach((item, index) => {
      walk(item, [...path, index], `${label}[${index}]`, root, out);
    });
    return;
  }

  leaf();
}

export function buildParsedValueList(
  sample: unknown,
  root: PayloadReferenceRoot | null,
  search: string,
): ParsedValueList {
  if (sample === null || sample === undefined) {
    return { rows: [], hiddenCount: 0, emptyMessage: 'Parse a sample in JSON reference' };
  }
  if (root === null) {
    return { rows: [], hiddenCount: 0, emptyMessage: 'Set an action name in JSON reference' };
  }

  const all: ParsedValueRow[] = [];
  walk(sample, [], '', root, all);

  const needle = search.trim().toLowerCase();
  const matched = needle === ''
    ? all
    : all.filter((row) => row.label.toLowerCase().includes(needle));

  if (matched.length === 0) {
    return { rows: [], hiddenCount: 0, emptyMessage: 'No paths match this search' };
  }

  return {
    rows: matched.slice(0, MAX_PARSED_VALUE_ROWS),
    hiddenCount: Math.max(0, matched.length - MAX_PARSED_VALUE_ROWS),
    emptyMessage: null,
  };
}
```

- [x] Expose the root JSON reference already computes. In `jsonReferenceState.ts`, directly beneath the existing private `referenceRoot`, add:

```ts
/**
 * The reference root the user has chosen, or null while an action name is
 * still required. Functions' Parsed Value group builds its expressions from
 * this so both screens emit byte-identical reference text.
 */
export function currentReferenceRoot(state: JsonReferenceState): PayloadReferenceRoot | null {
  if (isActionNameMissing(state)) return null;
  return referenceRoot(state, state.shape, state.actionName);
}
```

- [x] Run: `npx vitest run packages/builder-ui/test/parsedValueModel.test.ts packages/builder-ui/test/jsonReferenceState.test.ts && npm run typecheck` — expect: PASS (observed: 29 tests; TypeScript, scoped ESLint and whitespace checks passed)
- [x] Commit: `feat(builder-ui): add the parsed-value path model` — `1393edf`

---

## T4: Screen contract test

**Implements:** FR-2, FR-3, FR-4, FR-5 | **Satisfies:** AC-2.1, AC-3.1, AC-4.1, AC-5.1, AC-5.2, AC-25.1
**Files:** `packages/builder-ui/test/screenContract.test.tsx`
**Interfaces:** Consumes: nothing. Produces: the failing cross-screen contract. T15 turns it green **without editing it**; any later agent that needs this adapter stub copies it rather than importing, since test files are single-owner.

Lock the three-screen behaviour down before any of it exists.

- [x] Write the contract test:

```tsx
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExpressionBuilderShell } from '../src/app/ExpressionBuilderShell';

afterEach(() => cleanup());

function createAdapter(): PlatformAdapter {
  return {
    copyToClipboard: vi.fn(async () => undefined),
    notify: vi.fn(async () => undefined),
    getTheme: vi.fn(async () => 'dark' as const),
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

const chip = () => screen.getByRole('button', { name: /^Screen:/ });

async function goTo(user: UserEvent, label: string) {
  await user.click(chip());
  await user.click(screen.getByRole('menuitemradio', { name: label }));
}

describe('screen contract', () => {
  it('shows the pill title and the active screen in the chip (FR-2, AC-2.1)', () => {
    render(<ExpressionBuilderShell adapter={createAdapter()} />);
    expect(screen.getByText('Expression Builder')).toBeInTheDocument();
    expect(chip()).toHaveAccessibleName('Screen: Trigger / Filter');
  });

  it('lists all three screens in order and switches (FR-3, AC-3.1)', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);
    await user.click(chip());
    expect(screen.getAllByRole('menuitemradio').map((item) => item.textContent))
      .toEqual(['Functions', 'Trigger / Filter', 'JSON reference']);

    await user.click(screen.getByRole('menuitemradio', { name: 'JSON reference' }));
    expect(chip()).toHaveAccessibleName('Screen: JSON reference');
    expect(screen.getByLabelText('Sample JSON')).toBeInTheDocument();
  });

  it('keeps each screen’s state across switches (FR-4, AC-4.1)', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    await goTo(user, 'JSON reference');
    await user.type(screen.getByLabelText('Action name'), 'Get items');

    await goTo(user, 'Functions');
    await user.type(screen.getByLabelText('text2'), "' - '");

    await goTo(user, 'Trigger / Filter');
    await goTo(user, 'Functions');
    expect(screen.getByLabelText('text2')).toHaveValue("' - '");

    await goTo(user, 'JSON reference');
    expect(screen.getByLabelText('Action name')).toHaveValue('Get items');
  });

  it('shows mode, Import and Export only on Trigger / Filter (FR-5, AC-5.1, AC-5.2)', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);
    expect(screen.getByRole('radiogroup', { name: 'Expression mode' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'More actions' }));
    expect(screen.getByRole('menuitem', { name: 'Import' })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await goTo(user, 'Functions');
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Expression mode' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Sample result/i)).not.toBeInTheDocument();

    await goTo(user, 'JSON reference');
    expect(
      screen.getByText('Pasted JSON is processed locally and is not uploaded or saved in any way.'),
    ).toBeInTheDocument();
  });
});
```

- [x] Run: `npx vitest run packages/builder-ui/test/screenContract.test.tsx` — expect: FAIL (observed: 4 expected failures; old title and absent chip/overflow; scoped ESLint passed)
- [x] Commit: `test: add the three-screen contract test` — `ab47776`

---

## T5: Shell CSS

**Implements:** FR-1, FR-2, FR-6, FR-24, FR-26 | **Satisfies:** AC-1.1, AC-26.1
**Files:** `packages/builder-ui/src/theme/shell.css`, `packages/builder-ui/test/shellStyles.test.ts`
**Interfaces:** Consumes: the token and header-class names fixed above — nothing compiled, which is why this runs in wave 1 beside T1 and T7. Produces: `theme/shell.css`; T15 imports it after `tokens.css`.

The frame, gradient backdrop and pill chrome. CI has no browser, so a CSS-text test pins the values the design fixes — the approach already used by `jsonReferenceStyles.test.ts`.

- [x] Write `packages/builder-ui/test/shellStyles.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(
  resolve(fileURLToPath(new URL('../src/', import.meta.url)), 'theme/shell.css'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(?:^|[}\\s,])${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  if (match === null) throw new Error(`Missing rule: ${selector}`);
  return match[1];
}

describe('shell styles', () => {
  it('frames the app with the handoff padding, gap and glow (FR-1)', () => {
    const root = rule('.eb-root');
    expect(root).toMatch(/padding:\s*16px;/);
    expect(root).toMatch(/gap:\s*14px;/);
    expect(root).toMatch(/var\(--glow-1\)/);
    expect(root).toMatch(/var\(--glow-2\)/);
    expect(root).toMatch(/var\(--bg\)/);
  });

  it('shapes the 48px pill (FR-2)', () => {
    const header = rule('.eb-pill-header');
    expect(header).toMatch(/height:\s*48px;/);
    expect(header).toMatch(/padding:\s*0 18px;/);
    expect(header).toMatch(/border-radius:\s*24px;/);
    expect(header).toMatch(/gap:\s*12px;/);
    expect(header).toMatch(/background:\s*var\(--header-glass\);/);
    expect(rule('.eb-pill-title')).toMatch(/white-space:\s*nowrap;/);
    expect(rule('.eb-pill-title')).toMatch(/flex:\s*none;/);
  });

  it('shapes the mode chip (FR-3)', () => {
    const chipRule = rule('.eb-mode-chip');
    expect(chipRule).toMatch(/height:\s*30px;/);
    expect(chipRule).toMatch(/border-radius:\s*15px;/);
    expect(chipRule).toMatch(/background:\s*var\(--accent-soft\);/);
    expect(chipRule).toMatch(/color:\s*var\(--accent\);/);
  });

  it('rings every header control at 2px with a 2px offset (FR-6)', () => {
    const focus = rule('.eb-pill-header button:focus-visible');
    expect(focus).toMatch(/outline:\s*2px solid var\(--accent\);/);
    expect(focus).toMatch(/outline-offset:\s*2px;/);
  });

  it('keeps every color on a token (AC-1.1)', () => {
    expect(css).not.toMatch(/#[\da-f]{3,8}\b/i);
    expect(css).not.toMatch(/rgba?\(/i);
  });

  it('wraps instead of scrolling sideways at 900px and below (FR-26)', () => {
    const narrow = /@media \(max-width: 900px\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(narrow).toMatch(/flex-wrap:\s*wrap;/);
    expect(narrow).toMatch(/height:\s*auto;/);
  });

  it('transitions in 120ms and stops under reduced motion (FR-24)', () => {
    expect(rule('.eb-mode-chip')).toMatch(/transition:\s*background-color 120ms ease;/);
    const reduced = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(css);
    expect(reduced?.[1]).toMatch(/transition:\s*none;/);
  });
});
```

- [x] Run: `npx vitest run packages/builder-ui/test/shellStyles.test.ts` — expect: FAIL (observed: missing stylesheet)
- [x] Write `packages/builder-ui/src/theme/shell.css`:

```css
/* 11a shared shell: frame, gradient backdrop and the pill header.
   Imported after tokens.css — .eb-root below overrides it by cascade order. */
.eb-root {
	padding: 16px;
	gap: 14px;
	background:
		radial-gradient(circle at 85% 10%, var(--glow-1) 0, transparent 45%),
		radial-gradient(circle at 15% 85%, var(--glow-2) 0, transparent 45%),
		var(--bg);
}

.eb-pill-header {
	flex: none;
	display: flex;
	align-items: center;
	gap: 12px;
	height: 48px;
	padding: 0 18px;
	border: 1px solid var(--border);
	border-radius: 24px;
	background: var(--header-glass);
	box-shadow: var(--dock-shadow);
}

.eb-pill-title {
	flex: none;
	margin: 0;
	font-size: 15px;
	font-weight: 600;
	white-space: nowrap;
}

.eb-pill-sep {
	color: var(--text3);
}

.eb-pill-spacer {
	flex: 1;
}

.eb-mode-chip {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	height: 30px;
	padding: 0 12px;
	border: none;
	border-radius: 15px;
	background: var(--accent-soft);
	color: var(--accent);
	font-size: 14px;
	cursor: pointer;
	transition: background-color 120ms ease;
}

.eb-mode-chip svg {
	width: 10px;
	height: 10px;
	stroke-width: 3;
}

.eb-pill-overflow {
	flex: none;
	width: 30px;
	height: 30px;
	border: none;
	border-radius: 15px;
	background: transparent;
	color: var(--text2);
	cursor: pointer;
	transition: background-color 120ms ease;
}

.eb-mode-chip:hover,
.eb-pill-overflow:hover {
	background: var(--seg-selected);
}

.eb-pill-privacy {
	margin: 0;
	color: var(--text2);
	font-size: 12px;
}

/* FR-6: 2px accent ring at a 2px offset on every header control. */
.eb-pill-header button:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
	box-shadow: none;
}

.eb-visually-hidden {
	position: absolute;
	width: 1px;
	height: 1px;
	margin: -1px;
	padding: 0;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border: 0;
}

/* At 900px and below the pill wraps onto extra rows rather than push the page
   sideways: the SC-011 e2e checks every viewport down to 375px. Above 900px
   it stays one 48px row, which that same test also asserts. */
@media (max-width: 900px) {
	.eb-pill-header {
		flex-wrap: wrap;
		height: auto;
		min-height: 48px;
		padding: 8px 18px;
		row-gap: 8px;
	}
}

@media (prefers-reduced-motion: reduce) {
	.eb-mode-chip,
	.eb-pill-overflow {
		transition: none;
	}
}
```

- [x] Run: `npx vitest run packages/builder-ui/test/shellStyles.test.ts packages/builder-ui/test/themeColorAudit.test.ts` — expect: PASS (observed: 8 tests; scoped ESLint and whitespace passed; diff reviewed)
- [x] Commit: `feat(theme): add the 11a shell stylesheet` — `92ecd1a`

---

## T6: Functions screen CSS

**Implements:** FR-8, FR-14, FR-24, FR-26 | **Satisfies:** AC-1.1, AC-26.1, AC-26.2
**Files:** `packages/builder-ui/src/theme/functions.css`, `packages/builder-ui/test/functionsStyles.test.ts`
**Interfaces:** Consumes: the token and `eb-fn-*` / `eb-pv-row` class names fixed above — nothing compiled, so this runs in wave 1. Produces: `theme/functions.css`; T10–T14 write markup against exactly those names.

- [x] Write `packages/builder-ui/test/functionsStyles.test.ts` (same `rule()` helper as T5, reading `theme/functions.css`), asserting:

```ts
describe('Functions screen styles', () => {
  it('lays out nav plus the content grid (FR-8)', () => {
    expect(rule('.eb-fn-workspace')).toMatch(/gap:\s*14px;/);
    expect(rule('.eb-fn-nav')).toMatch(/width:\s*250px;/);
    expect(rule('.eb-fn-grid')).toMatch(
      /grid-template-columns:\s*minmax\(0,\s*3fr\)\s*minmax\(0,\s*2fr\);/,
    );
    expect(rule('.eb-fn-grid')).toMatch(
      /grid-template-rows:\s*minmax\(0,\s*1fr\)\s*minmax\(0,\s*1fr\)\s*210px;/,
    );
    expect(rule('.eb-fn-grid')).toMatch(/gap:\s*12px;/);
    expect(rule('.eb-fn-panel')).toMatch(/grid-area:\s*1\s*\/\s*1\s*\/\s*3\s*\/\s*2;/);
    expect(rule('.eb-fn-dock')).toMatch(/grid-area:\s*3\s*\/\s*1\s*\/\s*4\s*\/\s*3;/);
    expect(rule('.eb-fn-dock-side')).toMatch(/width:\s*280px;/);
  });

  it('keeps every color on a token (AC-1.1)', () => {
    expect(css).not.toMatch(/#[\da-f]{3,8}\b/i);
    expect(css).not.toMatch(/rgba?\(/i);
    expect(rule('.eb-fn-dock-code')).toMatch(/background:\s*var\(--code\);/);
    expect(rule('.eb-fn-panel')).toMatch(/background:\s*var\(--panel-glass\);/);
  });

  it('colors argument values by kind (FR-14)', () => {
    expect(rule('.eb-fn-input[data-kind="reference"]')).toMatch(/color:\s*var\(--warn\);/);
    expect(rule('.eb-fn-input[data-kind="literal"]')).toMatch(/color:\s*var\(--good\);/);
    expect(rule('.eb-fn-input::placeholder')).toMatch(/color:\s*var\(--text3\);/);
  });

  it('stacks into one scrolling column at 900px and below (FR-26, AC-26.2)', () => {
    const stacked = /@media \(max-width: 900px\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(stacked).toMatch(/\.eb-fn-workspace\s*\{[^}]*flex-direction:\s*column;[^}]*overflow-y:\s*auto;/);
    expect(stacked).toMatch(/\.eb-fn-workspace > \*\s*\{[^}]*flex:\s*0 0 auto;/);
    expect(stacked).toMatch(/\.eb-fn-nav\s*\{[^}]*width:\s*auto;[^}]*max-height:\s*40vh;/);
    expect(stacked).toMatch(/\.eb-fn-grid\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/);
    expect(stacked).toMatch(/\.eb-fn-dock\s*\{[^}]*flex-direction:\s*column;/);
    expect(stacked).toMatch(/\.eb-fn-dock-side\s*\{[^}]*width:\s*auto;/);
  });

  it('transitions in 120ms and stops under reduced motion (FR-24)', () => {
    expect(rule('.eb-fn-row'))
      .toMatch(/transition:\s*background-color 120ms ease, border-color 120ms ease;/);
    const reduced = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(css);
    expect(reduced?.[1]).toMatch(/transition:\s*none;/);
  });
});
```

- [x] Run: `npx vitest run packages/builder-ui/test/functionsStyles.test.ts` — expect: FAIL (observed: missing stylesheet)
- [x] Write `packages/builder-ui/src/theme/functions.css` with the handoff values: `.eb-fn-workspace` (flex row, gap 14px, `flex: 1`, `min-height: 0`); `.eb-fn-nav` (250px, column, gap 2px, 14px, no panel background, `overflow-y: auto`); `.eb-fn-search` (34px, `margin-bottom: 6px`, padding 0 10px, radius 6px, `--surface`, 1px `--border`, `::placeholder` `--text3`); `.eb-fn-group-row` (36px, padding 0 10px, gap 10px, 10px chevron rotated 90deg under `[aria-expanded="true"]`, count 12px `--text3` pushed right); `.eb-fn-row` (34px, `margin-left: 22px`, padding 0 12px, radius 6px, mono 13px, `--text2`, `position: relative`; `[aria-current="true"]` → `--accent-soft`, `--accent`, weight 600, plus a `::before` bar 3×20px `--accent` at `left: 0; top: 7px; border-radius: 2px`; `:hover` → `--surface2`; the 120ms transition); `.eb-fn-grid` (the FR-8 grid, `flex: 1`, `min-width: 0`); `.eb-fn-panel` (`--panel-glass`, 1px `--border`, radius 10px, `--panel-shadow`, padding 22px, `grid-area: 1 / 1 / 3 / 2`, `overflow-y: auto`); `.eb-fn-card` (same chrome, padding 18px, column, `justify-content: space-between`; `[data-tone="good"]` → `--good-soft`/`--good`, `[data-tone="danger"]` → `--danger-soft`/`--danger`); `.eb-fn-arg` (column, gap 14px; label 14px/600; the `required`/`optional` marker 14px regular `--text3`); `.eb-fn-input` (42px, padding 0 14px, radius 6px, `--surface2`, 1px `--border`, mono 14px, plus `[data-kind="reference"]` `--warn`, `[data-kind="literal"]` `--good`, `[data-kind="invalid"]` `--danger`, `::placeholder` `--text3`); `.eb-fn-dock` (flex, radius 10px, `overflow: hidden`, 1px `--border`, `--dock-shadow`, `grid-area: 3 / 1 / 4 / 3`); `.eb-fn-dock-code` (`flex: 1`, padding 16px 20px, `--code`, column, gap 12px, mono 16px/1.5); `.eb-fn-dock-side` (280px, `flex: none`, padding 16px 20px, `--surface2`, 1px left `--border`, column, `justify-content: flex-end`, gap 12px); `.eb-fn-crumb` (26px, padding 0 10px, radius 13px, mono 12px, with `[data-tone]` variants `fn`→`--accent-soft`/`--accent`, `ref`→`--warn-soft`/`--warn`, `value`→`--good-soft`/`--good`, `error`→`--danger-soft`/`--danger`); `.eb-pv-row` (30px, radius 6px, mono 12px, `--text2`, `:hover` `--surface2`, the 120ms transition). Then the FR-26 stacked block, verbatim. It mirrors the JSON reference workspace's own stacked rules in `tokens.css`. `ExpressionPreview` already wraps (`pre-wrap`, `break-word`), so long expressions need no rule:

```css
/* FR-26: at 900px and below, one column that scrolls as a whole. DOM order is
   the stacked order — nav, Arguments, Status, Info, dock. The nav keeps its own
   scroll so a 20-row group does not push the arguments off-screen. */
@media (max-width: 900px) {
	.eb-fn-workspace {
		flex-direction: column;
		overflow-x: hidden;
		overflow-y: auto;
	}

	.eb-fn-workspace > * {
		flex: 0 0 auto;
	}

	.eb-fn-nav {
		width: auto;
		max-height: 40vh;
	}

	.eb-fn-grid {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.eb-fn-panel {
		overflow-y: visible;
	}

	.eb-fn-dock {
		flex-direction: column;
	}

	.eb-fn-dock-side {
		width: auto;
		border-left: 0;
		border-top: 1px solid var(--border);
	}
}
```

Close with `@media (prefers-reduced-motion: reduce)` setting `transition: none` on `.eb-fn-row`, `.eb-pv-row` and `.eb-fn-input`.
- [x] Run: `npx vitest run packages/builder-ui/test/functionsStyles.test.ts packages/builder-ui/test/themeColorAudit.test.ts` — expect: PASS (observed: 6 tests; scoped ESLint/whitespace passed; coordinator corrected undefined mono variable and markup selectors)
- [x] Commit: `feat(theme): add the Functions screen stylesheet` — `40cbecc`, follow-up `03fb458` (nav row containment and transparent Parsed Value buttons; 6 tests passed again)

---

## T7: Pill header

**Implements:** FR-2, FR-3, FR-5 | **Satisfies:** AC-2.1, AC-3.1, AC-5.1, AC-5.2
**Files:** `packages/builder-ui/src/workbench/ShellHeader.tsx`, `packages/builder-ui/src/workbench/screens.ts`, `packages/builder-ui/test/shellHeader.test.tsx`
**Interfaces:** Consumes: only things that already exist — `ModeSegmentedControl`, `ActionButton`, and `ChevronDownIcon`/`ExportIcon`/`ImportIcon` from `./icons/BuilderIcons`. This is why it runs in wave 1. Produces: `ShellHeader` and `ShellHeaderProps` from `ShellHeader.tsx`; `type ScreenId = 'functions' | 'condition' | 'jsonReference'` and `SCREENS` from `screens.ts`. They sit in a `.ts` module because `only-export-components` rejects an array export from a component file. T15 imports `ScreenId` **from `./screens`**, not from `types.ts`.

The pill, standalone and fully tested before it is wired in. The chip reuses the Fluent `Menu` pattern at `SourceChip.tsx:106`.

- [x] Write `packages/builder-ui/test/shellHeader.test.tsx`:

```tsx
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SCREENS } from '../src/workbench/screens';
import { ShellHeader, type ShellHeaderProps } from '../src/workbench/ShellHeader';

afterEach(() => cleanup());

function renderHeader(overrides: Partial<ShellHeaderProps> = {}) {
  const props: ShellHeaderProps = {
    screen: 'condition',
    onScreenChange: vi.fn(),
    mode: 'triggerCondition',
    onModeChange: vi.fn(),
    onImport: vi.fn(),
    onExport: vi.fn(),
    ...overrides,
  };
  render(<ShellHeader {...props} />);
  return props;
}

describe('ShellHeader', () => {
  it('names all three screens once, in design order (FR-3)', () => {
    expect(SCREENS.map((entry) => entry.label))
      .toEqual(['Functions', 'Trigger / Filter', 'JSON reference']);
  });

  it('shows the title and the active screen (FR-2, AC-2.1)', () => {
    renderHeader();
    expect(screen.getByText('Expression Builder')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Screen: Trigger / Filter' })).toBeInTheDocument();
  });

  it('switches screens from the chip menu (FR-3, AC-3.1)', async () => {
    const user = userEvent.setup();
    const props = renderHeader();
    await user.click(screen.getByRole('button', { name: 'Screen: Trigger / Filter' }));

    const items = screen.getAllByRole('menuitemradio');
    expect(items.map((item) => item.textContent))
      .toEqual(['Functions', 'Trigger / Filter', 'JSON reference']);
    expect(items[1]).toHaveAttribute('aria-checked', 'true');

    await user.click(items[0]);
    expect(props.onScreenChange).toHaveBeenCalledWith('functions');
  });

  it('offers mode, Import and Export on Trigger / Filter only (FR-5, AC-5.1)', async () => {
    const user = userEvent.setup();
    const props = renderHeader();
    expect(screen.getByRole('radiogroup', { name: 'Expression mode' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Export' }));
    expect(props.onExport).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'More actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Import' }));
    expect(props.onImport).toHaveBeenCalled();
  });

  it('shows no actions on Functions and the privacy note on JSON reference (AC-5.2)', () => {
    renderHeader({ screen: 'functions' });
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More actions' })).not.toBeInTheDocument();
    cleanup();

    renderHeader({ screen: 'jsonReference' });
    expect(
      screen.getByText('Pasted JSON is processed locally and is not uploaded or saved in any way.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument();
  });
});
```

- [x] Run: `npx vitest run packages/builder-ui/test/shellHeader.test.tsx` — expect: FAIL (observed precondition: files absent; pre-check reported no test files, not an assertion failure)
- [x] Write `packages/builder-ui/src/workbench/screens.ts`:

```ts
/** The three screens the pill's mode chip switches between, in design order (FR-3). */
export type ScreenId = 'functions' | 'condition' | 'jsonReference';

export const SCREENS: ReadonlyArray<{ id: ScreenId; label: string }> = [
  { id: 'functions', label: 'Functions' },
  { id: 'condition', label: 'Trigger / Filter' },
  { id: 'jsonReference', label: 'JSON reference' },
];
```

- [x] Write `packages/builder-ui/src/workbench/ShellHeader.tsx`:

```tsx
import {
  Menu,
  MenuItem,
  MenuItemRadio,
  MenuList,
  MenuPopover,
  MenuTrigger,
} from '@fluentui/react-components';
import type { ExpressionMode } from '@ryanmakes/eb_engine';
import { ModeSegmentedControl } from '../components/ModeSegmentedControl';
import { ActionButton } from './controls/ActionButton';
import { ChevronDownIcon, ExportIcon, ImportIcon } from './icons/BuilderIcons';
import { SCREENS, type ScreenId } from './screens';

const JSON_PRIVACY =
  'Pasted JSON is processed locally and is not uploaded or saved in any way.';

export interface ShellHeaderProps {
  screen: ScreenId;
  onScreenChange: (screen: ScreenId) => void;
  mode: ExpressionMode;
  onModeChange: (mode: ExpressionMode) => void;
  onImport: () => void;
  onExport: () => void;
}

export function ShellHeader({
  mode,
  onExport,
  onImport,
  onModeChange,
  onScreenChange,
  screen,
}: ShellHeaderProps) {
  const label = SCREENS.find((entry) => entry.id === screen)?.label ?? '';

  return (
    <header className="eb-pill-header">
      <h1 className="eb-pill-title">Expression Builder</h1>
      <span className="eb-pill-sep" aria-hidden="true">
        &rsaquo;
      </span>

      <Menu
        checkedValues={{ screen: [screen] }}
        onCheckedValueChange={(_event, data) => onScreenChange(data.checkedItems[0] as ScreenId)}
      >
        <MenuTrigger disableButtonEnhancement>
          <button type="button" className="eb-mode-chip" aria-label={`Screen: ${label}`}>
            <span>{label}</span>
            <ChevronDownIcon aria-hidden="true" />
          </button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            {SCREENS.map((entry) => (
              <MenuItemRadio key={entry.id} name="screen" value={entry.id}>
                {entry.label}
              </MenuItemRadio>
            ))}
          </MenuList>
        </MenuPopover>
      </Menu>

      <div className="eb-pill-spacer" />

      {screen === 'condition' ? (
        <>
          <ModeSegmentedControl mode={mode} onChange={onModeChange} />
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <button type="button" className="eb-pill-overflow" aria-label="More actions">
                &middot;&middot;&middot;
              </button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem icon={<ImportIcon />} onClick={onImport}>
                  Import
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
          <ActionButton variant="primary" onClick={onExport} icon={<ExportIcon />}>
            Export
          </ActionButton>
        </>
      ) : null}

      {screen === 'jsonReference' ? <p className="eb-pill-privacy">{JSON_PRIVACY}</p> : null}
    </header>
  );
}
```

- [x] Run: `npx vitest run packages/builder-ui/test/shellHeader.test.tsx && npm run typecheck && npx eslint packages/builder-ui/src/workbench/ShellHeader.tsx packages/builder-ui/src/workbench/screens.ts packages/builder-ui/test/shellHeader.test.tsx` — expect: PASS, no lint output (observed: 5 tests passed; TypeScript and scoped ESLint passed; coordinator reviewed all three files)
- [x] Commit: `feat(builder-ui): add the 11a pill header` — `c11926f`

---

# Wave 2 — one agent

## T8: Argument parser

**Implements:** FR-13 | **Satisfies:** AC-13.1
**Files:** `packages/engine/src/argumentParser.ts`, `packages/engine/test/argumentParser.test.ts`, `packages/engine/src/index.ts`
**Interfaces:** Consumes: `findFunction` from `./functionCatalog` (T2). Produces, exported from `@ryanmakes/eb_engine`: `ParsedArgument` (kinds `empty | string | number | boolean | null | reference | call`), `ParseArgumentResult = { ok: true; value: ParsedArgument } | { ok: false; message: string }`, `parseArgument(text: string): ParseArgumentResult`.

Validate one argument field: a recursive-descent reader over the WDL subset the screen can produce.

- [x] Write `packages/engine/test/argumentParser.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseArgument } from '../src/argumentParser';

function kindOf(text: string) {
  const result = parseArgument(text);
  if (!result.ok) throw new Error(`expected ${text} to parse: ${result.message}`);
  return result.value.kind;
}

function messageOf(text: string) {
  const result = parseArgument(text);
  if (result.ok) throw new Error(`expected ${text} to fail`);
  return result.message;
}

describe('parseArgument', () => {
  it('reads the shapes the screen produces (FR-13, AC-13.1)', () => {
    expect(kindOf('')).toBe('empty');
    expect(kindOf('   ')).toBe('empty');
    expect(kindOf("' - '")).toBe('string');
    expect(kindOf("'O''Brien'")).toBe('string');
    expect(kindOf('42')).toBe('number');
    expect(kindOf('-1.5')).toBe('number');
    expect(kindOf('true')).toBe('boolean');
    expect(kindOf('null')).toBe('null');
    expect(kindOf('utcNow()')).toBe('call');
    expect(kindOf("toUpper('a')")).toBe('call');
    expect(kindOf("triggerBody()?['Name']")).toBe('reference');
    expect(kindOf('triggerBody()')).toBe('reference');
    expect(kindOf("outputs('Get_items')?['body']?['value'][0]")).toBe('reference');
    expect(kindOf('item()')).toBe('reference');
    // What the JSON reference items() block copies once the loop plan lands.
    expect(kindOf("items('Apply_to_each')?['Requester']?['Email']")).toBe('reference');
  });

  it('names the nested call so the breadcrumb can label it', () => {
    const result = parseArgument("concat('a', 'b')");
    expect(result.ok && result.value).toMatchObject({ kind: 'call', name: 'concat' });
  });

  it('rejects bare text with a single-quotes hint (D8, AC-13.1)', () => {
    expect(messageOf('Ada')).toBe("Wrap text in single quotes: 'Ada'.");
  });

  it('rejects incomplete and malformed input (AC-13.1)', () => {
    expect(messageOf('toUpper(')).toBe('The value is incomplete.');
    expect(messageOf("'unclosed")).toBe('This text is missing its closing quote.');
    expect(messageOf("triggerBody()?['Name'")).toBe('An accessor is missing its closing "]".');
    expect(messageOf("toUpper('a')extra")).toBe('Unexpected "extra" after the value.');
    expect(messageOf('triggerBody()?[Name]'))
      .toBe("An accessor needs a quoted key or an index, e.g. ?['Name'].");
  });

  it('checks arity for catalog functions, not for payload roots', () => {
    expect(messageOf('toUpper()')).toBe('toUpper needs at least 1 argument.');
    expect(messageOf("substring('a', 1, 2, 3)")).toBe('substring takes at most 3 arguments.');
    expect(messageOf('nope()')).toBe('"nope" is not a known function.');
    expect(kindOf("concat('a', 'b', 'c', 'd')")).toBe('call'); // variadic
    expect(kindOf("outputs('Any_name')")).toBe('reference'); // a root, not in the catalog
  });

  it('stops runaway nesting', () => {
    const deep = `${'toUpper('.repeat(40)}'a'${')'.repeat(40)}`;
    expect(messageOf(deep)).toBe('This expression nests too deeply.');
  });
});
```

- [x] Run: `npx vitest run packages/engine/test/argumentParser.test.ts` — expect: FAIL (observed: missing argumentParser module)
- [x] Write `packages/engine/src/argumentParser.ts`:

```ts
import { findFunction } from './functionCatalog';

export type ParsedArgument =
  | { kind: 'empty' }
  | { kind: 'string' }
  | { kind: 'number' }
  | { kind: 'boolean' }
  | { kind: 'null' }
  /** A payload-output call, or any call narrowed by an accessor. */
  | { kind: 'reference'; name: string }
  | { kind: 'call'; name: string };

export type ParseArgumentResult =
  | { ok: true; value: ParsedArgument }
  | { ok: false; message: string };

/** Calls addressing flow data; these name an action, so arity is not ours to check. */
const PAYLOAD_ROOTS = new Set([
  'triggerBody', 'triggerOutputs', 'trigger', 'outputs', 'body', 'actionBody',
  'actionOutputs', 'item', 'items', 'variables', 'parameters',
]);

/** A text field is a trust boundary: cap nesting so no input can exhaust the stack. */
const MAX_DEPTH = 32;

interface Cursor {
  text: string;
  pos: number;
  depth: number;
}

const NUMBER = /-?\d+(?:\.\d+)?/y;
const IDENTIFIER = /[A-Za-z_][A-Za-z0-9_]*/y;

export function parseArgument(text: string): ParseArgumentResult {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: true, value: { kind: 'empty' } };

  const cursor: Cursor = { text: trimmed, pos: 0, depth: 0 };
  let value: ParsedArgument;
  try {
    value = readValue(cursor);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Could not read this value.',
    };
  }

  skipSpace(cursor);
  if (cursor.pos < cursor.text.length) {
    return { ok: false, message: `Unexpected "${cursor.text.slice(cursor.pos)}" after the value.` };
  }
  return { ok: true, value };
}

function skipSpace(cursor: Cursor): void {
  while (cursor.pos < cursor.text.length && /\s/.test(cursor.text[cursor.pos])) cursor.pos += 1;
}

function readValue(cursor: Cursor): ParsedArgument {
  if (cursor.depth > MAX_DEPTH) throw new Error('This expression nests too deeply.');
  skipSpace(cursor);
  const char = cursor.text[cursor.pos];
  if (char === undefined) throw new Error('The value is incomplete.');
  if (char === "'") {
    readString(cursor);
    return { kind: 'string' };
  }
  if (char === '-' || (char >= '0' && char <= '9')) {
    readNumber(cursor);
    return { kind: 'number' };
  }
  if (/[A-Za-z_]/.test(char)) return readNamedValue(cursor);
  throw new Error(`"${char}" cannot start a value. Wrap text in single quotes.`);
}

function readNamedValue(cursor: Cursor): ParsedArgument {
  const name = readIdentifier(cursor);
  if (cursor.text[cursor.pos] !== '(') {
    if (name === 'true' || name === 'false') return { kind: 'boolean' };
    if (name === 'null') return { kind: 'null' };
    throw new Error(`Wrap text in single quotes: '${name}'.`);
  }

  const argCount = readCallArguments(cursor);
  checkArity(name, argCount);
  const narrowed = readAccessors(cursor);
  if (PAYLOAD_ROOTS.has(name) || narrowed) return { kind: 'reference', name };
  return { kind: 'call', name };
}

function checkArity(name: string, count: number): void {
  if (PAYLOAD_ROOTS.has(name)) return;
  const fn = findFunction(name);
  if (fn === undefined) throw new Error(`"${name}" is not a known function.`);

  const required = fn.args.filter((arg) => arg.required).length;
  if (count < required) throw new Error(`${name} needs at least ${plural(required)}.`);
  if (!fn.args.some((arg) => arg.variadic) && count > fn.args.length) {
    throw new Error(`${name} takes at most ${plural(fn.args.length)}.`);
  }
}

function plural(count: number): string {
  return `${count} argument${count === 1 ? '' : 's'}`;
}

function readIdentifier(cursor: Cursor): string {
  IDENTIFIER.lastIndex = cursor.pos;
  const match = IDENTIFIER.exec(cursor.text);
  if (match === null) throw new Error('A name was expected here.');
  cursor.pos = IDENTIFIER.lastIndex;
  return match[0];
}

function readNumber(cursor: Cursor): void {
  NUMBER.lastIndex = cursor.pos;
  const match = NUMBER.exec(cursor.text);
  if (match === null) throw new Error('This is not a valid number.');
  cursor.pos = NUMBER.lastIndex;
}

/** Consumes a quoted literal; a doubled `''` inside stays part of the string. */
function readString(cursor: Cursor): void {
  let from = cursor.pos + 1;
  for (;;) {
    const quote = cursor.text.indexOf("'", from);
    if (quote === -1) throw new Error('This text is missing its closing quote.');
    if (cursor.text[quote + 1] === "'") {
      from = quote + 2;
      continue;
    }
    cursor.pos = quote + 1;
    return;
  }
}

/** Consumes `( … )` and returns how many arguments it held. */
function readCallArguments(cursor: Cursor): number {
  cursor.pos += 1;
  cursor.depth += 1;
  skipSpace(cursor);
  if (cursor.text[cursor.pos] === ')') {
    cursor.pos += 1;
    cursor.depth -= 1;
    return 0;
  }

  let count = 0;
  for (;;) {
    readValue(cursor);
    count += 1;
    skipSpace(cursor);
    const char = cursor.text[cursor.pos];
    if (char === ',') {
      cursor.pos += 1;
      continue;
    }
    if (char === ')') {
      cursor.pos += 1;
      cursor.depth -= 1;
      return count;
    }
    throw new Error('The value is incomplete.');
  }
}

/** Consumes any run of `?['key']`, `['key']` or `[0]`; true when one was read. */
function readAccessors(cursor: Cursor): boolean {
  let found = false;
  for (;;) {
    let pos = cursor.pos;
    if (cursor.text[pos] === '?') pos += 1;
    if (cursor.text[pos] !== '[') return found;
    cursor.pos = pos + 1;

    skipSpace(cursor);
    const char = cursor.text[cursor.pos];
    if (char === "'") readString(cursor);
    else if (char !== undefined && char >= '0' && char <= '9') readNumber(cursor);
    else throw new Error("An accessor needs a quoted key or an index, e.g. ?['Name'].");

    skipSpace(cursor);
    if (cursor.text[cursor.pos] !== ']') throw new Error('An accessor is missing its closing "]".');
    cursor.pos += 1;
    found = true;
  }
}
```

- [x] Append to `packages/engine/src/index.ts`:

```ts
export type { ParsedArgument, ParseArgumentResult } from './argumentParser';
export { parseArgument } from './argumentParser';
```

- [x] Run: `npx vitest run packages/engine && npm run typecheck` — expect: PASS (observed: 9 files / 71 engine tests; TypeScript, scoped ESLint and whitespace passed; final focused rerun 6/6 after restoring plan syntax)
- [x] Commit: `feat(engine): add the WDL argument parser` — `01d8606`

---

# Wave 3 — one agent

## T9: Functions state

**Implements:** FR-10, FR-11, FR-12, FR-14, FR-15, FR-17, FR-18, FR-19, FR-20, FR-22 | **Satisfies:** AC-10.1, AC-11.1, AC-15.1, AC-17.1, AC-18.1, AC-19.1, AC-20.1, AC-22.1
**Files:** `packages/builder-ui/src/workbench/functionsState.ts`, `packages/builder-ui/test/functionsState.test.ts`
**Interfaces:** Consumes: `FUNCTION_CATALOG`, `FUNCTION_GROUPS`, `findFunction`, `CatalogFunction`, `FunctionGroup`, `ArgType` (T2); `parseArgument`, `ParseArgumentResult` (T8). Produces: `FunctionsState`, `FunctionsAction`, `CopyFormat`, `initialFunctionsState`, `functionsReducer`, `ArgumentSlot`, `NavGroup`, `CrumbTone`, `FunctionsDerived`, `deriveFunctions(state)`, `navGroups(state)`, `argKind(slot)`, `insertTarget(state): string | null`. `selectFunction` always selects. The wrap is a separate `wrapArg` action, because only the UI can tell whether an input held focus when the pick began (FR-15).

Every Functions behaviour as pure functions, so the four wave-4 components are markup and events only. A reducer matches the existing `jsonReferenceState` pattern. This is the wave-4 fan-out point, so its exported shapes are final here.

- [x] Write `packages/builder-ui/test/functionsState.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  argKind,
  deriveFunctions,
  functionsReducer,
  initialFunctionsState,
  insertTarget,
  navGroups,
  type FunctionsAction,
  type FunctionsState,
} from '../src/workbench/functionsState';

function run(...actions: FunctionsAction[]): FunctionsState {
  return actions.reduce(functionsReducer, initialFunctionsState);
}

/** concat as the mock has it: text1 = reference, text2 = ' - ', text3 empty. */
const mock = run(
  { type: 'setArg', name: 'text1', value: "triggerBody()?['Name']" },
  { type: 'setArg', name: 'text2', value: "' - '" },
);

describe('functions state', () => {
  it('opens on String with concat selected (FR-10, AC-10.1)', () => {
    expect(initialFunctionsState.selectedFunction).toBe('concat');
    expect([...initialFunctionsState.expandedGroups]).toEqual(['String']);
    expect(deriveFunctions(initialFunctionsState).fn.name).toBe('concat');
  });

  it('counts and filters nav groups (FR-11, AC-11.1)', () => {
    const all = navGroups(initialFunctionsState);
    expect(all.map((group) => group.group))
      .toEqual(['String', 'Collection', 'Logical', 'Math', 'Date and time']);
    expect(all[0].total).toBe(20);
    expect(all[0].expanded).toBe(true);
    expect(all[1].expanded).toBe(false);

    const filtered = navGroups(run({ type: 'setSearch', value: 'upper' }));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].group).toBe('String');
    expect(filtered[0].functions.map((fn) => fn.name)).toEqual(['toUpper']);
    expect(filtered[0].expanded).toBe(true);

    expect(navGroups(run({ type: 'setSearch', value: '' }))).toHaveLength(5);
  });

  it('builds a slot per argument, required first (FR-12, AC-12.1)', () => {
    const state = run({ type: 'selectFunction', name: 'substring' });
    expect(deriveFunctions(state).slots.map((slot) => [slot.name, slot.required]))
      .toEqual([['text', true], ['startIndex', true], ['length', false]]);
  });

  it('offers one more slot once a variadic argument is filled (D9)', () => {
    const state = functionsReducer(mock, { type: 'setArg', name: 'text3', value: "'x'" });
    expect(deriveFunctions(state).slots.map((slot) => slot.name))
      .toEqual(['text1', 'text2', 'text3', 'text4']);
  });

  it('wraps the named argument and keeps the selection (FR-15, AC-15.1)', () => {
    const state = run(
      { type: 'setArg', name: 'text1', value: "triggerBody()?['Name']" },
      { type: 'wrapArg', arg: 'text1', fn: 'toUpper' },
    );
    expect(state.selectedFunction).toBe('concat');
    expect(state.args.text1).toBe("toUpper(triggerBody()?['Name'])");
    expect(state.lastFocusedArg).toBe('text1');
  });

  // An earlier focus that has since ended must not turn the next pick into a
  // wrap. Whether focus is live is the nav's call, made at mousedown (T10).
  it('selects a function even after an argument was focused (FR-15)', () => {
    const state = run(
      { type: 'setArg', name: 'text1', value: "'a'" },
      { type: 'focusArg', name: 'text1' },
      { type: 'selectFunction', name: 'toUpper' },
    );
    expect(state.selectedFunction).toBe('toUpper');
    expect(state.args).toEqual({});
    expect(state.lastFocusedArg).toBeNull();
  });

  it('reports validity and the card counts (FR-17, FR-18, AC-17.1, AC-18.1)', () => {
    expect(deriveFunctions(mock)).toMatchObject({
      valid: true, error: null, requiredSet: 2, requiredTotal: 2,
      setCount: 2, shownCount: 3, optionalEmpty: 1,
    });

    const cleared = deriveFunctions(
      functionsReducer(mock, { type: 'setArg', name: 'text2', value: '' }),
    );
    expect(cleared.valid).toBe(false);
    expect(cleared.error).toBe('text2 is required.');
    expect(cleared.requiredSet).toBe(1);
  });

  it('surfaces a parse error against its argument (FR-13, FR-17)', () => {
    const derived = deriveFunctions(
      functionsReducer(mock, { type: 'setArg', name: 'text2', value: 'Ada' }),
    );
    expect(derived.error).toBe("text2: Wrap text in single quotes: 'Ada'.");
  });

  it('rejects a gap before a filled argument (FR-20)', () => {
    const state = run(
      { type: 'selectFunction', name: 'substring' },
      { type: 'setArg', name: 'text', value: "'abc'" },
      { type: 'setArg', name: 'length', value: '2' },
    );
    expect(deriveFunctions(state).error).toBe('startIndex is required.');
  });

  it('builds the expression and its wrapped form (FR-20, AC-20.1)', () => {
    const derived = deriveFunctions(mock);
    expect(derived.expression).toBe("concat(triggerBody()?['Name'], ' - ')");
    expect(derived.wrapped).toBe("@{concat(triggerBody()?['Name'], ' - ')}");
  });

  it('drops trailing empty optionals from the expression (FR-20)', () => {
    expect(deriveFunctions(run({ type: 'selectFunction', name: 'utcNow' })).expression)
      .toBe('utcNow()');
  });

  it('labels the breadcrumb by argument kind (FR-19, AC-19.1)', () => {
    expect(deriveFunctions(mock).crumbs).toEqual([
      { label: 'concat', tone: 'fn' },
      { label: 'JSON reference', tone: 'ref' },
      { label: 'text', tone: 'value' },
    ]);
  });

  it('shows a single error crumb when invalid (FR-19)', () => {
    const derived = deriveFunctions(
      functionsReducer(mock, { type: 'setArg', name: 'text2', value: 'Ada' }),
    );
    expect(derived.crumbs).toEqual([
      { label: 'concat', tone: 'fn' },
      { label: 'error', tone: 'error' },
    ]);
  });

  it('classifies a slot for its input color (FR-14)', () => {
    const slots = deriveFunctions(mock).slots;
    expect(argKind(slots[0])).toBe('reference');
    expect(argKind(slots[1])).toBe('literal');
    expect(argKind(slots[2])).toBe('empty');
    const bad = deriveFunctions(
      functionsReducer(mock, { type: 'setArg', name: 'text2', value: 'Ada' }),
    ).slots[1];
    expect(argKind(bad)).toBe('invalid');
  });

  it('inserts a reference into the focused argument, else the first empty one (FR-22, AC-22.1)', () => {
    const focusedText2 = functionsReducer(mock, { type: 'focusArg', name: 'text2' });
    expect(insertTarget(focusedText2)).toBe('text2');
    const focused = functionsReducer(focusedText2, {
      type: 'insertReference',
      expression: "triggerBody()?['Other']",
    });
    expect(focused.args.text2).toBe("triggerBody()?['Other']");

    expect(insertTarget(initialFunctionsState)).toBe('text1');
    const unfocused = functionsReducer(initialFunctionsState, {
      type: 'insertReference',
      expression: "triggerBody()?['Name']",
    });
    expect(unfocused.args.text1).toBe("triggerBody()?['Name']");
    expect(unfocused.lastFocusedArg).toBe('text1');
  });

  it('clears arguments and focus when the selection changes', () => {
    const state = functionsReducer(mock, { type: 'selectFunction', name: 'toUpper' });
    expect(state.args).toEqual({});
    expect(state.lastFocusedArg).toBeNull();
  });
});
```

- [x] Run: `npx vitest run packages/builder-ui/test/functionsState.test.ts` — expect: FAIL
- [x] Write `packages/builder-ui/src/workbench/functionsState.ts`:

```ts
import {
  FUNCTION_CATALOG,
  FUNCTION_GROUPS,
  findFunction,
  parseArgument,
  type ArgType,
  type CatalogFunction,
  type FunctionGroup,
  type ParseArgumentResult,
} from '@ryanmakes/eb_engine';

export type CopyFormat = 'expression' | 'wrapped';

/** Everything the Functions screen holds. In memory only: nothing persists (FR-4). */
export interface FunctionsState {
  search: string;
  expandedGroups: ReadonlySet<FunctionGroup>;
  parsedValueExpanded: boolean;
  selectedFunction: string;
  /** Argument values by name, for the selected function only. */
  args: Readonly<Record<string, string>>;
  /** Last argument the user focused; Parsed Value inserts here (FR-22). */
  lastFocusedArg: string | null;
  copyFormat: CopyFormat;
  copyState: 'idle' | 'copied';
}

export type FunctionsAction =
  | { type: 'setSearch'; value: string }
  | { type: 'toggleGroup'; group: FunctionGroup }
  | { type: 'toggleParsedValue' }
  | { type: 'selectFunction'; name: string }
  /** FR-15: the caller saw `arg` focused when the pick of `fn` began. */
  | { type: 'wrapArg'; arg: string; fn: string }
  | { type: 'setArg'; name: string; value: string }
  | { type: 'focusArg'; name: string }
  | { type: 'insertReference'; expression: string }
  | { type: 'setCopyFormat'; value: CopyFormat }
  | { type: 'copySucceeded' }
  | { type: 'resetCopyState' };

export const initialFunctionsState: FunctionsState = {
  search: '',
  expandedGroups: new Set<FunctionGroup>(['String']),
  parsedValueExpanded: false,
  selectedFunction: 'concat',
  args: {},
  lastFocusedArg: null,
  copyFormat: 'expression',
  copyState: 'idle',
};

export function functionsReducer(state: FunctionsState, action: FunctionsAction): FunctionsState {
  switch (action.type) {
    case 'setSearch':
      return { ...state, search: action.value };

    case 'toggleGroup': {
      const expandedGroups = new Set(state.expandedGroups);
      if (!expandedGroups.delete(action.group)) expandedGroups.add(action.group);
      return { ...state, expandedGroups };
    }

    case 'toggleParsedValue':
      return { ...state, parsedValueExpanded: !state.parsedValueExpanded };

    // lastFocusedArg outlives the focus itself (FR-22 needs it after a blur), so
    // it cannot decide a wrap; the nav dispatches wrapArg instead (FR-15).
    case 'selectFunction':
      if (action.name === state.selectedFunction) return state;
      return {
        ...state,
        selectedFunction: action.name,
        args: {},
        lastFocusedArg: null,
        copyState: 'idle',
      };

    case 'wrapArg': {
      const current = state.args[action.arg] ?? '';
      return {
        ...state,
        args: { ...state.args, [action.arg]: `${action.fn}(${current})` },
        lastFocusedArg: action.arg,
        copyState: 'idle',
      };
    }

    case 'setArg':
      return { ...state, args: { ...state.args, [action.name]: action.value }, copyState: 'idle' };

    case 'focusArg':
      return { ...state, lastFocusedArg: action.name };

    case 'insertReference': {
      const target = insertTarget(state);
      if (target === null) return state;
      return {
        ...state,
        args: { ...state.args, [target]: action.expression },
        lastFocusedArg: target,
        copyState: 'idle',
      };
    }

    case 'setCopyFormat':
      return { ...state, copyFormat: action.value, copyState: 'idle' };

    case 'copySucceeded':
      return { ...state, copyState: 'copied' };

    case 'resetCopyState':
      return { ...state, copyState: 'idle' };

    default:
      return state;
  }
}

function selectedFunctionOf(state: FunctionsState): CatalogFunction {
  return findFunction(state.selectedFunction) ?? FUNCTION_CATALOG[0];
}

/**
 * Where Parsed Value inserts (FR-22): the last-focused argument, else the
 * first empty one. Exported so the workspace can return focus to it.
 */
export function insertTarget(state: FunctionsState): string | null {
  if (state.lastFocusedArg !== null) return state.lastFocusedArg;
  const slots = buildSlots(selectedFunctionOf(state), state.args);
  return slots.find((slot) => slot.value.trim() === '')?.name ?? slots[0]?.name ?? null;
}

export interface ArgumentSlot {
  name: string;
  type: ArgType;
  required: boolean;
  value: string;
  parsed: ParseArgumentResult;
}

/**
 * Declared arguments, plus one more empty slot after a filled variadic one so
 * another can always be added (D9). Required arguments come first because the
 * catalog already orders them that way.
 */
function buildSlots(fn: CatalogFunction, args: Readonly<Record<string, string>>): ArgumentSlot[] {
  const slots = fn.args.map((arg) => slotFor(arg.name, arg.type, arg.required, args));

  const tail = fn.args.at(-1);
  if (tail?.variadic === true) {
    // `text3` -> text4, text5 … while the one before it is filled.
    const base = tail.name.replace(/\d+$/, '');
    let index = Number.parseInt(tail.name.slice(base.length), 10);
    if (!Number.isFinite(index)) index = fn.args.length;
    while ((args[`${base}${index}`] ?? '').trim() !== '') {
      index += 1;
      slots.push(slotFor(`${base}${index}`, tail.type, false, args));
    }
  }

  return slots;
}

function slotFor(
  name: string,
  type: ArgType,
  required: boolean,
  args: Readonly<Record<string, string>>,
): ArgumentSlot {
  const value = args[name] ?? '';
  return { name, type, required, value, parsed: parseArgument(value) };
}

/** Drives the input's `data-kind`, and so its color (FR-14). */
export function argKind(slot: ArgumentSlot): 'empty' | 'literal' | 'reference' | 'invalid' {
  if (slot.value.trim() === '') return 'empty';
  if (!slot.parsed.ok) return 'invalid';
  return slot.parsed.value.kind === 'reference' ? 'reference' : 'literal';
}

export interface NavGroup {
  group: FunctionGroup;
  /** Functions after the search filter. */
  functions: CatalogFunction[];
  /** Functions in the group before filtering, for the count badge. */
  total: number;
  expanded: boolean;
}

/** Nav groups; a search hides empty groups and expands matching ones (FR-11). */
export function navGroups(state: FunctionsState): NavGroup[] {
  const needle = state.search.trim().toLowerCase();
  return FUNCTION_GROUPS.flatMap((group) => {
    const all = FUNCTION_CATALOG.filter((fn) => fn.group === group);
    const functions = needle === ''
      ? all
      : all.filter((fn) => fn.name.toLowerCase().includes(needle));
    if (functions.length === 0) return [];
    return [{
      group,
      functions,
      total: all.length,
      expanded: needle === '' ? state.expandedGroups.has(group) : true,
    }];
  });
}

export type CrumbTone = 'fn' | 'ref' | 'value' | 'error';

export interface FunctionsDerived {
  fn: CatalogFunction;
  slots: ArgumentSlot[];
  valid: boolean;
  /** First problem found, shown on the status card (FR-17). */
  error: string | null;
  requiredSet: number;
  requiredTotal: number;
  setCount: number;
  shownCount: number;
  optionalEmpty: number;
  expression: string;
  wrapped: string;
  crumbs: Array<{ label: string; tone: CrumbTone }>;
}

export function deriveFunctions(state: FunctionsState): FunctionsDerived {
  const fn = selectedFunctionOf(state);
  const slots = buildSlots(fn, state.args);
  const values = slots.map((slot) => slot.value.trim());
  const lastSet = values.reduce((last, value, index) => (value === '' ? last : index), -1);

  let error: string | null = null;
  const note = (message: string) => {
    error ??= message;
  };
  slots.forEach((slot, index) => {
    if (values[index] === '') {
      if (slot.required) note(`${slot.name} is required.`);
      else if (index < lastSet) note(`Fill ${slot.name} first.`);
      return;
    }
    if (!slot.parsed.ok) note(`${slot.name}: ${slot.parsed.message}`);
  });

  const expression = `${fn.name}(${values.slice(0, lastSet + 1).join(', ')})`;

  return {
    fn,
    slots,
    valid: error === null,
    error,
    requiredSet: slots.filter((slot, index) => slot.required && values[index] !== '').length,
    requiredTotal: slots.filter((slot) => slot.required).length,
    setCount: values.filter((value) => value !== '').length,
    shownCount: slots.length,
    optionalEmpty: slots.filter((slot, index) => !slot.required && values[index] === '').length,
    expression,
    wrapped: `@{${expression}}`,
    crumbs: [
      { label: fn.name, tone: 'fn' as CrumbTone },
      ...(error !== null
        ? [{ label: 'error', tone: 'error' as CrumbTone }]
        : slots.flatMap((slot, index) => (values[index] === '' ? [] : [crumbFor(slot.parsed)]))),
    ],
  };
}

function crumbFor(parsed: ParseArgumentResult): { label: string; tone: CrumbTone } {
  if (!parsed.ok) return { label: 'error', tone: 'error' };
  switch (parsed.value.kind) {
    case 'reference':
      return { label: 'JSON reference', tone: 'ref' };
    case 'string':
      return { label: 'text', tone: 'value' };
    case 'number':
      return { label: 'number', tone: 'value' };
    case 'boolean':
      return { label: 'boolean', tone: 'value' };
    case 'null':
      return { label: 'null', tone: 'value' };
    case 'call':
      return { label: parsed.value.name, tone: 'fn' };
    default:
      return { label: 'empty', tone: 'value' };
  }
}
```

- [x] Run: `npx vitest run packages/builder-ui/test/functionsState.test.ts && npm run typecheck` — expect: PASS
- [x] Commit: `feat(builder-ui): add Functions screen state and derivation`


**Execution evidence:** Red: missing functionsState module. Green: 16/16 focused tests; TypeScript, scoped ESLint and whitespace checks passed. Coordinator reviewed both files; committed `8e6e9e5`.

---

# Wave 4 — four agents, one region each

All four are presentational: props in, callbacks out, no reducer and no adapter. T14 owns the wiring. Each writes its own component and its own test, and none imports another.

## T10: Functions nav

**Implements:** FR-10, FR-11, FR-15, FR-16, FR-21, FR-22 | **Satisfies:** AC-10.1, AC-11.1, AC-15.1, AC-21.1, AC-21.2, AC-21.3, AC-22.2
**Files:** `packages/builder-ui/src/workbench/FunctionsNav.tsx`, `packages/builder-ui/test/functionsNav.test.tsx`
**Interfaces:** Consumes: `NavGroup` (T9); `ParsedValueList` (T3); the `data-arg` input attribute (T11, by contract only); classes `eb-fn-nav`, `eb-fn-search`, `eb-fn-group`, `eb-fn-group-row`, `eb-fn-row`, `eb-pv-row`, `eb-visually-hidden`. Produces:

```tsx
export interface FunctionsNavProps {
  groups: NavGroup[];
  selectedFunction: string;
  search: string;
  parsedValue: ParsedValueList;
  parsedValueExpanded: boolean;
  onSearchChange: (value: string) => void;
  onToggleGroup: (group: FunctionGroup) => void;
  onToggleParsedValue: () => void;
  /** `wrapArg` is the argument input focused when the pick began, else null (FR-15). */
  onSelectFunction: (name: string, wrapArg: string | null) => void;
  onInsertReference: (expression: string) => void;
}
```

- [x] Write `packages/builder-ui/test/functionsNav.test.tsx` asserting: the search box is `getByLabelText('Search functions')` and typing calls `onSearchChange`; each group renders a `<button aria-expanded>` named `` `${group} ${total}` `` and clicking calls `onToggleGroup`; function rows appear only for expanded groups, the selected one carries `aria-current="true"` (AC-10.1), and clicking calls `onSelectFunction(name, null)`; with an `<input data-arg="text1">` rendered beside the nav and focused, clicking a row calls `onSelectFunction(name, 'text1')`, while focusing that input, then the search box, then clicking a row passes `null` (FR-15); `{Enter}` on a focused row passes `null`; a one-group `groups` prop renders only that group (AC-11.1); each function row has `draggable="true"` (FR-16); the Parsed Value group renders `parsedValue.rows` as `eb-pv-row` buttons whose accessible description is the row expression (AC-21.1), renders `parsedValue.emptyMessage` when set (AC-21.2), and renders `` `+${hiddenCount} more — narrow with search` `` when `hiddenCount > 0` (AC-21.3); double-click and `{Enter}` on a row both call `onInsertReference` with its expression (AC-22.2).
- [x] Run: `npx vitest run packages/builder-ui/test/functionsNav.test.tsx` — expect: FAIL
- [x] Implement `FunctionsNav.tsx`: the search `<input aria-label="Search functions">`; `groups.map` to a `<div className="eb-fn-group">` holding the `aria-expanded` group button (10px chevron, name, count) and, when expanded, its function rows as the `eb-fn-row` button shown after this step; then the Parsed Value group, whose rows are `<button className="eb-pv-row" aria-describedby={`${baseId}-${index}`} onDoubleClick={() => onInsertReference(row.expression)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); onInsertReference(row.expression); } }}>` over `<span id={…} className="eb-visually-hidden">{row.expression}</span>`, with `useId()` for `baseId`. The function row:

```tsx
/** The argument input focused when the current pick began, or null (FR-15). */
const wrapArg = useRef<string | null>(null);

// Focus leaves the argument input as part of mousedown, before click fires, so
// the row reads it in onMouseDown. A keyboard pick or a drag never wraps: a row
// reached by Tab means the input has already lost focus.
<button
  type="button"
  className="eb-fn-row"
  aria-current={fn.name === selectedFunction}
  draggable
  onMouseDown={() => {
    const active = document.activeElement;
    wrapArg.current = active instanceof HTMLElement ? (active.dataset.arg ?? null) : null;
  }}
  onKeyDown={() => {
    wrapArg.current = null;
  }}
  onDragStart={(event) => {
    wrapArg.current = null;
    event.dataTransfer.setData('text/plain', `${fn.name}()`);
  }}
  onClick={() => {
    onSelectFunction(fn.name, wrapArg.current);
    wrapArg.current = null;
  }}
>
  {fn.name}
</button>
```
- [x] Run: `npx vitest run packages/builder-ui/test/functionsNav.test.tsx && npm run typecheck` — expect: PASS
- [x] Commit: `feat(builder-ui): add the Functions nav`


**Execution evidence:** Red: unresolved FunctionsNav import, zero tests run. Green: 14/14 focused tests, TypeScript, scoped ESLint and whitespace passed. Coordinator reviewed live-focus capture, group names, Parsed Value descriptions and keyboard insertion; cleanup scoped lint passed. Committed `4fcd7eb`.

---

## T11: Arguments panel

**Implements:** FR-12, FR-14, FR-16 | **Satisfies:** AC-10.1, AC-12.1
**Files:** `packages/builder-ui/src/workbench/ArgumentsPanel.tsx`, `packages/builder-ui/test/argumentsPanel.test.tsx`
**Interfaces:** Consumes: `ArgumentSlot`, `argKind` (T9); `NO_TEXT_ASSISTANCE` from `./jsonReferenceState` (loop plan — hence the gate); classes `eb-fn-panel`, `eb-fn-arg`, `eb-fn-input`. Produces: `data-arg={slot.name}` on every input, which T10 and T14 rely on, plus:

```tsx
export interface ArgumentsPanelProps {
  functionName: string;
  slots: ArgumentSlot[];
  onArgChange: (name: string, value: string) => void;
  onArgFocus: (name: string) => void;
}
```

- [x] Write `packages/builder-ui/test/argumentsPanel.test.tsx` asserting: the heading is "Arguments" with `functionName` beside it (AC-10.1); one input per slot, each reachable as `getByLabelText(slot.name)`, in slot order, with `required`/`optional` text per slot (AC-12.1); typing calls `onArgChange(name, value)` and focusing calls `onArgFocus(name)`; each input's `data-kind` equals `argKind(slot)` and its placeholder is "Type a value or pick a function" (FR-14); dropping `text/plain` on an input calls `onArgChange` with the dropped text (FR-16); each input has `spellcheck="false"` and `autocomplete="off"` (FR-062); each input carries `data-arg` equal to its slot name (FR-15, FR-22).
- [x] Run: `npx vitest run packages/builder-ui/test/argumentsPanel.test.tsx` — expect: FAIL
- [x] Implement `ArgumentsPanel.tsx`: a `<section className="eb-fn-panel">` with `<h2>Arguments <span>{functionName}</span></h2>`, then `slots.map` to a `<div className="eb-fn-arg">` holding a `<label htmlFor>` with the slot name plus a `required`/`optional` span, and `<input {...NO_TEXT_ASSISTANCE} id className="eb-fn-input" data-arg={slot.name} data-kind={argKind(slot)} value={slot.value} placeholder="Type a value or pick a function" onChange={(event) => onArgChange(slot.name, event.target.value)} onFocus={() => onArgFocus(slot.name)} onDrop={(event) => { const text = event.dataTransfer.getData('text/plain'); if (text !== '') { event.preventDefault(); onArgChange(slot.name, text); } }} />`, ids from `useId()`.
- [x] Run: `npx vitest run packages/builder-ui/test/argumentsPanel.test.tsx && npm run typecheck` — expect: PASS
- [x] Commit: `feat(builder-ui): add the Functions arguments panel`


**Execution evidence:** Missing-component red check captured; focused 5/5 tests, TypeScript, scoped ESLint and whitespace passed. Coordinator reviewed input accessibility and native drop acceptance. Committed `3549043`.

---

## T12: Status and info cards

**Implements:** FR-17, FR-18 | **Satisfies:** AC-17.1, AC-18.1
**Files:** `packages/builder-ui/src/workbench/FunctionsStatusCards.tsx`, `packages/builder-ui/test/functionsStatusCards.test.tsx`
**Interfaces:** Consumes: `FunctionsDerived` (T9) — reads `valid`, `error`, `requiredSet`, `requiredTotal`, `setCount`, `shownCount`, `optionalEmpty`; class `eb-fn-card`. Produces:

```tsx
export interface FunctionsStatusCardsProps {
  derived: FunctionsDerived;
}
```

- [x] Write `packages/builder-ui/test/functionsStatusCards.test.tsx` asserting: a valid derived object renders "Status", "Valid", `data-tone="good"` and "2 of 2 required set" (AC-17.1); an invalid one renders "Invalid", `data-tone="danger"` and `derived.error` as visible text; the info card renders "Arguments set", "2 / 3" and "1 optional left empty" (AC-18.1); "optional left empty" is singular at 1 and plural at 0 or 2.
- [x] Run: `npx vitest run packages/builder-ui/test/functionsStatusCards.test.tsx` — expect: FAIL
- [x] Implement `FunctionsStatusCards.tsx` as a fragment of two `<section className="eb-fn-card">` elements: the status card with `data-tone={derived.valid ? 'good' : 'danger'}`, label "Status", value `Valid`/`Invalid`, and caption `derived.error ?? `${derived.requiredSet} of ${derived.requiredTotal} required set``; the info card with label "Arguments set", value `` `${derived.setCount} / ${derived.shownCount}` ``, and caption `` `${derived.optionalEmpty} optional left empty` `` pluralised on `optionalEmpty === 1`.
- [x] Run: `npx vitest run packages/builder-ui/test/functionsStatusCards.test.tsx && npm run typecheck` — expect: PASS
- [x] Commit: `feat(builder-ui): add the Functions status cards`


**Execution evidence:** Red: missing component import. Focused 4/4 tests, scoped ESLint and whitespace passed. TypeScript initially overlapped T10 edits; shared check passed once nav settled. Coordinator reviewed both files; committed `fa6f3d2`.

---

## T13: Expression dock

**Implements:** FR-19, FR-20, FR-23, FR-25 | **Satisfies:** AC-19.1, AC-20.1, AC-23.1, AC-25.1
**Files:** `packages/builder-ui/src/workbench/FunctionsDock.tsx`, `packages/builder-ui/test/functionsDock.test.tsx`
**Interfaces:** Consumes: `FunctionsDerived`, `CopyFormat` (T9); existing `ExpressionPreview` and `ActionButton` and `CopyIcon`; classes `eb-fn-dock`, `eb-fn-dock-code`, `eb-fn-dock-side`, `eb-fn-crumb`. Produces:

```tsx
export interface FunctionsDockProps {
  derived: FunctionsDerived;
  copyFormat: CopyFormat;
  copyState: 'idle' | 'copied';
  onCopyFormatChange: (format: CopyFormat) => void;
  /** T14 performs the clipboard write; this component only reports intent. */
  onCopy: (format: CopyFormat) => void;
}
```

- [x] Write `packages/builder-ui/test/functionsDock.test.tsx` asserting: the "Expression" label, a validity pill reading `Valid`/`Invalid`, and an `Expression | @{…}` radiogroup are present; the code area shows `derived.expression` when `copyFormat` is `expression` and `derived.wrapped` when `wrapped` (AC-20.1), and choosing a segment calls `onCopyFormatChange`; crumb chips render `derived.crumbs` in order with matching `data-tone` (AC-19.1); "Copy expression" calls `onCopy` with the active format and reads "Copied" when `copyState` is `copied`, "Copy as @{…}" always calls `onCopy('wrapped')`, and both are `disabled` when `derived.valid` is false (AC-23.1); `queryByText(/Sample result/i)` is null (AC-25.1).
- [x] Run: `npx vitest run packages/builder-ui/test/functionsDock.test.tsx` — expect: FAIL
- [x] Implement `FunctionsDock.tsx`: a `<div className="eb-fn-dock">` over a `<div className="eb-fn-dock-code">` (header row with the uppercase "Expression" label, the validity pill, and a two-button `role="radiogroup" aria-label="Expression format"`; then `<ExpressionPreview expression={copyFormat === 'wrapped' ? derived.wrapped : derived.expression} label="Generated expression" />`; then a 1px divider and the crumb chips as `<span className="eb-fn-crumb" data-tone={crumb.tone}>` separated by `›` spans marked `aria-hidden`) and a `<div className="eb-fn-dock-side">` holding `<ActionButton variant="primary" icon={<CopyIcon />} disabled={!derived.valid} onClick={() => onCopy(copyFormat)}>{copyState === 'copied' ? 'Copied' : 'Copy expression'}</ActionButton>` plus a caption `<button disabled={!derived.valid} onClick={() => onCopy('wrapped')}>Copy as @{'{…}'}</button>`.
- [x] Run: `npx vitest run packages/builder-ui/test/functionsDock.test.tsx && npm run typecheck` — expect: PASS
- [x] Commit: `feat(builder-ui): add the Functions expression dock`


**Execution evidence:** Red: missing component module. Green: 7/7 focused tests, TypeScript and scoped ESLint passed. Coordinator reviewed keyboard radio navigation, copy format independence and wrapping header. Committed `a35da92`; EOF whitespace repaired in `8a73db2` after staged check identified it. Final staged whitespace check passed. Combined T9–T13 plus theme color audit: 6 files / 47 tests passed.

---

# Wave 5 — one agent

## T14: FunctionsWorkspace

**Implements:** FR-8, FR-15, FR-22, FR-23 | **Satisfies:** AC-15.1, AC-21.1, AC-22.1, AC-22.2, AC-23.1
**Files:** `packages/builder-ui/src/workbench/FunctionsWorkspace.tsx`, `packages/builder-ui/test/functionsWorkspace.test.tsx`
**Interfaces:** Consumes: `functionsReducer`, `initialFunctionsState`, `deriveFunctions`, `navGroups`, `insertTarget` (T9); the `data-arg` input attribute (T11); `buildParsedValueList` (T3); `FunctionsNav`, `ArgumentsPanel`, `FunctionsStatusCards`, `FunctionsDock` (T10–T13); classes `eb-fn-workspace`, `eb-fn-grid`. Produces:

```tsx
export interface FunctionsWorkspaceProps {
  adapter: PlatformAdapter;
  /** Parsed JSON reference sample, or null before a successful parse. */
  sample: unknown;
  /** Reference root from JSON reference, or null while an action name is needed. */
  referenceRoot: PayloadReferenceRoot | null;
}
```

Hold the reducer, own the clipboard side effect, and compose the four regions onto the FR-8 grid.

- [x] Write `packages/builder-ui/test/functionsWorkspace.test.tsx` — an integration pass over the real children, using the `createAdapter` stub shape from T4 (copied, not imported): first render has String expanded with `concat` selected and `text1`/`text2`/`text3` inputs; typing the mock values flips Status to "Valid" and the dock to `concat(triggerBody()?['Name'], ' - ')`; with `sample`/`referenceRoot` supplied, Parsed Value lists `Name`, and double-clicking it after focusing `text2` fills `text2` and leaves `text2` focused (AC-22.1); `{Enter}` does the same (AC-22.2); with `text1` holding `triggerBody()?['Name']`, focusing it and clicking `toUpper` wraps it and keeps it focused, so clicking `trim` next gives `trim(toUpper(triggerBody()?['Name']))` (AC-15.1); focusing `text1`, then the search box, then clicking `toUpper` selects `toUpper` and the Arguments title reads `toUpper` (FR-15); Copy calls `adapter.copyToClipboard` with the bare expression, the button then reads "Copied", and "Copy as @{…}" sends the wrapped form (AC-23.1); a rejecting `copyToClipboard` calls `adapter.notify(expect.stringContaining('Could not copy'), 'error')` and leaves the label unchanged.
- [x] Run: `npx vitest run packages/builder-ui/test/functionsWorkspace.test.tsx` — expect: FAIL
- [x] Implement `FunctionsWorkspace.tsx`: `useReducer(functionsReducer, initialFunctionsState)`; `useMemo` for `deriveFunctions(state)`, `navGroups(state)` and `buildParsedValueList(sample, referenceRoot, state.search)`; a `copy(format)` helper that awaits `adapter.copyToClipboard(format === 'wrapped' ? derived.wrapped : derived.expression)`, dispatches `copySucceeded`, and schedules `resetCopyState` after 1500ms — clearing any prior timer and the timer on unmount, exactly as `ExpressionBuilderShell.copyExpression` does at `src/app/ExpressionBuilderShell.tsx:189` — with a `catch` calling `adapter.notify(`Could not copy expression: ${…}`, 'error')`; and a `<div className="eb-fn-workspace" ref={rootRef}>` holding `<FunctionsNav onSelectFunction={selectFunction} onInsertReference={insertReference} …>` and a `<div className="eb-fn-grid">` with `<ArgumentsPanel onArgFocus={(name) => dispatch({ type: 'focusArg', name })} …>`, `<FunctionsStatusCards derived={derived} />` and `<FunctionsDock …>`. The two nav handlers and the focus return:

```tsx
const rootRef = useRef<HTMLDivElement>(null);

/**
 * Puts focus back on an argument input (FR-15, FR-22). It runs before the
 * re-render, which is safe because the target slot already exists. Argument
 * names are catalog identifiers, so the selector needs no escaping.
 */
function focusArg(name: string | null) {
  if (name === null) return;
  rootRef.current?.querySelector<HTMLInputElement>(`[data-arg="${name}"]`)?.focus();
}

function selectFunction(name: string, wrapArg: string | null) {
  if (wrapArg === null) {
    dispatch({ type: 'selectFunction', name });
    return;
  }
  dispatch({ type: 'wrapArg', arg: wrapArg, fn: name });
  // Without this, a second pick would see the nav row focused and replace
  // every argument instead of wrapping again.
  focusArg(wrapArg);
}

function insertReference(expression: string) {
  const target = insertTarget(state);
  dispatch({ type: 'insertReference', expression });
  focusArg(target);
}
```
- [x] Run: `npx vitest run packages/builder-ui/test/functionsWorkspace.test.tsx && npm run typecheck && npm run lint` — expect: PASS
- [x] Commit: `feat(builder-ui): compose the Functions workspace`


**Execution evidence:** Red missing component module (exit1, 0tests). Green focused 6/6 (18.62s), TypeScript and scoped ESLint passed; coordinator reviewed both files and staged whitespace check passed. Full npm run lint initially failed21errors in ignored skill samples (archive dec16f71e27b6e0f); user authorized narrow sample exclusion, separately committed8eeef89, full lint thenpassed (exit0 archive207d2f084fdae24b). T14 committed e6c8175.

---

# Wave 6 — one agent

## T15: Shell wiring, old header retired

**Implements:** FR-1, FR-2, FR-3, FR-4, FR-5 | **Satisfies:** AC-2.1, AC-3.1, AC-3.2, AC-4.1, AC-5.1, AC-5.2
**Files:** `packages/builder-ui/src/app/ExpressionBuilderShell.tsx`, `packages/builder-ui/src/workbench/types.ts`, `packages/builder-ui/src/workbench/JsonReferenceWorkspace.tsx`, deletes `packages/builder-ui/src/workbench/WorkbenchHeader.tsx` and `packages/builder-ui/src/workbench/BuilderTabs.tsx`
**Interfaces:** Consumes: `ShellHeader` (T7) and `ScreenId` from `../workbench/screens` (T7); `FunctionsWorkspace` (T14); `jsonReferenceReducer` and `initialJsonReferenceState` (existing, carrying the loop plan's `loopName`); `currentReferenceRoot` (T3). Produces: a three-screen shell; T4's contract test goes green.
**Gate:** the loop plan has landed — this phase rewrites the `JsonReferenceWorkspace.tsx` it edits.

Mount the header and the new screen, retire the old ones. The JSON reference reducer is hoisted from `JsonReferenceWorkspace` into the shell so Functions can read the sample; the workspace keeps all its own markup and behaviour, now driven by `state`/`dispatch` props.

- [x] Run: `npx vitest run packages/builder-ui/test/screenContract.test.tsx` — expect: FAIL (the red T4 left)
- [x] In `JsonReferenceWorkspace.tsx`: change the signature to `{ active, adapter, state, dispatch }`, typed `state: JsonReferenceState` and `dispatch: Dispatch<JsonReferenceAction>` (both types are already imported there), and delete only its internal `useReducer` line. Every effect, handler and element stays as it is — including the loop plan's `onLoopNameChange={(value) => dispatch({ type: "setLoopName", value })}`, which now dispatches through the prop.
- [x] In `ExpressionBuilderShell.tsx`: replace `builderView` / `BuilderView` / `panelIds` / `jsonReferenceOpened` with `const [screen, setScreen] = useState<ScreenId>('condition')` (D5), importing `ScreenId` from `../workbench/screens`; add `const [jsonState, jsonDispatch] = useReducer(jsonReferenceReducer, initialJsonReferenceState)`; render `<ShellHeader screen={screen} onScreenChange={setScreen} mode={document.mode} onModeChange={updateMode} onImport={() => setDialog('importExpression')} onExport={() => void exportDocument()} />` in place of `<WorkbenchHeader …>`; keep all three panels mounted inside the single `<main>` with `hidden={screen !== …}` so state survives (FR-4), dropping `role="tabpanel"`/`aria-labelledby` for an `aria-label` on each; pass `sample={jsonState.parsed?.value ?? null}` and `referenceRoot={currentReferenceRoot(jsonState)}` to `<FunctionsWorkspace adapter={adapter} …>`, and `state={jsonState} dispatch={jsonDispatch}` to `<JsonReferenceWorkspace …>`; add `import '../theme/shell.css'` and `import '../theme/functions.css'` immediately **after** the existing `import '../theme/tokens.css'` at line 54, since `shell.css` overrides `.eb-root` by cascade order.
- [x] Delete `WorkbenchHeader.tsx` and `BuilderTabs.tsx`; drop `WorkbenchHeaderProps`, `BuilderView` and `BuilderPanelIds` from `types.ts`. Leave `controls/TabStrip.tsx` — `SupportPane` still uses it.
- [x] Run: `npx vitest run packages/builder-ui/test/screenContract.test.tsx packages/builder-ui/test/jsonReferenceState.test.ts` — expect: PASS. `jsonReferenceWorkspace.test.tsx` renders the workspace without `state` / `dispatch` and is expected red until T19.
- [x] Run: `npm run typecheck && npm run lint` — expect: PASS, no unused imports from the deletions
- [x] Commit: `feat(builder-ui): switch screens from the pill header`

> `npm test` is red here, by design. The wave table lists each red suite and the wave-7 agent that repairs it. Do not touch those files in this phase.


**Execution evidence:** Prechange screen contract4/4 failed (exit1 archive772781d5438c4b52); after shell integration screenContract+jsonReferenceState26/26 passed, TypeScript/full lint/scoped whitespaceexit0. Coordinator reviewed full owned diff, preserved all JSON body handlers/markup, and staged whitespacepassed. Committed d83fc09. Downstream suites intentionally awaitT16–T20.

---

# Wave 7 — five agents

## T16: Rewrite builderSwitching

**Implements:** FR-4 | **Satisfies:** AC-4.1
**Files:** `packages/builder-ui/test/builderSwitching.test.tsx`
**Interfaces:** Consumes: the shipped three-screen shell (T15). Produces: nothing other phases read.

- [x] Drop the tab-strip cases that no longer describe the UI: the two-tabs-after-the-brand assertion, both rule-count-badge cases, and the arrow-key/Home/End activation case (a menu is not a tablist, so these test a pattern the design removed).
- [x] Keep and re-point the cases that still hold — JSON reference state surviving a switch, the copied-status reset, and "leaves the document, mode, predicate and Export output unchanged" — replacing each `getByRole('tab', …)` click with the chip menu via a local `goTo(user, label)` helper of the shape T4 uses.
- [x] Run: `npx vitest run packages/builder-ui/test/builderSwitching.test.tsx` — expect: PASS
- [x] Commit: `test: point builder switching at the mode chip`


**Execution evidence:** Coordinator reviewed diff: 5 focused tests, scoped ESLint and staged whitespacepassed, exits0; committed103ad52.

---

## T17: Remove the dead header CSS

**Implements:** FR-2 | **Satisfies:** AC-1.1
**Files:** `packages/builder-ui/src/theme/tokens.css`, `packages/builder-ui/test/jsonReferenceStyles.test.ts`
**Interfaces:** Consumes: the shipped header (T15). Produces: nothing other phases read.

Paired deliberately: the rules and the assertions about them must go in one commit, or the two agents race.

- [x] Delete from `tokens.css`: `.eb-workbench-header`, `.eb-header-brand`, `.eb-brand-mark`, `.eb-header-titles`, `.eb-header-actions`, `.eb-header-privacy`, `.eb-builder-tabs`, `.eb-builder-tab`, `.eb-builder-tab-count` — including the copies inside the `max-width: 600px` block near line 2936 and the `min-width: 901px` block near line 3004.
- [x] In `jsonReferenceStyles.test.ts`, delete the "keeps the header one row and 71px tall" case entirely (it asserts `.eb-builder-tabs` min-height and margin-block, plus the old brand/actions rules) and drop the `.eb-builder-tabs` line from the stacked-scroll case. Leave every assertion covering the JSON reference body untouched.
- [x] Run: `npx vitest run packages/builder-ui/test/jsonReferenceStyles.test.ts packages/builder-ui/test/themeColorAudit.test.ts` — expect: PASS
- [x] Confirm `grep -n "eb-builder-tab\|eb-workbench-header\|eb-header-" packages/builder-ui/src/theme/tokens.css` returns nothing
- [x] Commit: `refactor(theme): drop the retired header and tab-strip rules`


**Execution evidence:** Coordinator reviewed full deletion diff: 6focused/audit tests, scoped ESLint, selectorsearch0matches and staged whitespacepassed; committed90d6368.

---

## T18: Point the e2e spec at the chip

**Implements:** FR-3, FR-26 | **Satisfies:** AC-3.1, AC-26.1
**Files:** `tests/e2e/json-references.spec.ts`
**Interfaces:** Consumes: the shipped header (T15). Produces: nothing other phases read.

- [ ] Add a local helper and use it at lines 78, 184 and 292. At lines 325–326, turn `views` into `[{ name: 'Functions' }, { name: 'Trigger / Filter' }, { name: 'JSON reference' }]` (adding Functions is AC-26.1), replace `await view.tab.click()` with `await goToScreen(page, view.name)`, and change the test title's "both views" to "all three screens". The loop plan does not touch this file, but locate by content if lines have moved.

```ts
async function goToScreen(page: Page, label: string) {
  await page.getByRole('button', { name: /^Screen:/ }).click();
  await page.getByRole('menuitemradio', { name: label }).click();
}
```

- [ ] Replace the focus-order assertions at lines 223–225 (two tab locators, `toBeFocused` and `aria-selected`) with the single chip button: it is focused, and its accessible name reads `Screen: JSON reference` after the switch.
- [ ] In the viewport sweep, change `document.querySelector('.eb-workbench-header')` (line 336) to `'.eb-pill-header'`. **Leave `[role="tab"]` in the controls selector at line 335** — the Trigger / Filter support pane's diagnostics tabs still use it. Keep `TODAYS_HEADER_HEIGHT` and the one-row assertion above 900px: the 48px pill satisfies both, and T5's `max-width: 900px` wrap keeps 375px free of sideways scroll.
- [ ] Run: `npm run test:e2e -- tests/e2e/json-references.spec.ts` — expect: PASS
- [ ] Commit: `test(e2e): switch screens through the mode chip`

---

## T19: Host the JSON reference workspace suite on a reducer

**Implements:** FR-4 | **Satisfies:** AC-4.1
**Files:** `packages/builder-ui/test/jsonReferenceWorkspace.test.tsx`
**Interfaces:** Consumes: `JsonReferenceWorkspace({ active, adapter, state, dispatch })` (T15); `jsonReferenceReducer` and `initialJsonReferenceState` (existing). Produces: nothing other phases read.
**Gate:** the loop plan has landed — its Task 2 rewrites a case in this file.

T15 made `state` / `dispatch` required, so every standalone render here — the loop plan's `builds items() from the entered loop name, not the source action` case included — needs a host that owns the reducer. This is a harness change only. It is also T15's behaviour guard for the JSON reference body.

- [x] Add a host component near the top of the file, merging these imports into the existing ones:

```tsx
import { useReducer } from 'react';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import {
	initialJsonReferenceState,
	jsonReferenceReducer,
} from '../src/workbench/jsonReferenceState';

/** Owns the reducer the shell owns in production (T15). */
function Workspace({ adapter }: { adapter: PlatformAdapter }) {
	const [state, dispatch] = useReducer(jsonReferenceReducer, initialJsonReferenceState);
	return <JsonReferenceWorkspace adapter={adapter} active state={state} dispatch={dispatch} />;
}
```

- [x] Replace every `render(<JsonReferenceWorkspace adapter={X} active />)` with `render(<Workspace adapter={X} />)`, keeping each `X` as written. There are 16 today, plus any the loop plan added.
- [x] Run: `npx vitest run packages/builder-ui/test/jsonReferenceWorkspace.test.tsx` — expect: PASS. If any case still fails after the harness swap, **stop and report it as a T15 regression** — do not edit assertions.
- [x] Run: `npx eslint packages/builder-ui/test/jsonReferenceWorkspace.test.tsx` — expect: no output
- [x] Commit: `test: host the JSON reference workspace on a reducer harness`


**Execution evidence:** Agent tool rejected new threads repeatedly; coordinator used skill unavailable-delegation fallback. Mechanical16render harness swap only, allassertionsunchanged; focused16/16 passed archivefd662036a3734741; scopedlint and stagedwhitespaceexit0. Committed8b4f5d5.

---

## T20: Open Import from the overflow menu

**Implements:** FR-5 | **Satisfies:** AC-5.1
**Files:** `packages/builder-ui/test/sharedBuilderUi.test.tsx`, `tests/e2e/web-smoke.spec.ts`, `tests/e2e/condition-move-to-group.spec.ts`
**Interfaces:** Consumes: the shipped header (T15) — Import is now a `menuitem` behind the **More actions** button. Produces: nothing other phases read.

One change in three files: every click on the old header **Import** button opens the overflow first. The dialog's own **Import** confirm button is unchanged — leave those lines alone.

- [x] In `tests/e2e/web-smoke.spec.ts` (lines 46 and 67) and `tests/e2e/condition-move-to-group.spec.ts` (line 33), replace `await page.getByRole('button', { name: 'Import', exact: true }).click();` with:

```ts
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Import' }).click();
```

- [x] In `packages/builder-ui/test/sharedBuilderUi.test.tsx` (line 510), replace `await user.click(screen.getByRole('button', { name: 'Import' }));` with the lines below. `hidden: true` matches the jsdom quirk the surrounding comment already documents for Fluent portals after Export:

```ts
    await user.click(screen.getByRole('button', { name: 'More actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Import', hidden: true }));
```

- [x] Run: `npx vitest run packages/builder-ui/test/sharedBuilderUi.test.tsx` — expect: PASS
- [x] Run: `npm run test:e2e -- tests/e2e/web-smoke.spec.ts tests/e2e/condition-move-to-group.spec.ts` — expect: PASS
- [x] Commit: `test: open Import from the header overflow menu`


**Execution evidence:** Coordinator fallback implementation; Import header calls retargeted, conditionpreviewqueries scoped for all-mounted screens, existingheaderImportassertion and stalewebCopylocator retargeted without changing behaviorassertions. Initialunit24/25 and e2e1/2 failed on those oldlocators; afterrepair unit25/25 passed archive364b4bc13addf8e5, e2e2/2 passed archived0ecd797ff5fbba6, scopedlint/stagedwhitespaceexit0. Existing ignored web-smoke/condition-move tests force-staged only because exacttaskpathsrequirethem. Committed bd8e8e4.

---

# Wave 8 — one agent

## T21: Integration verification

**Implements:** all FRs | **Satisfies:** all ACs

- [ ] Run: `npm test` — expect: only `workspaceBuildScripts.test.ts` (CON-001) fails; every other suite passes
- [ ] Run: `npm run typecheck` — expect: PASS
- [ ] Run: `npm run lint` — expect: PASS
- [ ] Run: `npm run test:e2e` — expect: PASS
- [ ] Confirm `grep -rn "BuilderTabs\|WorkbenchHeader" packages apps tests --include=*.ts --include=*.tsx` returns nothing (AC-3.2)
- [ ] Confirm `controls/TabStrip.tsx` still exists and `SupportPane` still imports it
- [ ] Confirm `git log --name-only` for this plan's commits lists neither `package.json` nor `npm-shrinkwrap.json`
- [ ] Walk the Quickstart below in both palettes
- [ ] Commit: `feat: Functions screen and 11a pill header`

---

## Quickstart Validation

```bash
npm run build && npm run dev -w @ryanmakes/eb_web
```

1. The pill reads **Expression Builder › Trigger / Filter** with the mode switch, `···` and **Export** at the right; the canvas below is unchanged.
2. Chip → **JSON reference**. Action name `Get items`, paste `{"body":{"Name":"Ada Lovelace"}}`, press **Parse**.
3. Chip → **Functions**. String is expanded, `concat` selected, inputs `text1` (required), `text2` (required), `text3` (optional).
4. Expand **Parsed Value**, double-click `body.Name` → `text1` becomes `outputs('Get_items')?['body']?['Name']`, turns amber, and has focus.
5. Click `text2`, type `' - '` → green. Status **Valid**, "2 of 2 required set"; Info "2 / 3", "1 optional left empty".
6. The dock shows `concat(outputs('Get_items')?['body']?['Name'], ' - ')`, crumbs `concat › JSON reference › text`, and **no** "Sample result" panel.
7. Type `Ada` into `text3` → Status **Invalid** with "text3: Wrap text in single quotes: 'Ada'.", crumbs collapse to `concat › error`, both copy actions disable. Clear it to recover.
8. **Copy expression** → label reads "Copied" for ~1.5s, clipboard holds the bare expression; **Copy as @{…}** yields `@{concat(…)}`.
9. Focus `text1`, click `toUpper` in the nav → `text1` becomes `toUpper(outputs('Get_items')?['body']?['Name'])`, `concat` stays selected, and `text1` keeps focus. Click `trim` → `trim(toUpper(…))`. Click the search box, then `toUpper` → `toUpper` becomes the selected function. Expand Collection and pick `chunk` → its inputs read `collection` and `length`, the same as String's `chunk`.
10. Tab through the header: every control shows a 2px accent ring at a 2px offset.
11. Chip → Trigger / Filter and back: arguments survive. Chip → JSON reference: sample and action name survive.
12. Flip the host theme to light: every surface, the code well and the chips re-resolve, no hardcoded color.
13. Chip → JSON reference. Paste `{"body":{"value":[{"Name":"Ada"}]}}`, parse, select `value[0]` → `Name`, and type `Apply to each` in **Loop name**. Chip → Functions: Parsed Value lists `body.value[0].Name` as `outputs('Get_items')?['body']?['value'][0]?['Name']` — the source reference, never `items(…)`. Chip → JSON reference: the loop name is still there.
14. Paste the items() block's copy, `items('Apply_to_each')?['Name']`, into a Functions argument: it turns amber and the crumb reads `JSON reference`.
15. Resize to 375px wide on Trigger / Filter: the pill wraps onto a second row and nothing scrolls sideways.
16. Still at 375px, chip → Functions: nav, Arguments, Status, Info and the dock stack in one column. The nav scrolls on its own within 40% of the height, the rest scrolls together down to **Copy expression**, and nothing scrolls sideways.

---

## Self-review

**Spec coverage.** FR-1 T5/T15 · FR-2 T5/T7 · FR-3 T7/T15 · FR-4 T15/T19 · FR-5 T7/T20 · FR-6 T5 · FR-7 T1 · FR-8 T6/T14 · FR-9 T2 · FR-10 T9/T10 · FR-11 T9/T10 · FR-12 T9/T11 · FR-13 T8 · FR-14 T6/T9/T11 · FR-15 T9/T10/T14 · FR-16 T10/T11 · FR-17 T9/T12 · FR-18 T9/T12 · FR-19 T9/T13 · FR-20 T9/T13 · FR-21 T3/T10 · FR-22 T9/T10/T14 · FR-23 T13/T14 · FR-24 T5/T6 · FR-25 T13 · FR-26 T5/T6/T18. Every AC appears in a phase header. No gaps.

**Loop-plan interop.** Source vs loop root pinned by T3's last test; items() output parses as a reference (T8); `setLoopName` wiring survives the hoist (T15); the loop-name UI case runs on the new harness (T19); `NO_TEXT_ASSISTANCE` reused, not redefined (T11).

**Existing suites the header change breaks.** All seven are owned: `builderSwitching` (T16), `jsonReferenceStyles` (T17), `json-references.spec` (T18), `jsonReferenceWorkspace` (T19), `sharedBuilderUi`, `web-smoke.spec` and `condition-move-to-group.spec` (T20).

**Placeholders.** None. Every engine, state and token step carries complete code; the component and CSS steps enumerate exact elements, attributes, class names and strings.

**Type consistency.** `findFunction`, `parseArgument`, `ParseArgumentResult`, `buildParsedValueList`, `currentReferenceRoot`, `deriveFunctions`, `navGroups`, `argKind`, `ScreenId` and `SCREENS` each keep one signature everywhere they appear. The four wave-4 prop interfaces are declared in full in their own phases and consumed unchanged by T14.

**No data-model.md or contracts/api.md.** The feature persists nothing and exposes no API.
