# Short-viewport canvas collapse — implementation plan

LLM-executable plan. Each phase is self-contained. Copy from the cited snippets; do not invent layout APIs.

**Goal.** At `1280×420` (and any viewport `min-width: 901px` and `max-height: 620px`) the condition rule list is visible and has a real scroll affordance. The PPTB iframe is the primary target (~420px tall, wide).

**Out of this bugfix.** Phone dock order and rule-row overflow-menu (see [Design decisions](#design-decisions-not-in-the-bugfix)). Do not implement those unless the user has confirmed a choice.

**Working tree.** `packages/builder-ui/src/theme/tokens.css` already has uncommitted short-viewport work (container-query rule wrap, search-box flex floor, 128px preview cap). Do not revert those. Replace only the insufficient 128px-cap block.

---

## Phase 0 — Allowed APIs / patterns

### Allowed (copy these)

| Pattern | Source | What to copy |
|---|---|---|
| Stacked scroll-ownership | `packages/builder-ui/src/theme/tokens.css` **1752–1823** (`@media (max-width: 900px)`) | `flex: 0 0 auto` + `min-height: 220px` on `.eb-canvas-card`; stand down nested scrollers (`overflow: visible` on canvas / pane-body / group-children) |
| Existing short-height MQ | `tokens.css` **1912–1924** | Keep the query `@media (min-width: 901px) and (max-height: 620px)` — replace its body |
| Desktop 3-column grid | `tokens.css` **277–301** | Leave it. Short+wide stays a grid. |
| Center column contract (desktop, tall) | `tokens.css` **430–453**, **487–510** | Unchanged outside the short-height MQ: `.eb-center-col { overflow: hidden }`, canvas `flex: 1 1 auto; min-height: 0`, preview `flex: 0 0 auto; max-height: 220px` |
| Collapsed preview chrome | `tokens.css` **507–510** | `flex: 0 0 38px` — do not restyle |
| CSS contract tests | `packages/builder-ui/test/dragDropStyles.test.ts` **22–71** (`mediaBlock`, `declarationBlock`, `unscopedCss`) and **288–422** | Add a sibling `it(...)` in the same describe; copy assertion style |
| Playwright host + onboarding skip | `tests/e2e/theme-smoke.spec.ts` **32–37**, `playwright.config.ts` (`baseURL` `http://127.0.0.1:5173`, `npm run dev:web`) | New spec next to it |
| Load samples | `GetStartedPanel.tsx` **63–65** — button name `Load sample fields` | Use that accessible name |

### Forbidden (anti-patterns)

- **No PPTB host resize / setHeight / postMessage frame API.** `pptbAdapter.ts` and `docs/api-info/toolbox-api` have none. Layout must fit inside the iframe (`100vh`/`100dvh` already on `.eb-root`).
- **Do not raise `--eb-workspace-min-height`.** Test lock: `250 ≤ value < 350` (`dragDropStyles.test.ts` **346–351**). Current `320px` never engages at a ~350px-after-header PPTB frame, so raising it within the lock cannot fix this.
- **Do not fix this by only tightening `.eb-preview-card { max-height }`.** Already tried at `128px` (`tokens.css` **1921–1924**); `responsive-report.md` measured the list still at **41px**.
- **Do not put `overflow: visible` on `.eb-center-col` / `.eb-pane-body` / `.eb-group-children` in the unscoped (desktop) rules.** `dragDropStyles.test.ts` **321–328** forbids it. Media-query scoped overrides are how the stacked layout already does this.
- **Do not switch `.eb-workspace` from grid to flex at 1280px.** That rewrite is the `<900px` stacked path and would stack the docks. Short+wide must stay 3 columns.
- **Do not change `.eb-center-col { overflow: hidden }` in the base rule.** `declarationBlock` reads the first match; keep the base, override inside the short-height MQ only.
- **Do not add a kebab / overflow menu or reorder docks in this bugfix.** Separate product calls, below.
- **Do not invent CSS that isn't already used in this file** (no new container-type, no `dvh` tricks, no JS `matchMedia` auto-collapse) unless the CSS copy below is proven insufficient in Phase 3.

### Why the 128px cap failed (do not re-try this shape)

At desktop width, `.eb-center-col` is a flex column (`tokens.css` **431–453**):

- `.eb-canvas-card` — `flex: 1 1 auto; min-height: 0` (only shrinkable sibling)
- `.eb-preview-card` — `flex: 0 0 auto; max-height: 220px` (will not shrink)
- gap `18px`
- parent `overflow: hidden` (clips; does not scroll)

`--eb-workspace-min-height: 320px` floors the **grid row**, not the canvas. At `1280×420` remaining workspace height is ~350px (`tokens.css` **37–41**), so `1fr` wins and the floor never forces workspace scroll.

Budget at ~314px content box: preview `128` + gap `18` = `146` → canvas ~`168`. Minus canvas header `38` + pane padding `28` + group toolbar ~`40` → rule list ~`40px`. Matches the measured **41px**.

The stacked layout already solved the same “flexible canvas absorbs the shortfall” bug by **content-sizing the canvas and moving scroll to an ancestor**. Copy that, but keep the 3-column grid and scroll **only the centre column** (so Toolbox/Details stay on screen).

---

## Phase 1 — CSS: copy stacked scroll-ownership onto the short-height MQ

**Files.** `packages/builder-ui/src/theme/tokens.css` only.

**What to implement.** Replace the body of the existing block at **1912–1924**. Keep the query. Do not add a second copy of this MQ.

Copy these three ideas from `@media (max-width: 900px)` at **1806–1823**, adapted so `.eb-center-col` (not `.eb-workspace`) is the scroller:

```css
/* Short viewports (the PPTB host frame, a laptop in landscape at ~420px).
   The 128px preview cap was insufficient: .eb-canvas-card is still the only
   flexible sibling in .eb-center-col, so the rule list collapsed to ~41px.
   Copy the stacked (max-width: 900px) scroll-ownership onto this column only
   — keep the 3-column grid so Toolbox and Details stay on screen. */
@media (min-width: 901px) and (max-height: 620px) {
  .eb-canvas-card {
    flex: 0 0 auto;
    min-height: 220px;
  }

  .eb-canvas-card,
  .eb-canvas-card .eb-pane-body,
  .eb-group-children {
    overflow: visible;
  }

  .eb-center-col {
    overflow-x: hidden;
    overflow-y: auto;
  }
}
```

**Copy notes.**

- `min-height: 220px` is the same floor already used for stacked panes (`tokens.css` **1771–1774**). Do not pick a new number.
- `flex: 0 0 auto` is the same override as `tokens.css` **1809–1811**.
- Nested-scroller stand-down is the same selector list as **1818–1822**, **minus** `.eb-center-col` (that one must scroll, not be `visible`).
- Keep the desktop preview cap of `220px` on `.eb-preview-card` (`tokens.css` **498**, locked by `dragDropStyles.test.ts` **400–404**). Do **not** re-introduce the 128px override; it is no longer load-bearing once the canvas is content-sized.
- Do **not** set stacked `max-height: none` on preview here. At short+wide the 220px cap still stops a long expression from making the centre-column scroller enormous.

**Verify Phase 1.**

- `rg "max-height:\\s*128px" packages/builder-ui/src/theme/tokens.css` → no matches.
- `rg "min-width: 901px\\) and \\(max-height: 620px" packages/builder-ui/src/theme/tokens.css` → exactly one `@media` block, containing `flex: 0 0 auto`, `min-height: 220px`, `.eb-center-col` `overflow-y: auto`, and `overflow: visible` on the canvas/pane-body/group-children group.
- Base (unscoped) `.eb-center-col` still `overflow: hidden`; base `.eb-canvas-card` still `flex: 1 1 auto` + `min-height: 0`.

**Anti-pattern guards.**

- Do not edit the `@media (max-width: 900px)` block.
- Do not change `--eb-workspace-min-height`.
- Do not touch component TSX.

---

## Phase 2 — Lock the contract in unit tests

**Files.** `packages/builder-ui/test/dragDropStyles.test.ts` only.

**What to implement.** Add one `it(...)` next to `floors the workspace row so a short host never crushes the canvas` (**331–352**) and `scrolls the stacked layout as one page instead of nesting scrollers` (**288–329**).

`mediaBlock` looks up `@media (${query})` (`dragDropStyles.test.ts` **22–23**). For this query pass:

```ts
const short = mediaBlock('min-width: 901px) and (max-height: 620px');
```

Assert, copying the stacked-layout checks:

- `short` matches `.eb-canvas-card` with `flex: 0 0 auto` and `min-height: 220px`
- `short` matches `.eb-center-col` with `overflow-y: auto`
- `short` matches the grouped stand-down (canvas / pane-body / group-children `overflow: visible`)
- `short` does **not** match `.eb-workspace { display: flex` (must stay grid)
- `unscopedCss()` still has no `overflow: visible` on those three plus `.eb-center-col` (existing assertion **321–324** must keep passing)
- `declarationBlock('.eb-center-col')` still `overflow: hidden` (existing **328**)
- `declarationBlock('.eb-preview-card')` cap still `>178` and `≤320` (existing **400–404**)
- the short block does **not** contain `max-height: 128px`

**Verify Phase 2.**

```
npx vitest run packages/builder-ui/test/dragDropStyles.test.ts
```

Must pass, including the new example. If `mediaBlock` throws `Missing media query`, the `@media (` string in CSS does not match — fix the CSS query to the exact text above, do not weaken the helper.

**Anti-pattern guards.**

- Do not change the stacked-layout tests or the workspace-floor numeric lock.
- Do not parse computed styles; this file is source-text assertions on `tokens.css`.

---

## Phase 3 — Playwright: prove rules are visible at 1280×420

**Files.** Add `tests/e2e/short-viewport-canvas.spec.ts`. Copy setup from `tests/e2e/theme-smoke.spec.ts` **32–37** (onboarding skip + `page.goto('http://127.0.0.1:5173/')`).

**What to implement.**

1. `page.addInitScript` → `localStorage.setItem('eb.onboarding.seen.v1', '1')` (copy from theme-smoke).
2. Populate: click `Load sample fields` (`GetStartedPanel.tsx` **63–65**), then add two rules via the canvas `+ Rule` control (accessible name is scoped by group id — use `getByRole('button', { name: /Add rule/i }).first()` or the visible `+ Rule` button; confirm against `ConditionGroupCard.tsx` before writing the locator).
3. `page.setViewportSize({ width: 1280, height: 420 })`.
4. Assert the **user-visible** contract from `responsive-report.md` **43**:
   - at least one `.eb-rule-row-editor` is in the viewport (`toBeInViewport()`)
   - `.eb-group-children` `clientHeight` is **≥ 80** (the broken measurement was **41**)
   - `.eb-canvas-card` `clientHeight` is **≥ 220** (the copied floor)
   - `document.documentElement.scrollWidth <= clientWidth` (no page-level horizontal scroll — same check as the audit)
5. Regression, same spec, `setViewportSize({ width: 1280, height: 800 })`: first rule still in viewport (tall desktop must not start clipping because of the new MQ).

Optional screenshot to `.rm-frontend-review/responsive/verify-1280x420.png` is nice for humans; the assertions above are the pass/fail.

**Verify Phase 3.**

```
npx playwright test tests/e2e/short-viewport-canvas.spec.ts
```

**Anti-pattern guards.**

- Do not target `http://127.0.0.1:5174/` unless you also stub `window.toolboxAPI` like theme-smoke. The layout lives in shared `tokens.css`; the web host is enough.
- Do not sleep-wait for the layout; use Playwright locators + `toBeInViewport`.
- If 80px is too strict because of chrome, do **not** drop the in-viewport assertion — that is the actual bug.

---

## Phase 4 — Full verification + anti-pattern sweep

Run, in order:

```
npx vitest run
npx playwright test tests/e2e/short-viewport-canvas.spec.ts
```

Vitest must stay at the current count **or higher** (last known: 41 files / 285 tests). No existing test may be rewritten to hide a contract change except the new short-MQ example.

Grep guards:

```
rg "max-height:\\s*128px" packages/builder-ui
rg "overflow:\\s*visible" packages/builder-ui/src/theme/tokens.css
rg "eb-workspace-min-height"
```

- `128px` preview cap: gone.
- `overflow: visible` on pane-body / group-children / center-col: only inside `@media` blocks (900px stacked, and the new short-height block which must **not** set center-col to visible).
- `--eb-workspace-min-height: 320px` unchanged.

Manual / Playwright viewport matrix (must all show at least one rule in view when two rules exist):

| Viewport | Layout path | Pass |
|---|---|---|
| 1280×420 | short-height desktop MQ | rules visible, centre-col may scroll |
| 1280×800 | desktop inner scroll | rules visible, no centre-col crush |
| 1440×900 | desktop | no regression vs current wrap fix |
| 900×700 | stacked flex | still one-page workspace scroll |
| 375×667 | stacked + 700px rule stack | still one-page workspace scroll |

**Done when.** `responsive-report.md` “Not fixed — still broken” row is obsolete: 1280×420 rule list is no longer ~41px, first rule is on screen, vitest + new e2e green.

Do not edit `responsive-report.md` unless asked.

---

## Design decisions (not in the bugfix)

These are product calls from `responsive-report.md` **49–54**. Phases 1–4 do not implement them. Recommendations below; wait for an explicit go before any of this code.

### 1. Phone / stacked 3-dock order

**Current (locked).** DOM order Toolbox → center (canvas+preview) → Details. `@media (max-width: 900px)` is `flex-direction: column` with **no `order`**. Test `keeps the Toolbox first in the stacked layout` (`dragDropStyles.test.ts` **263–270**) forbids `.eb-center-col { order: ... }` and comments that “users landing on a narrow window need the field list, not the canvas.”

**Recommendation: put the canvas first. The test comment is the wrong product claim.**

- The canvas is the tool. The toolbox is a picker for that tool. A full-height field list above the builder is why you “scroll past everything to reach the work.”
- PPTB is wide-but-short (this bugfix), not phone. Phone is the web/GitHub Pages host. Treat it as a secondary surface, but don’t make the first paint of that surface the field catalog.
- Smallest change that matches the recommendation: at `max-width: 900px` set `.eb-center-col { order: -1; }` and **invert** the test. Do not reorder DOM (drag-and-drop / focus order stay source order unless you also `tabindex` — CSS `order` is visual only; acceptable here because the stacked page is one scroller).
- Stronger, later: default-collapse Toolbox + Details on first paint below 900px (`leftDockCollapsed` / `rightDockCollapsed` already exist in `workbenchState.ts`). Collapsed docks are already a 38px bar in the stack (`tokens.css` **1776–1796**). Skip a tabbed Fields/Builder/Details switcher — YAGNI unless phone usage is real.

Do **not** default-collapse as part of the `order: -1` slice unless asked; one change at a time.

### 2. Rule-row wrap vs overflow menu

**Current.** Tools stay inline. Below ~740px of **list** width (container `eb-rules`, `tokens.css` **1707–1727**) value + tools wrap to a second line; at `≤1100px` / `≤700px` they wrap further. Audit verified the wrap: delete button sits 13px **inside** the row border at every measured viewport.

Tools on a live row (`RuleRowEditor.tsx` **289–352**): move chevrons, wrappers `Menu`, Duplicate, Delete. Wrappers is already a Fluent `Menu`. There is **no** kebab / `MoreHorizontal` component. Closest copy targets if anyone later wants a menu: `ConditionMoveButtons.tsx` **66–95**, `SourceChip.tsx` **106–145**.

**Recommendation: keep wrapping. Do not add an overflow menu.**

- Overflow menus are for low-frequency actions. Delete / Duplicate / Move are primary on a rule. Hiding Delete behind a kebab is a worse builder than a two-line row.
- The overhang bug is already fixed by the wrap. This decision is density-vs-click, not a defect.
- If a later pass wants a denser single line, overflow **only** the move chevrons (drag handle remains) and keep Duplicate + Delete visible. Do not overflow Delete.

---

## Suggested `/do` slice

Execute Phases 1 → 2 → 4 (vitest) first; Phase 3 (Playwright) after CSS+unit tests are green. Stop before any design-decision code.
