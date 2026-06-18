# Plan: Match Build Output to focused_7_2.html Design

## Objective
Update the `@ryanmakes/eb_builder-ui` package so the compiled output from `apps/pptb` and `apps/web` visually matches the `focused_7_2.html` design reference.

## Design Reference Analysis
The `focused_7_2.html` is a polished dark-themed expression builder with:
- Glassmorphism sticky header with gradient brand mark, mode toggle, palette shelf, action buttons
- 3-column workspace: left dock (286px), center builder, right dock (330px)
- Collapsible docks with chrome (title bar), tab strips, and body content
- Group cards with logic pills (AND/OR toggle), group title, count, actions
- Rule rows with drag dots, type glyphs, field/operator/value selectors, wrap chips, tool buttons
- Expression preview with syntax highlighting (kw, fn, str, num, sym classes)
- Diagnostic cards with icons, severity colors, grid layout
- Type glyphs with gradient backgrounds per field type
- Outfit font for UI, JetBrains Mono for code
- Specific border radius, shadows, and gradients throughout

## Current State Assessment
The current implementation already has:
- Most structural components (Shell, Header, Docks, Canvas, Preview, Support)
- CSS custom properties and token system
- Collapsible dock behavior
- Basic theme support (light/dark)
- Field toolbox with search
- Rule editor with field/operator/value
- Diagnostics list

## Key Gaps to Close
1. **Header**: Missing glassmorphism (`backdrop-filter: blur`), gradient brand mark, palette shelf for theme switching
2. **CSS Tokens**: Some values need refinement (backgrounds, borders, shadows, fonts)
3. **DockPane Chrome**: Missing grip icon, proper title text, collapsed rail label
4. **Group Cards**: Missing logic pill (AND/OR buttons as pill), group count, drag dots
5. **Rule Rows**: Missing drag dots, grid layout not matching design, no wrap chips, no icon buttons
6. **Expression Preview**: Missing syntax highlighting (color-coded parts)
7. **Diagnostic Cards**: Missing icons, wrong grid layout, missing severity variants (good, warn, info, error)
8. **TypeGlyph**: Missing gradient backgrounds per type
9. **FieldToolboxPane**: Search box missing search icon, field rows need grid layout
10. **Theme Palette**: Shell needs palette state and pass to header

## Implementation Order

### Stage 1: Foundation (CSS + Shell)
1. Update `tokens.css` with refined styles matching design
2. Update `workbenchTokens.ts` to add all 6 theme palettes (atlas, porcelain, sandstone × light/dark)
3. Update `ExpressionBuilderShell.tsx` to support palette state and pass to header
4. Update `WorkbenchHeader.tsx` with brand mark gradient, palette shelf, glassmorphism

### Stage 2: Workbench Components
5. Update `DockPane.tsx` with grip icon, title, proper chrome
6. Update `FieldToolboxPane.tsx` with search icon, field row grid layout
7. Update `ConditionGroupCard.tsx` with logic pill, group count, drag dots
8. Update `RuleRowEditor.tsx` with drag dots, grid layout, icon buttons
9. Update `ExpressionPreview.tsx` with syntax highlighting
10. Update `DiagnosticList.tsx` / `DiagnosticCard.tsx` with icons, proper layout
11. Update `TypeGlyph.tsx` with gradient backgrounds

### Stage 3: Build & Verify
12. Build the packages
13. Verify output in apps/pptb and apps/web
14. Compare with design reference

## Skills Applied
- `/react-best-practices`: Component structure, performance, hooks usage
- `/fluent2-design-system`: Theme tokens, makeStyles vs CSS, component patterns

## Files to Modify
- `packages/builder-ui/src/theme/tokens.css` (major CSS update)
- `packages/builder-ui/src/theme/workbenchTokens.ts` (add palette themes)
- `packages/builder-ui/src/app/ExpressionBuilderShell.tsx` (add palette state)
- `packages/builder-ui/src/workbench/WorkbenchHeader.tsx` (add palette shelf)
- `packages/builder-ui/src/workbench/controls/DockPane.tsx` (add chrome elements)
- `packages/builder-ui/src/workbench/FieldToolboxPane.tsx` (refine layout)
- `packages/builder-ui/src/workbench/ConditionGroupCard.tsx` (add logic pill, etc.)
- `packages/builder-ui/src/workbench/RuleRowEditor.tsx` (refine layout)
- `packages/builder-ui/src/components/ExpressionPreview.tsx` (syntax highlighting)
- `packages/builder-ui/src/workbench/DiagnosticList.tsx` (icons, layout)
- `packages/builder-ui/src/components/TypeGlyph.tsx` (gradients)
- `packages/builder-ui/src/workbench/icons/BuilderIcons.tsx` (new icons)

## Success Criteria
- Build succeeds with `tsc -b` in builder-ui
- Visual output matches `focused_7_2.html` in:
  - Header layout and styling (glassmorphism, brand mark, palette shelf)
  - Workspace grid and dock behavior
  - Group card styling (logic pill, group count)
  - Rule row layout (grid, drag dots, type glyphs, icon buttons)
  - Expression preview (syntax highlighting)
  - Diagnostic cards (icons, severity colors)
  - Type glyphs (gradient backgrounds)
  - Overall theme colors and feel
