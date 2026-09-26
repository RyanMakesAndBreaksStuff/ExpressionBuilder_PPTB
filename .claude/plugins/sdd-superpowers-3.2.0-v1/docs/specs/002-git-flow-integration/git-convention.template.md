---
branch_pattern: "^(feat|fix|docs|chore|refactor|test)/[0-9]+-[a-z0-9-]+$"
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
To change these settings, edit the YAML frontmatter above directly.

## Examples

### Branch names
- `feat/002-git-flow-integration`
- `fix/003-auth-timeout`
- `docs/004-api-reference`

### Commit messages
- `docs(002-git-flow-integration): add spec, plan, and tasks`
- `feat(002-git-flow-integration): implement branch name suggestions`
- `fix(003-auth-timeout): handle expired token edge case`
- `chore(root): update dependencies`
