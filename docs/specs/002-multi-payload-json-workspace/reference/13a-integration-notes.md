# 13a → codebase integration

Brings the 13a design (underline payload tabs, cross-payload search, Parsed Value grouped by payload) into `packages/builder-ui`. Files here mirror repo paths; copy them over the originals.

## Where the codebase differs from the 13a mock, and what was kept

The mock was built from an older source. The codebase wins wherever it has moved on; only the multi-payload layer is new.

- **Reference root**: codebase has the 4-option grid (Action/Trigger × Full/Body). Kept. The mock's Action/Trigger toggle + two cards is not adopted.
- **Parsing**: codebase parses on paste and 600 ms after typing; no Parse button. Kept. The auto-parse timer is now bound to the payload that was edited, so switching tabs mid-timer can't parse the wrong one.
- **Trigger name field**: the mock had one (tab label only). The codebase hides the name field for triggers, so trigger tabs are labelled `Trigger`, `Trigger 2`, …
- **Reference panel**: codebase's `ReferencePanel` (copy format, loop `item()`/`items()`, fixed-position note) is unchanged.
- **Header**: untouched (`ShellHeader` already carries the privacy line).

## Files

New
- `src/workbench/payloadSessionState.ts`: session reducer wrapping one `JsonReferenceState` per tab. Max 5; last tab can't close; `searchPayloads`, `payloadTabs`, `parsedValueSources`.
- `src/workbench/PayloadTabs.tsx`: 13a tab strip (dot + name + root caption, close, `+ New payload`, `n / 5`) and the search combobox (↑/↓, Enter reveals, Esc clears).
- `src/theme/payloadTabs.css`: append to `tokens.css` after `.eb-json-reference .eb-json-card-body` (~L2131). Uses existing variables only.
- `test/payloadSessionState.test.ts`

Replaced
- `src/workbench/JsonReferenceWorkspace.tsx`: renders tabs + a `tabpanel` around the existing panes. Takes `session`/`dispatch`; **falls back to its own reducer when they're omitted**, which also matches how `jsonReferenceWorkspace.test.tsx` already renders it (`<JsonReferenceWorkspace adapter active />`).
- `src/workbench/parsedValueModel.ts`: `buildParsedValueList` gains an optional `limit`; adds `buildParsedValueGroups` (200-row cap shared across payloads, in tab order).
- `src/workbench/FunctionsWorkspace.tsx`: optional `sources` prop. Fewer than 2 sources renders exactly as before; `sample`/`referenceRoot` still work.
- `src/workbench/FunctionsNav.tsx`: optional `parsedValueGroups`; one sub-group per payload with name, root and count.

## Shell edit (`src/app/ExpressionBuilderShell.tsx`)

```diff
-import { currentReferenceRoot, initialJsonReferenceState, jsonReferenceReducer } from '../workbench/jsonReferenceState';
+import { initialPayloadSessionState, parsedValueSources, payloadSessionReducer } from '../workbench/payloadSessionState';
 …
-  const [jsonState, jsonDispatch] = useReducer(jsonReferenceReducer, initialJsonReferenceState);
+  const [jsonSession, jsonDispatch] = useReducer(payloadSessionReducer, initialPayloadSessionState);
+  const parsedSources = useMemo(() => parsedValueSources(jsonSession), [jsonSession]);
 …
               <FunctionsWorkspace
                 adapter={adapter}
-                sample={jsonState.parsed?.value ?? null}
-                referenceRoot={currentReferenceRoot(jsonState)}
+                sources={parsedSources}
               />
 …
               <JsonReferenceWorkspace
                 adapter={adapter}
                 active={screen === 'jsonReference'}
-                state={jsonState}
+                session={jsonSession}
                 dispatch={jsonDispatch}
               />
```
Add `useMemo` to the React import if it isn't there.

## Check after copying

- `npm test` in `packages/builder-ui`. Watch `jsonReferenceStyles.test.ts` / `shellStyles.test.ts` if they assert `.eb-json-workspace` is a direct child of `.eb-json-panel`; it now sits inside `.eb-json-session`.
- `themeColorAudit.test.ts` should pass: no raw colors in the new CSS.
- e2e `json-references.spec.ts`: the tab strip adds a `tablist` named "Payloads"; selectors scoped to `role=tab` may need `{ name }`.

## Not included

Rename-in-tab, drag-reorder and persisting the session are out of scope (session stays in memory, per FR-008).
