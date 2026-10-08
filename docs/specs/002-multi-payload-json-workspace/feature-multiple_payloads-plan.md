# Multi-payload JSON Workspace Implementation Plan

**Spec:** [Approved Spec 002, v1.0.1](spec.md)
**Created:** 2026-10-08
**Status:** Revised for execution review (2026-10-08); runtime acceptance remains unverified
**Filename:** feature-multiple_payloads-plan.md

## Global Constraints

- Implement payload tabs, cross-payload search and Functions source groups.
- Preserve existing pane bodies, styling, arrangement, reference blocks and shared-header behavior.
- Samples remain local and session-only. Add no persistence, uploads, telemetry or dependencies.
- Retain the per-sample limits: 1 MiB, 10,000 values and 64 nesting levels.
- Retain 600ms automatic validation, immediate native whole-field paste, semantic change detection and operation-based notices.
- Use stable payload IDs rather than labels or positions.
- JSON search renders at most eight matches. Functions renders at most 200 matching leaves across all sources, after filtering.
- Keep the theme switch web-only.
- Execute from `functions-prep-for-release`, based on `491145121949ce1676e9a275c9422d368c3e55ae`. The user authorized fetching this branch; that fetch is complete. Preserve subsequent dirty files and staged state. Do not push, rebase or reapply baseline commits.
- Commit only verified, owned changes. The exact `git add` commands below assume the recorded clean application baseline. If unrelated user edits appear in one of those paths, pause its whole-file staging, select only task-owned hunks interactively for that file, and inspect `git diff --cached` before committing; do not stage unrelated hunks.

The approved spec calls for an `Action_name` blank-name preview. The current implementation uses `Action`. Change the preview helpers only; successful paste must still fill a blank name with `Action`.

**Architecture:** `jsonPayloadSession.ts` owns session identity and source contracts; `payloadTreeModel.ts` owns complete leaf traversal. JSON controls consume these contracts, while `parsedValueModel.ts` owns the shared Functions leaf budget. The shell retains both screens and owns delivery bookkeeping.

**Tech stack:** Existing React 19, TypeScript, Vite, Vitest, Testing Library and Playwright; no new dependencies.

**Scope:** FR-1–FR-6 and all 44 acceptance criteria in Spec 002.

**Out of scope:** Pane redesigns, persistence, uploads, telemetry, expression evaluation, host insertion, dependency changes and Git publication.

**Execution order:** Task 0 → Task 1 → Task 2 → Task 3 → Task 4. Task 2 and Task 3 both modify the shell and must run serially. Delegates use fresh task-local packets, exclusive writable paths, `gpt-6-luna` and `xhigh`; the coordinator owns plan checkboxes and commits. Task 0 contains intentional uncommitted red feature tests; their commits belong to Tasks 2/4.

**Goal:** Keep up to five independent JSON samples available, find and reveal references across them, and insert correctly rooted references from every parsed source into Functions.

Use three implementation areas: session/search models, JSON workspace controls, and Functions source presentation. Retain the existing parser, per-payload reducer, editor, tree, reference formatter and Functions argument reducer.

No external API or persistent data model is introduced. Internal contracts belong in this plan; separate API/storage documents are unnecessary.

## Verified baseline and execution prerequisites

Reviewed on 2026-10-08 from clean commit `491145121949ce1676e9a275c9422d368c3e55ae` with Node `v24.19.0`. Historical notes describe a different local checkout; they do not establish dirty files in this workspace. Repository instructions: no `AGENTS.md` found.

Run the setup in this order before Task 0:

```bash
npm ci
npm run build
npm run typecheck
npx playwright install --with-deps msedge
```

Run the Edge install step in the cloud environment’s privileged setup phase, after `npm ci`; the unprivileged runtime cannot install its system packages. Expected: each command exits 0. `npm ci` installs locked dependencies without changing manifests; the build creates the engine/platform distributions used by UI tests. The configured Playwright project is named `chromium` but uses `channel: 'msedge'`; do not substitute another browser or silently change `playwright.config.ts`.

Observed here: dependency installation, lint, typecheck and build passed (each exit 0); the full unit regression passed 65 suites and 582 tests (exit 0). Build emitted the existing large-chunk warning. After build, the focused baseline passed all eight suites and 129 tests (exit 0). Before build, it had six passing suites (81 tests) and two import failures from missing workspace distribution files; this is a setup failure, not a feature failure. The first browser attempt failed before executing assertions: `Chromium distribution 'msedge' is not found at /opt/microsoft/msedge/msedge`. Installing Edge then failed with `su: Authentication failure`; this workspace lacks the root access required by that installer. Obtain an executor with the configured Edge browser before claiming any browser/native editing result. Actual Toolbox loading is a separate manual gate and is pending. The user requested that cloud setup install Edge; its configured setup script is not present in this checkout and the exposed environment tool is read-only. Update that external setup script through the supported environment configuration workflow before the next browser run.

The final execution report must separate baseline failures, intentional red feature contracts, passing checks and unavailable rendered/Toolbox evidence. Do not mark Tasks 0/2/4 verified from state tests alone. A missing browser blocks their browser checks; it does not authorize dropping them.

### Task 0: Contracts and regression baseline

**Owns:** Browser harness repairs and initial native-editing feature signal; preserves FR-4/FR-5 contracts
**Satisfies:** AC-4.11, AC-4.12, AC-4.13, AC-4.14
**Files:**

- Modify: `tests/e2e/json-references.spec.ts` — current navigation and native clipboard helpers
- Modify: `tests/e2e/json-pane-scroll.spec.ts` — replace obsolete Parse control assertions
- Create: `tests/e2e/json-multi-payload.spec.ts` — native editing feature signal
- Signal: `tests/e2e/json-multi-payload.spec.ts` — native whole-field paste and independent sample controls

**Interfaces:** Consumes the current reducer, clipboard adapter and screen menu. Produces baseline evidence and failing feature contracts.

Ownership: test fixtures and harnesses only.

- [ ] **Step 1: Establish the observable pre-change signal**

Capture the baseline before writing tests:

```bash
git rev-parse HEAD
git branch --show-current
git status --porcelain=v1
git diff --cached --stat
git diff --stat
```

Expected at this review: HEAD `491145121949ce1676e9a275c9422d368c3e55ae`, branch `functions-prep-for-release`, no pre-existing staged or dirty application files. The revised plan is the only authorized documentation edit. Re-record any later changes before implementation.

- [ ] **Step 2: Capture the current signal**
2. Run the focused baseline:

   ```powershell
   npm run test -- packages/builder-ui/test/jsonPayload.test.ts packages/builder-ui/test/jsonReferenceState.test.ts packages/builder-ui/test/jsonReferenceWorkspace.test.tsx packages/builder-ui/test/payloadTree.test.tsx packages/builder-ui/test/parsedValueModel.test.ts packages/builder-ui/test/functionsNav.test.tsx packages/builder-ui/test/functionsWorkspace.test.tsx packages/builder-ui/test/builderSwitching.test.tsx
   ```

   Expected: record actual pass/fail results and failing test names. Historical results are not accepted as the current baseline.

3. Run the existing JSON browser tests:

   ```powershell
   npm run test:e2e -- tests/e2e/json-references.spec.ts tests/e2e/json-pane-scroll.spec.ts
   ```

   Source inspection identified obsolete Parse-button assertions, old screen-navigation selectors and synthetic paste helpers. Record their observed failures, then update those affected helpers to current behavior.

- [ ] **Step 3: Implement the minimum fix**

Use real clipboard insertion for browser paste tests:

   ```ts
   async function openJsonReference(page: Page): Promise<void> {
     await page.getByRole('button', { name: /^Screen:/ }).click();
     await page.getByRole('menuitemradio', {
       name: 'JSON reference',
       exact: true,
     }).click();
   }

   async function pasteSample(page: Page, text: string): Promise<void> {
     await page.evaluate(
       (value) => navigator.clipboard.writeText(value),
       text,
     );
     const editor = page.getByRole('textbox', {
       name: 'Sample JSON',
       exact: true,
     });
     await editor.focus();
     await editor.press('Control+V');
   }
   ```

   `getByRole` selects the visible editor when inactive payload editors remain mounted. Use this exact native-paste helper in each owned browser file; do not introduce a shared test-helper file.

In `json-references.spec.ts`, change `openJsonReference` to the helper above. Replace every Condition builder screen-tab navigation with Screen menu → `Trigger / Filter`, and every JSON screen-tab navigation with the helper. The keyboard test begins at the labelled Screen button, opens its menu by keyboard and chooses JSON reference; after Task 2 it traverses the payload tab, New payload and search controls before the root radios. Use `.eb-pill-header` for header measurements (the existing `.eb-workbench-header` is obsolete); preserve width/reachability assertions without enforcing the old fixed 71px header. In the viewport loop, navigate by the same Screen menu rather than storing obsolete screen-tab locators.

In `json-pane-scroll.spec.ts`, add `test.use({ permissions: ['clipboard-read', 'clipboard-write'] })`, use `pasteSample(page, JSON.stringify(sample))` in place of fill plus Parse click, and wait for the Payload count before expansion. Use the Sample JSON textbox as the final Source target instead of the absent Parse button. In Task 2 onward, scope `.eb-json-workspace`, cards and owners to `page.getByRole('tabpanel')` so hidden mounted pages never match. Expand the viewport matrix to the six exact sizes in Task 4.

5. Add the native-editing feature contract before UI implementation:

   ```ts
   import { expect, test, type Page } from 'playwright/test';

   test.use({
     permissions: ['clipboard-read', 'clipboard-write'],
   });

   async function openJsonReference(page: Page): Promise<void> {
     await page.getByRole('button', { name: /^Screen:/ }).click();
     await page.getByRole('menuitemradio', {
       name: 'JSON reference',
       exact: true,
     }).click();
   }

   async function pasteSample(page: Page, text: string): Promise<void> {
     await page.evaluate(
       (value) => navigator.clipboard.writeText(value),
       text,
     );
     const editor = page.getByRole('textbox', {
       name: 'Sample JSON',
       exact: true,
     });
     await editor.focus();
     await editor.press('Control+V');
   }

   test('keeps samples independent and preserves native paste undo', async ({
     page,
   }) => {
     await page.addInitScript(() =>
       localStorage.setItem('eb.onboarding.seen.v1', '1'),
     );
     await page.goto('/');
     await openJsonReference(page);

     await pasteSample(page, '{"old":1}');
     const editor = page.getByRole('textbox', {
       name: 'Sample JSON',
       exact: true,
     });

     await editor.evaluate((element) =>
       (element as HTMLTextAreaElement).setSelectionRange(2, 5),
     );
     await pasteSample(page, '{"new":2}');
     await expect(editor).toHaveValue('{"new":2}');

     await editor.press('Control+Z');
     await expect(editor).toHaveValue('{"old":1}');
     await editor.press('Control+Y');
     await expect(editor).toHaveValue('{"new":2}');

     await page.getByRole('button', {
       name: 'New payload',
       exact: true,
     }).click();
     await expect(editor).toHaveValue('');

     await pasteSample(page, '{"second":3}');
     await page.getByRole('tab', {
       name: /^Action, payload 1$/,
     }).click();
     await expect(editor).toHaveValue('{"new":2}');
   });
   ```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

```bash
npm run test:e2e -- tests/e2e/json-references.spec.ts tests/e2e/json-pane-scroll.spec.ts
npm run test:e2e -- tests/e2e/json-multi-payload.spec.ts
```

Expected: existing JSON browser tests exit 0 after their obsolete harness assertions are corrected; the new contract exits 1 at the missing `New payload` control. Browser launch failure is a prerequisite failure, not a feature signal. Keep the failing feature test uncommitted until Task 2 passes it.

- [ ] **Step 5: Commit the coherent change**

```bash
git add tests/e2e/json-references.spec.ts tests/e2e/json-pane-scroll.spec.ts
git commit -m "test: align JSON browser harness with current editing"
```

Expected: only the two repaired, passing harness files are committed; `json-multi-payload.spec.ts` remains an owned uncommitted Task 2 signal.
7. Retain existing root, escaping, loop-name and clipboard-failure coverage. Successful-copy assertions must remain absent when clipboard operations reject.

### Task 1: Session identity and complete search data

**Owns:** FR-1 session identity; FR-2 pure search; FR-4 stale-work guard; FR-5 placeholder preview
**Satisfies:** AC-1.1, AC-1.2, AC-1.3, AC-1.4, AC-1.5, AC-1.6, AC-1.7, AC-2.1, AC-2.2, AC-2.3, AC-2.4, AC-2.6, AC-2.7, AC-2.8, AC-4.10
**Files:**

- Create: `packages/builder-ui/src/workbench/jsonPayloadSession.ts` — session identity, reducers and shared source types
- Create: `packages/builder-ui/src/workbench/payloadSearchModel.ts` — complete-value search with an eight-option budget
- Create: `packages/builder-ui/test/jsonPayloadSession.test.ts` — pure session and search contracts
- Modify: `packages/builder-ui/src/workbench/payloadTreeModel.ts` — complete leaf traversal
- Modify: `packages/builder-ui/test/payloadTreeModel.test.ts` — leaf traversal regression
- Modify: `packages/builder-ui/src/workbench/jsonReferenceState.ts` — captured-text action and preview placeholder
- Modify: `packages/builder-ui/test/jsonReferenceState.test.ts` — preview assertions
- Modify: `packages/builder-ui/test/jsonReferenceWorkspace.test.tsx` — preview assertions
- Signal: `packages/builder-ui/test/jsonPayloadSession.test.ts` — stable identities, stale work rejection and complete-value search

**Interfaces:** Consumes `JsonReferenceState`, `JsonReferenceAction`, `ParsedPayload`, `PayloadPath` and existing reference/path helpers. Produces `JsonPayloadSession`, `JsonPayloadAction`, `PayloadSearchMatch`, `ParsedValueSource`, `collectPayloadLeaves`, `searchPayloads` and `getParsedSources`.

Ownership: pure session and search behavior; preview-helper changes only in the existing reducer module.

### Lock the contracts

The first block is the import/type prefix for `jsonPayloadSession.ts`. Append only its implementation block in Step 3 to complete that new file. `ParsedValueSource`, `PayloadSearchMatch` and `PayloadReveal` are defined here once and imported by consumers.

```ts
import type { PayloadPath, PayloadReferenceRoot } from '@ryanmakes/eb_engine';
import { isJsonObject, pathKey, valueAtPath, type ParsedPayload } from '../importExport/jsonPayload';
import {
  initialJsonReferenceState, jsonReferenceReducer, rootExpression,
  currentReferenceRoot, type JsonReferenceState, type JsonReferenceAction,
} from './jsonReferenceState';
import { ARRAY_PAGE_SIZE, OBJECT_PAGE_SIZE } from './payloadTreeModel';

export interface PayloadTab {
  id: string;
  state: JsonReferenceState;
}

export interface PayloadReveal {
  sequence: number;
  payloadId: string;
  path: PayloadPath;
}

export interface JsonPayloadSession {
  payloads: PayloadTab[];
  activeId: string;
  nextId: number;
  revealSequence: number;
  reveal: PayloadReveal | null;
}

export interface PayloadSearchMatch {
  payloadId: string;
  parsed: ParsedPayload;
  path: PayloadPath;
  payloadLabel: string;
  pathLabel: string;
  preview: string;
}

export interface ParsedValueSource {
  id: string;
  label: string;
  rootCaption: string;
  parsed: ParsedPayload;
  referenceRoot: PayloadReferenceRoot | null;
}

export type JsonPayloadAction =
  | { type: 'add' }
  | { type: 'activate'; payloadId: string }
  | { type: 'close'; payloadId: string }
  | {
      type: 'edit';
      payloadId: string;
      action: JsonReferenceAction;
    }
  | { type: 'reveal'; match: PayloadSearchMatch };
```

Extend the existing automatic-parse action to carry its captured text:

```ts
| { type: 'autoParse'; expectedText?: string }
```

The existing single-payload reducer retains its parsing behavior. The session reducer uses this field to reject obsolete delayed work.

- [ ] **Step 1: Establish the observable pre-change signal**

```ts
import { describe, expect, it } from 'vitest';
import {
  createJsonPayloadSession,
  jsonPayloadSessionReducer,
} from '../src/workbench/jsonPayloadSession';
import { searchPayloads } from '../src/workbench/payloadSearchModel';

describe('payload session', () => {
  it('caps capacity and never reuses a closed payload identity', () => {
    let session = createJsonPayloadSession();
    for (let index = 0; index < 4; index += 1) {
      session = jsonPayloadSessionReducer(session, { type: 'add' });
    }

    expect(session.payloads).toHaveLength(5);
    expect(jsonPayloadSessionReducer(session, { type: 'add' }))
      .toBe(session);

    const removed = session.activeId;
    session = jsonPayloadSessionReducer(session, {
      type: 'close',
      payloadId: removed,
    });
    session = jsonPayloadSessionReducer(session, { type: 'add' });

    expect(session.activeId).not.toBe(removed);
    expect(session.payloads).toHaveLength(5);
  });

  it('rejects delayed work for an inactive or removed payload', () => {
    let session = createJsonPayloadSession();
    const first = session.activeId;
    session = jsonPayloadSessionReducer(session, {
      type: 'edit',
      payloadId: first,
      action: { type: 'setText', value: '{"a":1}' },
    });
    session = jsonPayloadSessionReducer(session, { type: 'add' });

    const delayed = {
      type: 'edit',
      payloadId: first,
      action: {
        type: 'autoParse',
        expectedText: '{"a":1}',
      },
    } as const;

    expect(jsonPayloadSessionReducer(session, delayed)).toBe(session);

    session = jsonPayloadSessionReducer(session, {
      type: 'close',
      payloadId: first,
    });
    expect(jsonPayloadSessionReducer(session, delayed)).toBe(session);
  });

  it('searches complete values and rejects an obsolete reveal', () => {
    let session = createJsonPayloadSession();
    const id = session.activeId;
    session = jsonPayloadSessionReducer(session, {
      type: 'edit',
      payloadId: id,
      action: {
        type: 'pasteAndParse',
        defaultActionName: 'Action',
        text: JSON.stringify({
          rows: Array.from({ length: 25 }, (_, index) => ({
            Email: 'x'.repeat(140) + (index === 24 ? 'NEEDLE' : ''),
          })),
        }),
      },
    });

    const result = searchPayloads(session.payloads, 'needle');
    expect(result.total).toBe(1);
    expect(result.matches[0].path).toEqual(['rows', 24, 'Email']);

    const match = result.matches[0];
    session = jsonPayloadSessionReducer(session, {
      type: 'edit',
      payloadId: id,
      action: {
        type: 'pasteAndParse',
        defaultActionName: 'Action',
        text: '{"replacement":true}',
      },
    });

    expect(jsonPayloadSessionReducer(session, {
      type: 'reveal',
      match,
    })).toBe(session);
  });
});
```

- [ ] **Step 2: Capture the current signal**

```bash
npm run test -- packages/builder-ui/test/jsonPayloadSession.test.ts
```

Expected before implementation: failure from missing session/search exports.

- [ ] **Step 3: Implement the minimum fix**

### Implement the session reducer

Create `jsonPayloadSession.ts` by concatenating its import/type block in “Lock the contracts” with the complete implementation below. The `autoParse` union change belongs only to the existing `jsonReferenceState.ts`, not to this new module.

```ts
function freshJsonState(): JsonReferenceState {
  return {
    ...initialJsonReferenceState,
    expanded: new Set<string>(),
    showAll: new Set<string>(),
  };
}

export function createJsonPayloadSession(): JsonPayloadSession {
  return {
    payloads: [{ id: 'payload-1', state: freshJsonState() }],
    activeId: 'payload-1',
    nextId: 2,
    revealSequence: 0,
    reveal: null,
  };
}

export function payloadLabel(
  payloads: readonly PayloadTab[],
  index: number,
): string {
  const state = payloads[index].state;
  if (state.outputFrom === 'action') {
    return state.actionName.trim() || `Payload ${index + 1}`;
  }
  const ordinal = payloads.slice(0, index + 1)
    .filter((payload) => payload.state.outputFrom === 'trigger').length;
  return ordinal === 1 ? 'Trigger' : `Trigger ${ordinal}`;
}

export function getParsedSources(
  payloads: readonly PayloadTab[],
): ParsedValueSource[] {
  return payloads.flatMap((payload, index) => {
    const parsed = payload.state.parsed;
    if (parsed === null) return [];
    return [{
      id: payload.id,
      label: payloadLabel(payloads, index),
      rootCaption: rootExpression(payload.state),
      parsed,
      referenceRoot: currentReferenceRoot(payload.state),
    }];
  });
}

export function jsonPayloadSessionReducer(
  session: JsonPayloadSession,
  action: JsonPayloadAction,
): JsonPayloadSession {
  if (action.type === 'add') {
    if (session.payloads.length >= 5) return session;
    const id = `payload-${session.nextId}`;
    return {
      ...session,
      payloads: [...session.payloads, { id, state: freshJsonState() }],
      activeId: id,
      nextId: session.nextId + 1,
    };
  }

  if (action.type === 'activate') {
    if (!session.payloads.some((payload) =>
      payload.id === action.payloadId)) return session;
    return session.activeId === action.payloadId
      ? session
      : { ...session, activeId: action.payloadId };
  }

  if (action.type === 'close') {
    const index = session.payloads.findIndex((payload) =>
      payload.id === action.payloadId);
    if (index < 0 || session.payloads.length === 1) return session;
    const payloads = session.payloads.filter((payload) =>
      payload.id !== action.payloadId);
    return {
      ...session,
      payloads,
      activeId: session.activeId === action.payloadId
        ? payloads[Math.min(index, payloads.length - 1)].id
        : session.activeId,
      reveal: session.reveal?.payloadId === action.payloadId
        ? null
        : session.reveal,
    };
  }

  if (action.type === 'reveal') {
    const payload = session.payloads.find((candidate) =>
      candidate.id === action.match.payloadId);
    const parsed = payload?.state.parsed;
    if (!payload || !parsed || parsed !== action.match.parsed) {
      return session;
    }
    if (!valueAtPath(parsed.value, action.match.path).found) {
      return session;
    }

    const expanded = new Set(payload.state.expanded);
    const showAll = new Set(payload.state.showAll);
    for (let length = 0; length < action.match.path.length; length += 1) {
      const parentPath = action.match.path.slice(0, length);
      const parent = valueAtPath(parsed.value, parentPath);
      if (!parent.found) return session;
      const key = pathKey(parentPath);
      const segment = action.match.path[length];
      expanded.add(key);

      if (Array.isArray(parent.value) &&
          typeof segment === 'number' &&
          segment >= ARRAY_PAGE_SIZE) {
        showAll.add(key);
      } else if (isJsonObject(parent.value) &&
          typeof segment === 'string' &&
          Object.keys(parent.value).indexOf(segment) >= OBJECT_PAGE_SIZE) {
        showAll.add(key);
      }
    }

    const state = {
      ...jsonReferenceReducer(payload.state, {
        type: 'select',
        path: action.match.path,
      }),
      expanded,
      showAll,
    };
    const sequence = session.revealSequence + 1;
    return {
      ...session,
      payloads: session.payloads.map((candidate) =>
        candidate.id === payload.id ? { ...candidate, state } : candidate),
      activeId: payload.id,
      revealSequence: sequence,
      reveal: {
        sequence,
        payloadId: payload.id,
        path: action.match.path,
      },
    };
  }

  const payload = session.payloads.find((candidate) =>
    candidate.id === action.payloadId);
  if (!payload) return session;

  if (action.action.type === 'autoParse' &&
      (session.activeId !== payload.id ||
       action.action.expectedText !== payload.state.text ||
       payload.state.lastAttemptedText === payload.state.text)) {
    return session;
  }

  const state = jsonReferenceReducer(payload.state, action.action);
  if (state === payload.state) return session;
  return {
    ...session,
    payloads: session.payloads.map((candidate) =>
      candidate.id === payload.id ? { ...candidate, state } : candidate),
    reveal: session.reveal?.payloadId === payload.id
      ? null
      : session.reveal,
  };
}
```

### Share complete leaf traversal

Append this to `payloadTreeModel.ts`, using its existing `isJsonObject` import:

```ts
export interface PayloadLeaf {
  path: PayloadPath;
  label: string;
  value: unknown;
}

export function collectPayloadLeaves(value: unknown): PayloadLeaf[] {
  const leaves: PayloadLeaf[] = [];

  function visit(current: unknown, path: PayloadPath, label: string): void {
    const children: Array<[string | number, unknown]> =
      Array.isArray(current)
        ? current.map((child, index) => [index, child])
        : isJsonObject(current)
          ? Object.entries(current)
          : [];

    if (children.length === 0) {
      leaves.push({
        path,
        label: path.length === 0 ? '(root)' : label,
        value: current,
      });
      return;
    }

    for (const [segment, child] of children) {
      const key = segment === '' ? '""' : String(segment);
      const nextLabel = typeof segment === 'number'
        ? `${label}[${segment}]`
        : label === '' ? key : `${label}.${key}`;
      visit(child, [...path, segment], nextLabel);
    }
  }

  visit(value, [], '');
  return leaves;
}
```

Implement `payloadSearchModel.ts`:

```ts
import type { PayloadTab, PayloadSearchMatch } from './jsonPayloadSession';
import { payloadLabel } from './jsonPayloadSession';
import { collectPayloadLeaves, previewValue } from './payloadTreeModel';

export function searchPayloads(
  payloads: readonly PayloadTab[],
  query: string,
): {
  matches: PayloadSearchMatch[];
  total: number;
  parsedSourceCount: number;
} {
  const needle = query.trim().toLowerCase();
  const matches: PayloadSearchMatch[] = [];
  let total = 0;
  let parsedSourceCount = 0;

  payloads.forEach((payload, index) => {
    const parsed = payload.state.parsed;
    if (parsed === null) return;
    parsedSourceCount += 1;
    if (needle === '') return;

    for (const leaf of collectPayloadLeaves(parsed.value)) {
      const fullValue = typeof leaf.value === 'string'
        ? leaf.value
        : JSON.stringify(leaf.value) ?? '';
      if (!leaf.label.toLowerCase().includes(needle) &&
          !fullValue.toLowerCase().includes(needle)) continue;

      total += 1;
      if (matches.length < 8) {
        matches.push({
          payloadId: payload.id,
          parsed,
          path: leaf.path,
          payloadLabel: payloadLabel(payloads, index),
          pathLabel: leaf.label,
          preview: previewValue(leaf.value),
        });
      }
    }
  });

  return { matches, total, parsedSourceCount };
}
```

### Correct preview helpers

Keep the paste default constant unchanged:

```ts
export function rootExpression(
  state: JsonReferenceState,
  shape: PayloadShape = state.shape,
): string {
  return formatPayloadRoot(referenceRoot(
    state,
    shape,
    isActionNameMissing(state) ? 'Action_name' : state.actionName,
  ));
}

export function rootExpressionFor(
  state: JsonReferenceState,
  outputFrom: OutputFrom,
  shape: PayloadShape,
): string {
  const name = outputFrom === 'action' && state.actionName.trim() === ''
    ? 'Action_name'
    : state.actionName;
  return formatPayloadRoot(referenceRoot(
    { ...state, outputFrom },
    shape,
    name,
  ));
}
```

In `jsonReferenceState.test.ts`, change only `rootExpression` and `rootExpressionFor` blank-name expectations from `Action` to `Action_name`. In `jsonReferenceWorkspace.test.tsx`, change the empty-name root-preview and hint expectations likewise. Retain all paste/default/copy expectations for `Action`; retain `ACTION_NAME_PLACEHOLDER`, which is also used by the paste handler.

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

```bash
npm run test -- packages/builder-ui/test/jsonPayloadSession.test.ts
```

Expected: exit 0; the same previously failing contract passes.

Run:

```powershell
npm run test -- packages/builder-ui/test/jsonPayloadSession.test.ts packages/builder-ui/test/jsonReferenceState.test.ts packages/builder-ui/test/jsonReferenceWorkspace.test.tsx packages/builder-ui/test/payloadTree.test.tsx
npm run typecheck
```

Expected: exit 0. Extend the session tests for close selection, duplicate labels, per-payload settings, retained successful data, scalar roots and the eight-result/count contract.

- [ ] **Step 5: Commit the coherent change**

```bash
git add packages/builder-ui/src/workbench/jsonPayloadSession.ts packages/builder-ui/src/workbench/payloadSearchModel.ts packages/builder-ui/test/jsonPayloadSession.test.ts packages/builder-ui/src/workbench/payloadTreeModel.ts packages/builder-ui/test/payloadTreeModel.test.ts packages/builder-ui/src/workbench/jsonReferenceState.ts packages/builder-ui/test/jsonReferenceState.test.ts packages/builder-ui/test/jsonReferenceWorkspace.test.tsx
git commit -m "feat: add independent JSON payload sessions"
```

Expected: one commit containing only this task’s verified paths. Preserve other tasks’ red tests and unrelated changes.

### Task 2: Payload controls, reveal and parsing integration

**Owns:** FR-1 strip UI; FR-2 search UI/reveal focus; FR-4 timer/notice integration; FR-6 new-control styling and host fit
**Satisfies:** AC-1.8, AC-2.1, AC-2.2, AC-2.3, AC-2.4, AC-2.5, AC-2.6, AC-2.7, AC-2.8, AC-4.1, AC-4.2, AC-4.3, AC-4.4, AC-4.5, AC-4.6, AC-4.7, AC-4.8, AC-4.9, AC-4.10, AC-5.1, AC-5.2, AC-5.3, AC-5.4, AC-5.5
**Files:**

- Create: `packages/builder-ui/src/workbench/JsonPayloadWorkspace.tsx` — stable mounted payload editors
- Create: `packages/builder-ui/src/workbench/PayloadStrip.tsx` — tabs and capacity controls
- Create: `packages/builder-ui/src/workbench/PayloadSearch.tsx` — combobox and reveal
- Create: `packages/builder-ui/src/theme/jsonPayloads.css` — new controls and necessary flex sizing
- Create: `packages/builder-ui/test/payloadStrip.test.tsx` — tab keyboard and close focus
- Create: `packages/builder-ui/test/payloadSearch.test.tsx` — search keyboard and result cap
- Modify: `packages/builder-ui/src/app/ExpressionBuilderShell.tsx` — session and notice integration
- Modify: `packages/builder-ui/src/workbench/JsonReferenceWorkspace.tsx` — timer text capture and reveal forwarding
- Modify: `packages/builder-ui/src/workbench/PayloadTree.tsx` — tree reveal focus
- Modify: `packages/builder-ui/test/builderSwitching.test.tsx` — visible-editor lookup, switching and notice regressions
- Modify: `packages/builder-ui/test/payloadTree.test.tsx` — reveal focus regression
- Modify: `tests/e2e/json-multi-payload.spec.ts` — native editing contract passes
- Signal: `packages/builder-ui/test/builderSwitching.test.tsx` — pending validation cancellation on tab change

**Interfaces:** Consumes Phase 1 contracts and existing `JsonReferenceWorkspace`. Produces accessible tabs/search and one stable mounted editor per payload.

Ownership: JSON integration and new controls. Existing pane internals retain their responsibilities.

- [ ] **Step 1: Establish the observable pre-change signal**

Add this to `builderSwitching.test.tsx`, reusing its current adapter/navigation/timer helpers. Scope `editSample` and `pasteSample` to the visible textbox.

```ts
it('cancels pending validation on switching and restarts on return', async () => {
  vi.useFakeTimers();
  const user = userEvent.setup({
    advanceTimers: vi.advanceTimersByTime,
  });
  const adapter = createAdapter();
  render(<ExpressionBuilderShell adapter={adapter} />);

  await goTo(user, 'JSON reference');
  editSample('{"a":1}');
  await advanceParse(300);

  await user.click(screen.getByRole('button', {
    name: 'New payload',
    exact: true,
  }));
  await advanceParse(600);
  expect(screen.queryByRole('tree')).not.toBeInTheDocument();

  await user.click(screen.getByRole('tab', {
    name: /^Payload 1, payload 1$/,
  }));
  await advanceParse(599);
  expect(screen.queryByRole('tree')).not.toBeInTheDocument();

  await advanceParse(1);
  expect(screen.getByRole('tree')).toBeInTheDocument();
  expect(adapter.notify).toHaveBeenCalledWith(
    'Parsed · 2 values',
    'success',
  );
});
```

- [ ] **Step 2: Capture the current signal**

```bash
npm run test -- packages/builder-ui/test/builderSwitching.test.tsx -t "cancels pending validation on switching and restarts on return"
```

Expected: exit 1 because `New payload` is absent. The fake timer test must finish rather than hang.

Add focused tests for roving tab focus, focused close replacement, arrow wrapping in search, Escape, stale results, revealing item 24, and notice deduplication across StrictMode/workspace recreation/adapter replacement in the owned `builderSwitching.test.tsx`. The existing baseline tests already cover each presentation case; extend them to two payloads rather than replacing them.

- [ ] **Step 3: Implement the minimum fix**

### Complete new focused control tests

Create `packages/builder-ui/test/payloadStrip.test.tsx` with:

```tsx
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useReducer } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { PayloadStrip } from '../src/workbench/PayloadStrip';
import { createJsonPayloadSession, jsonPayloadSessionReducer } from '../src/workbench/jsonPayloadSession';

afterEach(cleanup);

function Harness() {
  const [session, dispatch] = useReducer(jsonPayloadSessionReducer, undefined, createJsonPayloadSession);
  return <PayloadStrip baseId="test" session={session} dispatch={dispatch} searchControl={null} />;
}

it('roves tabs, wraps arrows and focuses the surviving tab on close', () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'New payload' }));
  const second = screen.getByRole('tab', { name: 'Payload 2, payload 2' });
  expect(second).toBeFocused();
  fireEvent.keyDown(second, { key: 'ArrowRight' });
  const first = screen.getByRole('tab', { name: 'Payload 1, payload 1' });
  expect(first).toBeFocused();
  fireEvent.keyDown(first, { key: 'End' });
  expect(second).toBeFocused();
  fireEvent.click(screen.getByRole('button', { name: 'Close Payload 2, payload 2' }));
  expect(first).toBeFocused();
  expect(screen.queryByRole('button', { name: /^Close / })).toBeNull();
});

it('disables adding at five and exposes only one tab stop', () => {
  render(<Harness />);
  for (let i = 0; i < 4; i += 1) fireEvent.click(screen.getByRole('button', { name: 'New payload' }));
  expect(screen.getByRole('button', { name: 'New payload' })).toBeDisabled();
  expect(screen.getAllByRole('tab').filter((tab) => tab.tabIndex === 0)).toHaveLength(1);
});
```

Create `packages/builder-ui/test/payloadSearch.test.tsx` with:

```tsx
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PayloadSearch } from '../src/workbench/PayloadSearch';
import { createJsonPayloadSession, jsonPayloadSessionReducer } from '../src/workbench/jsonPayloadSession';

afterEach(cleanup);

function fixture() {
  const initial = createJsonPayloadSession();
  return jsonPayloadSessionReducer(initial, {
    type: 'edit', payloadId: initial.activeId,
    action: { type: 'pasteAndParse', defaultActionName: 'Action', text: JSON.stringify(Object.fromEntries(Array.from({ length: 10 }, (_, i) => ['Email' + i, i]))) },
  });
}

it('caps options, wraps keyboard selection and clears after reveal', () => {
  const dispatch = vi.fn();
  render(<PayloadSearch payloads={fixture().payloads} dispatch={dispatch} />);
  const input = screen.getByRole('combobox', { name: 'Search all payloads' });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: 'email' } });
  expect(screen.getAllByRole('option')).toHaveLength(8);
  expect(screen.getByRole('status')).toHaveTextContent('10 matches');
  fireEvent.keyDown(input, { key: 'ArrowUp' });
  expect(screen.getAllByRole('option')[7]).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(dispatch.mock.calls[0][0].match.path).toEqual(['Email7']);
  expect(input).toHaveValue('');
  expect(screen.queryByRole('listbox')).toBeNull();
});

it('Escape clears without dispatching and removed sources disappear', () => {
  const dispatch = vi.fn();
  const view = render(<PayloadSearch payloads={fixture().payloads} dispatch={dispatch} />);
  const input = screen.getByRole('combobox');
  input.focus();
  fireEvent.change(input, { target: { value: 'email' } });
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(input).toHaveValue('');
  expect(input).toBeFocused();
  expect(dispatch).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: 'email' } });
  view.rerender(<PayloadSearch payloads={[]} dispatch={dispatch} />);
  expect(screen.queryByRole('option')).toBeNull();
  expect(screen.getByText('No matches in parsed payloads.')).toBeVisible();
});
```

### Keep editor identity and dispatch stable

```tsx
import { useCallback, useId, type Dispatch } from 'react';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import type { JsonReferenceAction } from './jsonReferenceState';
import type { PayloadTab, PayloadReveal, JsonPayloadSession, JsonPayloadAction } from './jsonPayloadSession';
import { JsonReferenceWorkspace } from './JsonReferenceWorkspace';
import { PayloadStrip } from './PayloadStrip';
import { PayloadSearch } from './PayloadSearch';

function JsonPayloadPane({
  payload,
  active,
  adapter,
  dispatch,
  reveal,
}: {
  payload: PayloadTab;
  active: boolean;
  adapter: PlatformAdapter;
  dispatch: Dispatch<JsonPayloadAction>;
  reveal: PayloadReveal | null;
}) {
  const payloadId = payload.id;
  const edit = useCallback((action: JsonReferenceAction) => {
    dispatch({ type: 'edit', payloadId, action });
  }, [dispatch, payloadId]);

  return (
    <JsonReferenceWorkspace
      adapter={adapter}
      active={active}
      state={payload.state}
      dispatch={edit}
      reveal={reveal}
    />
  );
}

export function JsonPayloadWorkspace({
  session,
  dispatch,
  adapter,
  active,
}: {
  session: JsonPayloadSession;
  dispatch: Dispatch<JsonPayloadAction>;
  adapter: PlatformAdapter;
  active: boolean;
}) {
  const baseId = useId();

  return (
    <div className="eb-json-session">
      <PayloadStrip
        baseId={baseId}
        session={session}
        dispatch={dispatch}
        searchControl={
          <PayloadSearch payloads={session.payloads} dispatch={dispatch} />
        }
      />
      {session.payloads.map((payload) => (
        <section
          key={payload.id}
          id={`${baseId}-panel-${payload.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${payload.id}`}
          hidden={payload.id !== session.activeId}
          className="eb-json-payload-page"
        >
          <JsonPayloadPane
            payload={payload}
            adapter={adapter}
            active={active && payload.id === session.activeId}
            dispatch={dispatch}
            reveal={session.reveal?.payloadId === payload.id
              ? session.reveal
              : null}
          />
        </section>
      ))}
    </div>
  );
}
```

This retains each textarea’s native editing history and avoids restarting its timer solely because an inline dispatch function changed.

### Implement tab behavior

```tsx
import { useLayoutEffect, useRef, type Dispatch, type KeyboardEvent, type ReactNode } from 'react';
import { payloadLabel, type JsonPayloadSession, type JsonPayloadAction } from './jsonPayloadSession';
import { parseStatus, rootExpression } from './jsonReferenceState';

export function PayloadStrip({
  baseId,
  session,
  dispatch,
  searchControl,
}: {
  baseId: string;
  session: JsonPayloadSession;
  dispatch: Dispatch<JsonPayloadAction>;
  searchControl: ReactNode;
}) {
  const tabs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef(false);

  useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    const tab = tabs.current.get(session.activeId);
    tab?.focus();
    tab?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [session.activeId, session.payloads]);

  function navigate(event: KeyboardEvent, index: number): void {
    const count = session.payloads.length;
    const next = event.key === 'Home' ? 0
      : event.key === 'End' ? count - 1
      : event.key === 'ArrowRight' ? (index + 1) % count
      : event.key === 'ArrowLeft' ? (index + count - 1) % count
      : null;
    if (next === null) return;
    event.preventDefault();
    pendingFocus.current = true;
    dispatch({
      type: 'activate',
      payloadId: session.payloads[next].id,
    });
    if (session.payloads[next].id === session.activeId) {
      tabs.current.get(session.activeId)?.focus();
      pendingFocus.current = false;
    }
  }

  return (
    <div className="eb-payload-strip">
      <div role="tablist" aria-label="Payloads" className="eb-payload-tabs">
        {session.payloads.map((payload, index) => {
          const label = payloadLabel(session.payloads, index);
          const pending = payload.state.error === null &&
            payload.state.text !== payload.state.lastAttemptedText &&
            (payload.state.text.trim() !== '' ||
             payload.state.lastSuccessfulPayload !== null);
          const status = parseStatus(payload.state);
          const tone = pending ? 'warn' : status.tone;
          const statusText = pending ? 'Pending validation' : status.text;

          return (
            <div key={payload.id} role="presentation" className="eb-payload-tab">
              <button
                ref={(element) => {
                  if (element) tabs.current.set(payload.id, element);
                  else tabs.current.delete(payload.id);
                }}
                id={`${baseId}-tab-${payload.id}`}
                type="button"
                role="tab"
                aria-label={`${label}, payload ${index + 1}`}
                aria-selected={payload.id === session.activeId}
                aria-controls={`${baseId}-panel-${payload.id}`}
                aria-describedby={`${baseId}-status-${payload.id}`}
                tabIndex={payload.id === session.activeId ? 0 : -1}
                onClick={() => dispatch({
                  type: 'activate',
                  payloadId: payload.id,
                })}
                onKeyDown={(event) => navigate(event, index)}
              >
                <span aria-hidden="true" className={`eb-payload-dot is-${tone}`}>
                  {tone === 'danger' ? '!' : tone === 'warn' ? '…'
                    : tone === 'good' ? '✓' : '◯'}
                </span>
                <span className="eb-payload-labels">
                  <strong>{label}</strong>
                  <code title={rootExpression(payload.state)}>
                    {rootExpression(payload.state)}
                  </code>
                </span>
              </button>
              <span id={`${baseId}-status-${payload.id}`}
                className="eb-visually-hidden">
                {rootExpression(payload.state)}. {statusText}
              </span>
              {session.payloads.length > 1 ? (
                <button
                  type="button"
                  className="eb-payload-close"
                  aria-label={`Close ${label}, payload ${index + 1}`}
                  onClick={() => {
                    pendingFocus.current = true;
                    dispatch({ type: 'close', payloadId: payload.id });
                  }}
                >×</button>
              ) : null}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        disabled={session.payloads.length === 5}
        onClick={() => {
          pendingFocus.current = true;
          dispatch({ type: 'add' });
        }}
      >New payload</button>
      <span>{session.payloads.length} / 5</span>
      {searchControl}
    </div>
  );
}
```

### Implement search behavior

```tsx
import { useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type KeyboardEvent } from 'react';
import { pathKey } from '../importExport/jsonPayload';
import type { PayloadTab, PayloadSearchMatch, JsonPayloadAction } from './jsonPayloadSession';
import { searchPayloads } from './payloadSearchModel';

export function PayloadSearch({
  payloads,
  dispatch,
}: {
  payloads: readonly PayloadTab[];
  dispatch: Dispatch<JsonPayloadAction>;
}) {
  const baseId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [index, setIndex] = useState(0);
  const [placement, setPlacement] = useState<CSSProperties>({});
  const result = useMemo(() => searchPayloads(payloads, query), [payloads, query]);
  const open = focused && query.trim() !== '';
  const activeIndex = result.matches.length === 0
    ? -1
    : Math.min(index, result.matches.length - 1);

  useLayoutEffect(() => {
    if (!open) return;
    function position(): void {
      const bounds = input.current?.getBoundingClientRect();
      if (!bounds) return;
      const width = Math.min(420, innerWidth - 24);
      const below = innerHeight - bounds.bottom - 18;
      const above = bounds.top - 18;
      const upward = below < 160 && above > below;
      setPlacement({
        width,
        left: Math.max(12, Math.min(bounds.left, innerWidth - width - 12)),
        maxHeight: Math.max(0, upward ? above : below),
        top: upward ? undefined : bounds.bottom + 6,
        bottom: upward ? innerHeight - bounds.top + 6 : undefined,
      });
    }
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [open]);

  function choose(match: PayloadSearchMatch): void {
    dispatch({ type: 'reveal', match });
    setQuery('');
    setIndex(0);
  }

  function keyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      setQuery('');
      setIndex(0);
      return;
    }
    if (!open || result.matches.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setIndex((activeIndex + step + result.matches.length) %
        result.matches.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(result.matches[activeIndex]);
    }
  }

  return (
    <div className="eb-payload-search">
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-label="Search all payloads"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? `${baseId}-list` : undefined}
        aria-activedescendant={open && activeIndex >= 0
          ? `${baseId}-option-${activeIndex}` : undefined}
        value={query}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          setQuery(event.currentTarget.value);
          setIndex(0);
        }}
        onKeyDown={keyDown}
      />
      {open ? (
        <div className="eb-payload-search-popup" style={placement}>
          <p role="status">
            {result.total} matches · {result.parsedSourceCount} parsed payloads
          </p>
          <div role="listbox" id={`${baseId}-list`} aria-label="Payload matches">
            {result.matches.map((match, optionIndex) => (
              <div
                key={`${match.payloadId}:${pathKey(match.path)}`}
                id={`${baseId}-option-${optionIndex}`}
                role="option"
                aria-selected={optionIndex === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(match)}
              >
                <strong>{match.payloadLabel}</strong>
                <code>{match.pathLabel}</code>
                <span>{match.preview}</span>
              </div>
            ))}
          </div>
          {result.total === 0
            ? <p>No matches in parsed payloads.</p>
            : null}
        </div>
      ) : null}
    </div>
  );
}
```

### Exact existing-file integration anchors

In `builderSwitching.test.tsx`, replace both helper calls to `screen.getByLabelText('Sample JSON')` with `screen.getByRole('textbox', { name: 'Sample JSON', exact: true })`. Keep single-payload tests and the existing StrictMode/remount/adapter-replacement checks. Their mock of `JsonReferenceWorkspace` remains valid because `JsonPayloadPane` imports that module.

In `ExpressionBuilderShell.tsx`, replace the `JsonReferenceWorkspace` import with `JsonPayloadWorkspace`, and replace the single-reducer imports with:

```ts
import { currentReferenceRoot } from '../workbench/jsonReferenceState';
import { createJsonPayloadSession, jsonPayloadSessionReducer } from '../workbench/jsonPayloadSession';
import '../theme/jsonPayloads.css';
```

Place the CSS import after `functions.css`. Replace the reducer/notice block anchored at `const [jsonState, jsonDispatch]` through its existing effect with the session/notice block below. Immediately after it add the transitional active source for the unchanged Functions API:

```ts
const jsonState = jsonSession.payloads.find((payload) => payload.id === jsonSession.activeId)!.state;
```

Retain the existing `sample`/`referenceRoot` Functions props in Task 2. Task 3 owns removing this transitional variable and `currentReferenceRoot` import.

Replace only the child of the hidden JSON screen panel with:

```tsx
<JsonPayloadWorkspace
  adapter={adapter}
  active={screen === 'jsonReference'}
  session={jsonSession}
  dispatch={jsonDispatch}
/>
```

In `JsonReferenceWorkspace.tsx`, import `PayloadReveal` from `jsonPayloadSession`, add `reveal?: PayloadReveal | null` to both `JsonReferenceWorkspaceProps` and `PayloadPanelProps`, destructure `reveal` in both functions, pass `reveal={reveal}` at both `PayloadPanel` and `PayloadTree` call sites. In `PayloadTree.tsx`, import `useLayoutEffect` from React and the same `PayloadReveal` type, add `reveal?: PayloadReveal | null` to `PayloadTreeProps`, and destructure it. Place the new reveal effect after the existing `rowElements` declaration; it uses the existing `rows`, `setFocusedKey` and `rowElements` symbols.

### Integrate timers, notices and tree focus

In `JsonReferenceWorkspace`, keep the existing timer conditions and cleanup. Its callback becomes:

```ts
() => dispatch({
  type: 'autoParse',
  expectedText: state.text,
})
```

Forward an optional `PayloadReveal | null` through `PayloadPanel` to `PayloadTree`. In the tree, add one consumed-sequence ref and a layout effect; retain its existing keyboard handlers and row registry:

```ts
const handledReveal = useRef(0);

useLayoutEffect(() => {
  if (!reveal || handledReveal.current === reveal.sequence) return;
  const key = pathKey(reveal.path);
  const row = rowElements.current.get(key);
  if (!row) return;
  handledReveal.current = reveal.sequence;
  setFocusedKey(key);
  row.focus();
  row.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
}, [reveal, rows]);
```

In `ExpressionBuilderShell`, replace its single JSON reducer with:

```ts
const [jsonSession, jsonDispatch] = useReducer(
  jsonPayloadSessionReducer,
  undefined,
  createJsonPayloadSession,
);

const deliveredNotices = useRef(new Map<string, number>());

useEffect(() => {
  for (const payload of jsonSession.payloads) {
    const notice = payload.state.parseNotice;
    const delivered = deliveredNotices.current.get(payload.id) ?? 0;
    if (!notice || notice.id <= delivered) continue;
    deliveredNotices.current.set(payload.id, notice.id);
    void adapter.notify(notice.message, 'success');
  }
}, [adapter, jsonSession.payloads]);
```

Mount `JsonPayloadWorkspace` in the existing hidden JSON screen panel. Keep Functions mounted without a payload-dependent React key.

### Add only the new control styling and required sizing

Create `jsonPayloads.css` and import it after existing theme CSS:

```css
.eb-json-session {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  gap: 8px;
}
.eb-json-payload-page {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
}
.eb-json-payload-page[hidden] { display: none; }

.eb-payload-strip {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto 280px;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 26px;
  background: var(--header-glass);
  flex: 0 0 auto;
  min-width: 0;
}
.eb-payload-tabs {
  display: flex;
  gap: 4px;
  min-width: 0;
  overflow-x: auto;
}
.eb-payload-tab {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  max-width: 220px;
}
.eb-payload-tab > [role="tab"] {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  max-width: 220px;
  padding: 0 34px 0 12px;
  border: 1px solid transparent;
  border-radius: 21px;
  background: transparent;
  color: var(--text);
}
.eb-payload-tab > [aria-selected="true"] {
  background: var(--seg-selected);
  border-color: var(--accent);
}
.eb-payload-labels {
  display: flex;
  flex-direction: column;
  min-width: 0;
  text-align: left;
}
.eb-payload-labels strong { font-size: 13px; }
.eb-payload-labels code {
  font: 10.5px var(--eb-mono);
  color: var(--text2);
}
.eb-payload-labels strong,
.eb-payload-labels code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.eb-payload-close {
  position: absolute;
  right: 4px;
  top: 9px;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--text2);
}
.eb-payload-dot { flex: 0 0 7px; font-size: 10px; }
.eb-payload-dot.is-good { color: var(--good); }
.eb-payload-dot.is-warn { color: var(--warn); }
.eb-payload-dot.is-danger { color: var(--danger); }

.eb-payload-strip > button {
  min-height: 34px;
  border: 1px solid var(--border);
  border-radius: 17px;
  background: var(--surface2);
  color: var(--text);
}
.eb-payload-strip > button:disabled { opacity: 0.5; }
.eb-payload-search { min-width: 0; }
.eb-payload-search input {
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text);
}
.eb-payload-search-popup {
  position: fixed;
  z-index: 1000;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}
.eb-payload-search-popup p { margin: 10px; }
.eb-payload-search-popup [role="option"] {
  display: grid;
  min-height: 44px;
  gap: 4px;
  padding: 8px 10px;
  overflow-wrap: anywhere;
  cursor: pointer;
}
.eb-payload-search-popup [aria-selected="true"] {
  background: var(--accent-soft);
}
.eb-payload-strip button:focus-visible,
.eb-payload-search input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (min-width: 601px) {
  .eb-json-session .eb-json-workspace { overflow-y: hidden; }
  .eb-json-session .eb-json-source,
  .eb-json-session .eb-json-payload { min-height: 0; }
  .eb-json-session .eb-json-reference { max-height: 100%; }
}
@media (max-width: 900px) {
  .eb-payload-strip {
    grid-template-columns: minmax(0, 1fr) auto auto;
  }
  .eb-payload-search { grid-column: 1 / -1; }
}
@media (prefers-reduced-motion: reduce) {
  .eb-payload-strip *,
  .eb-payload-search-popup * { transition: none; }
}
```

Verified palette owner: `workbenchTokens.ts` defines `--surface`, `--surface2`, `--text`, `--text2`, `--border`, `--accent`, `--accent-soft`, `--good`, `--warn`, `--danger`, `--header-glass`, `--seg-selected`, and `--shadow-sm` in both palettes; `tokens.css` defines `--eb-mono`. existing palette roles remain the source of colors. The new flex sizing accounts for the actual strip height rather than adding another fixed viewport subtraction. Existing pane widths and stacking rules remain intact. At widths <=600px preserve the existing workspace-owned vertical scroll and Source/Payload/Reference order. At widths >600px verify Source body, tree and Reference body scroll independently after removing the old pane min-height floors; the strip height is absorbed by flex layout, not another fixed 80px allowance.

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

```bash
npm run test -- packages/builder-ui/test/builderSwitching.test.tsx -t "cancels pending validation on switching and restarts on return"
```

Expected: exit 0; the same previously failing contract passes.

Run:

```powershell
npm run test -- packages/builder-ui/test/payloadStrip.test.tsx packages/builder-ui/test/payloadSearch.test.tsx packages/builder-ui/test/jsonReferenceWorkspace.test.tsx packages/builder-ui/test/payloadTree.test.tsx packages/builder-ui/test/builderSwitching.test.tsx
npm run typecheck
npm run test:e2e -- tests/e2e/json-multi-payload.spec.ts tests/e2e/json-pane-scroll.spec.ts
```

Expected: exit 0, with native paste/undo evidence from the browser test. Resolve failures before committing.

- [ ] **Step 5: Commit the coherent change**

```bash
git add packages/builder-ui/src/workbench/JsonPayloadWorkspace.tsx packages/builder-ui/src/workbench/PayloadStrip.tsx packages/builder-ui/src/workbench/PayloadSearch.tsx packages/builder-ui/src/theme/jsonPayloads.css packages/builder-ui/test/payloadStrip.test.tsx packages/builder-ui/test/payloadSearch.test.tsx packages/builder-ui/src/app/ExpressionBuilderShell.tsx packages/builder-ui/src/workbench/JsonReferenceWorkspace.tsx packages/builder-ui/src/workbench/PayloadTree.tsx packages/builder-ui/test/builderSwitching.test.tsx packages/builder-ui/test/payloadTree.test.tsx tests/e2e/json-multi-payload.spec.ts
git commit -m "feat: add payload tabs and cross-payload search"
```

Expected: one commit containing only this task’s verified paths. Preserve other tasks’ red tests and unrelated changes.

### Task 3: Functions references from every parsed source

**Owns:** FR-3 source groups and shared Functions budget; consumes FR-5 reference formatter
**Satisfies:** AC-3.1, AC-3.2, AC-3.3, AC-3.4, AC-3.5, AC-3.6, AC-3.7, AC-3.8, AC-3.9
**Files:**

- Modify: `packages/builder-ui/src/workbench/parsedValueModel.ts` — source groups and shared budget
- Modify: `packages/builder-ui/src/workbench/FunctionsWorkspace.tsx` — source array input
- Modify: `packages/builder-ui/src/workbench/FunctionsNav.tsx` — source grouping
- Modify: `packages/builder-ui/src/workbench/ParsedValueEntries.tsx` — source-specific reference descriptions
- Modify: `packages/builder-ui/src/app/ExpressionBuilderShell.tsx` — Functions source prop wiring
- Modify: `packages/builder-ui/test/parsedValueModel.test.ts` — array-source model fixtures
- Modify: `packages/builder-ui/test/functionsNav.test.tsx` — source list fixtures and grouping
- Modify: `packages/builder-ui/test/functionsWorkspace.test.tsx` — source props and insertion
- Modify: `packages/builder-ui/test/builderSwitching.test.tsx` — Functions persistence
- Signal: `packages/builder-ui/test/parsedValueModel.test.ts` — shared source budget and null root

**Interfaces:** Consumes `ParsedValueSource[]`, `collectPayloadLeaves`, `formatPayloadReference` and existing array-entry grouping. Produces one `ParsedValueList` with source groups and a shared row budget.

Ownership: source-list derivation and presentation. Keep argument targeting, wrapping, validation and clipboard behavior unchanged.

### Define the resulting list

```ts
export interface ParsedValueGroup {
  id: string;
  label: string;
  rootCaption: string;
  matchingCount: number;
  rows: ParsedValueRow[];
  entries: ParsedValueEntry[];
  emptyMessage: string | null;
}

export interface ParsedValueList {
  sources: ParsedValueGroup[];
  visibleCount: number;
  hiddenCount: number;
  emptyMessage: string | null;
}
```

- [ ] **Step 1: Establish the observable pre-change signal**

```ts
import type { ParsedValueSource } from '../src/workbench/jsonPayloadSession';
import { parsePayload } from '../src/importExport/jsonPayload';

function source(
  id: string,
  value: unknown,
  name = id,
): ParsedValueSource {
  const result = parsePayload(JSON.stringify(value));
  if (!result.ok) throw new Error(result.message);
  return {
    id,
    label: name,
    rootCaption: `body('${name}')`,
    parsed: result.payload,
    referenceRoot: { kind: 'body', actionName: name },
  };
}

it('filters before one shared cap and supports a null root', () => {
  const early = source('early',
    Array.from({ length: 150 }, () => ({ early: 1 })));
  const late = source('late',
    Array.from({ length: 100 }, () => ({ late: 2 })));

  const all = buildParsedValueList([early, late], '');
  expect(all.visibleCount).toBe(200);
  expect(all.hiddenCount).toBe(50);
  expect(all.sources.map((group) => group.matchingCount))
    .toEqual([150, 100]);

  const filtered = buildParsedValueList([early, late], 'late');
  expect(filtered.visibleCount).toBe(100);
  expect(filtered.sources[1].rows[0].expression)
    .toBe("body('late')[0]?['late']");

  const scalar = buildParsedValueList([source('null_source', null)], '');
  expect(scalar.sources[0].rows).toEqual([{
    label: '(root)',
    path: [],
    expression: "body('null_source')",
  }]);
});
```

- [ ] **Step 2: Capture the current signal**

```bash
npm run test -- packages/builder-ui/test/parsedValueModel.test.ts
```

Expected before implementation: exit 1, because the current three-argument builder cannot consume source arrays or return `.sources`/`.visibleCount`. Existing tests must still pass before this new test is added.

- [ ] **Step 3: Implement the minimum fix**

Update existing fixtures to explicit source arrays. In each of `parsedValueModel.test.ts`, `functionsNav.test.tsx` and `functionsWorkspace.test.tsx`, import `parsePayload`, `ParsedValueSource`, and `PayloadReferenceRoot`; construct each fixture's `parsed` through a checked `parsePayload(JSON.stringify(value))` result. Preserve each original root object, id `fixture-1`, a stable label, and the root caption from `formatPayloadRoot(root)`; use `referenceRoot: null` only for the missing-name case. Replace old `buildParsedValueList(sample, root, search)` calls with `buildParsedValueList([source], search)`. Replace absent-data cases with `buildParsedValueList([], search)`; a successful JSON null source remains a one-element array. Replace assertions on `.rows`/`.entries` with `.sources[0].rows`/`.sources[0].entries`, guarding absent-source cases explicitly. Replace Functions JSX `sample`/`referenceRoot` props with `sources`, including rerender cases. In `functionsNav.test.tsx`, migrate the hand-built old list object using `sources: [{ id: "fixture-1", label: "Fixture", rootCaption: "triggerBody()", matchingCount: rows.length, rows, entries, emptyMessage: null }]` with `visibleCount: rows.length`, preserving its existing row/entry data and hidden count. Preserve all existing argument-targeting, array, clipboard and validation assertions. An empty array means absent data; a source whose `parsed.value` is `null` means valid JSON null.

### Implement the shared budget

In `parsedValueModel.ts`, retain `ParsedValueRow`, `ParsedValueEntry`, `MAX_PARSED_VALUE_ROWS`, `parsedPathLabel` and `buildParsedValueEntries`. Replace only `ParsedValueList` with the two new interfaces above; remove `walk` and its `isJsonObject` import, remove the now-unused engine `PayloadReferenceRoot` type import, add:

```ts
import type { ParsedValueSource } from './jsonPayloadSession';
import { collectPayloadLeaves } from './payloadTreeModel';
```

Replace `buildParsedValueList` with:

```ts
export function buildParsedValueList(
  sources: readonly ParsedValueSource[],
  search: string,
): ParsedValueList {
  const needle = search.trim().toLowerCase();
  let remaining = MAX_PARSED_VALUE_ROWS;
  let matchingCount = 0;
  let visibleCount = 0;

  const groups = sources.map<ParsedValueGroup>((source) => {
    if (source.referenceRoot === null) {
      return {
        id: source.id,
        label: source.label,
        rootCaption: source.rootCaption,
        matchingCount: 0,
        rows: [],
        entries: [],
        emptyMessage: 'Set an action name in JSON reference',
      };
    }

    const root = source.referenceRoot;
    const matched = collectPayloadLeaves(source.parsed.value)
      .filter((leaf) => needle === '' ||
        leaf.label.toLowerCase().includes(needle));
    const rows = matched.slice(0, remaining).map((leaf) => ({
      label: leaf.label,
      path: leaf.path,
      expression: formatPayloadReference({ root, path: leaf.path }),
    }));

    remaining -= rows.length;
    matchingCount += matched.length;
    visibleCount += rows.length;
    return {
      id: source.id,
      label: source.label,
      rootCaption: source.rootCaption,
      matchingCount: matched.length,
      rows,
      entries: buildParsedValueEntries(rows),
      emptyMessage: matched.length === 0
        ? 'No paths match this search'
        : null,
    };
  });

  return {
    sources: groups,
    visibleCount,
    hiddenCount: matchingCount - visibleCount,
    emptyMessage: sources.length === 0
      ? 'Parse a sample in JSON reference'
      : null,
  };
}
```

### Render source groups without changing single-source presentation

Add a `descriptionPrefix?: string` prop to `ParsedValueEntries`, pass it through recursive array-item rendering, and use it in the existing description span:

```tsx
<span id={descriptionId} className="eb-visually-hidden">
  {descriptionPrefix ? `${descriptionPrefix}. ` : ''}
  {entry.row.expression}
</span>
```

Render the list through this complete helper in `FunctionsNav.tsx`:

```tsx
function ParsedValueSources({
  list,
  baseId,
  onInsertReference,
}: {
  list: ParsedValueList;
  baseId: string;
  onInsertReference: (expression: string) => void;
}) {
  return (
    <>
      {list.emptyMessage ? <div>{list.emptyMessage}</div> : null}
      {list.sources.map((source) => {
        const content = (
          <>
            <ParsedValueEntries
              entries={source.entries}
              baseId={`${baseId}-${source.id}`}
              descriptionPrefix={list.sources.length > 1
                ? `${source.label}, ${source.rootCaption}`
                : undefined}
              onInsertReference={onInsertReference}
            />
            {source.emptyMessage ? <div>{source.emptyMessage}</div> : null}
          </>
        );
        return list.sources.length === 1
          ? <div key={source.id}>{content}</div>
          : (
            <details key={source.id} className="eb-pv-item eb-pv-source">
              <summary>
                {source.label} · {source.rootCaption} · {source.matchingCount}
              </summary>
              {content}
            </details>
          );
      })}
      {list.hiddenCount > 0
        ? <div>+{list.hiddenCount} more — narrow with search</div>
        : null}
    </>
  );
}
```

Use `visibleCount` for the existing top-level Parsed Value count. Native `<details>` supplies initially collapsed, independently operable source groups; stable source keys and source-specific description IDs keep equal paths separate.

In `FunctionsNav.tsx`, replace both `parsedValue.rows.length` expressions with `parsedValue.visibleCount`. Replace the expanded Parsed Value content (the `ParsedValueEntries`/empty/hidden-count block) with:

```tsx
<ParsedValueSources list={parsedValue} baseId={baseId} onInsertReference={onInsertReference} />
```

In `ParsedValueEntries.tsx`, add `descriptionPrefix?: string` to the interface, destructure it, and pass `descriptionPrefix={descriptionPrefix}` to the recursive `ParsedValueEntries` call. Use the description span above; do not alter row insertion handlers.

In `FunctionsWorkspace.tsx`, remove the unused `PayloadReferenceRoot` import, import `ParsedValueSource` from `jsonPayloadSession`, and change its function signature to `FunctionsWorkspace({ adapter, sources }: FunctionsWorkspaceProps)`.

Change `FunctionsWorkspaceProps` to:

```ts
export interface FunctionsWorkspaceProps {
  adapter: PlatformAdapter;
  sources: readonly ParsedValueSource[];
}
```

Its existing memo becomes:

```ts
const parsedValue = useMemo(
  () => buildParsedValueList(sources, state.search),
  [sources, state.search],
);
```

In the shell, add `getParsedSources` to its `jsonPayloadSession` import, remove the transitional `jsonState` variable and the now-unused `currentReferenceRoot` import. Derive sources:

```ts
const parsedSources = useMemo(
  () => getParsedSources(jsonSession.payloads),
  [jsonSession.payloads],
);
```

Replace both old `sample`/`referenceRoot` props with `sources={parsedSources}` in the continuously mounted Functions workspace. Retain its existing argument reducer and insertion handlers.

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

```bash
npm run test -- packages/builder-ui/test/parsedValueModel.test.ts
```

Expected: exit 0; the same previously failing contract passes.

Run:

```powershell
npm run test -- packages/builder-ui/test/parsedValueModel.test.ts packages/builder-ui/test/functionsNav.test.tsx packages/builder-ui/test/functionsWorkspace.test.tsx packages/builder-ui/test/functionsState.test.ts packages/builder-ui/test/builderSwitching.test.tsx
npm run typecheck
```

Expected: exit 0. Verify equal-path source insertion, independent array accordions, missing-name exclusion from the budget, and unchanged inserted argument text after rename/root change/close.

- [ ] **Step 5: Commit the coherent change**

```bash
git add packages/builder-ui/src/workbench/parsedValueModel.ts packages/builder-ui/src/workbench/FunctionsWorkspace.tsx packages/builder-ui/src/workbench/FunctionsNav.tsx packages/builder-ui/src/workbench/ParsedValueEntries.tsx packages/builder-ui/src/app/ExpressionBuilderShell.tsx packages/builder-ui/test/parsedValueModel.test.ts packages/builder-ui/test/functionsNav.test.tsx packages/builder-ui/test/functionsWorkspace.test.tsx packages/builder-ui/test/builderSwitching.test.tsx
git commit -m "feat: group Functions references by payload source"
```

Expected: one commit containing only this task’s verified paths. Preserve other tasks’ red tests and unrelated changes.

### Task 4: Integration Verification

**Owns:** Acceptance evidence for FR-1–FR-6; implementation ownership remains with Tasks 1–3
**Satisfies:** All 44 acceptance criteria (evidence gate; no duplicate behavior ownership)
**Files:**

- Modify: `tests/e2e/json-multi-payload.spec.ts` — acceptance route and viewport evidence
- Modify: `tests/e2e/json-references.spec.ts` — current screen and header assertions
- Modify: `tests/e2e/json-pane-scroll.spec.ts` — active pane reachability across required sizes
- Signal: `tests/e2e/json-multi-payload.spec.ts` — native editing and rendered acceptance

**Interfaces:** Consumes the completed session, JSON workspace, Functions source list and unchanged platform adapter. Produces acceptance evidence.

- [ ] **Step 1: Establish the observable pre-change signal**

Use the native editing test created by Task 0 as the integration signal; do not add a second duplicate feature implementation. Preserve the baseline exceptions recorded below.

- [ ] **Step 2: Capture the current signal**

```bash
npm run test:e2e -- tests/e2e/json-multi-payload.spec.ts
```

Expected after Tasks 1–3: exit 0. A failure blocks acceptance and returns to the owning implementation task; Task 4 owns only the three browser paths listed above.

- [ ] **Step 3: Implement the minimum fix**

Extend the browser contract with the viewport and keyboard scenarios below. If a failure requires production changes, return it to Task 1, 2 or 3 with its exact path and check; do not expand Task 4 ownership.

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run checks sequentially:

   ```powershell
   npm run lint
   npm run typecheck
   npm run test
   npm run test:e2e
   npm run build
   git diff --check
   ```

   Expected: exit 0. Record any current baseline exceptions explicitly; do not assume historical exceptions still apply.

2. Capture rendered evidence in both palettes at:

   | Width | Height |
   |---:|---:|
   | 375 | 667 |
   | 768 | 1024 |
   | 900 | 700 |
   | 1280 | 420 |
   | 1280 | 860 |
   | 1440 | 900 |

   Update `json-references.spec.ts` to use the six exact viewport sizes (replace 1280×800 with 1280×860 in its matrix), both palettes and screen-menu navigation across Trigger / Filter, Functions and JSON reference. Use `.eb-pill-header` as its measured header. Scope active JSON pane queries through the visible tabpanel. Exercise all three screens. Verify no page-level horizontal overflow; reachable final Source, Payload and Reference content; local tab scrolling (`.eb-payload-tabs.scrollWidth > clientWidth` when five long names overflow, followed by focused-tab bounds inside the strip); clamped search results (popup left/top >= 0 and right/bottom <= viewport); visible keyboard focus; and unchanged pane arrangement.

3. Complete the keyboard route: tabs with Left/Right/Home/End, close/add controls, root choices, tree navigation and Show more, search Up/Down/Enter/Escape, source-group summaries and reference insertion.

4. Verify native editing with real clipboard paste, partial selection, repeated identical paste, Undo/Redo and independent editors. Extend the existing browser test to assert immediately after Undo that the textarea is restored while the newly parsed tree/action name has not reverted; after 600ms, assert the ordinary automatic validation result. Do not use synthetic paste or reducer state as evidence for native history.

5. Verify the preservation scenarios: semantic equality, full-value changes beyond previews, invalid automatic edits retaining output, invalid paste clearing output, cancellation on tab/screen change/close, per-payload notices and no notice replay.

6. Build and load the resulting PPTB artifact in actual Toolbox. Verify clipboard text and actual notification delivery in both host palettes. Mock-adapter assertions do not complete this gate.

7. Confirm condition documents/exports and Functions arguments survive navigation unchanged. Reload must restore one empty JSON payload.

- [ ] **Step 5: Commit the coherent change**

```bash
git add tests/e2e/json-multi-payload.spec.ts tests/e2e/json-references.spec.ts tests/e2e/json-pane-scroll.spec.ts
git commit -m "test: verify multi-payload workspace acceptance"
```

Expected: only verified browser acceptance tests are committed. If these files have no new changes, record Step 5 as a verified no-op; do not create an empty commit. Pending actual Toolbox evidence keeps acceptance pending even if automated checks pass.

If actual Toolbox evidence is unavailable, report that acceptance gate as pending and retain the evidence already obtained.

## Quickstart Validation

1. Open JSON reference; confirm one empty Action / Full output payload.
2. Paste a sample named `Get customer`; add a second named `Get manager`.
3. Search a shared Email path and a value suffix beyond its preview.
4. Reveal a result in array item 24; confirm selection, focus, scrolling and its exact reference.
5. Open Functions, expand each source group and insert both Email references.
6. Rename or close a source; confirm existing arguments remain unchanged.
7. Return to JSON, exercise paste Undo/Redo, then reload and confirm the empty session.

## Planning review record

Reviewed against Spec 002 v1.0.1 and current source on `functions-prep-for-release`. Two independent read-only reviews used `gpt-6-luna` with `xhigh`: session/Functions models and JSON/browser integration. The coordinator applied their import, caller, preview-assertion, native clipboard, selector, viewport and encoding findings. Optional captured-text compatibility and zero insertable counts for unnamed sources follow the approved source-note contracts. Existing `showAll` paging semantics remain the owner of revealed children; introducing a new paging state is outside this revision.

Five tasks each contain the template’s five unchecked steps. No implementation or acceptance step is marked complete by this planning review. Only this plan changed; application code, manifests, browser configuration and historical spec/source notes remain untouched.

Remaining prerequisites: install the configured Edge browser during privileged cloud setup, re-run the browser baseline and repair only the obsolete owned harness assertions, then obtain actual Toolbox evidence at Task 4. The install-script update is requested by the user but cannot be saved through the read-only environment status tool; its existing script/path is needed to preserve the rest of setup. Do not claim rendered, native-history or Toolbox acceptance from the passing unit/build baseline.
