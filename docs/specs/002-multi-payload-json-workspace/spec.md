# Feature 002: Multi-payload JSON reference workspace

**Status:** Approved (2026-10-08); revised from the 13c handoff at the user's request (2026-10-20)
**Version:** 2.0.0
**Created:** 2026-10-08
**Last Updated:** 2026-10-20
**Branch:** Documentation prepared on `functions-prep-for-release`; implementation branch is deferred until execution.
**Design evidence:** [13c handoff ZIP](../../../assets/JSON%20BUILDERFlow%20Functions%20UI.zip), including `codebase_13c/INTEGRATION.md` and `codebase_13c/mockup/JSON Reference Multi-Payload 13c (export).dc.html`.
**Earlier evidence:** [13b design](reference/13b-design.dc.html), [standalone handoff](reference/13b-standalone.html), [13a integration notes](reference/13a-integration-notes.md).
**Baseline and interpretation:** [Source notes](source-notes.md) record the v1.0.1 handoff and behavior baseline. The 13c interpretation below supersedes their 13b strip measurements and design precedence. Spec 001 remains the baseline for Functions and the shared header, except that this spec extends its single-sample Parsed Value requirements and replaces its FR-3 / AC-3.1 screen-menu order.

**Approved scope:** Multi-payload card tabs, cross-payload search, Functions source groups and the 13c screen-menu order, with preservation of the existing JSON behavior fixes and viewport fit. Full Trigger / Filter and JSON page redesigns remain deferred. The 13c reference governs the payload strip, search controls and screen-menu order; existing pane bodies and styling remain the baseline.

## Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.0.1 | 2026-10-08 | Approved the limited multi-payload scope, 13b pill strip and search controls, Functions source groups and preservation of existing pane bodies and JSON behavior. |
| 2.0.0 | 2026-10-20 | Replaced the 13b pill strip with 13c cards, added visible per-card status, moved `+ New payload` into the card row, specified the 900px strip layout and replaced the inherited screen-menu order. MAJOR because the approved strip design and shared navigation contract change. |

## 13c Handoff Interpretation and Impact

The source is `assets/JSON BUILDERFlow Functions UI.zip`, SHA-256 `32DAAAF95E0A72D2012BD4C7649589E34AE875BCED2EC6E0D738548046453D7F`. Its six entries provide the following evidence:

| Archive entry under `codebase_13c/` | Evidence used by this revision |
|-----------------------------------|--------------------------------|
| `INTEGRATION.md` | Lines 3–17 define shared web/PPTB coverage, card tabs, the in-row add control and Trigger / Filter → JSON reference → Functions order. Lines 35–41 require both themes/hosts to be checked and explicitly state that the supplied code was not built or tested against the repository. |
| `mockup/JSON Reference Multi-Payload 13c (export).dc.html` | Lines 18–20 show the menu order; lines 23–43 show three-line cards, selected treatment, dashed add card, count and cross-payload search. The 1280 × 860 canvas, demonstration samples and pane bodies provide context. |
| `mockup/support.js` | Generated runtime for the design export, not application behavior or a new product dependency. |
| `packages/builder-ui/src/workbench/PayloadStrip.tsx` | Proposed card content, visible status and `+ New payload` placement, with the existing stable identities, close/add behavior, keyboard navigation and accessible status descriptions preserved. |
| `packages/builder-ui/src/theme/jsonPayloads.css` | Card dimensions, typography, theme-role mapping, local tab scrolling, focus styling and the two-column strip with full-width search at 900px and below. See FR-6 for the reconciled visual contract. |
| `packages/builder-ui/src/workbench/screens.ts` | The exact screen order and labels; screen IDs are unchanged. The header dropdown continues to use the shared screen list. |

**Precedence:** This revision governs the 13c cards, search controls and menu order. The existing Story 4 parsing/paste/notification contract and FR-5 reference behavior take precedence over simplified prototype interactions. In particular, do not load its seeded samples, adopt its `Action` blank-name preview instead of `Action_name`, restore `Parse again` messaging, clear retained output on an automatic parse failure, reset unrelated expansion state when revealing a search result, or report clipboard success after a failed write. `Pending validation` is the card's pending-state caption; the existing Source feedback remains unchanged. The archive adds no Functions body redesign or new function behavior.

**Downstream impact:** The existing [implementation plan](feature-multiple_payloads-plan.md) targets v1.0.1 and must be reviewed before further execution against v2.0.0. Its Task 2 strip markup/styles and Task 4 visual/browser checks need the card/status/add/layout requirements; it also needs ownership and verification for the new shared menu order. Spec 001's FR-3 and AC-3.1 are superseded only for that order. Current `PayloadStrip.tsx`, `jsonPayloads.css`, `screens.ts`, `shellHeader.test.tsx`, `screenContract.test.tsx` and affected browser selectors/assertions require review for alignment. This request updates the spec only; it does not revise that plan, reopen its completed tasks or authorize application implementation. The ZIP's copy-over instructions describe an untested proposal and are not an implementation strategy requirement.

## Problem Statement

JSON reference currently holds one sample, so makers must replace it to inspect another action or trigger output. That interrupts comparison and leaves Functions with references from only one source. The handoff proposes a workspace where several samples remain open, users can find paths across them, and Functions identifies the payload behind each reference.

## Goals

- Keep one to five independent payloads available within the current session.
- Find a leaf path or value across every displayed parsed payload and reveal its source in the JSON tree.
- Insert correctly rooted references from any parsed payload into Functions arguments.
- Implement the 13c payload cards and search controls in both existing palettes, with visible per-payload status and reachable controls on narrow and short viewports.
- List the screens as Trigger / Filter, JSON reference, Functions in the shared mode menu while retaining the default Trigger / Filter screen and per-screen state/actions.
- Preserve the local pending paste, validation and notification fixes as existing behavior throughout the UI change.

## Non-Goals

- Implement full Trigger / Filter or JSON page redesigns, including the earlier 12a/12b body restyles and the 13b pane-body styling/layout. Replace the shared Functions layout.
- Add expression evaluation, a sample-result panel, or insertion into a live flow.
- Persist samples, upload them, or add telemetry containing sample data.
- Push, merge or reimplement the three existing local commits as part of this specification task.
- Copy the handoff's proposed replacement code into the application as an approved implementation strategy.

## Users and Context

**Primary users:** Power Automate makers building references and function expressions from action or trigger run samples.
**Secondary users:** Makers using the existing Trigger / Filter composer alongside these utilities.
**Usage context:** The standalone browser app and Power Platform Toolbox host, including short embedded windows and narrow browser windows.
**User mental model:** A payload tab is one sample with its own source, root, selected path and loop name. A search result and a Parsed Value row identify that payload. Switching views preserves the current session; reloading starts an empty session.

## User Stories

### Story 1: Keep several samples open

**As a** maker
**I want** independent payload tabs
**So that** inspecting another output does not overwrite my current sample.

**Acceptance criteria:**

- [ ] **AC-1.1** Given a fresh session When JSON reference is opened Then one empty active payload exists, Action / Full output is selected, the action name and loop name are blank, and no handoff demonstration data is loaded.
- [ ] **AC-1.2** Given fewer than five payloads When the user activates the `+ New payload` card Then one empty payload is appended, activated and focused, the count increases, and existing payload data is unchanged.
- [ ] **AC-1.3** Given five payloads When the user attempts to add another Then no sixth payload is created and the `+ New payload` card is visibly disabled and cannot be activated by pointer or keyboard.
- [ ] **AC-1.4** Given two payloads with different source roots, text, selections, expanded nodes, revealed array children and loop names When the user switches between them Then each restores its own values and feedback.
- [ ] **AC-1.5** Given multiple payloads When an inactive payload is closed Then the active payload is unchanged; when the active payload is closed Then the tab now occupying its position becomes active, or the preceding tab if it was last.
- [ ] **AC-1.6** Given one remaining payload When its tab is displayed Then a close action is unavailable and the session retains that payload.
- [ ] **AC-1.7** Given two payloads with the same action name When one is edited, activated or closed Then only that payload is affected and their accessible tab names distinguish them by current position.
- [ ] **AC-1.8** Given several payloads and Functions arguments When the user switches through all three screens and returns Then payload and argument state survives; when the application reloads Then JSON reference starts with one empty payload.

### Story 2: Find a value across payloads

**As a** maker
**I want** search results that identify their source
**So that** I can locate the correct reference without opening each sample.

**Acceptance criteria:**

- [ ] **AC-2.1** Given two parsed payloads containing an Email path and a string value containing EMAIL When the user searches for `email` Then both match regardless of case and each result shows its payload label, path and value preview.
- [ ] **AC-2.2** Given a matching string whose match occurs after its first 80 characters When the user searches for that suffix Then the leaf is found even if the displayed preview is shortened.
- [ ] **AC-2.3** Given more than eight matches When search results open Then at most eight options appear in tab order and leaf traversal order, and the heading states the total matches and the number of payloads with displayed parsed data.
- [ ] **AC-2.4** Given a result inside a collapsed array beyond its initial 20 children When the result is activated Then its payload becomes active, ancestors and required array children are revealed, the exact row is selected and scrolled into view, its reference is displayed, and the search closes and clears.
- [ ] **AC-2.5** Given an open search list When the user presses Down or Up Then the active option moves through the displayed results; when Enter is pressed Then that option is revealed; when Escape is pressed Then the query clears, the list closes and focus remains in search.
- [ ] **AC-2.6** Given a blank or whitespace query When search is displayed Then no results popup is open; given no matches When a nonblank query is entered Then `No matches in parsed payloads.` is shown.
- [ ] **AC-2.7** Given one sample has no displayed parsed data, another has a retained successful payload after an invalid automatic edit, and a third has parsed data with a blank action name When search runs Then it excludes the first, searches displayed data in the other two, and revealing the unnamed source does not enable copying.
- [ ] **AC-2.8** Given search results are open When a source is closed or reparsed before its result is activated Then unavailable results disappear and activation cannot select a removed payload or a path that no longer exists.

### Story 3: Use all payloads in Functions

**As a** maker
**I want** Parsed Value entries grouped by source
**So that** identical paths from different outputs produce the right expression.

**Acceptance criteria:**

- [ ] **AC-3.1** Given no payload has displayed parsed data When Parsed Value is expanded Then it shows `Parse a sample in JSON reference`; given one parsed source When expanded Then its leaf list retains the existing single-source presentation.
- [ ] **AC-3.2** Given at least two parsed payloads When Parsed Value is expanded Then one initially collapsed, independently collapsible source group appears per parsed payload in tab order, with its label, root caption and matching leaf count before the shared row cap.
- [ ] **AC-3.3** Given Action / Body only payloads named `Get customer` and `Get manager`, both containing an Email path When either row is inserted Then the argument contains respectively `body('Get_customer')?['Email']` or `body('Get_manager')?['Email']`, identical to that source's bare JSON reference.
- [ ] **AC-3.4** Given an argument was last focused When a row is double-clicked or activated with Enter Then that argument is replaced and receives focus; given no argument has been focused since function selection Then the first empty argument is filled and focused.
- [ ] **AC-3.5** Given parsed payloads whose matching leaves total 250 When Parsed Value is expanded Then at most 200 leaf rows are available across all source groups, allocated in tab order, and the additional matching count is reported; when a search narrows to leaves in a later source Then filtering precedes the shared cap and those leaves can appear.
- [ ] **AC-3.6** Given several source groups containing arrays When they are first rendered Then every array-item accordion starts collapsed and opening an item in one source does not open the identically named item in another source.
- [ ] **AC-3.7** Given a parsed Action source with a blank action name When its Parsed Value entries are displayed Then that source shows `Set an action name in JSON reference` and exposes no insertable placeholder expressions, while correctly named sources remain usable.
- [ ] **AC-3.8** Given a scalar null sample or empty object or array When the corresponding source is expanded Then its root leaf can be inserted using its valid reference root.
- [ ] **AC-3.9** Given a payload label or root changes, or a payload closes When Functions is shown Then source groups and reference descriptions reflect the current sources; text already inserted into arguments remains unchanged.

### Story 4: Retain editing and feedback behavior

**As a** maker
**I want** predictable paste, validation and notifications in every tab
**So that** the new UI preserves my editing workflow.

**Acceptance criteria:**

- [ ] **AC-4.1** Given textual clipboard content and any selection in Sample JSON When the user pastes Then the entire field is replaced and parsed immediately, a blank action name becomes `Action`, an entered name is preserved, and native Undo followed by Redo restores the textarea text through its editing history.
- [ ] **AC-4.2** Given a paste has changed the parsed tree When Undo changes the textarea Then Undo does not restore previous tree, selection or action-name state; the resulting text is validated through the ordinary automatic-edit rules.
- [ ] **AC-4.3** Given an active payload's unvalidated text changes When 600ms passes without another edit Then it is automatically validated; given the user switches payloads or screens before that delay When the delay would expire Then no other payload is parsed or changed, and returning to the pending payload starts a fresh 600ms delay.
- [ ] **AC-4.4** Given a pending automatic parse When that payload is closed or a paste completes Then the pending operation cannot parse another payload or issue a duplicate paste notice.
- [ ] **AC-4.5** Given no previous successful payload in a tab When its first valid automatic parse completes Then one `Parsed · N values` success notice is requested; given previous successful data When a material change parses Then one `Payload updated · N values` notice is requested. Singular counts read `1 value`.
- [ ] **AC-4.6** Given previously successful data When only whitespace, object key order or equivalent numeric spelling changes Then feedback refreshes without a success notice or resetting tree selection, expansion or revealed array children; when keys, values, types, array order or values beyond a shortened preview change Then a material-change notice is requested.
- [ ] **AC-4.7** Given a valid textual paste When it completes, including a repeated identical paste Then exactly one `Parsed · N values` notice is requested for that paste; when tabs/screens are revisited or presentation is recreated Then that notice is not repeated.
- [ ] **AC-4.8** Given a successful payload When automatic validation encounters invalid, empty or over-limit text Then the previous successful tree and usable references remain with retained-output feedback and no success notice; when the text is corrected to semantically identical successful data Then the error clears without a success notice.
- [ ] **AC-4.9** Given displayed parsed data When an invalid paste occurs Then the displayed tree and selection clear, an error appears, and the semantic baseline remains available for deciding whether later automatic changes are material.
- [ ] **AC-4.10** Given identical samples in two tabs When each receives its first valid automatic parse Then each gets its own initial notice; when only one tab receives a material change Then only that tab's baseline and notice change.
- [ ] **AC-4.11** Given each Action/Trigger and Full output/Body only root combination When a leaf, container, null or root reference is copied Then it uses the chosen root, preserves the exact typed path and adds no inferred body segment; inline copy wraps the same bare text in `@{...}`.
- [ ] **AC-4.12** Given a selected array leaf from source action `Get items` and a separately entered loop name `Apply to each` When its named-loop reference is copied Then it uses `items('Apply_to_each')` and the suffix after the innermost array index; when the loop name is blank Then no named-loop copy is usable and the `item()` block remains available.
- [ ] **AC-4.13** Given object keys `O'Brien`, `0`, `a.b` and `a/b` When those paths are copied Then apostrophes are doubled and each key remains one string segment, including `?['0']` rather than `[0]`.
- [ ] **AC-4.14** Given a clipboard failure When any bare or inline copy action is invoked Then an error is reported and successful-copy feedback is absent.

### Story 5: Work within the host window

**As a** maker
**I want** the payload controls and panes to fit my window
**So that** I can reach every field, search result and copy action.

**Acceptance criteria:**

- [ ] **AC-5.1** Given a 1280 × 860 viewport in either palette When JSON reference is opened with multiple samples Then the 13c card row appears between the shared header and the existing panes; each card shows its name, monospaced root expression and visible status line with a dot, the selected card has an accent border/background and subtle shadow, and a dashed `+ New payload` card follows the payloads inside that row, with count and search alongside; existing Source, Payload and Reference pane styling and arrangement are retained.
- [ ] **AC-5.2** Given the standalone or hosted app at 375 × 667, 768 × 1024, 900 × 700, 1280 × 420, 1280 × 860 or 1440 × 900 When any screen is opened in either palette Then the page has no horizontal overflow and every control can be reached by scrolling its owning region.
- [ ] **AC-5.3** Given a short 1280 × 420 window with a large sample When JSON reference is opened Then the header and payload strip fit without empty layout space creating unnecessary page scrolling, and Source, Payload and Reference content scroll sufficiently to reach their last controls or rows.
- [ ] **AC-5.4** Given a narrow viewport When the desktop row cannot fit Then payload tabs remain horizontally scrollable within their strip, search/count remain reachable, and Source, Payload and Reference stack in that order without page-level sideways scrolling.
- [ ] **AC-5.5** Given keyboard-only use When tabs, close/add controls, root choices, tree rows, search results and copy actions are operated Then selection and focus are visible, labelled and correctly associated with their content; closing a focused payload places focus on its surviving replacement tab.
- [ ] **AC-5.6** Given payloads that are empty, successfully parsed, pending validation or in error (including a retained successful tree) When their cards are displayed or the state changes Then every card visibly shows that payload's current status text and corresponding neutral, good, warning or danger dot without requiring activation or hover; truncated names, roots and statuses retain their full accessible text, and the root expression is also available on hover.
- [ ] **AC-5.7** Given any of the three screens in either host When the shared mode menu is opened Then its options appear in the exact order `Trigger / Filter`, `JSON reference`, `Functions`; choosing each option shows that screen and updates the active label while retaining its session state and actions, and a fresh session still opens Trigger / Filter.
- [ ] **AC-5.8** Given a viewport at or below 900px wide When the payload strip is displayed Then the card row and count occupy the first row, search spans the row below, and long or numerous cards scroll locally with `+ New payload` reachable at the end; keyboard navigation or adding a payload scrolls the focused card into view without page-level horizontal overflow.

## Functional Requirements

### FR-1: Payload session and strip

**Must:** Maintain one to five independent samples in current tab order. Start with one empty Action / Full output sample. The `+ New payload` card appends and activates an empty payload and focuses its tab; closing follows AC-1.5. Preserve each payload's source root, action-name interaction state, textarea text, parse attempts, successful baseline, displayed data, errors, selected path, expanded nodes, revealed array children, loop name and copy preferences through switching. State must survive screen changes and clear on application reload.

**Must:** Show Action tabs using the trimmed entered action name, or `Payload N` for their current one-based position when unnamed. Trigger tabs must use `Trigger`, `Trigger 2`, and following trigger ordinals in current tab order. Each card must show its name, chosen root expression and visible parse status on separate lines. A missing Action name must show the existing `Action_name` preview without enabling reference generation. Display the current count as `N / 5`. Identical labels must still refer to independent payloads.

**Must not:** Load demonstration payloads in a new session, allow the last payload to close, allow a sixth payload, or use display labels as the source's identity.

### FR-2: Cross-payload search

**Must:** Match trimmed, case-insensitive substrings against complete leaf paths and complete leaf values in displayed parsed data. Leaves include strings, numbers, booleans, null and empty containers; a root leaf must display `(root)`. Match before shortening value previews. Present up to eight results with the complete match count and parsed-source count. Order results by tab order, then existing object-key/array-index traversal order. Search must not depend on a source having a valid action name.

**Must:** Reveal only a still-existing result, activate its source, select and scroll to its exact typed path, expand its ancestors, reveal any initially hidden array item, close and clear search, and return focus to the selected tree row. Opening ancestors must preserve unrelated expansion state. Results must refresh when displayed data or sources change. Down/Up must wrap through displayed options; Enter must reveal the active option; Escape must clear and close. Search without results must leave the current tree selection unchanged.

**Must not:** Search unparsed textarea drafts, match only truncated previews, treat a numeric object key as an array index, or offer a stale result after its source/path disappears.

### FR-3: Functions source groups

**Must:** Use all payloads with displayed parsed data, including inactive tabs and retained successful data. Preserve the existing single-source presentation for one parsed source. With two or more parsed sources, show independently collapsible payload groups with labels, current root captions, matching counts and source-specific accessible reference descriptions. Existing Functions search must filter function names and Parsed Value paths; the JSON search remains a separate path-and-value search.

**Must:** Apply the 200-leaf limit after path filtering across all sources together in tab order. Report omitted matching leaves as `+N more — narrow with search`. Keep the existing initially collapsed independent array-item accordions. Show the missing-action-name instruction for an unusable source; such a source must not consume the budget for insertable leaves. Support scalar null and empty-container root leaves. Keep existing argument-targeting, wrapping, validation and bare/inline copy behavior from Spec 001.

**Must not:** Merge rows with equal paths from different payloads, reset Functions arguments when switching sources, or rewrite previously inserted argument text when a source is renamed, reconfigured or removed.

### FR-4: Parsing, paste and notices

**Must:** Preserve the existing immediate whole-field native paste behavior and 600ms active-view automatic validation. Parsing, semantic equality, errors and notice eligibility must belong to the edited payload. Cancel pending automatic work when its payload becomes inactive, is closed, or completes a paste; returning to an unvalidated draft must start a fresh delay. Presentation changes, tab switches and repeated presentation setup must not repeat a delivered notice.

**Must:** Preserve the distinctions between automatic validation and paste failure in Story 4. Source inline feedback must remain visible with these states: `Nothing parsed yet`, `Sample changed. Waiting for valid JSON.`, `Could not parse`, `Could not parse. Showing last successful payload.`, and `Parsed · N values` (with `1 value` for a singular count). Every card must also show a visible status caption and dot: neutral for `Nothing parsed yet`, good for successful parsing, warning with `Pending validation` for an unvalidated draft without a current error, and danger for a parse error, including `Could not parse. Showing last successful payload.` when output is retained. Accessible descriptions must include the full root and current card status, even when the visible caption is shortened. A retained successful tree must not make an errored card appear successful.

**Must not:** Add a Parse button, reinstate `Parse again` instructions, reset semantic baselines by switching tabs, deduplicate separate valid paste operations, or report a success before parsing succeeds.

### FR-5: Source roots and reference copying

**Must:** Keep the four Reference root choices grouped under Action and Trigger: Full output and Body only. Show Action name only for Action roots. Preserve required-name feedback, the top-level-body hint, correct source-name normalization and quoted-key escaping, selection of roots/containers/null, and exact array indices. Do not infer or insert a body segment from sample content.

**Must:** Retain the current Reference panel's selected-path breadcrumbs and reference blocks with help, bare Copy and `@{}` actions. For an indexed path, retain the fixed-position warning and current-loop `item()` block. Show a separately labelled Loop name input for named `items()`; require a nonblank loop name and never substitute the source action name. Keep those settings independent per payload. Clipboard failure must show an error and must not announce successful copying. Missing Action name or missing displayed parsed data must leave explanatory feedback with no usable copy action.

**Must not:** Introduce host insertion, expression evaluation, or replace working reference behavior with the prototype's simplified clipboard or parser behavior.

### FR-6: 13c cards, screen order and preservation of host fit

**Must:** Replace the 13b capsule track with the 13c row of individual rounded rectangular cards. Cards have a primary name, monospaced root caption and visible status line with a dot; close controls remain discrete at the upper right and are omitted for the last payload. Place the dashed `+ New payload` card immediately after the payloads inside the horizontally scrollable card row, stretching to the same height, rather than as a separate strip-level button. Keep `N / 5` and `Search all payloads` outside the scrolling row. Preserve the existing Source, Payload and Reference bodies, pane chrome, desktop arrangement and copy-block placement.

**Must:** Use the following 13c reference measurements and current theme roles for the new controls in both palettes. The mockup defines the content hierarchy and card silhouette; the supplied stylesheet provides the theme-based mapping and responsive strip behavior. The card height must accommodate all three lines (approximately 75px in the mockup), rather than clip content to a fixed canvas measurement.

| Element | 13c visual contract |
|---------|---------------------|
| Strip | Flexible scrolling card row, separate count, then a 280px search field on desktop; 12px gaps between strip regions and 8px between cards. No enclosing pill/capsule track. |
| Payload card | 200px reference width, 10px corner radius and 1px border; approximately 10px vertical / 14px left padding with room for the close control; 4px gaps between name, root and status. |
| Selected / unselected card | Selected uses accent border, accent-soft background, primary text and a subtle shadow; unselected uses surface, border and secondary-text roles. Hover strengthens the border. Root text uses an accent role when selected and secondary text otherwise. |
| Card typography/status | Name 14px semibold; root 11px in the existing monospace family; status 11px secondary text with a 7px dot and 6px gap. Use neutral/good/warn/danger theme roles; visible text conveys the state independently of color. Long lines ellipsize and retain full accessible text. |
| Close control | 20 × 20px visual control at the upper right (approximately 8px from the right and 9px from the top), with its own accessible name, keyboard activation and hover/focus treatment. |
| Add card | 120px reference width, 10px padding and corner radius, dashed border, transparent background and accent-colored 13px semibold `+ New payload` label. At capacity it remains present with a visibly disabled treatment. |
| Search/count | Search retains its leading search icon, 34px reference height and 12px radius; count uses 12px secondary text. Results retain payload identity, path, value preview and an announced total/parsed-source count. |
| Search popup | Rounded bordered surface with shadow, highlighted active option and rows at least 44px high; anchor it to search and constrain its position/size to the viewport so it is scrollable and not clipped by the card row or pane containers. |
| Focus/motion | Visible focus outline using the accent role (2px reference width with 2px offset); suppress nonessential transitions for reduced motion. |

**Must:** Adapt to available host dimensions. Above 900px, arrange the scrolling card row, count and search in three strip regions. At 900px and below, use two regions for cards/count and let search span the next row. Do not squeeze five cards into unreadable widths; scroll the card row locally, including the add card. Keyboard navigation and add/close focus changes must reveal the focused tab within that row. Account for the taller cards rather than retaining a height allowance intended for the old header-only body or pill strip. Preserve existing responsive pane stacking at narrow widths. On desktop, Source body, tree and Reference body must each reach their final content through their own scrolling region. Adjust body sizing only as required to accommodate the new controls and preserve reachability. Long captions, paths and expressions must remain discoverable through accessible descriptions, wrapping or local scrolling.

**Must:** Set the shared mode menu order to `Trigger / Filter` → `JSON reference` → `Functions` in both web and PPTB. Keep the existing screen IDs, dropdown component, default Trigger / Filter screen, per-screen actions, web-only palette selection and host-controlled palette behavior. This supersedes Spec 001's FR-3 / AC-3.1 order without redesigning the header or other screens. Preserve viewport fit of the other two screens.

**Must not:** Apply the prototype's full-page redesign, pane widths or pane-body restyling; treat its fixed canvas dimensions or literal dark colors as required runtime sizing/theme implementation; introduce a theme toggle into the hosted/shared workspace; or retain the earlier 13a underline / 13b pill-tab appearance for the payload strip.

## Non-Functional Requirements

### Performance

- Each sample must retain the current strict-JSON limits: 1 MiB, 10,000 values and 64 nesting levels. Limits apply separately to each payload; five allowed samples must be supported without reducing the individual limits.
- Search must cap rendered results at eight and Functions must cap rendered leaves at 200 across sources. Counts must reflect all matching leaves even when capped or collapsed.
- Automatic validation must use the defined 600ms inactivity interval; rapid editing must not validate an intermediate draft after a later edit.

### Security

- Samples must be processed locally, with no sample upload, settings writes, persistent storage or sample telemetry added by this feature.
- Displayed keys, values and search previews must be treated as text; sample content must not execute as markup or code.
- Sample JSON, action names and loop names must retain disabled spelling, autocorrection and autocomplete assistance where the current editor disables them.

### Reliability

- Payload identity must remain stable across rename, source changes and removal of other tabs. Delayed operations and notice bookkeeping must not target a replacement occupying the same position.
- Successful reference copying must preserve the current exact bare or wrapped expression text in both hosts. Notice invocation and actual host delivery are separate acceptance evidence.
- Existing condition documents, fields, imports, exports and Functions expressions must survive navigation through the new workspace.

### Accessibility and responsive behavior

- Tabs must have one selected item, roving focus, Left/Right and Home/End navigation, and a labelled association to the visible payload panel. Close actions must identify their payload and remain independently operable without accidentally selecting another payload.
- The in-row `+ New payload` card remains an independently labelled button, outside payload-tab arrow navigation and selected-tab semantics. Each tab's accessible name includes its current position; its description includes the complete root and status. Close buttons remain separate from tab buttons. Preserve valid tablist/panel relationships when arranging these controls in one scrolling row.
- Search must expose combobox/listbox relationships, an announced result count and an active option. It must keep focus in search during arrow navigation and move it to the selected tree row on reveal.
- The tree must retain its existing Up/Down, Left/Right, Home/End, Enter/Space and Show more keyboard behavior. New source groups must announce their expanded state.
- Every interactive control must show a visible focus indication. Body text must meet 4.5:1 contrast; large text and control boundaries/focus indicators must meet 3:1. Status must not depend on color alone. Reduced-motion preference must suppress nonessential transitions.
- Acceptance must include real rendered viewport/keyboard evidence for Story 5, native browser editing evidence for AC-4.1/4.2, and actual Toolbox clipboard/notification evidence. Automated state checks alone do not establish those outcomes.

## Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Fifth payload is already open | New payload is unavailable; existing state remains intact. |
| Last payload close attempt | Last payload remains open; no close action is offered. |
| Invalid JSON, empty text or size/value/depth limit during automatic validation | Retain last successful displayed data when available, show pending/error and retained-output feedback, and request no success notice. |
| Invalid or over-limit pasted JSON | Clear displayed tree/selection, show the current parser's specific failure, and preserve the semantic baseline for later comparison. |
| Action name blank | Show required-name feedback after the current interaction trigger; preview the placeholder root, disable reference copying/insertion for that source, and allow searching its displayed data. |
| Loop name blank on an indexed path | Current-loop and fixed-index references remain available; the named-loop block requests a name and exposes no usable named-loop copy action. |
| Clipboard unavailable or rejected | Show the existing clipboard error; do not report that copying succeeded. |
| Search has no matches | Show `No matches in parsed payloads.` with zero matches; leave source and selection unchanged. |
| Search target or timed parse source was removed | Ignore the unavailable target, refresh results and maintain a valid active payload; do not mutate its replacement. |
| Automatic parse fails before any successful sample | Show parse feedback without a fabricated tree or reference. |
| Very long tab names, paths, expressions or five tabs in a narrow window | Keep all controls reachable with local overflow handling and full accessible labels/descriptions. |

## Open Questions

None for this spec revision. On 2026-10-08 the user confirmed the limited multi-payload scope and deferred full Trigger / Filter and JSON page redesigns. The 2026-10-20 request incorporates the 13c card strip and menu order within that boundary. Prototype conflicts are resolved by the precedence above; the deferred redesigns remain excluded. Downstream plan/code alignment is a separate task, and the v1.0.1 plan must be reviewed before further execution.

## Out of Scope (Future Considerations)

- Tab rename controls independent of action names, drag reordering and restoring closed tabs.
- Sample persistence, import/export of payload sessions and recovery after reload.
- Adding payload references to Trigger / Filter fields or dragging Parsed Value rows into arguments.
- Full Trigger / Filter and JSON page redesigns, including the 12a/12b bodies and the 13b pane-body restyling/layout; new function categories, evaluation and live-flow integration.
- Git publication and dependency cleanup, including the existing unrelated package manifest change.
