# Lessons

- When the user corrects uploaded file locations, re-check the repo-local paths first and do not keep working from older Downloads paths.
- When presenting named light/dark palette reviews, keep the theme families explicitly paired instead of mixing named light options with unrelated generic dark labels.
- When a docked-layout correction calls out asymmetric panel behavior, check the actual flex sizing on both sides instead of assuming matching visuals mean matching layout rules.
- When a finalized UI design is token-driven, record tokens as the implementation source of truth and keep CSS as token-consuming layout plumbing.
- When prototype screenshots include scaffolding labels, remove demo-only copy from production chrome while preserving accessible labels where needed.
- When command actions are part of a sticky header contract, do not relocate import, export, or copy into footer-like panels.
- When the user supplies exact theme token values, wire those values through the runtime token source and add exact-value tests instead of leaving truthy palette checks.
- When a finalized theme pair replaces a palette review bench, delete the bench UI and stale review copy instead of leaving dormant selection controls in production chrome.
- When the user narrows a bug to one host app, scope the fix and regression check to that host instead of changing sibling hosts by default.
