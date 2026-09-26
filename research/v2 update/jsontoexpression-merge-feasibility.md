# Feasibility: merging JSON-output → expression generation into ExpressionBuilder

**Research date:** 2026-09-21
**Repository baseline:** `ffddf53` (HEAD, clean except untracked scratch files)
**Subject:** https://jsontoexpression.workappholics.com/
**Method:** read the subject's shipped source, read this repo's source, cross-check the
generated syntax against Microsoft Learn. No code was modified.

> Note: an untracked `results.md` at the repo root already contains a prior run of this
> same brief. This report is an independent execution with one material difference: the
> subject site's **JavaScript source was retrieved and read**, so the observations below
> are source-level facts rather than black-box guesses.

---

## 1. Verdict

**Build it as a separate utility surface inside the existing shared UI — do not extend the
predicate model.** A single workbench dialog (`JsonReferenceDialog`) reusing the existing
adapter/preview is the correct scope. This is a **distinct user task**, not a third
`ExpressionMode`.

Decisive reasons:

1. **Different output contract.** The composer emits a boolean predicate; the engine's
   `formatExpression` forces an `@` prefix and raises `INVALID_ROOT_TYPE` for any
   non-boolean root (`packages/engine/src/formatter.ts:32-53`). A selected JSON value is a
   string, number, object, array, or null. Bolting this onto `ExpressionNode` would pollute
   a working contract.
2. **Existing "sample import" is not this feature.** `inferFieldsFromSample` deliberately
   *discards* arrays and nulls and keeps only leaf types (`packages/builder-ui/src/importExport/inferFromSample.ts:19-46`,
   comment on line 36: "Arrays are skipped (no element model)"). It produces fields, never
   a selectable runtime payload or an action reference.
3. **The whole target feature is ~600 lines of vanilla JS with zero dependencies.**
   Reimplemented against this repo's existing Fluent Tree + adapter boundary, it needs **no
   new runtime dependency and no schema migration**.

**Difficulty: Medium.** The expression generator is trivial; the cost is UI integration,
correctness verification against real flows, and one adapter honesty fix. Planning
assumption ≈ **4–7 working days** for someone who knows the repo and can validate against a
throwaway flow. Any attempt to make references *typed composer operands* or to auto-infer
loop context is a separate, larger project.

---

## 2. What the subject actually does (source-level)

The site is three vanilla scripts. Their complete logic:

**`js/expressionBuilder.js` — `buildExpression(actionName, path)`**

- `actionName.trim().replace(/\s+/g, '_')`, wrapped as `outputs('<name>')`.
- Each `{type:'key'}` → `?['<value>']`; each `{type:'index'}` → `[<n>]` (no `?`).
- Result wrapped `@{...}` for the default "Copy / paste ready" output; the "Clean
  expression" toggle is literally `rawExpr.slice(2, -1)` (strips `@{` and `}`).
- **No apostrophe escaping**: `expr += "?['" + seg.value + "']"` — a key `O'Brien` yields
  the broken `?['O'Brien']`. Confirmed defect, must not be reproduced.

**`js/expressionBuilder.js` — `buildArrayItemExpression(path)`**

- Finds the **last** `index` segment, drops everything up to it, roots at `item()`, appends
  the remainder. This is the "Use in array" button.

**`js/jsonParser.js` — `buildTree(value, path)`**

- Recursive typed tree; every node carries its accumulated `PathSegment[]`
  (`{type:'key',value}` / `{type:'index',value}`). Primitives keep `kind:'primitive'`,
  `valueType: typeof`. No field inference, no persistence.

**`js/app.js`**

- `bodyOnlyMode` prepends `{type:'key', value:'body'}` at selection time in `selectLeaf` —
  i.e. "Body only" input is interpreted by *prepending a body segment*, not by rewriting
  the payload.
- `Raw output` mode assumes the pasted object has a `body` property. For a **Compose** or a
  connector action whose raw output is the object itself, the generated `?['body']` is
  **wrong**. This is a genuine correctness bug in the subject's default mode, not just a
  labeling choice.
- Tree UX: `MAX_ARRAY_SHOW = 10` then "+ Show N more"; auto-expand via a heuristic that
  looks for a `body` key; clipboard via `navigator.clipboard` with a `textarea` fallback.
- Privacy claim: Plausible analytics + Cloudflare beacon are loaded from the page
  (`<script src="https://plausible.io/...">`), so "no data transmitted" is about *payload
  content*, not literally no network traffic.

**Net:** the target is a small, self-contained converter. It is not a schema tool, not a
Dataverse tool, and has no notion of loops beyond the last-index heuristic.

---

## 3. Current repo: what exists vs. the gap

Path: `ImportSchemaDialog → parseForMode → FieldDefinition[] → applySource → QueryDocument
→ deriveBuilderState → formatExpression → ExpressionPreview → adapter.copyToClipboard`
(`packages/builder-ui/src/workbench/ImportSchemaDialog.tsx:103-131`;
`packages/builder-ui/src/app/sourceState.ts:31-43`;
`packages/builder-ui/src/app/ExpressionBuilderShell.tsx`; `packages/engine/src/formatter.ts`).

| Target capability | Existing equivalent | Gap / decision |
| --- | --- | --- |
| Paste + parse sample JSON | `JSON.parse` inside `parseSampleRecord` (`inferFromSample.ts:49-60`) | Reuse the *parse*, not the field inference. Symptom of reuse: arrays/nulls vanish. |
| Browse nested values | none — sample import flattens objects | New payload tree. Must preserve typed paths. |
| Select a value → expression | none | New selection → reference. |
| Reference a **named action** | Roots are hard-coded: `triggerBody()` or `item()` (`packages/engine/src/fieldReferences.ts:7-12`) | New reference roots incl. `outputs('Action')` / `body('Action')`. |
| Full output vs body-only | no comparable setting; `ImportMode` is `native/sample/jsonSchema/csv` (`ImportSchemaDialog.tsx:32-61`) | New explicit source interpretation. |
| Address array elements | `FieldDefinition.path: string[]` (`packages/engine/src/types.ts:12`) and `formatFieldReference` emits `?['seg']` for **every** segment (`fieldReferences.ts:9-12`) | Typed path with numeric indices. A key `"0"` must never become index `0`. |
| Standalone (non-boolean) expression | formatter enforces boolean root (`formatter.ts:42-46`) | Separate tiny reference formatter — do not relax the predicate contract. |
| Highlight + copy | `ExpressionPreview` tokenizer (`ExpressionPreview.tsx:1-35`), `copyToClipboard` (`PlatformAdapter.ts:74-79`), copy-state region (`ExpressionDocumentPanel.tsx:35-49`) | Reuse; add `outputs/body/triggerOutputs/items` tokens. Note the tokenizer regex does not handle doubled apostrophes. |
| Persist | profiles + metadata cache store field definitions | Do **not** reuse — payloads must stay ephemeral. |

Two structural facts drive the design:

- `ExpressionMode` is `'triggerCondition' | 'filterArray'` (`packages/engine/src/types.ts:1`)
  and is consumed across the shell, header, and `getModeContext` (`workbenchState.ts:63-77`).
  Adding a third mode ripples everywhere for no benefit.
- The public UI contract is deliberately thin — `ExpressionBuilderShell`, the query
  document types, and the composer actions (`packages/builder-ui/src/index.ts:1-24`). A new
  dialog should stay internal to `builder-ui`, opened from the header, and never touched by
  `applySource`.

---

## 4. Expression grammar reference (Microsoft-backed)

MS states its expression reference applies to **both Power Automate and Azure Logic Apps**.

| Context | Generated reference | Caveat |
| --- | --- | --- |
| Trigger body | `triggerBody()?['customer']?['name']` | Path starts at the body; don't add another `body`. |
| Full trigger output | `triggerOutputs()?['body']?['customer']?['name']` | Envelope root. |
| Trigger header | `triggerOutputs()?['headers']?['content-type']` | Not visible from body-only JSON. |
| Action body | `body('Get_items')?['value']` | Shorthand for an action with a body. |
| Full action output | `outputs('Get_items')?['body']?['value']` | Envelope includes the `body` segment. |
| Raw action metadata | `outputs('HTTP')?['statusCode']` | Only when the envelope has it. |
| Direct object output (Compose) | `outputs('Compose')?['customer']?['name']` | **No `body` segment.** |
| Fixed array position | `body('Get_items')?['value'][0]?['Title']` | Fixed index, not "each". |
| Nested arrays | `outputs('Compose')?['matrix'][0][1]` | One numeric accessor per boundary. |
| Current loop item | `item()?['Title']` | Requires repeating-action context. |
| Named loop item | `items('Apply_to_each')?['Title']` | Requires that scope. |

Rules that affect the implementation:

1. **`?` is the null-ignore operator**, valid on property access (`?['x']`) and array access.
   It is not a default-value or bounds check — a fixed `[0]` on an empty/shortened array is
   still a runtime hole. Label fixed indices as fixed.
2. **One accessor per selected segment.** MS also documents slash paths
   (`outputs('Predict')?['body/responsev2/.../value']`), and the designer often emits
   `?['body/value']`. The subject emits split segments (`?['body']?['value']`); both evaluate.
   Prefer split segments and never split a *literal* dotted key.
3. **Escape single quotes by doubling** — this repo already does it
   (`packages/engine/src/fieldReferences.ts:3-4`). Expected: `?['O''Brien']`.
4. **`@{...}` is interpolation, not the default destination.** MS requires `@{}` when an
   expression sits inside plain text; a standalone `"@fn()"` needs no braces. Interpolation
   stringifies the result — so the subject's default `@{...}` copy is *not* universally
   "paste-ready": for the expression editor you want the bare/clean form. **Copy the clean
   form by default and label it "Paste into the expression editor."** Offer an "Inline text"
   variant only if asked.
5. **A sample cannot reveal its source.** Full-vs-body, action identity, and loop scope must
   come from the user, never be inferred from a key called `body`.

---

## 5. Minimal technical shape

**Engine (no AST change).** Add alongside `formatFieldReference`:

```ts
type PayloadReferenceRoot =
  | { kind: 'triggerBody' | 'triggerOutputs' }
  | { kind: 'body' | 'outputs'; actionName: string };

interface PayloadReference {
  root: PayloadReferenceRoot;
  path: readonly (string | number)[];
}

export function formatPayloadReference(ref: PayloadReference): string;
```

Lives in `packages/engine/src/fieldReferences.ts`, exported via
`packages/engine/src/index.ts`. Returns a **bare** reference only — no `@`, no clipboard, no
JSON parsing. Preserves `formatFieldReference` output byte-for-byte. Empty path = the root
(so selecting an object/array/null is legal). Do not touch `ExpressionNode`,
`ExpressionMode`, `FieldDefinition`, `ValueType`, or `QueryDocument`.

**Shared UI.**

- New `packages/builder-ui/src/importExport/jsonPayload.ts` — native parse, bounded
  traversal, exact typed-path preservation, clear errors. Add a unit test beside it.
- New `packages/builder-ui/src/workbench/JsonReferenceDialog.tsx` — source interpretation
  (action name + full/body), textarea, Parse, tree, selected path, preview, copy status.
- Use Fluent `Tree` / `TreeItem` / `TreeItemLayout` (already a dependency via
  `@fluentui/react-components`) rather than hand-rolled DOM or a JSON-viewer package. The
  installed tree README still carries a blanket non-production warning — verify against the
  pinned release before committing; do not add a competitor dependency to work around it.
- Header/shell: add an open/close entry point and pass the adapter. Both hosts already
  inject adapters (`apps/web/src/main.tsx`, `apps/pptb/src/main.tsx`) — no host changes.
- `ExpressionPreview.tsx`: extend the two function-name regexes with
  `outputs|body|triggerOutputs|items`; display-only change.
- Render values as React text (no `dangerouslySetInnerHTML`). Bound input (provisional:
  1 MiB / 10k nodes / depth 64) with a clear limit message.

**Do not** call `applySource` (`sourceState.ts:31-43`) when a payload is parsed — that would
overwrite the user's field schema as a side effect of a read-only tool.

---

## 6. Clipboard, privacy, compatibility

**Clipboard.** `copyToClipboard(text: string)` already takes any string (`PlatformAdapter.ts:74-79`).

- Web forwards to `navigator.clipboard.writeText` (`webAdapter.ts:41-43`).
- PPTB uses optional chaining — `api?.utils?.copyToClipboard?.(text)` (`pptbAdapter.ts:111-114`)
  — so a host without the API **silently resolves** and the shell reports success
  (`ExpressionBuilderShell.tsx`). The adapter test even asserts this no-op. Recommend
  tightening: reject at the adapter when the host API is absent, update that one test, and
  surface a real error. Keep all copying behind the abstraction.
- No rich clipboard object needed; the subject copies plain text.

**Privacy.** The subject's "no data transmitted" is payload-scoped (it does load Plausible +
Cloudflare beacons). This repo must keep its stronger posture: `apps/pptb/README.md:46`
states **no `cspExceptions`, no external domain, no telemetry**. The feature therefore must
add **no** network calls, telemetry, URL fetching, or payload persistence. Precise promise:
"Pasted JSON is processed locally and is not uploaded or saved by this feature."

**Compatibility.** Keep the feature's state entirely outside `QueryDocument`, so there is no
migration: `savedExpressionSchema` validates versions 1/2, two modes, string-only paths and
group/rule nodes; profiles store field arrays. Do not write payloads into either. Verify
that open → use → close leaves the document, mode, fields, generated predicate, and exported
JSON unchanged.

---

## 7. Work breakdown

**S** local · **M** feature slice with edge cases · **L** cross-cutting. Sizes are estimates,
not authorization.

| Task | Size | Files | Acceptance / risk |
| --- | --- | --- | --- |
| Verify reference contract against a live flow | S | none (disposable flow) | Full vs body; Compose vs body-bearing action; quote/slash/dot keys; index bounds; expression-editor paste. **Highest risk:** a syntactically valid reference can point at the wrong root/item. |
| `formatPayloadReference` + tests | S | `packages/engine/src/fieldReferences.ts`, `index.ts`, new `packages/engine/test/payloadReferences.test.ts` | Root/path/escaping/index table; existing trigger/filter output and `INVALID_ROOT_TYPE` diagnostics unchanged. |
| `jsonPayload.ts` + tests | S | new `packages/builder-ui/src/importExport/jsonPayload.ts` + test | Invalid JSON, every root kind, null/empty containers, nested arrays, bounds, exact path identity. |
| `JsonReferenceDialog.tsx` + tests | M | new dialog + `packages/builder-ui/test/jsonReferenceDialog.test.tsx` | Fluent Tree; visible Use/Copy; keyboard; stale-input reset; close discards state. |
| Preview + entry point | S | `ExpressionPreview.tsx`, `workbench/types.ts`, header/shell, focused tests | New tokens highlight correctly; text unchanged; no `QueryDocument` mutation. |
| Truthful PPTB copy | S | `pptbAdapter.ts` + test | Missing API rejects and is surfaced, not reported as copied. |
| Integration/privacy/e2e QA | M | new `tests/e2e/json-references.spec.ts` | No payload requests/settings writes; unchanged old document; responsive + keyboard; real browser/PPTB copy; bundle impact. |

Reference syntax → engine. JSON values + selection → shared UI. Hosts untouched.

---

## 8. Open questions

| Question | Default | Verify by |
| --- | --- | --- |
| Functional equivalence or pixel parity with the site? | Functional equivalence. | Accept paste → select → correct reference → copy. |
| Trigger as well as action? | Action first; explicit Trigger source is a small add. | Manual/request-trigger flow. No name heuristics. |
| Copy form? | Clean expression, labeled "paste into the expression editor". | Paste string/number/bool/object/array/null. |
| Body-only meaning? | Explicit context; direct-output actions use the whole output. | Real HTTP, list connector, Parse JSON, Compose samples. |
| Array index meaning? | A **labeled fixed** position; selecting the array returns the array reference. | Empty/short/missing arrays; `[n]` vs `?[n]`. |
| Unusual keys? | Preserve segments, double apostrophes, never mangle. | `'`, `/`, `.`, spaces, brackets, empty keys, Unicode. |
| Infer action identity or loop context from JSON? | No — require the identifier. | Real designer identifiers, renames, duplicate suffixes. |
| Input limits? | 1 MiB / 10k nodes / depth 64, clear message. | Benchmark in browser + PPTB before fixing thresholds. |
| Does generation prove the flow will work? | No — not existence, scope, or shape. | Disposable flow; missing fields; trigger `splitOn`. |

Buildable from the brief + MS docs alone: parse, tree, source context, formatter, preview,
adapter copy, ephemeral state. Still needs live evidence: connector full/body shapes,
identifier edge cases, quote/slash key behavior, index bounds, designer paste behavior, and
real PPTB copying.

---

## 9. Licensing / IP

General risk assessment, not legal clearance. The subject's **implementation is directly
readable** (unminified JS), which raises the bar: reimplement from the *idea* and from
Microsoft's documented grammar, and use original code, UI, and tests. Do not copy its
source, CSS, branding, screenshots, or tutorials. `package.json` declares BSD-3-Clause for
*this* repo and licenses none of the third-party site. Copying the site is unnecessary for
this feature.

---

## 10. Recommended first version

**Include:** one shared dialog; explicit action/trigger + full/body interpretation; bounded
native parsing; expandable values with exact typed-path selection; fixed-index array
references; clean preview + adapter copy; ephemeral state; focused correctness,
accessibility, and host checks.

**Cut:** the site's layout, labels, `@{...}` default, and its "Use in array"/loop heuristic;
a third `ExpressionMode`; reference→composer insertion; saved payload sessions; profile/cache
reuse; action discovery; JSON-looking-string decoding; a generic expression editor/evaluator;
any new tree/editor dependency; telemetry.

**Stop condition:** a user can paste a sample, select a value, and copy a correctly rooted
expression *without* altering their predicate or uploading/saving the payload — and the
dialog reproduces none of the subject's known defects (unescaped quotes, assumed `body`
segment).

---

## Sources

- Subject: https://jsontoexpression.workappholics.com/ and its shipped scripts
  `js/jsonParser.js`, `js/expressionBuilder.js`, `js/app.js` (retrieved; source-level).
- Microsoft — Workflow Definition Language schema, and Expression functions reference
  (`.../expression-functions-reference`): cross-product applicability; `outputs()`,
  `body()`, `triggerBody()?['123']`, `item()`, `@{}` interpolation requirement.
- Repo baseline `ffddf53`: `packages/engine/src/{types,formatter,fieldReferences,index}.ts`,
  `packages/builder-ui/src/importExport/inferFromSample.ts`,
  `packages/builder-ui/src/{app/sourceState.ts,composer/querySchema.ts,components/ExpressionPreview.tsx,workbench/*}`,
  `packages/platform/src/{PlatformAdapter,webAdapter,pptbAdapter}.ts`, `apps/pptb/README.md`.