# Feasibility: a native JSON-to-Power-Automate reference helper

**Research date:** 2026-09-21 (America/New_York)  
**Repository baseline:** `ffddf5326a0878e80042f21e2c88469cf6a4f500`

## Scope and intent

The goal is **equivalent useful functionality, not a 1:1 clone**: paste a sample JSON output, identify the source, select the value you want, and copy the correct Power Automate reference. Matching the other site's design, labels, implementation, formatting choices, or every edge behavior is not an acceptance requirement.

This report covers feasibility and a bounded implementation approach. No application code, dependencies, saved formats, or host configuration were changed.

## 1. Verdict

**Add a separate JSON-reference utility surface inside the existing application.** A shared workbench dialog is sufficient initially; no separate application, routing framework, or composer redesign is needed. Of the brief's options, this is **separate mode**, meaning a distinct user task—not another engine `ExpressionMode`.

Three decisive reasons:

1. **Related task, different output contract.** The current composer builds boolean predicates. Its formatter adds `@` and reports `INVALID_ROOT_TYPE` for non-boolean roots; a selected JSON value can instead be a string, number, object, array, or null. Keep that predicate contract intact. Evidence: `packages/builder-ui/src/app/builderState.ts:21-58`; `packages/engine/src/formatter.ts:32-52`; `packages/engine/test/predicateRoots.test.ts:7-39`.
2. **There is substantial UI/platform reuse, but schema import is not the same feature.** Sample import extracts field definitions and discards nested arrays/nulls. It does not preserve a selectable runtime payload or action context. Evidence: `packages/builder-ui/src/importExport/inferFromSample.ts:19-60`. Existing preview and string-copy interfaces are reusable: `packages/builder-ui/src/components/ExpressionPreview.tsx:24-37`; `packages/platform/src/PlatformAdapter.ts:74-79`.
3. **The bounded solution requires no new runtime dependency or persistence migration.** Fluent already supplies a tree, and both hosts already inject adapters into the shared shell. Evidence: `packages/builder-ui/package.json:20-29`; `node_modules/@fluentui/react-components/lib/index.js:51`; `apps/web/src/main.tsx:1-7`; `apps/pptb/src/main.tsx:1-7`.

**Difficulty:** medium, mostly UI integration and correctness testing rather than complicated expression generation. Planning assumption: approximately **one engineer-week, roughly 4–7 working days**, for someone familiar with the repository and able to validate examples in a disposable flow and the supported PPTB host. This is an estimate, not a commitment. Automatic loop inference or integrating references as composer operands would be a separate, larger feature.

### Product fit

- **Filter Array:** the helper can supply the array reference for **From**, while the existing composer supplies the predicate over each item. The current field formatter uses `item()` in Filter Array mode (`packages/engine/src/fieldReferences.ts:7-12`). These outputs complement each other; they are not interchangeable.
- **Trigger conditions:** inspecting a trigger payload can reveal the correct nested property path. A reference alone is usually not a condition. Downstream action outputs cannot be used to decide whether to start the same flow; keep action-reference generation outside the trigger-condition composer [M1], [M2], [M7].
- **General flow authoring:** accessing HTTP responses, connector values, headers, and nested data for Compose or other actions is an adjacent useful task, directly illustrated in Microsoft guidance [M3], [M4], [M5], [M6].
- **Audience assumptions:** standalone users likely get broad utility without a connection; PPTB users get a convenient companion to Dataverse/schema work. This research did not measure demand. Validate with a few representative users rather than infer product priority from technical feasibility. Current web hosting disables table connection through the shell's platform flag (`apps/web/src/main.tsx:5-7`; `packages/builder-ui/src/app/ExpressionBuilderShell.tsx:60-77`).

This strengthens the product if clearly presented as **JSON references**. It dilutes it if selecting a value silently changes the predicate's schema or masquerades as a complete trigger/filter condition. Preserve the existing focused composer and its current header framing (`packages/builder-ui/src/workbench/WorkbenchHeader.tsx:21-35`).

## 2. Current flow and net-new capability

The current import-to-output path is:

`ImportSchemaDialog → parser → FieldDefinition[] → applySource → QueryDocument groups/rules → deriveBuilderState → formatExpression → preview → adapter clipboard`.

Evidence: `packages/builder-ui/src/workbench/ImportSchemaDialog.tsx:103-149,206-228`; `packages/builder-ui/src/app/ExpressionBuilderShell.tsx:536-543`; `packages/builder-ui/src/app/sourceState.ts:31-43`; `packages/builder-ui/src/composer/querySchema.ts:13-41`; `packages/builder-ui/src/app/builderState.ts:21-58`; `packages/builder-ui/src/app/ExpressionBuilderShell.tsx:168-185`.

**Important integration boundary:** `applySource` replaces document fields and records source provenance. Opening or using a reference helper must not call it merely because a user pasted JSON (`packages/builder-ui/src/app/sourceState.ts:31-43`).

| Desired capability | Existing equivalent | Gap / reuse decision |
| --- | --- | --- |
| Paste valid sample JSON | Sample parser calls `JSON.parse` | Reuse the native parsing pattern, not its field-inference result. The helper must retain actual values. `packages/builder-ui/src/importExport/inferFromSample.ts:49-60`. |
| Browse nested values | Sample import flattens objects | New payload navigation. Nested arrays/nulls are skipped, and top-level arrays use only their first element in the existing importer. `packages/builder-ui/src/importExport/inferFromSample.ts:19-60`. |
| Select a property or container | Import preview lists field labels/types and imports fields | New selection-to-reference behavior, separate from import. `packages/builder-ui/src/workbench/ImportSchemaDialog.tsx:206-228`. |
| Reference a named action | Existing roots are only `triggerBody()` and `item()` | Add explicit reference roots and action identity. Do not overload predicate mode. `packages/engine/src/fieldReferences.ts:7-12`; `packages/engine/src/types.ts:1`. |
| Interpret full output versus body-only JSON | No corresponding setting in the four import modes | New explicit source interpretation, not a heuristic based on a key named `body`. `packages/builder-ui/src/workbench/ImportSchemaDialog.tsx:32-61`. |
| Address array elements | Field paths are `string[]`, with every segment quoted | New typed numeric indices; object key `"0"` must not become array index `0`. `packages/engine/src/types.ts:8-20`; `packages/engine/src/fieldReferences.ts:9-12`. |
| Generate a standalone property reference | Value nodes exist, but the formatter enforces a boolean root | Separate small reference formatter; no AST/root-validation relaxation. `packages/engine/src/types.ts:22-57`; `packages/engine/src/formatter.ts:39-45`. |
| Highlight and copy | Existing preview, copy contract, and status region | Reuse. Add the missing reference function tokens; preserve text exactly. `packages/builder-ui/src/components/ExpressionPreview.tsx:1-35`; `packages/platform/src/PlatformAdapter.ts:74-79`; `packages/builder-ui/src/workbench/ExpressionDocumentPanel.tsx:35-49`. |
| Field JSON / JSON Schema / CSV | Existing schema-oriented importers | Not substitutes for payload selection. Field JSON validates definitions; JSON Schema maps top-level properties; CSV maps headers. `packages/builder-ui/src/importExport/fieldImport.ts:27-42,58-81`; `packages/builder-ui/src/importExport/jsonSchemaImport.ts:24-64`; `packages/builder-ui/src/importExport/csvImport.ts:42-62`. |
| Reusable saved information | Profiles/cache store field definitions | Do not reuse for pasted payloads or reference sessions. `packages/builder-ui/src/importExport/fieldProfiles.ts:8-11,30-52`; `packages/builder-ui/src/importExport/metadataCache.ts:7-10,33-40`. |

The existing preview lacks `outputs`, `body`, `triggerOutputs`, and `items` in its function lists; its string-token regex also does not consume doubled apostrophes as one string token. This is a narrow highlighting change, not a reason to introduce a syntax-parser dependency (`packages/builder-ui/src/components/ExpressionPreview.tsx:1-21`).

## 3. What inspecting the other site established

The public [site][T1] was exercised with synthetic data only. These observations help identify the useful workflow; **they are not a parity checklist or a correctness oracle**. No site implementation code or assets were copied into the repository.

For action name `Get items`, a full sample containing `body.nested.score` produced:

- Clean: `outputs('Get_items')?['body']?['nested']?['score']`.
- Default copy form: `@{outputs('Get_items')?['body']?['nested']?['score']}`.
- The copied text matched the preview: ordinary text, not a proprietary clipboard object.
- A body-only sample produced the same final reference, with the body access inserted.
- An array leaf produced `outputs('Get_items')?['body']?['value'][0]?['Author']?['Email']`.
- A separate **Use in array** action produced `item()?['Author']?['Email']`. This additional behavior is not necessary for the proposed first version.
- Nulls and empty arrays were selectable, as were container nodes.
- A key `O'Brien` produced an unescaped `?['O'Brien']`. This is an observed escaping defect, not behavior to reproduce.

The brief's terminology needs one correction: **Raw output / Body only** controls input interpretation; **Copy / paste ready / Clean expression** controls the generated text. There is no requirement to duplicate either labeling scheme. Trigger-specific generation was not confirmed in the inspected surface; any trigger support should follow Microsoft syntax directly.

**Privacy observation:** the site made Plausible pageview and Cloudflare performance requests. The captured POST bodies did not contain the synthetic sample or action name, and local/session storage were empty after the interactions. This is consistent with local payload processing, but does not establish a complete privacy guarantee. “No network requests” would be false; no full security/storage audit was performed.

## 4. Expression grammar reference

Microsoft explicitly states that its expression-functions reference applies to both **Power Automate and Azure Logic Apps** [M2]. The following are documentation-backed syntax patterns adapted to example names, not claims of successful live-flow execution during this research.

| Context | Clean expression | Meaning / caveat | Source |
| --- | --- | --- | --- |
| Trigger body | `triggerBody()?['customer']?['name']` | Path begins at the body; do not add another body level. | [M2], [M3] |
| Full trigger output | `triggerOutputs()?['body']?['customer']?['name']` | Path begins at the output envelope. | [M2], [M3] |
| Trigger header | `triggerOutputs()?['headers']?['content-type']` | Body-only JSON cannot reveal headers. | [M1], [M3] |
| Action body | `body('Get_items')?['value']` | For an action that has a body output. | [M2], [M4] |
| Full action output | `outputs('Get_items')?['body']?['value']` | Includes the actual body segment in an envelope. | [M1], [M2] |
| Raw action metadata | `outputs('HTTP')?['statusCode']` | Valid when that property exists; not every action has an HTTP-like envelope. | [M1], [M2], [M7] |
| Direct object output, e.g. Compose | `outputs('Compose')?['customer']?['name']` | Do not insert `body` when the action directly outputs this object. | [M1], [M2] |
| Fixed array position | `body('Get_items')?['value'][0]?['Title']` | Zero-based, one specific item—not all titles. | [M1], [M5] |
| Nested arrays | `outputs('Compose')?['matrix'][0][1]` | One numeric accessor per selected array boundary. | Composition of [M1], [M5] |
| Current repeating-action item | `item()?['Title']` | Requires the appropriate repeating-action context. | [M2] |
| Named Apply to each item | `items('Apply_to_each')?['Title']` | Requires that named loop's scope. | [M2], [M4] |

### Rules that matter to implementation

1. **Input shape is explicit.** Full output selects from the actual output object. Body-only selects from its body. A property named `body` inside a body is ordinary data and must not be stripped. A sample alone cannot identify its generating action or source root.
2. **Use bracketed segments for arbitrary keys.** Microsoft documents both dot and bracket operators. Preserve segment boundaries; `?['a.b']` describes a literal dotted key, whereas `?['a']?['b']` describes two levels [M1]. Do not split a displayed path on dots.
3. **Slash shorthand exists, but is not required.** Microsoft shows `outputs('Predict')?['body/responsev2/predictionOutput/labels/Total/value']` [M6]. Prefer one accessor per selected segment. Do not join all keys with `/`, and verify collisions between literal slash keys and nested paths before promising arbitrary-key support.
4. **`?` handles missing/null access, not every schema error.** Microsoft calls it the null-ignore operator and documents property/array access [M1]. It is not a default value, loop, or type check. Validate `?[index]` behavior for null and out-of-range arrays in the focused spike; do not claim the fixed `[0]` example is safe for a shortened or missing array.
5. **Escape expression strings, then separately serialize JSON if needed.** Single quotes delimit WDL strings [M1]. This repository already doubles apostrophes in field paths and literal strings (`packages/engine/src/fieldReferences.ts:3-4`; `packages/engine/src/literals.ts:8-9`). Reuse that convention for keys/action names; expected key output is `?['O''Brien']`. The fetched WDL operator page does not explicitly specify apostrophe escaping, so verify that exact case in a live flow. Do not present the competitor's output as proof.
6. **Use the actual action identifier.** Microsoft examples use identifiers such as `Get_user` [M2]. The site's tested whitespace replacement does not prove how every designer label, renamed action, or duplicate suffix maps. Require the internal identifier and show what will be referenced; no silent guessing is needed.
7. **Do not recursively parse JSON-looking string values.** A string inside the sample is not automatically an object at flow runtime. Microsoft distinguishes JSON content from strings requiring conversion [M5]. Automatic decoding is outside this feature.

### Copy destination matters

| Destination | Form | Result |
| --- | --- | --- |
| Expression editor | `body('Get_items')?['value']` | Bare expression; recommended v1 copy output. |
| Expression-valued workflow JSON property | `"@body('Get_items')?['value']"` | `@` marks an expression; surrounding quotes belong to JSON. Can preserve a non-string result. |
| Inline text | `Items: @{body('Get_items')?['value']}` | Interpolation produces text, not a general typed object/array transfer. |

Microsoft explicitly demonstrates that `@{...}` interpolation converts a numeric result to a string [M1], [M2]. **The simplest equivalent helper should copy the clean expression and say “Paste into the expression editor.”** Matching the site's format toggle is unnecessary. Add an explicitly labeled **Inline text** option only if users need it; do not label it universally paste-ready.

## 5. Minimal technical shape

### Keep the predicate model unchanged

No new predicate AST node is required. Add a small reference descriptor and a separate clean-string formatter beside the existing field-reference implementation. Illustrative design only, not implemented:

```ts
type PayloadReferenceRoot =
  | { kind: 'triggerBody' | 'triggerOutputs' }
  | { kind: 'body' | 'outputs'; actionName: string };

interface PayloadReference {
  root: PayloadReferenceRoot;
  path: readonly (string | number)[];
}
```

Proposed owner: `packages/engine/src/fieldReferences.ts`, exported through `packages/engine/src/index.ts`. A `formatPayloadReference` function returns a bare reference, with no UI, clipboard, interpolation, or JSON-parsing responsibility.

- Reuse existing path escaping/accessors, preserving current `formatFieldReference` output exactly (`packages/engine/src/fieldReferences.ts:3-12`; `packages/engine/src/index.ts:19-22`).
- String segments are exact keys; numeric segments are nonnegative integer indices. Validate user-supplied context at its boundary.
- An empty path refers to the root. Selecting an object/array/null does not require inventing a field type.
- Do not change `ExpressionNode`, `ExpressionMode`, `FieldDefinition`, `ValueType`, or `QueryDocument`. Do not encode accessors as fake function names or wrap values in fake predicates. Current contracts: `packages/engine/src/types.ts:1-57`; `packages/builder-ui/src/composer/querySchema.ts:13-41`.
- Object/array types in the predicate engine become necessary only if a later project makes references typed composer operands. That is not needed here.

The engine currently has no runtime dependencies, and strict typing is enabled (`packages/engine/package.json:1-20`; `tsconfig.base.json:3-16`). This design preserves both.

| Location | Responsibility |
| --- | --- |
| Existing engine `fieldReferences.ts` and barrel | Source root, accessors and escaping; share with current field references where practical. |
| New `packages/builder-ui/src/importExport/jsonPayload.ts` | Native parsing, clear errors, bounded traversal, exact path/value preservation. No field inference or persistence. |
| New `packages/builder-ui/src/workbench/JsonReferenceDialog.tsx` | Source interpretation, JSON input, Parse, expandable values, selected path, preview and copy status. Keep small recursive rendering local rather than creating a generic tree abstraction. |
| Existing `ExpressionPreview.tsx` | Narrow token updates; display only. |
| Existing shell/header | Open/close utility and pass adapter. Never route selection through `applySource` or saved export. |
| Platform package | Existing text-copy boundary and truthful failure behavior. |
| Host bootstraps | No change expected: both already inject adapters into the same shell (`apps/web/src/main.tsx:1-7`; `apps/pptb/src/main.tsx:1-7`). |

Use parsed JSON as the source of truth, not a second field-schema model. Preserve typed paths; use collision-free row IDs such as `JSON.stringify(path)`, rather than dotted IDs. The sample importer uses `path.join('.')`, which should not be reused as arbitrary-payload identity (`packages/builder-ui/src/importExport/inferFromSample.ts:29-42`). Reset stale selection/output when input changes and discard payload state on close.

### Reuse Fluent Tree

Use `Tree`, `TreeItem`, and `TreeItemLayout` from the existing Fluent dependency, not a JSON-viewer package. Exports and the item `actions` slot were verified at `node_modules/@fluentui/react-components/lib/index.js:51` and `node_modules/@fluentui/react-tree/dist/index.d.ts:499-534`.

Microsoft recommends Tree for nested data [F1]. Reuse its keyboard/focus handling. Provide a visible selected-node Use/Copy action as an alternative to row quick actions, as Microsoft recommends. Label the tree and array indices, preserve readable long keys, and announce copy results.

Dependency caveat: the installed tree README still includes a blanket non-production warning (`node_modules/@fluentui/react-tree/README.md:5`), while current Microsoft Fluent guidance documents React Tree usage. Confirm support for the pinned release during implementation; do not add a competing dependency merely because these documents disagree.

**New runtime dependencies: none required.** Native parsing and existing React/Fluent/preview components cover the goal. Start with bounded inputs and collapsed branches, not workers, virtualization, Monaco, or custom tree keyboard handling.

## 6. Clipboard, privacy, and compatibility

### Clipboard

The interface already accepts any string: `copyToClipboard(text: string): Promise<void>` (`packages/platform/src/PlatformAdapter.ts:74-79`). No rich clipboard capability is needed.

- **Web:** forwards to `navigator.clipboard.writeText` (`packages/platform/src/webAdapter.ts:39-43`). Permission/unavailable-API errors need visible feedback and selectable text for manual copy. The test proves forwarding with a mock, not browser permissions (`packages/platform/test/webAdapter.test.ts:12-20`).
- **PPTB:** a missing host copy API resolves without copying because of optional chaining (`packages/platform/src/pptbAdapter.ts:111-114`). This no-op is explicitly expected by `packages/platform/test/pptbAdapter.test.ts:50-62`. The shell currently marks success after resolution (`packages/builder-ui/src/app/ExpressionBuilderShell.tsx:168-185`).

Recommended implementation-time correction: missing PPTB clipboard support should reject at the adapter without expanding the interface. Update that specific test expectation and show a local dialog error, because host notifications can also be unavailable. Do not bypass the abstraction with direct host/browser calls in shared UI. Real supported-host copy still needs runtime verification. No correction was made during research.

### Privacy

**Local processing is feasible without a backend.** Use a precise promise: “Pasted JSON is processed locally and is not uploaded or saved by this feature. Copy sends the generated expression to your clipboard.”

Avoid claiming the entire app has no persistence/network boundary:

- Web settings use localStorage (`packages/platform/src/webAdapter.ts:66-94`).
- PPTB settings delegate to the host (`packages/platform/src/pptbAdapter.ts:150-162`).
- Profiles/cache persist fields (`packages/builder-ui/src/importExport/fieldProfiles.ts:30-38`; `packages/builder-ui/src/importExport/metadataCache.ts:33-40`).
- Dataverse discovery already uses adapter methods (`packages/builder-ui/src/app/sourceState.ts:49-77`; `packages/platform/src/pptbAdapter.ts:235-240`).
- Clipboard transfer is intentional and can involve OS history/sync outside the utility's control.

For the helper: no settings writes, payload logging, telemetry payloads, URL following, expression evaluation, or HTML rendering of samples. Render values as React text. Bound input size and traversal depth/node count to prevent freezes. Verify absence of payload network/storage writes during parse/select/copy. Closing removes application references; it is not forensic memory erasure.

### Saved data

Keep helper state outside the predicate document and no migration is needed:

- Saved expressions validate versions 1/2, two modes, existing field types, string-only paths, and group/rule nodes (`packages/builder-ui/src/importExport/savedExpressionSchema.ts:8-10,31-45,68-74,96-110`). Inserting reference records there broadens the change unnecessarily.
- Profiles contain field arrays; loading currently checks only that the stored value is an array (`packages/builder-ui/src/importExport/fieldProfiles.ts:8-11,41-52`). Do not repurpose them for payload sessions.
- Export serializes the whole document (`packages/builder-ui/src/importExport/savedExpressionSchema.ts:12-14`), so never attach pasted samples to it.
- Sample-import behavior and predicate-root validation have explicit tests and should not change (`packages/builder-ui/src/importExport/inferFromSample.test.ts:16-25,49-52`; `packages/engine/test/predicateRoots.test.ts:14-39`).

Integration check: compose a predicate, open/use/close the helper, and confirm the document, mode, fields, generated predicate, and exported saved JSON remain unchanged. Highlighting updates must preserve expression text exactly.

## 7. Work breakdown

Prospective work only. **S:** small/local change; **M:** feature slice with UI or meaningful edge cases; **L:** cross-cutting work. These sizes are not authorization to implement.

| Task | Size | Files / ownership | Test surface and acceptance | Dependencies / risk |
| --- | --- | --- | --- | --- |
| Verify reference contract | S | Research fixtures / disposable flow; no production changes | Full output vs body; Compose vs body-bearing action; quote/slash keys; indices; expression-editor paste. Compare actual values, not just accepted syntax. | **Highest risk:** a plausible expression can select the wrong root/item. Verify Microsoft semantics, not competitor parity. |
| Standalone reference formatter | S | `packages/engine/src/fieldReferences.ts`, `packages/engine/src/index.ts`; new `packages/engine/test/payloadReferences.test.ts` | Root/path/escaping/index table; unchanged trigger/filter output and predicate-root diagnostics. | Contract first. Avoid quoted indices and changing old output. |
| Parse and browse JSON | M | New `packages/builder-ui/src/importExport/jsonPayload.ts`, adjacent unit test; new `packages/builder-ui/src/workbench/JsonReferenceDialog.tsx`, `packages/builder-ui/test/jsonReferenceDialog.test.tsx` | Invalid JSON, all root kinds, null/empty containers, nested arrays, long keys, bounds; exact path selection; keyboard and visible actions. | Existing Fluent controls. Risks: discarded values, identity collisions, rendering cost. |
| Preview/copy and entry point | M | `packages/builder-ui/src/components/ExpressionPreview.tsx`; new dialog; shell/header and `packages/builder-ui/src/workbench/types.ts`; focused preview/shared-shell tests | Exact copy text; stale-input invalidation; reset on close; both host configurations; no `QueryDocument` mutation/sample export. | Formatter and payload UI. Header callbacks currently live in `packages/builder-ui/src/workbench/WorkbenchHeader.tsx:6-35` and `packages/builder-ui/src/workbench/types.ts:29-34`. |
| Truthful unsupported-host copy | S | `packages/platform/src/pptbAdapter.ts`, `packages/platform/test/pptbAdapter.test.ts` | Missing API rejects; available API forwards; rejection is visible, not “copied.” | Intentional update to existing off-host no-op behavior, no interface change. |
| Integration/privacy/runtime QA | M | New `tests/e2e/json-references.spec.ts`; focused tests above | No payload requests/settings writes; unchanged old document; responsive/keyboard behavior; real browser/PPTB copy; measure bundle growth. | Mock tests do not prove host support or flow semantics. Existing unrelated failure is tracked separately. |

Reference syntax belongs in the engine; JSON values and selection belong in shared UI. Neither host needs business logic. A generic expression parser, loop-context model, or saved-format migration would turn this bounded addition into an **L** project and is not necessary.

## 8. Open questions and assumptions

| Question | Recommended default | Verification |
| --- | --- | --- |
| Functional equivalence or site parity? | Functional equivalence, as clarified by the user. | Accept paste → select → correct reference → copy, not matching controls. |
| Action only, or trigger too? | Action first; explicit Trigger source is a small useful extension. | Product choice; manual/request-trigger flow check. No hidden action-name heuristic. |
| Copy form? | Bare expression for the expression editor. | Paste/run string, number, boolean, object/array and null cases. Inline text only if needed. |
| Array selection meaning? | A visibly labeled fixed position; selecting the array returns its reference. | Empty/shortened/reordered/nested arrays; `[n]` vs `?[n]`. An index never means “each item.” |
| Body-only interpretation? | Explicit body context; direct-output actions use whole output. | Real HTTP, list-connector, Parse JSON and Compose samples, including data with its own `body` key. |
| Every unusual key supported? | Preserve segments and escape string literals; never silently mangle names. | Quotes, slashes, dots, spaces, brackets, empty keys, Unicode and backslashes in a live fixture. Clear unsupported-case diagnostics if necessary. |
| Infer action identity or loop context from JSON? | No. Require the identifier; do not infer flow structure. | Compare actual identifiers, renames and suffixes. Named/nested-loop support is deferred. |
| Input limits? | Bounded processing. Provisional assumption: 1 MiB, 10,000 visited nodes, depth 64, with a clear limit message. | Benchmark in browser/PPTB before committing thresholds. No workers/virtualization without measured need. |
| Generation equals live validation? | No. It cannot prove an action exists, ran, is in scope, or retains this shape. | Disposable flow, missing fields and trigger `splitOn` changes [M7]. |

**Buildable from the goal and Microsoft docs:** native parse, tree, source context, formatter, existing preview, adapter copy, ephemeral state. The site's code or exact outputs are unnecessary.

**Still needing sample/runtime evidence:** connector full/body shapes, identifier edge cases, literal-slash/quote behavior, array bounds, designer paste behavior, and real PPTB copying. Further reverse-engineering of the other site is not a prerequisite.

## 9. Licensing / IP

**General risk assessment, not legal clearance:** independently implementing the same useful workflow is different from copying another site's code, assets, or expressive presentation. The U.S. Copyright Office distinguishes ideas/systems/methods from protected expression, and notes that software and website writing/artwork can be protected [L1].

Use original code/UI/tests and Microsoft's documented grammar. Do not copy branding, screenshots, tutorials, CSS, or source. Public accessibility is not a reuse license; this research did not establish permission to reuse target materials or perform a complete terms/patent/trademark review. The repository's BSD-3-Clause declaration (`package.json:5`) does not license third-party site content. Broader legal clearance requires appropriate review; copying the site is unnecessary for this feature.

## 10. Verification performed

Source was inspected at the baseline above. Environment: **Windows, Node 24.17.0, npm 11.13.0**. Build/test/e2e/typecheck commands exist at `package.json:10-21`.

| Check | Actual result |
| --- | --- |
| `npm run build` | **Passed:** TypeScript and both host builds. Existing warnings: bundles over 500 kB; PPTB `inlineDynamicImports` ignored with `codeSplitting: false`. JS sizes: PPTB 876.14 kB / 247.34 kB gzip; web 843.22 kB / 241.20 kB gzip. |
| `npm test -- --reporter=dot` | **Not green:** 40 files passed, 1 failed; **288 tests passed, 1 failed**. Also reported fork-termination timeouts for `fieldToolboxPane.test.tsx` and `conditionCanvas.test.tsx`. |
| `npm test -- packages/builder-ui/test/manageProfilesDialog.test.tsx --reporter=dot` | Reproduced alone: **1 passed, 1 failed**. Profile-delete test cannot find accessible button `Delete` at `packages/builder-ui/test/manageProfilesDialog.test.tsx:58`; dumped dialog is `aria-hidden="true"`. Root cause was not diagnosed or changed. |
| Focused command below | **15 files / 92 tests passed** across engine, import/export, source state, profiles and clipboard adapters. |
| Target-site synthetic browser checks | Reference/format/tree/text-copy observations in section 3. Not Power Automate runtime validation. |
| Power Automate execution, real PPTB runtime, local-app browser e2e suite | **Not performed.** Build/source/mocked-adapter evidence does not prove these. |

```powershell
npm test -- packages/engine packages/builder-ui/src/importExport packages/builder-ui/test/sourceState.test.ts packages/builder-ui/test/fieldProfiles.test.ts packages/platform/test/webAdapter.test.ts packages/platform/test/pptbAdapter.test.ts --reporter=dot --maxWorkers=2
```

The first full test run overlapped the build; the profile-dialog failure was then reproduced in isolation. Do not report an all-green baseline or silently repair that unrelated test as part of this research.

## 11. Recommended first version

**Add:** one shared JSON-reference dialog; explicit source/full-output/body interpretation; bounded native parsing; expandable values with exact path selection; fixed-index array references; clean preview/copy through the adapter; ephemeral state; focused correctness/accessibility/host checks.

**Explicitly cut:** matching the other site's layout or labels; its output-format toggle; automatic “Use in array”/loop inference; a third predicate mode; reference-to-composer insertion; saved payload sessions/profile reuse; action discovery; JSON-looking-string decoding; generic expression editing/evaluation; backend/telemetry; new tree/editor dependencies.

**Stop condition:** a user can paste a sample, select the desired value, and copy the correctly rooted expression without altering their predicate or saving/uploading the payload. This accomplishes the same goal without building a clone or a general flow editor.

## Sources

External sources were accessed during this research. Site observations are point-in-time; source citations refer to the repository baseline above.

- **T1:** [Workappholics — From JSON to Expression][T1]. Black-box observations only.
- **M1:** [Microsoft — Workflow Definition Language schema][M1]. Operators, expression prefixes and interpolation.
- **M2:** [Microsoft — Expression functions for Logic Apps and Power Automate][M2]. Explicit cross-product applicability; body/output/trigger/item roots.
- **M3:** [Microsoft — HTTP endpoints: referencing inbound content][M3]. Trigger envelope, body shortcut and nested paths.
- **M4:** [Microsoft — SharePoint Send HTTP Request: parse the response][M4]. Action-body, array and named-loop references.
- **M5:** [Microsoft — Handle content types][M5]. Nested arrays and JSON versus string content.
- **M6:** [Microsoft — AI Builder predict action][M6]. Documented slash-path output syntax.
- **M7:** [Microsoft — Trigger/action schema reference][M7]. Source-specific shapes, trigger conditions and `splitOn`.
- **F1:** [Microsoft Fluent 2 — React Tree usage][F1]. Hierarchical data, item actions and accessibility.
- **L1:** [U.S. Copyright Office — What Does Copyright Protect?][L1]. Ideas/methods versus expressive works.

[T1]: https://jsontoexpression.workappholics.com/
[M1]: https://learn.microsoft.com/en-us/azure/logic-apps/workflow-definition-language-schema
[M2]: https://learn.microsoft.com/en-us/azure/logic-apps/expression-functions-reference
[M3]: https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-http-endpoint#reference-content-from-an-inbound-request
[M4]: https://learn.microsoft.com/en-us/sharepoint/dev/business-apps/power-automate/guidance/working-with-send-sp-http-request#parse-the-response
[M5]: https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-content-type#application-json
[M6]: https://learn.microsoft.com/en-us/ai-builder/predict-action-pwr-automate#document-processing-model
[M7]: https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-workflow-actions-triggers
[F1]: https://fluent2.microsoft.design/components/web/react/core/tree/usage
[L1]: https://www.copyright.gov/help/faq/faq-protect.html
