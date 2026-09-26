# Skill Writing Rules

✓ Every SKILL.md must open with YAML frontmatter containing at minimum `name` and `description`. Total frontmatter under 1024 chars. Additional fields (e.g. `model`, `effort`) may be added deliberately to pin a stronger model/effort for reasoning-heavy skills.
✓ The `description` field must start with `"Use when..."` and describe triggering conditions, never the internal workflow.
✓ The skill body must have exactly one `# Heading` (the skill title). Use `##` for sections, `###` for subsections. Never skip heading levels.
✓ Include at most one code example per concept — complete, annotated, drawn from a real scenario.
✓ Skills loaded every session: under 200 words. Getting-started workflows: under 150 words. All others: under 500 words.
✓ Include the error messages, symptoms, tool names, and synonyms that an agent would search for. Put searchable terms early.
✓ Use Graphviz/dot flowcharts only for non-obvious branching decisions. Use numbered lists for linear steps, tables for reference lookup.
✗ Never reference other skills with `@path/to/file.md` — reference by skill name only (e.g., `sdd-superpowers:test-driven-development`).
✗ Never narrate how a problem was solved in a specific session — skills are reusable guides, not session logs.
