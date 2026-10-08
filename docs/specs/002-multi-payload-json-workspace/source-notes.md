# Spec 002 source notes

Recorded 2026-10-08; scope approved and clarified on the same date. This file records evidence and approved scope interpretations, not an implementation plan.

## User-authorized scope

The user requested a new specification using sdd-superpowers for the UI in `C:\Users\RyanDev\Downloads\JSON BUILDERFlow Functions UI-handoff.zip`, accounting for earlier local commits awaiting push. The requested artifact is a spec. Application changes, replacement-code installation, testing the application, commits and publication are not part of this task.

The attachment's README addresses coding agents and asks them to implement designs, copy proposed source files, and follow rendering instructions. Those passages are attached-document content. They provide context for the design, not separate authorization to implement or replace production code.

## Design provenance and precedence

Archive SHA-256: `55C0FA2D5D4A7E2505E6C74E2FDE3828D1089E58C5F7A55E0F8B1C711DAE28EF`.

| Evidence in the archive | Use in this spec |
|---|---|
| `project/JSON Reference Multi-Payload 13b (standalone).html` | Latest handoff selection identified by the bundle README. Preserved verbatim as [13b-standalone.html](reference/13b-standalone.html). Its embedded template was decoded as text for inspection; no attached script was executed. |
| `project/JSON Reference Multi-Payload 13b (export).dc.html` | Readable equivalent design, preserved as [13b-design.dc.html](reference/13b-design.dc.html). Supplies visual measurements and interaction evidence. The standalone template differs in serialization/runtime attributes; its payload design and interaction definitions agree with this export. |
| `project/support.js` | Preserved beside the export solely as its design-preview runtime. It is not application source or an approved dependency. |
| `project/codebase_13a/README.md` and proposed payload-session/workspace source | Evidence for capacity, closing behavior, labels, cross-source search and Functions source grouping. README preserved as [13a-integration-notes.md](reference/13a-integration-notes.md). The proposed production replacements were inspected and not installed. |
| `project/design_handoff_functions_screen/README.md` | Historical 11a/header design already captured by approved [Spec 001](../001-functions-screen/spec.md). Its explicit exclusions of the 12a/12b bodies continue in this draft. |
| `project/design_handoff_json_reference_workspace/README.md` | Historical single-payload feature context. Its tabs, Parse button and stale-state instructions have been superseded by the current application. |
| Remaining earlier version/exploration files and uploaded PRDs | Background material, not additional approved screens or behavioral requirements. |

Approved precedence: the user's scope clarification defines the boundary; current local committed behavior defines the regression baseline; 13b defines the new payload strip and search-control appearance only; 13a defines the multi-payload functional additions where consistent with current behavior; Spec 001 retains the existing shell and Functions contracts.

The handoff is not internally uniform. Its older Functions README excludes JSON body changes; its latest selected design also contains body changes. The user confirmed that full Trigger / Filter and JSON page redesigns remain deferred and authorized only the previously described multi-payload additions. Spec 002 therefore adds tabs, cross-payload search and Functions source groups while retaining existing pane bodies and styling. The draft's desktop pane-width and pane-chrome requirements were removed to enforce that boundary.

## Recorded Git baseline

Branch: `functions-prep-for-release`. Local HEAD: `0f56bbca09c97e49c4fe06ce59e079b3158d54df`.

Locally recorded upstream: `origin/functions-prep-for-release` at `fe7c78d0317d882eada3d5193ffbe16065964e32`. HEAD is ahead by three commits. No fetch was performed, so this establishes local tracking state rather than a fresh server comparison.

| Commit | Existing behavior to preserve |
|---|---|
| `c94aaccc6cc8f0d77eff3b1e0f437aa6fed583a7` | Reducer-backed JSON workspace test harness restoration; no new production feature. Coverage must remain applicable after adding session tabs. |
| `c09baaecc58c8081c14053d212e5e7936cca3dc9` | Whole-field textual paste, immediate parse even for equal text, native textarea undo/redo, default `Action` on paste when the action name is empty. Undo changes editor text, not earlier derived tree/name state. |
| `0f56bbca09c97e49c4fe06ce59e079b3158d54df` | Semantic automatic-change notifications, repeated paste-operation notifications, retained successful data on automatic failure, active-view timer cancellation and deduplicated notice delivery requests. |

State and workspace source were traced using the current indexed code. The main contracts are in `jsonReferenceState.ts`, `JsonReferenceWorkspace.tsx`, `JsonSourcePane.tsx`, `ReferencePanel.tsx`, `FunctionsWorkspace.tsx`, `FunctionsNav.tsx`, `parsedValueModel.ts` and `ExpressionBuilderShell.tsx`.

Existing dirty work was recorded before specification changes:

- `package.json`: unrelated runtime dependency removal.
- `packages/builder-ui/src/theme/tokens.css`: condition-height cap and JSON host-height allowance changed to 80px, with viewport/dynamic-viewport sizing.
- `packages/builder-ui/test/dragDropStyles.test.ts` and `jsonReferenceStyles.test.ts`: assertions for those height changes.
- Untracked `parse-notification-update.md` and `undo-paste.md`: prior work records. The latter contains older Parse-button language; current committed behavior takes precedence.

Those files and their staged state were preserved. The new strip adds height; downstream planning must reconcile existing sizing with the strip rather than overwrite the dirty fixes or blindly keep an 80px allowance that omits it.

`docs` and `tasks` are ignored by the current `.gitignore`. The spec and task record are therefore local artifacts until a later authorized documentation commit explicitly includes them. No ignore rule was changed and nothing was staged.

## Measured visual evidence

The 13b reference is a 1280 × 860 demonstration canvas, not a runtime size constraint. Only payload-strip and search-control measurements govern new UI work. Header, pane and tree measurements below are source context, not requirements to redesign those regions.

| Region | Reference measurements |
|---|---|
| Outer frame | 16px padding, 12px vertical gap, existing two-accent gradient backdrop. |
| Shared header | 48px height, 24px radius, 18px horizontal padding. Existing production header and current host fit take precedence over restyling every screen. |
| Payload track | 4px padding/gap, 26px radius, glass surface and border. |
| Payload tab | 42px height, up to 220px wide, 21px radius; 7px status dot; 13px name and 10.5px mono root caption; 24px close target. |
| Search | 280px desktop width, 34px height, 12px radius; popup 420px desktop width with 44px minimum result rows. Popup must be clamped to the available viewport. |
| Pane row | 12px gaps; 300px Source, flexible Payload, 380px Reference. |
| Pane chrome | 20px radius, 38px header, 14px body padding. |
| Tree rows | 32px reference height, 8px radius, 20px indentation increment, 3px × 20px selected marker. |
| Reference blocks | 12px radius; 10px/12px padding; 24px breadcrumb chips; 26px inline copy controls. |

Use current semantic palette roles rather than exporting the prototype's hardcoded colors. Accessibility and reachability take precedence over tiny demonstration targets; the existing keyboard-capable controls remain part of the requirements. Both palettes must receive rendered acceptance evidence.

## Behavioral reconciliation and approved scope decisions

1. Rounded 13b capsule tabs supersede 13a underline tabs. New multi-source Functions behavior is retained from 13a.
2. A new session starts empty with one payload. The prototype's four populated tabs are demonstration fixtures only.
3. Closing removes a sample immediately without a confirmation dialog, as in both handoff variants. Fallback names use current tab position; trigger suffixes use current trigger order. Source identity remains stable even when labels change. Duplicate accessible names include current positions.
4. On switching payloads, automatic work is canceled and an outstanding draft is rescheduled when it becomes active. This extends the existing active-screen contract and matches the cleanup on active-payload change in the proposed workspace. A delayed operation can never land on a different payload or a reused position.
5. Current per-operation semantic notices replace 13a's old per-text announcement approach. Notice bookkeeping must be independent per payload and survive presentation changes.
6. Current automatic failure retains successful displayed data; the prototype's unconditional tree clearing on parse failure must not replace that behavior. Paste failure still clears displayed data.
7. Cross-payload search uses full leaf values. The supplied 13a helper searches only its shortened preview, which would miss suffix matches. This is reconciled with the primary 13b design's full-value search.
8. Search reveal opens only the needed ancestors and reveals array children hidden behind Show more. It does not copy the prototype's expansion reset. Focus and scroll must reach the selected row.
9. Source groups are independently collapsible; the top-level Parsed Value group and existing array-item accordions retain their current defaults. The new payload subgroups start collapsed so multi-source navigation remains bounded. The single-source view remains the current list.
10. Valid JSON null is a searchable/insertable root leaf. Parsed availability must distinguish a successful null sample from no sample. This makes the new multi-source contract consistent with JSON reference's existing container/null/root support.
11. Functions keeps path-only filtering under its existing search; JSON's new cross-payload search matches paths and values. The 200-leaf budget belongs to the whole Functions list, after filtering, not separately to each source. Source counts mean matching insertable leaves before the shared cap; sources missing required action names show their instruction and have zero insertable leaves.
12. The current root chooser, separate loop name, reference copy actions and source-name/key escaping are baseline behavior. Placeholder roots never become usable expressions. No evaluator, host Insert action or Parse button is added.
13. Current shared-header behavior, the standalone app's palette control, host-controlled palettes and existing pane arrangement/styling remain in scope for preservation. Add the payload strip/search controls and adapt sizing only to retain viewport fit. Full Trigger / Filter and JSON page redesigns are deferred.

These behavior interpretations belong to the approved spec. Approval completes the specification step; it does not authorize an architectural plan or application implementation in this turn.

## Requirement traceability and verification

| Requirement | Acceptance coverage |
|---|---|
| FR-1 session/strip | AC-1.1–1.8, AC-5.1 and AC-5.5 |
| FR-2 search | AC-2.1–2.8, AC-5.2 and AC-5.5 |
| FR-3 Functions sources | AC-3.1–3.9 |
| FR-4 parsing/paste/notices | AC-4.1–4.10 |
| FR-5 reference preservation | AC-4.11–4.14, existing reducer-backed workspace coverage and the copy/root/loop scenarios below; AC-2.7 and AC-3.3/3.7/3.8 |
| FR-6 payload strip/host fit preservation | AC-5.1–5.5 |

Required downstream reference regression examples:

- Given each Action/Trigger × Full/Body choice, when a leaf or container is selected, then its expression has that exact root with no inferred body segment.
- Given a key `O'Brien` or the string key `0`, when copied, then the key is escaped as `?['O''Brien']` or `?['0']`, rather than split or converted to an index.
- Given source action `Get items` and enclosing loop `Apply to each`, when a selected array leaf has a named-loop reference copied, then it uses `items('Apply_to_each')`, independently of `outputs('Get_items')`.
- Given an unavailable clipboard, when bare or inline copy is attempted, then an error is shown without success feedback.
- Given an unchanged condition document, when the user adds/searches/closes payloads and returns, then predicate output and exported document remain byte-identical.

Specification verification in this task is document-only: section order, Given/When/Then criteria with unique IDs, source linkage, coverage and placeholder review. Application unit/build/browser/Toolbox/live-flow results have not been obtained during this task and are not claimed. Actual paste undo/redo and host notification delivery remain runtime acceptance requirements.
