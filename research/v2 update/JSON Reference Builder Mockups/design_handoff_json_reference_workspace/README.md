# Handoff: JSON Reference Workspace (option 1a)

## Overview
The feature adds a second builder, **JSON reference**, to the Power Automate Expression Builder, next to the existing **Condition builder**. The user:
1. pastes a sample output from a flow run;
2. says where it came from: an Action (and its name) or the Trigger, and whether they pasted the Full output or the Body only;
3. selects any value in a tree;
4. copies the reference expression, for example `outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']`.

The user switches between the two builders with tabs in the app header. The condition document is never changed by this feature.

The scope follows `docs/research/jsontoexpression-merge-feasibility.md`:
- It is a separate utility, not a third `ExpressionMode`.
- No schema migration and no new runtime dependency.
- Nothing is persisted and no network calls are made.

This handoff uses the **1a** direction the user picked: the feature gets its own workspace inside the existing shell. It is not a dialog (1b) and not a Details-panel tab (1c).

## About the design files
The files in this bundle are **design references built in HTML**. They are prototypes that show the intended look and behaviour; they are not production code to copy. Rebuild the design inside the existing monorepo:
- **Stack:** React + TypeScript + Fluent UI v9 in `packages/builder-ui`.
- **Styling:** the Graphite token CSS in `packages/builder-ui/src/theme/tokens.css` / `workbenchTokens.ts`. Use its existing `eb-*` classes and add new classes there; do not port the inline styles.
- **Clipboard:** the `PlatformAdapter` (`packages/platform`).

Open `JSON Reference Workspace.dc.html` in a browser; it needs `support.js` beside it. The prototype is interactive: parsing, the tree, keyboard navigation, source choices, copy format and copy all work.

## Fidelity
**High-fidelity.** Colours, type, radii, spacing and pane chrome are taken from the repo's Graphite Light tokens and `tokens.css`. Match them exactly by reusing the existing classes:
- `eb-dock-pane`, `eb-pane-chrome`, `eb-pane-title`
- `eb-canvas-card`, `eb-preview-card`, `eb-preview`
- `eb-action-btn`, `eb-segmented`, `eb-logic-pill`
- `eb-field-type-badge`, `eb-input`, `eb-textarea`, `eb-label`, `eb-copy-state`

Dark mode comes for free from the same variables (`graphiteDark`). The prototype only shows light mode.

The Condition builder view in the prototype is a **simplified stand-in** for the existing shell. Keep the real `ExpressionBuilderShell` workspace unchanged.

---

## Architecture (where code goes)

| Concern | Location | Notes |
| --- | --- | --- |
| Reference formatter | `packages/engine/src/fieldReferences.ts` → export `formatPayloadReference(ref)` from `index.ts` | Shape below. Returns the bare expression (no `@`). Do not touch `formatExpression`, `ExpressionNode`, `ExpressionMode`, `FieldDefinition`, `QueryDocument`. |
| Payload parse + limits | new `packages/builder-ui/src/importExport/jsonPayload.ts` + test | Native `JSON.parse`, then limits: 1 MiB, 10,000 nodes, depth 64. Keeps typed paths `(string \| number)[]`. A key `"0"` stays a string. |
| Workspace UI | new `packages/builder-ui/src/workbench/JsonReferenceWorkspace.tsx` (+ `JsonSourcePane.tsx`, `PayloadTree.tsx`, `ReferencePanel.tsx` if preferred) | Internal to builder-ui; not exported from `index.ts`. |
| Builder switch | `WorkbenchHeader.tsx` + `ExpressionBuilderShell.tsx` | New shell state `builderView: 'condition' \| 'jsonReference'`. This is **not** `ExpressionMode`. `ModeSegmentedControl`, Import and Export render only when `builderView === 'condition'`. |
| Syntax highlight | `components/ExpressionPreview.tsx` | Add `outputs\|body\|triggerOutputs\|items` to both function regexes. Make the string regex accept doubled apostrophes: `'(?:[^']\|'')*'`. Display-only change. |
| Copy | `adapter.copyToClipboard(text)` | Reuse. The feasibility doc recommends making `pptbAdapter.copyToClipboard` **reject** when the host API is missing (it currently resolves silently), and updating its test. |

```ts
type PayloadReferenceRoot =
  | { kind: 'triggerBody' | 'triggerOutputs' }
  | { kind: 'body' | 'outputs'; actionName: string };
interface PayloadReference { root: PayloadReferenceRoot; path: readonly (string | number)[] }
export function formatPayloadReference(ref: PayloadReference): string;
// root: triggerBody() | triggerOutputs() | body('<name>') | outputs('<name>')
// string segment → ?['<seg with ' doubled>']   number segment → [n]
// empty path → the root itself (objects, arrays and null are all selectable)
```

How the Source controls map to the root:

| Output from | The pasted JSON is | Root |
| --- | --- | --- |
| Action | Full output | `outputs('<Name_with_underscores>')` |
| Action | Body only | `body('<Name_with_underscores>')` |
| Trigger | Full output | `triggerOutputs()` |
| Trigger | Body only | `triggerBody()` |

Action name normalisation: `name.trim().replace(/\s+/g, '_')`, then apostrophes are doubled.

**Never infer** the source from the sample. A top-level key called `body` must not change the root or add a segment; it only shows a hint (see States).

**Do not** call `applySource` or write the payload to settings, profiles or the metadata cache. Switching views must leave `document`, `mode`, `fields`, the generated predicate and the exported JSON byte-identical.

---

## Screens / views

### A. App header (both views)
- The existing `.eb-workbench-header`: sticky, `padding: 12px 18px`, `border-bottom: 1px solid var(--border)`, `background: var(--panel)`, `backdrop-filter: blur(18px)`.
- Brand block unchanged: 34×34 brand mark, radius 12px, `linear-gradient(135deg, var(--accent), var(--accent-2))`. Title "Power Automate Expression Builder" 1.08rem/700/-0.03em. Subtitle "For Triggers and Filters" 0.82rem `--text3`.
- **New: builder tabs**, directly after the brand.
  - Container: `padding-left: 16px; border-left: 1px solid var(--border)`. The tabs stretch to the full header height.
  - Tab: `padding: 0 12px`, 0.85rem/700, `white-space: nowrap`, min height 44px.
  - Inactive colour `--text3`, hover `--text`, selected `--text` with a `border-bottom: 3px solid var(--accent)`.
  - Icons, 15px, from `BuilderIcons.tsx`: `BuilderIcon` (pencil) for "Condition builder" and `CodeIcon` for "JSON reference".
  - The Condition tab has a count pill showing the number of rules: min-width 20px, height 18px, radius 999px, `--surface3` background, `--text2`, 11px. Its accessible name is "3 rules".
- Condition view: `ModeSegmentedControl`, then right-aligned Import (ghost) and Export (primary), all unchanged.
- JSON view: the right side shows only the privacy sentence "Pasted JSON is processed locally and is not uploaded or saved by this feature." at 12.5px `--text3`, max-width 420px. It wraps below the tabs on narrow widths.

### B. JSON reference workspace
The layout is a flex row with wrap: `gap: 18px; padding: 18px`.
- **Source pane:** `flex: 1 1 300px`, min-height 560px.
- **Content column:** `flex: 999 1 520px`, min-width 0, a vertical stack with gap 18px.
- On narrow screens they stack, with the Source pane first.

Every panel uses the dock and card chrome:
- Radius 20px (`--r-panel`), `1px solid var(--border)`, `--surface`, `--shadow-sm`.
- Header bar 38px tall, `--surface2`, bottom border.
- Header title 0.7rem/800/0.06em uppercase `--text3`, rendered as an `<h2>`.

**B1. Source pane** (title "Source"). Body padding 14px, gap 14px.
1. **"Output from"** (label 0.76rem/700 `--text2`): a two-option radio group styled like `.eb-logic-pill`.
   - Pill container: 4px padding, `--surface3`, `1px solid var(--interactive-stroke)`.
   - Items: 32px tall, 12.2px/800. The checked item uses the accent gradient and `--accent-ink`; others are transparent with `--text3`.
   - Options: **Action** | **Trigger**.
2. **Action name**: only shown when Action is selected. Uses `.eb-input` (40px, radius 14px).
   - Helper text below, 12px `--text3`: "As shown in the flow designer. Spaces become underscores."
   - If the field is blank: `aria-invalid="true"`, a `--danger` border, and the helper reads "Enter the action name to build the reference." in `--danger`.
3. **"The pasted JSON is"**: a radio group of two stacked cards.
   - Cards: padding 10px 12px, radius 14px.
   - Default: border `--border`, background `--surface`. Checked: border `--accent`, background `--accent-soft`.
   - Title 0.85rem/700. The resolved root is shown under the title in mono 12px `--accent-2`.
   - "Full output" shows `outputs('Get_items')` or `triggerOutputs()`. "Body only" shows `body('Get_items')` or `triggerBody()`.
   - A blank action name previews as `Action_name`.
4. **Sample JSON**: `.eb-textarea` (mono 0.82rem/1.6, min-height 180px, resize vertical, flex 1). Placeholder: "Paste the output from a flow run".
5. **Parse** button (`.eb-action-btn`, default variant). Next to it, a status line with `role="status"`, 12.5px/700:
   - "Nothing parsed yet" (`--text3`)
   - "Parsed · N values" (`--good`)
   - "Sample changed. Parse again to update." (`--warn`)
   - "Could not parse" (`--danger`)
6. **Error box** (`role="alert"`): padding 10px 12px, radius 14px, `1px solid var(--danger)`, `--danger-soft`. The exact messages are in States.

**B2. Payload card** (title "Payload"; the header's right side shows "N values"). Flex 1, min-height 320px. The tree scrolls, with a max height of 520px in the prototype; in the shell, let it fill the canvas.
- **Tree rows:** min-height 32px, radius 10px, gap 8px.
  - Indent: `10px + (level - 1) × 18px`.
  - Default border is transparent; hover border `--border-strong`. Selected: border `--accent`, background `--accent-soft`. Focus: `--ring` (0 0 0 3px accent).
  - Each row, in order:
    - a 20px chevron (`ChevronRightIcon`, 14px), rotated 90° when expanded (160ms ease) and hidden on leaves;
    - the key label;
    - a type badge;
    - a value preview (mono 12px `--text3`, ellipsis).
- **Label styles:**
  - Root row: the root expression, mono, `--accent-2`.
  - Object keys: 12.5px/700 `--text`.
  - Array indices `[n]`: mono `--text3`.
- **Type badges** reuse `.eb-field-type-badge` (8px/800 uppercase, radius 4px, `--accent-ink`). Colours: string `--accent-2`, number `--warn`, boolean `--info`, object/array `--accent`, null `--text3`.
- **Previews:** strings quoted; numbers and booleans raw; `null`; objects `{n}`; arrays `n items`.
- Arrays show 20 children, then a row "Show N more" (mono, `--accent`). Activating it reveals the rest.
- **Default expansion:** root → `body` → `value` → `[0]` → `Requester`. The default selection is `Email`.

**B3. Reference card** (title "Reference" with `CodeIcon`; the header's right side shows the selection summary, e.g. `string · "dana@contoso.com"`). Body padding 14px, gap 12px.
1. **Path breadcrumb** (`<nav aria-label="Selected path">`): chips with padding 2px 8px, radius 999px, `--surface2`, border `--border`, mono 12px `--text2`. Separator `›` in `--text3`.
2. **Expression**: `.eb-preview` (mono 0.83rem/1.8, radius 16px, `--surface2`), with the repo's syntax colours:
   - functions `.fn` = `--accent-2`/700
   - strings `.str` = `--danger`
   - numbers `.num` = `--warn`/700
   - symbols `.sym` = `--text3`
3. **Fixed-index note**: shown when the path contains any number. 12.5px/700 `--warn`: "Fixed position [0]: reads that item only, not each item in a loop."
4. **Action row:**
   - **Copy** (`.eb-action-btn` with `CopyIcon`). Disabled at 50% opacity when nothing is parsed, when there is an error, or when the action name is blank.
   - **Copy format** radio group (the segmented style from `.eb-tab-strip` / `.eb-segmented`, small size, 30px): **Expression editor** (the default; bare expression) | **Inside text @{…}** (wraps the expression in `@{…}`).
   - A right-aligned `role="status"` message:
     - "Paste into the expression editor" or "Inline text: use inside a string" (`--text3`)
     - "Expression copied" (`--good`, 1200ms, the same timing as `ExpressionDocumentPanel`)
     - "Could not copy expression: <reason>" (`--danger`)

### C. Condition builder view
This is the existing workspace, unchanged. Only the header gains the tabs.

---

## Interactions & behaviour
- **Switching builders:**
  - Click a tab, or use ←/→/Home/End while a tab has focus. Tabs use a roving tabindex; each panel is a `tabpanel` linked with `aria-labelledby`.
  - Both builders keep their in-memory state while the user switches.
  - JSON reference state is **never persisted**: a reload clears it.
- **Source and format radio groups:** click, or use arrow keys (roving tabindex, the same model as `ModeSegmentedControl`). Any change resets the copy status to idle.
- **Parse:** runs `parsePayload(text)`.
  - On success: store the data, keep the current selection if that path still exists (otherwise select the root), clear any "Show more" expansions, and make sure the root is expanded.
  - On failure: clear the tree and the selection, and show the error.
  - Editing the text after a parse marks it stale (the warning status) but keeps the old tree until the user parses again.
- **Tree (WAI-ARIA APG tree view pattern):**
  - Markup: `role="tree"` > `role="treeitem"` with `aria-level`, `aria-setsize`, `aria-posinset`, `aria-expanded` (parents only) and `aria-selected`. Roving tabindex (the selected row by default).
  - ↓/↑ move to the next or previous visible row. Home/End go to the first or last row.
  - → expands a closed parent, or moves to the first child if it is already open.
  - ← collapses an open parent, or moves to the parent row.
  - Enter or Space selects the row (or activates "Show more").
  - Clicking a row selects it; clicking the chevron toggles it without selecting.
- **Copy:** `adapter.copyToClipboard(expr)`. Success shows "Expression copied" for 1200ms; a failure shows the error message. Clear the timer on unmount.
- **Hover and focus:** buttons follow the existing `.eb-action-btn` / `.eb-icon-btn` hover rules. Every focusable element shows `--focus-ring`.
- **Responsive:** below roughly 860px the Source pane stacks above the content column, and the header privacy text wraps to its own line. At 900px and below, follow the shell's existing stacked-workspace rule.

## States & copy
| State | Where | Text |
| --- | --- | --- |
| Empty (no parse yet) | Payload card | "No sample yet" / "Paste an action or trigger output from a flow run, then select Parse." |
| Empty textarea + Parse | alert | "Paste a sample before parsing." |
| Invalid JSON | alert | "Not valid JSON: <engine message>" |
| Too large | alert | "Sample is larger than 1 MiB. Trim it to the part you need." |
| Too many nodes | alert | "Sample has more than 10,000 values. Trim it to the part you need." |
| Too deep | alert | "Sample is nested deeper than 64 levels." |
| Body only + top-level `body` key | Payload hint (warn box) | "This sample has a top-level `body` key. If you pasted the full output, choose **Full output**." |
| Missing action name | field helper + Copy disabled | "Enter the action name to build the reference." |
| Stale sample | status | "Sample changed. Parse again to update." |

The 1 MiB / 10k / 64 limits are provisional (feasibility doc §5). Benchmark them in the browser and in PPTB before fixing them.

## State management
Local to `JsonReferenceWorkspace`. Lift it to the shell only so that it survives tab switches; it is still not part of `QueryDocument`.
```ts
builderView: 'condition' | 'jsonReference'          // shell
src: 'action' | 'trigger'; shape: 'full' | 'body'; actionName: string
text: string; parsedText: string                     // stale = text !== parsedText
data: unknown | undefined; nodeCount: number; error: string | null
selection: (string | number)[]                       // typed path
expanded: Set<string>; showAllArrays: Set<string>    // keys = JSON.stringify(path)
focusIndex: number | null; copyFormat: 'clean' | 'inline'
copyState: 'idle' | 'copied' | 'error'
```
There is no data fetching: no network, no settings writes and no telemetry (`apps/pptb/README.md`: no `cspExceptions`, no external domain).

## Design tokens (Graphite Light; dark values are in `workbenchTokens.ts`)
- **Colours:**
  - Backgrounds: `--bg #F6F8FA`, `--bg2 #FBFCFD`, `--surface #FDFEFF`, `--surface2 #EEF2F5`, `--surface3 #E1E7EC`, `--panel rgba(253,254,255,.95)`
  - Strokes: `--border #D2DCE5`, `--border-strong #AEBDCA`, `--interactive-stroke #647484`
  - Text: `--text #18212B`, `--text2 #41505F`, `--text3 #55626F`
  - Accents: `--accent #155EEF`, `--accent-strong #004EEB`, `--accent-ink #F7FAFF`, `--accent-soft rgba(21,94,239,.12)`, `--accent-2 #087D78`
  - Status: `--danger #BE4540`, `--warn #8B6414`, `--good #237754`, `--info #1E65C2`; the soft versions are the same colour at 12% alpha
- **Type:** Segoe UI stack (`fontFamilyBase`); mono `"Cascadia Code","Cascadia Mono",ui-monospace,SFMono-Regular,Consolas,monospace`. Sizes used: 0.7rem pane titles, 0.76rem labels, 0.82–0.85rem body and buttons, 12–12.5px tree and meta text, 1.08rem app title.
- **Radii:** 4px badges, 9–10px small segments and tree rows, 12px icon buttons, 14px inputs, buttons and cards, 16px preview, 20px panels, 999px pills.
- **Spacing:** 18px workspace gap and padding, 14px panel padding, 12px/10px internal gaps.
- **Shadows:** `--shadow-sm 0 1px 2px rgba(0,0,0,.14)`; focus ring `0 0 0 3px var(--accent)`.
- **Motion:** 160ms (`--duration-fast`) for the chevron and hover; 1200ms copy confirmation.

## Assets
There are no images. Every icon comes from `packages/builder-ui/src/workbench/icons/BuilderIcons.tsx`: `BuilderIcon`, `CodeIcon`, `CopyIcon`, `ChevronRightIcon`, `ImportIcon`, `ExportIcon`. The brand mark SVG is the one in `WorkbenchHeader.tsx`.

## Acceptance checks
Reported evidence should keep unit, rendered-browser, PPTB-host and live-flow results separate. None of them has been run for this design.
1. Pasting, parsing, selecting and copying gives a correctly rooted expression for all four roots.
2. Apostrophes in keys are doubled (`?['O''Brien']`). Keys containing `.`, `/`, spaces or brackets stay as one segment. A key `"0"` becomes `?['0']`, not `[0]`.
3. Selecting an object, array or null returns the reference to that container. An empty path returns the root.
4. No `body` segment is ever added by inference.
5. Opening, using and switching back leaves the document, mode, fields, predicate output and exported JSON unchanged.
6. The page makes no network requests and no settings writes while the feature is in use.
7. Keyboard-only: every control is reachable, the tree follows the APG pattern, and focus is always visible. Axe reports no serious issues.
8. PPTB: copying works, and a host without a clipboard API shows the error instead of "copied".
9. The rest of the live-flow checks are in feasibility doc §7: full vs body output, Compose outputs, index bounds, and pasting into the designer.

## Research notes (checked 2026-09-26)
- Microsoft's expression function reference covers both Logic Apps and Power Automate. It says expressions **inline with plain text** need `@{}`, and a standalone expression does not. That supports defaulting to the bare "Expression editor" form. [Microsoft Learn: expression functions reference](https://learn.microsoft.com/en-us/azure/logic-apps/expression-functions-reference)
- Interpolated `@{…}` results are always strings. [WDL schema reference](https://learn.microsoft.com/en-us/azure/logic-apps/workflow-definition-language-schema); [community note: a null becomes the string "null"](https://integration366.wordpress.com/tag/logic-app/)
- `outputs()` returns the whole envelope (status code, headers, body), while `body()` returns only the body. Spaces in action names become underscores. [Manuel T. Gomes: body()](https://manueltgomes.com/microsoft/power-platform/powerautomate/powerautomate-function-reference/power-automate-body-function/); [Thor Projects](https://thorprojects.com/2018/03/23/microsoft-flow-and-azure-logic-apps-quick-formula-expression-guide/)
- Sources disagree on whether action names are case-sensitive in `body()` and `outputs()`. One says `body()` names are; another says `outputs()` names are not. **Do not normalise case.** Verify against a live flow.
- The `?` null-ignore operator returns null for a missing property. It is not a bounds check, so fixed `[n]` indices stay labelled. [Manuel T. Gomes: ? operator](https://manueltgomes.com/microsoft/power-platform/powerautomate/why-you-need-the-question-mark-operator-in-power-automate-expressions/)
- Tree keyboard model: [WAI-ARIA APG tree view](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) (→ opens a closed node, or moves to the first child if open).
- Fluent `Tree` (`@fluentui/react-tree`) still receives fixes in current Fluent releases ([releases](https://github.com/microsoft/fluentui/releases)). I could not confirm its production-readiness status for the repo's pinned version. The feasibility doc notes that the installed README carries a non-production warning. **Check the pinned package before choosing between Fluent `Tree` and the hand-rolled APG tree specified above.** Either one must meet the keyboard contract.

## Open questions for the product owner
- Should switching to Condition builder keep the JSON state until reload (as in this design), or clear it? The feasibility doc leans towards discarding state.
- Compose and other direct-output actions work today with **Action + Full output**: the pasted object has no `body` key, so the result is `outputs('Compose')?['customer']`, which is correct. Should the "Full output" card say this explicitly (e.g. "Full output (also Compose)")?

## Files
- `JSON Reference Workspace.dc.html`: the handoff design (1a, refined, accessible and interactive). Tweaks: `copyForm`, `startView`, `sampleState` (`loaded` / `empty` / `error`); `startView` and `sampleState` apply on load.
- `support.js`: the runtime needed to open the `.dc.html` files.
- `reference/JSON Reference Builder (explorations).dc.html`: every explored option (1a–1c, 2a–2c, 3a–3c), for context only.
