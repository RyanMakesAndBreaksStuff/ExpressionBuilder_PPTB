---
branch_pattern: "^[0-9]+-[a-z0-9-]+$"
ticket_prefix: ""
commit_format: "<type>(<scope>): <message>"
allowed_types:
  - feat
  - fix
  - docs
  - chore
  - refactor
  - test
---

# Git Convention

This file is read by SDD skills to enforce branch naming and commit message standards.
To change these settings, edit this file directly.

## Examples

### Branch names
- `019-rules-gen-init`
- `020-remove-tasks-mode-from-execute`
- `042-improve-sdd-review`

### Commit messages
- `feat(sdd-init): add rules generation phase`
- `fix(hooks): correct deny response format in pre-write gate`
- `docs(spec): add acceptance criteria for stack detection`
- `test(hooks): add negative-path test for plan gate`
- `refactor(sdd-execute): remove tasks.md detection step`
