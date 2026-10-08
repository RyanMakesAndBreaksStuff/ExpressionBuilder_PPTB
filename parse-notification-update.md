# Parse Notification Update Implementation Plan

**Goal:** Keep the 600ms auto-parse delay and announce successful automatic parses only when the underlying payload materially changes, without replaying notifications after a workspace remount.

**Architecture:** The JSON reducer owns successful-payload comparison, validation outcomes and a numbered notification event. ExpressionBuilderShell consumes that event once, beside the reducer it already owns. JsonReferenceWorkspace owns scheduling and inline feedback; the platform adapter continues forwarding notifications.

**Tech stack:** Existing React 19, TypeScript, Vitest, Testing Library, native JSON.parse and PlatformAdapter. No new dependencies.

**Scope:** Material-change detection, successful-conversion gating, retention of the last good output during invalid automatic edits, shell-owned notification dedupe, unchanged immediate paste parsing, and repair of the stale workspace test harness.

**Out of scope:** A longer debounce, a new Parse button, a fixed business-payload schema, adapter-wide toast suppression, persistence, undo/paste behavior, and unrelated UI or dependency changes.

**Status:** Task 1 committed (`c94aacc`). Task 2 committed (`0f56bbc`) before manual host verification, at the user's request; host verification remains. All commands run from C:\Users\RyanDev\source\repos\ExpressionBuilder.

---

## Baseline (October 7, 2026)

- JsonReferenceWorkspace compared raw parsed text in a workspace-local ref and notified on every text change; its timer dispatched `parse` after 600ms.
- ExpressionBuilderShell owns `jsonState`; the JSON panel stays mounted under `hidden`, so screen switching is not a remount.
- `parseSample` cleared displayed output on every failed parse.
- `parsePayload` checks empty input, UTF-8 size (1 MiB), syntax, value count (10,000) and depth (64), in that order, and accepts any JSON root.
- Since `c09baae`, paste is detected in the textarea's `onInput` via `inputType === "insertFromPaste"` (dispatching `pasteAndParse`); `onPaste` only selects existing text. Tests therefore simulate paste with `fireEvent.input(..., { inputType: 'insertFromPaste' })`, not `fireEvent.paste`.

Existing `package-lock.json` changes and untracked `undo-paste.md` belong to other work and must remain untouched.

---

### Task 1: Restore the existing workspace regression suite ✅

**Owns:** `packages/builder-ui/test/jsonReferenceWorkspace.test.tsx` — a reducer-backed `WorkspaceHarness` supplies the component's required `state`/`dispatch` props.

- [x] Pre-change signal: 15/15 tests failed at render with `TypeError: Cannot read properties of undefined (reading 'parsed')`.
- [x] Fix: `WorkspaceHarness` wraps `JsonReferenceWorkspace` with `useReducer(jsonReferenceReducer, initialJsonReferenceState)`; the 15 render calls use it.
- [x] Verified: 15/15 workspace tests and 67/67 combined tests passed; scoped ESLint and `git diff --check` exited 0.
- [x] Committed as `c94aacc` (`test: restore reducer-backed JSON workspace coverage`).

---

### Task 2: Notify once for each qualifying successful parse

**Owns:** notification contract, semantic comparison, parse-event metadata, timer integration and acceptance tests. Depends on Task 1.

**Files:**

- `packages/builder-ui/src/importExport/jsonPayload.ts` — `payloadValuesEqual`.
- `packages/builder-ui/src/workbench/jsonReferenceState.ts` — `autoParse` action, `lastSuccessfulPayload`, `lastAttemptedText`, `parseNotice`, status text.
- `packages/builder-ui/src/workbench/JsonReferenceWorkspace.tsx` — single auto-parse effect; inline status line; parse toast removed.
- `packages/builder-ui/src/app/ExpressionBuilderShell.tsx` — emits each `parseNotice` once via `lastNotifiedParseId` ref.
- Tests: `jsonPayload.test.ts`, `jsonReferenceState.test.ts`, `jsonReferenceWorkspace.test.tsx`, `builderSwitching.test.tsx`.

#### Behavior contract

| Condition | Displayed output | Success notification |
|---|---|---|
| First successful automatic parse | New payload | Parsed · N values |
| Automatic parse changes a key, value, type or array contents/order | New payload | Payload updated · N values |
| Automatic parse changes only formatting, number spelling or object-key order | Refresh parsed text, clear feedback; keep selection, expansion and paging | None |
| Invalid or over-limit automatic input | Last good payload stays usable; stale/error feedback shown | None |
| Invalid automatic input corrected back to the last successful data | Feedback clears, parsed text refreshes | None |
| Successful paste, including repeating identical data | Existing paste behavior | One Parsed · N values per paste |
| Invalid paste or explicit `parse` | Existing clear-the-tree behavior; semantic baseline retained | None |
| Workspace remount, adapter change or StrictMode replay | Existing state | No replay |

“Material” compares the entire payload (including collapsed, paged and preview-truncated values), ignores object-key order, and respects array order, types and values. Same-count changes qualify. `parsePayload` runs once per attempt; no second parser, heuristic or `JSON.stringify` equality. `parse` stays an explicit reducer command with no UI. Failed attempts never advance `lastSuccessfulPayload`. Notice IDs are derived in the pure reducer; the shell ref marks an ID before calling the adapter. Dedupe is local invocation control, not a guarantee about host delivery.

- [x] **Step 1: Add pre-change coverage**

  - `jsonPayload.test.ts` — `material payload equality`: 14 table cases plus beyond-preview comparison.
  - `jsonReferenceState.test.ts` — `parse notification events`: first/update events, equivalent refresh without tree reset, retained output through invalid input and recovery, baseline kept across invalid paste, repeated paste, reducer determinism, and empty/too-many-values/too-deep rejections. Stale status assertion updated to `Sample changed. Waiting for valid JSON.`
  - `builderSwitching.test.tsx` — `vi.mock` wrapper keys `JsonReferenceWorkspace` on `workspaceMount.key` to force real remounts; `editSample`/`pasteSample`/`advanceParse` helpers; five shell tests: 600ms announce + quiet formatting, retained output during invalid input, paste once + cancels pending auto work, no replay across remount/adapter swap in StrictMode, inactive cancel + resume on return.

- [ ] **Step 2: Capture the pre-change signal** — not recorded. The reducer and comparator were already applied alongside the tests when execution resumed, so no pre-change failure output exists.

- [x] **Step 3: Implement**

  - A. `payloadValuesEqual` after `isJsonObject`, recursive over arrays and own object keys.
  - B. Reducer: `setText` is a no-op on identical text and otherwise clears `error`/`lastAttemptedText`; `autoParse` → `parseSample(state, "auto")`, `parse` → `"explicit"`, `pasteAndParse` → `"paste"`. Auto failures keep output and baseline; explicit/paste failures keep the existing clearing. Equal-data auto success refreshes `parsed` without tree reconciliation. `parseStatus` error text is `Could not parse. Showing last successful payload.` when output is retained.
  - C. Workspace: one effect clears the timer, skips when inactive, already attempted, or empty with no baseline, else dispatches `autoParse` after 600ms. `<p className="eb-json-help">{status.text}</p>` after the Payload header. Clipboard notifications unchanged.
  - D. Shell: `lastNotifiedParseId` ref + effect emits `notice.message` with `'success'`.
  - E. First workspace test now asserts `adapter.notify` is not called on parse; copy assertions unchanged.

- [ ] **Step 4: Verify**

  Automated (October 7, 2026):

  | Command | Result |
  |---|---|
  | `npm run build` | exit 0 |
  | `npx vitest run packages/builder-ui/test/jsonPayload.test.ts packages/builder-ui/test/jsonReferenceState.test.ts packages/builder-ui/test/jsonReferenceWorkspace.test.tsx packages/builder-ui/test/builderSwitching.test.tsx --no-file-parallelism` | 4 files, 88/88 passed |
  | `npx eslint` on the 8 owned files | exit 0 |
  | `git diff --check` | exit 0 |
  | `npx vitest run --no-file-parallelism` | 580 passed / 2 failed (65 files) |

  The two full-suite failures are unrelated to this diff; neither reads a changed file:
  - `test/workspaceBuildScripts.test.ts` › “adds no runtime dependency…” — runtime dependency list has 4 entries, expected 3 (package manifests).
  - `packages/builder-ui/test/dragDropStyles.test.ts` › “floors the workspace row…” — `grid-template-rows: minmax(...)` not found in shell CSS.

  Manual verification on web build and a real PPTB host — **not yet performed**:

  | Scenario | Required observation |
  |---|---|
  | Paste valid JSON | One host success toast; correct tree and count |
  | Reformat or reorder object keys, then wait | Current output/status, no additional toast |
  | Change a value while preserving the count, then wait | Updated value and one Payload updated toast |
  | Pause on incomplete JSON | Previous tree remains, visible stale/error feedback, no success toast |
  | Restore the original data | Feedback clears, no additional toast |
  | Change a nested value with its ancestors collapsed | One update toast; value correct when expanded |
  | Leave during the debounce and return | No hidden auto parse; dirty input resumes after 600ms |
  | Copy a retained value while input is invalid | Copy works; freshness remains visible |
  | Paste invalid JSON | Existing paste error/tree-clearing, no success toast |
  | Reload the whole tool | Empty in-memory state, no replay |

  If duplication persists, record app notify-call counts separately from visible host toasts; one invocation with two toasts is a host-side issue outside this plan. If the host is unavailable, record that automated tests prove app-boundary behavior only.

- [x] **Step 5: Commit** — committed as `0f56bbc`.

  ~~~powershell
  git add -- packages/builder-ui/src/importExport/jsonPayload.ts packages/builder-ui/src/workbench/jsonReferenceState.ts packages/builder-ui/src/workbench/JsonReferenceWorkspace.tsx packages/builder-ui/src/app/ExpressionBuilderShell.tsx packages/builder-ui/test/jsonPayload.test.ts packages/builder-ui/test/jsonReferenceState.test.ts packages/builder-ui/test/jsonReferenceWorkspace.test.tsx packages/builder-ui/test/builderSwitching.test.tsx
  git commit -m "fix: notify on valid material JSON payload changes"
  ~~~

  Do not stage `package-lock.json`, `undo-paste.md` or this plan.

---

## Checklist

- [x] Verify source paths, ownership, selectors and baseline commands.
- [x] Record the material-change and validation contract.
- [x] Execute Task 1 and confirm its signal changed.
- [x] Execute Task 2 and confirm its automated signals changed.
- [ ] Record manual host evidence.
- [x] Commit Task 2 (`0f56bbc`).
- [ ] Separately triage the two unrelated full-suite failures.
