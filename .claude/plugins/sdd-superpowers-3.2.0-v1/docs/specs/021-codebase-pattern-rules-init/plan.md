# Plan: Feature 021 — Codebase Pattern Exploration in sdd-init

## Goal

Extend `sdd-init`'s rules generation phase (Step 4) to dispatch two codebase exploration subagents alongside the existing three web-research subagents, then merge findings so rule proposals reflect actual observed patterns rather than only generic best practices.

## Architecture

All changes are confined to two Markdown skill files. No code, no new files, no hooks.

The pipeline extension inserts three additions to the existing Step 4:

1. **Step 4.1 tail** — source file existence check → produces `has_source_files` flag
2. **Step 4.2 body** — two new subagent instruction blocks dispatched conditionally in the same parallel batch as the existing three
3. **Step 4.3 head** — merge table applied before Section A is assembled

The `SKILL.md` Process Summary is updated to reflect the new dispatch count.

## File Structure

| File | Change |
|------|--------|
| `skills/sdd-init/reference.md` | Modify Steps 4.1, 4.2, 4.3 |
| `skills/sdd-init/SKILL.md` | Update step 4 line in Process Summary |

## Phases

---

### Phase 1 — Step 4.1: Source file existence check

**Covers:** FR-1, AC-1.2

At the end of Step 4.1 in `reference.md`, after the fallback question block, append:

```markdown
### Source File Existence Check

After determining Stack Context, check whether the project has qualifying source files:

A **qualifying source file** is any file that is:
- Not inside `node_modules/`, `.git/`, `vendor/`, `dist/`, `build/`, `target/`, `coverage/`, `__pycache__/`
- Not a manifest file already read in this step (`package.json`, `pyproject.toml`, `requirements.txt`, `Cargo.toml`, `go.mod`, `composer.json`, `Gemfile`, `build.gradle`, `pom.xml`)
- Not matching `*.min.js` or `*.d.ts`

If at least one qualifying source file exists: set **`has_source_files = true`**.

If no qualifying source files exist: set **`has_source_files = false`** — Step 4.2 skips exploration subagents silently.
```

**Verification:** Step 4.1 ends with an explicit `has_source_files` flag used as input to Step 4.2.

---

### Phase 2 — Step 4.2: Add Source Pattern and Test Pattern subagents

**Covers:** FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, AC-1.1, AC-1.2, AC-1.3, AC-2.1, AC-2.2, AC-2.3, AC-3.1–3.4, AC-4.1–4.3, NFR-1, NFR-2, NFR-3, NFR-4

Replace the current Step 4.2 announcement sentence with a conditional:

```markdown
**If `has_source_files = true`:** Announce: "Researching best practices and exploring your codebase for existing patterns. Running five parallel lookups."

**If `has_source_files = false`:** Announce: "Researching best practices, security rules, and automation patterns for your stack. Running three parallel lookups." *(existing text — no change)*
```

After the existing Subagent 3 block, add:

```markdown
**Subagent 4 — Source Pattern** *(dispatched only when `has_source_files = true`)*

> "You are analyzing source code patterns in this project. Follow these steps in order.
>
> **Step A — Configuration files.** Read these files if they exist — they encode enforced conventions:
> `.eslintrc`, `.eslintrc.json`, `.eslintrc.js`, `.eslintrc.yml`, `.prettierrc`, `.prettierrc.json`,
> `.prettierrc.js`, `tsconfig.json`, `pyproject.toml` (tool.ruff / tool.black / tool.isort sections only),
> `.rubocop.yml`, `.golangci.yml`
>
> **Step B — Source file sampling.** List top-level directories, excluding:
> `node_modules/`, `.git/`, `vendor/`, `dist/`, `build/`, `target/`, `coverage/`, `__pycache__/`.
> Identify primary source directories (`src/`, `lib/`, `app/`, `pkg/`, `internal/`, or equivalent).
> For each, read at most 10 files — prefer files at the directory root before nested subdirectories.
> Total cap: 30 source files across all directories.
> Skip: `*.min.js`, `*.d.ts`, `*.lock`, binary files.
>
> **Step C — Insufficient data check.** If fewer than 3 source files were readable:
> Return `{ "status": "insufficient", "findings": {} }` and stop.
>
> **Step D — Synthesize findings.** Return a structured object:
> - `file_naming`: detected convention — one of: kebab-case / PascalCase / snake_case / camelCase / unclear
> - `function_naming`: detected convention (same options)
> - `variable_naming`: detected convention (same options)
> - `import_organization`: observed pattern — grouped-by-type / alphabetical / none / unclear
> - `architectural_patterns`: list of patterns inferred from directory names and import structure
>   (e.g. `["service layer", "repository pattern", "MVC"]`)
> - `error_handling`: observed pattern — exceptions / result-types / error-codes / mixed / unclear
> - `config_enforced`: list of conventions enforced by config files
>   (e.g. `["no-var (eslint)", "single quotes (prettier)", "strict null checks (tsconfig)"]`)
> - `examples`: for each non-empty field above, one representative file path + snippet of ≤3 lines
>
> Return the structured object only. Do NOT return raw file content."

**Subagent 5 — Test Pattern** *(dispatched only when `has_source_files = true`)*

> "You are analyzing test patterns in this project. Follow these steps in order.
>
> **Step A — Find test files.** Locate files matching:
> `*.test.*`, `*.spec.*`, `*_test.*`, `test_*.*`
> and all files inside directories named `test/`, `tests/`, `__tests__/`, `spec/`.
> Exclude: `node_modules/`, `.git/`, `vendor/`, `dist/`, `build/`, `target/`.
>
> **Step B — No tests check.** If no test files are found:
> Return `{ "status": "no_tests", "findings": {} }` and stop.
>
> **Step C — Sample.** Read at most 30 test files. Prefer files at the root of each test directory before nested files.
>
> **Step D — Synthesize findings.** Return a structured object:
> - `file_naming`: test file naming convention observed (e.g. `*.test.ts`, `test_*.py`, `*_test.go`)
> - `test_organization`: style — describe-it / test-suite-classes / flat-functions / mixed
> - `assertion_style`: library and style (e.g. `expect().toBe()`, `assert.equal()`, `should.equal()`)
> - `mock_patterns`: observed approach — jest.mock / sinon / factory-functions / manual-stubs / none
> - `fixture_patterns`: observed approach — inline-setup / shared-fixture-files / factories / none
> - `examples`: for each non-empty field above, one representative file path + snippet of ≤3 lines
>
> Return the structured object only. Do NOT return raw file content."
```

Also update the **Empty result handling** paragraph to include exploration subagents:

```markdown
**Empty result handling:** If any subagent — web-research or exploration — returns no usable results or a status of `"insufficient"` / `"no_tests"`, mark its section as empty. For web-research subagents, note: "No [conventions / security / automation] rules could be generated — you can add these manually later." For exploration subagents, skip the merge step for that subagent's scope and use web-research results only. Init does not fail.
```

**Verification:** Step 4.2 dispatches exactly 5 subagents when `has_source_files = true`, exactly 3 when `false`. Each subagent block returns a structured object.

---

### Phase 3 — Step 4.3: Merging logic

**Covers:** FR-9, FR-10, FR-11, FR-12, AC-5.1–5.4, AC-6.1–6.3

At the start of Step 4.3, before the existing "After all three subagents complete" sentence, insert:

```markdown
### Merge Codebase Findings with Web-Research Results

*(This step runs only when `has_source_files = true` and at least one exploration subagent returned non-empty findings. Otherwise skip to Section A.)*

Before assembling Section A rule file proposals, merge Source Pattern and Test Pattern findings with Subagent 1 (Conventions) results using this table:

| Situation | Action |
|-----------|--------|
| Codebase finding **overlaps** a web-research rule — same convention, possibly different wording | Keep web-research rule text as-is. Append a codebase example: `— observed in [filepath]` |
| Codebase finding **contradicts** a web-research rule — different convention | Use codebase pattern as the rule text. Append: `Note: web research recommends [X] — confirm this matches your intent` |
| Codebase finding has **no web-research counterpart** for its topic | Add as a new rule line prefixed with `[observed]` |
| Web-research rule has **no codebase counterpart** | Keep unchanged — no prefix, no modification |

If both exploration and web-research returned empty for a topic: propose no rule file for that topic.

After applying the merge table, update the announcement line at the top of Section A to read:
> "Rule files may include `[observed]` markers on lines derived directly from your codebase, and `Note:` comments where web research suggests a different convention than what your code currently uses."
```

Also update the sentence "After all three subagents complete" → "After all subagents complete".

**Verification:** Section A proposals reflect all four merge cases as described. `[observed]` prefix and `Note:` comment appear correctly per scenario.

---

### Phase 4 — SKILL.md: Process Summary update

**Covers:** Surface-level accuracy of the skill summary

In `SKILL.md`, replace step 4 in the Process Summary list:

```markdown
4. Rules generation: detect stack → 3 parallel research subagents → user review (approve/tweak/skip) → write `.claude/rules/*.md` and `settings.json`
```

with:

```markdown
4. Rules generation: detect stack → check for source files → up to 5 parallel subagents (3 web-research + 2 codebase exploration when source files exist) → merge findings (codebase patterns take precedence on conflict) → user review (approve/tweak/skip) → write `.claude/rules/*.md` and `settings.json`
```

**Verification:** SKILL.md Process Summary accurately reflects the new dispatch count and merge step.

---

## Self-Review

**Spec coverage:**
- FR-1 → Phase 1 (source file existence check)
- FR-2 → Phase 2 (exactly two exploration subagents)
- FR-3 → Phase 2 (all five in one parallel batch)
- FR-4 → Phase 2 (10 files per dir, 30 total cap)
- FR-5 → Phase 2 (excluded paths listed in subagent instructions)
- FR-6 → Phase 2 (Source Pattern reports all required fields including config-enforced)
- FR-7 → Phase 2 (Test Pattern reports all required fields)
- FR-8 → Phase 2 (both return structured objects, not raw content)
- FR-9 → Phase 3 (overlap case appends codebase example)
- FR-10 → Phase 3 (contradiction case: codebase wins + Note: comment)
- FR-11 → Phase 3 (codebase-only rules get `[observed]` prefix)
- FR-12 → Phase 2 + 3 (empty/insufficient → falls back to web-research only)
- NFR-1 → Phase 2 (single parallel batch)
- NFR-2 → Phase 2 (30-file cap ensures bounded execution)
- NFR-3 → Phase 2 (structured objects returned)
- NFR-4 → Phase 2 (read-only instructions; no write operations in subagent prompts)

**No placeholders present.** All prose is complete and implementable as written.
