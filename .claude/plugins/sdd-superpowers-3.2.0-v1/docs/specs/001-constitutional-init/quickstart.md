# Quickstart: Constitutional Foundation Init

Key validation scenarios to smoke-test the implementation.

## Scenario A — Fresh project triggers init

1. Create an empty directory (no `CLAUDE.md`, no `docs/specs/`)
2. Invoke `sdd-workflow` with any feature request (e.g. "I want to add a login feature")
3. **Expected:** New Project Detection activates; sdd-init announces itself
4. **Expected:** Article I presented with default Library-First text; user prompted to accept/customise/skip
5. Accept all defaults through Article IX
6. Approve the constitution summary
7. **Expected:** `memory/constitution.md`, `docs/specs/.gitkeep`, `CLAUDE.md` created (each announced)
8. **Expected:** sdd-workflow resumes and routes the original "login feature" request

## Scenario B — Existing project skips init

1. Navigate to a project that already has `CLAUDE.md`
2. Invoke `sdd-workflow`
3. **Expected:** No init flow; routing proceeds directly to skill map

## Scenario C — Abort during Article review writes no files

1. Fresh directory, invoke `sdd-workflow`
2. During the Article review (e.g. after Article III), say "abort" or "stop"
3. **Expected:** No files created; message: "Init aborted. No files were created. Run sdd-workflow again to restart."

## Scenario D — Articles IV–VI show stubs

1. Fresh directory, invoke `sdd-workflow`
2. Reach Article IV
3. **Expected:** Article IV shows `[NEEDS CLARIFICATION]` stub with guidance text, not default content

## Scenario E — Existing CLAUDE.md gets append approval

1. Directory with `CLAUDE.md` present but no `docs/specs/`
2. Invoke `sdd-workflow`
3. **Expected:** Init skipped (CLAUDE.md present = already initialised)
