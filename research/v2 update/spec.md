# Feature Specification: JSON Reference Builder

**Feature branch**: `json-parse`
**Created**: 2026-09-26
**Status**: Final, ready for planning. Results of the live-flow checks (SC-008) can still amend it.
**Builds**: the Power Platform ToolBox (PPTB) tool (`apps/pptb`) and the static web build (`apps/web`, published to GitHub Pages). Both render the same shared shell, so every requirement applies to both builds unless it says otherwise.
**Input**: Finalize the spec from the design handoff, which was derived from the feasibility study. Target both the PPTB build and the static page build.

**Sources**

| Source | Used for |
| --- | --- |
| [Design handoff README](JSON%20Reference%20Builder%20Mockups/design_handoff_json_reference_workspace/README.md) (option 1a) and its prototype | The source of truth for layout, tokens and wording |
| [Feasibility study](jsontoexpression-merge-feasibility.md) | Scope, expression grammar, risks |
| [Earlier results](results.md) | An independent run of the same research brief |
| Product-owner answers, 2026-09-26 | [Clarifications](#clarifications) |
| PPTB developer docs; Microsoft Learn | Host APIs and expression grammar ([References](#references)) |

## Summary

This feature adds a second builder, **JSON reference**, next to the existing **Condition builder**. A flow maker pastes a sample output from a flow run and says where it came from: an action (with its name) or the trigger, and the full output or the body only. They then select any value in a tree and copy a correctly rooted reference, for example `outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']`.

The builder is a separate workspace that the user opens from tabs in the header. It is not a third expression mode. It never changes the condition document, it saves nothing, and it makes no network requests.

## Clarifications

### Session 2026-09-26

- Q: When the user switches back to the Condition builder, what happens to the JSON reference state? → A: It stays in memory until the page or tool reloads. (Handoff open question 1.)
- Q: How does the UI direct Compose users to the right option? → A: The full-output option is titled "Full output (also Compose)". This applies only when **Output from** is Action. For Trigger the title stays "Full output", because triggers have no Compose case. (Handoff open question 2.)
- Q: Where does this spec live? → A: In `research/v2 update/`, next to the handoff and the research.
- Q: Does any product text outside the app change? → A: Yes. Update the docs, both changelogs, and the PPTB manifest description and keywords. The header brand and subtitle stay as they are.

## Source reconciliation

The table below records every place where the sources disagree, and every change that came from the checks made for this spec. The final decision is binding.

| # | Topic | What the sources say | Final decision | Basis |
| --- | --- | --- | --- | --- |
| 1 | Where the feature lives | Feasibility: a dialog. Handoff: a workspace inside the shell (1a). | A workspace, opened from header tabs. | The owner picked 1a. |
| 2 | State when switching | Feasibility: discard it on close. Handoff: keep it (open question). | Keep it until reload (FR-008). | Owner decision. |
| 3 | Compose guidance | Handoff open question. | "Full output (also Compose)", for Action only (FR-014). | Owner decision. |
| 4 | Case in action names | Handoff: sources disagree, so don't normalise. | Keep the case exactly. | Microsoft Learn's cloud flow error reference says names must "match exactly (case-sensitive)". |
| 5 | Editing after a parse | Feasibility: reset the output when the input changes. Handoff: keep the old tree and warn. | The handoff's behaviour (FR-027). Copy stays available for the last parsed tree. | A reference depends only on the path and the source, and both remain valid. The status line warns. |
| 6 | Copy formats | Feasibility: offer the inline form only if users ask. Handoff: both forms, bare by default. | The handoff's behaviour (FR-050). | Microsoft: `@{}` is needed only inside text, and it always produces a string. |
| 7 | Starting view | The prototype's `startView` tweak opens on JSON. | Always open on the Condition builder (FR-002). | Existing users land where they did before. Onboarding still describes that builder. |
| 8 | Default action name | The prototype pre-fills "Get items". | Empty (FR-011). | A plausible default produces references that look valid but are wrong. |
| 9 | Default expansion and selection | The prototype opens the path to `Email` in its demo sample. | After a parse, the root is expanded. The old selection is kept if its path still exists; otherwise the root is selected (FR-025). | The prototype path fits only its own sample. |
| 10 | Root label when the name is blank | The prototype shows `Action_name` on the cards but `outputs('')` in the tree and breadcrumb. | Show `Action_name` everywhere (FR-014). | Consistency. |
| 11 | Header at 901–1,370px | The handoff doesn't cover it. Measured in the prototype: the Condition header grows from 63px to 117px at 1280px (two rows). | One row, no taller than today (FR-007). | Protects the canvas height in the 1280×420 PPTB frame, which an existing e2e test checks. |
| 12 | Header at 375px | Handoff: the privacy text wraps. Measured: the tab strip is 392px wide and the page scrolls sideways. | No horizontal scrolling (FR-092). | Measurement. |
| 13 | Position of the Reference card | In the prototype the tree takes the height, so Copy is below the fold at 1280×800. | The tree scrolls inside its card, and the Reference card stays visible at 1280×800 (FR-092). | Measurement. This matches how the Condition canvas and preview share space. |
| 14 | Rule count's accessible name | The prototype puts `aria-label="3 rules"` on a plain `span`. | The tab's accessible name includes the count (FR-003). The plan picks the technique. | ARIA doesn't allow names on generic elements, and accessibility scanners flag it. |
| 15 | Landmarks | The prototype renders each panel as `<main role="tabpanel">`, which removes the main landmark. | Exactly one main landmark at a time (FR-005). | The same scan. |
| 16 | PPTB copy failures | Feasibility: the PPTB adapter should reject when the host has no clipboard API. | Required (FR-071). Export must also handle the rejection (FR-072). | `exportDocument` has no error handling (`ExpressionBuilderShell.tsx:189-192`), so the rejection would go unhandled. |
| 17 | PPTB hosts | The handoff says "PPTB". | Test in the desktop app (required) and the VS Code extension (recommended). `minAPI` stays 1.0.17 (FR-075). | PPTB docs: two hosts share one webview, and `utils.copyToClipboard` needs 1.0.17. |
| 18 | Spell checking | Not covered. | Off for the sample and action-name fields (FR-062). | Some browsers offer cloud spell checking, which would send pasted text off the device. |
| 19 | Tree component | Handoff: check the pinned Fluent `Tree` before choosing. | The spec fixes the keyboard contract only (FR-036). The plan picks the component. | The pinned `@fluentui/react-tree` 9.16.3 README still says it is not production-ready. Fluent `Tree` also toggles on click and Enter by default instead of selecting. |
| 20 | Null-safe indices | Microsoft Learn now says `?` also guards array elements. | Keep `[n]` and the fixed-position note. Record how `?[n]` behaves in the live-flow checks. | Microsoft documents `[n]` for array positions. Behaviour at the array bounds is unverified. |

## User scenarios and testing

### User story 1: Copy a reference to a value in an action's output (priority P1)

A flow maker has the raw output of a *Get items* run. They open JSON reference and keep **Output from** set to Action. They enter `Get items`, keep "Full output (also Compose)", paste the output and select **Parse**. Then they expand the tree, select the value they need and copy the reference into the expression editor.

**Why P1**: this is the feature's core job.

**Independent test**: in either build, with no fields and no connection, paste fixture A1 ([Appendix A](#appendix-a-reference-cases-normative)), select `body › value › [0] › Requester › Email`, copy, and compare the clipboard with case 1.

**Acceptance scenarios**

1. **Given** Action, the name `Get items`, Full output, and fixture A1 parsed, **when** the user selects `Email`, **then**:
   - the expression reads `outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']`;
   - the breadcrumb reads `outputs('Get_items') › body › value › [0] › Requester › Email`;
   - the card header reads `string · "dana@contoso.com"`;
   - the fixed-position note shows `[0]`.
2. **Given** that selection, **when** the user selects **Copy**, **then** the clipboard holds exactly the displayed expression, and the status reads "Expression copied" for 1.2 seconds.
3. **Given** fixture A1, **when** the user selects the `value` array, the `Requester` object, the `@odata.nextLink` null or the root row, **then** the reference points at that value (the root row gives `outputs('Get_items')`), and Copy works.
4. **Given** a Compose output (an object with no `body` key), with Action and Full output, **when** the user selects `customer`, **then** the reference is `outputs('Compose')?['customer']`.
5. **Given** the copy format "Inside text @{…}", **when** the user copies, **then** the clipboard holds `@{<reference>}`, and the idle status reads "Inline text: use inside a string".
6. **Given** Body only and a parsed sample with a top-level `body` key, **then** the `body` hint appears, and the reference still starts `body('Get_items')?['body']`. Nothing is inferred.

### User story 2: Reference a trigger's output (priority P2)

**Why P2**: references into trigger payloads are useful, but action outputs are the more common case. The parser, tree and copy are shared, so supporting triggers costs little.

**Independent test**: choose Trigger, paste a request body, select a nested value and copy.

1. **Given** Trigger and Body only, **when** the user selects `customer › name`, **then** the reference is `triggerBody()?['customer']?['name']`.
2. **Given** Trigger, Full output, and a sample with `headers` and `body`, **when** the user selects `headers › content-type`, **then** the reference is `triggerOutputs()?['headers']?['content-type']`.
3. **Given** Trigger, **then** the Action name field is hidden, the options read "Full output" and "Body only", and Copy doesn't depend on a name.

### User story 3: Switch between builders without side effects (priority P1)

A maker is building a Filter array predicate. They switch to JSON reference to get the reference for the action's **From** array, then switch back to finish the predicate.

**Why P1**: the new builder must not put the existing product's output at risk.

**Independent test**: build a document and export it. Use JSON reference in every way, switch back, export again, and compare the two exports.

1. **Given** a document with rules, **when** the user opens JSON reference, parses a sample, selects a value, copies, and switches back, **then** the document, mode, fields, source, generated predicate, diagnostics and exported JSON are all unchanged, byte for byte.
2. **Given** the user returns to JSON reference, **then** the sample, source settings, tree expansion, selection and copy format are as they left them.
3. **Given** the user reloads, **then** the app opens on the Condition builder and JSON reference is empty.
4. **Given** JSON reference is selected, **then** the header hides the mode switch, Import and Export, and shows the privacy sentence. **Given** the Condition builder is selected, **then** the header looks as it does today, plus the tabs.
5. **Given** a document with three rules spread across nested groups, **then** the Condition builder tab shows 3, and its accessible name includes "3 rules".

### User story 4: Understand and recover from bad input (priority P2)

1. **Given** an empty sample, **when** the user selects Parse, **then** an alert reads "Paste a sample before parsing."
2. **Given** invalid JSON, **then**:
   - the alert reads "Not valid JSON: " followed by the parser's message;
   - the tree and the selection are cleared;
   - the status reads "Could not parse".
3. **Given** a sample larger than 1 MiB, with more than 10,000 values, or nested deeper than 64 levels, **then** the matching limit message appears and no tree is shown.
4. **Given** a parsed sample, **when** the user edits the text, **then** the status reads "Sample changed. Parse again to update.", and the previous tree stays usable.
5. **Given** Action with a blank name after a parse, **then**:
   - the field is marked invalid, and its helper text reads "Enter the action name to build the reference.";
   - the expression area reads "Enter an action name";
   - Copy is disabled.
6. **Given** a PPTB host without a clipboard API, **when** the user copies, **then** the status reads "Could not copy expression: <reason>", never "Expression copied".

### User story 5: Complete the task by keyboard and with a screen reader (priority P2)

1. **Given** focus on a builder tab, **when** the user presses ←, →, Home or End, **then** focus and selection move between the tabs.
2. **Given** focus in one of the three radio groups (Output from, The pasted JSON is, Copy format), **when** the user presses an arrow key, **then** the choice moves and the new choice is announced.
3. **Given** focus in the tree, **then** the keys work as FR-036 says. Each row announces its label and type, its value (for leaves), and its level, position, expanded state and selected state.
4. **Given** a parse or copy result, **then** it is announced: errors as alerts, statuses politely.

### User story 6: Same behaviour in the PPTB tool and on the static site (priority P1)

**Why P1**: the request targets both builds. They differ only in how they reach the clipboard and the theme.

1. **Given** the PPTB desktop app, **when** the user copies, **then** the host clipboard receives the text.
2. **Given** the static site in a current Chromium browser, **when** the user copies, **then** the browser clipboard receives the text. If the browser refuses, the error status appears.
3. **Given** the host or the operating system switches between light and dark, **then** the JSON reference view follows, like the rest of the app.
4. **Given** either build, **then** using the feature makes no network requests and no storage writes.

### Edge cases

- **Unusual keys** (`O'Brien`, `a.b`, `body/value`, `first name`, `[x]`, `@odata.nextLink`, the empty string, Unicode, `"0"`): each key is one segment. It is output as parsed, with apostrophes doubled ([Appendix A](#appendix-a-reference-cases-normative)).
- **Keys with built-in object names** (`__proto__`, `constructor`, `hasOwnProperty`): these are listed, selected and referenced like any other key.
- **A top-level primitive** (`"text"`, `42`, `true`, `null`): the tree has only the root row, and the reference is the root expression.
- **A top-level array**: its elements show as `[0]`, `[1]` and so on. A reference looks like `triggerBody()[0]?['id']`.
- **An empty object or array**: shows as a leaf, with the preview `{0}` or `0 items`. It is selectable.
- **An array with more than 20 elements**: shows "Show N more". Revealed elements are hidden again after the next successful parse.
- **An object with thousands of members**: must stay responsive (FR-039).
- **Integer-like keys**: they may be listed first, following the parser's key order. References are unaffected.
- **Duplicate keys in the text**: the last value wins, and the tree shows only that value.
- **Integers beyond ±2^53**: the preview shows the rounded number the parser returns. The reference is unaffected.
- **JSON text inside a string**: stays a string.
- **Action names**: leading and trailing whitespace is trimmed. Each internal run of whitespace (spaces, tabs or line breaks) becomes one underscore. Apostrophes are doubled and case is kept. A name that is only whitespace counts as missing.
- **Changing the source after selecting a value**: the reference updates, the tree doesn't change, and the copy status resets.
- **Parsing again when the selected path no longer exists**: the root is selected.
- **Collapsing an ancestor of the selected row**: the selection stays. Focus moves to the row that was collapsed.
- **Copying twice within 1.2 seconds**: the confirmation timer restarts.
- **Leaving the builder while "Expression copied" shows**: on return, the status shows the idle text.
- **First run**: the onboarding dialog opens over the Condition builder, as today. Dismissing it writes the existing onboarding setting. That write belongs to onboarding, not to this feature.

## Requirements

### Functional requirements

**Builder switching and header**

- **FR-001**: Both builds MUST show two builder tabs in the header, directly after the brand block: "Condition builder" and "JSON reference", in that order, with the icons named in the handoff.
- **FR-002**: The app MUST open on the Condition builder every time it loads. The last builder used is not remembered.
- **FR-003**: The Condition builder tab MUST show the number of rules in the document. The count includes rules at every nesting level and excludes groups. It MUST be part of the tab's accessible name as "N rules" ("1 rule" for one).
- **FR-004**: The tabs MUST follow the WAI-ARIA tabs pattern with automatic activation:
  - the tablist is labelled "Builders";
  - each tab exposes whether it is selected, and controls a panel that is present in the DOM;
  - each panel is labelled by its tab;
  - only the selected tab is in the Tab order;
  - ← and → move to the previous or next tab (wrapping around), and Home and End move to the first or last tab.
- **FR-005**: Only the selected builder's panel MUST be visible and exposed to assistive technology. Exactly one main landmark MUST be exposed at any time.
- **FR-006**: In the Condition builder view, the header MUST show the mode switch, Import and Export as it does today. In the JSON reference view, it MUST hide all three and show this sentence: "Pasted JSON is processed locally and is not uploaded or saved by this feature."
- **FR-007**: Above 900px wide, the header MUST stay on one row in both views and MUST NOT be taller than today's header. When space runs short, the title is truncated with an ellipsis before any control wraps; the full title stays available to assistive technology. If that is not enough, Import and Export may become icon-only buttons with accessible names. At 900px and below, the existing stacked header applies, and the tabs may take a row of their own.
- **FR-008**: Each builder MUST keep its in-memory state while the user switches between them, until the page or tool reloads. That state is everything the user entered or chose. Scroll positions and transient messages need not survive a switch. JSON reference state MUST NOT survive a reload.
- **FR-009**: Using JSON reference in any way, including switching to it and back, MUST NOT change any of these: the condition document, the mode, the fields, the field source, the selected rule, the active group, the generated predicate, the diagnostics or the Export output.

**Source**

- **FR-010**: The Source pane MUST offer **Output from** with two choices, Action and Trigger. Action is the default.
- **FR-011**: When Action is selected, the pane MUST show an **Action name** field. It starts empty, and its helper text reads "As shown in the flow designer. Spaces become underscores." The field is hidden when Trigger is selected, and it keeps its value if the user switches back.
- **FR-012**: An action name that is empty or only whitespace is missing. While it is missing, Copy is disabled (FR-052) and the expression area reads "Enter an action name" (FR-044). Once the user has parsed a sample or typed in the field, a missing name MUST also show as invalid:
  - the invalid state is exposed to assistive technology;
  - the field gets the danger border;
  - the helper text changes to "Enter the action name to build the reference." in the danger colour.
- **FR-013**: When the action name is written into a reference, it MUST be trimmed, each internal run of whitespace MUST become one underscore, and each apostrophe MUST be doubled. Case and all other characters are kept. No other validation applies.
- **FR-014**: The Source pane MUST offer **The pasted JSON is** as two option cards. Each card shows the root it produces under its title, updated as the user types.

  | Output from | Option | Card title | Root |
  | --- | --- | --- | --- |
  | Action | Full output | Full output (also Compose) | `outputs('<name>')` |
  | Action | Body only | Body only | `body('<name>')` |
  | Trigger | Full output | Full output | `triggerOutputs()` |
  | Trigger | Body only | Body only | `triggerBody()` |

  Full output is the default. Wherever a root is shown while the name is missing (the cards, the tree's root row, the breadcrumb), the name MUST show as `Action_name`.
- **FR-015**: The builder MUST NOT infer or change the source from the sample's content. A top-level key named `body` MUST NOT change the root or add or remove a segment. When Body only is selected and the parsed sample is an object with its own top-level `body` key, the Payload card MUST show this warning: "This sample has a top-level `body` key. If you pasted the full output, choose **Full output**."
- **FR-016**: Changing Output from, the action name, or The pasted JSON is MUST immediately update the card roots, the tree's root row, the breadcrumb and the reference. It MUST NOT parse the sample again or change the tree's contents, expansion or selection. It MUST reset the copy status to idle.

**Parsing and limits**

- **FR-020**: The sample MUST be parsed only when the user selects **Parse**.
- **FR-021**: Parse MUST run these checks in order and stop at the first failure. The failure's message appears in an alert box, and the status reads "Could not parse".

  | Check | Message |
  | --- | --- |
  | Empty, or only whitespace | Paste a sample before parsing. |
  | Larger than 1 MiB (1,048,576 bytes in UTF-8) | Sample is larger than 1 MiB. Trim it to the part you need. |
  | Not valid JSON | Not valid JSON: \<parser message\> |
  | More than 10,000 values | Sample has more than 10,000 values. Trim it to the part you need. |
  | Nested more than 64 levels deep | Sample is nested deeper than 64 levels. |

- **FR-022**: A value is any JSON value in the sample: the root, each object, each array and each leaf. The root is at depth 0, and each level of nesting adds 1. The check MUST stop walking the sample as soon as a limit is exceeded.
- **FR-023**: The parser MUST accept standard JSON (RFC 8259) exactly as the platform's built-in JSON parser does. Comments, trailing commas and single-quoted strings are rejected. When a key appears twice, the last value wins. No new parser dependency is added.
- **FR-024**: The three limits are provisional. They MUST be defined as named constants, and they MUST be confirmed or changed by the benchmark in SC-006 before release. If a limit changes, its message changes with it.
- **FR-025**: A successful parse MUST:
  - replace the tree with the new sample;
  - set the status to "Parsed · N values" and clear any error;
  - keep the selection if its path exists in the new sample, and otherwise select the root;
  - hide array elements revealed by "Show N more", and expand the root;
  - keep the expanded state of nodes whose paths still exist;
  - reset the copy status to idle.
- **FR-026**: A failed parse MUST clear the tree, the value count and the selection, and the Payload card MUST return to its empty state.
- **FR-027**: After a successful parse, if the text differs from the text that was last parsed, the status MUST read "Sample changed. Parse again to update." The last parsed tree, the selection and Copy stay available until the next parse.
- **FR-028**: A string value that contains JSON text MUST stay a string.
- **FR-029**: The parse status MUST be a polite live region with four states:

  | Status text | Colour |
  | --- | --- |
  | Nothing parsed yet | muted |
  | Parsed · N values | good |
  | Sample changed. Parse again to update. | warning |
  | Could not parse | danger |

**Payload tree**

- **FR-030**: Before the first successful parse, and after a failed parse, the Payload card MUST show "No sample yet" and "Paste an action or trigger output from a flow run, then select Parse."
- **FR-031**: After a successful parse, the card header MUST show "N values", and the card MUST show a tree with one row per value. The root row's label is the current root expression. Object members are labelled with their key, and array elements with `[index]`.
- **FR-032**: Each row MUST show a type badge (string, number, boolean, object, array or null) and a one-line preview of the value:

  | Type | Preview |
  | --- | --- |
  | string | the text in double quotes |
  | number, boolean | the value as parsed |
  | null | `null` |
  | object | `{n}`, where n is the member count |
  | array | `n items` (`1 item` for one) |

  Long previews end with an ellipsis.
- **FR-033**: Every row MUST be selectable: the root, containers, empty containers and nulls included.
- **FR-034**: Rows that have children show a chevron. Activating the chevron expands or collapses the row without changing the selection. Activating the rest of the row selects it. Leaves and empty containers have no chevron. Collapsing a row never changes the selection.
- **FR-035**: An array with more than 20 elements MUST show its first 20 elements and then a "Show N more" row. Activating that row reveals the rest of that array.
- **FR-036**: The tree MUST follow the WAI-ARIA tree view pattern with single selection:
  - The tree has one tab stop. By default it is on the selected row, or on that row's nearest visible ancestor.
  - ↓ and ↑ move to the next or previous visible row. Home and End move to the first or last row.
  - → expands a closed parent, or moves to the first child of an open one.
  - ← collapses an open parent, or moves to the parent row.
  - Enter or Space selects the focused row, or activates "Show N more".
  - Each row exposes its level, its position, its set size, whether it is expanded (parents only) and whether it is selected.
- **FR-037**: Object members MUST appear in the order the built-in parser returns them. Keys such as `__proto__`, `constructor` and `hasOwnProperty` MUST be listed and referenced like any other key.
- **FR-038**: Sample content MUST be rendered only as text, never as HTML or markup. URLs in values are not turned into links or fetched.
- **FR-039**: With a sample at the limits, expanding any single node MUST NOT block the page for more than 1 second. If objects with very many members miss that target, they MUST get the same "Show N more" paging as arrays.

**Reference**

- **FR-040**: The reference MUST be the root expression followed by one accessor for each path segment, and nothing else. A key becomes `?['key']`, with each apostrophe doubled. An array index becomes `[n]`. An empty path gives the root expression on its own.
- **FR-041**: Keys MUST be output exactly as parsed, except that apostrophes are doubled. They are never trimmed, re-cased, split (on `.`, `/` or anything else) or encoded. The key `"0"` becomes `?['0']`, never `[0]`.
- **FR-042**: The builder MUST NOT add, remove or reorder `body` or any other segment on its own. The path comes only from what the user selects.
- **FR-043**: The Reference card MUST show:
  - a breadcrumb labelled "Selected path": the root expression, then each key or `[n]`, separated by ›;
  - the reference in the chosen copy format, with syntax colouring;
  - in the card header, a summary of the selection: its type, followed by its JSON value for strings, numbers and booleans (for example `string · "dana@contoso.com"`), truncated on screen when long.
- **FR-044**: When Copy is unavailable, the expression area MUST show a placeholder instead of a reference: "Enter an action name" if the action name is missing, and "Parse a sample and select a value" otherwise.
- **FR-045**: When the path contains at least one index, the card MUST show "Fixed position [i]: reads that item only, not each item in a loop." The note lists every index in path order, for example `[0][1]`.
- **FR-046**: Syntax colouring is for display only: the displayed text MUST equal what Copy writes. The colouring MUST treat `outputs`, `body`, `triggerOutputs` and `items` as functions, a string containing doubled apostrophes as one string, and brackets and braces as symbols. The Condition builder's preview MUST show the same text as before; only its colours may change.

**Copy**

- **FR-050**: The card MUST offer a **Copy format** choice:

  | Choice | Copies | Idle status text |
  | --- | --- | --- |
  | Expression editor (default) | the bare reference | Paste into the expression editor |
  | Inside text @{…} | `@{<reference>}` | Inline text: use inside a string |

- **FR-051**: **Copy** MUST write exactly the displayed text, as plain text, through the same clipboard route the Condition builder uses: the PPTB clipboard API in the tool, and the browser clipboard on the static site.
- **FR-052**: Copy MUST be disabled (not operable, and shown at 50% opacity) when there is no parsed sample (nothing parsed yet, or the last parse failed), or when Output from is Action and the name is missing.
- **FR-053**: After a successful copy, the status MUST read "Expression copied" in the success colour for 1,200 ms, then return to the idle text. Copying again within that time restarts the timer. The timer MUST be cleared when the builder unmounts.
- **FR-054**: After a failed copy, the status MUST read "Could not copy expression: <reason>" in the danger colour. The builder MUST NOT show "Expression copied" unless the host accepted the text.
- **FR-055**: Changing the source, the selection or the copy format MUST reset the copy status to idle.

**Privacy and isolation**

- **FR-060**: While the feature is in use (pasting, parsing, selecting, expanding, copying, switching builders), the app MUST NOT make network requests, send telemetry or log sample content. It MUST NOT write to host settings, localStorage, sessionStorage, IndexedDB or cookies. The clipboard is written only when the user selects Copy.
- **FR-061**: The sample MUST NOT become a field source. It MUST NOT be written to profiles, the metadata cache, the condition document or the Export output.
- **FR-062**: The sample and action-name fields MUST turn off the browser's spell checking, autocorrect, automatic capitalisation and autocomplete. Some browsers offer cloud spell checking, which would send pasted payloads off the device.
- **FR-063**: The PPTB manifest MUST continue to declare no `cspExceptions`, and the tool MUST contact no external domain.

**Host parity**

- **FR-070**: The feature MUST behave the same in the PPTB tool and the static web build. The builds differ only in the clipboard route (FR-051) and the theme source (FR-091). The feature has no host-specific flag.
- **FR-071**: In the PPTB tool, when the host has no clipboard API, every copy action MUST fail with a readable reason instead of silently succeeding. The copy actions are Condition Copy, Export and JSON reference Copy.
- **FR-072**: Existing copy actions MUST handle that failure in both builds. Condition Copy keeps its current error notification. Export MUST report the failure, MUST NOT say "Expression JSON copied to clipboard." and MUST NOT leave an unhandled promise rejection.
- **FR-073**: On the static site, if the browser refuses a clipboard write (permission denied, the document not focused, or an insecure context), the builder MUST show the failure status from FR-054.
- **FR-074**: The feature MUST ship inside each build's existing bundle. The PPTB build MUST stay a single self-contained script, with no separately loaded chunks or workers, because PPTB loads tools through `srcdoc` without module support.
- **FR-075**: The PPTB `minAPI` MUST stay at 1.0.17, since the feature needs only `utils.copyToClipboard`, which has been available since 1.0.17. The feature MUST work in both PPTB hosts, the desktop app and the VS Code extension. Both load tools into the same kind of sandboxed webview and expose the same API.

**Accessibility**

- **FR-080**: Every control MUST work from the keyboard alone and show the app's focus ring when it has focus.
- **FR-081**: Output from, The pasted JSON is and Copy format MUST each be a radio group with one tab stop, where the arrow keys move the choice. This is the same model as the mode switch.
- **FR-082**: The action-name and sample fields MUST have programmatic labels. Helper and error text MUST be associated with its field, and the invalid state MUST be exposed programmatically.
- **FR-083**: Parse errors MUST be announced as alerts. Parse and copy statuses MUST be announced as polite status messages.
- **FR-084**: The panel titles Source, Payload and Reference MUST be level-2 headings. The tree MUST be labelled by the Payload heading.
- **FR-085**: An automated accessibility scan of both builder views, in the light and dark themes, MUST report no serious or critical violations.

**Layout and theme**

- **FR-090**: The builder MUST match the handoff's high-fidelity design. It reuses and extends the existing Graphite tokens and `eb-*` classes, uses no hard-coded colours, and does not copy the prototype's inline styles.
- **FR-091**: The light and dark themes MUST both work, and MUST follow the host the way the rest of the app does: the PPTB theme in the tool, and the operating system's colour scheme on the static site.
- **FR-092**: Layout requirements:
  - On wide screens, the Source pane sits beside a column that holds the Payload and Reference cards. Below about 860px they stack, with Source first.
  - On wide screens, the tree scrolls inside the Payload card. At 1280×800, the Reference card's expression and Copy button MUST be visible without scrolling the page.
  - At 900px and below, the whole workspace scrolls as one, as the Condition view does when stacked, and the tree doesn't scroll on its own.
  - At 375px wide, the page MUST NOT scroll sideways in either view, and the whole tab strip MUST fit.
  - In a wide, short frame (1280×420), the workspace scrolls and nothing is cut off.
- **FR-093**: Motion (the chevron rotation and hover transitions) MUST follow the user's reduced-motion setting, like the rest of the app.

**Documentation and listing**

- **FR-095**: The same change MUST update these files:
  - `README.md`;
  - `USER_MANUAL.md`, with a new JSON reference section and architecture notes;
  - `PPTB_USAGE.md`;
  - `apps/pptb/README.md`, in "What It Does" and "Permissions & External Connections";
  - `CHANGELOG.md`, under Unreleased;
  - `apps/pptb/public/CHANGELOG.md`.
- **FR-096**: The description and keywords in the PPTB manifest (`apps/pptb/package.json`) MUST mention JSON references. `displayName`, the header brand and the subtitle stay unchanged.
- **FR-097**: The docs MUST explain:
  - full output versus body only, including Compose;
  - that `[n]` reads one fixed position;
  - the two copy formats;
  - the privacy sentence;
  - that a generated reference doesn't prove the action exists, has run or has this shape at run time.

### Constraints

- **CON-001**: No package gets a new runtime dependency. A dev-only test tool is allowed if the plan justifies it.
- **CON-002**: The saved-expression format and its version, the two expression modes, field definitions, and the profile and cache formats don't change. No migration is needed.
- **CON-003**: The engine stays pure. The reference formatter is a deterministic string function that deals with no UI, clipboard or parsing. Existing field-reference and predicate output stays byte-for-byte the same, and the predicate formatter's rule that the root must be boolean is not relaxed.
- **CON-004**: JSON reference is not an expression mode. The mode switch, the mode context and diagnostics don't change.
- **CON-005**: The shared UI stays independent of the host. `apps/web` and `apps/pptb` need no feature code. The hosts differ only through the platform adapter.
- **CON-006**: All clipboard access goes through the platform adapter.
- **CON-007**: Paths keep their types: a key is a string and an index is a number. Tree rows MUST have collision-free identities, which rules out paths joined with dots.
- **CON-008**: The feature is built from the idea and from Microsoft's documented grammar. Don't copy the code, CSS, text, branding or assets of the third-party site.

### Key entities

All of these live in memory for the session only, and none of them is ever serialised.

| Entity | Contents |
| --- | --- |
| Sample | The text the user pasted |
| Parsed payload | The parsed value, its value count, and the text it was parsed from |
| Source | Output from (action or trigger), the shape (full or body), and the action name |
| Root expression | Derived from the source |
| Path | A list of segments in order. Each segment is a key (string) or an index (non-negative integer). |
| Payload reference | The root plus the path, written in the bare or inline format |
| Tree view state | Expanded nodes, arrays showing all their elements, the focused row, the selected path |
| Copy status | Idle, copied, or error with a reason |

## Success criteria

- **SC-001 (reference correctness)**: every case in [Appendix A](#appendix-a-reference-cases-normative) produces its expected text. Evidence: unit tests.
- **SC-002 (end to end)**: in both builds, a user can paste, parse, select and copy a correctly rooted reference for each of the four roots. The clipboard text equals the displayed text.
- **SC-003 (no side effects)**: after using JSON reference and switching back, the document, mode, fields, predicate and exported JSON are byte-identical. Evidence: automated.
- **SC-004 (privacy)**: pasting, parsing, selecting, expanding, copying and switching builders cause zero network requests and zero storage writes. Measured in a real browser after the onboarding dialog has been dismissed.
- **SC-005 (keyboard and screen reader)**: the core task can be done with the keyboard alone in both themes: switch builders, choose the source, paste, parse, select a nested value, copy. The automated scan reports no serious or critical issues.
- **SC-006 (limits benchmark)**: in Edge (Chromium) and the PPTB desktop app, on a typical developer laptop:
  - a sample at each limit parses and shows its tree within 1 second;
  - expanding any node responds within 1 second, with a target of 200 ms.

  The results confirm or change the limits in FR-024.
- **SC-007 (copy tells the truth)**: in a simulated PPTB host without a clipboard API, all three copy actions report failure and never success. With the real host, copying works in the PPTB desktop app. Checking the VS Code extension is recommended.
- **SC-008 (live-flow checks)**: every item in the [live-flow checklist](#live-flow-checklist) has a recorded result before release. If an item fails, this spec changes before the feature ships.
- **SC-009 (no regressions)**: lint, typecheck and the unit tests pass, and so do the existing theme-smoke and short-viewport e2e specs. Existing tests change their expectations only where this spec changes behaviour: the PPTB off-host clipboard test, and any test that asserts the header's exact contents. The pull request lists each such change.
- **SC-010 (bundle size)**: the size increase is measured and reported for both builds. An increase over 25 kB gzipped in either build needs a written justification.
- **SC-011 (layout)**: at 375×667, 768×1024, 900×700, 1280×420, 1280×800 and 1440×900, in both views and both themes, nothing scrolls sideways and no control is cut off.

## Verification

The handoff asks for four kinds of evidence, kept separate. Passing one of them says nothing about the others.

| Evidence | What it covers | How |
| --- | --- | --- |
| Unit | Appendix A; action-name normalisation; the parse checks, their order and messages; value counting; the PPTB adapter rejecting; state kept across switches; the document left unchanged; the highlighter leaving text unchanged | Vitest, including component tests in jsdom |
| Rendered browser | Both builds' dev servers, with a mocked `toolboxAPI` for PPTB; keyboard paths; a network and storage audit; the accessibility scan; the viewports in SC-011; both themes | Playwright, in a new `tests/e2e/json-references.spec.ts` |
| PPTB host | Load the built tool in the desktop app (Debug → Load Local Tool). Check copying, theme following and SC-006. | Manual, with results recorded |
| Live flow | The checklist below, in a throwaway flow | Manual, with results recorded |

### Live-flow checklist

Run these in a throwaway flow. Record the values the expressions actually return, not just whether the flow saved.

1. **HTTP action**: the full output gives `outputs('HTTP')?['body']…` and `outputs('HTTP')?['statusCode']`. Body only gives `body('HTTP')…`.
2. **A list action** (SharePoint *Get items* or Dataverse *List rows*): `body('Get_items')?['value'][0]?['Title']` returns the first item's title.
3. **Compose with an object**: `outputs('Compose')?['customer']?['name']` works. Record what `body('Compose')` returns.
4. **Triggers** (manual, and When an HTTP request is received): check `triggerBody()?['x']`, `triggerOutputs()?['body']?['x']` and `triggerOutputs()?['headers']?['content-type']`.
5. **Keys**: an apostrophe (`?['O''Brien']`), a dot, a slash, a space, brackets, the empty key, Unicode, and the key `"0"`.
6. **Action names**:
   - a name with spaces;
   - a name with different case, which should fail because names are case-sensitive;
   - a renamed action;
   - a copied action with a number suffix, for example "Compose 2" → `Compose_2`;
   - an apostrophe in the name.
7. **Index bounds**: `[0]` on an empty array, and `[5]` on an array with two items. Also record how `?[n]` behaves; version 1 still outputs `[n]`.
8. **Pasting**: paste the bare form into the expression editor for a string, a number, a boolean, an object, an array and a null. Paste the `@{…}` form into a text field and confirm the result is text.
9. **Nested arrays**: `[0][1]`.
10. **Trigger `splitOn`**: record how the trigger outputs change for each item.
11. **Finding samples**: confirm where run history shows the full output and the body in the current designer, and make the docs match.

## Assumptions

- The target browsers are current Chromium-based browsers (Edge and Chrome), as in the e2e config. The PPTB desktop app runs on Electron, which is also Chromium.
- The PPTB host's `copyToClipboard` promise rejects when the host can't copy, so the failure reaches the UI.
- The starter document has no rules, so the tab count reads 0 on first load.
- Both builds get a minor version increase at release. The exact numbers are set then.
- The feature only promises local processing. What users choose to paste is up to them.

## Dependencies and risks

- **D-1 (test baseline)**: `results.md` (2026-09-21) recorded one failing unit test, in `manageProfilesDialog.test.tsx`. The plan must establish the current baseline first. This change must not hide unrelated failures or quietly fix them.
- **D-2 (e2e files)**: `.gitignore` excludes `/tests/e2e/*` except two named specs. A new e2e spec needs its own exception line, or it won't be committed.
- **D-3 (tree component)**: see row 19 of the [reconciliation table](#source-reconciliation).
- **D-4 (access)**: the checks need a throwaway flow environment (SC-008) and the PPTB desktop app (SC-006, SC-007).
- **R-1 (highest risk)**: a reference that is valid syntax but points at the wrong root or item. Mitigations: the explicit source choice, the `body` hint, the fixed-position note, the docs, and the live-flow checks.
- **R-2**: the PPTB adapter change affects existing copy actions (FR-071, FR-072).
- **R-3**: the header gets crowded at 901–1,370px and at phone widths (FR-007, FR-092).
- **R-4**: wide objects near the value limit may render slowly (FR-039).

## Handoff to planning

Start from the Architecture table in the handoff. The plan must decide:

- **The tree component** (D-3). Either choice must satisfy FR-036.
- **How the header fits** at 901–1,370px and at 375px (FR-007, FR-092). Re-measure in the real shell, because the prototype's Condition view is a stand-in.
- **Where JSON reference state lives** so that it survives switching (FR-008). Two options: lift it to the shell, or keep the panel mounted and hidden. FR-004 and FR-005 still apply.
- **The accessibility scan tool** (FR-085), within CON-001.
- **The `.gitignore` exception** for the new e2e spec (D-2).

## Out of scope

- Loop context: `item()` and `items('Loop')` references, and re-rooting in the style of "Use in array".
- Inserting a reference into the Condition builder as an operand. A third expression mode.
- Inferring the action name, the source shape or a loop scope from a sample. Discovering actions from a flow.
- Saving samples or sessions. Deep links to the JSON view. Remembering the last builder used.
- Decoding JSON inside strings. Editing or evaluating expressions.
- Other output styles: slash paths (`?['body/value']`), null-safe indices (`?[n]`), dot notation.
- Changes to onboarding, the brand block or the header subtitle.
- Pixel-for-pixel parity with the third-party site.
- Outputs that aren't JSON, such as XML or form data.

## References

**Checks made for this spec (2026-09-26)**

- **Prototype measurements.** The handoff prototype was rendered in Chromium at 1440, 1280, 1100, 1024, 901, 860, 768 and 375px wide.
  - The Condition header is 63px tall at 1440px, 117px at 1280px, and 125px from 1100px down to 860px.
  - At 375px, the tab strip is 392px wide, and the document is 514px wide in the Condition view and 410px in the JSON view.
  - At 1280×800, the Reference card's Copy button is below the fold.
  - The prototype's Condition view is a stand-in, so repeat these measurements in the real shell.
- **Pinned tree package.** `@fluentui/react-components` 9.74.1 locks `@fluentui/react-tree` at 9.16.3. That version's README says: "These are not production-ready components and **should never be used in product**."
- **Code.**
  - `packages/builder-ui/src/app/ExpressionBuilderShell.tsx:168-192`: copy and export.
  - `packages/platform/src/pptbAdapter.ts:112-114`: the optional-chained copy call.
  - `packages/platform/test/pptbAdapter.test.ts:50-63`: the test that expects copy to do nothing off-host.
  - `packages/builder-ui/src/components/ExpressionPreview.tsx:1-22`: the token lists.
  - `apps/pptb/vite.config.ts`: the single IIFE bundle for `srcdoc`.
  - `.gitignore`: the e2e exceptions.

**PPTB documentation**

- [API reference](https://docs.powerplatformtoolbox.com/tool-development/api-reference)
- [ToolBox API](https://docs.powerplatformtoolbox.com/tool-development/api-reference/toolbox-api): `utils.copyToClipboard`, `utils.showNotification` and `utils.getCurrentTheme` all require 1.0.17.
- [Package manifest](https://docs.powerplatformtoolbox.com/tool-development/manifest): `cspExceptions` and `minAPI`.
- [Tool development guide](https://docs.powerplatformtoolbox.com/tool-development): the desktop app and VS Code extension hosts, and the sandboxed webview.

**Microsoft Learn**

- [Expression functions reference](https://learn.microsoft.com/azure/logic-apps/expression-functions-reference): `body`, `outputs`, `triggerBody` and `triggerOutputs`. The reference applies to Power Automate.
- [Workflow Definition Language schema](https://learn.microsoft.com/azure/logic-apps/workflow-definition-language-schema): the `?` null-ignore operator, `[]` indexing, and string interpolation, which always produces a string.
- [Cloud flow error code reference](https://learn.microsoft.com/power-automate/error-reference): action names are case-sensitive, and spaces become underscores.
- [Expressions in Azure Data Factory](https://learn.microsoft.com/azure/data-factory/control-flow-expression-language-functions): two apostrophes escape one in this family of expression languages. Confirm this in the live flow (checklist item 5).

**WAI-ARIA Authoring Practices**

- [Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
- [Tree view pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)

## Appendix A: Reference cases (normative)

**Fixture A1** is the handoff prototype's sample. Parsing it MUST report "Parsed · 25 values".

```json
{
  "statusCode": 200,
  "headers": { "Content-Type": "application/json; odata.metadata=minimal" },
  "body": {
    "value": [
      { "ID": 14, "Title": "Laptop refresh", "Status": "Approved", "Amount": 5000, "Urgent": false,
        "Requester": { "DisplayName": "Dana O'Brien", "Email": "dana@contoso.com" } },
      { "ID": 15, "Title": "Monitor", "Status": "Pending", "Amount": 320, "Urgent": true,
        "Requester": { "DisplayName": "Lee Park", "Email": "lee@contoso.com" } }
    ],
    "@odata.nextLink": null
  }
}
```

In the Path column, a quoted item is a key and a bare number is an index.

| # | Source | Path | Expected reference |
| --- | --- | --- | --- |
| 1 | Action `Get items`, Full output | `"body", "value", 0, "Requester", "Email"` | `outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']` |
| 2 | Action `Get items`, Body only | `"value", 0, "Title"` | `body('Get_items')?['value'][0]?['Title']` |
| 3 | Trigger, Full output | `"body", "customer", "name"` | `triggerOutputs()?['body']?['customer']?['name']` |
| 4 | Trigger, Body only | `"customer", "name"` | `triggerBody()?['customer']?['name']` |
| 5 | Action `Compose`, Full output | `"customer"` | `outputs('Compose')?['customer']` |
| 6 | Action `Get items`, Body only | (empty) | `body('Get_items')` |
| 7 | Trigger, Full output | (empty) | `triggerOutputs()` |
| 8 | Action `Get items`, Full output | `"body", "@odata.nextLink"` | `outputs('Get_items')?['body']?['@odata.nextLink']` |
| 9 | Trigger, Body only | `"O'Brien"` | `triggerBody()?['O''Brien']` |
| 10 | Trigger, Body only | `"a.b"` | `triggerBody()?['a.b']` |
| 11 | Trigger, Body only | `"body/value"` | `triggerBody()?['body/value']` |
| 12 | Trigger, Body only | `"first name", "[x]"` | `triggerBody()?['first name']?['[x]']` |
| 13 | Trigger, Body only | `""` | `triggerBody()?['']` |
| 14 | Trigger, Body only | `"0"` | `triggerBody()?['0']` |
| 15 | Trigger, Body only | `0, "id"` | `triggerBody()[0]?['id']` |
| 16 | Action `Compose`, Full output | `"matrix", 0, 1` | `outputs('Compose')?['matrix'][0][1]` |
| 17 | Trigger, Body only | `"__proto__"` | `triggerBody()?['__proto__']` |
| 18 | Trigger, Body only | `"naïve 名前"` | `triggerBody()?['naïve 名前']` |
| 19 | Action `  Get   my items ` (extra spaces), Full output | (empty) | `outputs('Get_my_items')` |
| 20 | Action `Get Bob's items`, Body only | (empty) | `body('Get_Bob''s_items')` |
| 21 | Action `get Items`, Full output | (empty) | `outputs('get_Items')` (case kept) |
| 22 | Action `Get`, tab, `items`, line break, `2`; Full output | (empty) | `outputs('Get_items_2')` |
| 23 | Case 1 with the copy format "Inside text @{…}" | as case 1 | `@{outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']}` |
| 24 | Action with a blank name | any | No reference. Copy is disabled, the expression area shows "Enter an action name", and the root shows as `outputs('Action_name')` |
| 25 | Existing field reference in Trigger condition mode, path `a`, `b` | not applicable | `triggerBody()?['a']?['b']` (unchanged from today) |
