# ExpressionBuilder — Quality Remediation Plan

Subagent-driven, phased. Each phase self-contained: own context, own doc refs, own verification.
Findings from architecture+quality review (2026-07-09), all git-traced / file:line evidenced.

**Severity order**: P1 = critical (broken feature), P2 = high, P3 = med, P4 = low/cleanup.

---

## Phase 0 — Reference Facts (READ FIRST, no code)

Copy targets and ground truth. Do NOT invent — copy from these exact sources.

### Fix reference: commit `ce1d4dd`
The correct enum-fix already exists in history. It is the copy source for P1.
```
git show ce1d4dd -- packages/platform/src/pptbAdapter.ts
```
Restored line (both call sites):
```ts
const raw = (await dv.getEntityRelatedMetadata(table, 'Attributes', '$expand=OptionSet')) as
```
`f2278ee "Bug fixess"` stripped the `'$expand=OptionSet'` arg again → regression.

### Allowed APIs (verified present, do not assume others)
- `dv.getEntityRelatedMetadata(table, relatedKind, odataHint?)` — 3rd param IS the OData expand/select hint. Source: `packages/platform/src/dataverseApi.d.ts` + JSDoc `dataverseMetadata.ts:5`.
- `optionsOf(attr)` reads `attr.OptionSet?.Options` — `packages/platform/src/dataverseMetadata.ts:47-56`. Returns `undefined` when OptionSet absent → the failure mode.
- `mapDataverseAttributes(attrs, pathPrefix?)` — `dataverseMetadata.ts:133`.

### Anti-patterns (do NOT do)
- Do NOT drop the 3rd arg on `'Attributes'` fetches. That IS the bug.
- Do NOT change the mock to pre-expand OptionSet without ALSO asserting the arg — that is exactly the blind spot that let the regression through.
- Do NOT invent new adapter methods; only 3 call sites use `getEntityRelatedMetadata` for Attributes.

---

## Phase 1 — P1: Restore enum expansion + close the test blind spot

**Agent**: bounded builder subagent (2 files).

### What to implement (COPY from `ce1d4dd`, do not transform)
1. `packages/platform/src/pptbAdapter.ts:266` — add 3rd arg:
   `getEntityRelatedMetadata(table, 'Attributes', '$expand=OptionSet')`
2. `packages/platform/src/pptbAdapter.ts:303` — same on `related.table`.
   (Line 283 `'ManyToOneRelationships'` stays as-is — no OptionSet there.)

### Harden the test so it can NEVER regress silently again
`packages/platform/test/dataverseDiscovery.test.ts` — in `discoverFields maps attributes incl. choice labels` (~L46) and the related-fields test (~L64), assert the expand arg was passed:
```ts
const dv = mockDv();
const adapter = createPptbAdapter(undefined, dv);
await adapter.discoverFields?.({ table: 'account' });
expect(dv.getEntityRelatedMetadata).toHaveBeenCalledWith('account', 'Attributes', '$expand=OptionSet');
```
(Capture the `vi.fn()` via a local `dv` handle instead of inline `mockDv()`, so the spy is assertable.)

### Verification
- `git show ce1d4dd -- packages/platform/src/pptbAdapter.ts` → your diff matches the `+` lines.
- `grep -n "OptionSet" packages/platform/src/pptbAdapter.ts` → 2 hits (L266, L303).
- Run: `npm run -w packages/platform test` → all pass. New assertion present.
- **Prove it catches regression**: temporarily delete one `'$expand=OptionSet'` → test RED. Restore → GREEN. (Revert the temp deletion.)

### Anti-pattern guard
Test must FAIL if the 3rd arg is removed. If it still passes without the arg, the assertion is wrong — fix the assertion, not the source.

---

## Phase 2 — P2: Prevent CRLF churn (repo hygiene)

**Agent**: bounded builder subagent (1 new file). Renormalize step is run by user/orchestrator, not the agent.

### What to implement
Create `.gitattributes` at repo root:
```
* text=auto eol=lf
*.svg text eol=lf
*.png binary
*.jpg binary
*.ico binary
```
Then renormalize (one-time, user/orchestrator runs — it mutates the working tree):
```
git add --renormalize .
```

### Verification
- `.gitattributes` exists at root.
- After renormalize + commit: `git status --short` clean on a fresh checkout; no more equal-count `NNNN insert / NNNN delete` doc diffs.

### Anti-pattern guard
Do NOT hand-convert line endings file-by-file. `text=auto` + renormalize does it.

---

## Phase 3 — P2/P3: De-duplicate tree helpers + engine operator source

**Agent**: one bounded builder subagent per item (each 1-2 files). Run sequentially, test between.

### 3a — Single `findRule` / `findParentGroupId`
Two copies each:
- `packages/builder-ui/src/app/builderState.ts:76` (`findRule`), `:95` (`findParentGroupId`)
- `packages/builder-ui/src/composer/queryActions.ts:58` (`findRule`), `:74` (`findParentGroupId`)

Copy the **builderState.ts** versions (they handle the optional-`ruleId` guard) into one home, export, import from the other. Recommend keeping in `queryActions.ts` (data layer). Preserve the `!ruleId` guard — read both before merging; do not silently drop it.

### 3b — Single operator-list source (engine)
`packages/engine/src/operators.ts:21` `isDateComparison` inlines an array already in `OPERATORS_BY_FIELD_TYPE` (`:8`). Derive `isDateComparison` FROM the matrix instead of a copy.

### 3c — Fix tautological test
`packages/engine/src/operatorTypes.test.ts:15` — `expectedOperators` hand-copies the matrix then asserts equality (passes by construction). Replace with behavior assertions (e.g. `isOperatorSupported('dateTime','greaterThan') === true`, unsupported op === false).

### Verification
- `grep -rn "function findRule\|const findRule" packages/builder-ui/src` → 1 definition.
- `grep -rn "findParentGroupId" packages/builder-ui/src` → 1 definition + imports.
- `npm run test` (root) → builder-ui + engine tests green.
- `npm run typecheck` → clean.

### Anti-pattern guard
Do NOT merge the two `findParentGroupId` by picking one blindly — one guards `!ruleId`. Keep the guarded behavior.

---

## Phase 4 — P2: Engine `MISSING_OPERAND` — cover the silent-null path

**Agent**: bounded builder subagent (test-focused).

### Context
`packages/engine/src/formatter.ts:117-119` emits `equals(left, null)` when the right operand is missing. Valid-looking WDL for an invalid rule; only a diagnostic flags it. Untested → callers that ignore diagnostics ship broken conditions.

### What to implement
1. Add a test: rule with missing right operand → assert a `MISSING_OPERAND` diagnostic IS emitted (locks current contract).
2. Same coverage-gap tests (each: build node → assert diagnostic): `EMPTY_GROUP`, `MAX_DEPTH`, `UNKNOWN_FIELD`, `UNSAFE_NULL_STRING_WRAPPER`, `formatLiteral` quote-escaping.

Decision for user: keep `equals(x,null)` emit + diagnostic (current) OR make missing-operand a hard error (no output). Default = keep + test the diagnostic. Flag if hard-fail is wanted.

### Verification
- New tests reference the diagnostic codes above; all pass.
- Deleting the guard in `formatter.ts` makes the matching test RED.

---

## Phase 5 — P4: Dead-code cleanup

**Agent**: bounded builder subagent (deletions only).

### What to remove (verified zero callers in review)
- `packages/engine/src/operators.ts:25` `isStringComparison` — no callers.
- `packages/engine/src/diagnostics.ts:12` `hasError` — unexported, unused (builder-ui's own local `hasError` is unrelated).

### Verification
- `grep -rn "isStringComparison" packages/` → 0 after removal.
- `grep -rn "hasError" packages/engine/src` → 0 after removal.
- `npm run test && npm run typecheck` → clean.

### Anti-pattern guard
Confirm zero references with grep BEFORE deleting each. If any hit, stop.

---

## Phase 6 — Final Verification (orchestrator)

1. `npm run typecheck` → clean.
2. `npm run test` (root, all workspaces) → all green.
3. Regression proof: `grep -c "OptionSet" packages/platform/src/pptbAdapter.ts` == 2.
4. `git status --short` → only intended changes; no CRLF phantom diffs.
5. Dedup proof: single definition each for `findRule`, `findParentGroupId`, `isDateComparison`.
6. Manual smoke (user, PPTB host): a choice column in the expression pane renders a `<select>` of labeled options, not a plain text input. Real-world confirm of P1.

---

## Deferred (not in this plan — flag for later)
- `ExpressionBuilderShell.tsx` (539L, 26 imports) god-component split + integration test. HIGH but large; own planning cycle.
- Untested workbench dialogs, `importExport/fieldProfiles.ts`, `metadataCache.ts`.
- No CI pipeline — tests exist but nothing runs them on push.

## Review (fill after execution)
_(append outcomes here)_
