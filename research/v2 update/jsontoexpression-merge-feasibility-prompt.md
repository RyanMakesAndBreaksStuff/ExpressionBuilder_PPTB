# Research Task: Feasibility of merging jsontoexpression.workappholics.com functionality into ExpressionBuilder

## Objective
Determine whether the JSON-output → Power Automate expression workflow at
https://jsontoexpression.workappholics.com/ is (a) a valid fit for this project,
and (b) how difficult it would be to build natively. Produce an evidence-backed
recommendation, not an implementation.

## Context: current project
`C:\Users\RyanDev\source\repos\ExpressionBuilder` — a monorepo (npm workspaces) that
visually composes **Trigger Condition** and **Filter Array advanced-mode** boolean
expressions (`@and(...)` / `@or(...)` predicates) with live preview and diagnostics.

Layout (verify before relying on it):
- `packages/engine` — pure TS AST, `FieldDefinition`, `FieldType` (string | number |
  boolean | dateTime | choice), formatting rules. Zero UI deps.
- `packages/builder-ui` — Fluent UI v9 composer + workbench.
  - `src/composer/querySchema.ts` (`QueryDocument`, `QueryGroup`, `QueryRule`)
  - `src/app/sourceState.ts` (`applySource`, `discoverCached`, `buildUserField`)
  - `src/importExport/` (`fieldImport.ts`, `jsonSchemaImport.ts`, `inferFromSample.ts`,
    `csvImport.ts`, `savedExpressionSchema.ts`, `metadataCache.ts`)
  - `src/workbench/ImportSchemaDialog.tsx` (4-tab import: Field JSON / Sample / Schema / CSV)
  - `src/components/ExpressionPreview.tsx` (tokenized expression rendering)
- `packages/platform` — `PlatformAdapter` interface (clipboard, notifications,
  Dataverse access); implemented per host.
- `apps/web` (no live Dataverse) and `apps/pptb` (Power Platform Toolbox plugin) —
  thin bootstraps injecting an adapter into `ExpressionBuilderShell`.

Design principles to respect: pure engine, platform abstraction, shared UI,
strict TypeScript, client-side-only processing.

## Target functionality (as described by the site)
1. User supplies an **Action Name** (as used in the flow) and pastes that action's
   sample JSON output — either full **Raw output** or **Body only** (toggle).
2. **Parse JSON** produces a browsable tree of parsed values.
3. Clicking **Use** on a leaf generates a paste-ready expression referencing the
   action output (e.g. `outputs('ActionName')?['body/field']`, or
   `triggerBody()?['...']` style), with a **Raw output / Clean expression** format
   toggle, a copy button, and a syntax-highlighted preview.
4. Claims all processing is in-browser; no data transmitted or stored.

## Research questions

### A. Validity / product fit
1. The current app emits **boolean predicates over a field schema**; the target emits
   **property-access references into a runtime payload**. Do these belong in the same
   product surface, or is this a separate mode/tool? Justify with concrete use cases.
2. Where does it overlap with existing capabilities (`ImportSchemaDialog`'s Sample and
   Field JSON tabs, `inferFromSample`, `ExpressionPreview`, field profiles)? What is
   genuinely net-new vs. a re-skin of what exists?
3. Does adding it strengthen or dilute the Trigger Condition / Filter Array value prop?
   Consider audience: PPTB users vs. standalone web users.

### B. Technical shape (if pursued)
4. What new AST/type constructs are needed? Can property-access expressions be
   represented in `packages/engine` without polluting the existing predicate model?
   Model the minimal type additions and where they live.
5. What is the correct expression grammar for action-output references across:
   trigger body, action body, nested arrays, `?[]` vs `[]`, dots vs slashes in paths,
   and `Raw output` vs `Body only` shapes? Cite authoritative Microsoft docs.
6. How should the JSON tree + "Use" interaction be implemented given Fluent UI v9 —
   reuse an existing control or build one? Identify any new dependency that would be
   required and whether it is acceptable given the repo's dependency posture.
7. Clipboard behavior must go through `PlatformAdapter` — confirm the interface
   supports what's needed in both `apps/web` and `apps/pptb`, and note any gaps.
8. Where does the new code live to respect "pure engine / shared UI / thin host":
   engine grammar vs. `builder-ui/importExport` vs. a new workbench dialog?

### C. Difficulty estimate
9. Produce a work breakdown with per-item size (S/M/L), files touched, and test
   surface. Explicitly call out the riskiest item and why.
10. Identify unknowns requiring a spike (e.g. reverse-engineering exact output shape
    for Raw mode, array/`Apply to each` semantics, edge cases like keys with spaces
    or special characters, `triggerOutputs()` vs `triggerBody()`).
11. State what can be built from the site's *described behavior alone* vs. what needs
    sample outputs or the site's own emitted expressions to confirm.

### D. Constraints, legality, risk
12. Any licensing / IP concern in cloning a competitor's tool behavior? Distinguish
    reimplementing a concept from copying assets or code.
13. Confirm alignment with the "no data leaves the browser" posture.
14. Note backward-compatibility risks to saved profiles, `savedExpressionSchema`, and
    existing tests.

## Required deliverable
A single report containing:
- **Verdict**: merge in-place / separate mode / separate tool / do not build — with
  the 2-3 decisive reasons.
- **Net-new capability table**: target feature → existing equivalent (or "none") →
  gap.
- **Expression grammar reference**: verified syntax patterns with doc citations.
- **Work breakdown**: task, size, files, tests, dependencies, risk.
- **Open questions** needing product input or a spike.
- **Recommendation**: smallest viable version and what to explicitly cut.

## Method and evidence standards
- Read actual code before asserting anything; cite `path:line` for every claim about
  the current app. Key entry points to start from: `ExpressionBuilderShell.tsx`,
  `querySchema.ts`, `sourceState.ts`, `fieldImport.ts`, `ImportSchemaDialog.tsx`,
  `ExpressionPreview.tsx`, `packages/platform/src/PlatformAdapter.ts`.
- Fetch and cite Microsoft Learn for expression syntax and action-output structure.
- Mark every assumption as an assumption and state how to verify it.
- Do not modify code. Research and report only.
- Prefer primary sources over blog posts; flag anything inferred from the target site's
  UI text rather than confirmed behavior.

## Out of scope
Implementation, UI redesign of the existing composer, publishing/ALM changes.