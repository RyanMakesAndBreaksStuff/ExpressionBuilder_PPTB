# Spec 001: Functions screen and 11a pill header

**Status:** Approved (2026-09-30); amended 2026-10-01 — FR-26 narrow layout; FR-15 focus; one signature per twin function
**Source:** `research/JSON BUILDERFlow Functions UI/design_handoff_functions_screen/README.md` (design handoff, 11a approved). Visual values (colors, type, spacing, radii) are taken verbatim from that README and are not repeated here except where a requirement depends on them.

## Goal

Add a **Functions** screen where a user picks a Workflow Definition Language function, fills its arguments (typing, or inserting a parsed sample path), sees the generated expression, and copies it. Replace the current header and tab strip on every screen with the 11a pill header.

## Out of scope

- 12a/12b full restyles of Trigger / Filter and JSON reference (`Expression Builder v12.dc.html`).
- Any body change to Trigger / Filter (`ConditionCanvas`, toolbox, support pane, preview) or JSON reference (`JsonReferenceWorkspace`, `PayloadTree`, `JsonSourcePane`, `ReferencePanel`).
- A host "insert into flow" API. `PlatformAdapter` gains no methods.
- Sample result / expression evaluation of any kind (the README's "Sample result" block is dropped).
- Dragging Trigger / Filter fields or Parsed Value rows onto inputs (Parsed Value inserts by double-click/Enter for now).

## Decisions (resolved clarifications)

| # | Question | Decision |
|---|----------|----------|
| D1 | Header "Insert" button, no host insert API exists | Keep **Export** as the pill's primary button (existing handler). No Insert button. |
| D2 | Function catalog scope | Every function Microsoft Learn lists under String, Collection, Logical comparison, Math, and Date and time (WDL functions reference). Group counts are derived from the catalog; the mock's counts (8/14/9/18/12) are illustrative. |
| D3 | Sample result evaluation | Dropped. Replaced by a **Parsed Value** nav group listing leaf paths of the JSON reference sample; double-click (or Enter) inserts the path's reference into an argument. The dock's right side keeps only the copy actions. |
| D4 | `--code` light value / panel glass alpha | `--code` light = `#111820`; panel glass = `--surface` at 85%. |
| D5 | Default screen on load | Trigger / Filter (unchanged from today). |
| D6 | Expression mode switch (Trigger condition / Filter array) | Stays in the pill, after the mode chip, on Trigger / Filter only. |
| D7 | Header actions per screen | Trigger / Filter: overflow `···` (Import) + Export. Functions: none (dock has Copy). JSON reference: privacy sentence inside the pill, as today. |
| D8 | Bare unquoted text in an argument | Invalid; message tells the user to wrap text in single quotes. |
| D9 | Variadic functions (e.g. `concat`) | Declared args render; one extra empty optional slot follows the last filled variadic arg. |

## Functional requirements

### Shell and header

- **FR-1** The app frame is a full-window column with 16px padding and a 14px gap over the two-gradient background defined in the README. All colors resolve from `graphiteTokens` CSS variables; no raw color literal appears outside `workbenchTokens.ts`.
- **FR-2** Every screen shows the 48px pill header: title "Expression Builder" (never wraps), `›`, mode chip, spacer, then per-screen actions (D7).
- **FR-3** The mode chip shows the active screen label (`Functions`, `Trigger / Filter`, `JSON reference`) and opens a menu listing the three screens in that order. Choosing one switches the screen. The menu replaces `BuilderTabs`. Three existing suites assert the old tab strip and must be rewritten against the chip: `test/builderSwitching.test.tsx`, `test/jsonReferenceStyles.test.ts` (its `.eb-builder-tabs` rules), and `tests/e2e/json-references.spec.ts` (its `getByRole('tab')` builder switching).
- **FR-4** Screen state survives switching: Trigger / Filter document, JSON reference state, and Functions state are all kept while hidden. Nothing new is persisted.
- **FR-5** On Trigger / Filter the pill shows the expression-mode switch (D6), an overflow menu containing Import, and the Export primary button; both keep today's handlers.
- **FR-6** All header controls show a 2px `--accent` focus ring with a 2px offset.
- **FR-7** New tokens exist in both palettes: `--code`, `--header-glass`, `--panel-glass`, `--glow-1`, `--glow-2`, `--panel-shadow`, `--dock-shadow`, `--seg-track`, `--seg-selected`.

### Functions screen

- **FR-8** Layout: 250px nav column + content grid (`3fr / 2fr` columns; `1fr 1fr 210px` rows; 12px gap). Arguments panel spans column 1 rows 1–2; Status card column 2 row 1; Info card column 2 row 2; dock spans row 3.
- **FR-9** The engine exposes a typed function catalog (D2): each entry has name, group, description, ordered args (name, type, required, variadic), and return type.
- **FR-10** Nav lists the five groups with derived counts; each expands and collapses. String is expanded on first load and `concat` is selected.
- **FR-11** Search filters functions by case-insensitive name substring live, expands groups with matches, and hides groups with none.
- **FR-12** Selecting a function renders one labelled input per argument, required first, each marked `required` or `optional` (D9 for variadic).
- **FR-13** Each argument value is parsed as a WDL argument: string literal (`'…'` with `''` escapes), number, `true`/`false`/`null`, function call, or a call followed by `?['key']`/`['key']`/`[n]` accessors. Unknown function names, wrong arg counts (for catalog functions), bare text (D8), and syntax errors are invalid with a message.
- **FR-14** Input text colors by kind: reference → `--warn`, literal → `--good`, empty placeholder "Type a value or pick a function" → `--text3`.
- **FR-15** While an argument input is focused, picking a function in the nav wraps it: the input becomes `name(<current value>)` and keeps focus, so a second pick wraps again. With no input focused when the pick begins, picking selects the function, even if an input was focused earlier.
- **FR-16** Function rows are draggable; dropping one on an argument input inserts `name()` (native text drop).
- **FR-17** Status card: **Valid** (good tone) when every required argument is set and every set argument parses; otherwise **Invalid** (danger tone) with the first error message. Caption "N of M required set".
- **FR-18** Info card: "Arguments set" / `set / shown` / "K optional left empty".
- **FR-19** Dock left: "Expression" label, validity pill, `Expression | @{…}` toggle, syntax-coloured expression (`ExpressionPreview`), divider, breadcrumb chips (function → one chip per set argument: reference "JSON reference", string "text", number "number", boolean "boolean", nested call its name; invalid → danger chip "error").
- **FR-20** The expression is `name(arg1, arg2, …)` from trimmed set arguments; trailing empty optional args are dropped; an empty optional arg before a set one is invalid ("Fill <name> first"). The toggle switches display between bare and `@{…}`.
- **FR-21** Nav has a **Parsed Value** group after the function groups. It lists every leaf (string, number, boolean, null, empty object/array) of the JSON reference screen's parsed sample as a mono row labelled by its dotted path (`body.Name`, `items[0].id`), with the full reference expression (the same text JSON reference would copy for that path, bare form) as its accessible description. Search filters these rows too. At most 200 rows render, followed by "+N more — narrow with search". With no parsed sample the group shows "Parse a sample in JSON reference"; with an action name missing it shows "Set an action name in JSON reference".
- **FR-22** Double-clicking a Parsed Value row, or pressing Enter on it, replaces the value of the last-focused argument input with that row's reference expression; if no input has been focused since the function was selected, it fills the first empty input. Focus returns to the filled input.
- **FR-25** Dock right holds only the "Copy expression" primary button and the "Copy as @{…}" caption action, bottom-aligned.
- **FR-23** "Copy expression" copies the expression in the selected format; the label shows "Copied" for 1.5s. "Copy as @{…}" always copies the wrapped form. Copy is disabled while invalid. Clipboard failure notifies an error via the adapter.
- **FR-24** Rows and buttons transition background/border color over 120ms; motion is removed under `prefers-reduced-motion`.
- **FR-26** At 900px viewport width and below, the pill wraps onto extra rows on every screen, and Functions stacks into one column that scrolls as a whole. The order is: nav (at most 40% of the viewport height, scrolling on its own), Arguments, Status, Info, then the dock with the copy actions below the expression. At every width down to 375px, the page never scrolls sideways and no control is cut off.

## Acceptance criteria

- **AC-1.1** No `.css/.ts/.tsx` under `packages/builder-ui/src` other than `workbenchTokens.ts` contains a hex or `rgba(` literal (existing audit test passes).
- **AC-2.1** On every screen, the header contains the title text "Expression Builder" and a mode chip button whose name includes the active screen label.
- **AC-3.1** Opening the mode chip shows menu items Functions, Trigger / Filter, JSON reference; choosing JSON reference shows the JSON reference body and the chip reads "JSON reference".
- **AC-3.2** `BuilderTabs.tsx` and `WorkbenchHeader.tsx` are deleted and nothing imports them. `controls/TabStrip.tsx` stays: `SupportPane` still uses it for the diagnostics / mode-context tabs, which are out of scope.
- **AC-4.1** JSON reference action name and sample survive Functions → JSON reference → Functions; Functions args survive a round trip to Trigger / Filter.
- **AC-5.1** On Trigger / Filter, the Expression mode radiogroup, an overflow button containing Import, and an Export button are present; Export copies the same JSON as before.
- **AC-5.2** On Functions, no Import or Export control is rendered; on JSON reference, the privacy sentence is visible.
- **AC-7.1** Both palettes define all nine new variables.
- **AC-9.1** The catalog contains, per group, exactly the function names Microsoft Learn lists for that category, and every entry has ≥0 args with unique names.
- **AC-10.1** First render of Functions: String expanded, `concat` row selected (`aria-current`), Arguments title shows `concat`.
- **AC-11.1** Searching "upper" leaves only String visible with `toUpper`; clearing restores all groups.
- **AC-12.1** Selecting `substring` renders inputs `text`, `startIndex` (required), `length` (optional).
- **AC-13.1** `triggerBody()?['Name']` parses as a reference; `' - '` as a string literal; `Ada` is invalid with a single-quotes message; `toUpper(` is invalid.
- **AC-15.1** With `text1` focused and value `triggerBody()?['Name']`, clicking `toUpper` sets `text1` to `toUpper(triggerBody()?['Name'])`, `concat` stays selected and `text1` keeps focus. Focusing `text1`, then the search box, then clicking `toUpper` selects `toUpper`.
- **AC-17.1** `concat` with `text1`=`triggerBody()?['Name']`, `text2`=`' - '` shows Status **Valid**, "2 of 2 required set"; clearing `text2` shows **Invalid**.
- **AC-18.1** Same inputs show Info "2 / 3", "1 optional left empty".
- **AC-19.1** Dock shows breadcrumb chips `concat`, `JSON reference`, `text`.
- **AC-20.1** Same inputs produce `concat(triggerBody()?['Name'], ' - ')`; toggling `@{…}` displays `@{concat(triggerBody()?['Name'], ' - ')}`.
- **AC-21.1** After JSON reference parses `{"Name":"Ada Lovelace","tags":["a"]}` with Output from = trigger, shape = body, the Parsed Value group lists rows `Name` and `tags[0]`, and `Name`'s description is `triggerBody()?['Name']`.
- **AC-21.2** Before any parse, the Parsed Value group shows "Parse a sample in JSON reference".
- **AC-21.3** A sample with 250 leaves renders 200 rows and "+50 more — narrow with search".
- **AC-22.1** With `text2` last focused, double-clicking `Name` sets `text2` to `triggerBody()?['Name']`; with no input focused since selecting `concat`, it fills `text1`.
- **AC-22.2** Pressing Enter on a focused Parsed Value row behaves the same as double-click.
- **AC-25.1** No "Sample result" text renders anywhere on the Functions screen.
- **AC-26.1** In the existing SC-011 viewport sweep (375×667 through 1440×900), every screen, Functions included, passes the sweep's checks: the page doesn't scroll sideways and no visible control extends past the viewport.
- **AC-26.2** Inside `@media (max-width: 900px)`: `.eb-fn-workspace` and `.eb-fn-grid` lay out as columns, `.eb-fn-workspace` scrolls vertically, `.eb-fn-nav` is capped at `40vh`, and `.eb-fn-dock` stacks the code area above the copy actions.
- **AC-23.1** Copy expression calls `copyToClipboard` with the bare expression and the button reads "Copied"; "Copy as @{…}" copies the wrapped form; Copy is disabled while invalid.

## Assumptions

- Microsoft Learn WDL functions reference (`learn.microsoft.com/azure/logic-apps/workflow-definition-language-functions-reference`) is the catalog source. Functions listed in two categories (`chunk`, `length`, `isFloat`, `isInt`) appear in both groups. Each is one WDL function, so both entries share one signature; `chunk` takes `collection` (string or array) and `length`. Picking either row selects that function, so both of its rows show as current.
- Parsed Value reads JSON reference's in-memory state only; nothing is persisted (FR-4).
