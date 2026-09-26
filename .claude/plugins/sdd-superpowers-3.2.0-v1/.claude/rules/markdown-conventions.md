# Markdown Conventions

✓ Skill files and template files must have YAML frontmatter. Prose documents (specs, plans, changelogs) should not unless a tool requires it.
✓ All non-root markdown files: `kebab-case.md`. Root-level meta files: ALL-CAPS (`README.md`, `CHANGELOG.md`).
✓ Heading hierarchy: H1 → H2 → H3 in strict descent. Never skip levels.
✓ Every document has exactly one `# Title` at the top.
✓ Always specify the language on fenced code blocks (` ```bash `, ` ```yaml `, ` ```markdown `).
✓ Multi-step processes use numbered lists, not prose paragraphs — LLMs miss steps buried in paragraphs.
✗ If a paragraph contains more than one actionable instruction, convert it to a list. Dense paragraphs cause instruction-bleed.
✗ Do not mix GFM table syntax with HTML tables in the same file.
