# Handoff: Functions screen (11a) and shared shell

## Overview
Expression Builder gets a new **Functions** screen, and the **11a header** becomes the header for every screen . This README is the master spec. Theme is Graphite Dark for the 11a reference; Graphite Light uses the same layout with the light token set.

## About the Design Files
The HTML files in this bundle are **design references**: prototypes showing intended look and layout, not production code. Recreate them in the existing codebase (`packages/builder-ui`, React + Fluent UI v9, Graphite tokens) using its established patterns. Do not ship the HTML.

- `Expression Builder v11.dc.html`: **11a is the approved Functions screen.** 11b is an abandoned light variant; ignore it.
- `Expression Builder v12.dc.html`: 12a and 12b, full-body restyles of Trigger / Filter and JSON reference. **Out of scope** (header only applies to those screens). Optional future direction.
- Open the `.dc.html` files in a browser (keep `support.js` beside them).

## Fidelity
High fidelity. Colors, type, spacing and radii are final. Use exact values below. All colors must come from `src/theme/workbenchTokens.ts` (`graphiteTokens`, CSS variables `--bg`, `--surface`, etc.). Do not hardcode hex in components. The mocks use the hex values that resolve from those tokens; the mapping is listed under Design Tokens.

## Codebase mapping
- Header: replace the current `workbench/WorkbenchHeader.tsx` layout with the pill header below; `BuilderTabs.tsx` / `controls/TabStrip.tsx` are replaced by the mode dropdown in the pill.
- Functions screen: new `workbench/FunctionsWorkspace.tsx` (nav + grid + dock). Reuse `ExpressionPreview.tsx` for the expression line, `DockPane.tsx` as the base of the bottom dock, `ActionButton.tsx` for buttons, `ModeSegmentedControl.tsx` for the segmented toggles.
- Trigger / Filter and JSON reference: swap in the new header only; leave `ConditionCanvas`, `JsonReferenceWorkspace`, `PayloadTree` and their layouts untouched.

---

# Master spec: shared shell
The header applies to all screens. Body patterns (panels, cards, dock, grid) apply to the Functions screen only.

## App frame
- Full window, padding **16px**, column flex, gap **14px**.
- Background: `radial-gradient(circle at 85% 10%, rgba(119,167,255,.20) 0, transparent 45%), radial-gradient(circle at 15% 85%, rgba(85,197,187,.16) 0, transparent 45%), var(--bg)`. Light mode: same gradients using `--accent` and `--accent-2` at about 14% and 12% alpha over `--bg`.
- Text color `--text`. Base font `"Segoe UI Variable Text", "Segoe UI", system-ui`. Display font `"Segoe UI Variable Display", "Segoe UI"`. Mono `"Cascadia Code", Consolas, monospace`.

## Header (11a pill) used on every screen
- Height **48px**, flex none, padding `0 18px`, `border-radius: 24px`, gap 12px, items centered.
- Background `rgba(35,45,53,.92)` (dark, = `--surface2` at 92%); border `1px solid --border`; shadow `0 4px 16px rgba(0,0,0,.35)`.
- Content left to right:
  1. **Title** "Expression Builder": 15px / 600, `white-space: nowrap`, `flex: none` (must never wrap).
  2. Chevron `›`, color `--text3`.
  3. **Mode chip**: height 30px, padding `0 12px`, radius 15px, gap 8px, 14px text, background `--accent-soft`, color `--accent`, trailing 10px down-chevron (stroke 3, same color). Label is the active mode: `Functions`, `Trigger / Filter` or `JSON reference`. Click opens a menu listing the three modes (this replaces the old tab strip). Menu surface: `--surface2`, border `--border`, radius 8px, shadow `--shadow-md`, rows 36px, selected row `--accent-soft` with `--accent` text.
  4. Spacer (`flex: 1`).
  5. **Insert** button: height 30px, padding `0 16px`, radius 15px, background `--accent`, color `--accent-ink`, 13px / 600. Hover `--accent-strong`. Inserts the current expression into the host (same action as today's primary action).
- Import, Export and window controls from the old header move into an overflow menu (`···`, 30px round ghost button placed before Insert). Keep their existing handlers.
- Focus ring on all header controls: 2px `--accent`, offset 2px.

## Body row
- `flex: 1; min-height: 0; display: flex; gap: 14px`.
- Left **nav** column (width varies per screen, Functions = 250px) then the content grid (`flex: 1; min-width: 0`).

## Panel patterns
- **Panel**: background `rgba(27,34,40,.85)` (`--surface` at 85%), border `1px solid --border`, radius **10px**, shadow `0 4px 16px rgba(0,0,0,.30)`, padding 22px (18px for small cards).
- **Panel title**: display font 26px / 600 / line-height 1. Secondary inline label (e.g. function name) 15px mono 600 in `--accent`, baseline aligned, gap 12px.
- **Status card** (green): background `--good-soft`, same border/radius/shadow, padding 18px, column, space-between. Label 13px/600 `--text2`; value 30px display 600 `--good`; caption 12px `--text2`. Use `--danger-soft`/`--danger` when invalid and `--warn-soft`/`--warn` for warnings.
- **Info card**: panel background, same structure, value 30px `--text`, caption 12px `--text3`.
- **Segmented toggle**: container padding 2px, radius 6px, background `rgba(237,243,247,.08)` (text color at 8%), 12px text; selected segment background `rgba(237,243,247,.16)`, weight 600; unselected `--text3`. For a binary primary choice (All/Any) the selected segment may use `--accent` with `--accent-ink`.
- **Ghost button**: height 30px, padding `0 12px`, radius 6px, border `1px solid --border-strong`, 13px/600, `white-space: nowrap`, `flex: none`.
- **Primary button**: height 38px, radius 6px, `--accent` fill, `--accent-ink` text, 14px/600, icon 15px + 8px gap.

## Content grid (Functions only)
- `display: grid; grid-template-columns: minmax(0,3fr) minmax(0,2fr); grid-template-rows: minmax(0,1fr) minmax(0,1fr) 210px; gap: 12px`.
- Main panel: column 1, rows 1 to 2.
- Two cards: column 2, row 1 (status) and row 2 (info).
- Dock: columns 1 to 2, row 3.

## Bottom dock (split)
- Container: flex, radius 10px, overflow hidden, border `1px solid --border`, shadow `0 4px 16px rgba(0,0,0,.35)`.
- **Left (expression)**: flex 1, padding `16px 20px`, background `--code` (`#0E1216` dark, `#111820` light), column, gap 12px.
  - Header row: label "Expression" 12px uppercase, letter-spacing .06em, `--text3`; validity pill (height 18px, padding `0 8px`, radius 9px, 11px/600, `--good-soft` / `--good`); right-aligned segmented toggle `Expression | @{…}`.
  - Code: mono 16px / 1.5. Function names `--accent`, JSON references `--warn`, literals `--good`, punctuation `--text`.
  - 1px divider `--border`.
  - Breadcrumb chips: height 26px, padding `0 10px`, radius 13px, mono 12px. Function chip `--accent-soft` / `--accent`; reference chip `--warn-soft` / `--warn`; value/type chip `--good-soft` / `--good`; separator `›` `--text3`.
- **Right (result + action)**: width **280px**, flex none, padding `16px 20px`, background `--surface2`, left border `1px solid --border`, column space-between.
  - Label "Sample result" 12px uppercase `--text2`; value mono 19px / 600 `--accent`.
  - Primary button "Copy expression" (full width) with copy icon, then 12px caption "Copy as @{…}" centered `--text2` (acts as a secondary copy action).

---

# Screen: Functions (11a)

**Purpose**: choose a function, fill its arguments, see the expression and sample result, copy or insert it.

## Layout
Header, then body row: **nav 250px** + content grid (above).

## Left nav (function list)
- Column, gap 2px, 14px text, no panel background (sits on the gradient).
- **Search field**: height 34px, margin-bottom 6px, padding `0 10px`, radius 6px, background `--surface`, border `1px solid --border`, placeholder "Search functions" in `--text3`.
- **Group row**: height 36px, padding `0 10px`, gap 10px; 10px chevron (rotated 90deg when expanded), name 600, count 12px `--text3` right-aligned. Groups: String (8), Collection (14), Logical (9), Date and time (18), Math (12). Only one group needs to be expanded; String is expanded in the mock.
- **Function row**: height 34px, margin-left 22px, padding `0 12px`, radius 6px, mono 13px, color `--text2`. Selected row: background `--accent-soft`, color `--accent`, weight 600, plus a 3px x 20px `--accent` bar at left (left 0, top 7px, radius 2px). Hover: `--surface2` background.
- Mock function list for String: concat (selected), toUpper, substring, replace.

## Main panel: Arguments
- Title "Arguments" + function name (`concat`).
- One block per argument, column gap 14px: label row `text1` 14px/600 followed by `required` or `optional` 14px regular `--text3`; below it an **input field**: height 42px, padding `0 14px`, radius 6px, background `--surface2`, border `1px solid --border`, mono 14px.
  - Value colors: JSON reference `--warn`, literal `--good`, empty placeholder `--text3` ("Type a value or pick a function").
- Mock values: `text1` = `triggerBody()?['Name']`, `text2` = `' - '`, `text3` empty (optional).

## Cards
- Status: "Status" / **Valid** / "2 of 2 required set".
- Info: "Arguments set" / **2 / 3** / "1 optional left empty".

## Dock
- Expression `concat(triggerBody()?['Name'], ' - ')`; breadcrumb `concat › JSON reference` and `text`; result `Ada Lovelace -`; button "Copy expression"; caption "Copy as @{…}".

## Interactions and behavior
- Selecting a function in the nav loads its signature; argument blocks are generated from it (required first).
- Typing in an argument validates live; invalid sets the status card to `--danger-soft` with message, and the expression shows the error chip. Dragging a field or function onto an input fills it; picking a function from the nav while an input is focused wraps the function around that input.
- Status = Valid when all required arguments are set and parse.
- Search filters groups and rows live, expanding matching groups and hiding empty ones.
- Sample result is evaluated against the current sample JSON (from the JSON reference screen).
- Copy expression copies to the clipboard; the button shows "Copied" for 1.5s. "Copy as @{…}" copies the wrapped form.
- Insert (header) sends the expression to the host and is disabled while invalid.
- Hover: rows `--surface2`; buttons darken to `--accent-strong`. Transitions 120ms ease on background and border color.

## State
`selectedGroup`, `selectedFunction`, `args: Record<name, ArgValue>`, `search`, `copyFormat: 'expression' | 'wrapped'`, `mode` (header, shared), `validation` (derived), `sampleResult` (derived). The mode and sample JSON are shared with the other screens through existing workbench state.

---

# Screens: Trigger / Filter and JSON reference (header only)
**Scope: apply the 11a header only.** Do not redesign the body of these screens. Keep the current nav, panes, canvas, tree, cards, dock and all behavior exactly as they are today.

- Replace the existing header/tab strip with the shared 11a pill header. Mode chip label is "Trigger / Filter" or "JSON reference".
- The frame (16px padding, 14px gap) and gradient background from the shell may be applied so the pill sits correctly above the existing body. If the current body relies on a different outer background or padding, keep the body as is and only adjust the space around the header.
- No changes to rules, payload tree, source nav, status or expression areas.

`Expression Builder v12.dc.html` (12a, 12b) is an **exploratory full restyle in the 11a style and is out of scope**. It is included only as an optional future direction. Do not implement it.

# Design Tokens
Mocks use resolved values. Bind to these variables in code.

| Role | Variable | Dark | Light |
|---|---|---|---|
| Background | `--bg` | #12161A | #F6F8FA |
| Surface | `--surface` | #1B2228 | #FDFEFF |
| Surface 2 | `--surface2` | #232D35 | #EEF2F5 |
| Surface 3 | `--surface3` | #2D3943 | #E1E7EC |
| Border | `--border` | #394955 | #D2DCE5 |
| Border strong | `--border-strong` | #526776 | #AEBDCA |
| Text | `--text` | #EDF3F7 | #18212B |
| Text 2 | `--text2` | #C8D3DC | #41505F |
| Text 3 | `--text3` | #9EADB9 | #55626F |
| Accent | `--accent` | #77A7FF | #155EEF |
| Accent strong | `--accent-strong` | #5690F4 | #004EEB |
| Accent ink | `--accent-ink` | #0C1A34 | #F7FAFF |
| Accent soft | `--accent-soft` | rgba(119,167,255,.16) | rgba(21,94,239,.12) |
| Accent 2 | `--accent-2` | #55C5BB | #087D78 |
| Good / soft | `--good`, `--good-soft` | #63C99B, rgba(99,201,155,.14) | #237754, rgba(35,119,84,.12) |
| Warn / soft | `--warn`, `--warn-soft` | #EFC56E, rgba(239,197,110,.14) | #8B6414, rgba(139,100,20,.12) |
| Danger / soft | `--danger`, `--danger-soft` | #FF978D, rgba(255,151,141,.14) | #BE4540, rgba(190,69,64,.12) |
| Shadow sm | `--shadow-sm` | 0 1px 2px rgba(0,0,0,.22) | 0 1px 2px rgba(0,0,0,.14) |

Not yet in the token file (add as `--code`, `--panel-glass`):
- `--code`: #0E1216 dark, #111820 light (code surfaces; keep dark in light mode for the dock code area only if the team prefers a dark code well; the light mock used #111820).
- Header glass: `--surface2` at 92% alpha. Panel glass: `--surface` at 85% alpha (existing `--panel` is 94%; use 85% for the translucent look or keep 94% if contrast is a concern).

**Spacing**: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22. Layout gaps: frame 16, header to body 14, grid 12.
**Radii**: 4 (inputs in dense rows), 6 (fields, buttons, rows), 8 (cards in nav), 10 (panels, dock), 15/24 (pills, header).
**Type**: display 26/600 (panel titles), 30/600 (card values), 15/600 (title), 14 (body, inputs), 13 (labels, buttons), 12 (captions, chips, uppercase labels at .06em), 11 (pills). Mono 12 to 19 for code and values.

## Assets
No images. Icons are simple 24px-grid stroke icons (chevrons, copy). Use the existing `workbench/icons/BuilderIcons.tsx` set where available.

## Files
- `Expression Builder v11.dc.html` (11a: approved Functions screen)
- `Expression Builder v12.dc.html` (optional exploration, out of scope)
- `support.js` (runtime for the HTML references)
- Theme source in the codebase: `packages/builder-ui/src/theme/workbenchTokens.ts`
