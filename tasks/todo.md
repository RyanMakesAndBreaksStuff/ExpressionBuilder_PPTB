# First UI Mock

## Checklist

- [x] Review `docs/plans/initialplan.html` for stack, scope, and UI requirements.
- [x] Check supporting review/draft docs for terminology and product constraints.
- [x] Create a standalone HTML mock at `docs/mocks/firstmock.html`.
- [x] Verify the mock file exists and contains the expected builder surfaces.

## Design Direction

- First screen is the usable builder, not a landing page.
- Ground the layout in React 18, TypeScript, Vite, Fluent UI v9, `@react-awesome-query-builder/fluent`, a pure TypeScript engine, and platform adapters.
- Show Trigger Condition and Filter Array as mode choices that change field-reference context.
- Make diagnostics, expression preview, copy, import/export, and adapter status visible.

## Review

- Created `docs/mocks/firstmock.html` as a standalone Fluent UI v9-style workbench mock.
- Verification command confirmed the file exists, required stack/product terms are present, content is ASCII-only, and the inline script parses.

---

# Second UI Mock Set

## Checklist

- [x] Review the first mock and documented React web-first UI contract.
- [x] Create one standalone HTML comparison page at `docs/mocks/2ndmocks.html`.
- [x] Include three distinct potential designs grounded in Fluent UI v9 and the planned stack.
- [x] Verify the mock file exists, required product terms are present, content is ASCII-only, and inline scripts parse.

## Design Direction

- Present three alternatives in one document instead of three separate files.
- Keep every option as a usable builder surface, not a landing page.
- Preserve Trigger Condition and Filter Array modes, engine diagnostics, expression preview, copy, import/export, app-owned JSON, and PlatformAdapter boundaries.
- Vary the UX model: dense workbench, canvas-first flow, and review-first validator.

## Review

- Created `docs/mocks/2ndmocks.html` with Workbench Grid, Canvas Flow, and Review Studio alternatives.
- Verification command confirmed the file exists, required stack/product terms are present, content is ASCII-only, and the inline script parses.

---

# Initial Plan Review R1

## Checklist

- [x] Load requested Power Automate and React review skills.
- [x] Read `docs/plans/initialplan.html`.
- [x] Validate Power Automate expression and formatter assumptions.
- [x] Validate React architecture, package, testing, and adapter assumptions.
- [x] Save review artifact to `docs/plans/initialplanR1.html`.
- [x] Verify the review artifact exists and contains the findings.

## Review

- Saved review artifact to `docs/plans/initialplanR1.html`.
- Verdict: plan is directionally valid but not implementation-ready until the critical findings are addressed.
- Critical issues captured: missing shared React app package boundary, non-boolean predicate root validation, type-gated expression operators, RAQB/Fluent UI dependency mismatch, and missing root TypeScript project-reference gate.

---

# Option 1 RAQB Alternatives Review

## Checklist

- [x] Review `docs/plans/initialplan.html` and adjacent review/mock docs for current architecture and UX assumptions.
- [x] Research current RAQB status, Fluent UI guidance, Power Platform aesthetic cues, and credible replacement libraries.
- [x] Compare replacing RAQB with an app-owned Fluent UI composer against reskinning RAQB and using another query-builder package.
- [x] Save the recommendation report to `docs/review/option1.html`.
- [x] Verify the report file exists, contains source links, and calls out the preferred implementation path.

## Review

- Saved the RAQB alternatives report to `docs/review/option1.html`.
- Recommendation: remove `@react-awesome-query-builder/fluent`; prefer an app-owned Fluent UI v9 condition composer backed by the engine AST.
- Fast fallback: spike `react-querybuilder` plus `@react-querybuilder/fluent` because its current Fluent package targets Fluent UI v9.
- Least preferred: complete RAQB reskin, due to the current alpha RAQB Fluent package and Fluent UI v8 peer dependency mismatch.
- Verification confirmed the report exists, is ASCII-only, includes source links, and contains the preferred implementation path.

---

# Design Team Handoff Summary

## Checklist

- [x] Review current implementation plan, mockups, and RAQB alternatives review.
- [x] Draft a design-team oriented project summary.
- [x] Save the summary to `docs/design-handoff-summary.md`.
- [x] Verify the summary exists and is ASCII-only.

## Review

- Saved the design-team handoff brief to `docs/design-handoff-summary.md`.
- The brief targets UI/UX exploration for modern Fluent UI v9 styling, current Power Platform workbench patterns, and the updated app-owned composer direction.
- Verification confirmed the file exists, contains the key handoff terms, and is ASCII-only.

---

# Final Option 1 Theme Pass

## Checklist

- [x] Review Concept C shell and Fluent token inputs.
- [x] Extract Slate / Steel light and dark palette values from the uploaded theme collections.
- [x] Generate `FinalOption1.html` as a standalone Concept C artifact with updated tokens.
- [x] Verify the artifact exists and contains the Slate / Steel light and dark tokens.

## Review

- Updated `docs/mocks/fluent-tokens.css` to use the Slate / Steel palette for light and dark themes.
- Created `docs/mocks/FinalOption1.html` as the named Concept C presentation shell.
- Verification confirmed the final shell exists and the token file contains the Slate / Steel light and dark values.
- Re-verification confirmed `docs/mocks/icons.jsx`, `docs/mocks/parts.jsx`, and `docs/mocks/concept-c.jsx` are present, and `concept-c.jsx` mounts `ConceptC` into `#root`.

---

# Final Option 1 Build Plan

## Checklist

- [x] Review `tasks/lessons.md` before planning.
- [x] Deconstruct `docs/mocks/FinalOption1.html` and its JSX/CSS dependencies into component parts.
- [x] Merge required corrections from `docs/plans/initialplanR1.html`.
- [x] Ground Power Automate expression assumptions in current Microsoft Learn guidance.
- [x] Check current query-builder and Fluent UI package metadata before choosing the UI composer path.
- [x] Create `docs/work/buildplan.md`.
- [x] Verify `docs/work/buildplan.md` has no placeholders and includes the merged source inputs.

## Review

- Build plan target: `docs/work/buildplan.md`.
- Selected direction: app-owned Fluent UI v9 Concept C inspector composer, pure TypeScript expression engine, shared builder UI package, thin web/PPTB bootstraps, and platform adapters.
- Verification found no placeholder markers and confirmed the plan references the final mock, initial plan, R1 review, Microsoft Learn expression behavior, and current npm package metadata.

---

# Final Option 1 Implementation

## Checklist

- [x] Use `superpowers:subagent-driven-development` and project Expression Builder guidance.
- [x] Move the starter app into npm workspaces with root TypeScript references.
- [x] Record the composer decision and implement app-owned query actions.
- [x] Implement the pure expression engine with formatter, diagnostics, field references, date handling, and operator type gates.
- [x] Implement web and Power Platform Toolbox platform adapters.
- [x] Build the shared Fluent UI v9 builder shell, composer panes, inspector, import/export, diagnostics, and theme tokens.
- [x] Add web and PPTB app bootstraps.
- [x] Add e2e and boundary verification.
- [x] Update architecture, adapter, cookbook, deployment, and README docs.
- [x] Run final lint, typecheck, unit tests, builds, and e2e verification.

## Execution Notes

- Branch: `codex/final-option-1-builder`.
- Source plan: `docs/work/buildplan.md`.
- Selected path: app-owned Fluent UI v9 Concept C composer backed by one pure TypeScript expression engine.

## Review

- Implemented the workspace, engine, platform adapters, shared builder UI, web/PPTB bootstraps, E2E checks, and docs from `docs/work/buildplan.md`.
- Final verification passed: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build:web`, `npm run build:pptb`, and `npm run test:e2e`.

---

# Final Option 1 Task 3 Expression Engine

## Checklist

- [x] Review `tasks/lessons.md`, `docs/work/buildplan.md`, and current `packages/engine` shell.
- [x] Implement canonical engine types, formatter entrypoint, diagnostics, field references, literals, functions, and operators.
- [x] Add exact formatter tests for Trigger Condition, Filter array, nested groups, field paths, date ticks, and case-insensitive string checks.
- [x] Add invalid predicate-root diagnostics for function, field, string literal, and number literal roots in both modes.
- [x] Add operator type-gating tests for supported field/operator combinations and invalid empty checks.
- [x] Run `npm test -w @pavb/engine`.
- [x] Run `npm run build -w @pavb/engine`.

## Review

- Implemented the pure engine modules for canonical AST types, field references, literals, function metadata, operator gates, formatting, and diagnostics.
- Added formatter, filter array, operator type-gating, and predicate-root tests under `packages/engine/test`.
- Added the package-level `test` script required for `npm test -w @pavb/engine`.
- Verification passed: `npm test -w @pavb/engine` with 4 files and 20 tests.
- Verification passed: `npm run build -w @pavb/engine`.

---

# Final Option 1 Task 1-2 Package Shell

## Checklist

- [x] Review `tasks/lessons.md` and `docs/work/buildplan.md`.
- [x] Convert root package to npm workspaces with the Task 1 script contract.
- [x] Add root and package TypeScript project references with declaration emit.
- [x] Create minimal app, engine, platform, and builder-ui package shells.
- [x] Record the app-owned composer decision in `docs/work/composer-decision.md`.
- [x] Implement immutable `QueryDocument` actions and exports.
- [x] Add query action tests for add, update, delete, duplicate, move, select, and conjunction changes.
- [x] Install missing dependencies from the plan.
- [x] Run `npm test -w @pavb/builder-ui` and `npm run typecheck`.

## Review

- Converted the root package to npm workspaces with `apps/*` and `packages/*`, plus the Task 1 script contract.
- Added directional TypeScript references: engine/platform have none, builder-ui references engine/platform, and apps reference builder-ui/platform.
- Added minimal package shells for web, PPTB, engine, platform, and builder-ui.
- Recorded the composer decision at `docs/work/composer-decision.md`.
- Implemented pure immutable query actions in `packages/builder-ui/src/composer/queryActions.ts`.
- Added query action tests in `packages/builder-ui/test/queryActions.test.ts`.
- Verification passed: `npm test -w @pavb/builder-ui`, `npm run typecheck`, and `npm run lint`.

---

# Final Option 1 Task 4 Platform Adapters

## Checklist

- [x] Review `tasks/lessons.md` and `docs/work/buildplan.md`.
- [x] Define the public platform adapter contract and exports.
- [x] Implement the browser adapter with isolated clipboard, storage, and theme APIs.
- [x] Implement the Power Platform Toolbox adapter with defensive optional API support and sample-field fallback.
- [x] Add platform adapter unit tests for clipboard, storage, theme changes, notifications, settings, and PPTB fallback.
- [x] Run `npm test -w @pavb/platform`.
- [x] Run `npm run build -w @pavb/platform`.

## Review

- Implemented the platform adapter contract, web adapter, PPTB adapter, and unit tests.
- Added the package-level `test` script required for `npm test -w @pavb/platform`.
- `npm test -w @pavb/platform` passed.
- `npm run build -w @pavb/platform` passed.
- Boundary search confirmed `navigator.clipboard`, `localStorage`, and `matchMedia` source usage is isolated to `packages/platform/src/webAdapter.ts`, and `toolboxAPI` source usage is isolated to `packages/platform/src/pptbAdapter.ts`.

---

# Final Option 1 Task 5 Shared Builder UI

## Checklist

- [x] Review `tasks/lessons.md`, `docs/work/buildplan.md`, current builder-ui contracts, engine formatter, and platform adapter.
- [x] Port Slate / Steel tokens into `packages/builder-ui/src/theme/tokens.css`.
- [x] Add state helpers to derive engine AST/diagnostics from `QueryDocument` without persisting generated expressions.
- [x] Build the Concept C shell, command bar, field pane, master condition pane, inspector, diagnostics, expression preview, and validation bar.
- [x] Add import/export validation for `version`, `mode`, `fields`, and `root`.
- [x] Add UI tests for mode keyboard switching, preview mode context, field search, inspector selection, value editing, case-insensitive fix, import/export drift, and aria-live diagnostics.
- [x] Run `npm test -w @pavb/builder-ui`.
- [x] Run `npm run build -w @pavb/builder-ui`.

## Execution Notes

- Ownership is limited to `packages/builder-ui/src/**`, `packages/builder-ui/test/**`, and this task tracker unless a compile error proves another edit is necessary.
- State source of truth is `QueryDocument`; formatted expressions are derived through `@pavb/engine`.
- Operator options are filtered from engine metadata by selected field type.

## Review

- Implemented the shared builder shell and component set using the Concept C master-detail layout and Slate / Steel tokens.
- Added state derivation from `QueryDocument` to engine AST, import/export validation, responsive CSS, and UI accessibility affordances.
- Verification passed: `npm test -w @pavb/builder-ui` and `npm run build -w @pavb/builder-ui`.

---

# UI/UX Pro Max Alternative Designs

## Checklist

- [x] Confirm `docs/redesign/uiuxPRO/` target directory exists.
- [x] Create `alt_design_1.html` — Microsoft Fluent-inspired three-pane workbench.
- [x] Create `alt_design_2.html` — Clean Minimal mobile-first builder.
- [x] Create `alt_design_3.html` — Dark Pro Console builder.
- [x] Create `alt_design_4.html` — Warm Card Composer builder.
- [x] Create `alt_design_5.html` — Split Workbench professional builder.
- [x] Verify all files use React 18.3.1 + ReactDOM 18.3.1 + Babel standalone from unpkg.
- [x] Verify no external UI frameworks (Tailwind, Bootstrap, Fluent UI library, MUI, etc.).
- [x] Verify no emoji characters are used as icons or labels.

## Design Direction

- Keep every prototype as a usable builder surface, not a landing page.
- Each file is a standalone static HTML page with in-browser JSX transpilation; no build step required.
- All prototypes target average-intelligence Power Automate users: clear labels, progressive disclosure, accessible contrast, and inline SVG icons.
- Shared interactions across concepts: Trigger condition / Filter array mode toggle, light/dark theme toggle, live WDL expression preview, copy-to-clipboard feedback, and add-rule/group actions.

## Review

- Created five alternative design prototypes in `docs/redesign/uiuxPRO/`:
  - `alt_design_1.html` — Microsoft Fluent-inspired three-pane workbench.
  - `alt_design_2.html` — Clean Minimal mobile-first builder.
  - `alt_design_3.html` — Dark Pro Console builder.
  - `alt_design_4.html` — Warm Card Composer builder.
  - `alt_design_5.html` — Split Workbench professional builder.
- Verification confirmed React 18.3.1 and Babel standalone CDN usage, no forbidden UI frameworks, no emoji usage, and file sizes ranging from 19KB to 34KB.

---

# UI/UX Concept Set 2

## Checklist

- [x] Create `docs/uiux/` target directory.
- [x] Create `concept_1.html` — Glassmorphism builder.
- [x] Create `concept_2.html` — Aurora UI builder.
- [x] Create `concept_3.html` — Inclusive design builder.
- [x] Create `concept_4.html` — Dimensional layering builder.
- [x] Create `concept_5.html` — Bento grids builder.
- [x] Verify all files use React 18.3.1 + ReactDOM 18.3.1 + Babel standalone from unpkg.
- [x] Verify no external UI frameworks.
- [x] Verify no emoji characters.
- [x] Verify light/dark theme toggle via `data-theme`.
- [x] Verify hover tooltips on icon-only buttons and compact labels.
- [x] Verify distinct focus states for keyboard users.

## Design Direction

- Each concept targets a specific visual language: glassmorphism, aurora UI, inclusive design, dimensional layering, bento grids.
- All prototypes remain standalone static HTML pages with in-browser JSX transpilation; no build step required.
- Shared interactions: Trigger condition / Filter array mode toggle, live WDL expression preview, copy-to-clipboard feedback, add-rule/group actions, searchable field list, diagnostics panel.
- A11y focus: visible focus rings/outlines, skip links where applicable, `aria-label` on icon-only controls, and `prefers-reduced-motion` awareness.

## Review

- Created five new design concepts in `docs/uiux/`:
  - `concept_1.html` — Glassmorphism (frosted translucent panels, backdrop blur, soft gradients).
  - `concept_2.html` — Aurora UI (animated flowing gradients, organic orbs, ethereal glow).
  - `concept_3.html` — Inclusive design (high contrast, 48px touch targets, strong focus outlines, explicit labels).
  - `concept_4.html` — Dimensional layering (stacked planes, elevation shadows, 3D-transform cards).
  - `concept_5.html` — Bento grids (modular tile dashboard, varied card sizes, rounded widgets).
- Verification confirmed React 18.3.1 CDN usage, no forbidden UI frameworks, zero emoji characters, light/dark `data-theme` toggle, tooltip references on every file, and focus-visible/focus state references on every file.
- File sizes range from 33KB to 47KB.

---

# UI/UX Try-These Design Set

## Checklist

- [x] Review `ui-ux/try-these.md` for the six requested alternative design concepts.
- [x] Create `ui-ux/design/design_1.html` — Node-Based & Flow UI (DAGs).
- [x] Create `ui-ux/design/design_2.html` — Form-Centric Split Pane (Master-Detail).
- [x] Create `ui-ux/design/design_3.html` — "No-Code" Spreadsheet / Data-Grid Hybrid.
- [x] Create `ui-ux/design/design_4.html` — "Subdued Developer" Style (Linear Node Blocks).
- [x] Create `ui-ux/design/design_5.html` — Native Enterprise Style (Microsoft-Adjacent).
- [x] Create `ui-ux/design/design_6.html` — Canvas-First Style (Visual Graphs).
- [x] Verify all six files use React 18.3.1 UMD + ReactDOM 18.3.1 UMD + Babel 7.29.0 standalone from unpkg.
- [x] Verify no external UI frameworks and no emoji characters.
- [x] Verify shared interactions: Trigger condition / Filter array mode toggle, light/dark theme toggle, live WDL preview, copy-to-clipboard feedback, add rule/group actions, searchable field list, diagnostics panel.

## Design Direction

- Each prototype is grounded in the six concepts listed in `ui-ux/try-these.md`.
- All files are standalone static HTML pages with in-browser JSX transpilation; no build step required.
- Each concept emphasizes a different UX model for the same Power Automate expression-building domain.
- Shared data model and sample expression mirror the real builder: 8 sample fields and `@and(equals(triggerBody()?['Status'], 'Approved'), contains(triggerBody()?['Approver'], 'finance'), or(equals(triggerBody()?['Region'], 'EMEA'), greater(triggerBody()?['Amount'], 5000)))`.

## Review

- Created six alternative design prototypes in `ui-ux/design/`:
  - `design_1.html` — Node-Based & Flow UI (DAGs): left field palette, center node canvas with SVG bezier wires, right property drawer.
  - `design_2.html` — Form-Centric Split Pane (Master-Detail): left condition tree, right configuration drawer, bottom expression preview bar.
  - `design_3.html` — Spreadsheet / Data-Grid Hybrid: full-width rule grid with Group/Field/Operator/Value/Actions columns and formula bar.
  - `design_4.html` — Subdued Developer Style: dark-mode-first linear node blocks with color-coded AND/OR indentation tracks.
  - `design_5.html` — Native Enterprise Style: Fluent-like 3-pane shell with white surfaces, gray borders, rounded corners, and colorful token pills.
  - `design_6.html` — Canvas-First Style: infinite pan/zoom dot-grid canvas, floating node cards, SVG connectors, mini-map, and zoom controls.
- Verification confirmed 6 files present, all using React 18.3.1 + ReactDOM 18.3.1 development UMD + Babel 7.29.0, `ReactDOM.createRoot`, `data-theme` toggle, trigger/filter mode, clipboard copy, and diagnostics.
- File sizes range from 33KB to 67KB.

---

# UI/UX Alternative Concepts — Round 3

## Checklist

- [x] Review existing prototypes in `docs/uiux/`, `docs/redesign/`, and `docs/redesign/uiuxPRO/` to avoid clones.
- [x] Invent six new, unique concepts distinct from existing styles.
- [x] Create `ui-ux/design/design_1.html` — Conversation-Guided Builder.
- [x] Create `ui-ux/design/design_2.html` — Command-Palette Builder.
- [x] Create `ui-ux/design/design_3.html` — Timeline Step Builder.
- [x] Create `ui-ux/design/design_4.html` — Board Column Builder.
- [x] Create `ui-ux/design/design_5.html` — Inline Document Builder.
- [x] Create `ui-ux/design/design_6.html` — HUD Overlay Builder.
- [x] Verify all six files use React 18 UMD + ReactDOM 18 UMD + Babel standalone from unpkg.
- [x] Verify no external UI frameworks and no emoji characters.
- [x] Verify light/dark theme toggle via `data-theme`.
- [x] Verify trigger/filter mode toggle, live expression preview, copy-to-clipboard feedback, and diagnostics.

## Design Direction

- All concepts avoid the existing catalog: Glassmorphism, Aurora UI, Card Composer, Clean Minimal, Inclusive Design, Dark Pro Console, Dimensional, Fluent Design, Split Workbench, Inline Row Builder, Three-Pane Workbench, Outline Sentence Builder, Neon Noir, Warm Clay, Nordic Frost, Brutalist, Forest, Bento Grid, Node-Based Flow, Form-Centric Split Pane, Spreadsheet Hybrid, Subdued Developer, Native Enterprise, and Canvas-First.
- No brutalism or typography-as-identity styles.
- Each prototype is a standalone static HTML page with in-browser JSX transpilation and no build step.
- Shared domain model: 8 sample fields, Trigger Condition vs Filter Array modes, and the canonical sample expression `@and(equals(triggerBody()?['Status'], 'Approved'), contains(triggerBody()?['Approver'], 'finance'), or(equals(triggerBody()?['Region'], 'EMEA'), greater(triggerBody()?['Amount'], 5000)))`.

## Review

- Created six alternative design prototypes in `ui-ux/design/`:
  - `design_1.html` — Conversation-Guided Builder: chat-thread interface with message bubbles for rules and a live reply preview.
  - `design_2.html` — Command-Palette Builder: VS Code-style spotlight search drives rule construction.
  - `design_3.html` — Timeline Step Builder: vertical/horizontal timeline steps for clauses and groups.
  - `design_4.html` — Board Column Builder: Kanban-style columns for AND/OR groups with rule cards.
  - `design_5.html` — Inline Document Builder: rich-document sentence composer with inline token chips.
  - `design_6.html` — HUD Overlay Builder: heads-up display with floating translucent panels around a central preview.
- Verification confirmed 6 files present, all using React 18 + ReactDOM 18 + Babel standalone, `ReactDOM.createRoot`, `data-theme` toggle, trigger/filter references, clipboard copy, and diagnostics. No emoji characters detected.

---

# UI/UX Alternative Concepts — Round 4 (design2_*)

## Checklist

- [x] Review current project UI/UX purpose and existing prototypes to avoid clones.
- [x] Create `ui-ux/design/design2_1.html` — Forest Bento (blend of `docs/redesign/new_design2_5.html` palette/typeface + `docs/uiux/concept_5.html` bento-grid layout).
- [x] Create `ui-ux/design/design2_2.html` — Fluent Outline (BDesktop expression-builder widgets in a ConceptE-like readable outline layout).
- [x] Create `ui-ux/design/design2_3.html` — Solarized Studio (tabbed workspace with collapsible panels).
- [x] Create `ui-ux/design/design2_4.html` — Lavender Circuit (vertical circuit-board node flow with SVG connections).
- [x] Create `ui-ux/design/design2_5.html` — Warm Paper (scrollable document editor with inline token chips).
- [x] Create `ui-ux/design/design2_6.html` — Deep Space (orbital HUD with floating glass panels).
- [x] Verify all six files use React 18 UMD + ReactDOM 18 UMD + Babel standalone from unpkg.
- [x] Verify no external UI frameworks and no emoji characters.
- [x] Verify light/dark theme toggle via `data-theme`.
- [x] Verify trigger/filter mode toggle, live expression preview, copy-to-clipboard feedback, and diagnostics.

## Design Direction

- `design2_1` merges the forest palette and rounded pill shapes from `new_design2_5` with the bento tile structure, tiered shadows, and syntax highlighting from `concept_5`.
- `design2_2` inlines the Fluent token system, icon glyphs, and widget patterns from `BDesktop.html`/`ConceptE.html` into a single standalone readable-outline builder.
- The remaining four concepts avoid brutalism and typography-as-identity styles; each explores a fresh UX model and visual language distinct from the existing catalog.
- All files are standalone static HTML pages with in-browser JSX transpilation and no build step.
- Shared domain model: 6 sample fields, Trigger Condition vs Filter Array modes, and the canonical sample expression `@and(equals(triggerBody()?['Status'],'Approved'),or(equals(triggerBody()?['Region'],'EMEA'),equals(triggerBody()?['Region'],'APAC')),greater(triggerBody()?['Amount'],5000),less(triggerBody()?['DueDate'],addDays(utcNow(),7)))`.

## Review

- Created six alternative design prototypes in `ui-ux/design/`:
  - `design2_1.html` — Forest Bento: 3-column bento grid, 18 px tile radius, moss/fern/bark/cream palette, Work Sans + Fira Code.
  - `design2_2.html` — Fluent Outline: Slate/Steel Fluent tokens, icon-based type glyphs, three-pane outline builder with inspector.
  - `design2_3.html` — Solarized Studio: Solarized Base16 palette, Source Sans Pro + Source Code Pro, tabbed workspace.
  - `design2_4.html` — Lavender Circuit: lavender/indigo palette, Manrope + Space Mono, SVG bezier circuit connections.
  - `design2_5.html` — Warm Paper: warm editorial palette, Merriweather + IBM Plex Mono, document-style prose builder.
  - `design2_6.html` — Deep Space: space-blue palette, Exo 2 + JetBrains Mono, orbital HUD with glass panels.
- Verification confirmed 6 files present, all using React 18 + ReactDOM 18 + Babel standalone, `ReactDOM.createRoot`, `data-theme` toggle, trigger/filter references, clipboard copy, and diagnostics. No emoji characters detected.

---

# UI/UX Alternative Concepts — Round 5 (design3_*)

## Checklist

- [x] Combine the Dataverse native view filter style expression builder with the larger diagnostics section from `ui-ux/design/design2_2.html`.
- [x] Use the bento-grid three-column layout from `ui-ux/design/design2_1.html`.
- [x] Avoid the green-based dark theme of `design2_1`; prioritize high-contrast dark palettes.
- [x] Ensure visible focus states for keyboard navigation on every interactive element.
- [x] Add hover tooltips explaining the purpose of components across all prototypes.
- [x] Ground all five concepts in React 19.
- [x] Experiment with Fluent UI styling in at least one concept.
- [x] Create `ui-ux/design/design3_1.html` — Fluent Bento.
- [x] Create `ui-ux/design/design3_2.html` — Midnight Aurora.
- [x] Create `ui-ux/design/design3_3.html` — Warm Slate.
- [x] Create `ui-ux/design/design3_4.html` — Deep Indigo.
- [x] Create `ui-ux/design/design3_5.html` — Graphite Amber.
- [x] Verify all five files use React 19 ESM (`react@19.0.0`, `react-dom@19.0.0/client`) + Babel standalone from esm.sh.
- [x] Verify JSX compiles cleanly via `@babel/standalone` classic runtime.
- [x] Verify no external UI frameworks and no emoji characters.
- [x] Verify light/dark theme toggle via `data-theme`.
- [x] Verify trigger/filter mode toggle, live WDL expression preview, copy-to-clipboard feedback, and diagnostics.

## Design Direction

- All five concepts keep the same bento workspace structure: header bar, left field/wrapper tiles, center builder + expression preview, right diagnostics + context.
- `design3_1` is the Fluent UI concept: Segoe UI, Fluent blue brand `#0f6cbd`, slate surfaces, 4 px radii, subtle shadows, and inline SVG icons.
- The remaining four concepts use non-green dark palettes chosen for strong contrast: violet/cyan aurora, rust/warm slate, indigo/navy, and graphite/amber.
- Rule rows are styled after Dataverse native view filters: drag grip, field pill, operator pill, value input, optional function wrapper pill, duplicate/delete actions, and AND/OR group headers.
- The diagnostics tile is expanded with multiple items (valid, warning, info, tip) and optional line references.
- Tooltips are implemented with `data-tip` attributes + CSS pseudo-elements (or native `title`) so every button, pill, chip, select, input, and rule row explains its purpose on hover.
- Keyboard focus is made explicit with `:focus-visible` rings using the theme focus color.
- All files are standalone static HTML pages with in-browser JSX transpilation; no build step required. React 19 is loaded via esm.sh because React 19 no longer ships UMD builds.
- Shared domain model: 6 sample fields, Trigger Condition vs Filter Array modes, and the canonical sample expression `@and(equals(triggerBody()?['Status'],'Approved'),or(equals(triggerBody()?['Region'],'EMEA'),equals(triggerBody()?['Region'],'APAC')),greater(triggerBody()?['Amount'],5000),less(triggerBody()?['DueDate'],addDays(utcNow(),7)))`.

## Review

- Created five alternative design prototypes in `ui-ux/design/`:
  - `design3_1.html` — Fluent Bento: 563 lines, Segoe UI + Cascadia Code, Fluent blue/slate palette, Dataverse-style rule rows, expanded diagnostics.
  - `design3_2.html` — Midnight Aurora: 546 lines, deep slate + violet/cyan accents, aurora header gradient.
  - `design3_3.html` — Warm Slate: 542 lines, Merriweather + IBM Plex Mono, rust/warm sand palette.
  - `design3_4.html` — Deep Indigo: 545 lines, indigo/navy palette with periwinkle accents.
  - `design3_5.html` — Graphite Amber: 671 lines, near-black graphite + amber/gold accents.
- Verification confirmed 5 files present, React 19 ESM imports, `createRoot`, `data-theme` toggle, trigger/filter references, `navigator.clipboard.writeText`, diagnostics, visible focus states, hover tooltips, and zero emoji characters.
- JSX in all five files compiles successfully with `@babel/standalone` classic runtime.
- No local external CSS/JS references detected.

---

# UI/UX Alternative Concepts — Round 6 (focused_*)

## Checklist

- [x] Apply the Midnight Aurora color palette from `ui-ux/design/design3_2.html` to three new designs based on `ui-ux/design/design3_3.html`.
- [x] Build a smart value editor that renders a choice `<select>` when the selected field type is `choice`.
- [x] Display dynamic-content items as FieldName + fieldDetail + fieldType.
- [x] Ensure all major display containers account for overflow with vertical scrollbars.
- [x] Make every design responsive so no pane scrolls until its content requires it.
- [x] Create three Aurora-themed focused designs: `focused_1.html`, `focused_2.html`, `focused_3.html`.
- [x] Create three WinUI/WPF Windows 11 concepts: `focused_4.html`, `focused_5.html`, `focused_6.html`.
- [x] Ground all six concepts in React 19 ESM (`react@19.0.0`, `react-dom@19.0.0/client`) + Babel standalone from esm.sh.
- [x] Verify JSX compiles cleanly via `@babel/standalone` classic runtime.
- [x] Verify no external UI frameworks and no emoji characters.
- [x] Verify light/dark theme toggle via `data-theme`.
- [x] Verify trigger/filter mode toggle, live WDL expression preview, copy-to-clipboard feedback, and diagnostics.

## Design Direction

- `focused_1.html` — Aurora Slate: merges the design3_2 violet/cyan palette with design3_3's Merriweather + IBM Plex Mono typography and 18 px rounded bento layout.
- `focused_2.html` — Aurora Pill: uses the design3_2 palette and Inter + JetBrains Mono fonts with pill-token rule rows and a compact choice value dropdown.
- `focused_3.html` — Aurora Compact: dense 12 px UI, 10 px tile radius, code-first preview panel, same Aurora palette.
- `focused_4.html` — WinUI Mica: Windows 11 / WinUI 3 styling with Segoe UI Variable, system accent `#0067C0`, 8 px corners, Mica layered surfaces, segmented mode control.
- `focused_5.html` — WinUI Acrylic: acrylic blur left NavigationView pane, reveal-style hover gradients, accent `#0078D4`, 8 px corners.
- `focused_6.html` — WPF Docking: dark graphite chrome, docked panes with tab strips, docking grip handles, document-style bottom preview panel, accent `#0078D4`.
- All six files are standalone static HTML pages with in-browser JSX transpilation; no build step required.
- Shared domain model: 6 sample fields with `detail` and `choices` arrays, Trigger Condition vs Filter Array modes, and the canonical sample expression `@and(equals(triggerBody()?['Status'],'Approved'),or(equals(triggerBody()?['Region'],'EMEA'),equals(triggerBody()?['Region'],'APAC')),greater(triggerBody()?['Amount'],5000),less(triggerBody()?['DueDate'],addDays(utcNow(),7)))`.

## Review

- Created six alternative design prototypes in `ui-ux/design/`:
  - `focused_1.html` — Aurora Slate: 682 lines, Merriweather + IBM Plex Mono + system UI, design3_2 palette, Dataverse-style native-select rule rows.
  - `focused_2.html` — Aurora Pill: 605 lines, Inter + JetBrains Mono, design3_2 palette, pill-token rule rows with choice dropdown.
  - `focused_3.html` — Aurora Compact: 591 lines, compact 12 px UI, Inter + JetBrains Mono, design3_2 palette, prominent code preview.
  - `focused_4.html` — WinUI Mica: 602 lines, Segoe UI Variable, system accent `#0067C0`, 8 px rounded Mica surfaces.
  - `focused_5.html` — WinUI Acrylic: 657 lines, acrylic blur NavigationView, reveal hover, accent `#0078D4`.
  - `focused_6.html` — WPF Docking: 616 lines, dark graphite chrome, tabbed docked panes, document-style preview panel.
- Verification confirmed 6 files present, all using React 19 ESM imports, `createRoot`, `data-theme` toggle, trigger/filter references, `navigator.clipboard.writeText`, choice value selectors, and diagnostics.
- JSX in all six files compiles successfully with `@babel/standalone` classic runtime.
- Emoji scan and local-external-reference scan both returned zero for every file.
- Required-string checks confirmed React 19, `createRoot`, `data-theme`, clipboard copy, `triggerBody()`, `item()` context, and `choices` arrays in all six files.

---

# UI/UX Focused Merge With Docked Palette Review

## Checklist

- [x] Review `ui-ux/design/focused_1.html`, `ui-ux/design/focused_6.html`, and `ui-ux/design/Proto/DesiredLayout.jpg`.
- [x] Keep the primary composition and builder density from `focused_1.html`.
- [x] Add docked-pane headers/tab treatment from `focused_6.html` to the dynamic content and right-side support panes.
- [x] Keep diagnostics and mode context visible together instead of tabbing them away.
- [x] Present multiple curated light and dark palette choices in one standalone review artifact.
- [x] Create `ui-ux/design/focused_7.html`.
- [x] Verify the file exists, is ASCII-only, contains the requested merged sections, and its JSX transpiles.

## Design Direction

- Preserve the rounded three-column workbench and strong expression-builder focus from `focused_1.html`.
- Dock the left toolbox and the right support stack using WPF-style pane headers and grips from `focused_6.html`.
- Keep the `focused_6.html` dynamic-content row treatment and the larger diagnostics footprint visible at the same time as the mode-context panel.
- Replace the old single-theme approach with six switchable palettes: three light and three dark.

## Review

- Created `ui-ux/design/focused_7.html` as a standalone merged review artifact instead of overwriting the earlier focused studies.
- The new design keeps the `focused_1.html` layout and builder weight, adds `focused_6.html` docked pane chrome, keeps diagnostics and mode context visible together, and adds six switchable palettes.
- Verification passed via a local Node + TypeScript check for file presence, required merged-section strings, ASCII-only content, and JSX transpilation.

---

# UI/UX Focused Merge Follow-Up (focused_7_2)

## Checklist

- [x] Review `ui-ux/design/focused_7.html` and the follow-up edit requests.
- [x] Set Porcelain as the settled default palette.
- [x] Merge diagnostics and mode context into one right-side tabbed pane.
- [x] Add collapse / expand controls for both side dock panes.
- [x] Make the center builder expand and contract with the side-dock state.
- [x] Save the next artifact as `ui-ux/design/focused_7_2.html`.
- [x] Verify the new file contains the requested dock behaviors, is ASCII-only, and its JSX transpiles.
- [x] Extend the left dock to match the right dock's full-height behavior.
- [x] Add vertical collapse / expand for the document panel using the same timing model as the side docks.

## Design Direction

- Keep the Porcelain family as the default visible palette while preserving the palette selector for review.
- Replace the always-visible right stack with one dock pane that tabs between Diagnostics and Mode Context, matching the left-pane tab pattern.
- Use slim vertical collapsed rails for both side docks so the builder gains horizontal room instead of keeping dead gutter space.

## Review

- Created `ui-ux/design/focused_7_2.html` as the Porcelain-settled follow-up artifact.
- The new file combines Diagnostics and Mode Context into one tabbed support pane, adds left and right dock collapse rails, and makes the builder column expand or contract by changing the grid dock widths.
- The left dock now matches the right dock's full-height flex behavior, and the document panel can collapse into its header strip with a vertical slide using the same 220 ms timing model as the side docks.
- Verification passed via a local Node + TypeScript check for required dock-behavior strings, Porcelain default state, ASCII-only content, and JSX transpilation.
